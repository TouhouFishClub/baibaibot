# NanoBanana AI图片生成插件

基于速创API的NanoBanana模型的图片生成插件，支持文本到图片和图片到图片的生成。

## 目录结构

```
ai/banana/
├── index.js          # 主插件文件
├── .secret.json      # API密钥配置文件
├── presets.json      # 预置prompt配置文件
└── README.md         # 使用说明文档
```

## 功能特性

- 🎨 基于文本提示词生成图片
- 🖼️ 支持参考图片进行图片生成
- 🔄 支持回复消息生成图片
- 🔧 **智能处理QQ私有域名图片**（自动下载并托管）
- ⚡ 完全异步，支持多用户并发调用
- 🎯 预置prompt快捷效果
- 🍌 简单易用的banana命令触发
- 📁 自动下载并保存生成的图片到本地
- 🧹 自动清理临时文件
- 🔒 独立的密钥配置文件，不依赖全局配置

## 安装配置

### 1. API密钥和公网域名配置

在 `ai/banana/.secret.json` 文件中添加您的速创API密钥和公网访问端点：

```json
{
  "apiKey": "您的API密钥",
  "endpoint": "http://your-domain.com:10086"
}
```

**配置说明：**
- `apiKey`（必填）：速创API的授权密钥
- `endpoint`（必填）：服务器的公网访问地址，用于临时托管私有域名图片
  - 格式：`http://域名或IP:端口`
  - 示例：`http://flanb.msharebox.com:10086`
  - 注意：不要在末尾加斜杠

### 2. 获取API密钥

