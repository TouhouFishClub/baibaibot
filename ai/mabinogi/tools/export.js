const fs = require("fs-extra")
const path = require("path-extra");
const xlsx = require('node-xlsx').default
const formatOptionset = require(path.join(__dirname, '/formatOptionset'))

const exportOpts = async () => {
	formatOptionset(data => {
		let format = [], keys = Object.keys(data[0])
		format[0] = keys
		data.forEach(row => {
			let rowData = []
			keys.forEach(col => {
				rowData.push(row[col])
			})
			format.push(rowData)
		})
		let buffer = xlsx.build([{name: "sheet", data: format}])
		fs.ensureDirSync(path.join(__dirname, 'tmp'), 0o2777)
		fs.writeFile(path.join(__dirname, 'tmp', `export.xlsx`), buffer, (err) => {
			if (err) throw err;
			console.log('The file has been saved!');
		});
	})
}

exportOpts()