var request = require('request');
var fs = require('fs');

function fetchfache(url){
  if(!url){
    url = 'http://fche8.top/mwjxhxl/';
  }
  request({
    headers:{
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.75 Safari/537.36',
    },
    url: url,
  }, function(error, response, body) {
    if (error && error.code) {
      console.log('pipe error catched!')
      console.log(error);
    } else {
      var s1=body;
      var n = s1.indexOf('src="http://img.fche8.ml');
      var list = [];
      while(n>0){
        var s2 = s1.substring(n);
        var n1 = s2.indexOf('"');
        var s3 = s2.substring(n1+1);
        var n2 = s3.indexOf('"');
        var imgsrc = s3.substring(0,n2);
        s1=s3.substring(n2+1);
        n = s1.indexOf('src="http://img.fche8.ml');
        list.push(imgsrc);
      }
      for(var i=0;i<list.length;i++){
        var imgurl = list[i];
        var n = list[i].lastIndexOf("/");
        var filename = imgurl.substring(n+1);
        var imgreq = request({
          url: imgurl,
          method: "GET"
        }, function(error, response, body){
          if(error&&error.code){
            console.log('pipe error catched!')
            console.log(error);
          }
        }).pipe(fs.createWriteStream("fache/"+filename));
        imgreq.on('close',function(){

        });
      }
    }
  });
}

function fachelist(page){
  if(!page){
    page=1;
  }
  console.log("now page:"+page);
  setTimeout(function(){
    fachelist(page+1)
  },60000)
  var url = "http://fche8.top/car/page/"+page+"/";

  request({
    headers:{
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.75 Safari/537.36',
    },
    url: url,
  }, function(error, response, body) {
    if (error && error.code) {
      console.log('pipe error catched!')
      console.log(error);
    } else {
      var n0 = body.indexOf('<div class="update_area_content">');
      var s1= body.substring(n0+1);
      var n = s1.indexOf('<a href="http://fche8.top');
      var list = [];
      while(n>0){
        var s2 = s1.substring(n);
        var n1 = s2.indexOf('"');
        var s3 = s2.substring(n1+1);
        var n2 = s3.indexOf('"');
        var usrc = s3.substring(0,n2);
        s1=s3.substring(n2+1);
        n = s1.indexOf('<a href="http://fche8.top');
        if(usrc.split('/').length==5){
          list.push(usrc);
        }

      }
      console.log(list);
      for(var i=0;i<list.length;i++){
        fetchfache(list[i]);
      }
    }
  });

}


module.exports={
  fetchfache,
  fachelist
}