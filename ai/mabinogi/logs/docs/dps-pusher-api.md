# DPS Pusher 上传接口对接文档

BlonyMonitorV2 客户端在本地保存战斗历史后，会按条件自动将数据 POST 到配置的上传地址。

## 基本信息

| 项目 | 值 |
|------|-----|
| Endpoint | 由 `.env`、环境变量或 GitHub Variables 配置 |
| HTTP 方法 | `POST` |
| Content-Type | `multipart/form-data` |
| 鉴权 | `HMAC-SHA256` 请求签名（必填） |
| 超时 | 客户端 15 秒 |

客户端配置分三层（优先级从低到高）：

1. `internal/config/config.go` — 代码中的公开默认值（可入库）
2. `.env` — 运行时本地文件（**不入库**，见 `.gitignore`）
3. 系统环境变量 — 最高优先级

**官方 Release 由 GitHub Actions 在编译时通过 `-ldflags` 将 Secrets / Variables 注入 exe，Release zip 中不包含 `.env`。**

| 配置项 | 说明 |
|--------|------|
| `UploadEndpoint` | 上传地址 |
| `UploadSecret` | HMAC 密钥（敏感，走 GitHub **Secret**） |
| `UploadDungeonKeyword` | 副本名关键字过滤 |
| `MinUploadTargetMaxHP` | 最低 Boss 血量过滤（仅代码配置） |

### GitHub Secrets 与 Variables（维护者推荐）

路径：**仓库 Settings → Secrets and variables → Actions**

#### Secrets（加密，日志中自动打码）

| 名称 | 必填 | 说明 |
|------|------|------|
| `BLONY_UPLOAD_SECRET` | 是 | HMAC 签名密钥，与服务端一致，建议 ≥32 位随机字符串 |

添加步骤：

1. 打开 GitHub 仓库 → **Settings**
2. 左侧 **Secrets and variables** → **Actions**
3. 切到 **Secrets** 标签 → **New repository secret**
4. Name 填 `BLONY_UPLOAD_SECRET`，Value 填你的密钥 → **Add secret**

#### Variables（非敏感，可公开在仓库内）

| 名称 | 必填 | 说明 |
|------|------|------|
| `BLONY_UPLOAD_ENDPOINT` | 是 | 推送地址 |
| `BLONY_UPLOAD_DUNGEON_KEYWORD` | 否 | 副本关键字，默认 `布里列赫` |
| `BLONY_UPLOAD_ENABLED` | 否 | `true` / `false`，默认 `true` |

添加步骤：

1. 同上进入 **Secrets and variables → Actions**
2. 切到 **Variables** 标签 → **New repository variable**
3. 按需添加 `BLONY_UPLOAD_ENDPOINT` 等

#### CI 如何注入

`.github/workflows/release.yml` 在 **Build application** 步骤读取 Secrets / Variables，通过 Go `-ldflags` 编译进 exe（密钥以 Base64 注入，避免明文出现在构建参数中）：

```
zip 内容示例：
  BlonyMonitorV2.exe   ← 密钥已编译进二进制
  mabidata.db
  sounds/
```

推送 `main` 或打 `v*` 标签触发构建后，下载 Release 即可使用，**密钥不会出现在 GitHub 源码或 Release 附件的明文配置文件中**。

### 本地开发 / Fork 自编译

没有仓库 Secrets 权限时，复制 **`.env.example`** 为 **`.env`**（项目根目录或 `internal/config/.env`，已 gitignore）：

```env
BLONY_UPLOAD_SECRET=你的密钥
BLONY_UPLOAD_ENDPOINT=你的推送地址
```

加载优先级：

```
config.go 默认值 < CI ldflags 注入 < .env < 系统环境变量
```

> **注意**：密钥编译进 exe 后，熟练用户仍可能通过逆向提取。相比附带 `.env` 文件，这种方式不会让用户解压即见明文密钥，但无法做到绝对保密。若需更强防护，应改为用户注册 + 每用户独立 Token。

## 上传触发条件

同时满足以下条件时才会上传：

1. `UploadEndpoint` 非空
2. `UploadSecret` 已配置且不是占位符
3. 保存时的副本/场景名包含 `布里列赫`（`UploadDungeonKeyword`）
4. 已识别到玩家自身 ID（`selfId`）
5. 过滤后至少保留 1 个目标

