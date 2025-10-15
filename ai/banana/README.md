# NanoBanana AI图片生成插件

基于速创API的NanoBanana模型的图片生成插件，支持文本到图片和图片到图片的生成。

## 目录结构

```
ai/banana/
├── index.js          # 主插件文件
├── .secret.json      # API密钥配置文件
└── README.md         # 使用说明文档
```

## 功能特性

- 🎨 基于文本提示词生成图片
- 🖼️ 支持参考图片进行图片生成
- 🍌 简单易用的banana命令触发
- 📁 自动下载并保存生成的图片到本地
- 🔒 独立的密钥配置文件，不依赖全局配置

## 安装配置

### 1. API密钥配置

在 `ai/banana/.secret.json` 文件中添加您的速创API密钥：

```json
{
  "apiKey": "您的API密钥"
}
```

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

支持两种方式提供参考图片：

#### 1. 通过图片URL

```
banana [提示词] [图片URL]
```

示例：
```
banana 把这张图片变成动漫风格 https://example.com/image.jpg
banana 改变颜色为蓝色调 https://example.com/photo.png
```

#### 2. 直接发送图片

```
banana [提示词] [发送图片]
```

在聊天中直接发送图片，系统会自动识别CQ码格式的图片：
```
banana 动漫风格 [发送一张图片]
banana 转换成油画效果 [发送一张图片]
```

### 获取帮助

```
banana
banana help
```

## 配置文件说明

### .secret.json

```json
{
  "apiKey": "your_api_key_here"
}
```

- `apiKey`: 速创API的授权密钥，必填

## API说明

插件使用速创API的NanoBanana接口：
- 接口地址：`https://api.wuyinkeji.com/api/img/nanoBanana`
- 模型名称：`nano-banana`
- 计费方式：按次计费，0.2元/次

## 注意事项

1. **API密钥**：使用前必须在 `.secret.json` 中配置有效的API密钥
2. **网络要求**：需要稳定的网络连接访问速创API
3. **图片URL**：参考图片必须是公网可访问的URL链接
4. **生成时间**：图片生成需要一定时间，请耐心等待
5. **存储位置**：生成的图片会保存在 `coolq-data/cq/data/image/send/nanoBanana/` 目录下

## 错误处理

- 未配置API密钥：会提示"错误：未配置NanoBanana API密钥，请在ai/banana/.secret.json中添加配置"
- 网络错误：会提示"网络请求失败，请稍后重试"
- API错误：会显示具体的API错误信息
- 图片下载失败：会提示图片ID但无法显示图片

## 技术实现

插件使用两步API调用流程：

1. **图片生成**: 调用NanoBanana生成接口，获得图片ID
2. **图片获取**: 使用图片详情查询接口获取真正的图片下载URL
3. **图片下载**: 从获取到的URL下载图片到本地存储

这种方式确保了图片下载的可靠性和正确性。

## 更新日志

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
