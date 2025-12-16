/**
 * QQ群聊年度报告生成器配置 - Node.js版本
 */

module.exports = {
  // 词频统计参数
  TOP_N: 200,                    // 提取前N个高频词
  MIN_FREQ: 1,                   // 最小词频阈值
  MIN_WORD_LEN: 1,               // 最小词长
  MAX_WORD_LEN: 10,              // 最大词长

  // 新词发现参数
  PMI_THRESHOLD: 2.0,            // PMI阈值
  ENTROPY_THRESHOLD: 0.5,        // 信息熵阈值
  NEW_WORD_MIN_FREQ: 20,         // 新词最小频次

  // 词组合并参数
  MERGE_MIN_FREQ: 30,            // 词组合并最小频次
  MERGE_MIN_PROB: 0.3,           // 词组合并条件概率阈值
  MERGE_MAX_LEN: 6,              // 词组合并最大长度

  // 单字过滤参数
  SINGLE_MIN_SOLO_RATIO: 0.01,   // 单字独立出现比例阈值
  SINGLE_MIN_SOLO_COUNT: 5,      // 单字独立出现次数阈值

  // 排行榜配置
  RANK_TOP_N: 10,                // 排行榜显示前N名
  CONTRIBUTOR_TOP_N: 10,         // 热词贡献者显示前N名
  SAMPLE_COUNT: 10,              // 每个热词显示的示例消息数量

  // 时段配置
  NIGHT_OWL_HOURS: [0, 1, 2, 3, 4, 5],      // 夜猫子时段
  EARLY_BIRD_HOURS: [6, 7, 8],               // 早起鸟时段

  // 词汇黑白名单
  WHITELIST: new Set([]),
  BLACKLIST: new Set([]),

  // 备用锐评列表
  FALLBACK_COMMENTS: [
    "群友的快乐，简单又纯粹",
    "这个词承载了太多故事",
    "高频出现，必有原因",
    "群聊精华，浓缩于此",
    "每一次使用都是一次认同",
    "年度最佳复读内容",
    "群友的精神图腾",
    "打工人的快乐源泉",
    "网络冲浪必备单品",
    "社交货币硬通货",
    "群聊氛围担当",
    "情绪价值拉满",
    "网感拉满的证明",
    "互联网嘴替本替",
    "电子榨菜实锤了",
    "赛博朋克新语言",
    "数字原住民的暗号",
    "网络社交学必修课",
    "当代年轻人的精神寄托",
    "互联网黑话入门",
    "群聊文化的活化石",
    "网络梗王预定",
    "流量密码找到了",
    "整活儿必备道具",
    "网络冲浪高级玩家",
  ],

  // 榜单配置
  RANKING_CONFIG: [
    { title: '群聊噪音', key: '话痨榜', icon: '🏆', unit: '条' },
    { title: '打字民工', key: '字数榜', icon: '📝', unit: '字' },
    { title: '小作文狂', key: '长文王', icon: '📖', unit: '' },
    { title: '表情狂人', key: '表情帝', icon: '😂', unit: '个' },
    { title: '我的图图', key: '图片狂魔', icon: '🖼️', unit: '张' },
    { title: '转发机器', key: '合并转发王', icon: '📦', unit: '次' },
    { title: '回复劳模', key: '回复狂', icon: '💬', unit: '次' },
    { title: '回复黑洞', key: '被回复最多', icon: '⭐', unit: '次' },
    { title: '艾特狂魔', key: '艾特狂', icon: '📢', unit: '次' },
    { title: '人气靶子', key: '被艾特最多', icon: '🎯', unit: '次' },
    { title: '链接仓鼠', key: '链接分享王', icon: '🔗', unit: '条' },
    { title: '阴间作息', key: '深夜党', icon: '🌙', unit: '条' },
    { title: '早八怨种', key: '早起鸟', icon: '🌅', unit: '条' },
    { title: '复读机器', key: '复读机', icon: '🔄', unit: '次' },
  ],

  // 颜色配置
  WORD_COLORS: [
    '#DC2626', '#EA580C', '#D97706', '#CA8A04', '#65A30D',
    '#16A34A', '#0D9488', '#0891B2', '#2563EB', '#7C3AED'
  ]
}

