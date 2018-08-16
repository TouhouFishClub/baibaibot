var FormData = require('form-data');
var https = require('https');
var fs = require('fs');
function poemReply(){
  var form = new FormData();

  var boundary = 62134128000000 + new Date().getTime();

  console.log(options)
  form.append("image",fs.createReadStream("avatar.jpg"))
  form.append("userid","GDVYSCE0OUslNCpJeLFVTstIbU0es91IJDE-NFs1K01PAB");
  form.append("text","");
  form.append("guid",generateUID());
  var fm = form._streams[3];
  var fma = fm.split("\n");
  var bd = fma[0].trim();

  var options = {
    host: 'poem.msxiaobing.com',
    port: 443,
    path: '/api/upload',
    method: 'POST',
    headers: {
      "Referer": "https://poem.msxiaobing.com/",
      "User-Agent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.181 Safari/537.36",
      "Content-Type": "multipart/form-data; boundary="+bd
    }
  };


  console.log(options)
  var request = https.request(options
    ,function(res) {
      var str = '';
      res.on('data', function (buffer) {
          str += buffer;
      });
      res.on('end', () => {
        console.log('11111111')
        console.log(str);
      });
    }
  );
  form.pipe(request);


}

module.exports={
  poemReply
}

function generateUID(){
  return generateRandom(8)+"-"+generateRandom(4)+"-"+generateRandom(4)+"-"+generateRandom(4)+"-"+generateRandom(12);
}

function generateRandom(num){
  var sm = Math.pow(16,num-1);
  var rm = Math.pow(16,num)-sm
  return Math.floor(sm+Math.random()*rm).toString(16)
}







