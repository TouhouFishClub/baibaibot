var gm = require('gm')
var request = require("request");
var fs = require("fs");
var imageMagick = gm.subClass({ imageMagick : true });
var {sendGmImage} = require('../../../cq/sendImage');
const {banUserInGroup} = require('../../../cq/cache');

var players={};
var running = true;



var order = [];
function addplayer(qq,username,groupid,callback){
  if(running==true&&players[qq]==undefined){
    var now = new Date();
    var code = Object.keys(players).length;
    if(code<13){
      var obj = {qq:qq,name:username,code:code,ts:now,a:[]};
      players[qq]=obj;
      callback("【"+username+"】加入了游戏");
    }else{
      callback("【"+username+"】加入游戏失败，被扔到了吃瓜群众席位")
    }
  }
}

var maplen = 4;
var gun=[];
var gunstr = "";
var death=0;
function init(callback) {
  var route = [];
  var map = [];
  for (var i = 0; i < maplen; i++) {
    map[i] = [];
    for (var j = 0; j < maplen; j++) {
      map[i][j] = 0;
    }
  }
  var keys = Object.keys(players);
  for(var i=0;i<Math.min(keys.length,14);i++){
    var insert = 0;
    order.push(players[keys[i]]);
    while(insert==0){
      var rd = Math.floor(Math.random()*maplen*maplen);
      var hd = Math.floor(rd/maplen);
      var wd = rd%maplen;
      if(map[hd][wd]==0){
        map[hd][wd]=players[keys[i]];
        insert = 1;
      }
    }
  }
  var max = maplen*maplen*3/4;
  var guncount=0;
  for(var i=0;i<maplen*maplen;i++){
    if(Math.random()<max/(maplen*maplen)){
      gun.push(1);
      guncount++;
      max--;
      gunstr=gunstr+"1";
    }else{
      gun.push(0);
      gunstr=gunstr+"0";
    }
  }
  route.push(map);
  order.sort(function(a,b){return Math.random()-0.5});
  //generateImage();
  while(death==0){
    next1(route);
  }
  var strl = {};
  for(var p in players){
    var qq=p;
    var str = "";
    for(var k=0;k<route.length;k++){
      var live = false;
      for(var i=0;i<maplen;i++){
        for(var j=0;j<maplen;j++){
          var d = route[k][i][j];
          if(d){
            if(d.qq==qq){
              live = true;
              if(k==0){
                str = "您的起点在【"+i+","+j+"】,";
              }else{
                str = str + ""+k+"时你在【"+i+","+j+"】,";
                if(d.kill){
                  str=str + "你撞死了"+d.kill+","
                }
                var rd = Math.floor(Math.random()*4);
                if(rd==0&&i!=0){
                  var t=route[k][i-1][j];
                  if(t){
                    str = str + "你往上边看到了"+t.qq+",";
                  }else{
                    str = str + "你往上边看了看,什么也没看到"+",";
                  }
                }

                if(rd==1&&i!=maplen-1){
                  var t=route[k][i+1][j];
                  if(t){
                    str = str + "你往下边看到了"+t.qq+","
                  }else{
                    str = str + "你往下边看了看,什么也没看到"+","
                  }
                }

                if(rd==2&&j!=0){
                  var t=route[k][i][j-1];
                  if(t){
                    str = str + "你往左边看到了"+t.qq+","
                  }else{
                    str = str + "你往左边看了看,什么也没看到"+","
                  }
                }

                if(rd==0&&j!=maplen-1){
                  var t=route[k][i][j+1];
                  if(t){
                    str = str + "你往上边看到了"+t.qq+","
                  }else{
                    str = str + "你往上边看了看,什么也没看到"+","
                  }
                }

              }
              var dirlist = ["上","下","左","右"]
              if(d.a){
                if(d.a[0]){
                  str = str + "之后"+dirlist[d.a[0]]+"移" ;
                }
              }
              str = str + "\n";
            }
          }
        }
      }
      if(live==false){
        str = str + ""+k+"时你死了";
      }
    }
    str=str.trim();

    strl[qq]=str;
  }
  console.log(strl);

  print(route);



}

