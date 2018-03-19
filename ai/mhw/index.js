var https = require('https');

function init(){
  var options = {
    hostname: 'www.mhchinese.wiki/',
    port: 80,
    path: '/monsters',
    method: 'GET'
  };
  var req = https.request(options, function (res) {
    var resdata = "";
    res.on('data', function (chunk) {
      resdata+=chunk;
    });
    res.on('end', function () {
      handleMHRes(resdata);
    });
    res.on('error',function(error){
      console.log(error);
    })
  });
  req.setTimeout(8000,function(){
    req.end();
  });
  req.end();
}

function handleMHRes(resdata){
  var n1 = resdata.indexOf('simple-table');
  var n2 = resdata.indexOf('</table>');
  var tb = resdata.substring(n1,n2);


}
