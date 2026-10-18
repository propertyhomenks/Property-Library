# WhatsApp 跟进提醒 Dashboard

提醒你还有谁没回、漏掉了谁。追踪号码：**+60 12-755 9908 (Kar Siong)**。

## 怎么运作

```
客户 WhatsApp ──► Meta Cloud API (Coexistence) ──► Cloudflare Worker /webhook ──► D1 数据库
你手机回复（echo）──┘                     Peach 的 AI 继续照常回复，不受影响
                                                  │
                         每 10 分钟：Claude AI 分析有新 message 的对话
                                                  ▼
                                  Dashboard（有密码）https://whatsapp-followup.<你的子域>.workers.dev
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

AI 模型：`claude-haiku-5-5`（`wrangler.toml` 的 `AI_MODEL`，可改成 `claude-opus-5-5`，比较准但贵很多）。

## 文件

- `src/worker.js` — webhook、数据库、AI 分析、API
- `src/dashboard.html` — dashboard 页面
- `schema.sql` — D1 数据表
- `wrangler.toml` — Cloudflare 设置

## 设置步骤

### 1. Anthropic API key（你自己做）
1. 去 https://console.anthropic.com 注册 / 登录
2. **Billing** 充值（先充 USD 5 就够用很久）
3. **API Keys** → Create Key → 先复制保存好，第 3 步用。**不要贴在聊天里**

### 2. Cloudflare（你登录，我来部署）
在这个文件夹的终端执行，会打开浏览器让你登录 Cloudflare：
```
npx wrangler login
```
然后我会建 D1 数据库、建表、部署，拿到网址：`https://whatsapp-followup.<子域>.workers.dev`

### 3. 输入密钥（你自己输入，每行执行后贴上对应的值）
```
npx wrangler secret put DASH_PASSWORD        # 你自己定的 dashboard 密码
npx wrangler secret put META_VERIFY_TOKEN    # 自己随便定一串字，第 4 步要填一样的
npx wrangler secret put ANTHROPIC_API_KEY    # 第 1 步的 key
npx wrangler secret put META_APP_SECRET      # 第 4 步拿到
npx wrangler secret put META_TOKEN           # 第 5 步拿到
```

### 4. Meta App（你自己操作）
1. https://developers.facebook.com → My Apps → **Create App** → 用途选 **Other** → 类型 **Business** → Business portfolio 选 **Property Library**
2. App 里 **Add product → WhatsApp**。⚠️ **不要按 Add phone number / 注册号码**，不然会影响 Peach
3. **App settings → Basic**：复制 **App secret**（→ 第 3 步 `META_APP_SECRET`），Privacy Policy URL 填 `https://whatsapp-followup.<子域>.workers.dev/privacy`
4. **WhatsApp → Configuration → Webhook**：
   - Callback URL：`https://whatsapp-followup.<子域>.workers.dev/webhook`
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
