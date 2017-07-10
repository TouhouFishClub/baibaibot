var http=require('http');
const { QQ, MsgHandler } = require('./qqlib');

const buddyHandler = new MsgHandler(
    (msg, qq) => {
        qq.sendBuddyMsg(msg.id, `Hello ${msg.name}`);
    },
    'buddy'
);

const groupHandler = new MsgHandler(
  (msg,qq) => {
        var groupid = msg.groupId;
        var content = msg.content;
        var name = msg.name;
        if(content.startsWith("`")){
          var callback = function(res){
            qq.sendGroupMsg(groupid,res);
          }
          var c1 = content.substring(1);
          if(c1.startsWith("`")){
            tulingMsg(name,c1.substring(1),callback);
          }else if(c1.startsWith("1")){

          }

        }

    }, 'group'
);

new QQ(buddyHandler, groupHandler).run();

const tulingApiKey = "9cca8707060f4432800730b2ddfb029b";
function tulingMsg(userid,content,callback){
  var body={};
  body.key=tulingApiKey;
  body.info=content;
  body.userid=userid;
  var options = {
    hostname: 'www.tuling123.com',
    port: 80,
    path: '/openapi/api',
    method: 'POST',
  };
  var req = http.request(options, function (res) {
    res.setEncoding('utf8');
    var resdata = '';
    res.on('data', function (chunk) {
      resdata = resdata + chunk;
    });

    res.on('end', function () {
      var ret = handleTulingResponse(resdata);
      callback(ret);
    });
  });
  req.write(JSON.stringify(body));
  req.end();
}

function handleTulingResponse(resdata){
  var data = eval("("+resdata+")");
  var code = data.code;
  var ret = '';
  if(code == 100000){
    ret = data.text;
  }else if(code == 200000){
    ret = data.text+""+data.url;
  }else{
    ret = '出错了喵';
  }
  return ret;
}

