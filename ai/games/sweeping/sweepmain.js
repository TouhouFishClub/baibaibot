var gm = require('gm')
var imageMagick = gm.subClass({ imageMagick : true });
var {sendGmImage} = require('../../../cq/sendImage');

var map=[];
var user={};
var queue = [];
var nowplaying = 0;

function handleSweepReply(content,qq,username,groupid,callback) {
  content=content.trim();
  if(content=='扫雷'||content=='群扫雷'){
    if(nowplaying==0){
      map=[];
      user = {};
      queue=[];
      nowplaying=groupid;
      var ret = '群扫雷将于60秒后开启，输入【扫雷】加入游戏\n';
      ret = ret +  '指令：\n';
      ret = ret +'【s+数字+字母】如【s6f】扫位置为【6f】的空地\n';
      ret = ret +'游戏规则：\n';
      ret = ret + '扫到空地-10HP，扫到雷-100HP，扫到自己+100HP\n';
      ret = ret + '扫到群友自己+100HP，群友-50HP\n';
      setTimeout(function(){
        initgame(callback);
      },60000);
      callback(ret);
    }else if(nowplaying==groupid){
      user[qq]={qq:qq,n:username,hp:100};
      var ret = '【'+username+'】加入了群扫雷';
      callback(ret);
    }else{
      var ret = '请稍候再试';
      callback(ret);
    }
  }else{
    content=content.toLocaleLowerCase();
    var x = content.charCodeAt(0)-49;
    var y = content.charCodeAt(1)-97;
    sweep(qq,username,x,y,function(ret){
      generateImage(ret,callback);
    });
  }

}

function initgame(callback){
  nowplaying=1;
  var qqlist = [];
  for(var qq in user){
    qqlist.push(qq);
    queue.push(qq);
  }
  generateMap(25,qqlist);
  var ret = '扫雷开始，下一个【'+user[queue[0]].n+'】';
  generateImage(ret,callback);
}

function test(){
  user['m']={qq:'m',n:'mmmm',hp:100};
  user['n']={qq:'n',n:'nnnn',hp:100};
  user['p']={qq:'p',n:'pppp',hp:100};
  user['t']={qq:'t',n:'tttt',hp:100};
  queue=['m','n','p'];
  generateMap(50,['m','n','p']);
  sweep('m','mmm',5,12);
  printmap();
  console.log(user);
}


function generateMap(bombnum,userlist){
  var y=26;
  var x=9;
  var c=bombnum;
  var l=x*y;
  for(var i=0;i<x;i++) {
    map[i] = [];
    for (var j = 0; j < y; j++) {
      map[i][j] = {d: 0, s: 0};
    }
  }



  while(userlist.length>0) {
    var ny = Math.floor(Math.random() * y);
    var nx = Math.floor(Math.random() * x);
    if(map[nx][ny].d==0){
      var userqq = userlist.pop();
      map[nx][ny].d=userqq;
    }
  }
  //map[5][12].d='n';
  for(var i=0;i<x;i++){
    for(var j=0;j<y;j++){
      if(map[i][j].d==0){
        if(Math.random()*l<c){
          map[i][j].d='x';
          c--;
        }
        l--;
      }
    }
  }
  for(var i=0;i<x;i++){
    for(var j=0;j<y;j++){
      var c=0;
      for(var m=i-1;m<=i+1;m++){
        for(var n=j-1;n<=j+1;n++){
          if(m!=i||n!=j){
            if(map[m]){
              if(map[m][n]){
                if(map[m][n].d=="x"){
                  c++;
                }else if(map[m][n].d==0){

                }else{
                  c=c+2;
                }
              }
            }
          }
        }
      }
      map[i][j].c=c;
    }
  }


}

function printmap(){
  console.log('===========s=============');
  var wr = '';
  var r="";
  for(var i=0;i<map.length;i++){
    for(var j=0;j<map[i].length;j++){
      r = r + " "+map[i][j].d;
    }
    r = r+"\n";
  }
  console.log(r+"\n\n");

  r="";
  for(var i=0;i<map.length;i++){
    for(var j=0;j<map[i].length;j++){
      if(map[i][j].d!=0){
        r = r + " "+map[i][j].d
      }else{
        r = r + " "+map[i][j].c;
      }
    }
    r = r+"\n";
  }
  console.log(r);

  r="";
  for(var i=0;i<map.length;i++){
    for(var j=0;j<map[i].length;j++){
      if(map[i][j].s==0){
        r = r + " "+"o";
      }else{
        if(map[i][j].d=="x"){
          r = r + " "+"x";
        }else{
          r = r + " "+map[i][j].c;
        }
      }
    }
    r = r+"\n";
  }
  wr = r;

  console.log(r);
  console.log('===========e=============');
}

