var MongoClient = require('mongodb').MongoClient;
var mongourl = 'mongodb://192.168.17.52:27050/db_senka';
var Axios = require('axios');
var fs = require('fs');
var http = require('http');
var monthOfDay=[31,28,31,30,31,30,31,31,30,31,30,31];
var u = {};
var c = {};
var memory = {};
var usermap = {};

const wait = time => new Promise(resolve => setTimeout(() => resolve(), time))

function userinit(){
  var user = fs.readFileSync("static/61.txt","utf-8");
  var ku = fs.readFileSync("static/p2.txt","utf-8");
  var sa = user.split('\n');


  var c = 1;
  var qlist = [];
  var qmap={};
  for(var i=0;i<sa.length;i++){
    var e = sa[i].trim();
    if(e==c){
      c++;
      var name = sa[i+1];
      var l1 = sa[i+2];
      var l2 = sa[i+3];
      i=i+2;
      var la1 = l1.split("\t");
      var la2 = l2.split("\t");
      if(la1.length>2){
        qlist.push([la1[0],name]);
        qmap[la1[0]]=name;
      }else{
        qlist.push([la2[0],name]);
        qmap[la2[0]]=name;
      }
    }
  }

  var ka = ku.split('\n');
  for(var i=0;i<ka.length;i++){
    var e = ka[i];
    var ea = e.split("|");
    if(ea.length==2){
      var n = ea[1].indexOf("QQ:");
      var qnum = ea[1].substring(n+3).trim();
      usermap[qmap[qnum]]=ea[0].trim();
    }
  }
  console.log(usermap);
}


function searchsenka(userName,content,Ncallback){
  var callback=function(response){
    let strArr = response.split('\n'), callbackArr = []
    callbackArr.push(strArr.reduce((pre, cur) => {
        if(pre.length + cur.length < 250)
    return `${pre}\n${cur}`
    else {
      callbackArr.push(pre)
      return cur
    }
  }))
    callbackArr.forEach(async (ele, idx) => {
      await wait(idx * 500)
      Ncallback(ele)
    })
  }
  var day = new Date().getDate();
  if(day<10||(day>10&&day<20)||(day>20&&day<22)){
    callback('宇宙的爱');
    return;
  }

  content=content.trim();
  if(content==""){
    callback('输入格式：`z[服务器ID]-[用户名]')
  }else if(content.length==2&&content.substring(0,1)=='x'){
    ret = memory[userName+content];
    if(!ret){
      ret = 'No memory\n';
    }
    callback(ret);
  }else{
    var ca = content.split('-');
    if(ca.length==1){
      var serverId = parseInt(ca[0]);
      var name = "";
      searchsenka2(serverId,userName,name,callback)
    }else if(ca.length==2){
      var serverId = parseInt(ca[0]);
      var name = ca[1].trim();
      searchsenka2(serverId,userName,name,callback)
    }else{
      var serverId = parseInt(ca[0]);
      searchsenka2(serverId,userName,"",callback)
    }
  }
}

function searchsenka2(server,userName,name,callback){
  var then = 0;
  if(c[server]){
    then=c[server].ts;
  }
  var now = new Date();
  var month = now.getMonth();
  var date = now.getDate();
  var sub = now.getTime()-new Date(then).getTime();
  var read = true;
  if(date<monthOfDay[month]) {
    if (then>0&&getDateNo(now) == getDateNo(then) && getRankDateNo(now) == getRankDateNo(then) && sub > 60000) {
      read = false;
    }
  }
  if(read==false){
    searchSenkaByCache(server,userName,name,callback);
  }else{
    console.log('will get');
    var options = {
      hostname: "192.168.17.52",
      port: 12450,
      path: "/api/ca2?server="+server,
      headers: {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.75 Safari/537.36'
      },
      method: 'GET'
    };
    console.log(options)
    http.request(options, function (res) {
      res.setEncoding('utf8');
      var resdata = '';
      var cx=0;
      res.on('data', function (chunk) {
        cx++;
        resdata = resdata + chunk;
      });
      res.on('end', function () {
        console.log(resdata);
        u = eval("("+fs.readFileSync('../rankCollector/senka.txt',"utf-8")+")");
        c[server]={};
        c[server].ts=u.ts;
        forecast(server);
        searchSenkaByCache(server,userName,name,callback);
      });
    }).end();

    /*
    Axios.get('http://192.168.17.52:12450/api/calrank?server='+server, {
      timeout: 20000,
      headers: {}
    }).then(function(response){
      console.log(111);
      u = response.data;
      c[server]={};
      c[server].ts=u.ts;
      console.log(222);
      forecast(server);
      searchSenkaByCache(server,userName,name,callback);
    }).catch(error => {
      console.log(error)
    })
    */

  }
}