上传在**后台异步**执行，失败时**不会弹窗或通知用户**，仅写入日志（需开启 `EnableFileLog` 才会落盘）。

---

## 鉴权：HMAC 签名

### 请求头

| Header | 必填 | 说明 |
|--------|------|------|
| `Authorization` | 是 | 格式：`HMAC-SHA256 <hex_signature>` |
| `X-Timestamp` | 是 | Unix 秒级时间戳（字符串） |
| `X-Nonce` | 是 | 16 字节随机数的 hex（32 字符），每次请求唯一 |

### 签名算法

```
fileHash = hex(SHA256(file 二进制内容))
payload  = timestamp + "\n" + nonce + "\n" + playerId + "\n" + fileHash
signature = hex(HMAC-SHA256(secret, payload))
```

说明：

- `timestamp`、`nonce`、`playerId` 均来自请求（`playerId` 为 multipart 字段）
- `file` 为 gzip 压缩后的**原始字节**，与服务端收到的文件内容一致
- 时间戳允许偏差：**±300 秒**（`UploadSignatureMaxSkewSeconds`）

### 服务端验签流程（必须按此顺序）

```
1. 读取 Authorization / X-Timestamp / X-Nonce
2. 校验时间戳在 ±300 秒内
3. 检查 nonce 未使用过（Redis SET NX，TTL 600s），否则 401
4. 解析 multipart，读取 playerId 与 file
5. 计算 fileHash，按公式重算 signature
6. 使用 hmac.Equal 与 Authorization 中的签名比较
7. 验签通过后再做限流、去重、语义校验
```

### Go 验签示例

```go
func verifyUpload(secret string, timestamp int64, nonce, playerID string, gzData []byte, authHeader string) bool {
    const prefix = "HMAC-SHA256 "
    if !strings.HasPrefix(authHeader, prefix) {
        return false
    }
    provided := strings.TrimSpace(strings.TrimPrefix(authHeader, prefix))

    fileHash := sha256.Sum256(gzData)
    payload := fmt.Sprintf("%d\n%s\n%s\n%x", timestamp, nonce, playerID, fileHash)
    mac := hmac.New(sha256.New, []byte(secret))
    mac.Write([]byte(payload))
    expected := hex.EncodeToString(mac.Sum(nil))
    return hmac.Equal([]byte(expected), []byte(provided))
}
```

---

## 请求格式

### multipart 字段

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `playerId` | string | 是 | 上传者游戏内实体 ID |
| `playerName` | string | 否 | 上传者角色名 |
| `dungeonName` | string | 是 | 副本/场景名 |
| `fileName` | string | 是 | 本地文件名 |
| `clientVersion` | string | 是 | 客户端版本 |
| `contentSha256` | string | 是 | `file` 的 SHA-256 hex，便于服务端快速校验 |
| `file` | file | 是 | gzip 压缩的 JSON 战斗数据 |

### 示例（curl，需自行计算签名）

```bash
# 实际请求由客户端自动签名；手动测试时需按上述算法生成 Authorization
curl -X POST "https://your-server.example/dpsPusher" \
  -H "Authorization: HMAC-SHA256 <signature>" \
  -H "X-Timestamp: 1739260800" \
  -H "X-Nonce: a1b2c3d4e5f6789012345678abcdef01" \
  -F "playerId=123456789" \
  -F "playerName=测试角色" \
  -F "dungeonName=布里列赫" \
  -F "fileName=2026-07-12_15-04-05_布里列赫.json.gz" \
  -F "clientVersion=2.2.2" \
  -F "contentSha256=<sha256-hex>" \
  -F "file=@battle.json.gz;type=application/gzip"
```

---

## 服务端防护清单

### 1. 限流（必做）

| 维度 | 建议阈值 |
|------|----------|
| 每 IP | ≤ 30 次 / 分钟 |
| 每 playerId | ≤ 20 次 / 小时 |
| 全局 | ≤ 500 次 / 分钟 |

超出返回 `429 Too Many Requests`。

### 2. 去重（必做）

以下任一组合命中则返回 `200`（幂等）或 `409`，**不要重复入库**：

- `playerId` + `fileName`
- `playerId` + `contentSha256`

建议对 nonce 使用 Redis：`SET upload:nonce:<nonce> 1 EX 600 NX`。

### 3. 文件校验

