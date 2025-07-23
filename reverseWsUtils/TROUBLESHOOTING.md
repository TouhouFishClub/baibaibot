# 反向 WebSocket API 调用故障排除指南

## 问题：获取群成员列表返回 0 人

### 可能的原因

1. **权限问题**：机器人可能没有获取群成员列表的权限
2. **连接问题**：WebSocket 连接可能未正确建立
3. **群ID格式问题**：群ID 可能需要特定格式
4. **缓存问题**：Lagrange.OneBot 可能返回了缓存的空数据

### 诊断步骤

#### 1. 使用调试工具

运行调试工具来获取详细信息：

```bash
# 在项目根目录执行
node reverseWsUtils/debugApiCalls.js [机器人名] [群ID]

# 例如：
node reverseWsUtils/debugApiCalls.js 25334 584155191
```

#### 2. 检查 WebSocket 连接状态

在应用日志中查找以下信息：
- `[ActionManager] WebSocket 连接未找到` - 表示连接问题
- `[ActionManager] 发送动作` - 检查请求是否正确发送
- `[ActionManager] 收到响应` - 检查响应内容

#### 3. 检查 API 响应状态

查找以下日志信息：
- `status: "ok", retcode: 0` - 成功
- `status: "failed"` 或 `retcode != 0` - 失败，检查具体错误码

### 常见错误码

根据 OneBot 标准：
- `retcode: 1403` - 权限不足
- `retcode: 1404` - 群不存在或机器人不在群内
- `retcode: 1400` - 请求参数错误

### 解决方案

#### 1. 权限问题

确保机器人：
- 已加入目标群
- 有管理员权限（如果需要）
- 未被群主/管理员禁用相关功能

#### 2. 参数问题

```javascript
// 确保群ID是数字类型
const groupId = parseInt('584155191')  // 不是字符串

// 尝试清除缓存
const api = createHttpApiWrapper(botName)
const members = await api.getGroupMemberList(groupId, true)  // no_cache=true
```

#### 3. 连接问题

检查 `socketManager` 中是否正确注册了 WebSocket 连接：

```javascript
const { socketManager } = require('./reverseWsUtils')
console.log('可用连接:', Object.keys(socketManager.socket))
```

#### 4. 使用 HTTP 回退

如果反向 WebSocket 持续失败，系统会自动回退到 HTTP 方式。检查以下日志：
- `[HTTP 回退] 成功获取群成员列表` - HTTP 方式工作正常
- `[HTTP 回退] 请求失败` - 两种方式都有问题

### 调试代码示例

```javascript
const { debugGroupMemberList } = require('./reverseWsUtils')

// 调试特定群
debugGroupMemberList('25334', '584155191')

// 比较两种调用方式
const { compareApiMethods } = require('./reverseWsUtils')
compareApiMethods('25334', '584155191')
```

### 手动测试 API

```javascript
const { createHttpApiWrapper } = require('./reverseWsUtils')

async function testApi() {
  const api = createHttpApiWrapper('25334')
  
  try {
    // 1. 测试基础连接
    const version = await api.callApi('get_version_info')
    console.log('版本信息:', version)
    
    // 2. 测试登录状态
    const login = await api.callApi('get_login_info')
    console.log('登录信息:', login)
    
    // 3. 测试群信息
    const groupInfo = await api.getGroupInfo('584155191')
    console.log('群信息:', groupInfo)
    
    // 4. 测试群成员列表
    const members = await api.getGroupMemberList('584155191', true)
    console.log('成员数量:', members.length)
    
  } catch (error) {
    console.error('测试失败:', error.message)
    console.error('错误详情:', error)
  }
}

testApi()
```

### 日志分析

**正常情况下的日志序列：**
```
[ActionManager] 发送动作 [25334]: {"action":"get_group_member_list",...}
[ActionManager] 收到响应: {"status":"ok","retcode":0,"data":[...]}
[ActionManager] 动作成功: get_group_member_list
[反向 WebSocket] 成功获取群 584155191 成员列表，共 X 人
```

**异常情况下的日志：**
```
[ActionManager] 动作失败: get_group_member_list, status: failed, retcode: 1403
[反向 WebSocket] 获取群成员列表失败，回退到 HTTP 方式
[HTTP 回退] 成功获取群 584155191 成员列表，共 X 人
```

### 联系支持

如果问题仍然存在，请提供以下信息：
1. 完整的错误日志
2. 使用的机器人名称和群ID
3. Lagrange.OneBot 版本信息
4. `debugApiCalls.js` 的输出结果

---

## 更新日志

- 2024-12-01: 修复循环依赖问题
- 2024-12-01: 改进错误处理和日志记录
- 2024-12-01: 添加调试工具和故障排除指南 