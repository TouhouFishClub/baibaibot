cal = function(str){
  str = str.replace('/（/g','(');
  str = str.replace('/）/g',')');
  str = str.replace('/×/g','*');
  str = str.replace('/。/g','.');
  if(str.startsWith("0")||parseInt(str)){
    can = true;
    willcal = false;
    for(var i=0;i<str.length;i++){
      var cha = str[i];
      if(cha>=0&cha<=9){
        continue;
      }
      if(cha=='+'||cha=='-'||cha=="*"||cha=="/"){
        willcal = true;
        continue;
      }
      if(cha==" "||cha=="("||cha==")"||cha=="."){
        continue;
      }
      can = false;
      break;
    }
    if(can){
      var ret = eval(str);
      return ret;
    }
  }
}

module.exports={
  cal
}