var nodejieba = require("nodejieba");
var topN = 10;
var wd = "我不恨你"
console.log(wd);
console.log(nodejieba.extract(wd, topN));

var bosonnlp = require('bosonnlp');
var nlp = new bosonnlp.BosonNLP('A6Dvxzs0.25388.G_wPyy4DDLw-');
var text="【芙兰好笨】抽到了：コマ  [CQ:image,file=send/20180507/card/1525664687800.jpg]"
nlp.sentiment(wd, function (data) {
  // [非负面概率, 负面概率]
  // [[0.6519134382562579, 0.34808656174374203], [0.92706110187413, 0.07293889812586994]]
  console.log(data);
});