function next1(route) {
  var next = order.shift();
  order.push(next);

  var qq = next.qq;
  var name = next.name;
  var map=route[route.length-1];
  var nmap = [];
  var rd;
  if(death==0){
    rd = Math.floor(Math.random() * 4);
  }else{
    rd = Math.floor(Math.random() * 4);
  }
  var fail = false;
  for (var i = 0; i < maplen; i++) {
    nmap[i] = [];
    for (var j = 0; j < maplen; j++) {
      if(map[i][j]==0){
        nmap[i][j]=0;
      }else{
        nmap[i][j] = {qq:map[i][j].qq,name:map[i][j].name,a:[]};
      }
    }
  }
  var over = false;
  for (var i = 0; i < maplen; i++) {
    if(over==true){
      break;
    }
    for (var j = 0; j < maplen; j++) {
      if(over==true){
        break;
      }
      if (nmap[i][j]) {
        if (nmap[i][j].qq == qq) {
          over=true;

          if ((i == 0 && rd == 0) || (i == maplen-1 && rd == 1) || (j == 0 && rd == 2) || (j == maplen-1 && rd == 3)) {
            fail = true;
            break;
          } else {
            if (rd == 0) {
              target = nmap[i - 1][j];
              if (target == 0||death==0) {
                var u = {qq: nmap[i][j].qq, name: nmap[i][j].name, a: []}
                if(target){
                  death={qq:target.qq,i:i-1,j:j,killer:qq};
                  u.kill=target.qq;
                }
                map[i][j].a.push(rd);
                nmap[i - 1][j] = u;
                nmap[i][j] = 0;
              }else{
                map[i][j].a.push(4);
                var u = {qq: nmap[i][j].qq, name: nmap[i][j].name, a: []}
                nmap[i][j] = u;
              }
            }

            if (rd == 1) {
              target = nmap[i +1][j];
              if (target == 0||death==0) {
                var u = {qq: nmap[i][j].qq, name: nmap[i][j].name, a: []}
                if(target){
                  death={qq:target.qq,i:i+1,j:j};
                  u.kill=target.qq;
                }
                map[i][j].a.push(rd);

                nmap[i + 1][j] = u;
                nmap[i][j] = 0;
              }else{
                map[i][j].a.push(4);
                var u = {qq: nmap[i][j].qq, name: nmap[i][j].name, a: []}
                nmap[i][j] = u;
              }
            }

            if (rd == 2) {
              target = nmap[i][j-1];
              if (target == 0||death==0) {
                var u = {qq: nmap[i][j].qq, name: nmap[i][j].name, a: []}
                if(target){
                  death={qq:target.qq,i:i,j:j-1};
                  u.kill=target.qq;
                }
                map[i][j].a.push(rd);

                nmap[i][j-1] = u;
                nmap[i][j] = 0;
              }else{
                map[i][j].a.push(4);
                var u = {qq: nmap[i][j].qq, name: nmap[i][j].name, a: []}
                nmap[i][j] = u;
              }
            }

            if (rd == 3) {
              target = nmap[i][j+1];
              if (target == 0||death==0) {
                var u = {qq: nmap[i][j].qq, name: nmap[i][j].name, a: []}
                if(target){
                  death={qq:target.qq,i:i,j:j+1};
                  u.kill=target.qq;
                }
                map[i][j].a.push(rd);

                nmap[i][j+1] = u;
                nmap[i][j] = 0;
              }else{
                map[i][j].a.push(4);
                var u = {qq: nmap[i][j].qq, name: nmap[i][j].name, a: []}
                nmap[i][j] = u;
              }
            }

            if (rd == 4) {
              map[i][j].a.push(rd);
              var u = {qq: nmap[i][j].qq, name: nmap[i][j].name, a: []}
              nmap[i][j] = u;
            }
          }
        }
      }
    }
    if (fail == true) {
      break;
    }
  }
  route.push(nmap);
}

function next2(){

}

function print(route){
  var str = "";
  for(var k=0;k<route.length;k++){
    var dd=route[k];
    for(var i=0;i<maplen;i++){
      for(var j=0;j<maplen;j++){
        if(dd[i][j]==0){
          str = str + "0\t";
        }else{
          str = str + dd[i][j].qq+":"+dd[i][j].a+"\t";
        }
      }
      str = str + "\n";
    }
    str = str + "\n";
  }
  console.log(str);
}

function generateImage(callback,utext){
  var img1 = new imageMagick("static/block.png");
  img1.autoOrient()
    .fontSize(25)
    .fill('blue')
    .font('./static/dfgw.ttf')

  for(var i=0;i<maplen;i++){
    for(var j=0;j<maplen;j++){
      if(map[i][j]!=0){
        var ele = map[i][j];
        var name = ele.name;
        var shortname = name.substring(0,4);
        img1.drawText(j*140+25,i*140+55,shortname,'NorthWest')
      }
    }
  }
  console.log(333)
  img1.write("222",function(err){
    console.log(22222);
  });
}

function test(){
  addplayer('q1','u1','g1',function(){});
  addplayer('q2','u2','g1',function(){});
  addplayer('q3','u3','g1',function(){});
  addplayer('q4','u4','g1',function(){});
  init()
}
test()
module.exports={
  test
}


































