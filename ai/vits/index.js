const fs = require("fs-extra");
const path = require("path-extra");
const request = require('request');

const { origin } = fs.readJsonSync(path.join(__dirname, '.secret.json'))
const { RECORD_DATA } = require('../../baibaiConfigs');

const soVitsReply = (content, gid, qq, callback) => {
  if (!(qq + "").startsWith("79901")) {
    return;
  }
  content = content.substring(2);
  content = content.replace(/：/g,':')
  content = content.replace(/ /g,'')
  content = content.replace(/\r/g,'。')
  content = content.replace(/\n/g,'。')
  const replaceText = {
    "1": "一",
    "2": "二",
    "3": "三",
    "4": "四",
    "5": "五",
    "6": "六",
    "7": "七",
    "8": "八",
    "9": "九",
    "0": "零"
  }

  for (const key in replaceText) {
    content = content.replace(new RegExp(key, "g"), replaceText[key])
  }

  const url = `${origin}?text=${encodeURIComponent(content)}&text_language=zh`

  const req = request.get(url);
  req.pipe(fs.createWriteStream(path.join(RECORD_DATA, 'vitsOutput.wav')))
    .on('finish', () => {
      console.log('File saved successfully!');
      callback(`[CQ:record,file=send/vitsOutput.wav]`)
    })
    .on('error', (err) => {
      console.error('Error:', err);
    })
}

module.exports = {
  soVitsReply
}
