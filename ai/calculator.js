cal = function(str){
  if(str.startsWith("0")||str.startsWith("(")||str.startsWith("（")||parseInt(str)){
    can = true;
    willcal = false;
    var z="";
    for(var i=0;i<str.length;i++){
      var cha = str[i];
      if(cha>=0&cha<=9){
        z=z+cha;
      }else if(cha=='+'||cha=='-'||cha=="*"||cha=="/"){
        if(i>0){
          willcal = true;
        }
        z=z+cha;
      }else if(cha==" "||cha=="("||cha==")"||cha=="."){
        z=z+cha;
      }else if(cha=="（"){
        z=z+"(";
      }else if(cha=="）"){
        z=z+")";
      }else if(cha=="×"){
        willcal = true;
        z=z+"*";
      }else if(cha=="。"){
        z=z+".";
      }else{
        can = false;
        break;
      }

    }
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