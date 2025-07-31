const fs = require('fs-extra')
const path = require('path')
const xml2js = require('xml2js')
const nodeHtmlToImage = require('node-html-to-image')
const { IMAGE_DATA } = require(path.join(__dirname, '..', '..', '..', 'baibaiConfigs.js'))
const font2base64 = require('node-font2base64')
const {renderRecipeImage} = require("../recipe/renderRecipe");
//FONTS
const HANYIWENHEI = font2base64.encodeToDataUrlSync(path.join(__dirname, '..', '..', '..', 'font', 'hk4e_zh-cn.ttf'))

const parser = new xml2js.Parser()
let filterDataStorage = {}
let itemUpgradeData = []
let itemUpgradeEffectData = []
let upgradeOptionsetHash = {}
let npcInfoHash = {}
let productionHash = {}
let gemInfo = []
let luckyUpgradeData = fs.readJsonSync(path.join(__dirname, 'luckyUpgrade.json'), 'utf-8')

const readXmlParse = filePath => new Promise((resolve, reject) => {
	console.log(`read file ${filePath}`)
	let file = fs.readFileSync(filePath, 'utf-16le')
	parser.parseString(file, (err, result) => {
		if(err) {
			reject(err)
			return
		}
		resolve(result)
	})
})

const filterItem = async () => {
	let files = [
		'itemdb',
		'itemdb_etc',
		'itemdb_mainequip',
		'itemdb_script',
		'itemdb_subequip',
		'itemdb_weapon',
	]
	let xmlData = await Promise.all(files.map(file => readXmlParse(path.join(__dirname, '..', 'data', 'IT', `${file}.xml`))))
	let txtData = files.map(file => {
		let txt = fs.readFileSync(path.join(__dirname, '..', 'data', 'IT', `${file}.china.txt`), 'utf-8')
		let transform = {}
		txt.split('\n').forEach(val => {
			let sp = val.split('\t')
			transform[`_LT[xml.${file}.${sp[0].trim()}]`] = sp[1]
		})
		return transform
	})
	let filterData = {}
	for(let index = 0; index < xmlData.length; index ++) {
		let data = xmlData[index]
		for(let i = 0; i < data.Items.Mabi_Item.length; i ++) {
			let item = data.Items.Mabi_Item[i]
			// if(item.$.Category && item.$.Category.startsWith('/jewel')) {
			// 	gemInfo[item.$.ID] = txtData[index][item.$.Text_Name1]
			// 	continue
			// }
			if(item.$.Par_UpgradeMax && item.$.Par_UpgradeMax > 0 && (!item.$.Locale || item.$.Locale === 'china')) {
				let localeNameCn = item.$.Text_Name1 ? txtData[index][item.$.Text_Name1] : 'NULL'
				if(
					localeNameCn &&
					localeNameCn.indexOf('临时') === -1 &&
					localeNameCn.indexOf('不开放') === -1 &&
					localeNameCn.indexOf('禁止') === -1 &&
					localeNameCn.indexOf('交易') === -1 &&
					localeNameCn.indexOf('专用') === -1 &&
					!localeNameCn.startsWith('@') &&
					!localeNameCn.startsWith('精灵') &&
					!localeNameCn.startsWith('新手') &&
					!localeNameCn.startsWith('租赁')
				) {
					// console.log(item.$.Par_UpgradeMax, `${txtData[index][item.$.Text_Name1]}`)
					let injectData = {
						localeNameCn
					}
					if(item.$.XML) {
						try {
							let d = await parser.parseStringPromise(fixXMLKey(item.$.XML))
							injectData['xmlParser'] = d.xml.$
							injectData['xmlParserStatus'] = 'ok'
              injectData['xmlParserSource'] = d
						} catch (err) {
              injectData['xmlParserStatus'] = 'err'
							console.log(`FAILED TO ${item.$.ID}`)
						}
					}
					filterData[item.$.ID] = Object.assign(item.$, injectData)
				}
			}
		}
	}

	return filterData
}

