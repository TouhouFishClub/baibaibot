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
| `node script/fillUnknownDrawPool.js scan 30` | 仅扫描近 30 天，列出可回填/跳过原因，**不写入** |

### 说明

- 按 `item_name` 去括号后匹配 `alias`；若无 `alias` 则回退 `_id` 精确匹配，取该道具在 gacha 信息中**最后一条** `info[].pool` 作为手帕名。
- 同一 `item_name` 在时间窗口内会批量 `updateMany`，无需人工确认。
- 若 gacha 表无对应道具，该条会跳过；可用 `scan` 模式查看具体是哪些 `item_name` 未匹配。
- 若大量跳过且原因为「gacha 表无匹配」，可运行一次 `node ai/mabinogi/gacha/format.js` 为旧文档补全 `alias` 字段。

---

## dedupDistributedRecords.js

检查并清理因「同 IP 多开推送客户端 / 短时重复推送」产生的重复入库。**默认**与 [`ai/mabinogi/mabiPusher.js`](../ai/mabinogi/mabiPusher.js) 一致：**30 秒**内相同内容视为重复，保留最早一条；可用 `--ms` 自定义时间窗口。

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
| `--ms 1000` | 去重窗口为 **1000 毫秒**（1 秒内相同内容视为重复） |
| `--ms=30000` | 同上，等号写法 |
| `scan` | 仅扫描并列出，不删除 |
| `yes-col` | 按**集合**各确认一次后批量删除 |
| `yes-all` | 扫描后**一次性**确认删除全部重复 |

未指定 `--ms` 时默认 `30000`（30 秒）。`--ms` 后的数字不会被当作「天数」解析。

交互确认（未带 `yes-*` 时）：`y` 删除当前条，`n` 跳过，`q` 退出。

### 常用命令

```bash
# 近 30 天，逐条确认（默认）
node script/dedupDistributedRecords.js

# 近 7 天，仅查看
node script/dedupDistributedRecords.js 7 scan

# 1 秒内相同 raw 视为重复，全量仅扫描
node script/dedupDistributedRecords.js all scan --ms 1000

# 全量仅扫描（默认 30 秒窗口，推荐第一步）
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
- 若两条记录间隔超过当前去重窗口（默认 30 秒，或 `--ms` 指定值），即使内容相同也不会被判为重复。

---

## backfillMbcdNewFormat.js

将 `cl_mabinogi_pusher` 中 **byte=2**、新格式抽蛋播报（`{角色}获得了{物品}道具`）在修复 `mabiPusher` 之前未写入 `cl_mbcd_ylx` / `cl_mbcd_yate` 的记录补写回去。

### 会处理的记录

- `time >=` 起始日期（默认 **2026-06-12 国服零点**）
- `byte === 2`
- `str` 匹配新格式 `获得了{物品}道具`（末尾句号可有可无）
- 在对应 `cl_mbcd_{server}` 中尚不存在相同 `server` + `raw` + `ts` 的记录

旧格式 `获得了道具{物品}` 已由当时逻辑正常分发，本脚本不会重复处理。

### 命令

| 命令 | 说明 |
|------|------|
| `node script/backfillMbcdNewFormat.js scan` | 仅扫描待补写数量与样例，**不写入** |
| `node script/backfillMbcdNewFormat.js` | 扫描后交互确认再写入 |
| `node script/backfillMbcdNewFormat.js yes` | 扫描后直接写入（跳过确认） |
| `node script/backfillMbcdNewFormat.js --since 2026-06-11` | 自定义起始日期 |
| `node script/backfillMbcdNewFormat.js scan --since=2026-06-12` | 组合使用 |

### 推荐流程

1. `node script/backfillMbcdNewFormat.js scan` — 确认待补写条数与样例  
2. `node script/backfillMbcdNewFormat.js` — 确认后写入  
3. （可选）`node script/fillUnknownDrawPool.js 30` — 为仍缺手帕名的记录回填 `draw_pool`

---

## 相关代码

- 推送与去重逻辑：[`ai/mabinogi/mabiPusher.js`](../ai/mabinogi/mabiPusher.js)
