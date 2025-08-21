const path = require("path");
const { IMAGE_DATA } = require(path.join(__dirname, '..', '..', 'baibaiConfigs.js'))
const puppeteer = require('puppeteer');

const mabiWeather = async (content, callback) => {
  let browser;
  
  try {
    // 启动浏览器，添加更多兼容性选项
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu'
      ],
      timeout: 60000 // 启动超时设为60秒
    });
    
    const page = await browser.newPage();
    
    // 设置用户代理和视口
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    await page.setViewport({ width: 1920, height: 1080 });
    
    // 设置更长的超时时间并添加重试机制
    const maxRetries = 3;
    let retryCount = 0;
    let success = false;
    
    while (retryCount < maxRetries && !success) {
      try {
        console.log(`尝试第 ${retryCount + 1} 次访问网页...`);
        
        // 导航到网页，设置更长的超时时间
        await page.goto('https://mabinogi.fws.tw/weather.php?wa=20', {
          waitUntil: 'networkidle2', // 等待网络空闲
          timeout: 60000 // 60秒超时
        });
        
        success = true;
        console.log('页面加载成功');
        
      } catch (error) {
        retryCount++;
        console.log(`第 ${retryCount} 次尝试失败:`, error.message);
        
        if (retryCount >= maxRetries) {
          throw new Error(`经过 ${maxRetries} 次重试仍然失败: ${error.message}`);
        }
        
        // 等待一段时间后重试
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    // 等待页面内容加载完成
    await page.waitForTimeout(3000);
    
    // 等待目标元素出现
    await page.waitForSelector('.TbMainIE', { timeout: 30000 });
    
    await page.addStyleTag({ 
      content: '.now_bg { background-color: transparent!important; border: 1px #f00 solid; }' 
    });

    const element = await page.$(".TbMainIE");
    
    if (!element) {
      throw new Error('找不到目标元素 .TbMainIE');
    }

    const boundingBox = await element.boundingBox();
    
    if (!boundingBox) {
      throw new Error('无法获取元素的边界框');
    }

    const output = path.join(IMAGE_DATA, 'mabi_other', `weather.png`);

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

    console.log(`保存weather.png成功！`);
    callback(`[CQ:image,file=${path.join('send', 'mabi_other', `weather.png`)}]`);

  } catch (error) {
    console.error('天气截图失败:', error.message);
    callback(`获取天气信息失败: ${error.message}`);
  } finally {
    if (browser) {
      await browser.close(); // 确保浏览器被关闭
    }
  }
}

module.exports = {
  mabiWeather
}