# Property Library 每日广告追踪

Meta Ads 每日追踪 dashboard：花费、Leads、CPL，按 **广告账户** 和 **广告组** 看。两个户口可以合计看，也可以分开看。

- **Dashboard（实时）**：https://claude.ai/artifact/BZNkfiFyNbNHSnHLQSk7Md
- **广告账户**（都在 Property Library business portfolio，货币 MYR）：
  - Ng Kar Siong（ID 464428287731381）
  - 596944990727469（ID 596944990727469，Meta 里这个户口的名字就是它的 ID）
- **数据来源**：Meta Ads connector（`ads_get_ad_entities`），每次打开 dashboard 自动拉最新数据
- **最后更新**：2026-10-23

## Dashboard 内容

| 区块 | 内容 |
|---|---|
| 广告账户按钮 | 两个户口合计（默认）/ Ng Kar Siong / 596944990727469 |
| 时间段按钮 | 今天 / 昨天（默认）/ 近 7 天 / 近 30 天 / 本月 |
| 一句总结 | 所选户口、所选时间段的花费、leads、CPL，和 30 天平均 CPL 比较 |
| 主要数字 | 花费、Leads、CPL、展示次数、链接点击率 |
| 广告组表现表 | 广告账户、广告组、状态、花费、Leads、CPL、展示、链接点击、点击率（可排序、搜索） |
| 每日花费图 | 近 30 天每日花费（RM），跟着广告账户按钮 |
| 每日 CPL 图 | 近 30 天每日 CPL，虚线 = 30 天平均 |
| 每日记录表 | 近 30 天每天：花费、Leads、CPL、展示、链接点击 |

CPL 颜色：绿色 = 低于该户口 30 天平均；红色 = 高于平均 1.5 倍，或花了钱没 lead。

## 指标定义

- **Lead** = Meta「Messaging conversations started」（私讯对话开始，7 天归因）。成效是别的类型的广告组（例如链接点击、电话），leads 算 0，不混进 CPL
- **CPL** = 花费 ÷ leads
- **链接点击率** = 链接点击 ÷ 展示次数

## 数据查询

每个户口各一组（第二个户口的数据名字后面加 `_b`）：

| 数据 | 层级 | 时间 | 用途 |
|---|---|---|---|
| `account` / `account_b` | ad_account | 近 30 天 / 全部 | 广告账户名称 |
| `daily` / `daily_b` | campaign，每日（time_increment=1） | 近 30 天 | 每日合计、30 天平均 |
| `adsets` / `adsets_b` | adset，整段（不分日） | 跟着时间段按钮 | 广告组表现表、主要数字 |

**注意**：用 adset 层级加 time_increment=1 拉 30 天时，Meta 会漏掉一些广告组（近期某些天少了约一半花费）。所以每日合计用 campaign 层级算（已核对跟账户总数一致），广告组表则按整段时间拉。

## 数据快照（2026-10-23 拉取）

| 时间段 | 户口 | 花费 RM | Leads | CPL RM |
|---|---|---:|---:|---:|
| 昨天（2026-10-22） | 合计 | 325.19 | 4 | 81.30 |
| 昨天（2026-10-22） | Ng Kar Siong | 325.19 | 4 | 81.30 |
| 昨天（2026-10-22） | 596944990727469 | 0.00 | 0 | — |
| 近 30 天（2026-09-23 至 10-22） | 合计 | 8,633.19 | 259 | 33.33 |
| 近 30 天（2026-09-23 至 10-22） | Ng Kar Siong | 8,519.73 | 257 | 33.15 |
| 近 30 天（2026-09-23 至 10-22） | 596944990727469 | 113.46 | 2 | 56.73 |

596944990727469 的新广告系列「Jenderam - Keaton- 18/10/26」（3 个私讯广告组，每个 RM 35/天）2026-10-18 才开始投放，所以之前没有数据。

## 每日记录（自动）

每天早上 9 点自动加几行（前一天的数据）：先合计，再每个户口；那天没花费的户口不列。