const fixXMLKey = xmlString => {
  return xmlString.replace(/(\d+=")/g, 'key$1');
}

const formatUpgradeInfo = async () => {
	let xmlData = await readXmlParse(path.join(__dirname, '..', 'data', 'IT', `itemupgradedb.xml`))
	let txt = fs.readFileSync(path.join(__dirname, '..', 'data', 'IT', `itemupgradedb.china.txt`), 'utf-8')
	let transform = {}
	txt.split('\n').forEach(val => {
		let sp = val.split('\t')
		transform[`_LT[xml.itemupgradedb.${sp[0].trim()}]`] = sp[1]
	})

	// 处理重复id的情况，仅保留后面的id，前面的id废弃
	let upgradeItems = xmlData.upgrade_db.upgrade
	let upgradeMap = new Map()
	
	// 按照id分组，遍历每个升级项，相同id后面的会覆盖前面的
	upgradeItems.forEach(item => {
		upgradeMap.set(item.$.id, item)
	})
	
	// 提取唯一的升级项
	let uniqueUpgradeItems = Array.from(upgradeMap.values())
	let effectTmp = xmlData.upgrade_db.effect.map(x => x.$)

	return [
		uniqueUpgradeItems.map(item => Object.assign(item.$, {
			localnameCn: transform[item.$.localname].trim(),
			descCn: transform[item.$.desc].trim(),
			filterArr: item.$.item_filter.split('|').filter(x => x),
			effectDesc: effectTmp.find(x => x.id == item.$.effect)?.effect || item.$.effect || 'unknown'
		})),
		xmlData.upgrade_db.effect.map(item => item.$),
		xmlData.upgrade_db.gem.map(item => Object.assign(item.$, {
			localnameCn: transform[item.$.name].trim()
		}))
	]
}

const formatOptionset = async () => {
	let xmlData = await readXmlParse(path.join(__dirname, '..', 'data', 'IT', `optionset.xml`))
	let txt = fs.readFileSync(path.join(__dirname, '..', 'data', 'IT', `optionset.china.txt`), 'utf-8')

	let transform = {}
	txt.split('\n').forEach(val => {
		let sp = val.split('\t')
		transform[`_LT[xml.optionset.${sp[0].trim()}]`] = sp[1]
	})
	let hash = {}
	xmlData.OptionSet.OptionSetList[0].OptionSet.forEach(x => {
		hash[x.$.ID] = transform[x.$.OptionDesc]
	})
	return hash
}

const formatProduction = async () => {
	let xmlData = await readXmlParse(path.join(__dirname, '..', 'data', 'IT', `production.xml`))
	let txt = fs.readFileSync(path.join(__dirname, '..', 'data', 'IT', `production.china.txt`), 'utf-8')
	let transform = {}
	txt.split('\n').forEach(val => {
		let sp = val.split('\t')
		transform[`_LT[xml.production.${sp[0].trim()}]`] = sp[1]
	})
	let hash = {}
	xmlData.Production.MetalExtraction[0].Production.forEach(x => {
		hash[x.$.ProductItemId] = transform[x.$.Title].replace('转换', '')
	})
	xmlData.Production.Carpentry[0].Production.forEach(x => {
		hash[x.$.ProductItemId] = transform[x.$.Title].replace('制做', '')
	})
	return hash
}

const formatNpcInfo = async () => {
	let xmlData = await readXmlParse(path.join(__dirname, '..', 'data', 'IT', `npcinfo.xml`))
	let txt = fs.readFileSync(path.join(__dirname, '..', 'data', 'IT', `npcinfo.china.txt`), 'utf-8')

	let transform = {}
	txt.split('\n').forEach(val => {
		let sp = val.split('\t')
		transform[`_LT[xml.npcinfo.${sp[0].trim()}]`] = sp[1]
	})
	let hash = {}
	xmlData.NpcInfoList.NpcInfo.forEach(x => {
		hash[x.$.GeneralName.toLowerCase()] = transform[x.$.LocalName]
	})
	return hash
}

const matchEquipUpgrade = async (Category, maxUpgrade) => {
	if(itemUpgradeData.length === 0 || itemUpgradeEffectData.length === 0) {
		[itemUpgradeData, itemUpgradeEffectData, gemInfo] = await formatUpgradeInfo()
	}
	let ca = Category.split('/').filter(x => x && x.indexOf('*') == -1)
	let out = []
	itemUpgradeData.forEach(item => {
		if(item.upgraded_min > maxUpgrade){
			return
		}
		for(let i = 0; i < item.filterArr.length; i ++) {
			let tf = item.filterArr[i].split('/').filter(x => x && x.indexOf('*') == -1)
			// if(Array.from(new Set(tf.concat(ca))).length === ca.length) {
      // GPT指导后变更
			if(tf.every(item => ca.includes(item))) {
				out.push(Object.assign(item, {
					upgraded_max: item.upgraded_max > maxUpgrade ? maxUpgrade : item.upgraded_max
				}))
				break
			}
		}
	})
	return out
}

const searchEquipUpgrade = async (qq, group, content, callback) => {
	if(!content.trim()) {
		return
	}
	if(Object.keys(filterDataStorage).length === 0) {
		filterDataStorage = await filterItem()
	}
	if(Object.keys(upgradeOptionsetHash).length === 0) {
		upgradeOptionsetHash = await formatOptionset()
	}
	if(Object.keys(npcInfoHash).length === 0) {
		npcInfoHash = await formatNpcInfo()
	}
	if(Object.keys(productionHash).length === 0) {
		productionHash = await formatProduction()
	}
	let filterEq
	if(/^\d+$/.test(content)) {
		filterEq = filterDataStorage[content] ? [filterDataStorage[content]] : []
	} else {
		filterEq = Object.values(filterDataStorage)
		content.replace(/[， ]/g, ',').split(',').filter(x => x).forEach(keyword => {
			filterEq = filterEq.filter(x => x.localeNameCn.match(new RegExp(keyword)))
		})
	}
	if(filterEq.length === 1) {
		let meu = await matchEquipUpgrade(filterEq[0].Category, filterEq[0].Par_UpgradeMax - 1)
		console.log(filterEq[0])
		console.log(filterEq[0].xmlParser)
		renderImage(filterEq[0], meu, callback)
		return
	}
	if(filterEq.length === 0) {
		callback(`未找到${content}`)
		return
	}

	let em = filterEq.filter(x => x.localeNameCn == content)
	if(em.length) {
		let meu = await matchEquipUpgrade(em[0].Category, em[0].Par_UpgradeMax - 1)
		renderImage(em[0], meu, callback, `找到${filterEq.length}\n${filterEq.splice(0, 10).map(x => `meu ${x.ID} | ${x.localeNameCn}`).join('\n')}\n已为您定位到${em[0].localeNameCn}`)
		return
	}

	callback(`找到${filterEq.length}\n${filterEq.splice(0, 10).map(x => `meu ${x.ID} | ${x.localeNameCn}`).join('\n')}\n可使用多关键词查找，多关键词用空格或逗号分割。`)
}

// 定义武器升级详细信息, 返回HTML
const analyzerEffect = effectStr => {
	if(effectStr.startsWith('modify')) {
		let [type, info, ...arg] = effectStr.substring(7, effectStr.length - 1).split(',').map(x => x.trim())
		if(type == 'chain_casting') {
			info = arg[0]
		}
		let typeCn = {
			'balance': '平衡性',
			'critical': '暴击率',
			'attack_max': '最大攻击力',
			'attack_min': '最小攻击力',
			'durability_max': '最大耐久度',
			'attack_range': '远程攻击距离',
			'wound_max' : '最大负伤率',
			'wound_min' : '最小负伤率',
			'defense': '防御',
			'protect': '保护',
			'collecting_speed' : '提高采集速度',
			'collecting_bonus' : '采集时有一定几率同时采集2个',
			'splash_radius' : '范围攻击时增加攻击距离',
			'splash_damage' : '范围攻击时增加攻击伤害值',
			'immune_melee': '近战攻击自动防御率',
			'immune_ranged': '远程攻击自动防御率',
			'immune_magic': '魔法攻击自动防御率',
			'manause_revised': '魔法消耗减少',
			'manaburn_revised' : '魔法蒸发减少',
			'chain_casting' : '魔法组合',
			'magic_damage': '魔法攻击力',
			'casting_speed': '施展速度',
			'lance_piercing': '穿刺等级',
			'musicbuff_bonus' : '音乐系技能增益效果增加',
			'musicbuff_duration' : '音乐系技能增益效果持续时间增加',
			'max_bullet': '最大装弹数增加',
			'magic_defense' : '魔法防御',
			'magic_protect': '魔法保护'
		}[type] || type
		return `<div class="effect-item" style="color: ${info > 0 ? '#57aeff' : '#fb675f'}">${typeCn} ${info > 0 ? '+' : ''}${info}</div>`
	}
	// 释放数据
	if (effectStr.startsWith('use_optionset')){
		return upgradeOptionsetHash[effectStr.substring(14, effectStr.length - 1)] ? upgradeOptionsetHash[effectStr.substring(14, effectStr.length - 1)].split('\\n').map(x => `<div class="effect-item" style="color: #57aeff">${x}</div>`).join('') : effectStr
	}
	if (effectStr.startsWith('luckyupgrade')) {
		const target = luckyUpgradeData.filter(x => x.itemId == effectStr.substring(13, effectStr.length - 1))
		if(target && target.length > 0) {
			return target[0].itemDesc.split('\n').map(text => `<div class="effect-item" style="color: #57aeff">${text}</div>`).join('')
		} else {
			return `<div class="effect-item" style="color: #57aeff">铁匠改造数据[${effectStr.substring(13, effectStr.length - 1)}]</div>`
		}
	}
	if (effectStr.startsWith('personalize')) {
		return `<div class="effect-item" style="color: #fb675f">装备专有化</div>`
	}
	if(effectStr.startsWith('set(collecting_bonus_product')) {
		let [setType, id] = effectStr.substring(4, effectStr.length - 1).split(',').map(x => x.trim())
		let setTxt = effectStr
		switch(setType) {
			case `collecting_bonus_product`:
				setTxt = productionHash[id]
				break
		}
		return `<div class="effect-item" style="color: #57aeff">${setTxt || effectStr}</div>`
	}
	return effectStr
}
const RandomProductHash = {
	'attack_min': { label: '最小攻击力', rootKey: 'Par_AttackMin'},
	'attack_max': { label: '最大攻击力', rootKey: 'Par_AttackMax'},
	'critical': { label: '暴击率', rootKey: 'Par_CriticalRate'},
	'balance': { label: '平衡性', rootKey: 'Par_AttackBalance'},
	'durability_filled_max': { label: '最大耐久度', rootKey: 'Par_DurabilityMax'},
	'magic_damage': { label: '魔法攻击力', rootKey: 'Par_MagicDamage'},
	'defense': { label: '防御', rootKey: 'Par_Defense'},
	'protect': { label: '保护', rootKey: 'Par_ProtectRate'},
	'magic_defense': { label: '魔法防御', rootKey: 'magic_defense', xmlInfo: true},
	'magic_protect': { label: '魔法保护', rootKey: 'magic_protect', xmlInfo: true},
}
const renderRandomInfo = targetItem => {
	return targetItem.xmlParser.random_product.split(';').map(productItem => {
		let [product, min, max] = productItem.split(',').map(x => x.trim())
		let hasProduct = RandomProductHash[product]
		let outputHtml
		if(hasProduct) {
			let productBase = hasProduct.xmlInfo ? parseFloat(targetItem.xmlParser[hasProduct.rootKey] || '0') : parseFloat(targetItem[hasProduct.rootKey] || '0')
			if(product == 'durability_filled_max') {
				productBase /= 1000
			}
			outputHtml = `
				<div class="product-random">
					<div class="label">${hasProduct.label}(${productBase}) : </div>
					<div class="text">${productBase + parseFloat(min)}<sup>+${min}</sup></div>
					<div class="text">~</div>
					<div class="text">${productBase + parseFloat(max)}<sup>+${max}</sup></div>
				</div>
			`
		} else {
			outputHtml = `
				<div class="product-random">
					<div class="label">${product}(仅浮动值) : </div>
					<div class="text">${min}</div>
					<div class="text">~</div>
					<div class="text">${max}</div>
				</div>
			`
		}
		return outputHtml
	}).join('')
}

// 渲染固定属性信息（用于打铁类道具）
const renderFixedInfo = targetItem => {
	// 定义需要显示的固定属性列表
	const fixedAttributes = [
		'attack_min',
		'attack_max', 
		'critical',
		'balance',
		'durability_filled_max',
		'magic_damage',
		'defense',
		'protect',
		'magic_defense',
		'magic_protect'
	]
	
	// 判断装备类型
	const category = targetItem.Category.toLowerCase()
	let equipType = 'unknown'
	if(category.includes('/weapon/') || category.includes('/tool/')) {
		equipType = category.includes('/weapon/') ? 'weapon' : 'tool'
	} else if(category.includes('/shield/')) {
		equipType = 'shield'
	} else if(category.includes('/armor/') || category.includes('/cloth/')) {
		equipType = 'armor'
	}
	
	// 定义宗师加成
	const masterBonus = {
		weapon: { balance: 3, durability_filled_max: 2, attack_min: 3, attack_max: 4, critical: 1 },
		tool: { balance: 3, durability_filled_max: 2, attack_min: 3, attack_max: 4, critical: 1 },
		shield: { durability_filled_max: 1, protect: 1, defense: 2 },
		armor: { durability_filled_max: 1, defense: 1, protect: 3 }
	}
	
	// 定义品质加成
	const qualityBonus = {
		weapon: {
			80: { attack_max: 2, attack_min: 1, critical: 3, balance: 5, durability_filled_max: 5 },
			100: { attack_max: 2, attack_min: 2, critical: 5, balance: 10, durability_filled_max: 5 }
		},
		armor: {
			80: { defense: 0, protect: 2, durability_filled_max: 5 },
			100: { defense: 1, protect: 3, durability_filled_max: 5 }
		},
		shield: {
			80: { defense: 0, durability_filled_max: 2 },
			100: { defense: 1, durability_filled_max: 5 }
		}
	}
	
	let outputHtml = ''
	
	fixedAttributes.forEach(attrKey => {
		let hasProduct = RandomProductHash[attrKey]
		if(hasProduct) {
			// 从targetItem或xmlParser中获取属性值
			let baseValue = hasProduct.xmlInfo ? 
				parseFloat(targetItem.xmlParser?.[hasProduct.rootKey] || '0') : 
				parseFloat(targetItem[hasProduct.rootKey] || '0')
			
			// 特殊处理耐久度（需要除以1000）
			if(attrKey == 'durability_filled_max') {
				baseValue /= 1000
			}
			
			// 只显示有值的属性（大于0）
			if(baseValue > 0) {
				// 计算宗师加成
				const masterAdd = (masterBonus[equipType] && masterBonus[equipType][attrKey]) || 0
				const masterValue = baseValue + masterAdd
				
				// 计算品质加成（工具类装备使用武器的品质加成）
				const qualityType = (equipType === 'tool') ? 'weapon' : equipType
				const quality80Add = (qualityBonus[qualityType] && qualityBonus[qualityType][80] && qualityBonus[qualityType][80][attrKey]) || 0
				const quality100Add = (qualityBonus[qualityType] && qualityBonus[qualityType][100] && qualityBonus[qualityType][100][attrKey]) || 0
				
				const quality80Value = masterValue + quality80Add
				const quality100Value = masterValue + quality100Add
				
				outputHtml += `
					<div class="product-fixed">
						<div class="label">${hasProduct.label} : </div>
						<div class="value-group">
							<div class="base-value">${baseValue}</div>
							${masterAdd > 0 ? `<div class="master-value">宗师:${masterValue}<sup>+${masterAdd}</sup></div>` : ''}
							${quality80Add > 0 ? `<div class="quality-value">80品:${quality80Value}<sup>+${quality80Add}</sup></div>` : ''}
							${quality100Add > 0 ? `<div class="quality-value">100品:${quality100Value}<sup>+${quality100Add}</sup></div>` : ''}
						</div>
					</div>
				`
			}
		}
	})
	
	return outputHtml
}

const renderImage = (targetItem, upgradeInfos, callback, otherMsg = '') => {
	console.log(itemUpgradeEffectData)
	console.log(upgradeInfos.map(x => `[${x.id}]（${x.upgraded_min} ~ ${x.upgraded_max}）${x.localnameCn}: ${x.descCn}`).join('\n'))
	console.log(upgradeInfos.length)
	let normalUpgrade = [], gemUpgrade = []
	upgradeInfos.forEach(item => {
		if(item.hasOwnProperty('upgraded_max') && item.hasOwnProperty('upgraded_min')) {
			normalUpgrade.push(item)
		} else {
			gemUpgrade.push(item)
		}
	})
	normalUpgrade.sort((a, b) => a.upgraded_max - b.upgraded_max).sort((a, b) => a.upgraded_min - b.upgraded_min)
	let html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Title</title>
  <style>
		@font-face {
			font-family: 'HANYIWENHEI';
			src: url(${HANYIWENHEI}) format('truetype');
		}
    * {
      border: 0;
      padding: 0;
      margin: 0;
      font-size: 14px;
      line-height: 1.4;
    }
    body {
      width: 840px;
      min-height: 20px;
      padding: 20px;
      box-sizing: border-box;
      background: #222;
			font-family: HANYIWENHEI;
    }
    .main-container {
    	min-height: 20px;
    }
    .main-container .equip-info{
    	display: flex;
    	width: 100%;;
    	justify-content: space-between;
    	align-content: flex-end;
    	border-bottom: 2px solid #fff;
    	color: #fff;
    	position: relative;
    }
    .main-container .equip-info .equip-name{
    	font-size: 40px;
    	line-height: 1.4;
    }
    .main-container .equip-info .equip-id{
    	font-size: 14px;
    	line-height: 1.4;
    	position: absolute;
    	top: -14px;
    	left: 0;
    }
    .main-container .equip-random{
    	margin-top: 20px;
    	border: 2px solid #fff;
    	padding: 10px 15px;
    	border-radius: 10px;
    }
    .main-container .equip-random .product-random{
    	display: flex;
    	justify-content: flex-start;
    	align-items: center;
    }
    .main-container .equip-random .product-random .label{
    	width: 300px;
    }
    .main-container .equip-random .product-random .label,
    .main-container .equip-random .product-random .text{
    	font-size: 20px;
    	color: #fff;
    	margin-right: 8px;
    }
    .main-container .equip-random .product-random .text sup{
    	color: #57aeff
    }
    .main-container .equip-random .product-fixed{
    	display: flex;
    	justify-content: flex-start;
    	align-items: flex-start;
    	margin-bottom: 10px;
    }
    .main-container .equip-random .product-fixed .label{
    	width: 150px;
    	font-size: 20px;
    	color: #fff;
    	margin-right: 10px;
    	margin-top: 5px;
    }
    .main-container .equip-random .product-fixed .value-group{
    	display: flex;
    	flex-direction: row;
    	align-items: center;
    	flex-wrap: wrap;
    }
    .main-container .equip-random .product-fixed .base-value{
    	font-size: 20px;
    	color: #fff;
    	margin-right: 15px;
    }
    .main-container .equip-random .product-fixed .master-value{
    	font-size: 16px;
    	color: #ffd94c;
    	margin-right: 12px;
    }
    .main-container .equip-random .product-fixed .quality-value{
    	font-size: 16px;
    	color: #57aeff;
    	margin-right: 12px;
    }
    .main-container .equip-random .product-fixed .master-value sup,
    .main-container .equip-random .product-fixed .quality-value sup{
    	color: #ff9999;
    	font-size: 12px;
    }
    .main-container .upgrade-group{
    	margin-top: 20px;
    }
    .main-container .upgrade-group .upgrade-item{
    	display: flex;
    	align-items: stretch;
    	color: #fff;
    	background: #000;
    	padding: 10px 0;
    }
    .main-container .upgrade-group .upgrade-item.cut-top-border{
    	border-top: 8px solid #999;
    }
    .main-container .upgrade-group .upgrade-item:nth-child(odd){
    	background: #444;
    }
    .main-container .upgrade-group .upgrade-item .item-col{
    	display: flex;
    	flex-direction: column;
    	align-items: flex-start;
    	justify-content: center;
    	box-sizing: border-box;
    	padding: 0 10px;
    	border-right: 1px dashed #999;
    }
    .main-container .upgrade-group .upgrade-item .col-1{
    	width: 200px;
    }
    .main-container .upgrade-group .upgrade-item .col-2{
    	width: 150px;
    }
    .main-container .upgrade-group .upgrade-item .col-3{
    	width: 50px;
    	font-size: 24px;
    	align-items: center;
    }
    .main-container .upgrade-group .upgrade-item .col-4{
    	width: 100px;
    	font-size: 20px;
    	align-items: center;
    	color: #ffd94c;
    }
    .main-container .upgrade-group .upgrade-item .col-5{
    	width: 200px;
    	font-size: 14px;
    }
    .main-container .upgrade-group .upgrade-item .item-step-info{
    	width: 100px;
    	display: flex;
    	flex-direction: row;
    	align-items: stretch;
    }
    .main-container .upgrade-group .upgrade-item .need-gem{
    	width: 100px;
    	font-size: 14px;
    	box-sizing: border-box;
    	padding-left: 5px;
    	padding-right: 5px;
    }
    .main-container .upgrade-group .upgrade-item .item-step-info .step-item{
    	width: 20px;
    	display: flex;
    	align-items: center;
    	justify-content: center;
    }
    .main-container .upgrade-group .upgrade-item .item-step-info .step-item.active{
    	background: #57aeff;
    	color: #fff;
    }
    .main-container .upgrade-group .upgrade-item .upgrade-label{
    	font-size: 24px;
    }
    .main-container .upgrade-group .upgrade-item .upgrade-desc{
    	font-size: 12px;
    	color: #999;
    }
    .main-container .upgrade-group .upgrade-item .effect-item{
    	font-size: 16px;
    }
  </style>
</head>
<body>
<div class="main-container">
	<div class="equip-info">
		<div class="equip-id">[${targetItem.ID}]</div>
		<div class="equip-name">${targetItem.localeNameCn}</div>
	</div>
	${targetItem.xmlParser && targetItem.xmlParser.random_product ? `
	<div class="equip-random">
		${renderRandomInfo(targetItem)}
	</div>
	` : `
	<div class="equip-random">
		${renderFixedInfo(targetItem)}
	</div>
	`}
	<div class="upgrade-group">
		${normalUpgrade.map(x => `
			<div class="upgrade-item">
				<div class="item-col col-1">
					<div class="upgrade-label">${x.localnameCn}</div>
					<div class="upgrade-desc">${x.descCn}</div>
				</div>
				<div class="item-col col-2">
					${x.effectDesc.split(';').map(ef => analyzerEffect(ef.trim())).join(' ')}
				</div>
				<div class="item-col col-3">
					${x.need_ep}
				</div>
				<div class="item-col col-4">
					${x.need_gold}
				</div>
				<div class="item-col col-5">
					${x.available_npc.split(';').map(x => `${npcInfoHash[x.toLowerCase()] || x}`).join(', ')}
				</div>
				<div class="item-step-info">
					${[0,1,2,3,4].map(i => (x.upgraded_min <= i && i <= x.upgraded_max) ? `<div class="step-item active">${i}</div>` : `<div class="step-item">${i}</div>`).join('')}
				</div>
			</div>
		`).join('')}
		
		${gemUpgrade.map((x, i) => `
			<div class="upgrade-item${i ? '' : ' cut-top-border'}">
				<div class="item-col col-1">
					<div class="upgrade-label">${x.localnameCn}</div>
					<div class="upgrade-desc">${x.descCn}</div>
				</div>
				<div class="item-col col-2">
					${x.effectDesc.split(';').map(ef => analyzerEffect(ef.trim())).join(' ')}
				</div>
				<div class="item-col col-3">
					${x.need_ep}
				</div>
				<div class="item-col col-4">
					${x.need_gold}
				</div>
				<div class="item-col col-5">
					${x.available_npc.split(';').map(x => `${npcInfoHash[x.toLowerCase()] || x}`).join(', ')}
				</div>
				<div class="need-gem">
					${x.need_gem.split(';').map(gemItem => {
						let [gemId, size] = gemItem.split(',').map(x => x.trim())
						return `${gemInfo.find(x => x.id == gemId).localnameCn || gemId}(${size})`
					}).join('<br/>')}
				</div>
			</div>
		`).join('')}
	</div>
</div>
  
</body>
</html>`
	let output = path.join(IMAGE_DATA, 'mabi_other', `MabiItemUpgrade.png`)
	// let output = './MabiItemUpgrade.png'
	nodeHtmlToImage({
		output,
		html
	})
		.then(() => {
			console.log(`保存MabiItemUpgrade.png成功！`)
			let imgMsg = `${otherMsg}[CQ:image,file=${path.join('send', 'mabi_other', `MabiItemUpgrade.png`)}]`
			callback(imgMsg)
		})

}

//
// searchEquipUpgrade('41440', d => {console.log(d)})
// 这是无尽绝望巨锤
// searchEquipUpgrade('41440', d => {console.log(d)})
// 这是采集用小刀
// searchEquipUpgrade('40023', d => {console.log(d)})
// searchEquipUpgrade(1,2,'14159', d => {console.log(d)})
module.exports = {
	searchEquipUpgrade
}
