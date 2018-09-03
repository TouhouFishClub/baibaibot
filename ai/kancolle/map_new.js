var HttpsProxyAgent = require('https-proxy-agent')
var proxy = 'http://192.168.17.62:3128';
var agent = new HttpsProxyAgent(proxy);
var fs = require('fs');
var https = require('https')
var phantom = require('phantom')
var request = require('request')

var head = '<html>  <head>  <style>  body{background-color:#c2ccd4}body,td,th{margin:.7% 2%;font-size:12px;font-family:verdana,arial,helvetica,sans-serif;background-color:#fff}td[id^=rgn_content]{margin-left:0;margin-right:0}a:link{color:#215dc6}a:active{color:#215dc6}a:visited{color:#a63d21}a:hover{color:#215dc6;background-color:#cde;text-decoration:underline}h1,h2{font-size:13px;background-color:#def}h3{font-size:12px;border-bottom:3px solid #def;border-top:1px solid #def;border-left:10px solid #def;border-right:5px solid #def}h4{font-size:12px;border-left:18px solid #def}h5,h6{font-size:12px;background-color:#def}h1.title{font-size:16px;background-color:#def}pre{background-color:#f0f8ff}thead td.style_td,tfoot td.style_td{background-color:#d0d8e0}thead th.style_th,tfoot th.style_th{background-color:#e0e8f0;font-size:12px}.style_table{background-color:#ccd5dd}.style_th{font-size:12px;background-color:#eee}.style_td{background-color:#eef5ff}.super_index{font-size:10px}a.note_super{font-size:10px}div.jumpmenu{font-size:8px}div#navigator{font-size:12px}div#menubar h2{font-size:12px}div#menubar h3{font-size:12px}div#menubar h4{font-size:12px}div#menubar h5{font-size:12px}div#sidebar{font-size:12px}div#sidebar h2,h3,h4,h5{font-size:12px}div#lastmodified{font-size:10px}div#related{font-size:10px}div#footer{font-size:12px;padding:0;margin:0 1%}.style_calendar{background-color:#ccd5dd}.style_td_caltop{background-color:#eef5ff}.style_td_sat{background-color:#dde5ff}.style_td_sun{background-color:#fee}.style_td_blank{background-color:#eef5ff}.style_td_day{background-color:#eef5ff}.style_td_week{background-color:#dde5ee}span.new1{color:red}td.vote_label{background-color:#fcc}td.vote_td1{background-color:#dde5ff}td.vote_td2{background-color:#eef5ff}td.ltable{width:160px}td.rtable{width:160px}td.ctable{padding-left:10px;padding-right:10px}div#topicpath{font-size:12px}div#footerltable{font-size:11px}blockquote{border:1px solid #ccc;margin-top:.5em;margin-bottom:.5em}.ministyle_calendar{background-color:#e0e0e0}.ministyle_td_caltop{background-color:#fff5ee}.ministyle_td_sat{background-color:#dde5ff}.ministyle_td_sun{background-color:#fee}.ministyle_td_blank{background-color:#eee}.ministyle_td_day{background-color:#eef5ff}.ministyle_td_week{background-color:#e0e0e0}#poptoc{font-size:12px}#poptoc h2 a{font-size:12px}div#sigunature{font-size:11px}#footerctable{font-size:11px}#header .style_table .style_th{font-size:12px}#header .style_table .style_td{font-size:12px}#footer .style_table .style_th{font-size:12px}#footer .style_table .style_td{font-size:12px}td.navimenu{font-size:12px}div.naviblock{font-size:12px}div#cads{line-height:normal;letter-spacing:0;margin-bottom:1em}p.cads{line-height:normal;background-color:#def;text-decoration:none}.cads a{color:#000;border-style:none}</style></head><body>';
var tail = '</body>  </html>';

function replyKancolleRoute(content,userName,callback){
  if(content.length==3){
    callback('[CQ:image,file=send/kancolle/route/'+content+'.png]');
  }
}





