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

## 文件

- `README.md`：本文件
- `dashboard-page.html`：dashboard 页面的源代码（HTML + JS，给 Dashboard artifact 用）

## 更新记录

- **2026-10-18**：建立 dashboard（Ng Kar Siong 账户，广告组 + 广告账户维度，每日花费 / Leads / CPL）
