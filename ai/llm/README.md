# LLM 对话模块

## DeepSeek AI 对话助手

### 功能特性

- 🤖 基于 DeepSeek API 的智能对话
- 💬 支持上下文记忆（最近10轮对话，保持30分钟）
- 🔒 群组使用限制（每小时50次调用）
- 🚀 简单易用的触发词系统
- 🛠️ 完善的错误处理和用户反馈

### 使用方法

#### 基本对话
```
ds 你好
ds 什么是人工智能？
ds 帮我写一个Python函数
```

#### 支持的触发词
- `ds` - 最简洁的触发词
- `deepseek` - 完整名称
- `DS` / `DeepSeek` / `Ds` / `dS` - 大小写变体

#### 特殊命令
- `ds 帮助` 或 `ds help` - 显示使用说明
- `ds 清除历史` 或 `ds clear` 或 `ds 重置` - 清除会话历史

### 配置要求

在 `ai/llm/.secret.json` 文件中配置 DeepSeek API 密钥：

1. 在 `ai/llm/` 目录下创建 `.secret.json` 文件
2. 将你的 DeepSeek API 密钥填入配置文件

```json
{
  "deepseek_api_key": "sk-your-actual-deepseek-api-key-here"
}
```

**获取 DeepSeek API 密钥的步骤：**
1. 访问 [DeepSeek 开放平台](https://platform.deepseek.com/)
2. 注册并登录账号
3. 在控制台中创建新的API密钥
4. 将获得的密钥（以 `sk-` 开头）复制到配置文件中

**注意事项：**
- `.secret.json` 文件包含敏感信息，请不要提交到版本控制系统
- 建议将 `.secret.json` 添加到 `.gitignore` 文件中
- 定期轮换API密钥以保证安全性

### 使用限制

- 每个群组每小时最多调用50次
- 会话历史保持30分钟
- 单次对话最多1000个token
- 支持上下文对话，记住最近10轮对话

### 示例对话

```
用户: ds 你好
AI: 你好！我是DeepSeek AI助手，很高兴为您服务。请问有什么可以帮助您的吗？

用户: ds 请介绍一下自己
AI: 我是基于DeepSeek模型的AI助手，能够帮助您解答问题、进行对话、协助思考等。我会记住我们最近的对话内容，这样可以更好地理解上下文并提供连贯的回答。

用户: ds 清除历史
AI: 会话历史已清除
```

### 技术实现

- 使用 DeepSeek Chat API (`deepseek-chat` 模型)
- 基于 HTTP POST 请求实现
- 支持流式响应处理
- 完善的错误处理和重试机制
- 内存中的会话管理

### 文件结构

```
ai/llm/
├── deepseek.js      # DeepSeek 对话模块主文件
├── .secret.json     # API密钥配置文件（需要手动创建和配置）
└── README.md        # 使用说明文档
```

**重要提醒：** `.secret.json` 文件包含敏感的API密钥信息，请确保：
- 不要将此文件提交到 Git 仓库
- 在 `.gitignore` 中添加 `ai/llm/.secret.json`
- 仅在生产环境中配置真实的API密钥

### 开发者信息

- 集成入口：`baibai2.js` 中的 `handle_msg_D2` 函数
- 触发检测：内容以指定触发词开头时调用 `handleDeepSeekChat`
- 会话管理：基于群组ID和用户QQ号的键值对存储
- 限流机制：基于时间窗口的计数器实现 