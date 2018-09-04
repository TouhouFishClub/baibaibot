var https=require('https');
var http = require('http');
var fs = require('fs');

var head = '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">';
head = head + '<html xmlns="http://www.w3.org/1999/xhtml">';
head = head + '<head>';
head = head + '<link href="http://cha.17173.com/ff14/css/style.css?version=201512291400" rel="stylesheet" type="text/css" />';
head = head + '</head>';
head = head + '<body>';
head = head + '<div class="container">';
head = head + '<div class="wrap">';
head = head + '<div class="table prop lazyloadimg">';

var tail = '</div></div></div></body></html>';


function searchFF14Item(content,UserName,callback){
  content = "木";
  var options = {
    host: 'cha.17173.com',
    port: 80,
    path: '/ff14/item?q='+encodeURIComponent(content),
    method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.75 Safari/537.36'
    },
  };

  var req = http.request(options, function(res) {
    res.setEncoding('utf8');
    var resdata = '';
    res.on('data', function (chunk) {
      resdata = resdata + chunk;
    });
    res.on('end', function () {
      //console.log(resdata);

      var n1 = resdata.indexOf('<tr class="th">');
      var s1 = resdata.substring(n1);
      var hs = ''
      for(var i=0;i<6;i++){
        var n2 = s1.indexOf('<tr >');
        console.log('n2:'+n2);
        if(n2>0){
          var sd = s1.substring(0,n2+5);
          console.log(sd)
          console.log('\n'+i+'111111111\n')
          hs = hs + sd;
          s1= s1.substring(n2+5);
          var da = sd.split('</td>');
        }else{
          var n3 = s1.indexOf('</table>');
          var sd = s1.substring(0,n3);
          console.log(sd);
          hs= hs + sd + '';
          break;
        }
      }

      if(hs.endsWith('<tr')){
        hs=hs.substring(0,hs.length-3);
      }
      hs=hs.replace(/href="\//g,'href="http:\/\/cha.17173.com\/');
      hs=hs.replace(/src="\//g,'src="http:\/\/cha.17173.com\/');
      var uhs = head+'<table>'+hs+'</table>'+tail

      fs.writeFileSync('3.html',uhs);
    });
  });
  req.on('error', function(err) {
    console.log('req err:');
    console.log(err);
  });
  req.end();
}

function itemDetail(content,userName,callback){
  content = "af04edbaf84";
  var options = {
    host: 'cha.17173.com',
    port: 80,
    path: '/ff14/item/'+content,
    method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.75 Safari/537.36'
    },
  };

  var req = http.request(options, function(res) {
    res.setEncoding('utf8');
    var resdata = '';
    res.on('data', function (chunk) {
      resdata = resdata + chunk;
    });
    res.on('end', function () {
      //console.log(resdata);

      var n1 = resdata.indexOf('<tr class="th">');
      var s1 = resdata.substring(n1);
      var hs = ''
      for(var i=0;i<6;i++){
        var n2 = s1.indexOf('<tr >');
        console.log('n2:'+n2);
        if(n2>0){
          var sd = s1.substring(0,n2+5);
          console.log(sd)
          console.log('\n'+i+'111111111\n')
          hs = hs + sd;
          s1= s1.substring(n2+5);
          var da = sd.split('</td>');
        }else{
          var n3 = s1.indexOf('</table>');
          var sd = s1.substring(0,n3);
          console.log(sd);
          hs= hs + sd + '';
          break;
        }
      }

      if(hs.endsWith('<tr')){
        hs=hs.substring(0,hs.length-3);
      }
      hs=hs.replace(/href="\//g,'href="http:\/\/cha.17173.com\/');
      hs=hs.replace(/src="\//g,'src="http:\/\/cha.17173.com\/');
      var uhs = head+'<table>'+hs+'</table>'+tail

      fs.writeFileSync('3.html',uhs);
    });
  });
  req.on('error', function(err) {
    console.log('req err:');
    console.log(err);
  });
  req.end();
}




function find(str,cha,num){
  var x=str.indexOf(cha);
  for(var i=0;i<num;i++){
    x=str.indexOf(cha,x+1);
  }
  return x;
}

module.exports={
  searchFF14Item
}