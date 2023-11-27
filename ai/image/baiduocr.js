var AipOcrClient = require("baidu-aip-sdk").ocr;
// 设置APPID/AK/SK
var APP_ID = "14220224";
var API_KEY = "5ziuCkS0e1uIXhqt9ogb0Rvw";
var SECRET_KEY = "LnqYm0ffWaNgdS5AlhvaGPl5D2FSFbXC";
var client = new AipOcrClient(APP_ID, API_KEY, SECRET_KEY);
var fs = require('fs');


function baiduocr(url,callback) {
  // var url = "https://gchat.qpic.cn/gchatpic_new/799018865/727605874-2709565858-EED85D67165766654DE3EBCEC0834637/0?term=2";
  client.generalBasicUrl(url).then(function (result) {
    var wds = result.words_result;
    console.log(result);
    var ret = '';
    for(var i=0;i<wds.length;i++){
      var wd = wds[i].words;
      ret = ret + wd + '\n';
    }
    callback(ret.trim());
  }).catch(function (err) {
    console.log(err);
  });
}



function baiduocrb64(base64,callback){

  client.generalBasic(base64).then(function (result) {
    var wds = result.words_result;
    console.log(result);
    var ret = '';
    for(var i=0;i<wds.length;i++){
      var wd = wds[i].words;
      ret = ret + wd + '\n';
    }
    callback(ret.trim());
  }).catch(function (err) {
    console.log(err);
  });
}


function test(){
  tencentOcr()
}
//test()

// const tencentcloud = require("tencentcloud-sdk-nodejs");



// 实例化一个认证对象，入参需要传入腾讯云账户secretId，secretKey,此处还需注意密钥对的保密
// 密钥可前往https://console.cloud.tencent.com/cam/capi网站进行获取
const clientConfig = {
  credential: {
    secretId: "AKIDv6B6nVL4c1tdEg2HJE6mGWM3XoskSAg1",
    secretKey: "GNM2XzHPOEsHVXN1RdcOUPSLI0U3Ujlr",
  },
  region: "ap-beijing",
  profile: {
    httpProfile: {
      endpoint: "ocr.tencentcloudapi.com",
    },
  },
};

function tencentOcr(){
  // const tencentcloud = require("tencentcloud-sdk-nodejs");
  const OcrClient = tencentcloud.ocr.v20181119.Client;
  const client = new OcrClient(clientConfig);
  var image = fs.readFileSync("222").toString("base64");
  const params = {
    "ImageBase64":image
  };
  client.GeneralFastOCR(params).then(
    (data) => {
      console.log(data);
    },
    (err) => {
      console.error("error", err);
    }
  );
}



























module.exports={
  baiduocr
}

