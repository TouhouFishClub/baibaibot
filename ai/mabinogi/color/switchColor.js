const GIFEncoder = require('gifencoder');
const { createCanvas } = require('canvas');
const path = require("path");
const fs = require("fs");
const {IMAGE_DATA} = require("../../../baibaiConfigs");

const rgbToHex = (r, g, b) => {
  var hex = ((r<<16) | (g<<8) | b).toString(16);
  return "#" + new Array(Math.abs(hex.length-7)).join("0") + hex;
}
const hexToRgb = hex => {
  const rgb = []
  for(let i = 1; i < 7; i += 2) {
    rgb.push(parseInt("0x" + hex.slice(i, i + 2)))
  }
  return rgb
}
/*
* @params
* mode: 切换模式
*   4: 规则
*   8: 不规则
*   6: 往返
*   7: 切换
* scope: 变换幅度
* speed: 速度
* start: 起始颜色
* color1: 颜色1（开始颜色）
* color2: 颜色2（结束颜色）
* ABCDXXYY
* A: mode
* B: scope
* C: speed
* D: start
* XX: color1
* YY: color2
* */
const createColorArr = (color1, color2, option) => {
  let defaultOption = {
    mode: 4,
    scope: 0,
    speed: 0,
    start: 0
  }
  let { mode, scope, speed, start } = Object.assign(defaultOption, option)
  if(!new Set([4,6,7,8]).has(mode)) {
    mode = 4
  }
  var sColor = hexToRgb(color2), eColor = hexToRgb(color1);
  var colorArr = [];
  var i;
  var cancel;
  var step = 16
  var red, green, blue;

  var rStep = (eColor[0] - sColor[0]) / step,
    gStep = (eColor[1] - sColor[1]) / step,
    bStep = (eColor[2] - sColor[2]) / step;

  for(i = 0; i <= step; i++){
    red = Math.round(rStep*i+sColor[0]);
    green =  Math.round(gStep*i+sColor[1]);
    blue = Math.round(bStep*i+sColor[2]);
    colorArr.push(rgbToHex(red, green, blue));
  }

  if(mode == 4 && scope == 0){ //delete second color when 40XX
    colorArr.splice(1,1);
  }
  else if(mode == 7){
    colorArr.splice(1, step-1);
  }
  else if(mode == 4 && scope == 15 && start == 15){
    colorArr.splice(1,15);
    return colorArr;
  }
  else{ //delete first color when not 40XX
    cancel = colorArr.shift();
  }

  if(mode == 6){
    for(i = 0; i <= 7; i++)
      colorArr.splice(i+1, 1);
    for(i = 7; i >= 0; i--)
      colorArr.push(colorArr[i]);
  }

  if((mode == 4 || mode == 6) && start != 0){
    colorArr = colorArr.concat(colorArr.splice(0,start));
  }

  if((mode == 4 || mode == 6) && scope != 0){
    i = 0;
    scope++;
    colorArr.push(colorArr[i]);
    for(i = i+scope; i != 0; i = i+scope){
      if(i > 15){
        i = (i-16);
        if(i != 0){
          colorArr.push(colorArr[i]);
        }
        else{ //return array when finished
          if(scope == 15 && mode == 4)
            colorArr[18] = cancel; //in-game design was so, don't ask why.
          colorArr.splice(0,16);
          break;
        }
      }
      else if(i != 0){
        colorArr.push(colorArr[i]);
      }
    }
  }

  return colorArr
}

const renderGif = (colorArr, speed) => new Promise((resolve) => {

  const encoder = new GIFEncoder(100, 20);

  let output = path.join(IMAGE_DATA, 'other'), imgName = 'output.gif'
  if (!fs.existsSync(output)) {
    mkdirsSync(output);
  }
  encoder.createReadStream().pipe(fs.createWriteStream(path.join(output, `${imgName}`)));

  encoder.start();
  encoder.setRepeat(0);   // 0 for repeat, -1 for no-repeat
  encoder.setDelay(33 * speed);  // frame delay in ms
  encoder.setQuality(10); // image quality. 10 is default.

// use node-canvas
  const canvas = createCanvas(100, 20);
  const ctx = canvas.getContext('2d');

  for(let i = 0; i < colorArr.length; i ++){
    ctx.fillStyle = colorArr[i];
    ctx.fillRect(0, 0, 100, 20);
    encoder.addFrame(ctx);
  }

  encoder.finish();

  setTimeout(() => {
    console.log(`保存${imgName}成功！`)
    let imgMsg = `[CQ:image,file=${path.join('send', 'other', `${imgName}`)}]`
    resolve(imgMsg)
  }, 2000)
})

