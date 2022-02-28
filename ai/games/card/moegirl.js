var http = require('http');
var https = require('https');
var request = require('request');
var fs = require('fs');

function fetchMoeGirlRandom(){
    var url = 'https://zh.moegirl.org.cn/Special:%E9%9A%8F%E6%9C%BA%E9%A1%B5%E9%9D%A2';
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
            var n1 = body.indexOf('<table ');
            var s1 = body.substring(n1);
            //console.log(s1.substring(0,1000));
            var n2 = s1.indexOf('</table>');
            var tb = s1.substring(0,n2);
            //console.log(tb);
            var di = getImgandWd(tb);
            var wd = di.t;
            var img = di.img;
            generateImageByWords(img,wd,function(){},'aaa');

        }
    });

}


function generateImageByWords(img,wd,callback,words){
    if(img&&wd){
        var wa = wd.split('\n');
        var maxwd = 0;
        var uwd = 23;
        var uw = "";
        for(var i=0;i<wa.length;i++){
            var lw = wa[i];
            var ud = "";
            while(lw.length>uwd){
                ud = ud + lw.substring(0,uwd)+"\n";
                lw = lw.substring(uwd);
            }
            if(lw.length>0){
                uw = uw + ud +lw+"\n";
            }else{
                uw = uw + ud;
            }
        }
        var ua = uw.split('\n');
        for(var i=0;i<ua.length;i++){
            if(ua[i].length>maxwd){
                maxwd = ua[i].length;
            }
        }
        var len = ua.length;
        var imgname = new Date().getTime()+"";
        var folder = 'static/';
        console.log(uw);
        try{
            img = img.replace('','img.tdgujian.com');
            var imgreq = request({
                url: img,
                method: "GET"
            }, function(error, response, body){
                if(error&&error.code){
                    console.log('pipe error catched!')
                    console.log(error);
                }
            }).pipe(fs.createWriteStream(folder + imgname));
            imgreq.on('error',function(err){
                console.log(err);
                console.log(img);
                callback("");
            })
            imgreq.on('close',function(){
                var img0 = new imageMagick(folder + imgname);
                var img1 = new imageMagick("static/blank.png");
                console.log("len:"+maxwd+":"+len);
                img1.resize(maxwd*19+29, len*21+29,'!') //加('!')强行把图片缩放成对应尺寸150*150！
                    .autoOrient()
                    .fontSize(20)
                    .fill('blue')
                    .font('./static/dfgw.ttf')
                    .drawText(0,0,uw,'NorthWest')
                    .write(folder+imgname+"_blank.jpg", function(err){
                        img0.size(function(err,imgsize){
                            console.log(imgsize);
                            sendGmImage(img0.append(folder+imgname+"_blank.jpg",true),words,callback);
                        });
                    });
            });
        }catch(e){
            console.log('pipe error');
            console.log(e);
            callback();
        }

    }else{

    }
}












function getImgandWd(resdata){
    var s = resdata;
    var line=0;
    var imgsrc;
    var tdata="";
    while(true){
        var n3 = s.indexOf('<tr');
        var n4 = s.indexOf('</tr>');
        var row = s.substring(n3,n4);
        if(line<2){
            var n5 = row.indexOf('https://img.moegirl.org');
            if(n5>0){
                var s51 = row.substring(n5);
                var n6 = s51.indexOf('"');
                imgsrc = s51.substring(0,n6);
            }
        }
        s=s.substring(n4+5);
        tdata=tdata+getinner(row).trim()+"\n";
        if(n3<0){
            break;
        }else{
            line++;
        }
    }
    return {img:imgsrc,t:tdata};
}
function getinner(s){
    var isinner=0;
    var rn = 0;
    var ret = "";
    for(var i=0;i<s.length;i++){
        if(isinner==0&&s[i]==">"){
            isinner=1;
            ret = ret + " "
        }else if(isinner==1&&s[i]=="<"){
            isinner=0;
        }else if(isinner){
            if(s[i]==" "||s[i]=="\n"){
                if(rn==0){
                    //ret=ret+s[i];
                }
                rn=1;
            }else{
                ret=ret+s[i];
                rn=0;
            }
        }
    }

    return ret;
}

module.exports={
    fetchMoeGirlRandom
}