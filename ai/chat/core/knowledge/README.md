# 知识库管理

## Web 管理界面

访问地址：`http://localhost:10086/knowledge-admin`

### 配置账号密码

在 `ai/chat/core/.secret.json` 文件中添加以下配置：

```json
{
  "apiKey": "your-deepseek-api-key",
  "knowledgeAdminUsername": "your-username",
  "knowledgeAdminPassword": "your-password"
}
```

如果不配置，默认账号密码为：
- 用户名：`admin`
- 密码：`admin123`

**注意：生产环境请务必修改默认账号密码！**

### 功能说明

1. **添加知识**：点击"添加知识"按钮，填写标题、内容、关键词和分类
2. **编辑知识**：点击知识列表中的条目进行编辑
3. **删除知识**：点击知识条目右侧的"删除"按钮
4. **Markdown 支持**：内容字段支持 Markdown 语法，可以点击"预览"标签查看渲染效果

### API 接口

所有 API 都需要 Basic Auth 认证：

- `GET /api/knowledge/list` - 获取所有知识条目
- `POST /api/knowledge/add` - 添加知识
- `POST /api/knowledge/update` - 更新知识
- `DELETE /api/knowledge/delete?id=xxx` - 删除知识

