// WhatsApp Follow-up dashboard — Cloudflare Worker
//
// Routes
//   GET  /webhook              Meta webhook verification
//   POST /webhook              Meta webhook events (messages, smb_message_echoes, statuses)
//   GET  /                     Dashboard (password protected)
//   GET  /api/conversations    Dashboard data
//   POST /api/action           { wa_id, action: done|reopen|snooze, days }
//   POST /admin/analyze        Run AI analysis now
//   GET  /admin/subscribed     List apps subscribed to the WABA
//   POST /admin/subscribe      Subscribe this app to the WABA (Peach stays subscribed)
//   GET  /privacy              Privacy policy (needed to switch the Meta app to Live)
//
// Bindings / secrets: DB (D1), DASH_PASSWORD, META_VERIFY_TOKEN, META_APP_SECRET,
// META_TOKEN, WABA_ID, BUSINESS_PHONE, ANTHROPIC_API_KEY, AI_MODEL (optional)

import DASHBOARD_HTML from "./dashboard.html";

const GRAPH = "https://graph.facebook.com/v21.0";
const DEFAULT_MODEL = "claude-haiku-5-5";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === "/webhook" && request.method === "GET") return verifyWebhook(url, env);
    if (path === "/webhook" && request.method === "POST") return receiveWebhook(request, env);
    if (path === "/privacy") return new Response(PRIVACY_HTML, { headers: { "content-type": "text/html; charset=utf-8" } });

    if (!isAuthorized(request, env)) {
      return new Response("Login required", {
        status: 401,
        headers: { "WWW-Authenticate": 'Basic realm="WhatsApp Follow-up"' },
      });
    }

    if (path === "/" ) return new Response(DASHBOARD_HTML, { headers: { "content-type": "text/html; charset=utf-8" } });
    if (path === "/api/conversations") return json(await listConversations(env));
    if (path === "/api/action" && request.method === "POST") return json(await applyAction(await request.json(), env));
    if (path === "/admin/analyze" && request.method === "POST") return json(await analyzePending(env, 50));
    if (path === "/admin/subscribed") return json(await graph(env, `/${env.WABA_ID}/subscribed_apps`, "GET"));
    if (path === "/admin/subscribe" && request.method === "POST") return json(await graph(env, `/${env.WABA_ID}/subscribed_apps`, "POST"));

    return new Response("Not found", { status: 404 });
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(analyzePending(env, 15));
  },
};

// ---------- auth ----------

