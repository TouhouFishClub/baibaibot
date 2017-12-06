var https=require('https');
var http = require('http');
var MongoClient = require('mongodb').MongoClient;
var mongourl = 'mongodb://192.168.17.52:27050/db_bot';

function kancolleInfo(content,userName,callback){
  if(content==""){

  }else{
    searchShipByName(content,callback);
  }
}

function searchShipByName(name,callback){
  var keys = Object.keys(ships);
  var ret = {};
  for(var i=0;i<keys.length;i++){
    var ship = ships[keys[i]];
    var cname = ship.name.zh_cn;
    var jname = ship.name.ja_jp;
    if(cname.indexOf(name)>=0||jname.indexOf(name)>=0){
      if(ship.init){
        ret[ship.init]=1;
      }else{
        ret[ship.id]=1;
      }
    }
  }
  var candidate = Object.keys(ret);
  if(candidate.length==1){
    outputship(candidate[0],callback);
  }else{

  }
}

function outputship(shipid,callback){
  var group = ships[shipid].group;
  var list = Object.keys(group);
  list.sort(function(a,b){return group[a]-group[b]});
  var shiplist = [];
  shiplist.push(ships[shipid]);
  for(var i=0;i<list.length;i++){
    shiplist.push(ships[list[i]]);
  }
  var ret = "";
  var namestr="";
  for(var i=0;i<shiplist.length;i++){
    namestr = namestr + "/"+shiplist[i].name.zh_cn + (shiplist[i].name.suffix?shipsuffix[shiplist[i].name.suffix].zh_cn:"");
  }
  ret=ret+namestr.substring(1)+"\n";
  var updatelv="";
  for(var i=0;i<list.length;i++){
    updatelv=updatelv+'/lv.'+group[list[i]];
  }
  ret=ret+"lv.1"+updatelv+"\n";
  var hpstr="";
  for(var i=0;i<shiplist.length;i++){
    hpstr=hpstr+"/"+shiplist[i].stat.hp;
  }
  ret=ret+"耐久："+hpstr.substring(1)+"\n";
  var defstr="";
  for(var i=0;i<shiplist.length;i++){
    defstr=defstr+"/"+shiplist[i].stat.armor_max;
  }
  ret=ret+"装甲："+defstr.substring(1)+"\n";
  var evastr="";
  for(var i=0;i<shiplist.length;i++){
    evastr=evastr+"/"+shiplist[i].stat.evasion_max;
  }
  ret=ret+"回避："+evastr.substring(1)+"\n";

  var carrystr="";
  for(var i=0;i<shiplist.length;i++){
    carrystr=carrystr+"/"+shiplist[i].stat.carry;
  }
  ret=ret+"搭载："+carrystr.substring(1)+"\n";

  var firestr="";
  for(var i=0;i<shiplist.length;i++){
    firestr=firestr+"/"+shiplist[i].stat.fire_max;
  }
  ret=ret+"火力："+firestr.substring(1)+"\n";

  var torpedostr="";
  for(var i=0;i<shiplist.length;i++){
    torpedostr=torpedostr+"/"+shiplist[i].stat.torpedo_max;
  }
  ret=ret+"雷装："+torpedostr.substring(1)+"\n";

  var aastr="";
  for(var i=0;i<shiplist.length;i++){
    aastr=aastr+"/"+shiplist[i].stat.aa_max;
  }
  ret=ret+"对空："+aastr.substring(1)+"\n";

  var aswstr="";
  for(var i=0;i<shiplist.length;i++){
    aswstr=aswstr+"/"+shiplist[i].stat.asw_max;
  }
  ret=ret+"对潜："+aswstr.substring(1)+"\n";

  var luckstr="";
  for(var i=0;i<shiplist.length;i++){
    luckstr=luckstr+"/"+shiplist[i].stat.luck;
  }
  ret=ret+"幸运："+luckstr.substring(1)+"\n";

  var fuelstr="";
  for(var i=0;i<shiplist.length;i++){
    fuelstr=fuelstr+"/"+shiplist[i].consum.fuel;
  }
  ret=ret+"油耗："+fuelstr.substring(1)+"\n";

  var ammostr="";
  for(var i=0;i<shiplist.length;i++){
    ammostr=ammostr+"/"+shiplist[i].consum.ammo;
  }
  ret=ret+"弹耗："+ammostr.substring(1)+"\n";
  callback(ret);
  ret = "";
  setTimeout(function(){
    var equipstr="";
    for(var k=0;k<4;k++){
      for(var i=0;i<shiplist.length;i++){
        equipstr=equipstr+(i==0?"":"/")+getItemNameById(shiplist[i].equip[k])+"("+(shiplist[i].slot[k]?shiplist[i].slot[k]:0)+")";
      }
      equipstr=equipstr+'\n';
    }
    ret=ret+equipstr.substring(1)+"\n";
    callback(ret);
  },500);

}

function getItemNameById(id){
  if(id==undefined){
    return "不可装备";
  }else if(id==''){
    return "未装备";
  }else{
    return items[id].name.zh_cn;
  }
}


