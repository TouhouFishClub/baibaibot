const crypto = require('crypto')
const path = require('path')
const fs = require('fs')
const axios = require('axios')
const { BOSSES } = require('./bossConfig')
const { CLASSES } = require('./classConfig')
const { listRecordsByBoss } = require('./db')
const { attachSkillBreakdowns, AI_MAX_SKILLS } = require('./skillBreakdown')
const {
  getShanghaiDateKey,
  insertAiSnapshot,
  getLatestAiSnapshot,
  getDailyAiReport,
  upsertDailyAiReport
} = require('./aiAnalysisDb')
const { renderAiAnalysisReport } = require('./renderAiAnalysis')

const TOP_ALL = 20
const TOP_CLASS = 10
const BOSS_SHORTHAND_NAMES = [
  ['一王', '枯木之佩塔克'],
  ['二王', '布隆塔纳斯'],
  ['三王', '雷内恩的米耶尔'],
  ['四王', '雷内恩的米耶尔：悔恨']
]

// Update this knowledge together with game balance/mechanic changes. Keep skill names aligned
// with the combat log; aliases are only explanatory and must not be emitted as new skills.
const ANALYSIS_KNOWLEDGE_VERSION = '2026-07-18'
const ANALYSIS_KNOWLEDGE = {
  bosses: [
    {
      name: '枯木之佩塔克',
      profile: '人形 Boss。通常由圣盾骑士控在原地，偶尔位移攻击；脱仇时可能瞬移到远程队友身边。日志将 P1、P2 记为两个目标，但排行榜合并统计。',
      mechanics: [
        '全局血量85%：打矿，被点名者需攻击矿5次；Boss无敌。',
        '全局血量70%：召唤4个古代守护者，玩家需分别站入范围；4人以下尤其影响近战输出；Boss无敌。',
        '全局血量55%：披萨机制，坦克维持点名并用站位保护队友；Boss无敌。',
        '全局血量50%：切换P2狂暴状态；转阶段无敌。',
        '全局血量35%、25%、15%依次重复打矿、古代守护者、披萨机制；Boss无敌。'
      ]
    },
    {
      name: '布隆塔纳斯',
      profile: '大型马形 Boss。除阶段机制外通常可被坦克控成站桩；可能冲远。吐痰会使玩家结晶，圣光颂唱者可解除；多人队常由远程拉痰，少人队常贴近避免被吐。',
      mechanics: [
        '90%、75%、60%：躲避3段喷火；Boss无敌。',
        '40%、20%：躲避3段喷火及后续大喷；Boss无敌。',
        '50%：3/6/9/12点范围圈跑位并躲避越来越快的喷火；Boss无敌。多人队受配合一致性影响，4人以下因安全圈数量与圈内人数机制可能面对更长、更快的火焰阶段。'
      ]
    },
    {
      name: '雷内恩的米耶尔',
      profile: '人形 Boss。普通阶段位移和跳远程较频繁，控怪难度高，追击能力差或依赖地面技能的职业更容易损失有效输出。',
      mechanics: [
        '80%：随机刷新3球；高伤队可能一轮击杀，伤害不足或少人队可能分三轮；Boss无敌。',
        '60%：在安全区内击杀3球，通常逐个处理；Boss无敌。',
        '40%：刷新5球，常见2+3或2+2+1处理；球聚集时有利于禁术炼金师，球成直线时有利于流星射手；Boss无敌。',
        '30%至25%：队友挡攻击并为目标队员创造角力机会，其他队员可攻击Boss压到25%；伤害不足可能重复多轮。',
        '15%：刷新安全屋，需有人驻守避免神罚；Boss仍可攻击，部分队伍会放弃安全屋直接速杀。'
      ]
    },
    {
      name: '雷内恩的米耶尔：悔恨',
      profile: '雷内恩的米耶尔的强化变种，但属于独立副本。血量超过雷内恩的米耶尔1.5倍且攻略时限约为后者的一半，并周期刷新必须处理的安全屋，对队伍DPS和机制执行要求更高，样本存在明显准入与玩家强度筛选。',
      mechanics: [
        '80%：刷新5球，每轮必须击杀2个；其余特点类似雷内恩的米耶尔40%机制；Boss无敌。',
        '65%：在安全区内击杀3球，需拾取分裂的灵魂才有足够伤害，灵魂越多攻击越高，达到6个会即死；Boss无敌。',
        '50%：纯跑位；Boss无敌。',
        '35%至25%：加强版角力压血机制，只能尝试2次，失败后场地缩小；Boss仍可攻击。',
        '15%：被点名者放置持续掉血圈；Boss仍可攻击，通常选择速杀。'
      ]
    }
  ],
  classes: [
    {
      name: '元素骑士',
      role: '近战输出',
      exclusiveSkills: ['先制防御', '爆炎跳斩', '冰霜风车', '雷霆重击', '突进斩'],
      commonSkills: ['重击', '风车', '无限连击'],
      notes: '突进斩消耗无限连击积攒的能量，是常态主输出；雷霆重击是10秒CD必杀技，可用扭曲特性无视CD连续释放5次。爆炎跳斩与突进斩可追击，但超远位移追击有限。'
    },
    {
      name: '圣光颂唱者',
      role: '辅助/恢复',
      exclusiveSkills: ['净化传播'],
      commonSkills: ['重力场', '星辉绽放', '空间斩', '回旋冲击', '星辉领域', '星之爆破', '疾旋突袭', '穿心箭'],
      notes: '日志无法统计治疗、团队增益和大部分机制贡献。净化传播虽然造成伤害，但主要用于霸体、跑机制和增伤；常见主动伤害主要来自占星术，星辉领域与疾旋突袭是常见主攻技能。不得用纯DPS评价该职业完整价值。'
    },
    {
      name: '黑魔导士',
      role: '中射程远程输出',
      exclusiveSkills: ['龙炎', '闪电链', '暴风雪', '魔法封锁'],
      commonSkills: ['雷击', '火球', '火-雷', '流星'],
      notes: '存在单手魔杖+魔法书的火-雷魔组流派，以及双手法杖雷击流派；只能按技能构成推测流派，不能断言装备。龙炎是10秒CD必杀技，可用扭曲连续释放5次。部分毁坏法杖玩家因装备等级无法进入雷内恩的米耶尔：悔恨，该Boss样本存在准入偏差。'
    },
    {
      name: '流星射手',
      role: '远射程远程输出',
      exclusiveSkills: ['爆炎箭', '水流箭', '线力', '尘土之箭', '元素连击'],
      commonSkills: ['穿心箭', '爆破箭', '幸运箭'],
      notes: '元素连击是36秒CD必杀技，需要充能且不能用扭曲刷新。射程通常足以覆盖Boss位移；线力输出通常不如穿心箭，因此使用较少。高仇恨时可能导致Boss位移并影响全队。'
    },
    {
      name: '圣盾骑士',
      role: '坦克/团队减伤',
      exclusiveSkills: ['圣域庇护', '瞬间挑衅', '盾牌冲撞', '铁壁猛击', '审判一击', '牺牲之惩戒'],
      commonSkills: ['重击', '风车', '无限连击'],
      notes: '通过承伤为队友减伤，并把承受伤害转化为自身攻击。牺牲之惩戒是90秒CD必杀技，可通过被击减少CD；雷内恩的米耶尔及雷内恩的米耶尔：悔恨打球时的高频闪电可使其快速刷新。日志不能完整量化减伤、控怪和承伤贡献，不得只按DPS评价。盾牌冲撞是专用技能，冲撞是通用技能。'
    },
    {
      name: '爆裂骑士枪',
      role: '近战输出',
      exclusiveSkills: ['聚焦连击', '粉碎冲击', '螺旋涡刃', '蓄势突击', '爆裂冲刺', '湮灭'],
      commonSkills: ['骑士枪冲刺'],
      notes: '管理能量与过热，过热满时释放高伤害湮灭；湮灭30秒CD且不能扭曲。骑士枪冲刺可追击但属于通用技能。技能前后摇长，容易受已读条机制影响，换来较高单HIT伤害。'
    },
    {
      name: '枪炮师',
      role: '中射程远程输出',
      exclusiveSkills: ['迅捷射击', '致命狙击', '毁灭加农炮', '重装炮火', '枪手之眼'],
      commonSkills: ['子弹风暴', '十字破坏者', '撤离射击', '冲锋射击'],
      notes: '致命狙击是30秒CD必杀技。通过叠放地面炼金领域强化技能，Boss位移出领域会损失输出；追击能力一般。通常HIT数较高、单HIT较低。'
    },
    {
      name: '禁术炼金师',
      role: '中射程远程输出',
      exclusiveSkills: ['召唤梦魇', '化学狂欢', '螺旋爆裂'],
      commonSkills: ['水炮', '高温爆发'],
      notes: '召唤梦魇是100秒CD高伤必杀技，但释放途中Boss脱离会损失伤害。可因盾铳属于盾牌而使用通用冲撞接近Boss，但整体追击能力有限；球聚集时更容易发挥范围伤害。'
    },
    {
      name: '旋律操纵师',
      role: '中射程召唤输出',
      exclusiveSkills: ['重拍坠音', '猎踪踏影', '终幕绝响', '灵线织网', '间奏斩击'],
      commonSkills: ['第1幕：偶然的冲击', '第2幕：怒气上涌', '第4幕：嫉妒的化身', '第6幕：诱惑陷阱', '第7幕：疯狂地急走'],
      notes: '终幕绝响是45秒CD必杀技。猎踪踏影可让一个人偶驻场攻击同一目标10秒且CD也是10秒，配合另外两个人偶维持场上3人偶；间奏斩击由场上每个人偶在其周边造成伤害，3人偶时收益最高。'
    },
    {
      name: '狂怒斗士',
      role: '近战输出',
      exclusiveSkills: ['燃魂：三连击', '燃魂：三连踢', '燃魂：聚力猛击', '疾风突刺', '愤怒践踏', '烈焰三击'],
      commonSkills: ['连续技 : 突进刺拳', '连续技 : 升龙裂破', '连续技 : 裂空闪', '连续技 : 月轮', '连续技 : 飞身踢', '连续技 : 逆龙袭'],
      notes: '通过快速攻击积攒斗气，再消耗斗气释放技能。烈焰三击没有CD但消耗2斗气。倍率与攻速较高，但几乎只能贴脸且追击能力差，受Boss位移影响最大。普通格斗连续技是通用技能，不是狂怒斗士专用技能。'
    }
  ],
  damageRules: [
    '所有职业都能使用通用技能；人物可通过战术栏携带多套装备并在使用技能时自动切换。副装备通常弱于主攻装备，因此通用技能伤害不能直接用于判断职业归属或操作优劣。',
    'skills.count来自日志hitCount，表示伤害命中次数，不等于施放次数；多段技能尤其不能按count推算施放次数或CD利用率。',
    '连击是全职业可用的随机触发特性：基础一击命中后，额外造成该次伤害的200%。轰击是星尘单体附伤，爆闪是星尘AOE附伤，通常额外造成触发伤害的20%至30%；屏障是低伤害星尘反击。',
    '连击、轰击、爆闪应作为随机附加伤害单列，不得当作职业核心循环。相同基础总伤害和相同逐击触发率下，高单HIT主要带来更大的单场波动与榜单尖峰，不代表理论期望必然更高。',
    '死亡锁定是全职业可用的增伤技能，直接伤害统计意义低，真正增伤贡献未被日志单独归因。格斗精通、双枪精通属于对应武器普通攻击；屏障及这些普通攻击可忽略其技能构成意义。',
    '精灵XX实体化的直接伤害统计意义低，主要价值是其后60至90秒的通用技能增伤；日志当前无法把这部分增伤准确归因。'
  ]
}

