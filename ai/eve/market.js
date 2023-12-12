/*
*
* EVE 市场查询
* API 采用 https://www.ceve-market.org/api/
*
* */
const fs = require('fs')
const path = require('path')
const axios = require('axios')
const XLSX = require('xlsx');


//https://www.ceve-market.org/dumps/evedata.xlsx
const help = () => {
  return `这是帮助`
}

const downloadFile = async () => {
  const fileUrl = 'https://www.ceve-market.org/dumps/evedata.xlsx'
  const filePath = path.join(__dirname, '/data/evedata.xlsx')
  try {
    const response = await axios({
      method: 'GET',
      url: fileUrl,
      responseType: 'stream',
    });

    const writer = fs.createWriteStream(filePath);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
  } catch (error) {
    console.error('下载文件时出错：', error);
  }
};

const analysisXls = async () => {
  const filePath = path.join(__dirname, '/data/evedata.xlsx')
  if(!fs.existsSync(filePath)) {
    console.log(`=== data文件不存在，优先下载文件 ===`)
    await downloadFile()
  }
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames
  console.log(workbook.Sheets)

}

const market = async (content, qq, callback) => {
  if (content == '更新') {
    await downloadFile()
    await analysisXls()
    callback('更新完成')
    return
  }

  if(content.length > 2) {

    return
  }


  callback(help())
}

market('更新', 123, d => {
  console.log(d)
})