function getShipInfo(shipName,callback){
  MongoClient.connect(mongourl, function(err, db) {
    var cl_kancoll_ship = db.collection(collection);
    var query = {'$or':[{"name.zh_cn":new RegExp(shipName)},{"name.ja_jp":new RegExp(shipName)}]};
    cl_kancoll_ship.find(query).toArray(function(err, list) {
      if (list) {
        var map={};
        var set = {};
        for(var i=0;i<list.length;i++){
          var ship = list[i];
          var id = ship.id;
          map[id]=i;
          var remodel=ship.remodel;
          if(remodel.prev){
            set[remodel.prev]=1;
          }else{
            ship.init=true;
          }
          if(remodel.next){
            set[remodel.next]=1;
          }
        }
        for(var i=0;i<list.length;i++){
          delete(set[list[i].id]);
        }
        var needfind = Object.keys(set);
        if(needfind.length==0){

        }else{

        }
      }
    });
  });
}

var ships={};
var items={};
var shipsuffix={};



function loadShip(){
  MongoClient.connect(mongourl, function(err, db) {
    var cl_kancoll_ship = db.collection('cl_kancoll_ship');
    cl_kancoll_ship.find().toArray(function (err, list) {
      for (var i = 0; i < list.length; i++) {
        ships[list[i].id] = list[i];
      }
      var keys = Object.keys(ships);
      for (var i = 0; i < keys.length; i++) {
        var ship = ships[keys[i]];
        var remodel = ship.remodel;
        if(!remodel){
          console.log('no remodel:'+ship.name.zh_cn);
          continue;
        }

        if (!remodel.prev) {
          ship.group = {};
          var next = remodel.next;
          var next_lvl = remodel.next_lvl;
          while (next) {
            var nextship = ships[next];
            nextship.init = keys[i];
            if (!ship.group[nextship.id]) {
              ship.group[nextship.id] = next_lvl;
              remodel = nextship.remodel;
              next = remodel.next;
              next_lvl = remodel.next_lvl;
            }
          }
        }
      }
    });
  });
}

function loadItem(){
  MongoClient.connect(mongourl, function(err, db) {
    var cl_kancoll_item = db.collection('cl_kancoll_item');
    cl_kancoll_item.find().toArray(function (err, list) {
      for (var i = 0; i < list.length; i++) {
        items[list[i].id] = list[i];
      }
    });
  });
}

function loadSuffix(){
  MongoClient.connect(mongourl, function(err, db) {
    var cl_kancoll_shipsuffix = db.collection('cl_kancoll_shipsuffix');
    cl_kancoll_shipsuffix.find().toArray(function (err, list) {
      for (var i = 0; i < list.length; i++) {
        shipsuffix[list[i].id] = list[i];
      }
    });
  });
}




function updateShipDB(){
  var options = {
    hostname: "raw.githubusercontent.com",
    port: 443,
    path: "/TeamFleet/WhoCallsTheFleet/master/app-db/ships.nedb",
    headers: {
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.75 Safari/537.36'
    },
    method: 'GET'
  };
  https.request(options, function (res) {
    res.setEncoding('utf8');
    var resdata = '';
    res.on('data', function (chunk) {
      resdata = resdata + chunk;
    });
    res.on('end', function () {
      saveDB(resdata,'ship');
    });
  }).end();
}

function saveDB(resstr,type){
  var collection;
  if(type=='ship'){
    collection='cl_kancoll_ship';
  }else if(type=='item'){
    collection='cl_kancoll_item';
  }else if(type=='suffix'){
    collection='cl_kancoll_shipsuffix';
  }
  MongoClient.connect(mongourl, function(err, db) {
    var cl_kancoll_ship = db.collection(collection);
    var arr = resstr.split('\n');
    console.log(arr.length);
    for(var i=0;i<arr.length;i++){
      var datastr = arr[i].trim();
      if(datastr.length>5){
        var data = eval('('+datastr+')');
        data.remoteid=data._id;
        data._id=data.id;
        var query = {"_id":data._id};
        updateData(data,cl_kancoll_ship,query)
      }
    }
  });
}

function updateData(data,cl_kancoll_ship,query){
  console.log(query);
  cl_kancoll_ship.findOne(query, function(err, olddata) {
    if (olddata) {
      if(olddata.time_modified<data.time_modified){
        console.log("update ship");
        console.log(data);
        cl_kancoll_ship.save(data);
      }
    }else{
      cl_kancoll_ship.save(data);
    }
  });
}

function updateItemDB(){
  var options = {
    hostname: "raw.githubusercontent.com",
    port: 443,
    path: "/TeamFleet/WhoCallsTheFleet/master/app-db/items.nedb",
    headers: {
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.75 Safari/537.36'
    },
    method: 'GET'
  };
  https.request(options, function (res) {
    res.setEncoding('utf8');
    var resdata = '';
    res.on('data', function (chunk) {
      resdata = resdata + chunk;
    });
    res.on('end', function () {
      saveDB(resdata,'item');
    });
  }).end();
}

function updateSuffixDB(){
  var options = {
    hostname: "raw.githubusercontent.com",
    port: 443,
    path: "/TeamFleet/WhoCallsTheFleet/master/app-db/ship_namesuffix.nedb",
    headers: {
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.75 Safari/537.36'
    },
    method: 'GET'
  };
  https.request(options, function (res) {
    res.setEncoding('utf8');
    var resdata = '';
    res.on('data', function (chunk) {
      resdata = resdata + chunk;
    });
    res.on('end', function () {
      saveDB(resdata,'suffix');
    });
  }).end();
}


module.exports={
  updateShipDB,
  updateItemDB,
  updateSuffixDB,
  kancolleInfo,
  loadShip,
  loadItem,
  loadSuffix,
  searchShipByName
}






