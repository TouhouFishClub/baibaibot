const {search} = require('./fetchData');
const {analysisHtml} = require('./analysis');
(async () => {
  let a = await search('钟离')
  // console.log(a)
  analysisHtml(a)
  console.log('=== GET END ===')
})()