var fs=require('fs');
var request = require('request');

function init(){
  generateMap();
}

var wd=7;
var hd=7;
var map=[];
function generateMap(){
  for(var i=0;i<wd;i++){
    map[i]=[]
    for(var j=0;j<hd;j++){
      map[i][j]=0;
    }
  }
  var wifecount = 7;
  while(wifecount>0){
    var x=Math.floor(Math.random()*wd);
    var y=Math.floor(Math.random()*hd);
    if(map[x][y]==0){
      map[x][y]={type:1,id:9-wifecount};
      wifecount--;
    }

  }



}
var queue=[];
function addplayer(qq,name){
  var user={type:0,qq:qq,name:name,order:queue.length};
  queue.push(user);
  var insert = false;
  while(!insert){
    var x=Math.floor(Math.random()*wd);
    var y=Math.floor(Math.random()*hd);
    if(map[x][y]==0){
      map[x][y]=user;
      insert=true;
    }
  }
    downloadAvatar(qq);
}

function move(qq,direct){
    for(var i=0;i<wd;i++){
        for(var j=0;j<hd;j++){
            var d=map[i][j];
            if(d!=0){
                if(d.type==0&&d.qq=qq){

                }
            }
        }
    }
}

function put(qq,type,x,y){

}



function printmap(){
  for(var i=0;i<wd;i++){
    console.log(map[i]);
  }
  generateHTML();
}

var warr="ⓐⓑⓒⓓⓔⓕⓖⓗⓘⓙⓚⓛⓜⓝⓞⓟⓠⓡⓢⓣⓤⓥⓦⓧⓨⓩ";
var harr="0①②③④⑤⑥⑦⑧⑨⑩";
function generateHTML(){
    var h='<html>';
    h=h+'<head></head>';
    h=h+'<body>';
    h=h+'<div id="main">';
    h=h+'<table border="1">'
    h=h+'<tr>'
    for(var i=0;i<hd+1;i++){
        h=h+'<td>'+harr[i]+'</td>'
    }
    h=h+'</tr>';
    for(var i=0;i<wd;i++){
        h=h+'<td>'+warr[i]+'</td>'
        for(var j=0;j<hd;j++){
            var d=map[i][j];
            h=h+'<td>';
            if(d!=0){
                var  type=d.type;
                if(type==0){
                    var qq=d.qq;
                    h=h+'<img width="80" src="/avatar/'+qq+'.jpg"></img>';
                }else if(type==1){
                    var id=d.id;
                    var list = fs.readdirSync("public/mooyuu/");
                    var rd = list[Math.floor(Math.random()*list.length)];
                    h=h+'<img width="200" src="/mooyuu/'+rd+'"></img>';
                }
            }else{
                h=h+'<img width="80" src="/avatar/blank.png"></img>';
            }
            h=h+'</td>'
        }
        h=h+'</tr>';
    }
    h=h+'</table></div>';
    h=h+'</body></html>';
    fs.writeFileSync("public/cw/1.html",h);
}

function downloadAvatar(qq){
  if(fs.existsSync("public/avatar/"+qq+".jpg")){

  }else{
      var url = "https://q1.qlogo.cn/g?b=qq&nk="+qq+"&s=100&rd="+new Date().getTime();
      request({
          url: url,
          method: "GET"
      }, function(error, response, body){
          if(error&&error.code){
              console.log('pipe error catched!')
              console.log(error);
          }
      }).pipe(fs.createWriteStream("public/avatar/"+qq+".jpg"));
  }

}

module.exports={
  init,
  addplayer,
  printmap,
    downloadAvatar
}

