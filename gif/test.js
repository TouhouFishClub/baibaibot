const GIFEncoder = require('gifencoder');
const { createCanvas } = require('canvas');
const fs = require('fs');
const { sendImageMsgBuffer } = require('../cq/sendImage')
const path = require('path')
const { IMAGE_DATA } = require(path.join(__dirname, '../baibaiConfigs.js'))
const mkdirsSync = require('../lib/mkdirsSync')

const testGif = callback => {
  const encoder = new GIFEncoder(200, 200);
// stream the results as they are available into myanimated.gif

  let output = path.join(IMAGE_DATA, 'out'), imgName = 'myanimated'
  // let output = path.join('./', 'out'), imgName = 'myanimated'
  if (!fs.existsSync(output)) {
    mkdirsSync(output);
  }
  encoder.createReadStream().pipe(fs.createWriteStream(path.join(output, `${imgName}.gif`)));

  encoder.start();
  encoder.setRepeat(0);   // 0 for repeat, -1 for no-repeat
  encoder.setDelay(500);  // frame delay in ms
  encoder.setQuality(10); // image quality. 10 is default.

// use node-canvas
  const canvas = createCanvas(320, 240);
  const ctx = canvas.getContext('2d');

// red rectangle
  ctx.fillStyle = '#ff0000';
  ctx.fillRect(0, 0, 320, 240);
  encoder.addFrame(ctx);

// green rectangle
  ctx.fillStyle = '#00ff00';
  ctx.fillRect(0, 0, 320, 240);
  encoder.addFrame(ctx);

// blue rectangle
  ctx.fillStyle = '#0000ff';
  ctx.fillRect(0, 0, 320, 240);
  encoder.addFrame(ctx);

  encoder.finish();

  console.log(`保存${imgName}.gif成功！`)
  let imgMsg = `[CQ:image,file=${path.join('send', 'out', `${imgName}.gif`)}]`
  callback(imgMsg)
}

// testGif()
module.exports = {
  testGif
}