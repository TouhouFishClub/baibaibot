const fs = require('fs-extra')
const path = require('path')
const xml2js = require('xml2js')
const nodeHtmlToImage = require('node-html-to-image')
const { IMAGE_DATA } = require(path.join(__dirname, '..', '..', '..', 'baibaiConfigs.js'))
const font2base64 = require('node-font2base64')
//FONTS
const HANYIWENHEI = font2base64.encodeToDataUrlSync(path.join(__dirname, '..', '..', '..', 'font', 'hk4e_zh-cn.ttf'))

const parser = new xml2js.Parser()
let filterDataStorage = {}
let itemUpgradeData = []
let upgradeOptionsetHash = {}
let npcInfoHash = {}
let gemInfo = {}

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
	let xmlData = await Promise.all(files.map(file => readXmlParse(path.join(__dirname, 'data', `${file}.xml`))))
	let txtData = files.map(file => {
		let txt = fs.readFileSync(path.join(__dirname, 'data', `${file}.china.txt`), 'utf-8')
		let transform = {}
		txt.split('\n').forEach(val => {
			let sp = val.split('\t')
			transform[`_LT[xml.${file}.${sp[0].trim()}]`] = sp[1]
		})
		return transform
	})
	let filterData = {}
	xmlData.forEach((data, index) => {
		data.Items.Mabi_Item.forEach(item => {
			if(item.$.Category && item.$.Category.startsWith('/jewel')) {
				gemInfo[item.$.ID] = txtData[index][item.$.Text_Name1]
				return
			}
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
					!localeNameCn.startsWith('租赁')
				) {
					// console.log(item.$.Par_UpgradeMax, `${txtData[index][item.$.Text_Name1]}`)
					filterData[item.$.ID] = Object.assign(item.$, {
						localeNameCn
					})
				}
			}
		})
	})
	// console.log(Object.values(filterData).map(x => x.localeNameCn).join('\n'))
	// console.log(Object.values(filterData).length)
	return filterData
}

const formatUpgradeInfo = async () => {
	let xmlData = await readXmlParse(path.join(__dirname, 'data', `itemupgradedb.xml`))
	let txt = fs.readFileSync(path.join(__dirname, 'data', `itemupgradedb.china.txt`), 'utf-8')
	let transform = {}
	txt.split('\n').forEach(val => {
		let sp = val.split('\t')
		transform[`_LT[xml.itemupgradedb.${sp[0].trim()}]`] = sp[1]
	})

	// test output
	// let output = {}
	// xmlData.upgrade_db.upgrade.forEach(item => {
	// 	if(item.$.effect) {
	// 		item.$.effect.split(';').forEach(ef => {
	// 			let efs = ef.split('(')
	// 			if(efs.length < 2) {
	// 				return
	// 			}
	// 			console.log(efs)
	// 			if(output[efs[0]]) {
	// 				output[efs[0]].itemSet.add(efs[1].split(',')[0].trim())
	// 			} else {
	// 				output[efs[0]] = {
	// 					itemSet: new Set([efs[1].split(',')[0].trim()])
	// 				}
	// 			}
	// 		})
	// 	}
	// })
	// console.log(output)

	return xmlData.upgrade_db.upgrade.map(item => Object.assign(item.$, {
		localnameCn: transform[item.$.localname].trim(),
		descCn: transform[item.$.desc].trim(),
		filterArr: item.$.item_filter.split('/').filter(x => x && x !== '*')
	}))
}

