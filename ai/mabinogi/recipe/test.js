const r = require('./source')
// const HTMLParser = require('node-html-parser');
const fs = require('fs')

let res = r.getItems()

// test id = 51391
// test id = 50221(蔬菜拼盘)

// console.log(HTMLParser.parse(res.ItemIdToItemDetail.get(51391).html))
// console.log(res.ItemIdToItemDetail.get(50221).html)

const nodeHtmlToImage = require('node-html-to-image')

let imgHash = {}

const analysisImgSrc = htmlData =>
  htmlData.split("src='img/").map((domSplit, index) => {
    if(index) {
      let sp = domSplit.split("'")
      let imageSrc = sp.shift()
      if(!imgHash[imageSrc]) {
        let image = fs.readFileSync(`./img/${imageSrc}`);
        let base64Image = new Buffer.from(image).toString('base64');
        imgHash[imageSrc] = 'data:image/jpeg;base64,' + base64Image
      }
      return `src='${imgHash[imageSrc]}'${sp.join("'")}`
    } else {
      return domSplit
    }
  }).join('')

nodeHtmlToImage({
  output: './image.png',
  html: `
  <html>asdfadfads</html>
`
})
  .then(() => console.log('The image was created successfully!'))
