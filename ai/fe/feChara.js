var list = [
  {id:0,name:"艾黛尔贾特",img:"0.jpg"},
  {id:1,name:"贝尔娜提塔",img:"1.jpg"},
  {id:2,name:"多洛缇雅",img:"2.jpg"},
  {id:3,name:"菲尔迪南特",img:"3.jpg"},
  {id:4,name:"卡斯帕尔",img:"4.jpg"},
  {id:5,name:"佩托拉",img:"5.jpg"},
  {id:6,name:"林哈尔特",img:"6.jpg"},
  {id:7,name:"修伯特",img:"7.jpg"},
  // {id:8,name:"艾黛尔贾特",img:"0.jpg"},
  // {id:9,name:"艾黛尔贾特",img:"0.jpg"},
  {id:10,name:"帝弥托利",img:"10.jpg"},
  {id:11,name:"杜笃",img:"11.jpg"},
  {id:12,name:"希尔凡",img:"12.jpg"},
  {id:13,name:"英谷莉特",img:"13.jpg"},
  {id:14,name:"雅尼特",img:"14.jpg"},
  {id:15,name:"梅尔赛德斯",img:"15.jpg"},
  {id:16,name:"菲力克斯",img:"16.jpg"},
  {id:17,name:"亚修",img:"17.jpg"},
  // {id:18,name:"艾黛尔贾特",img:"0.jpg"},
  // {id:19,name:"艾黛尔贾特",img:"0.jpg"},
  {id:20,name:"库罗德",img:"20.jpg"},
  {id:21,name:"洛廉兹",img:"21.jpg"},
  {id:22,name:"莉丝缇亚",img:"22.jpg"},
  {id:23,name:"雷欧妮",img:"23.jpg"},
  {id:24,name:"拉斐尔",img:"24.jpg"},
  {id:25,name:"伊古纳兹",img:"25.jpg"},
  {id:26,name:"玛莉安奴",img:"26.jpg"},
  {id:27,name:"希尔妲",img:"27.jpg"},
  // {id:28,name:"艾黛尔贾特",img:"0.jpg"},
  // {id:29,name:"艾黛尔贾特",img:"0.jpg"},
  {id:30,name:"西提司",img:"30.jpg"},
  {id:31,name:"芙莲",img:"31.jpg"},
  {id:32,name:"汉尼曼",img:"32.jpg"},
  {id:33,name:"玛努艾拉",img:"33.jpg"},
  {id:34,name:"锥里尔",img:"34.jpg"},
  {id:35,name:"蕾雅",img:"35.jpg"},
  {id:36,name:"阿罗伊斯",img:"36.jpg"},
  {id:37,name:"萨米亚",img:"37.jpg"},
  {id:38,name:"卡多莉奴",img:"38.jpg"},
  {id:39,name:"吉尔伯特",img:"39.jpg"},
]



var mem={};
function searchFeChara(content,userid,groupid,callback){
  var retlist = [];
  var first = content.substring(0,1);
  if(first=='x'){
    var m = mem[groupid];
    console.log(m);
    var num = parseInt(content.substring(1));
    var d = m[num];
    var ret = d.name+'\n[CQ:image,file=send/fe/chara/'+d.img+']';
    callback(ret);
  }else{
    for(var i=0;i<list.length;i++){
      var d = list[i];
      if((d.name.indexOf(content)>=0)){
        retlist.push(d);
      }
    }
    var ret = ''
    if(retlist.length==1){
      ret = retlist[0].name+'\n[CQ:image,file=send/fe/chara/'+retlist[0].img+']';
    }else{
      ret = '请选择：\n';
      for(var i=0;i<retlist.length;i++){
        ret = ret + 'fe'+i+':'+retlist[i].name+'\n';
      }
      mem[groupid] = retlist;
    }
    callback(ret);
  }
}

module.exports={
  searchFeChara
}


