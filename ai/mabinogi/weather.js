const path = require("path");
const { IMAGE_DATA } = require(path.join(__dirname, '..', '..', 'baibaiConfigs.js'))
const puppeteer = require('puppeteer');

const mabiWeather = async (content, callback) => {

  const browser = await puppeteer.launch(); // 启动浏览器
  const page = await browser.newPage(); // 打开一个新页面
  // 导航到本地网页
  await page.goto('https://mabinogi.fws.tw/weather.php?wa=20'); // 将路径替换为你的本地网页路径
  // 等待一段时间，确保网页加载完成
  await page.waitForTimeout(3000); // 可根据需要调整等待时间

  await page.addStyleTag({ content: '.now_bg { background-color: transparent!important; border: 1px #f00 solid; }' }); // 替换为你自定义的 CSS

  const element = await page.$(".TbMainIE"); // 将选择器替换为你要截取的元素的选择器

  const boundingBox = await element.boundingBox();


  const output = path.join(IMAGE_DATA, 'mabi_other', `weather.png`)
  // const output = path.join(__dirname, `weather.png`)

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

    console.log(`保存weather.png成功！`)
    callback(`[CQ:image,file=${path.join('send', 'mabi_other', `weather.png`)}]`)

  } else {
    console.error('Element not found or not visible');
  }

  await browser.close(); // 关闭浏览器
}

module.exports = {
  mabiWeather
}