function searchSenkaByCache(server,userName,name,callback){
  var ret = "";
  if(name==""){
    ret = c[server].f;
  }else if(name=="1"){
    ret = c[server].headstr;
  }else{
    var detail = c[server].u;
    var keys = Object.keys(detail);
    var ra = []
    for(var i=0;i<keys.length;i++){
      if(keys[i].indexOf(name)>=0){
        ra.push(keys[i]);
      }
    }
    if(ra.length==1){
      ret = detail[ra[0]];
    }else{
      ret = "请选择\n";
      for(var i=0;i<ra.length;i++){
        ret = ret + ' `zx'+i+'\t|\t'+ra[i]+"\n";
        memory[userName+"x"+i]=detail[ra[i]]+ '统计时间：'+new Date(c[server].ts).toLocaleString();
      }
    }
  }
  ret = ret + '统计时间：'+new Date(c[server].ts).toLocaleString();
  callback(ret);
}


function forecast(server){
  var bsenka5 = u.tail[5];
  var bsenka20 = u.tail[20];
  var bsenka100 = u.tail[100];
  var bsenka500 = u.tail[500];
  generateTable(3,server);
  sortby(0,server);
  var qsenka5 = u.d[4].senka;
  var qsenka20 = u.d[19].senka;
  var qsenka100 = u.d[99].senka;
  var qsenka500 = u.d[499].senka;
  sortby(3,server);
  generateTable(3,server);
  var senka5 = u.d[4].max;
  var senka20 = u.d[19].max;
  var senka100 = u.d[99].max;
  var senka500 = u.d[499].max;
  var fromts = u.zexpfrom;
  var tots = u.zexpto;
  var frontmap = u.front;
  var now = new Date();
  var month = now.getMonth();
  var days = monthOfDay[month];
  var totalts = (days)*86400000-3600000*4;
  var dur = tots-fromts;
  var rate = totalts/dur*1.0;
  var furture5 = (senka5-frontmap[5]-1380)*rate+frontmap[5]+1380;
  var furture20 = (senka20-frontmap[20]-1380)*rate+frontmap[20]+1380;
  var furture100 = (senka100-frontmap[100]-1380)*rate+frontmap[100]+1380;
  var furture500 = (senka500-frontmap[500]-1380)*rate+frontmap[500]+1380;
  var h='本月战果预测:\n';
  h=h+'排名|榜单|当前|当前(ex)|月底\n';
  h=h+'  5位'+bsenka5+'|'+qsenka5+'|'+senka5+'|'+furture5.toFixed(0)+'\n';
  h=h+' 20位'+bsenka20+'|'+qsenka20+'|'+senka20+'|'+furture20.toFixed(0)+'\n';
  h=h+'100位'+bsenka100+'|'+qsenka100+'|'+senka100+'|'+furture100.toFixed(0)+'\n';
  h=h+'500位'+bsenka500+'|'+qsenka500+'|'+senka500+'|'+furture500.toFixed(0)+'\n';
  c[server].f=h;
}

function sortby(type,server){
  u.d.sort(function(a,b){
    if(type==0){
      return b.senka-a.senka;
    }else if(type==1){
      return b.subsenka-a.subsenka;
    }else if(type==2){
      return a.ex-b.ex;
    }else if(type==3){
      return b.max-a.max;
    }else if(type==4){
      return b.min-a.min;
    }
  });
  generateTable(type,server);
}