const colorCodes = [
  '#000000',
  '#002084',
  '#008221',
  '#0082A5',
  '#840C18',
  '#7B1894',
  '#BD7D21',
  '#C6C3C6',
  '#393839',
  '#002CFF',
  '#10FF63',
  '#FF0000',
  '#FFFF00',
  '#EF49FF',
  '#29DFFF',
  '#FFFFFF',
  '#F7EFFF',
  '#F7F3DE',
  '#EFE3B5',
  '#FFE3B5',
  '#FFD7B5',
  '#FFC7C6',
  '#CEAAAD',
  '#B58A7B',
  '#ADAAA5',
  '#9C5D42',
  '#C6794A',
  '#633C31',
  '#000000',
  '#211C39',
  '#424563',
  '#5A4D8C',
  '#7B8AAD',
  '#ADAEC6',
  '#E7E3FF',
  '#FFF38C',
  '#EF9252',
  '#C67139',
  '#C61400',
  '#7B2C10',
  '#000000',
  '#000033',
  '#000066',
  '#000099',
  '#0000CC',
  '#0000FF',
  '#003300',
  '#003333',
  '#003366',
  '#003399',
  '#0033CC',
  '#0033FF',
  '#006600',
  '#006633',
  '#006666',
  '#006699',
  '#0066CC',
  '#0066FF',
  '#009900',
  '#009933',
  '#009966',
  '#009999',
  '#0099CC',
  '#0099FF',
  '#00CC00',
  '#00CC33',
  '#00CC66',
  '#00CC99',
  '#00CCCC',
  '#00CCFF',
  '#00FF00',
  '#00FF33',
  '#00FF66',
  '#00FF99',
  '#00FFCC',
  '#00FFFF',
  '#330000',
  '#330033',
  '#330066',
  '#330099',
  '#3300CC',
  '#3300FF',
  '#333300',
  '#333333',
  '#333366',
  '#333399',
  '#3333CC',
  '#3333FF',
  '#336600',
  '#336633',
  '#336666',
  '#336699',
  '#3366CC',
  '#3366FF',
  '#339900',
  '#339933',
  '#339966',
  '#339999',
  '#3399CC',
  '#3399FF',
  '#33CC00',
  '#33CC33',
  '#33CC66',
  '#33CC99',
  '#33CCCC',
  '#33CCFF',
  '#33FF00',
  '#33FF33',
  '#33FF66',
  '#33FF99',
  '#33FFCC',
  '#33FFFF',
  '#660000',
  '#660033',
  '#660066',
  '#660099',
  '#6600CC',
  '#6600FF',
  '#663300',
  '#663333',
  '#663366',
  '#663399',
  '#6633CC',
  '#6633FF',
  '#666600',
  '#666633',
  '#666666',
  '#666699',
  '#6666CC',
  '#6666FF',
  '#669900',
  '#669933',
  '#669966',
  '#669999',
  '#6699CC',
  '#6699FF',
  '#66CC00',
  '#66CC33',
  '#66CC66',
  '#66CC99',
  '#66CCCC',
  '#66CCFF',
  '#66FF00',
  '#66FF33',
  '#66FF66',
  '#66FF99',
  '#66FFCC',
  '#66FFFF',
  '#990000',
  '#990033',
  '#990066',
  '#990099',
  '#9900CC',
  '#9900FF',
  '#993300',
  '#993333',
  '#993366',
  '#993399',
  '#9933CC',
  '#9933FF',
  '#996600',
  '#996633',
  '#996666',
  '#996699',
  '#9966CC',
  '#9966FF',
  '#999900',
  '#999933',
  '#999966',
  '#999999',
  '#9999CC',
  '#9999FF',
  '#99CC00',
  '#99CC33',
  '#99CC66',
  '#99CC99',
  '#99CCCC',
  '#99CCFF',
  '#99FF00',
  '#99FF33',
  '#99FF66',
  '#99FF99',
  '#99FFCC',
  '#99FFFF',
  '#CC0000',
  '#CC0033',
  '#CC0066',
  '#CC0099',
  '#CC00CC',
  '#CC00FF',
  '#CC3300',
  '#CC3333',
  '#CC3366',
  '#CC3399',
  '#CC33CC',
  '#CC33FF',
  '#CC6600',
  '#CC6633',
  '#CC6666',
  '#CC6699',
  '#CC66CC',
  '#CC66FF',
  '#CC9900',
  '#CC9933',
  '#CC9966',
  '#CC9999',
  '#CC99CC',
  '#CC99FF',
  '#CCCC00',
  '#CCCC33',
  '#CCCC66',
  '#CCCC99',
  '#CCCCCC',
  '#CCCCFF',
  '#CCFF00',
  '#CCFF33',
  '#CCFF66',
  '#CCFF99',
  '#CCFFCC',
  '#CCFFFF',
  '#FF0000',
  '#FF0033',
  '#FF0066',
  '#FF0099',
  '#FF00CC',
  '#FF00FF',
  '#FF3300',
  '#FF3333',
  '#FF3366',
  '#FF3399',
  '#FF33CC',
  '#FF33FF',
  '#FF6600',
  '#FF6633',
  '#FF6666',
  '#FF6699',
  '#FF66CC',
  '#FF66FF',
  '#FF9900',
  '#FF9933',
  '#FF9966',
  '#FF9999',
  '#FF99CC',
  '#FF99FF',
  '#FFCC00',
  '#FFCC33',
  '#FFCC66',
  '#FFCC99',
  '#FFCCCC',
  '#FFCCFF',
  '#FFFF00',
  '#FFFF33',
  '#FFFF66',
  '#FFFF99',
  '#FFFFCC',
  '#FFFFFF'
]
const createColorForCode = async code => {
  let sp = code.toUpperCase().split('')
  const
    mode = parseInt(`0x${sp[0]}`),
    scope = parseInt(`0x${sp[1]}`),
    speed = parseInt(`0x${sp[2]}`),
    start = parseInt(`0x${sp[3]}`),
    color1 = colorCodes[parseInt(`0x${sp[4]}${sp[5]}`)],
    color2 = colorCodes[parseInt(`0x${sp[6]}${sp[7]}`)],
    colorArr = createColorArr(color1, color2, {
      mode,
      scope,
      speed,
      start
    })
  const cqCode = await renderGif(colorArr, speed)
  return `=== 洛奇闪染 ===\n颜色1：${color1}\n颜色2：${color2}\n闪烁种类：${['错误','错误','错误','错误','规则','错误','往返','切换','不规则','错误','错误'][mode]}\n${cqCode}\n速度：${speed}\n变化幅度：${scope}\n起始颜色：${start}`
}

// console.log(createColorArr('#000000', '#ffffff', {scope: 1}))

module.exports = {
  createColorForCode
}