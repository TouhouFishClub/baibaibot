cal = function(str){
  str = str.replace(/,/g,'');
  if(str.endsWith('=')){
    str = str.substring(0,str.length-1);
  }
  var sa=str.split('^');
  if(sa.length==2){
    if(parseFloat(sa[0])==sa[0]&&parseFloat(sa[1])==sa[1]){
      return Math.pow(parseFloat(sa[0]),parseFloat(sa[1]));
    }else{
      return undefined;
    }
  }
  if(str.endsWith("!")||str.endsWith("！")){
    var n=str.indexOf("!");
    if(n<0){
      n=str.indexOf("！");
    }
    var num = str.substring(0,n);
    if(parseInt(num)==num){
      return mt(num);
    }else{
      return undefined;
    }
  }
  str = str.toLowerCase().trim();
  // 检查是否是无效的减法表达式（如字母-字母），但允许数字减法
  if(str.length==3&&str[1]=="-"){
    var firstChar = str[0];
    var thirdChar = str[2];
    // 如果第一个和第三个字符都不是数字，则返回undefined
    if(!(/\d/.test(firstChar)) || !(/\d/.test(thirdChar))){
      return undefined;
    }
  }
  var first = str.substring(0,1)
  if(first=="√"||first=='0'||first=="("||first=="（"||first=="s"||first=="c"||first=="t"||first=="l"||first=="p"||first=="e"||first=="π"||parseInt(str)){
    can = true;
    willcal = false;
    var z="";
    var tmp = "";
    var needtail = false;
    for(var i=0;i<str.length;i++){
      var cha = str[i];
      if(cha>='0'&&cha<='9'){
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
        var xstr = ret+"";
        if(xstr.indexOf(".")>0&&xstr.length>10){
          var u=ret.toFixed(15);
          var usub = Math.abs(u-ret);
          if(usub<Math.exp(-15)&&usub>0){
            for(var i=1;i<15;i++){
              var sub=Math.abs(ret.toFixed(i)-ret);
              if(sub<Math.exp(-15)){
                ret=ret.toFixed(i);
                break;
              }
            }
          }
        }
        return ret;
      }catch(e){
        console.log(e);
      }
    }
  }
}


function mt(x){
  var arr=[1];
  if(x>200){
    return "∞"
  }
  var n=10000;
  for(var i=1;i<=x;i++){
    for(var j=0;j<arr.length;j++){
      arr[j]=arr[j]*i;
    }
    for(var j=0;j<arr.length;j++){
      if(arr[j]>n){

        var u = Math.floor(arr[j]/n);
        arr[j]=arr[j]%n;
        if(arr[j+1]){
          arr[j+1]=arr[j+1]+u
        }else{
          arr[j+1]=u;
        }
      }
    }
  }
  var r="";
  for(var i=0;i<arr.length;i++){
    var px = arr[arr.length-i-1];
    if(i==0){
      r=r+px;
    }else{
      if(px<10){
        r=r+"000"+px;
      }else if(px<100){
        r=r+"00"+px;
      }else if(px<1000){
        r=r+"0"+px;
      }else{
        r=r+px;
      }
    }
  }
  return r;
}




module.exports={
  cal
}