function generateTable(sorttype,server){
  var data = u;
  var result = data.r;
  if(true) {
    var zexfrom = data.zexfrom;
    var zexto = data.zexto;
    var zexpfrom = data.zexpfrom;
    var zexpto = data.zexpto;
    var minmap = data.minmap;
    var frontmap = data.front;
    var now = new Date();
    var month = now.getMonth();
    var headstr = '当前|当前(ex)|经验|EX\n';
    var headarr = [];
    for (var i = 0; i < data.d.length; i++) {
      var type = data.d[i].type;
      var senka = data.d[i];
      var z = data.d[i].z;
      var zcleared=0;
      var expfrom = senka.expfrom;
      var expto = senka.expto;
      var exlist = senka.exlist;
      var frontex = senka.frontex?senka.frontex:0;
      var ex=senka.ex;
      var zComplete;
      if(frontex>10&&frontex<75){
        frontex=75;
      }
      if((Math.floor((month + 1) / 3)%4) === (Math.floor((z + 1) / 3)%4) && z >= 0){
        zcleared = 350
      } else if ( (now.getDate() === monthOfDay[now.getMonth()] && now.getHours() >= 14)){
        if(ex > 1025 && ex < 1035 && !frontex){
          zcleared = 350
          zComplete = -1
        }
        if(ex < 960 && ex > 950 && !frontex){
          zcleared = 350
          zComplete = -1
        }
        if (Math.abs(expfrom - zexfrom) < 1200000 && Math.abs(expto - zexto) < 1200000 && ex < 330) {
          zcleared = 350
          zComplete = -1
        }
        if(senka.ex + frontex < 950){
          if(senka.max){
            if(exlist){
              exlist.push(frontex);

              let zc = 0
              exlist.forEach(ele => {
                var aex=parseInt(ele);
                if(aex>345&&aex<355){
                  zc = 1
                }
                if(aex>420&&aex<430){
                  zc = 1
                }
                if(aex>445&&aex<455){
                  zc = 1
                }
                if(aex>495&&aex<505){
                  zc = 1
                }
                if(aex>510){
                  zc = 1
                }
              })
              let ruex = senka.max - senka.senka
              let hiddenex = 1380 - ex - ruex
              if(senka.name=='アサギ'){
                console.log(exlist);
                console.log(hiddenex,senka.max,senka.senka,ex);
              }
              if((hiddenex>345&&hiddenex<355)||hiddenex > 420){
                zc = 1
              }
              if(zc === 0){
                zcleared = 350
                zComplete = -1
              }
            }
          }
        }
      }


      var subsenkastr = senka.subsenka;

      var basets = senka.basets;

      if (Math.abs(expfrom - zexpfrom) > 1200000 || Math.abs(expto - zexpto) > 1200000) {
        subsenkastr = subsenkastr + '    (' + new Date(expfrom).toLocaleString() + '----' + new Date(expto).toLocaleString() + ')';
      }

      var nowsenkastr = senka.senka;
      var exstr = '';

      if (type == 1) {
        var exfrom = senka.exfrom;
        var exto = senka.exto;
        var ensure = 0;
        if (Math.abs(exfrom - zexfrom) < 1200000 && Math.abs(exto - zexto) < 1200000) {
          exstr = exstr + senka.ex;
          ensure = 1;
        } else {
          exstr = exstr + senka.ex + '    (' + new Date(exfrom).toLocaleString() + '----' + new Date(exto).toLocaleString() + ')';
        }
        if(zcleared>0){
          exstr = exstr + '('+(senka.z+1)+'月已完成Z作战)';
        }

        if (senka.fsenkats == 0 && Math.abs(expfrom - zexpfrom) < 1200000) {
          data.d[i].except=senka.subsenka + senka.fsenka + 1380 - zcleared-frontex;
          data.d[i].max=data.d[i].except;
          data.d[i].min=data.d[i].except;
        }else if(senka.fsenkats == 0 && getDateNo(expfrom)==0 && new Date(basets).getYear()*12+new Date(basets).getMonth()<month+now.getYear()*12){
          var minsenka = senka.fsenka+senka.subsenka+1380-zcleared;
          var maxsenka = senka.fsenka+senka.subsenka+senka.subbase+1380-zcleared;
          var max2 = Math.floor(minsenka + (expfrom-zexfrom)*0.00001);
          if(max2<maxsenka){
            maxsenka=max2;
          }
          var max3 = senka.senka + 1380 - senka.ex-zcleared;
          if(max3<maxsenka){
            maxsenka=max3;
          }
          data.d[i].max=maxsenka-frontex;
          data.d[i].min=minsenka-frontex;
        }  else if (ensure) {
          data.d[i].except=senka.senka + 1380 - zcleared - senka.ex;
          data.d[i].max=data.d[i].except;
          data.d[i].min=data.d[i].except;
        } else {
          var firstExpDateNo = getDateNo(expfrom);
          var maxsenka1 = senka.subsenka+minmap[firstExpDateNo]+1380-zcleared;
          var minsenka = senka.subsenka+1380-zcleared;
          var maxsenka2 = senka.senka + 1380 - senka.ex-zcleared;
          var maxsenka3 = senka.subsenka + senka.fsenka + 1380-zcleared;
          var maxsenka = 99999;
          if(maxsenka1<maxsenka){
            maxsenka=maxsenka1;
          }
          if(maxsenka2<maxsenka){
            maxsenka=maxsenka2;
          }
          if(maxsenka3<maxsenka){
            maxsenka=maxsenka3;
          }
          var maxsenka4 = -1;
          var maxsenka5 = -1;
          if(new Date(basets).getYear()*12+new Date(basets).getMonth()<month+now.getYear()*12){
            maxsenka4 = senka.subsenka+senka.subbase+minmap[0]+1380-zcleared;
            if(maxsenka4<maxsenka){
              maxsenka=maxsenka4;
            }
          }
          if(senka.name=='アサギ'){
            console.log(senka.name);
            console.log(maxsenka1,minsenka,maxsenka2,maxsenka3,zcleared);
          }

          data.d[i].max=maxsenka-frontex;
          data.d[i].min=minsenka-frontex;
        }

      } else if (type == 3) {
        exstr = 'unknown';
        var firstExpDateNo = getDateNo(expfrom);
        var maxsenka1 = senka.subsenka+minmap[firstExpDateNo]+1380-zcleared;
        var minsenka = senka.subsenka+1380-zcleared;
        var maxsenka2 = senka.senka + 1380 - senka.ex-zcleared;
        var maxsenka3 = senka.subsenka + senka.fsenka + 1380-zcleared;
        var maxsenka = 99999;
        if(maxsenka1<maxsenka){
          maxsenka=maxsenka1;
        }
        if(maxsenka2<maxsenka){
          maxsenka=maxsenka2;
        }
        if(maxsenka3<maxsenka){
          maxsenka=maxsenka3;
        }
        if(new Date(basets).getYear()*12+new Date(basets).getMonth()<month+now.getYear()*12){
          var maxsenka4 = senka.subsenka+senka.subbase+1380-zcleared;
          if(maxsenka4<maxsenka){
            maxsenka=maxsenka4;
          }
        }
        data.d[i].max=maxsenka-frontex;
        data.d[i].min=minsenka-frontex;
      } else if (type == 2) {
        var senkalist = senka.senkalist;
        var maylist = senka.may;
        var length = maylist.length;
        var senkas = senka.senka;
        if(length==2){
          var sub1 = maylist[0].subsenka;
          var from1 = maylist[0].expfrom;

          var sub2 = maylist[1].subsenka;
          var from2 = maylist[1].expfrom;

          var maxsub = maylist[0];
          var minsub = maylist[1];
          if(sub1<sub2){
            maxsub = maylist[1];
            minsub = maylist[0];
          }

          var ts2senka = {};
          for(var k=senkalist.length-1;k>=0;k--){
            var senkaD = senkalist[k];
            var sts = senkaD.ts;
            if(ts2senka[sts]){
              ts2senka[sts].push(senkaD);
            }else{
              ts2senka[sts]=[senkaD];
            }
          }
          var tskeys = Object.keys(ts2senka).sort(function(a,b){return parseInt(a)-parseInt(b)});
          var last = ts2senka[tskeys[tskeys.length-1]];
          var first = ts2senka[tskeys[0]];
          if(last.length==2){
            var last1 = last[0];
            var last2 = last[1];
            var first1 = first[0];
            var first2 = first[1];
            var maxf = first1;
            var minf = first2;
            if(first2){
              if(first.senka<first2.senka){
                maxf = first2;
                minf = first1;
              }
            }
            var max = last1;
            var min = last2;
            if(last1.senka<last2.senka){
              max = last2;
              min = last1;
            }
            if(senkas==max.senka){
              senka.expfrom = maxsub.expfrom;
              senka.expto = maxsub.expto;
              senka.subsenka = maxsub.subsenka;
              if(maxf.ts==0){
                var maxsenka = maxf.senka+maxsub.subsenka+1380-zcleared;
                senka.max=maxsenka;
                senka.min=maxsenka;
              }else{
                var maxsenka1 =maxf.senka+maxsub.subsenka+1380-zcleared;
                var firstExpDateNo = getDateNo(maxsub.expfrom);
                var maxsenka2 = minmap[firstExpDateNo]+maxsub.subsenka+1380-zcleared;
                var maxsenka = maxsenka1;
                if(maxsenka2<maxsenka){
                  maxsenka=maxsenka2;
                }
                var minsenka = maxsub.subsenka+1380-zcleared;
                senka.max = maxsenka;
                senka.min = minsenka;
              }
              var subrank = max.senka-maxf.senka;
              var ex = subrank-maxsub.subsenka;
              if (Math.abs(expfrom - zexfrom) < 1200000 && Math.abs(expto - zexto) < 1200000) {
                exstr = ex;
              } else {
                exstr = exstr + ex + '    (' + new Date(expfrom).toLocaleString() + '----' + new Date(expto).toLocaleString() + ')';
              }
              if(zcleared>0){
                exstr = exstr + '('+(z+1)+'月已完成Z作战)';
              }
            }else{
              senka.expfrom = minsub.expfrom;
              senka.expto = minsub.expto;
              senka.subsenka=minsub.subsenka;
              if(minf&&minf.ts==0){
                var expect = minf.senka+minsub.subsenka+1380-zcleared;
                senka.max = expect;
                senka.min = expect;
              }else{
                var firstExpDateNo = getDateNo(minsub.expfrom);
                var maxsenka = minmap[firstExpDateNo]+minsub.subsenka+1380-zcleared;
                var minsenka = minsub.subsenka+1380-zcleared;
                senka.max=maxsenka;
                senka.min=minsenka;
              }
              if(minf){
                var subrank = min.senka-minf.senka;
                var ex = subrank-minsub.subsenka;
                if (Math.abs(expfrom - zexfrom) < 1200000 && Math.abs(expto - zexto) < 1200000) {
                  exstr = ex;
                } else {
                  exstr = exstr + ex + '    (' + new Date(expfrom).toLocaleString() + '----' + new Date(expto).toLocaleString() + ')';
                }
                if(zcleared>0){
                  exstr = exstr + '('+(z+1)+'月已完成Z作战)';
                }
              }else{
                exstr = 'unknown2';
              }

            }
          }
        }
      }
      if(senka.max<senka.senka){
        senka.max=senka.senka;
        senka.min=senka.senka;
      }
      if(frontex>0){
        exstr=exstr+"(+"+frontex+")"
      }
      var max = senka.max;
      var min = senka.min;
      if(!c[server].u){
        c[server].u={};
      }
      var h = '';
      h = h + '排名：'+(i + 1) + '位(' + senka.lno + '位)\n';
      h = h + senka.name+'\n';
      h = h + '当前战果：'+senka.senka + '\n';
      h = h + '战果(ex)：'+(min==max?max:(min+'-'+max))+'\n';
      h = h + '经验：'+subsenkastr + '\n';
      h = h + 'ex:'+exstr+'\n';
      c[server].u[senka.name]=h;
      if(i<10){
        headarr[i] = (i+1)+ '位(' + senka.lno + '位)'+senka.name+'\n' +senka.senka+'|'+(min==max?max:(min+'-'+max))+'|'+subsenkastr+'|'+exstr+"\n";
      }
    }
    for(var i=0;i<10;i++){
      headstr=headstr+headarr[i];
    }
    c[server].headstr=headstr;
    console.log(headstr);
  }
}


getDateNo = function(now){
  now = new Date(new Date(now).getTime()+(new Date().getTimezoneOffset()+480)*60000)
  var date = now.getDate()
  var hour = now.getHours()
  if(hour<1){
    date = date -1
    hour = hour + 24
  }
  const no = (date-1)*2+((hour>=13)?1:0)
  return no
}

getRankDateNo = function(now){
  now = new Date(new Date(now).getTime()+(new Date().getTimezoneOffset()+480)*60000)
  var date = now.getDate()
  var hour = now.getHours()
  if(hour<2){
    date = date -1
    hour = hour + 24
  }
  const no = (date-1)*2+((hour>=14)?1:0)
  return no
}

module.exports={
  searchsenka,
  userinit
}








