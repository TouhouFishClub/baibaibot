# 洛奇推送数据维护脚本

在项目根目录执行（需能访问 `baibaiConfigs` 中配置的 MongoDB）。本项目使用 **mongodb@2.x** 驱动，脚本已使用 `count` / `remove` 等旧版 API。

```bash
cd /path/to/baibaibot
node script/<脚本名>.js [参数...]
```

---

## fillUnknownDrawPool.js

根据 `cl_mabinogi_gacha_info` 的 `alias` 字段，为抽卡记录（`cl_mbcd_ylx` / `cl_mbcd_yate`）回填缺失的 `draw_pool`（手帕名）。

### 会处理的记录

时间范围内，且 `draw_pool` 为以下任一情况：

- 字段不存在
- `null` / 空字符串
- `'未知手帕'`

### 命令

| 命令 | 说明 |
|------|------|
| `node script/fillUnknownDrawPool.js` | 默认近 **1** 天 |
| `node script/fillUnknownDrawPool.js 3` | 近 **3** 天 |
| `node script/fillUnknownDrawPool.js 30` | 近 **30** 天 |

### 说明

- 按 `item_name` 去括号后匹配 `alias`，取该 alias 在 gacha 信息中**最后一条** `info[].pool` 作为手帕名。
- 同一 `item_name` 在时间窗口内会批量 `updateMany`，无需人工确认。
- 若 gacha 表无对应 alias，该条会跳过。

---

## dedupDistributedRecords.js

检查并清理因「同 IP 多开推送客户端 / 短时重复推送」产生的重复入库。判定规则与 [`ai/mabinogi/mabiPusher.js`](../ai/mabinogi/mabiPusher.js) 一致：**30 秒内相同内容视为重复，保留最早一条**。

### 扫描的集合

| 类型 | 集合 |
|------|------|
| 主推流 | `cl_mabinogi_pusher` |
| 抽卡 | `cl_mbcd_ylx`、`cl_mbcd_yate` |
| 副本 | `cl_mbtv_ylx`、`cl_mbtv_yate` |
| 制作 | `cl_mbzz_ylx`、`cl_mbzz_yate` |
| 走私 | `cl_mabinogi_smuggler` |

### 参数说明

参数顺序任意，可组合使用：

| 参数 | 含义 |
|------|------|
| `30`（数字） | 扫描近 N 天（默认 30） |
| `all` | 全量扫描（所有含有效 `ts` 的记录） |
| `scan` | 仅扫描并列出，不删除 |
| `yes-col` | 按**集合**各确认一次后批量删除 |
| `yes-all` | 扫描后**一次性**确认删除全部重复 |

交互确认（未带 `yes-*` 时）：`y` 删除当前条，`n` 跳过，`q` 退出。

### 常用命令

```bash
# 近 30 天，逐条确认（默认）
node script/dedupDistributedRecords.js

# 近 7 天，仅查看
node script/dedupDistributedRecords.js 7 scan

# 全量仅扫描（推荐第一步）
node script/dedupDistributedRecords.js all scan

# 全量，按集合确认删除（全量清理推荐）
node script/dedupDistributedRecords.js all yes-col

# 全量，一次性删除全部重复（确认 scan 结果后再用）
node script/dedupDistributedRecords.js all yes-all

# 近一年，按集合确认
node script/dedupDistributedRecords.js 365 yes-col
```

### 全量清理推荐流程

1. `all scan` — 查看各集合重复数量  
2. `all yes-col` — 按集合确认删除（比逐条省事，比 `yes-all` 更稳）  
3. （可选）`all yes-all` — 统计无误后一次性删（最快，慎用）

### 注意事项

- **删除前建议备份** MongoDB 相关集合。
- 脚本在能连上生产库的服务器上运行；本地若连不上内网 Mongo 会超时。
- 只会删除「重复条」（窗口内较晚的记录），不会删除每组中最早的一条。
- 若两条记录间隔超过 30 秒，即使内容相同也不会被判为重复。

---

## 相关代码

- 推送与去重逻辑：[`ai/mabinogi/mabiPusher.js`](../ai/mabinogi/mabiPusher.js)
