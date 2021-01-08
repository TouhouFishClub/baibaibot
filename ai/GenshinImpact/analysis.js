const cheerio = require('cheerio')

const analysisHtml = htmlData => {
  const $ = cheerio.load(htmlData)
  console.log($('.obc-tmpl__part').length)
}

module.exports = {
  analysisHtml,
}