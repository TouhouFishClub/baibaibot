const Axios = require('axios')
const USER_AGENT = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.75 Safari/537.36'
const TIME_OUT = 30000

const getMapDataFromWiki = map =>
  new Promise((resolve, reject) => {
    if(map=="6-4"||map=="6-5"){
      map="6-1";
    }
    Axios.get('https://zh.moegirl.org/'+encodeURIComponent('舰队')+'Collection/'+map, {
      timeout: TIME_OUT,
      headers: {
        'User-Agent': USER_AGENT
      }
    })
      .then(response => resolve(response.data))
      .catch(error => {
        console.log(error)
      })
  })


var list = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
function getMapData(userName,mapid,callback){
  getMapDataFromWiki(mapid).then(function(response){
    var n1 = response.indexOf('id="'+mapid);
    var s1 = response.substring(n1+5);
    var n2 = s1.indexOf('路线分歧');
    var s2 = s1.substring(n2+5);
    var n3 = s1.indexOf('敌方配置');
    var s3 = s1.substring(n3+5);
    var n4 = s3.indexOf('/table>');
    var s4 = s3.substring(0,n4);
    var n5 = s4.indexOf('</th></tr>');
    var s5 = s4.substring(n5+100);
    var n = s5.indexOf('<tr');
    var ret = "";
    var prindex=0;
    var lastpr=0;
    var pointm=[];
    var maxk=0;
    var maxm='';
    var retl=[];
    while(n>0){
      var s = s5.substring(0,n);
      s5 = s5.substring(n+4);
      n = s5.indexOf('<tr>');
      var sa = s.split('/td>')
      var point = getinner(sa[0]);
      var pr = point.trim().substring(0,1);
      if(pr==list[prindex]){
        prindex++;
        pointm=[];
        lastpr=pr;
      }else{
        pr=lastpr;
      }
      var k1=(sa[sa.length-4])
      var k2=(sa[sa.length-3])
      var k3=(sa[sa.length-2])
      if(k1&&k2&&k3){
        var m1 = getinner(k1).trim();
        var m2 = getinner(k2).trim();
        var m3 = getinner(k3).trim();
        var m = pr+" : "+m1+'/'+m2+'/'+m3+'\n';
        var has=false;
        for(var i=0;i<pointm.length;i++){
          if(m==pointm[i]){
            has=true;
            break;
          }
        }
        if(has==false){
          console.log(m);
          if(parseInt(m1)>maxk){
            maxk=parseInt(m1);
            maxm=m;
          }
          pointm.push(m);
          retl.push(m);
        }
      }
    }
    for(var i=0;i<retl.length;i++){
      if(ret.length+retl[i].length>240){
        callback(ret);
        ret = "";
      }
      if(retl[i]==maxm){
        ret = ret + '(最大)'+retl[i];
      }else{
        ret = ret + retl[i];
      }
    }
    callback(ret);
  });
}

function getinner(s){
  var isinner=0;
  var rn = 0;
  var ret = "";
  for(var i=0;i<s.length;i++){
    if(isinner==0&&s[i]==">"){
      isinner=1;
    }else if(isinner==1&&s[i]=="<"){
      isinner=0;
    }else if(isinner){
      if(s[i]==" "||s[i]=="\n"){
        if(rn==0){
          ret=ret+s[i];
        }
        rn=1;
      }else{
        ret=ret+s[i];
        rn=0;
      }
    }
  }
  return ret;
}


module.exports={
  getMapData
}