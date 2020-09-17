var gm = require('gm')
var imageMagick = gm.subClass({ imageMagick : true });
var {sendGmImage} = require('../../../cq/sendImage');


var map=[];
var img=[];



function init(){
    for(var i=1;i<=52;i++){
        var color = i%4
        var d={id:i,color:color,d:0,next:{all:((i+1)%52)}};
        d.jump={}
        d.jump[color]=(i+4)%52;
        if(i==48){
            d.jump[color]=52;
        }
        if(i%13==4){
            d.jump[color]=(i+12)%52;
        }
        if(i%13==11){
            delete(d.jump[color])
            d.next[color]=53+((color+3)%4)*6;
        }
        map[i]=d;
    }
    for(var i=0;i<=3;i++){
        for(var j=0;j<6;j++){
            var id = 53+i*6+j;
            var d = {id:id,color:(i+1)%4,d:0,next:{all:id+1}}
            if(j==5){
                d.next={all:0};
                d.end=1;
            }
            map[id]=d
        }
    }
    map[1000]={id:1000,color:0,d:0,next:{all:27}}
    map[1001]={id:1001,color:1,d:0,next:{all:40}}
    map[1002]={id:1002,color:2,d:0,next:{all:1}}
    map[1003]={id:1003,color:3,d:0,next:{all:14}}


    for(var i=0;i<15;i++){
        img[i]=[];
        for(var j=0;j<15;j++){
            img[i][j]=0;
        }
    }

    for(var i=0;i<=3;i++){
        img[4][i]=i+1;
        img[i][4]=8-i;
        img[i][10]=i+14;
        img[4][i+11]=i+18;
        img[10][14-i]=i+27;
        img[i+11][10]=i+31;
        img[14-i][4]=i+40;
        img[10][3-i]=i+44;
    }


    for(var i=4;i<=10;i++){
        img[0][i]=i+4;
        img[i][14]=i+17
        img[14][14-i]=i+30
        img[14-i][0]=i+43
    }
    img[4][0]=1;

    for(var i=0;i<6;i++){
        img[13-i][7]=i+53;
        img[7][i+1]=i+59;
        img[i+1][7]=i+65;
        img[7][13-i]=i+71;
    }
    img[11][14]=1000;
    img[14][3]=1001;
    img[3][0]=1002;
    img[0][11]=1003;

    console.log(map);
    printimg()
}


function printimg(){
    var r = "";
    for(var i=0;i<img.length;i++){
        var s="";
        for(var j=0;j<img[i].length;j++){
            s=s+"\t"+img[i][j]
        }
        r=r+s.trim()+"\n"
    }
    console.log(r)
}



var playing = 0;
var users = {};
function handleFlyindReply(content,qq,gid,callback){
    if(content=="飞行棋"){
        var ret = "飞行棋将于1分钟后开始\n";
        ret = ret + "加入游戏：【flya】\n";
        ret = ret + "移动x号机：【fly】+x\n";
        ret = ret + "出击：【fly9】"
        users={};
        playing=gid;
        setTimeout(function(){
            willstart(callback);
        },20000)
        callback(ret.trim());
    }
    if(content=="flya"){
        var len = Object.keys(users).length;
        if(len>=4){
            callback("人数已满，无法加入游戏");
        }else{
            callback('[CQ:at,qq='+qq+']加入了游戏,颜色为:'+len);
            users[qq]={qq:qq,gid:gid,color:len,out:0,prepare:0,pos:{1:0,2:0,3:0,4:0}};
        }
    }
    if(content.startsWith("fly")&&content.length==4){
        var num = parseInt(content.substring(3));
        console.log('num:'+num)
        if(num>=1&&num<=4){
            select(qq,num,callback)
        }else if(num==9){
            select(qq,num,callback)
        }else{

        }
    }
}

var nowcolor = 0;
var lastrd = 0;
var nowtimer;
var count =0;
function willstart(callback){
    var len = Object.keys(users).length;
    if(len>=2&&len<=4){
        map=[];
        img=[];
        nowcolor=0;
        init();
        nextgo(callback);
    }else{
        callback("飞行棋人数不足，游戏结束")
    }
}

function nextgo(callback){
    count++;
    if(count>100){
        callback('游戏回合数超过100，强制结束');
        return;
    }
    clearTimeout(nowtimer);
    var len = Object.keys(users).length;
    nowcolor = (nowcolor+1)%len;
    var rd = 1+Math.floor(Math.random()*6);
    lastrd = rd;
    var ret = nowcolor+"色掷了"+rd+"点,输入【fly】+X选择移动X号机\n";
    if(rd==6){
        ret = ret + "输入【fly9】出动新机\n"
    }
    generateImage(callback,ret);
    var thencolor = nowcolor;
    nowtimer = setTimeout(function(){
        usertimeout(thencolor,callback)
    },20000);
}

function select(qq,num,callback){
    var user=users[qq];
    var color = user.color;
    var ret = '';
    if(color==nowcolor){
        if(num==9){
            if(lastrd==6){
                if(user.out<4){
                    user.out=user.out+1;
                    user.pos[user.out]=1000+color;
                    map[1000+color].d={color:color,num:user.out};
                }else{
                    ret = '你的机库已经没有飞机了';
                    callback(ret);
                }
            }else{
                ret = '你上次骰子为'+lastrd+',无法出动';
                callback(ret);
            }
        }else{
            if(num>=1&&num<=4){
                var pos = user.pos[num];
                var lastpos = pos;
                for(var i=0;i<lastrd;i++){
                    posObj = map[pos].next;
                    if(posObj[color]){
                        pos = posObj[color];
                    }else{
                        pos = posObj.all;
                    }
                }
                var finalpos = map[pos].jump[color]?map[pos].jump[color]:pos;
                var fp = map[finalpos];
                if(fp.d){
                    //kick
                }
                fp.d={color:color,num:num};
                map[lastpos].d=0;


            }else{

            }
        }
        nextgo(callback);
    }else{

    }
}


function usertimeout(color,callback){
    callback(color+'色玩家超时');
    nextgo(callback);
}


function generateImage(callback,wd){
    var img1 = new imageMagick("static/blank.png");
    img1.resize(1000, 1000,'!')
        .autoOrient()
        .fontSize(18)
        .fill('blue')
        .font('./static/dfgw.ttf');
    for(var i=0;i<img.length;i++){
        for(var j=0;j<img.length;j++){
            var d = img[i][j];
            if(d!=0){
                var obj = map[d];
                var mapcolor = obj.color;
                if(obj.d){
                    var color = obj.d.color;
                    var num = obj.d.num;
                    img1.drawText(20+j*65,20+i*65,mapcolor+"_"+color+"_"+num,'NorthWest');
                }else{
                    img1.drawText(20+j*65,20+i*65,mapcolor,'NorthWest');
                }
            }
        }
    }
    //img1.write("1.png",function(err){})
    sendGmImage(img1,wd,callback,1);
}



module.exports={
    handleFlyindReply
}

