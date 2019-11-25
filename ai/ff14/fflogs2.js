var fs = require('fs');
var http = require('http');
var https = require('https');
var request = require('request');

const {job_cn,jobs,bosses} = require('./fflogs')


function fflogs2Reply(content,userName,callback,cn){

  content = content.toLowerCase();
  if(content==""){
    return;
    var ret = "fflog查询 输入格式：\n";
    ret = ret + "fflog + BOSS名/ID + 职业名\n";
    ret = ret + "如 【fflog o5s 黑魔】\n";
    ret = ret + "中文BOSS名仅支持极神和零式\n";
    // ret = ret + "职业名可省略,表示查询团队DPS\n";
    callback(ret);
    return;
  }
  var ca = content.split(' ');
  var boss = ca[0].trim();
  var job = ca[1];
  if(job){
    job = job.trim();
  }
  var bossid = boss;
  var zid;
  var ba = [];
  for(var i=0;i<bosses.length;i++){
    if(bosses[i].cn.indexOf(boss)>=0||bosses[i].name.indexOf(boss)>=0){
      ba.push(bosses[i]);
    }
  }
  if(ba.length==1){
    bossid = ba[0].id;
    zid = ba[0].zid
  }else if(ba.length==0){
    callback('no match');
  }else{
    var ret = "请选择：\n";
    for(var i=0;i<ba.length;i++){
      ret = ret + "cnlog "+ba[i].cn+" "+(job?job:"")+" "+(rate?rate:"")+"\n";
    }
    callback(ret);
    return;
  }
  var job;
  var a = [];
  for(var i=0;i<jobs.length;i++){
    if(jobs[i].cn==job||jobs[i].en==job){
      a=[jobs[i].en];
      break;
    }
    if(jobs[i].en.indexOf(job)>=0||jobs[i].cn.indexOf(job)>=0){
      a.push(jobs[i].en);
    }
  }
  if(a.length==1){
    job = a[0];
  }else{
    job = "Any";
  }


  var host = "www.fflogs.com";
  var cid = 3;
  if(cn==1) {
    host = "cn.fflogs.com";
    cid = 5;
  }
  var hid = 100;
  if(zid==29){
    hid=101
  }

  var url = 'https://'+host+'/zone/statistics/table/'+zid;
  url = url +'/dps/'+bossid+'/'+hid+'/8/'+cid+'/100/1/14/0/Global/'+job;
  url = url +'/All/0/normalized/single/0/-1/?keystone=15&dpstype=rdps';


  if(job=="Any"){
    url = 'https://'+host+'/zone/statistics/table/'+zid;
    url = url +'/fightdps/'+bossid+'/'+hid+'/8/'+cid+'/0/1/14/0/Global/Any';
    url = url +'/All/0/normalized/single/0/-1/?keystone=15&dpstype=rdps'
  }
  console.log(url);
  request({
    headers:{
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.75 Safari/537.36',
      'Referer': 'https://'+host+'/zone/statistics/'+zid+'/'
    },
    url: url,
  }, function(error, response, body) {
    if(error&&error.code){
      console.log('pipe error catched!')
      console.log(error);
    }else{
      var q1 = 'series.data.push('
      var n1 = body.lastIndexOf(q1);
      var d100=0;
      var dpslist = [];
      var keylist = [100,99,95,75,50,25,10];
      var kl = keylist.map(function(e){return 'series'+e+'.data.push('});
      // console.log(body);
      if(n1>0){

        var s1 = body.substring(n1+q1.length);
        var n2 = s1.indexOf(')');
        d100 = parseFloat(s1.substring(0,n2));
        dpslist.push(d100);
        var s2 = s1.substring(n2+1);
        for(var i=1;i<kl.length;i++){
          var n3 = s2.indexOf(kl[i]);
          var s3 = s2.substring(n3+kl[i].length);
          var n4 = s3.indexOf(')');
          var dps = parseFloat(s3.substring(0,n4));
          dpslist.push(dps);
          s2 = s3.substring(n4+1);
        }
        console.log(dpslist);
        if(job=="Any"){
          var ret = ba[0].cn+"\n";
          for(var i=1;i<keylist.length;i++){
            ret = ret + keylist[i]+"%:"+" \t"+dpslist[i].toFixed(1)+"\n";
          }
          ret = ret + "min:" + "  \t"+dpslist[0].toFixed(1)+"\n";
          callback(ret.trim());
        }else{
          var ret = ba[0].cn + " " + job_cn[a[0]]+"\n";
          for(var i=0;i<keylist.length;i++){
            ret = ret + keylist[i]+"%:"+" \t"+dpslist[i].toFixed(1)+"\n";
          }
          callback(ret.trim());
        }

      }

    }
  });
}

module.exports={
  fflogs2Reply
}
