function handlelrs(content,qq,name,gid,port,callback){

}

var nowplaying=111;
var playercount=0;
var player = {};

function addplayer(qq,gid,name){
    playercount++;
    if(nowplaying==gid){
        if(!player[qq]){
            player[qq]={qq:qq,n:name,live:1,jingzhang:0,id:(playercount+1)}
        }
    }
}


var wolfs = {};
var yuyanjia = {};
var nvwu = {};
var lieren = {};
var shouwei = {};
var cunmin = {};

function init(){

    wolfs = {};
    yuyanjia = {};
    nvwu = {};
    lieren = {};
    shouwei = {};
    cunmin = {};

    var qs = Object.keys(player);
    if(qs.length<6){

    }else{
        var wolfcount = Math.floor(qs.length/3);
        while(wolfcount>0){
            var qqs = [];
            for(var i=0;i<qs.length;i++){
                if(qs.role==undefined){
                    qqs.push(qs[i]);
                }
            }
            var userqq = qqs[Math.floor(Math.random()*qqs.length)];
            var user = player[userqq];
            if(wolfs[user.qq]){

            }else{
                if(user.role==undefined){
                    wolfs[user.qq]=user;
                    player[user.qq].role="langren";
                    wolfcount--;
                }
            }
        }


        var yuyanjiacount = 1;
        while(yuyanjiacount>0){
            var qqs = [];
            for(var i=0;i<qs.length;i++){
                if(qs.role==undefined){
                    qqs.push(qs[i]);
                }
            }
            var userqq = qqs[Math.floor(Math.random()*qqs.length)];
            var user = player[userqq];
            console.log(user);
            if(yuyanjia[user.qq]){

            }else{
                if(user.role==undefined){
                    yuyanjia[user.qq]=user;
                    player[user.qq].role="yuyanjia";
                    yuyanjiacount--;
                }
            }
        }

        var nvwucount = 1;
        while(nvwucount>0){
            var qqs = [];
            for(var i=0;i<qs.length;i++){
                if(qs.role==undefined){
                    qqs.push(qs[i]);
                }
            }
            var userqq = qqs[Math.floor(Math.random()*qqs.length)];
            var user = player[userqq];
            console.log(user);
            if(nvwu[user.qq]){

            }else{
                if(user.role==undefined){
                    nvwu[user.qq]=user;
                    player[user.qq].role="nvwu";
                    nvwucount--;
                }
            }
        }

        var lierencount = 1;
        while(lierencount>0){
            var qqs = [];
            for(var i=0;i<qs.length;i++){
                if(qs.role==undefined){
                    qqs.push(qs[i]);
                }
            }
            var userqq = qqs[Math.floor(Math.random()*qqs.length)];
            var user = player[userqq];
            console.log(user);
            if(lieren[user.qq]){

            }else{
                if(user.role==undefined){
                    lieren[user.qq]=user;
                    player[user.qq].role="lieren";
                    lierencount--;
                }
            }
        }


        var shouweicount = 1;
        while(shouweicount>0){
            var qqs = [];
            for(var i=0;i<qs.length;i++){
                if(qs.role==undefined){
                    qqs.push(qs[i]);
                }
            }
            var userqq = qqs[Math.floor(Math.random()*qqs.length)];
            var user = player[userqq];
            console.log(user);
            if(shouwei[user.qq]){

            }else{
                if(user.role==undefined){
                    shouwei[user.qq]=user;
                    player[user.qq].role="shouwei";
                    shouweicount--;
                }
            }
        }



    }
    console.log(wolfs);
    console.log(yuyanjia);
    console.log(nvwu);
    console.log(lieren);
    console.log(shouwei);
    console.log(cunmin);
}


var sha={};
var killedqq;

function turn(){
    setTimeout(function(){
        var target = {};
        for(var p in sha){
            if(target[sha[p]]){
                target[sha[p]]++
            }else{
                target[sha[p]]=1;
            }
        }
        var targets = Object.keys(target);
        if(targets.length==0){
            killedqq=0;
        }else if(targets.length==1){
            killedqq=targets[0];
        }else{
            targets.sort(function(a,b){return b-a})
            if(targets[0]>targets[1]){
                killedqq = targets[0];
            }else{
                killedqq = 0;
            }
        }
        console.log(sha)
        console.log(targets);
        console.log(killedqq);
    },1000)
}

function langrensha(qq,targetqq){
    console.log(qq,player[qq].role,player[qq].role=='langren');
    if(player[qq].role=='langren'){
        if(sha[qq]){

        }else{

        }
        sha[qq]=targetqq;
    }
}




module.exports={
    addplayer,
    init,
    nowplaying,
    langrensha,
    turn
}