const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions'
const DEEPSEEK_MODEL = 'deepseek-chat'

let running = false

function loadDeepSeekApiKey() {
  const secretPaths = [
    path.join(__dirname, '../../chat/core/.secret.json'),
    path.join(__dirname, '../../llm/.secret.json'),
    path.join(__dirname, '.secret.json')
  ]
  for (const secretPath of secretPaths) {
    try {
      if (!fs.existsSync(secretPath)) continue
      const secret = JSON.parse(fs.readFileSync(secretPath, 'utf8'))
      const key = secret.apiKey || secret.deepseek_api_key || secret.DEEPSEEK_API_KEY
      if (key) return String(key)
    } catch (error) {
      // ignore
    }
  }
  return process.env.DEEPSEEK_API_KEY || ''
}

function listBossGroups() {
  const seen = new Set()
  const groups = []
  for (const boss of BOSSES) {
    if (seen.has(boss.groupKey)) continue
    seen.add(boss.groupKey)
    groups.push({
      bossGroup: boss.groupKey,
      bossName: boss.displayName
    })
  }
  return groups
}

function mapRecordRow(record) {
  return {
    characterId: record.characterId,
    characterName: record.characterName,
    characterClass: record.characterClass || '未知',
    dungeonName: record.dungeonName,
    recordTime: record.recordTime,
    teamSize: record.teamSize,
    bossName: record.bossName,
    bossKey: record.bossKey,
    bossGroup: record.bossGroup,
    duration: record.duration,
    dps: record.dps,
    bossHp: record.bossHp,
    totalDamage: record.totalDamage,
    damagePercent: record.damagePercent,
    runId: record.runId
  }
}

