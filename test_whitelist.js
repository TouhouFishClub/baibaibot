// 测试白名单功能
const { nanoBananaReply, getNanoBananaHelp } = require('./ai/banana');

console.log('开始测试白名单功能...\n');

// 测试白名单用户
console.log('=== 测试白名单用户 (799018865) ===');
nanoBananaReply('banana测试', '799018865', '管理员', '123456', (result) => {
  console.log('白名单用户结果:', result);
});

// 测试非白名单用户
console.log('\n=== 测试非白名单用户 (111111) ===');
nanoBananaReply('banana测试', '111111', '普通用户', '123456', (result) => {
  console.log('非白名单用户结果:', result);
});

// 测试白名单群组
console.log('\n=== 测试白名单群组 (577587780) ===');
nanoBananaReply('banana测试', '222222', '群组用户', '577587780', (result) => {
  console.log('白名单群组结果:', result);
});

// 测试帮助功能
console.log('\n=== 测试帮助功能 ===');
getNanoBananaHelp((result) => {
  console.log('帮助信息:', result);
}, '799018865', '123456');

console.log('\n测试完成！');


