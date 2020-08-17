var request=require('request');
const phantom = require('phantom');
const {baiduocr} = require('../image/baiduocr');
var fs = require('fs');


function ff14MarketReply(content,qq,callback){
  if(parseInt(content)>1000){
    itemMarket(parseInt(content),callback);
  }else{
    searchID(content,callback);
  }
}

function searchID(str,callback){
  var url = 'https://cafemaker.wakingsands.com/search?indexes=item&string='+encodeURIComponent(str)+'&limit=20'
    request({
        url: url,
        method: "GET",
        headers:{
            'User-Agent':'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/67.0.3396.99 Safari/537.36',
            'referer':'https://universalis.app/',
            'Cookie':'__cfduid=d044f513cc4f89bcdf5f878ef8242396f1597646052; PHPSESSID=ct7bavo5162m76ighdia55d5hd; mogboard_leftnav=off; mogboard_homeworld=no; _ga=GA1.2.43986777.1597646056; _gid=GA1.2.606319622.1597646056; _gat_gtag_UA_147847104_1=1; mogboard_server=JingYuZhuangYuan; mogboard_language=chs; mogboard_timezone=Asia/Hong_Kong'
        }
    }, function(error, response, body) {
        if (error && error.code) {
            console.log('pipe error catched!')
            console.log(error);
        } else {
          var data = JSON.parse(body);
          var results = data.Results;
          if(results.length==1){
            var itemid = results[0].ID;
            itemMarket(itemid,callback);
          }else{
            var ret = "请选择：\n";
            for(var i=0;i<results.length;i++){
              ret = ret + "ffid "+results[i].ID+"\t:\t"+results[i].Name+"\n";
            }
            callback(ret.trim())
          }
        }
    });
}



function itemMarket(itemid,callback){
  if(!itemid){
    itemid=29495;
  }
  var url = 'https://universalis.app/market/'+itemid;
    request({
        url: url,
        method: "GET",
        headers:{
          'User-Agent':'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/67.0.3396.99 Safari/537.36',
            'referer':'https://universalis.app/',
            'Cookie':'__cfduid=d044f513cc4f89bcdf5f878ef8242396f1597646052; PHPSESSID=ct7bavo5162m76ighdia55d5hd; mogboard_leftnav=off; mogboard_homeworld=no; _ga=GA1.2.43986777.1597646056; _gid=GA1.2.606319622.1597646056; _gat_gtag_UA_147847104_1=1; mogboard_server=JingYuZhuangYuan; mogboard_language=chs; mogboard_timezone=Asia/Hong_Kong'
        }
    }, function(error, response, body){
        if(error&&error.code){
            console.log('pipe error catched!')
            console.log(error);
        }else{
          var m1 = body.indexOf('class="market_update_times"');
          var f1 = body.substring(m1+1);
          var m2 = f1.indexOf('<h4>');
          var updatelist = [];
          for(var i=0;i<10;i++){
            if(m2>100||m2==-1){
              break;
            }else{
              var f2 = f1.substring(m2+4);
              //console.log(f2.substring(0,200)+"\n\n111\n\n");
              var m3 = f2.indexOf('<');
              var server = f2.substring(0,m3);
              var f3 = f2.substring(m3+1);
              var m4 = f3.indexOf('<div>');
              var f4 = f3.substring(m4+5);
              var m5 = f4.indexOf('<');
              var updatetime = f4.substring(0,m5);
              f1 = f4.substring(m5+1);
              m2 = f1.indexOf('<h4>');
              updatelist.push({s:server,t:updatetime});
            }
          }

          var n1 = body.indexOf('<td class="price-num tac');
          var s1 = body.substring(n1+1);
          var ne = s1.indexOf('</table>');
          var s2 = s1.substring(0,ne);
          var s3 = s2;
          var n0 = s3.indexOf('</tr>');
          var pricelist = [];
          while(n0>0){
            var s4 = s3.substring(0,n0);
            var n5 = s4.indexOf('class="price-server"');
            var s5 = s4.substring(n5+1);
            var n6 = s5.indexOf('<strong>');
            var s6 = s5.substring(n6+1);
            var n7 = s6.indexOf('<');
            var server = s6.substring(7,n7);
            console.log(server);
            var s7 = s6.substring(n7+1);
            var n8 = s7.indexOf('class="price-current"');
            var s8 = s7.substring(n8+1);
            var n9 = s8.indexOf('data-sort-value="');
            var s9 = s8.substring(n9+17);
            var n10 = s9.indexOf('"');
            var price = s9.substring(0,n10);
            var s10 = s9.substring(n10+1);
            console.log(price);
            var n11 = s10.indexOf('class="price-qty"');
            var s11 = s10.substring(n11+1);
            var n12 = s11.indexOf('data-sort-value="');
            var s12 = s11.substring(n12+17);
            var n13 = s12.indexOf('"');
            var num = s12.substring(0,n13);
            var s13 = s12.substring(n13+1);
            console.log(num);
            var n14 = s13.indexOf('class="price-retainer">');
            var s14 = s13.substring(n14+23);
            var n15 = s14.indexOf('<');
            var name = s14.substring(0,n15).trim();
            console.log(name);
            pricelist.push({s:server,p:price,n:num,m:name});
            s3 = s3.substring(n0+1);
            n0 = s3.indexOf('</tr>')
          }
          var ret = '';
          for(var i=0;i<pricelist.length;i++){
            var pd = pricelist[i];
            ret = ret + pd.p+"*"+pd.n+" \t "+pd.s+" \t "+pd.m+"\n";
          }
          callback(ret.trim());
        }
    })
}


let getPic = async ( itemid ,callback) => {
    //url路径
    let url        = 'https://universalis.app/market/'+itemid;
    console.log(url);
    //创建一个实例
    const instance = await phantom.create();
    //创建一个页面
    const page     = await instance.createPage();
    //设置页面参数
    await page.property( 'viewportSize' , { width : 1200 , height : 2400 } );

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
    ff14MarketReply
}