function sanitizeSkillName(name) {
  // 旋律操纵师等职业技能名末尾常带客户端标记「AI」，易被 LLM 误解
  return String(name || '').replace(/(?:\s|　)*AI$/i, '').trim()
}

function compactSkills(skills) {
  return (skills || []).map(skill => ({
    name: sanitizeSkillName(skill.name),
    percent: Number((Number(skill.percent) || 0).toFixed(2)),
    count: Number(skill.count) || 0,
    damage: Number(skill.damage) || 0
  })).filter(skill => skill.name)
}

function compactRow(row, rank) {
  return {
    rank,
    characterId: row.characterId || '',
    characterName: row.characterName || '',
    characterClass: row.characterClass || '未知',
    dps: Number(row.dps) || 0,
    duration: Number(row.duration) || 0,
    totalDamage: Number(row.totalDamage) || 0,
    damagePercent: Number(row.damagePercent) || 0,
    teamSize: Number(row.teamSize) || 0,
    recordTime: row.recordTime || null,
    runId: row.runId || '',
    skills: compactSkills(row.skills)
  }
}

async function collectSnapshotData() {
  const bossGroups = listBossGroups()
  const runCache = new Map()
  const bosses = []

  for (const boss of bossGroups) {
    const records = await listRecordsByBoss(boss.bossGroup, TOP_ALL, { bestPerCharacter: true })
    let section = {
      title: boss.bossName,
      bossGroup: boss.bossGroup,
      rows: records.map(mapRecordRow)
    }
    ;[section] = await attachSkillBreakdowns([section], { maxSkills: AI_MAX_SKILLS, runCache })
    bosses.push({
      bossGroup: boss.bossGroup,
      bossName: boss.bossName,
      top20: section.rows.map((row, index) => compactRow(row, index + 1))
    })
  }

  const byClass = {}
  for (const cls of CLASSES) {
    const classBosses = []
    for (const boss of bossGroups) {
      const records = await listRecordsByBoss(boss.bossGroup, TOP_CLASS, {
        bestPerCharacter: true,
        characterClass: cls.name
      })
      let section = {
        title: boss.bossName,
        bossGroup: boss.bossGroup,
        rows: records.map(mapRecordRow)
      }
      ;[section] = await attachSkillBreakdowns([section], { maxSkills: AI_MAX_SKILLS, runCache })
      classBosses.push({
        bossGroup: boss.bossGroup,
        bossName: boss.bossName,
        top10: section.rows.map((row, index) => compactRow(row, index + 1))
      })
    }
    byClass[cls.name] = { bosses: classBosses }
  }

  return {
    collectedAt: new Date().toISOString(),
    bosses,
    byClass
  }
}

