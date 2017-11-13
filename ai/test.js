var options = {
  hostname: "192.168.17.52",
  port: 12450,
  path: "/api/calrank?server=8",
  headers: {
    'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.75 Safari/537.36'
  },
  method: 'GET'
};
http.request(options, function (res) {
  res.setEncoding('utf8');
  var resdata = '';
  res.on('data', function (chunk) {
    resdata = resdata + chunk;
  });
  res.on('end', function () {
    console.log(resdata);
  });
}).end();