1. 访问 [速创API官网](https://api.wuyinkeji.com/)
2. 注册账号并登录
3. 在控制台的密钥管理页面申请API密钥
4. 将密钥填入 `.secret.json` 文件

## 使用方法

### 基本用法

```
banana [提示词]
```

示例：
```
banana 一只可爱的小猫咪
banana 美丽的风景画，油画风格
banana create a beautiful landscape painting
```

### 基于参考图片生成

支持三种方式提供参考图片：

#### 1. 回复图片消息（推荐）

直接回复包含图片的消息，然后发送banana命令：

```
[回复一张图片消息]
banana 转换成油画风格
```

特点：
- ✅ 最方便快捷
- ✅ 自动提取回复消息中的图片
- ✅ **智能处理QQ私有存储域名**：自动下载并转换为公网可访问URL
- ✅ 如果回复的消息没有图片会自动拒绝以节省API用量
- ✅ 使用后自动清理临时文件

#### 2. 通过图片URL

```
banana [提示词] [图片URL]
```

示例：
```
banana 把这张图片变成动漫风格 https://example.com/image.jpg
banana 改变颜色为蓝色调 https://example.com/photo.png
```

#### 3. 直接发送图片

```
banana [提示词] [发送图片]
```

在聊天中直接发送图片，系统会自动识别CQ码格式的图片：
```
banana 动漫风格 [发送一张图片]
banana 转换成油画效果 [发送一张图片]
```

### 使用预置效果

插件支持预置prompt快捷效果，只需输入触发词即可使用专业的prompt：

```
[回复一张图片]
banana 手办化
```

效果：
- 自动使用预置的专业prompt
- 生成1/7比例手办效果
- 包含工作台场景和原画对比

查看所有可用预置效果：
```
banana help
```

### 查看预置词条列表

```
banana 词条
banana 内置
banana 内置词条
```

这些命令会显示所有可用的预置效果列表，自动读取 `presets.json` 中的所有词条名称。

### 获取帮助

```
banana
banana help
```

## 配置文件说明

### .secret.json

API密钥和公网域名配置文件：

```json
{
  "apiKey": "your_api_key_here",
  "endpoint": "http://your-domain.com:10086"
}
```

**字段说明：**
- `apiKey`（必填）：速创API的授权密钥
- `endpoint`（必填）：服务器的公网访问地址
  - 用于临时托管私有域名图片
  - 必须是公网可访问的地址
  - 格式：`http://域名或IP:端口`（不要末尾斜杠）

### presets.json

预置prompt配置文件，简单的键值对格式：

```json
{
  "手办化": "Your task is to create a photorealistic, masterpiece-quality image...",
  "水彩画": "Transform this image into a beautiful watercolor painting style...",
  "像素画": "Convert this image to 8-bit pixel art style..."
}
```

**使用说明：**

- **Key（键）**: 触发词，用户输入这个词时会使用对应的预置prompt
- **Value（值）**: 完整的prompt内容
- 匹配方式：完全匹配，不区分大小写
- 添加新预置：直接在JSON中添加新的键值对即可

**示例：**

添加新的预置效果：

```json
{
  "手办化": "Your task is to create...",
  "油画": "Transform into oil painting style with rich textures...",
  "动漫化": "Convert to anime art style with vibrant colors..."
}
```

然后用户就可以使用：
```
banana 油画
banana 动漫化
```

## API说明

插件使用速创API的NanoBanana接口：
- 接口地址：`https://api.wuyinkeji.com/api/img/nanoBanana`
- 模型名称：`nano-banana`
- 计费方式：按次计费，0.2元/次

## 权限控制

插件实现了白名单机制，仅允许以下用户使用：

### 白名单群组
- 群组ID: `577587780`

### 白名单用户
- 用户ID: `799018865`
- 用户ID: `2408709050`

满足以下任一条件即可使用：
1. 在白名单群组中的任何用户
2. 白名单用户在任何群组中

非白名单用户将收到"抱歉，您暂无权限使用NanoBanana图片生成功能。"的提示。

## 注意事项

1. **API密钥**：使用前必须在 `.secret.json` 中配置有效的API密钥
2. **权限限制**：仅白名单群组和用户可以使用此功能
3. **网络要求**：需要稳定的网络连接访问速创API
4. **图片URL**：参考图片会自动处理，支持：
   - ✅ 公网可访问的URL（直接使用）
   - ✅ QQ私有域名URL（自动下载并托管）
   - ✅ CQ码格式的图片（自动识别）
5. **生成时间**：图片生成需要一定时间，请耐心等待
6. **存储位置**：
   - 生成的图片：`coolq-data/cq/data/image/send/nanoBanana/`
   - 临时托管图片：`public/temp_banana_images/`（自动清理）
7. **公网访问配置**：
   - 必须在 `.secret.json` 中配置 `endpoint` 字段
   - 该地址必须是外网可访问的（用于AI API获取参考图片）
   - 文件名包含用户ID、时间戳、进程ID和随机字符串，确保多用户并发时不冲突

## 错误处理

- 未配置API密钥：会提示"错误：未配置NanoBanana API密钥，请在ai/banana/.secret.json中添加配置"
- 网络错误：会提示"网络请求失败，请稍后重试"
- API错误：会显示具体的API错误信息
- 图片下载失败：会提示图片ID但无法显示图片

## 技术实现

### 主要流程

1. **图片生成**: 调用NanoBanana生成接口，获得图片ID
2. **图片获取**: 使用图片详情查询接口获取真正的图片下载URL
3. **图片下载**: 从获取到的URL下载图片到本地存储

### 私有域名图片处理

针对QQ的私有存储域名（`multimedia.nt.qq.com.cn`），插件实现了智能处理机制：

1. **检测**: 自动识别私有域名URL
2. **下载**: 将图片下载到本地临时目录 `public/temp_banana_images/`
3. **生成唯一文件名**: 格式 `temp_用户ID_时间戳_进程ID_随机字符.jpg`
   - 包含用户ID：区分不同用户
   - 包含时间戳：精确到毫秒
   - 包含进程ID：防止多进程冲突
   - 包含随机字符：8位随机字符串
4. **托管**: 通过Express静态服务器生成公网可访问URL（使用配置的 `endpoint`）
   - 格式：`http://your-domain.com:10086/temp_banana_images/temp_xxx.jpg`
5. **使用**: 将公网URL传递给AI API进行图片生成
6. **清理**: 
   - 生成完成后立即删除临时文件
   - 定时任务每30分钟清理超过1小时的遗留文件

### 优势

- ✅ 用户无需关心图片来源，回复任何消息都能正常工作
- ✅ 不浪费API用量（只有成功下载后才调用生成API）
- ✅ 自动清理，不占用服务器空间
- ✅ 支持多图片并发处理

## 更新日志

- v1.3.2 (2025-10-29)
  - ✨ 新增预置词条列表查看功能
  - 📋 支持 `banana 词条`、`banana 内置`、`banana 内置词条` 命令
  - 📝 自动读取并显示 presets.json 中的所有词条，无需手动维护分类
  - 🔍 增强预置匹配调试日志
  
- v1.3.1 (2025-10-29)
  - 🔧 使用配置的公网域名（endpoint）代替内网IP
  - 🆔 文件名增强唯一性：用户ID + 时间戳 + 进程ID + 随机字符
  - 🛡️ 防止多用户并发时文件名冲突
  - 📝 更新配置文档，添加endpoint说明
  
- v1.3.0 (2025-10-29)
  - ✨ 新增QQ私有域名图片智能处理功能
  - 🔧 自动下载并托管私有域名图片
  - 🧹 实现临时文件自动清理机制
  - 📊 添加详细的调试日志输出
  - 🔒 支持multimedia.nt.qq.com.cn域名处理
  
- v1.2.0 (2024-10-15)
  - 修复图片下载问题，使用正确的图片详情查询接口
  - 实现图片生成状态轮询，支持排队和生成中状态
  - 改进错误处理和状态反馈
  
- v1.1.0 (2024-10-15)
  - 重构代码结构，移动到ai/banana/目录
  - 使用独立的.secret.json配置文件
  - 不再依赖全局secret.js配置
  
- v1.0.0 (2024-10-15)
  - 初始版本发布
  - 支持文本到图片生成
  - 支持参考图片生成
  - 自动图片下载和本地存储