function playerKey(row) {
  const id = String(row.characterId || '').trim()
  if (id) {
    return crypto.createHash('sha1').update(id).digest('hex').slice(0, 10)
  }
  const name = String(row.characterName || '').trim()
  if (name) {
    return crypto.createHash('sha1').update(`name:${name}`).digest('hex').slice(0, 10)
  }
  return `rank${row.rank || 0}`
}

function anonymizeRow(row) {
  return {
    rank: row.rank,
    playerKey: playerKey(row),
    characterClass: row.characterClass || '未知',
    dps: row.dps,
    duration: row.duration,
    totalDamage: row.totalDamage,
    damagePercent: row.damagePercent,
    teamSize: row.teamSize,
    skills: compactSkills(row.skills)
  }
}

function anonymizeSnapshot(snapshot) {
  if (!snapshot) return null
  const data = snapshot.data || snapshot
  return {
    collectedAt: data.collectedAt || snapshot.createdAt || null,
    bosses: (data.bosses || []).map(boss => ({
      bossGroup: boss.bossGroup,
      bossName: boss.bossName,
      top20: (boss.top20 || []).map(anonymizeRow)
    })),
    byClass: Object.fromEntries(
      Object.entries(data.byClass || {}).map(([className, info]) => [
        className,
        {
          bosses: (info.bosses || []).map(boss => ({
            bossGroup: boss.bossGroup,
            bossName: boss.bossName,
            top10: (boss.top10 || []).map(anonymizeRow)
          }))
        }
      ])
    )
  }
}