const formatOptionset = async () => {
	let xmlData = await readXmlParse(path.join(__dirname, 'data', `optionset.xml`))
	let txt = fs.readFileSync(path.join(__dirname, 'data', `optionset.china.txt`), 'utf-8')

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

const formatNpcInfo = async () => {
	let xmlData = await readXmlParse(path.join(__dirname, 'data', `npcinfo.xml`))
	let txt = fs.readFileSync(path.join(__dirname, 'data', `npcinfo.china.txt`), 'utf-8')

	let transform = {}
	txt.split('\n').forEach(val => {
		let sp = val.split('\t')
		transform[`_LT[xml.npcinfo.${sp[0].trim()}]`] = sp[1]
	})
	let hash = {}
	xmlData.NpcInfoList.NpcInfo.forEach(x => {
		hash[x.$.GeneralName] = transform[x.$.LocalName]
	})
	return hash
}

const matchEquipUpgrade = async Category => {
	if(itemUpgradeData.length === 0) {
		itemUpgradeData = await formatUpgradeInfo()
	}
	let ca = Category.split('/').filter(x => x && x !== '*')
	let out = []
	itemUpgradeData.forEach(item => {
		if(Array.from(new Set(item.filterArr.concat(ca))).length === ca.length) {
			out.push(item)
		}
	})
	return out
}

const searchEquipUpgrade = async (content, callback) => {
	if(Object.keys(filterDataStorage).length === 0) {
		filterDataStorage = await filterItem()
	}
	if(Object.keys(upgradeOptionsetHash).length === 0) {
		upgradeOptionsetHash = await formatOptionset()
	}
	if(Object.keys(npcInfoHash).length === 0) {
		npcInfoHash = await formatNpcInfo()
	}
	let filterEq
	if(/^\d+$/.test(content)) {
		filterEq = filterDataStorage[content] ? [filterDataStorage[content]] : []
	} else {
		filterEq = Object.values(filterDataStorage).filter(x => new RegExp(content).test(x.localeNameCn))
	}
	if(filterEq.length === 1) {
		let meu = await matchEquipUpgrade(filterEq[0].Category)
		renderImage(filterEq[0], meu)
		return
	}
	if(filterEq.length === 0) {
		callback(`未找到${content}`)
		return
	}
	callback(filterEq.splice(0, 100).map(x => `meu ${x.ID} | ${x.localeNameCn}`).join('\n'))
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
		return upgradeOptionsetHash[effectStr.substring(14, effectStr.length - 1)].split('\n').map(x => `<div class="effect-item" style="color: #57aeff">${x}</div>`).join('')
	}
	if (effectStr.startsWith('luckyupgrade')) {
		return `<div class="effect-item" style="color: #57aeff">铁匠改造数据[${effectStr.substring(13, effectStr.length - 1)}]</div>`
	}
	return effectStr
}

const renderImage = (targetItem, upgradeInfos) => {
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
    	justify-content: space-between;
    	align-content: flex-end;
    	border-bottom: 2px solid #fff;
    	color: #fff;
    }
    .main-container .equip-info .equip-name{
    	font-size: 40px;
    	line-height: 1.4;
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
		<div class="equip-name">${targetItem.localeNameCn}</div>
	</div>
	<div class="upgrade-group">
		${normalUpgrade.map(x => `
			<div class="upgrade-item">
				<div class="item-col col-1">
					<div class="upgrade-label">${x.localnameCn}</div>
					<div class="upgrade-desc">${x.descCn}</div>
				</div>
				<div class="item-col col-2">
					${x.effect.split(';').map(ef => analyzerEffect(ef)).join(' ')}
				</div>
				<div class="item-col col-3">
					${x.need_ep}
				</div>
				<div class="item-col col-4">
					${x.need_gold}
				</div>
				<div class="item-col col-5">
					${x.available_npc.split(';').map(x => `${npcInfoHash[x] || x}`).join(', ')}
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
					${x.effect.split(';').map(ef => analyzerEffect(ef)).join(' ')}
				</div>
				<div class="item-col col-3">
					${x.need_ep}
				</div>
				<div class="item-col col-4">
					${x.need_gold}
				</div>
				<div class="item-col col-5">
					${x.available_npc.split(';').map(x => `${npcInfoHash[x] || x}`).join(', ')}
				</div>
				<div class="need-gem">
					${x.need_gem.split(';').map(gemItem => {
						let [gemId, size] = gemItem.split(',').map(x => x.trim())
						return `${gemInfo[gemId] || gemId}(${size})`
					}).join('<br/>')}
				</div>
			</div>
		`).join('')}
	</div>
</div>
  
</body>
</html>`
	// let output = path.join(IMAGE_DATA, 'other', `MabiItemUpgrade.png`)
	let output = './MabiItemUpgrade.png'
	nodeHtmlToImage({
		output,
		html
	})
		.then(() => {
			console.log(`保存MabiItemUpgrade.png成功！`)
		})

}

//
// searchEquipUpgrade('41440', d => {console.log(d)})
// 这是无尽绝望巨锤
// searchEquipUpgrade('41440', d => {console.log(d)})
// 这是采集用小刀
// searchEquipUpgrade('40023', d => {console.log(d)})
searchEquipUpgrade('毁灭弓', d => {console.log(d)})
