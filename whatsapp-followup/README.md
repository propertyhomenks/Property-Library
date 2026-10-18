# WhatsApp 跟进提醒 Dashboard

提醒你还有谁没回、漏掉了谁。追踪号码：**+60 12-755 9908 (Kar Siong)**。

**网址：https://whatsapp-followup.propertyhomenks.workers.dev**

状态（2026-10-18）：已部署到 Cloudflare（D1 数据库 `whatsapp-followup`，APAC）。免费 Workers AI 已用测试对话实测，分类和草稿正常。还要：设密钥（第 3 步）、Meta App（第 4–5 步）、订阅 + 真实测试（第 6 步）。

## 怎么运作

```
客户 WhatsApp ──► Meta Cloud API (Coexistence) ──► Cloudflare Worker /webhook ──► D1 数据库
你手机回复（echo）──┘                     Peach 的 AI 继续照常回复，不受影响
                                                  │
                         每 10 分钟：AI 分析有新 message 的对话（免费 Workers AI）
                                                  ▼
                                  Dashboard（有密码）https://whatsapp-followup.propertyhomenks.workers.dev
```

- Peach 是 WhatsApp 账户的 partner，我们另外开自己的 Meta app 订阅同一个 WABA，两边并行。
- 只读一对一私聊。WhatsApp Group 读不到（Cloud API 限制）。
- Peach AI 的回复内容看不到，只能从发送状态知道「AI 有回过」（显示「AI 已回」）。这一点要接好后实测确认。

## Dashboard 分类

| 分类 | 条件 |
|---|---|
| 🔴 超过 2 小时你还没回 | 客户最后一条 message 之后，你本人没回，已超过 2 小时 |
| 🆕 新消息 | 同上，但还在 2 小时内 |
| 🔥 AI 判断要马上跟进 | AI：客户有明确意向在等你 |
| 💬 你答应要给的东西 | AI：你答应给资料 / 报价 / 回电还没给 |
| 📅 今天要 follow up | 到了 AI 建议日期，或你回了之后客户 3 天没回 |
| ⏳ 等客户回 / 😴 稍后 / ✅ 已处理 | 收起显示；客户再 message 会自动回到上面 |

每位客户有：AI 一句话总结、下一步、热/温/冷、建议回复草稿（不会自动发出）、「打开 WhatsApp」按钮。

## 费用：全部免费
- Cloudflare Workers / D1：免费方案够用
- Meta Cloud API：接收 message 不收费
- AI：默认用 **Cloudflare Workers AI**（`@cf/qwen/qwen3-30b-a3b-fp8`），每天 10,000 neurons 免费，大约够分析 100 多次对话；超过当天就停，隔天 8am（马来西亚时间）重置，不会扣钱
- 想要更准：设 `ANTHROPIC_API_KEY`（要充值，Haiku 5.5 一个月大约 USD 1–2）就会自动改用 Claude（`AI_MODEL`），不用改代码

## 文件

- `src/worker.js` — webhook、数据库、AI 分析、API
- `src/dashboard.html` — dashboard 页面
- `schema.sql` — D1 数据表
- `wrangler.toml` — Cloudflare 设置

## 设置步骤

### 1. Anthropic API key（可选，要钱；不做就用免费 Workers AI）
1. 去 https://console.anthropic.com 注册 / 登录
2. **Billing** 充值（先充 USD 5 就够用很久）
3. **API Keys** → Create Key → 先复制保存好，第 3 步用。**不要贴在聊天里**

### 2. Cloudflare ✅ 已完成（2026-10-18）
已登录（npx wrangler login）、建好 D1 数据库、部署：https://whatsapp-followup.propertyhomenks.workers.dev

### 3. 输入密钥（你自己输入，每行执行后贴上对应的值）
```
npx wrangler secret put DASH_PASSWORD        # 你自己定的 dashboard 密码
npx wrangler secret put META_VERIFY_TOKEN    # 自己随便定一串字，第 4 步要填一样的
npx wrangler secret put ANTHROPIC_API_KEY    # 可选：第 1 步的 key
npx wrangler secret put META_APP_SECRET      # 第 4 步拿到
npx wrangler secret put META_TOKEN           # 第 5 步拿到
```

### 4. Meta App（你自己操作）
1. https://developers.facebook.com → My Apps → **Create App** → 用途选 **Other** → 类型 **Business** → Business portfolio 选 **Property Library**
2. App 里 **Add product → WhatsApp**。⚠️ **不要按 Add phone number / 注册号码**，不然会影响 Peach
3. **App settings → Basic**：复制 **App secret**（→ 第 3 步 `META_APP_SECRET`），Privacy Policy URL 填 `https://whatsapp-followup.propertyhomenks.workers.dev/privacy`
4. **WhatsApp → Configuration → Webhook**：
   - Callback URL：`https://whatsapp-followup.propertyhomenks.workers.dev/webhook`
   - Verify token：跟 `META_VERIFY_TOKEN` 一样
   - Webhook fields 订阅：**messages**、**smb_message_echoes**
5. 把 App 切换到 **Live** 模式（页面上方的开关）

### 5. System user token（你自己操作）
1. business.facebook.com → 设置 → **System users** → Add → Admin
2. **Assign assets**：WhatsApp 账户 **+60 12-755 9908**（Full control）+ 刚开的 App
3. **Generate token**：选这个 App，权限勾 `whatsapp_business_management`、`whatsapp_business_messaging`，有效期选 Never → 用第 3 步存进 `META_TOKEN`
4. 记下 **WhatsApp Business Account ID**（WhatsApp 账户 → Summary 里有）告诉我，我填进 `wrangler.toml`

### 6. 订阅 + 测试（我来做）
- 调用 `/admin/subscribe` 把我们的 App 订阅到 WABA，`/admin/subscribed` 确认 Peach 还在
- 用另一支手机 message 12-755 9908，看 dashboard 有没有出现

## 本地测试

```
npx wrangler d1 execute whatsapp-followup --local --file schema.sql
npx wrangler dev
```
`.dev.vars` 放本地测试用的密钥（已在 .gitignore）。
