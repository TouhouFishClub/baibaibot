const fs = require('fs')
const path = require('path')
const http = require('http')
const { IMAGE_DATA } = require(path.join(__dirname, '..', 'baibaiConfigs.js'))
const puppeteer = require('puppeteer');

const fetchCityData = content =>
  new Promise((resolve, reject) => {
    http.get({
      hostname: 'toy1.weather.com.cn',
      port: 80,
      path: '/search?cityname='+encodeURIComponent(content)+'&callback=s',
      agent: false,
    }, (res) => {
      res.setEncoding('utf8')
      let rawData = ''
      res.on('data', chunk => { rawData += chunk })
      res.on('end', () => {
        let res = JSON.parse(rawData.substring(2, rawData.length - 1))
        if(res && res.length) {
          let [...args] = res[0].ref.split('~')
          resolve(args[2])
        } else {
          resolve('')
        }
      })
    })
  })

const getWeatherByCity = async (content, callback) => {
  let res = await fetchCityData(content)
  if(res) {
    const browser = await puppeteer.launch()
    const page = await browser.newPage()
    await page.goto('http://www.weather.com.cn/')
    await page.waitForTimeout(1500)
    await page.click(`#cityNameHref`)
    await page.waitForTimeout(300)
    await page.type('#cityInput', res)
    await page.waitForTimeout(300)
    await page.click(`.saveBtn`)
    await page.waitForTimeout(1500)
    const element = await page.$('.myWeather')
    const boundingBox = await element.boundingBox()

    const output = path.join(IMAGE_DATA, 'weather', `${res}天气.png`)
    // const output = path.join(`./${res}天气.png`)

    if (boundingBox) {
      // 截取特定区域并保存为图片
      await page.screenshot({
        path: output,
        clip: {
          x: boundingBox.x,
          y: boundingBox.y,
          width: boundingBox.width,
          height: boundingBox.height
        }
      });
      console.log(`保存${res}天气.png成功！`)
      let imgMsg = `[CQ:image,file=${path.join('send', 'weather', `${res}天气.png`)}]`
      callback(imgMsg)
    } else {
      console.error('Element not found or not visible');
    }
    await browser.close(); // 关闭浏览器
  }
}

module.exports = {
  getWeatherByCity
}