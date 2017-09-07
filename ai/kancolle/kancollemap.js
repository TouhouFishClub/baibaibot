const Axios = require('axios')
const USER_AGENT = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.75 Safari/537.36'
const TIME_OUT = 30000

const getMapDataFromWiki = map =>
  new Promise((resolve, reject) => {
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

function getMapData(mapid,userName,callback){
  getMapDataFromWiki(mapid).then(function(response){
    var n1 = response.indexOf('id="5-2');
    var s1 = response.substring(n1+5);
    var n2 = s1.indexOf('路线分歧');
    var s2 = s1.substring(n2+5);
    var n3 = s1.indexOf('敌方配置');
    var s3 = s1.substring(n3+5);
    var n4 = s3.indexOf('/table>');
    var s4 = s3.substring(0,n4);
    var n5 = s4.indexOf('</th></tr>');
    var s5 = s4.substring(n5+100);
    console.log(s5.substring(0,300));
    var n = s5.indexOf('<tr');
    var ret = "";
    var lastpr=0;
    while(n>0){
      var s = s5.substring(0,n);
      s5 = s5.substring(n+4);
      n = s5.indexOf('<tr>');
      var sa = s.split('/td>')
      if(sa.length==8){
        var point = sa[0];
        var pn1 = point.indexOf('<td');
        var ps1 = point.substring(pn1+3);
        var pn2 = ps1.indexOf('>');
        var ps2 = point.substring(pn2+1);
        var pr = ps2.trim().substring(0,1);
        console.log(ps2);
        ret=ret+pr;
        lastpr=pr;
      }else{
        ret=ret+lastpr;
      }
      var k1=sa[sa.length-4]
      var k2=sa[sa.length-3]
      var k3=sa[sa.length-2]
      if(k1&&k2&&k3){
        ret=ret+getpolit(k1)+'/'+getpolit(k2)+'/'+getpolit(k3)+'\n';
      }
    }
    console.log(ret);
    callback(response);
  });
}

function getpolit(str){
  var n = str.indexOf('<td')
  var s1 = str.substring(n+3);
  var n2 = s1.substring('>');
  var s2 = s1.substring(n2+1);
  var n3 = s2.substring('<');
  var s3 = s2.substring(0,n3);
  return s3.trim();

}

module.exports={
  getMapData
}