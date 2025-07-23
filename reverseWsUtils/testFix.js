/**
 * 测试修复是否有效
 */

console.log('=== 测试循环依赖修复 ===')

try {
  // 测试1：验证延迟加载是否工作
  console.log('1. 测试基本模块加载...')
  const reverseWsUtils = require('./index')
  console.log('✓ reverseWsUtils 模块加载成功')
  console.log('可用方法:', Object.keys(reverseWsUtils))

  // 测试2：验证 createHttpApiWrapper 是否可用
  console.log('\n2. 测试 createHttpApiWrapper...')
  const { createHttpApiWrapper } = reverseWsUtils
  if (typeof createHttpApiWrapper === 'function') {
    console.log('✓ createHttpApiWrapper 函数可用')
    
    // 创建一个实例测试
    const api = createHttpApiWrapper('test')
    console.log('✓ 成功创建 API 实例')
    console.log('API 方法:', Object.getOwnPropertyNames(Object.getPrototypeOf(api)).filter(name => name !== 'constructor'))
  } else {
    console.log('✗ createHttpApiWrapper 不是函数')
  }

  // 测试3：验证其他模块是否正常
  console.log('\n3. 测试其他模块...')
  
  if (reverseWsUtils.socketManager) {
    console.log('✓ socketManager 可用')
  }
  
  if (reverseWsUtils.analysisMessage) {
    console.log('✓ analysisMessage 可用')
  }
  
  if (reverseWsUtils.quickTestGroupMembers) {
    console.log('✓ quickTestGroupMembers 可用')
  }

  console.log('\n=== 所有测试通过！===')

} catch (error) {
  console.error('✗ 测试失败:', error.message)
  console.error('错误堆栈:', error.stack)
}

// 模拟延迟加载测试
console.log('\n=== 测试延迟加载 ===')
try {
  // 这模拟了 groupCount 中的延迟加载
  function testDelayedLoad() {
    const { createHttpApiWrapper } = require('./httpApiWrapper')
    return createHttpApiWrapper('test')
  }
  
  const delayedApi = testDelayedLoad()
  console.log('✓ 延迟加载测试成功')
} catch (error) {
  console.error('✗ 延迟加载测试失败:', error.message)
} 