function buildSystemPrompt() {
  const classNames = CLASSES.map(cls => cls.name).join('、')
  const bossNames = BOSSES.map(boss => boss.displayName).filter((name, index, all) => all.indexOf(name) === index).join('、')
  const knowledge = JSON.stringify({
    version: ANALYSIS_KNOWLEDGE_VERSION,
    ...ANALYSIS_KNOWLEDGE
  })
  return `你是一名熟悉洛奇（Mabinogi）高阶副本机制、职业循环与战斗日志口径的团队分析师。根据排行榜快照撰写中文分析报告。报告应像有经验的团长在复盘：先找值得讨论的差异，再结合数据和机制解释，最后给出玩家能理解的观察；不要逐项照抄排行榜，不要用空泛套话堆字数。

硬性规则：
1. 报告中绝对不能出现任何角色名、玩家名、uploader、真实 ID；可用「榜首」「第N名」「同 playerKey」指代。
2. playerKey 仅用于跨快照对比同一人是否提升，正文不要强调该密钥本身。
3. classes 数组必须按以下顺序覆盖全部 10 个职业：${classNames}。样本不足的职业可以简短说明，不得为了填满字段虚构优缺点；pros/cons 可以为空数组。
4. 每个有足够样本的职业重点分析：职业定位、专用与通用技能构成、随机附伤影响、适配或不适配的 Boss 机制、与上一期的可信变化。不要每个职业机械重复同一种句式。
5. 只依据排行榜数据和下方「版本知识」推断。知识描述的是机制边界，不代表某场战斗必然发生了对应问题；缺少时序或事件证据时使用「可能」「与该机制一致」，不得写成确定因果。
6. 当前排行是每名角色的最佳成绩样本，不是全体玩家平均值；全 Boss 前20与各职业前10存在重复，不能当作独立样本相加。不得仅凭榜首或少量极值给职业排绝对强弱。
7. dps 是包含 Boss 无敌、强制跑位和机制处理时间的整场 DPS。它可反映通关效率，但不能直接等同于可攻击窗口内的木桩能力。结合 duration、teamSize、Boss和技能构成比较，避免跨 Boss 直接横比数值。
8. skills.percent/count/damage 是单场技能伤害构成；count 是命中数而非施放数。不要从count直接推断施放次数、冷却利用率或操作失误。
9. 圣光颂唱者和圣盾骑士的治疗、增益、减伤、承伤、控怪等核心贡献未被完整记录。不得因DPS低而评价职业弱或玩家表现差，只能分析可观测的伤害侧。
10. 跨期变化只在同 playerKey、同 Boss 且队伍人数和战斗时长具有可比性时重点讨论；否则明确样本条件变化。首次分析不得伪造历史趋势。
11. 技能名末尾的「AI」是客户端标记，与人工智能无关；数据中已去除该后缀。正文不得恢复该后缀，也不要把它理解为自动战斗。
12. 引用数值是为了支撑判断：每个重点结论选择1至2个最关键的占比、DPS、时长或排名即可，不要连续罗列数据。建议必须具体到输出窗口、技能构成、追击或队伍配置，不写泛泛的「提升装备和操作」。
13. current.bosses[].top20 才是全职业总榜，只有这里的 rank 才是全榜排名。current.byClass[class].bosses[].top10 是该职业内部榜，其 rank 只能解释为 classRank；职业内 rank=1 只能写「该职业内最佳样本」，绝对不能写成全榜第一、榜首或领跑。宏观职业格局与标题必须以 current.bosses[].top20 为准，byClass 只用于观察职业内部技能构成。
14. 严格使用榜单措辞：「某职业领跑某Boss」仅限该职业占据该Boss全榜第1；「领跑多个Boss」至少占据两个Boss全榜第1；「领跑各Boss」必须占据全部Boss全榜第1。「头部强势」必须有多个全榜前3或前5席位支撑，并写明范围；仅有少量前20样本只能写「有少量样本进入前20」。输出前逐项核对 title、overview、bossNotes、macroTrend 中的榜首、领跑、统治、头部等词是否得到全榜名次支持。
15. 在 title、overview、bossNotes、classes 的全部文本及 macroTrend 中，Boss只能使用正式名称：${bossNames}。禁止使用「一王」「二王」「三王」「四王」等序号简称，即使为了避免重复也不得简称。

版本知识（版本 ${ANALYSIS_KNOWLEDGE_VERSION}，只能使用其中已有事实；后续版本可能变化）：
${knowledge}

请严格返回 JSON（不要 Markdown 代码块）：
{
  "title": "概括本期最显著现象的报告标题",
  "overview": "整体概述（200-350字，优先写3个最有信息量的发现，并交代样本局限）",
  "bossNotes": ["Boss观察，4-8条；使用数据证据+机制解释+不确定性，避免只复述排名"],
  "classes": [
    {
      "name": "职业名",
      "summary": "结合职业定位与本期数据的一句话判断",
      "pros": ["有数据或机制依据的优势；证据不足则留空"],
      "cons": ["有数据或机制依据的限制；证据不足则留空"],
      "skills": "区分专用、通用、随机附伤后的技能构成分析；count只能称命中数",
      "bossPerformance": "结合站桩、位移、无敌阶段、队伍人数和职业机制解释各Boss差异",
      "trend": "可比样本的跨期变化；无历史或不可比时写当前观察及限制"
    }
  ],
  "macroTrend": "宏观格局与实用建议（250-450字；区分榜单极值、职业机制、队伍配置和随机触发影响，不做武断职业排名）"
}`
}

