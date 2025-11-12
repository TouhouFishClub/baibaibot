# 豆包绘图 API 使用示例

## 快速开始

### 1. 配置 API 密钥

确保在项目根目录的 `.secret.json` 中已添加豆包配置：

```json
{
  "doubao": {
    "apiKey": "acc59b5c-c423-45a8-adae-b04268d2dcd5"
  }
}
```

### 2. 基本使用

#### 纯文字生成图片

```
doubao 一只可爱的小猫咪
```

```
doubao Generate 3 images of a girl and a cow plushie happily riding a roller coaster in an amusement park
```

#### 基于参考图生成

```
doubao 把这张图转换成动漫风格 https://example.com/image.jpg
```

或者直接发送图片：

```
doubao 动漫风格 [发送一张图片]
```

#### 获取帮助

```
doubao help
```

或

```
doubao
```

## API 参数说明

豆包 API 支持以下参数：

- **model**: 模型名称（默认：`doubao-seedream-4-0-250828`）
- **prompt**: 文本提示词（必填）
- **image**: 参考图片URL数组（可选）
- **response_format**: 响应格式（默认：`url`）
- **size**: 图片尺寸（默认：`2K`）
  - 可选值：`1K`, `2K`, `4K`
- **watermark**: 是否添加水印（默认：`true`）
- **sequential_image_generation**: 连续生成模式（可选）
  - 可选值：`auto`, `on`, `off`
- **sequential_image_generation_options**: 连续生成选项
  - `max_images`: 最多生成图片数量

## 与 banana 的区别

| 特性 | banana | doubao |
|------|--------|--------|
| 模型 | NanoBanana | 豆包 SeeDream 4.0 |
| 预设 prompt | ✅ 支持 | ❌ 不支持 |
| 回复消息 | ✅ 支持 | ❌ 暂不支持 |
| 私有域名图片 | ✅ 自动处理 | ❌ 需要公网URL |
| 多图生成 | ⚠️ 需参考图 | ✅ 可连续生成 |

## 注意事项

1. **API 密钥**：必须在 `.secret.json` 中正确配置
2. **权限限制**：仅白名单群组和用户可使用
3. **参考图片**：必须是公网可访问的 URL
4. **超时设置**：API 请求超时时间为 60 秒
5. **存储位置**：生成的图片保存在 `coolq-data/cq/data/image/send/doubao/`

## 故障排查

### 问题：提示未配置 API 密钥

**解决方法**：
1. 检查 `.secret.json` 文件是否存在于项目根目录
2. 确认文件格式正确（有效的 JSON）
3. 确认 `doubao.apiKey` 字段已正确填写

### 问题：API 返回错误

**常见错误**：
- `InvalidParameter`: 参数错误，检查图片 URL 是否可访问
- `Timeout`: 超时错误，图片 URL 无法下载
- `AuthenticationError`: 认证失败，检查 API 密钥是否正确

**解决方法**：
1. 确保图片 URL 是公网可访问的
2. 检查 API 密钥是否有效
3. 查看控制台日志获取详细错误信息

### 问题：生成的图片无法显示

**解决方法**：
1. 检查存储目录是否有写入权限
2. 确认 `coolq-data/cq/data/image/send/doubao/` 目录是否存在
3. 查看控制台是否有图片下载失败的错误

## 开发调试

启用详细日志：

在 `ai/doubao/index.js` 中，所有的 API 调用都会输出详细的调试日志：

- 请求参数
- API 响应
- 图片下载进度
- 错误信息

查看这些日志可以帮助你诊断问题。

## 示例会话

```
用户: doubao 一只在草地上奔跑的金毛犬
机器人: 🎨 正在使用豆包生成图片，请稍候...
机器人: [图片]

用户: doubao 把这张图转成卡通风格 https://example.com/dog.jpg
机器人: 🎨 正在使用豆包生成图片（基于 1 张参考图），请稍候...
机器人: [图片]

用户: doubao help
机器人: [显示帮助信息]
```

## 更多信息

详细的技术文档请参阅 [README.md](./README.md)

