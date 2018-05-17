var fs = require('fs');
var https = require('https');
var phantom = require('phantom')

var mem = 0

function getFoodRate(callback){
  var nowts = new Date().getTime();
  if(nowts-mem<3600000){
    getPic("/kancolle/food.html",'',callback)
    return;
  }
  mem = nowts;
  var options = {
    host: 'db.kcwiki.org',
    port: 443,
    path: '/event-food2018/',
    method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.75 Safari/537.36'
    },
  };
  console.log(options);
  var req = https.request(options, function(res) {
    res.setEncoding('utf8');
    var resdata = '';
    res.on('data', function (chunk) {
      resdata = resdata + chunk;
    });
    res.on('end', function () {

      var n0 = resdata.indexOf('<table');
      if(n0>0){
        resdata=resdata.substring(n0-50);
      }


      var list = ['item86','item87','item88'];
      var foodnamelist = ['梅干','海苔','お茶'];
      var tba = []
      for(var i=0;i<list.length;i++){
        var n = resdata.indexOf("id='"+list[i]);
        var s1 = resdata.substring(n+5);
        var n1 = s1.indexOf('<thead');
        var s2 = s1.substring(n1);
        var n3 = s2.indexOf('</table>');
        var tb = s2.substring(0,n3+8);
        var tbh = '<table border="1">'+tb;
        tba.push('<div><div><b>'+foodnamelist[i]+'</b></div>'+tbh+'</div>');
      }
      var h='';
      h=h+'<table><tr><td rowspan="2">'+tba[0]+'</td><td>'+tba[1]+'</td></tr>';
      h=h+'<tr><td>'+tba[2]+'</td></tr>';
      h=h+'</table>';
      var html = '<html><head></head><body style="background-color: white"><div style="max-width: 900px" id="food">'+h+'</div></body></html>'
      fs.writeFileSync("public/kancolle/food.html",html);
      getPic("/kancolle/food.html",'',callback)
    });
  });
  req.on('error', function(err) {
    console.log('req err:');
    console.log(err);
  });
  req.end();
}











let getPic = async ( path,tag ,callback) => {
  //url路径
  let url        = 'http://localhost:10086'+path;
  console.log(url);
  //创建一个实例
  const instance = await phantom.create();
  //创建一个页面
  const page     = await instance.createPage();
  //设置页面参数
  await page.property( 'viewportSize' , { width : 1800 , height : 1600 } );

  const tagName = tag;
  //打开url，返回状态（url有转码，解决中文问题）
  const status = await page.open( url);
  if(status=='success'){
    const bb = await page.evaluate(function () {
      return document.getElementsByTagName('div')[0].getBoundingClientRect();
    });
    //page.clipRect = { top: 0, left: 0, width: 1024, height: 768 };
    await page.property('clipRect', {
      top:    bb.top,
      left:   bb.left,
      width:  bb.width,
      height: bb.height
    })
    // 按照实际页面的高度，设定渲染的宽高
    //延时等待页面js执行完成（phantomjs只是等待页面上全部资源加载完毕，不包含页面js执行时间，所以需延时一段时间等待js）
    await lateTime( 500 );
    //输出页面到当前目录下
    var now = new Date();
    var filename = "../coolq-data/cq/data/image/send/kancolle/"+now.getTime()+".png";
    console.log(filename);
    await page.render(filename);
    //销毁实例
    await instance.exit();

    callback('[CQ:image,file=/send/kancolle/'+now.getTime()+'.png]');
  }
};

let lateTime = ( time ) =>{
  return new Promise( function(resolve,reject){
    setTimeout(function(){
      resolve();
    }, time );
  } );
}






module.exports={
  getFoodRate
}