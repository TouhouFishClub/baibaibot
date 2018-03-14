cal = function(str){
  var sa=str.split('^');
  if(sa.length==2){
    if(parseFloat(sa[0])==sa[0]&&parseFloat(sa[1])==sa[1]){
      return Math.pow(parseFloat(sa[0]),parseFloat(sa[1]));
    }else{
      return undefined;
    }
  }
  str = str.toLowerCase().trim();
  if(str.length==3&&str[1]=="-"){
    return undefined;
  }
  var first = str.substring(0,1)
  if(first=="√"||first==0||first=="("||first=="（"||first=="s"||first=="c"||first=="t"||first=="l"||first=="p"||first=="e"||first=="π"||parseInt(str)){
    can = true;
    willcal = false;
    var z="";
    var tmp = "";
    var needtail = false;
    for(var i=0;i<str.length;i++){
      var cha = str[i];
      if(cha>=0&cha<=9){
        z=z+cha;
      }else if(cha=='+'||cha=='-'||cha=="*"||cha=="/"){
        if(i>0){
          willcal = true;
        }
        if(needtail){
          z=z+")";
          needtail=false;
        }
        z=z+cha;
      }else if(cha==" "||cha=="("||cha==")"||cha=="."){
        z=z+cha;
      }else if(cha=="（"){
        z=z+"(";
      }else if(cha=="）"){
        z=z+")";
      }else if(cha=="×"){
        if(i>0){
          willcal = true;
        }
        if(needtail){
          z=z+")";
          needtail=false;
        }
        z=z+"*";
      }else if(cha=="。"){
        z=z+".";
      }else{
        var f = str.substring(i,i+3);
        if(f=="sin"||f=="cos"||f=="tan"||f=="log"){
          if(f=="log"){f="log10"};
          z=z+"Math."+f;
          if(str[i+3]=="("||str[i+3]=="（"){

          }else{
            z=z+"(";
            needtail=true;
          }
          willcal = true;
          i=i+2;
        }else if(f.substring(0,2)=="ln"){
          z=z+"Math.log";
          if(str[i+2]=="("||str[i+2]=="（"){

          }else{
            z=z+"(";
            needtail=true;
          }
          willcal = true;
          i=i+1;
        }else if(f.substring(0,1)=="√"){
          z=z+"Math.sqrt";
          if(str[i+1]=="("||str[i+1]=="（"){

          }else{
            z=z+"(";
            needtail=true;
          }
          willcal = true;
          i=i+0;
        }else if(f=="pow"){
          willcal = true;
          var s = str.substring(i);
          var n1 = s.indexOf("(")
          var n2 = s.indexOf(")");
          if(n1<0||n2<0){
            n1 = str.indexOf("（")
            n2 = str.indexOf("）");
          }
          if(n1>0&&n2>0&&n2>n1){
            var powstr = s.substring(n1+1,n2);
            var pa = powstr.split(",");
            if(pa.length==2){
              z=z+"Math.pow("+pa[0]+","+pa[1]+")";
              i=i+3+n2-n1;
            }else{
              can = false;
              break;
            }
          }else{
            can = false;
            break;
          }
        }else if(f.substring(0,2)=="pi"){
          z=z+"Math.PI";
          i=i+1;
        }else if(f.substring(0,1)=="π"){
          z=z+"Math.PI";
        }else if(f.substring(0,1)=="e"){
          z=z+"Math.E";
        }else{
          can = false;
          break;
        }
      }
    }
    if(needtail){
      z=z+")"
    }
    console.log(z);
    if(can&&willcal){
      try{
        var ret = eval(z);
        return ret;
      }catch(e){
        console.log(e);
      }
    }
  }
}




module.exports={
  cal
}