function buildUserPrompt(currentAnon, previousAnon) {
  const payload = {
    current: currentAnon,
    previous: previousAnon,
    note: previousAnon
      ? '已提供上一期快照。请对比同 playerKey 的 DPS/技能变化，归纳提升与退步趋势，但不要写出可识别身份信息。'
      : '这是首次分析，没有上一期快照。'
  }
  return `以下是匿名化后的 DPS 排行快照 JSON。current.bosses[].top20 是各 Boss 每名角色最佳成绩中的全职业前20，其中 rank 是全榜排名；current.byClass 是各职业在每个 Boss 的职业内部最佳成绩前10，其中 rank 仅表示该职业内部的 classRank，两部分可能包含同一场记录。禁止把职业内部第1名描述成全榜第1名或领跑。skills 含 name/percent/count/damage，其中 count 是命中次数而不是施放次数；skills.name 已去除末尾客户端标记「AI」。请先以 current.bosses[].top20 核对职业在全榜中的实际名次和出现次数，再识别真正有证据的异常、职业内技能构成差异和可比的跨期变化，最后按指定 JSON 输出，不要按输入顺序逐行复述。\n\n${JSON.stringify(payload)}`
}

function normalizeBossNamesInText(value) {
  let text = String(value || '').trim()
  for (const [shortName, formalName] of BOSS_SHORTHAND_NAMES) {
    text = text.split(shortName).join(formalName)
  }
  return text
}

function normalizeBossNamesInReport(report) {
  if (!report) return report
  return {
    ...report,
    title: normalizeBossNamesInText(report.title),
    overview: normalizeBossNamesInText(report.overview),
    bossNotes: (report.bossNotes || []).map(normalizeBossNamesInText).filter(Boolean),
    macroTrend: normalizeBossNamesInText(report.macroTrend),
    classes: (report.classes || []).map(item => ({
      ...item,
      summary: normalizeBossNamesInText(item.summary),
      pros: (item.pros || []).map(normalizeBossNamesInText).filter(Boolean),
      cons: (item.cons || []).map(normalizeBossNamesInText).filter(Boolean),
      skills: normalizeBossNamesInText(item.skills),
      bossPerformance: normalizeBossNamesInText(item.bossPerformance),
      trend: normalizeBossNamesInText(item.trend)
    }))
  }
}