function isAuthorized(request, env) {
  if (!env.DASH_PASSWORD) return false;
  const header = request.headers.get("Authorization") || "";
  if (!header.startsWith("Basic ")) return false;
  const [, password] = atob(header.slice(6)).split(/:(.*)/s);
  return timingSafeEqual(password || "", env.DASH_PASSWORD);
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// ---------- webhook ----------

function verifyWebhook(url, env) {
  const ok =
    url.searchParams.get("hub.mode") === "subscribe" &&
    url.searchParams.get("hub.verify_token") === env.META_VERIFY_TOKEN;
  return ok ? new Response(url.searchParams.get("hub.challenge")) : new Response("Forbidden", { status: 403 });
}

async function receiveWebhook(request, env) {
  const raw = await request.text();
  if (!(await validSignature(raw, request.headers.get("X-Hub-Signature-256"), env.META_APP_SECRET))) {
    return new Response("Bad signature", { status: 401 });
  }
  const body = JSON.parse(raw);
  for (const entry of body.entry || []) {
    for (const change of entry.changes || []) {
      await handleChange(change, env);
    }
  }
  return new Response("OK");
}

async function validSignature(raw, header, secret) {
  if (!header || !secret) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(raw));
  const hex = [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return timingSafeEqual(header, `sha256=${hex}`);
}

const digits = (s) => String(s || "").replace(/\D/g, "");

async function handleChange(change, env) {
  const value = change.value || {};
  const businessPhone = digits(value.metadata?.display_phone_number);
  if (env.BUSINESS_PHONE && businessPhone && businessPhone !== digits(env.BUSINESS_PHONE)) return;

  const names = {};
  for (const c of value.contacts || []) names[digits(c.wa_id)] = c.profile?.name;

  // Customer → us
  for (const m of value.messages || []) {
    const waId = digits(m.from);
    await saveMessage(env, { id: m.id, waId, direction: "in", source: "customer", type: m.type, text: messageText(m), ts: Number(m.timestamp) }, names[waId]);
  }

  // You → customer, sent from the WhatsApp Business app (coexistence echoes)
  for (const m of value.message_echoes || []) {
    const waId = digits(m.to);
    await saveMessage(env, { id: m.id, waId, direction: "out", source: "human", type: m.type, text: messageText(m), ts: Number(m.timestamp) });
  }

  // Delivery statuses for messages sent through the API (e.g. Peach AI replies).
  // We never see the text, only that something was sent.
  for (const s of value.statuses || []) {
    if (s.status !== "sent") continue;
    const waId = digits(s.recipient_id);
    const known = await env.DB.prepare("SELECT 1 FROM messages WHERE id = ?").bind(s.id).first();
    if (known) continue;
    await saveMessage(env, { id: s.id, waId, direction: "out", source: "bot", type: "status", text: null, ts: Number(s.timestamp) });
  }
}

function messageText(m) {
  switch (m.type) {
    case "text": return m.text?.body;
    case "image": case "video": case "document":
      return `[${m.type}] ${m[m.type]?.caption || m[m.type]?.filename || ""}`.trim();
    case "audio": return "[语音]";
    case "sticker": return "[贴图]";
    case "location": return `[位置] ${m.location?.name || ""} ${m.location?.address || ""}`.trim();
    case "contacts": return "[联系人名片]";
    case "button": return m.button?.text;
    case "interactive": return m.interactive?.button_reply?.title || m.interactive?.list_reply?.title || "[互动回复]";
    case "reaction": return m.reaction?.emoji ? `[回应 ${m.reaction.emoji}]` : null;
    default: return `[${m.type}]`;
  }
}

async function saveMessage(env, msg, name) {
  const inserted = await env.DB.prepare(
    "INSERT OR IGNORE INTO messages (id, wa_id, direction, source, type, text, ts) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).bind(msg.id, msg.waId, msg.direction, msg.source, msg.type || null, msg.text || null, msg.ts).run();
  if (!inserted.meta.changes) return;

  await env.DB.prepare("INSERT OR IGNORE INTO conversations (wa_id) VALUES (?)").bind(msg.waId).run();
  if (name) await env.DB.prepare("UPDATE conversations SET name = ? WHERE wa_id = ?").bind(name, msg.waId).run();

  const reactionOnly = msg.type === "reaction";
  if (msg.source === "customer" && !reactionOnly) {
    await env.DB.prepare(
      `UPDATE conversations SET last_in_at = MAX(COALESCE(last_in_at,0), ?1), last_in_text = CASE WHEN ?1 >= COALESCE(last_in_at,0) THEN ?2 ELSE last_in_text END,
       last_msg_at = MAX(COALESCE(last_msg_at,0), ?1), needs_ai = 1, done_at = NULL, snooze_until = NULL WHERE wa_id = ?3`
    ).bind(msg.ts, msg.text, msg.waId).run();
  } else if (msg.source === "human") {
    await env.DB.prepare(
      `UPDATE conversations SET last_human_at = MAX(COALESCE(last_human_at,0), ?1), last_human_text = CASE WHEN ?1 >= COALESCE(last_human_at,0) THEN ?2 ELSE last_human_text END,
       last_msg_at = MAX(COALESCE(last_msg_at,0), ?1), needs_ai = 1 WHERE wa_id = ?3`
    ).bind(msg.ts, msg.text, msg.waId).run();
  } else if (msg.source === "bot") {
    await env.DB.prepare(
      "UPDATE conversations SET last_bot_at = MAX(COALESCE(last_bot_at,0), ?1), last_msg_at = MAX(COALESCE(last_msg_at,0), ?1) WHERE wa_id = ?2"
    ).bind(msg.ts, msg.waId).run();
  }
}

// ---------- dashboard API ----------

async function listConversations(env) {
  const { results } = await env.DB.prepare(
    "SELECT * FROM conversations WHERE last_in_at IS NOT NULL ORDER BY last_msg_at DESC LIMIT 500"
  ).all();
  return { now: Math.floor(Date.now() / 1000), conversations: results };
}

async function applyAction(body, env) {
  const waId = digits(body.wa_id);
  const now = Math.floor(Date.now() / 1000);
  if (body.action === "done") {
    await env.DB.prepare("UPDATE conversations SET done_at = ?, snooze_until = NULL WHERE wa_id = ?").bind(now, waId).run();
  } else if (body.action === "reopen") {
    await env.DB.prepare("UPDATE conversations SET done_at = NULL, snooze_until = NULL WHERE wa_id = ?").bind(waId).run();
  } else if (body.action === "snooze") {
    const days = Math.min(Math.max(Number(body.days) || 1, 1), 30);
    await env.DB.prepare("UPDATE conversations SET snooze_until = ? WHERE wa_id = ?").bind(now + days * 86400, waId).run();
  } else {
    return { ok: false, error: "unknown action" };
  }
  return { ok: true };
}

// ---------- AI analysis ----------

const AI_SCHEMA = {
  type: "object",
  properties: {
    status: { type: "string", enum: ["urgent", "follow_up", "waiting_on_me", "waiting_on_customer", "closed"] },
    heat: { type: "string", enum: ["hot", "warm", "cold"] },
    summary: { type: "string" },
    next_action: { type: "string" },
    follow_up_date: { type: "string" },
    draft_reply: { type: "string" },
  },
  required: ["status", "heat", "summary", "next_action", "follow_up_date", "draft_reply"],
  additionalProperties: false,
};

const SYSTEM_PROMPT = `你是马来西亚房地产中介 Kar Siong（Property Library）的销售助理。你会看到他和一位客户的 WhatsApp 对话记录，任务是判断这位客户需不需要跟进。

对话里的发言者：
- 客户：客户发的 message
- 我（本人）：Kar Siong 本人从手机回的
- 我（AI）：自动回复系统（Peach）发的，内容看不到，只知道有发
注意：AI 自动回复的内容不会出现在记录里，所以「我（AI）」只代表系统有回过。

status 只能选一个：
- urgent：客户在等真人回应，而且有明确意向（问价钱、问还有没有、约看房、要谈条件），或客户不满
- waiting_on_me：Kar Siong 答应要给的东西（资料、floor plan、报价、回电）还没给
- follow_up：客户说考虑、要商量、之后再说，或已读不回，需要过几天主动跟进
- waiting_on_customer：球在客户那边，而且还没到要追的时候
- closed：客户明确不要、已买别的、打错、广告/垃圾信息

heat：hot（短期内可能成交或看房）、warm（有兴趣但不急）、cold（意向很低）。

follow_up_date：建议哪天主动跟进，格式 YYYY-MM-DD；不需要就给空字符串。一般「考虑一下」排 2-3 天后，冷淡的客户排 7 天后。
summary：一句话中文总结客户要什么（地点、类型、预算、时间），没有资料就写目前知道的。
next_action：一句话中文写 Kar Siong 下一步该做什么。
draft_reply：给 Kar Siong 参考的回复草稿，用客户使用的语言（中文 / English / Bahasa），口吻亲切专业，简短。closed 时给空字符串。`;

async function analyzePending(env, limit) {
  if (!env.ANTHROPIC_API_KEY) return { analyzed: 0, error: "ANTHROPIC_API_KEY not set" };
  const settle = Math.floor(Date.now() / 1000) - 60; // let bursts of messages finish first
  const { results } = await env.DB.prepare(
    "SELECT * FROM conversations WHERE needs_ai = 1 AND last_msg_at <= ? ORDER BY last_msg_at DESC LIMIT ?"
  ).bind(settle, limit).all();

  let analyzed = 0;
  const errors = [];
  for (const conv of results) {
    try {
      const result = await analyzeConversation(env, conv);
      await env.DB.prepare(
        `UPDATE conversations SET ai_status = ?, ai_heat = ?, ai_summary = ?, ai_next_action = ?, ai_follow_up = ?, ai_draft = ?, ai_at = ?,
         needs_ai = CASE WHEN last_msg_at > ? THEN 1 ELSE 0 END WHERE wa_id = ?`
      ).bind(result.status, result.heat, result.summary, result.next_action, result.follow_up_date, result.draft_reply,
        Math.floor(Date.now() / 1000), conv.last_msg_at, conv.wa_id).run();
      analyzed++;
    } catch (err) {
      errors.push(`${conv.wa_id}: ${err.message}`);
    }
  }
  return { analyzed, pending: results.length, errors };
}

async function analyzeConversation(env, conv) {
  const { results } = await env.DB.prepare(
    "SELECT * FROM (SELECT * FROM messages WHERE wa_id = ? ORDER BY ts DESC LIMIT 40) ORDER BY ts ASC"
  ).bind(conv.wa_id).all();

  const speaker = { customer: "客户", human: "我（本人）", bot: "我（AI）" };
  const transcript = results
    .map((m) => `[${formatMyt(m.ts)}] ${speaker[m.source]}：${m.source === "bot" ? "（自动回复，内容不可见）" : m.text || `[${m.type}]`}`)
    .join("\n");

  const userContent = `现在时间：${formatMyt(Math.floor(Date.now() / 1000))}（马来西亚时间）
客户名字：${conv.name || "未知"}

对话记录：
${transcript}`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: env.AI_MODEL || DEFAULT_MODEL,
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      output_config: { effort: "low", format: { type: "json_schema", schema: AI_SCHEMA } },
      messages: [{ role: "user", content: userContent }],
    }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(`Claude API ${response.status}: ${data.error?.message || "unknown error"}`);
  if (data.stop_reason === "refusal") throw new Error("Claude declined to analyze this conversation");
  const text = (data.content || []).find((b) => b.type === "text")?.text;
  if (!text) throw new Error(`no text in response (stop_reason ${data.stop_reason})`);
  return JSON.parse(text);
}

function formatMyt(ts) {
  return new Date(ts * 1000).toLocaleString("en-GB", { timeZone: "Asia/Kuala_Lumpur", dateStyle: "medium", timeStyle: "short" });
}

// ---------- helpers ----------

async function graph(env, path, method) {
  const res = await fetch(`${GRAPH}${path}`, { method, headers: { Authorization: `Bearer ${env.META_TOKEN}` } });
  return res.json();
}

function json(data) {
  return new Response(JSON.stringify(data), { headers: { "content-type": "application/json; charset=utf-8" } });
}

const PRIVACY_HTML = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Privacy Policy — Property Library</title>
<body style="font-family:system-ui;max-width:680px;margin:40px auto;padding:0 16px;line-height:1.6">
<h1>Privacy Policy</h1>
<p>Property Library uses this service internally to keep track of WhatsApp conversations with its own customers so that no enquiry is left unanswered.</p>
<p>We store message text, timestamps, phone numbers and profile names received through the WhatsApp Business Platform. The data is used only by Property Library staff to follow up on enquiries, may be processed by an AI service to summarise conversations, and is never sold or shared for advertising.</p>
<p>To ask for your data to be deleted, message us on WhatsApp and we will remove it.</p>
</body>`;
