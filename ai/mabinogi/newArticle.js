const path = require("path");
const { IMAGE_DATA } = require(path.join(__dirname, '..', '..', 'baibaiConfigs.js'))
const puppeteer = require('puppeteer');

const tcArticle = async (callback) => {
  // 启动 Puppeteer
  const browser = await puppeteer.launch();

  // 创建一个新的页面
  const page = await browser.newPage();

  // 访问指定页面
  await page.goto('https://luoqi.tiancity.com/homepage/article/Class_255_Time_1.html');

  // 等待页面加载完成
  await page.waitForSelector('ul.newsList li');

  // 获取第一个 li 元素下的 a 标签的链接
  const url = await page.evaluate(() => {
    const firstListItem = document.querySelector('ul.newsList li:first-child a');
    return firstListItem.getAttribute('href');
  });

  // 截取链接对应页面的部分内容
  await page.goto(`https:${url}`);

  // 等待页面加载完成
  await page.waitForSelector('dl.newCon');

  // 获取 dl.newCon 元素的位置和大小
  const { x, y, width, height } = await page.evaluate(() => {
    const dlElement = document.querySelector('dl.newCon');
    const { x, y, width, height } = dlElement.getBoundingClientRect();
    return { x, y, width, height };
  });

  // 将 dl.newCon 元素滚动到可视区域内
  await page.evaluate(({ y }) => {
    window.scrollTo({ top: y, behavior: 'smooth' });
  }, { y });

  // 等待滚动完成
  await page.waitForTimeout(1000);


  const output = path.join(IMAGE_DATA, 'mabi_other', `article.png`)
  // 截取 dl.newCon 元素的内容并保存为图片
  await page.screenshot({ path: output, clip: { x, y, width, height } });

  console.log(`保存weather.png成功！`)
  callback(`[CQ:image,file=${path.join('send', 'mabi_other', `article.png`)}]`)

  // 关闭浏览器
  await browser.close();
}

module.exports = {
  tcArticle
}