| 检查项 | 规则 |
|--------|------|
| 文件大小 | ≤ 10 MB |
| Content-Type | `application/gzip` 或 `application/octet-stream` |
| gzip 可解压 | 失败返回 400 |
| JSON 根字段 | 必须含 `targets` 数组且非空 |
| contentSha256 | 须与 `file` 实际 hash 一致 |

### 4. 语义校验（推荐）

| 检查项 | 规则 |
|--------|------|
| dungeonName | 包含 `布里列赫` |
| targets[].bossHP.maxHp | ≥ 200,000,000 |
| targets[].duration | 10 ~ 7200 秒 |
| targets[].totalDamage | > 0 |
| playerId | 纯数字字符串，长度合理（如 1~20 位） |
| cleanedAt / appearedAt | 非未来时间，不早于 30 天前 |

### 5. 传输安全

生产环境请将 Endpoint 改为 **HTTPS**，防止密钥与战斗数据被窃听。

---

## 文件内容（gzip 解压后 JSON）

```json
{
  "targets": [ /* targetExport 数组 */ ]
}
```

### 客户端上传前过滤规则

| 规则 | 说明 |
|------|------|
| 副本过滤 | 仅 `布里列赫` 副本触发上传 |
| 血量过滤 | 仅保留 `bossHP.maxHp >= 200000000` 的目标 |
| 宠物数据 | **保留**（移除会造成 totalDamage / percent 偏差） |

---

## 数据结构参考

### targets[] — 单个 Boss 目标

| 字段 | 类型 | 说明 |
|------|------|------|
| `targetId` | string | 目标实体 ID |
| `targetName` | string | 目标显示名 |
| `totalDamage` | number | 有效总伤害 |
| `dps` | number | 秒伤 |
| `duration` | number | 战斗时长（秒） |
| `cleanedAt` | int64 | 保存时间（厘秒） |
| `appearedAt` | int64 | 首次受击时间（厘秒） |
| `deathTime` | int64 | 死亡时间（厘秒，可选） |
| `attackers` | array | 攻击者列表 |
| `bossHP` | object | Boss 血量时间线 |

### attackers[] — 攻击者

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 攻击者实体 ID |
| `name` | string | 显示名 |
| `totalDamage` | number | 总伤害 |
| `dps` | number | 秒伤 |
| `percent` | number | 占目标总伤百分比 |
| `isPC` | boolean | 是否为玩家角色 |
| `skills` | array | 技能聚合统计 |
| `skillsDetail` | array | 技能明细（含 `hitRecords`） |

### hitRecords[] — 逐击记录

| 字段 | 类型 | 说明 |
|------|------|------|
| `seq` | int64 | 伤害序号 |
| `damage` | number | 有效伤害 |
| `rawDamage` | number | 原始伤害 |
| `overflowDamage` | number | 溢出伤害 |
| `adjusted` | boolean | 是否经溢出修正 |
| `isCritical` | boolean | 是否暴击 |
| `timestamp` | int64 | 时间（厘秒） |

## 时间戳换算

```
毫秒 = timestamp * 10
秒   = timestamp / 100
```

## 建议的服务端处理流程

```
1. 读取并校验签名（Authorization / X-Timestamp / X-Nonce）
2. 限流检查（IP + playerId）
3. 解析 multipart，校验 contentSha256
4. gunzip(file) → JSON 解析
5. 语义校验（副本名、血量、时长等）
6. 去重（playerId + contentSha256）
7. 写入统计表，可选归档原始 gz
8. 返回 HTTP 2xx
```

## 响应建议

客户端**不解析响应体**，仅检查 HTTP 状态码是否在 2xx：

```json
{
  "ok": true,
  "reportId": "uuid-or-hash"
}
```

| 状态码 | 场景 |
|--------|------|
| 401 | 签名无效、时间戳过期、nonce 重放 |
| 400 | 文件/JSON/语义校验失败 |
| 409 | 重复上报（可选） |
| 429 | 限流 |
| 2xx | 成功 |

非 2xx 时客户端静默忽略，不提示用户。

## 版本记录

| 版本 | 日期 | 说明 |
|------|------|------|
| 1.0 | 2026-07-12 | 初始版本：multipart 上传 gzip 战斗快照 |
| 1.1 | 2026-07-12 | 增加 HMAC 签名、contentSha256、服务端防护清单 |