function normalizeReport(parsed, { generatedAt, hasPrevious }) {
  const classes = Array.isArray(parsed?.classes) ? parsed.classes : []
  const byName = new Map()
  for (const item of classes) {
    const name = String(item?.name || '').trim()
    if (!name) continue
    byName.set(name, {
      name,
      summary: normalizeBossNamesInText(item.summary),
      pros: Array.isArray(item.pros) ? item.pros.map(normalizeBossNamesInText).filter(Boolean) : [],
      cons: Array.isArray(item.cons) ? item.cons.map(normalizeBossNamesInText).filter(Boolean) : [],
      skills: normalizeBossNamesInText(item.skills),
      bossPerformance: normalizeBossNamesInText(item.bossPerformance),
      trend: normalizeBossNamesInText(item.trend)
    })
  }

  const orderedClasses = CLASSES.map(cls => {
    return byName.get(cls.name) || {
      name: cls.name,
      summary: '本期数据不足，暂无法形成稳定结论。',
      pros: [],
      cons: ['样本不足'],
      skills: '暂无足够技能样本。',
      bossPerformance: '暂无。',
      trend: hasPrevious ? '相较上一期变化不明显或样本不足。' : '首次分析，无历史对比。'
    }
  })

  return {
    title: normalizeBossNamesInText(parsed?.title || 'mblogs AI 分析报告'),
    overview: normalizeBossNamesInText(parsed?.overview),
    bossNotes: Array.isArray(parsed?.bossNotes)
      ? parsed.bossNotes.map(normalizeBossNamesInText).filter(Boolean)
      : [],
    classes: orderedClasses,
    macroTrend: normalizeBossNamesInText(parsed?.macroTrend),
    generatedAt,
    hasPrevious: Boolean(hasPrevious)
  }
}

function extractJson(text) {
  let jsonStr = String(text || '').trim()
  const codeMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (codeMatch) jsonStr = codeMatch[1].trim()

  const tryParse = (s) => {
    try {
      return JSON.parse(s)
    } catch (error) {
      return null
    }
  }

  let parsed = tryParse(jsonStr)
  if (parsed) return parsed

  const objStart = jsonStr.indexOf('{')
  const objEnd = jsonStr.lastIndexOf('}')
  if (objStart >= 0 && objEnd > objStart) {
    parsed = tryParse(jsonStr.slice(objStart, objEnd + 1))
    if (parsed) return parsed
  }
  throw new Error('AI 返回 JSON 解析失败')
}

async function callDeepSeek(systemPrompt, userPrompt, maxTokens = 8192) {
  const apiKey = loadDeepSeekApiKey()
  if (!apiKey) {
    throw new Error('未配置 DeepSeek API Key（ai/chat/core/.secret.json 或 ai/llm/.secret.json）')
  }

  const response = await axios.post(
    DEEPSEEK_API_URL,
    {
      model: DEEPSEEK_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.4,
      max_tokens: maxTokens
    },
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      timeout: 180000
    }
  )

  const data = response.data
  if (data.error) {
    throw new Error(data.error.message || 'DeepSeek API 错误')
  }
  const text = data?.choices?.[0]?.message?.content
  if (!text) {
    throw new Error('DeepSeek 返回格式异常')
  }
  return {
    text: String(text).trim(),
    usage: data.usage || {}
  }
}

function collectCharacterNames(snapshot) {
  const names = new Set()
  const data = snapshot?.data || snapshot || {}
  for (const boss of data.bosses || []) {
    for (const row of boss.top20 || []) {
      const name = String(row.characterName || '').trim()
      if (name) names.add(name)
    }
  }
  for (const info of Object.values(data.byClass || {})) {
    for (const boss of info.bosses || []) {
      for (const row of boss.top10 || []) {
        const name = String(row.characterName || '').trim()
        if (name) names.add(name)
      }
    }
  }
  return [...names].sort((a, b) => b.length - a.length)
}

function redactNamesInText(text, names) {
  let result = String(text || '')
  for (const name of names) {
    if (!name || name.length < 2) continue
    result = result.split(name).join('某玩家')
  }
  return result
}

function scrubReportNames(report, snapshots) {
  const names = new Set()
  for (const snapshot of snapshots || []) {
    for (const name of collectCharacterNames(snapshot)) names.add(name)
  }
  const nameList = [...names].sort((a, b) => b.length - a.length)
  if (!nameList.length) return report

  const scrub = value => redactNamesInText(value, nameList)
  return {
    ...report,
    title: scrub(report.title),
    overview: scrub(report.overview),
    bossNotes: (report.bossNotes || []).map(scrub),
    macroTrend: scrub(report.macroTrend),
    classes: (report.classes || []).map(item => ({
      ...item,
      summary: scrub(item.summary),
      pros: (item.pros || []).map(scrub),
      cons: (item.cons || []).map(scrub),
      skills: scrub(item.skills),
      bossPerformance: scrub(item.bossPerformance),
      trend: scrub(item.trend)
    }))
  }
}

