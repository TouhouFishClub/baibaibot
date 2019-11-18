var gm = require('gm')
var imageMagick = gm.subClass({ imageMagick : true });
const {baiduocr,numocr} = require('../image/baiduocr');
var fs = require('fs');
var https = require('https');

var gain = {
    6: 10000,
    7: 36,
    8: 720,
    9: 360,
    10: 80,
    11: 252,
    12: 108,
    13: 72,
    14: 54,
    15: 180,
    16: 72,
    17: 180,
    18: 119,
    19: 36,
    20: 306,
    21: 1080,
    22: 144,
    23: 1800,
    24: 3600
};

function calMiniCatapot(){
  var bitmap = fs.readFileSync("/home/ter/qw/123.png");
  var base64 = new Buffer(bitmap).toString('base64');


  var options = {
    hostname: "aip.baidubce.com",
    port: 443,
    path: '/rest/2.0/ocr/v1/numbers?access_token=24.4bafe943aa6e4d2751a9ccdde6ac35e6.2592000.1561793451.282335-16393341',
    method: 'POST',
    headers:{
      'Content-Type':'application/x-www-form-urlencoded'
    }
  };
  console.log(options);
  console.log('===============')
  var body = 'image='+encodeURIComponent(base64);
  var req = https.request(options, function(res) {
    res.setEncoding('utf8');
    var code = res.statusCode;
    res.setEncoding('utf8');
    var resdata = '';
    res.on('data', function (chunk) {
      resdata = resdata + chunk;
    });
    res.on('end', function () {
      console.log('code1:'+code);
      console.log(resdata);
    });
  });
  req.on('error', function(err) {
    console.log('req err:');
    console.log(err);
  });
  req.setTimeout(5000,function(){
    console.log('boom!');
  });
  req.write(body)
  req.end();


}

function calMiniCatapot_d(arr){
  var all = {1:1,2:1,3:1,4:1,5:1,6:1,7:1,8:1,9:1};
  for(var i=0;i<arr.length;i++){
    delete(all[arr[i]]);
  }
  var leftarr = Object.keys(all).sort().map(function(e){return parseInt(e)});
  var left1 = [];
  var left2 = [];
  var left3 = [];
  for(var i=0;i<leftarr.length;i++){
    left1.push(leftarr[i]);
  }
  left2.push(leftarr[0]+leftarr[1])
  left2.push(leftarr[0]+leftarr[2])
  left2.push(leftarr[0]+leftarr[3])
  left2.push(leftarr[0]+leftarr[4])
  left2.push(leftarr[1]+leftarr[2])
  left2.push(leftarr[1]+leftarr[3])
  left2.push(leftarr[1]+leftarr[4])
  left2.push(leftarr[2]+leftarr[3])
  left2.push(leftarr[2]+leftarr[4])
  left2.push(leftarr[3]+leftarr[4])

  left3.push(leftarr[0]+leftarr[1]+leftarr[2])
  left3.push(leftarr[0]+leftarr[1]+leftarr[3])
  left3.push(leftarr[0]+leftarr[1]+leftarr[4])
  left3.push(leftarr[0]+leftarr[2]+leftarr[3])
  left3.push(leftarr[0]+leftarr[2]+leftarr[4])
  left3.push(leftarr[0]+leftarr[3]+leftarr[4])
  left3.push(leftarr[1]+leftarr[2]+leftarr[3])
  left3.push(leftarr[1]+leftarr[2]+leftarr[4])
  left3.push(leftarr[1]+leftarr[3]+leftarr[4])
  left3.push(leftarr[2]+leftarr[3]+leftarr[4])

  console.log(left1)
  console.log(left2)
  console.log(left3)
  var r=[
    [0,1,2],
    [3,4,5],
    [6,7,8],
    [0,3,6],
    [1,4,7],
    [2,5,8],
    [0,4,8],
    [2,4,6]
  ]
  var rx=[]
  for(var i=0;i<8;i++){
    var b=0;
    var s=0;
    for(var k=0;k<3;k++){
      if(!arr[r[i][k]]){
        b++;
      }else{
        s=s+arr[r[i][k]]
      }
    }
    if(b==0){
      rx.push(gain[s]);
    }else if(b==1){
      var us = 0;
      for(var k=0;k<left1.length;k++){
        us = us + gain[s + left1[k]];
      }
      us = us/left1.length;
      rx.push(us);
    }else if(b==2){
      var us = 0;
      for(var k=0;k<left2.length;k++){
        us = us + gain[s + left2[k]];
      }
      us = us/left2.length;
      rx.push(us);
    }else{
      var us = 0;
      for(var k=0;k<left3.length;k++){
        us = us + gain[s + left3[k]];
      }
      us = us/left3.length;
      rx.push(us);
    }
  }

  var max = -1;
  var m =0;
  for(var i=0;i<rx.length;i++){
    if(rx[i]>m){
      m=rx[i];
      max=i;
    }
  }

  var img1 = new imageMagick("static/blank.png");
  img1.resize(320, 320,'!') //加('!')强行把图片缩放成对应尺寸150*150！
    .autoOrient()
    .fontSize(20)
    .fill('blue')
    .font('./static/dfgw.ttf');

  var wd=75;
  var raa = [];
  for(var i=0;i<9;i++){
    if(arr[i]){
      raa.push(arr[i]+"");
    }else{
      raa.push("");
    }
  }
  var list = [
    [rx[6],rx[3],rx[4],rx[5]],
    [rx[0],raa[0],raa[1],raa[2]],
    [rx[1],raa[3],raa[4],raa[5]],
    [rx[2],raa[6],raa[7],raa[8]],
  ]
  for(var i=0;i<4;i++){
    for(var j=0;j<4;j++){
      if(list[i][j]==m){
        img1.fill('red').fontSize(22)
      }
      img1.drawText(j*wd,i*wd,list[i][j],'NorthWest')
      if(list[i][j]==m) {
        img1.fill('blue').fontSize(20)
      }
    }
  }
  if(rx[7]==m){
    img1.fill('red').fontSize(22)
  }
  img1.drawText(0*wd,4*wd,rx[7],'NorthWest')
  img1.write("aa_blank.jpg", function(err){

  });
}




module.exports={
  calMiniCatapot
}


function sortIndex(arr, index) {
  if(arr.length > 21){
    return '数组过大'
  }
  if(arr.length === 1){
    return arr
  }
  if(arr.length === 0){
    return arr
  }
  let maxFlag = 1, minFlag = 0
  for(let i = 1; i <= arr.length; i++ ){
    if(index < maxFlag && index >= minFlag){
      return arr.sort().splice(0, arr.length - i).concat(arr.sort().splice(~~index/minFlag, 1)).concat(sortIndex(arr, index % minFlag))
    } else {
      minFlag = maxFlag
      maxFlag = maxFlag * (i + 1)
    }
  }
}

