var request=require('request');
const phantom = require('phantom');
const {baiduocr} = require('../image/baiduocr');
var fs = require('fs');
function ff14item(){
  // getPic('','https://ff14.huijiwiki.com/wiki/物品:瓦拉其耳坠',function(r){console.log(r)});
  var itemname = '草布内裤';
  var url = 'https://ff14.huijiwiki.com/wiki/'+encodeURIComponent('物品:'+itemname);
  request({
    url: url,
    method: "GET"
  }, function(error, response, body){
    if(error&&error.code){
      console.log('pipe error catched!')
      console.log(error);
    }else{
      var n1 = body.indexOf('<section id="bodyContent" class="body">  ');
      var s1 = body.substring(n1);

      var n2 = s1.indexOf('</section>');
      var s2 = s1.substring(0,n2);
      var s3 = getinner(s1);
      var n3 = s3.lastIndexOf('其他站点链接');
      var s4 = s3.substring(0,n3);
      var n4 = s4.indexOf(itemname)
      var s5 = s4.substring(n4+5);
      var n5 = s5.indexOf(itemname);
      var s6 = s5.substring(n5);
      fs.writeFileSync("1.txt",s6);
    }
  })
}

function getinner(s1){
  var ret = '';
  var isinner=0;
  for(var i=0;i<s1.length;i++){
    if(isinner==0&&s1[i]==">"){
      isinner=1;
    }else if(isinner==1&&s1[i]=="<"){
      isinner=0;
      ret = ret.trim() + "\n";
    }else if(isinner){
      ret=ret+s1[i];
    }
  }
  ret = ret.trim();
  ret = ret.replace(/&nbsp;/g,'').replace(/&quot;/g,'"').replace(/&gt;/g,'>').replace(/&lt;/g,'<');
  ret = ret.replace(/&#160;/g,'').replace(/&amp;/,'&');
  ret = ret.replace(/\[[0-9]\]/g,'');
  return ret;

}




let getPic = async ( path,url ,callback) => {
  //url路径
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
      return document.getElementsByClassName('ffiv-container')[0].getBoundingClientRect();
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
    await lateTime( 1000 );
    //输出页面到当前目录下
    var now = new Date();
    var filename = "../coolq-data/cq/data/image/send/ff14/"+itemid+".png";
    //filename="1.png";
    console.log(filename);
    await page.render(filename);
    //销毁实例
    await instance.exit();
    callback('[CQ:image,file=send/ff14/'+itemid+'.png]');
  }
};

module.exports={
  ff14item
}