function collectSkillLexicon(snapshot) {
  const skills = new Set()
  for (const cls of CLASSES) {
    for (const skill of cls.skills || []) {
      const name = sanitizeSkillName(skill)
      if (name) skills.add(name)
    }
  }
  const data = snapshot?.data || snapshot || {}
  const absorbRow = (row) => {
    for (const skill of row.skills || []) {
      const name = sanitizeSkillName(skill.name)
      if (name && name !== '其他') skills.add(name)
    }
  }
  for (const boss of data.bosses || []) {
    for (const row of boss.top20 || []) absorbRow(row)
  }
  for (const info of Object.values(data.byClass || {})) {
    for (const boss of info.bosses || []) {
      for (const row of boss.top10 || []) absorbRow(row)
    }
  }
  return [...skills]
}

function normalizeUsage(usage) {
  return {
    prompt_tokens: Number(usage?.prompt_tokens) || 0,
    completion_tokens: Number(usage?.completion_tokens) || 0,
    total_tokens: Number(usage?.total_tokens) || 0
  }
}

async function generateAiReport(currentSnapshot, previousSnapshot) {
  const currentAnon = anonymizeSnapshot(currentSnapshot)
  const previousAnon = previousSnapshot ? anonymizeSnapshot(previousSnapshot) : null
  const { text, usage } = await callDeepSeek(
    buildSystemPrompt(),
    buildUserPrompt(currentAnon, previousAnon),
    8192
  )
  const parsed = extractJson(text)
  let report = normalizeReport(parsed, {
    generatedAt: new Date().toISOString(),
    hasPrevious: Boolean(previousAnon)
  })
  report = scrubReportNames(report, [currentSnapshot, previousSnapshot])
  report.usage = normalizeUsage(usage)
  report.lexicon = {
    skills: collectSkillLexicon(currentSnapshot)
  }
  return { report, usage: report.usage, rawText: text }
}

function newSnapshotId() {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return crypto.randomBytes(16).toString('hex')
}

async function runAiAnalysis({ force = false, outputPath } = {}) {
  if (running) {
    return { status: 'busy', message: 'AI 分析正在进行中，请稍后再试' }
  }

  const dateKey = getShanghaiDateKey()
  if (!force) {
    const cached = await getDailyAiReport(dateKey)
    if (cached?.report) {
      const report = normalizeBossNamesInReport({
        ...cached.report,
        usage: cached.report.usage || normalizeUsage(cached.usage)
      })
      await renderAiAnalysisReport(report, outputPath)
      return {
        status: 'cached',
        dateKey,
        report,
        message: `已返回今日缓存的 AI 分析（${dateKey}）。如需刷新请使用：mblogs 重新生成AI分析`
      }
    }
  }

  running = true
  try {
    const previous = await getLatestAiSnapshot()
    const data = await collectSnapshotData()
    const snapshot = {
      _id: newSnapshotId(),
      dateKey,
      createdAt: new Date(),
      data
    }
    await insertAiSnapshot(snapshot)

    const { report, usage } = await generateAiReport(snapshot, previous)
    await upsertDailyAiReport({
      dateKey,
      snapshotId: snapshot._id,
      previousSnapshotId: previous?._id || null,
      report,
      usage,
      forced: Boolean(force)
    })

    await renderAiAnalysisReport(report, outputPath)
    return {
      status: 'generated',
      dateKey,
      report,
      usage,
      message: previous
        ? `已生成 AI 分析（已对比上一期快照）`
        : `已生成 AI 分析（首次，无历史对比）`
    }
  } finally {
    running = false
  }
}

function resolveAiAnalysisCommand(content) {
  const text = String(content || '').trim().replace(/\s+/g, '')
  if (!text) return null
  const lower = text.toLowerCase()

  if (
    lower === '重新生成ai分析' ||
    lower === 'ai分析重新生成' ||
    lower === '强制ai分析' ||
    lower === 'regenerateaianalysis'
  ) {
    return { force: true }
  }

  if (
    lower === 'ai分析' ||
    lower === 'aianalysis' ||
    text === 'AI分析'
  ) {
    return { force: false }
  }

  return null
}

module.exports = {
  TOP_ALL,
  TOP_CLASS,
  ANALYSIS_KNOWLEDGE_VERSION,
  ANALYSIS_KNOWLEDGE,
  resolveAiAnalysisCommand,
  runAiAnalysis,
  collectSnapshotData,
  anonymizeSnapshot,
  listBossGroups,
  callDeepSeek,
  extractJson,
  normalizeUsage,
  collectSkillLexicon,
  scrubReportNames,
  newSnapshotId
}