function sweep(qq,username,x,y,callback){
  while(queue.length>0&&queue[0]==0){
    queue=queue.slice(1);
  }
  if(qq==queue[0]&&user[qq].hp>0){
    queue = queue.slice(1);
    queue.push(qq);
  }else{
    return;
  }
  if(map[x]){
    if(map[x][y]&&map[x][y].s==0){
      var ret = '';
      map[x][y].s=1;
      if(map[x][y].d==qq){
        user[qq].hp=user[qq].hp+100;
        map[x][y].death=qq;
        ret = ret + '【'+username+'】发现自己的宝藏，HP增加100';
      }else if(map[x][y].d=="x"){
        user[qq].hp=user[qq].hp-100;
        map[x][y].death=qq;
        ret = '【'+username+'】踩到地雷，HP减100';
      }else if(map[x][y].d>0||map[x][y].d=='n'){
        var otherqq = map[x][y].d
        var otherusername = user[otherqq].n;
        user[qq].hp=user[qq].hp+100;
        user[otherqq].hp=user[otherqq].hp-50;
        ret = ret + '【'+username+'】发现【'+otherusername+'】的宝藏，HP增加100,【'+otherusername+'】HP减少50';;
      }else{
        if(map[x][y].c==0){
          list = [];
          var mm = {};

          list.push((x<<10)+y);
          mm[(x<<10)+y]=1;
          while(list.length>0){
            console.log(list);
            var ud = list.pop();
            var ux = ud>>10;
            var uy = ud&1023;
            map[ux][uy].s=1;
            mm[(ux<<10)+uy]=1;
            if(map[ux][uy].c==0){
              var arr = [[ux-1,uy],[ux+1,uy],[ux,uy-1],[ux,uy+1]];
              for(var i=0;i<arr.length;i++){
                var wd = arr[i];
                var wx = wd[0];
                var wy = wd[1];
                if(!mm[(wx<<10)+wy]){
                  if(map[wx]){
                    if(map[wx][wy]){
                      list.push((wx<<10)+wy);
                    }
                  }
                }
              }
            }
          }
          user[qq].hp=user[qq].hp-10;
          ret = ret + '【'+username+'】，什么也没有，HP减10';
        }else{
          user[qq].hp=user[qq].hp-10;
          ret = ret + '【'+username+'】探索了这里，什么也没有，HP减10';
        }
      }


      var alive = 0;
      for(var qq in user){
        if(user[qq].hp<=0){
          for(var k=0;k<queue;k++){
            if(queue[k]==qq){
              queue[k]=0;
            }
          }
        }else{
          alive++;
        }
      }
      while(queue.length>0&&queue[0]==0){
        queue=queue.slice(1);
      }
      ret = ret + "\n"+'下一个【'+user[queue[0]].n+'】';


      if(alive<=1){
        for(var qq in user){
          if(user[qq].hp>0){
            ret = ret + "\n游戏结束，幸存者【"+user[qq].n+"】";
            nowplaying=0;
          }
        }
      }
      callback(ret);

    }else{
      console.log('sssssss');
    }
  }
}



function generateImage(wd,callback){
  var xxstr = 'abcdefghijklmnopqrstuvwxyz'.split('');
  var yystr = '123456789'.split('');
  var img1 = new imageMagick("static/blank.png");
  img1.resize(1250, 600,'!')
    .autoOrient()
    .fontSize(18)
    .font('./static/dfgw.ttf');

  for(var i=0;i<map.length;i++){
    img1.fontSize(30).fill('red')
    img1.drawText(0+0*45,50+i*45,yystr[i],'NorthWest');
  }

  for(var j=0;j<map[0].length;j++){
    img1.fontSize(30).fill('red')
    img1.drawText(50+j*45,0+0*45,xxstr[j],'NorthWest');
  }



  for(var i=0;i<map.length;i++){
    for(var j=0;j<map[i].length;j++){
      if(map[i][j].s==0){
        var r = '▇';
        img1.fill('gray').fontSize(18)
      }else{
        if(map[i][j].d=="x"){
          var r = 'X';
          img1.fill('red').fontSize(30)
        }else if(map[i][j].d==0){
          var r = map[i][j].c+'';
          img1.fill('blue').fontSize(18)
        }else{
          img1.fill('aqua').fontSize(9)
          var un = user[map[i][j].d];
          var r = un.substring(0,3);

        }
      }
      img1.drawText(50+j*45,50+i*45,r+"",'NorthWest');
    }
  }
  img1.fill('purple').fontSize(25);
  var qqlist = Object.keys(user);
  for(var i=0;i<qqlist.length;i++){
    var username = user[qqlist[i]].n;
    username=username.substring(0,10);
    var r = '【'+username+'】,HP:'+user[qqlist[i]].hp;
    var ni = Math.floor(i/3);
    var np = i%3;
    img1.drawText(20+8*45*np,50+9*45+25*ni,r+"",'NorthWest');
  }

  sendGmImage(img1,wd,callback,1);
}






module.exports={
  handleSweepReply
}