# Ng Kar Siong 每日广告追踪

Meta Ads 每日追踪 dashboard：花费、Leads、CPL，按 **广告账户** 和 **广告组** 看。

- **Dashboard（实时）**：https://claude.ai/artifact/BZNkfiFyNbNHSnHLQSk7Md
- **广告账户**：Ng Kar Siong（ID 464428287731381），货币 MYR，属于 Property Library business portfolio
- **数据来源**：Meta Ads connector（`ads_get_ad_entities`），每次打开 dashboard 自动拉最新数据
- **最后更新**：2026-10-18

## Dashboard 内容

| 区块 | 内容 |
|---|---|
| 时间段按钮 | 今天 / 昨天（默认）/ 近 7 天 / 近 30 天 / 本月 |
| 一句总结 | 所选时间段的花费、leads、CPL，和 30 天平均 CPL 比较 |
| 主要数字 | 花费、Leads、CPL、展示次数、链接点击率 |
| 广告组表现表 | 广告账户、广告组、状态、花费、Leads、CPL、展示、链接点击、点击率（可排序、搜索） |
| 每日花费图 | 近 30 天整个账户每日花费（RM） |
| 每日 CPL 图 | 近 30 天每日 CPL，虚线 = 30 天平均 |
| 每日记录表 | 近 30 天每天：花费、Leads、CPL、展示、链接点击 |

CPL 颜色：绿色 = 低于 30 天平均；红色 = 高于平均 1.5 倍，或花了钱没 lead。

## 指标定义

- **Lead** = Meta「Messaging conversations started」（私讯对话开始，7 天归因），即 Ads Manager 里的「成效」
- **CPL** = 花费 ÷ leads
- **链接点击率** = 链接点击 ÷ 展示次数

## 数据查询

| 数据 | 层级 | 时间 | 用途 |
|---|---|---|---|
| `account` | ad_account | 近 30 天 | 广告账户名称 |
| `daily` | campaign，每日（time_increment=1） | 近 30 天 | 每日合计、30 天平均 |
| `adsets` | adset，整段（不分日） | 跟着时间段按钮 | 广告组表现表、主要数字 |

**注意**：用 adset 层级加 time_increment=1 拉 30 天时，Meta 会漏掉一些广告组（近期某些天少了约一半花费）。所以每日合计用 campaign 层级算（已核对跟账户总数一致），广告组表则按整段时间拉。

## 数据快照（2026-10-18 拉取）

| 时间段 | 花费 RM | Leads | CPL RM |
|---|---:|---:|---:|
| 昨天（2026-10-17） | 242.44 | 8 | 30.31 |
| 近 30 天（2026-09-18 至 10-17） | 8,423.86 | 247 | 34.10 |

## 每日记录（自动）

每天早上 9 点自动加一行（前一天的数据，整个账户）。

| 日期 | 花费 RM | Leads | CPL RM | 最低 CPL 广告组 | 最高 CPL / 没 lead 的广告组 |
|---|---:|---:|---:|---|---|
| 2026-10-17 | 242.44 | 8 | 30.31 | Qaya - Ken NKS - 10/26 – Copy（RM 14.83） | Impiana shop - Fai - 15/10/26 – Copy（花 RM 20.66，0 lead） |

## 自动化（每天 9:00）

Claude 桌面 app 的定时任务「Ng Kar Siong 广告日报」每天 9:00 会：

1. 从 Meta Ads 拉前一天的数据（账户合计 + 每个广告组）
2. 在上面「每日记录」加一行，更新数据快照
3. 同步到 Notion、Google Drive，push 到 GitHub
4. 发日报到 Telegram

只有 Claude 桌面 app 开着时才会跑；9 点时 app 没开，下次打开 app 时会补跑。

### 连接 Telegram bot

1. 在 Telegram 找 **@BotFather**，发 `/newbot`，按提示取名字，拿到 bot token
2. 在你自己的终端跑（把 token 换进去，不要贴到聊天里）：`setx TELEGRAM_BOT_TOKEN "你的token"`
3. 在 Telegram 打开你的 bot，发 `/start`
4. 开一个新终端，跑 `powershell -ExecutionPolicy Bypass -File ads-tracker\scripts\get-telegram-chat-id.ps1`，它会找到你的 chat ID 并存好
5. 测试：`powershell -ExecutionPolicy Bypass -File ads-tracker\scripts\send-telegram.ps1 -MessageFile ads-tracker\README.md`

想发到群组：把 bot 拉进群，在群里发一句话，再跑第 4 步。

## 文件

- `README.md`：本文件
- `dashboard-page.html`：dashboard 页面的源代码（HTML + JS，给 Dashboard artifact 用）
- `scripts/send-telegram.ps1`：把一个文字文件发到你的 Telegram（读 `TELEGRAM_BOT_TOKEN`、`TELEGRAM_CHAT_ID`）
- `scripts/get-telegram-chat-id.ps1`：找到你的 chat ID 并存成 `TELEGRAM_CHAT_ID`

## 更新记录

- **2026-10-18**：加每天 9:00 自动日报（Meta Ads → .md / Notion / Drive / GitHub / Telegram），加 Telegram 脚本
- **2026-10-18**：建立 dashboard（Ng Kar Siong 账户，广告组 + 广告账户维度，每日花费 / Leads / CPL）
