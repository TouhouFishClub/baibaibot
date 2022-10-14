const fs = require('fs-extra')
const path = require('path')
const xml2js = require('xml2js')

const parser = new xml2js.Parser()
let filterDataStorage = {}
let itemUpgradeData = []

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
			if(item.$.Par_UpgradeMax && item.$.Par_UpgradeMax > 0 && (!item.$.Locale || item.$.Locale === 'china')) {
				let localeNameCn = item.$.Text_Name1 ? txtData[index][item.$.Text_Name1] : 'NULL'
				if(localeNameCn && localeNameCn.indexOf('临时') === -1 && localeNameCn.indexOf('不开放') === -1 && !localeNameCn.startsWith('@')) {
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
	return xmlData.upgrade_db.upgrade.map(item => Object.assign(item.$, {
		localnameCn: transform[item.$.localname].trim(),
		descCn: transform[item.$.desc].trim(),
		filterArr: item.$.item_filter.split('/').filter(x => x && x !== '*')
	}))
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
	let filterEq
	if(/^\d+$/.test(content)) {
		filterEq = filterDataStorage[content] ? [filterDataStorage[content]] : []
	} else {
		filterEq = Object.values(filterDataStorage).filter(x => new RegExp(content).test(x.localeNameCn))
	}
	if(filterEq.length === 1) {
		let meu = await matchEquipUpgrade(filterEq[0].Category)
		console.log(meu.map(x => `${x.localnameCn}: ${x.descCn}`).join('\n'))
		console.log(meu.length)
		return
	}
	if(filterEq.length === 0) {
		callback(`未找到${content}`)
		return
	}
	callback(filterEq.splice(0, 10).map(x => `meu ${x.ID} | ${x.localeNameCn}`).join('\n'))
}

searchEquipUpgrade('40011', d => {console.log(d)})
