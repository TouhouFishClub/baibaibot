

var map=[];
var seek=[];
var user={};

function generateMap(bombnum){
  var y=26;
  var x=9;
  var c=bombnum;
  var l=x*y;
  for(var i=0;i<x;i++){
    map[i]=[]
    for(var j=0;j<y;j++){
      if(Math.random()*l<c){
        map[i][j] = {d:"x",s:0};
        c--;
      }else{
        map[i][j] = {d:0,s:0};
      }
      l--;
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
                }
              }
            }
          }
        }
      }
      map[i][j].c=c;
    }
  }
  printmap();
  sweep("123",5,15)

  printmap();
}

function printmap(){
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
      if(map[i][j].d=="x"){
        r = r + " "+"x";
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
  console.log(r);
}

function sweep(qq,x,y){
  if(map[x]){
    if(map[x][y]){
      map[x][y].s=1;
      if(map[x][y].d=="x"){
        map[x][y].death=qq;
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
        }
      }
    }
  }
}



module.exports={
  generateMap
}