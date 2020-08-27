var request = require('request');
var fs = require('fs');

function catreply(content,qq,callback){
    var url = 'https://api.thecatapi.com/v1/images/search?mime_types=jpg';
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
            var data = eval('('+body+')');
            var caturl = data[0].url;
            var now = new Date().getTime();
            var suffix;
            if(caturl.endsWith(".jpg")){
                suffix=".jpg";
            }else if(caturl.endsWith(".png")){
                suffix=".png";
            }else if(caturl.endsWith(".gif")){
                suffix=".gif";
            }else{
                suffix="";
            }
            var filename = "../coolq-data/cq/data/image/send/cat/"+now+suffix;
            var imgreq = request({
                url: caturl,
                method: "GET"
            }, function(error, response, body){
                if(error&&error.code){
                    console.log('pipe error catched!')
                    console.log(error);
                }
            }).pipe(fs.createWriteStream(filename));
            imgreq.on('close',function(){
                callback('[CQ:image,file=send/cat/'+now+suffix+']');
            });
        }
    });
}

module.exports={
    catreply
}