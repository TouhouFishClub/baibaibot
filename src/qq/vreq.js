var http = require('http');

function getGroupMask(cookie,vfwebqq,hash){
  var options = {
    host: 's.web2.qq.com',
    port: 80,
    path: '/api/get_group_name_list_mask2',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie':cookie,
      'Host':'s.web2.qq.com',
      'Origin':'http://s.web2.qq.com',
      'Referer':'http://s.web2.qq.com/proxy.html?v=20130916001&callback=1&id=1',
      'User-Agent':'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/63.0.3239.132 Safari/537.36'
    }
  };
  var body = {"vfwebqq":vfwebqq,"hash":hash};
  console.log(options);
  console.log(body);

  return new Promise((resolve, reject) => {
    var req = http.request(options, function(res) {
      res.setEncoding('utf8');
      var resdata = '';
      res.on('data', function (chunk) {
        resdata = resdata + chunk;
      });
      res.on('end', function () {
        console.log(resdata);
        resolve(resdata);
      });
    });
    req.write('r='+encodeURIComponent(body));
    req.end();
  });
}

module.exports={
  getGroupMask
}