const phantom = require('phantom');

let getPic = async ( name ) => {
  //url路径
  let url        = 'http://localhost:10086/fh/'+encodeURIComponent('1')+".html";
  //创建一个实例
  const instance = await phantom.create();
  //创建一个页面
  const page     = await instance.createPage();
  //设置页面参数
  await page.property( 'viewportSize' , { width : 1800 , height : 1600 } );

  //打开url，返回状态（url有转码，解决中文问题）
  const status = await page.open( url);

  const bb = await page.evaluate(function () {
    return document.getElementsByTagName('table')[0].getBoundingClientRect();
  });
  console.log(bb);

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
  await page.render("1.png");
  //销毁实例
  await instance.exit();
  //返回数据
};

let lateTime = ( time ) =>{
  return new Promise( function(resolve,reject){
    setTimeout(function(){
      resolve();
    }, time );
  } );
}
//暴露接口

const {getShip} = require('./ai/kancolle/ship');
getShip('吹雪')
//getPic();