var list = ['鎮守府海域','南西諸島海域','北方海域','西方海域','南方海域','中部海域','南西海域']
function getmapsHtml(){
  for(var i=1;i<=1;i++){
    for(var j=1;j<=6;j++){
      var mapindex = i+"-"+j;
      getPic(mapindex+".html",mapindex)
    }
  }

}

function getmapsHtmlD(index,mapname){
  setTimeout(function(){
    getmapsHtmlDD(index,mapname)
  },index*2000)
}


function getmapsHtmlDD(index,mapname){
  var option = {
    host: 'wikiwiki.jp',
    port: 443,
    method: 'GET',
    agent:agent,
    headers:{
      'User-Agent':'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/63.0.3239.132 Safari/537.36'
    },
    path: '/kancolle/'+encodeURIComponent(mapname)
  };
  var req = https.request(option, function(res) {
    res.setEncoding('utf8');
    var resdata = '';
    res.on('data', function (chunk) {
      resdata = resdata + chunk;
    });
    res.on('end', function () {
      var ra = resdata.split('<h2 id="');
      for(var i=2;i<ra.length-1;i++){
        var rd = ra[i];
        var n1 = rd.indexOf('>');
        var n2 = rd.indexOf('<');
        var da = rd.split('<div class="ie5"');
        var imn = rd.indexOf('<img src="/kancolle/?plugin');
        var is = rd.substring(imn+10);
        var isn = is.indexOf('"');
        var isu = is.substring(0,isn);
        var mapindex = index+'-'+(i-1);
        var imgsrc = "https://wikiwiki.jp"+isu.replace(/&amp;/g,'&');
        var localsrc = 'http://localhost:10086/kancolle/image/'+mapindex;

        //saveImage(imgsrc,'public/kancolle/image/'+mapindex+'',i*1000);
        var name = rd.substring(n1+1,n2).trim();
        console.log(name+"\n\n");
        for(var k=1;k<da.length-1;k++){
          var dk = da[k];
          var dn = dk.indexOf('</div>');
          var ds = '<div class="ie5"'+dk.substring(0,dn);
          var sn1 = ds.indexOf('<table');
          var sn2 = ds.indexOf('</table>');
          ds = ds.substring(sn1,sn2+8);
          if(k==2){
            var h = '<img style="width:580px" src="'+localsrc+'"></img>';
            h=h+ds;
            var fh = head+'<div style="float:left">'+h+'</div>'+tail;

            var path = 'public/kancolle/'+mapindex+'.html';
            fs.writeFileSync(path,fh);

          }else if(k==2){

          }

        }

        //console.log(rd.substring(0,800));
      }
    });
  })
  req.on('error', function(err) {
    console.log('req err:');
    console.log(err);
  });
  req.end();
}


let getPic = async ( path,mapname ,callback) => {
  //url路径
  let url        = 'http://localhost:10086/kancolle/'+path;
  console.log(url);
  //创建一个实例
  const instance = await phantom.create();
  //创建一个页面
  const page     = await instance.createPage();
  //设置页面参数
  await page.property( 'viewportSize' , { width : 1800 , height : 1600 } );

  //打开url，返回状态（url有转码，解决中文问题）
  const status = await page.open( url);
  if(status=='success'){
    const bb = await page.evaluate(function () {
      return document.getElementsByTagName('div')[0].getBoundingClientRect();
    });
    // page.clipRect = { top: 0, left: 0, width: 1024, height: 768 };
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
    var filename = "public/kancolle/"+mapname+".png";
    //filename="1.png";
    console.log(filename);
    await page.render(filename);
    //销毁实例

  }
};


let lateTime = ( time ) =>{
  return new Promise( function(resolve,reject){
    setTimeout(function(){
      resolve();
    }, time );
  } );
}



let saveImage = function(url,filename,delay){
  setTimeout(function(){
    var req = request({
      url: url,
      proxy:'http://192.168.17.62:3128',
      method: "GET"
    }, function(error, response, body){
      if(error&&error.code){
        console.log('pipe error catched!')
        console.log(error);
      }
    }).pipe(fs.createWriteStream(filename));
    req.on('close',function(){
      console.log(filename);
    });
  },delay);
}






module.exports={
  getmapsHtml,
  replyKancolleRoute
}