| 日期 | 户口 | 花费 RM | Leads | CPL RM | 最低 CPL 广告组 | 最高 CPL / 没 lead 的广告组 |
|---|---|---:|---:|---:|---|---|
| 2026-10-22 | 合计 | 325.19 | 4 | 81.30 | — | — |
| 2026-10-22 | Ng Kar Siong | 325.19 | 4 | 81.30 | BPB v6 Ken 26.9.26 – Copy（RM 29.16） | Jenderam - Keat v2 - 18/10/26 – Copy 2（花 RM 39.11，0 lead） |
| 2026-10-21 | 合计 | 369.57 | 11 | 33.60 | — | — |
| 2026-10-21 | Ng Kar Siong | 369.57 | 11 | 33.60 | Sepang Shop - MW - 12/10/26 – Copy（RM 6.29） | Jenderam - Keat v2 - 18/10/26 – Copy（花 RM 43.21，0 lead） |
| 2026-10-20 | 合计 | 291.55 | 12 | 24.30 | — | — |
| 2026-10-20 | Ng Kar Siong | 291.55 | 12 | 24.30 | Jenderam - Keat v2 - 18/10/26 – Copy 2（RM 7.19） | BPB v6 Ken 26.9.26 – Copy（花 RM 38.59，0 lead） |
| 2026-10-19 | 合计 | 435.38 | 12 | 36.28 | — | — |
| 2026-10-19 | Ng Kar Siong | 384.66 | 11 | 34.97 | Sepang Shop - MW - 12/10/26 – Copy（RM 15.47） | Sepang - MW - 15/10/26（花 RM 38.85，0 lead） |
| 2026-10-19 | 596944990727469 | 50.72 | 1 | 50.72 | Jenderam - Keat - 18/10/26 – Copy（RM 18.02） | Jenderam - Keat - 18/10/26 – Copy 2（花 RM 16.99，0 lead） |
| 2026-10-18 | 合计 | 481.14 | 11 | 43.74 | — | — |
| 2026-10-18 | Ng Kar Siong | 418.42 | 10 | 41.84 | Sepang - MW - 15/10/26（RM 18.15） | Impiana shop - Fai - 15/10/26（花 RM 41.55，0 lead） |
| 2026-10-18 | 596944990727469 | 62.72 | 1 | 62.72 | Jenderam - Keat - 18/10/26（RM 19.17） | Jenderam - Keat - 18/10/26 – Copy 2（花 RM 22.27，0 lead） |
| 2026-10-17 | 合计 | 242.44 | 8 | 30.31 | — | — |
| 2026-10-17 | Ng Kar Siong | 242.44 | 8 | 30.31 | Qaya - Ken NKS - 10/26 – Copy（RM 14.83） | Impiana shop - Fai - 15/10/26 – Copy（花 RM 20.66，0 lead） |

## 自动化（每天 9:00）

Claude 云端 routine「Property Library 广告日报（9am，两个户口）」（https://claude.ai/code/routines/trig_01BSrikkArWDpx1krzhgt3Ra ）每天马来西亚时间 9:00 会：

1. 从 Meta Ads 拉两个户口前一天的数据（户口合计 + 每个广告组）。**只读数据，不会开关或修改任何广告**
2. 在上面「每日记录」加几行，更新数据快照
3. 同步到 Notion、Google Drive，push 到 GitHub
4. 发日报到 Telegram 群「Meta Ads Analysis」（bot：@ksiong02_bot）：先两个户口合计，再每个户口一段；每个广告组一行，各区块之间空一行

跑在云端，电脑关着也会准时跑。云端用 `scripts/send-telegram.sh` 发 Telegram，token 存在云端环境「Default」的 Environment variables（`TELEGRAM_BOT_TOKEN`）。GitHub push 需要在这个 repo 装 Claude GitHub App。

以前电脑上的定时任务（Claude 桌面 app）已在 2026-10-20 暂停，需要时可以在 app 的 Scheduled 里重新开。

### 连接 Telegram bot

最简单：在 Property-Library 文件夹跑 `powershell -ExecutionPolicy Bypass -File ads-tracker\scripts\setup-telegram.ps1`，贴上 bot token（不会显示），它会存好 token、找到群、发一条测试讯息。

手动步骤：

1. 在 Telegram 找 **@BotFather**，发 `/newbot`，按提示取名字，拿到 bot token
2. 在你自己的终端跑（把 token 换进去，不要贴到聊天里）：`setx TELEGRAM_BOT_TOKEN "你的token"`
3. 把 bot 拉进群，在群里发 `/start@你的bot名字`（中间不要空格）
4. 开一个新终端，跑 `powershell -ExecutionPolicy Bypass -File ads-tracker\scripts\get-telegram-chat-id.ps1`，它会找到 chat ID 并存好
5. 测试：`powershell -ExecutionPolicy Bypass -File ads-tracker\scripts\send-telegram.ps1 -MessageFile ads-tracker\README.md`

## 文件

- `README.md`：本文件
- `dashboard-page.html`：dashboard 页面的源代码（HTML + JS，给 Dashboard artifact 用）
- `scripts/send-telegram.ps1`：把一个文字文件发到你的 Telegram（读 `TELEGRAM_BOT_TOKEN`、`TELEGRAM_CHAT_ID`）
- `scripts/get-telegram-chat-id.ps1`：找到你的 chat ID 并存成 `TELEGRAM_CHAT_ID`
- `scripts/setup-telegram.ps1`：一步设定（贴 token → 存好 → 找群 → 发测试讯息）

## 更新记录

- **2026-10-20**：日报搬到云端 routine（电脑关着也会跑），电脑上的定时任务暂停；加 `scripts/send-telegram.sh`；确认日报只读数据、不动广告

- **2026-10-18**：加第二个广告账户 596944990727469：dashboard 加户口按钮（合计 / 各户口），日报和 Telegram 都包含两个户口；leads 只算私讯对话成效
- **2026-10-18**：Telegram 日报改版：每个广告组一行，各区块之间空一行（总览 / 最低 CPL / 要注意 / 投放中广告组 / Dashboard）；加 `setup-telegram.ps1` 一步设定
- **2026-10-18**：加每天 9:00 自动日报（Meta Ads → .md / Notion / Drive / GitHub / Telegram），加 Telegram 脚本
- **2026-10-18**：建立 dashboard（Ng Kar Siong 账户，广告组 + 广告账户维度，每日花费 / Leads / CPL）
