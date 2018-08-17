const list = [{"jp":"ボルボロス","en":"Barroth","zh":"土砂龍","cn":"土砂龙"},
  {"jp":"イビルジョー","en":"Deviljho","zh":"恐暴龍","cn":"恐暴龙"},
  {"jp":"ラドバルキン","en":"Radobaan","zh":"骨鎚龍","cn":"骨锤龙"},
  {"jp":"ウラガンキン","en":"Uragaan","zh":"爆鎚龍","cn":"爆锤龙"},
  {"jp":"アンジャナフ","en":"Anjanath","zh":"蠻顎龍","cn":"蛮颚龙"},
  {"jp":"ドスギルオス","en":"Great Girros","zh":"大兇顎龍","cn":"大凶颚龙"},
  {"jp":"ドスジャグラス","en":"Great Jagras","zh":"大兇豺龍","cn":"大凶豺龙"},
  {"jp":"ドドガマル","en":"Dodogama","zh":"岩賊龍","cn":"岩贼龙"},
  {"jp":"トビカガチ","en":"Tobi-Kadachi","zh":"飛雷龍","cn":"飞雷龙"},
  {"jp":"オドガロン","en":"Odogaron","zh":"慘爪龍","cn":"惨爪龙"},
  {"jp":"リオレウス","en":"Rathalos","zh":"火龍","cn":"火龙"},
  {"jp":"ディアブロス","en":"Diablos","zh":"角龍","cn":"角龙"},
  {"jp":"レイギエナ","en":"Legiana","zh":"風漂龍","cn":"风漂龙"},
  {"jp":"パオウルムー","en":"Paolumu","zh":"浮空龍","cn":"浮空龙"},
  {"jp":"ディアブロス亜種","en":"Black Diablos","zh":"黑角龍","cn":"黑角龙"},
  {"jp":"リオレイア","en":"Rathian","zh":"雌火龍","cn":"雌火龙"},
  {"jp":"リオレウス亜種","en":"Azure Rathalos","zh":"蒼火龍","cn":"苍火龙"},
  {"jp":"バゼルギウス","en":"Bazelgeuse","zh":"爆鱗龍","cn":"爆鳞龙"},
  {"jp":"リオレイア亜種","en":"Pink Rathian","zh":"櫻火龍","cn":"樱火龙"},
  {"jp":"キリン亜種","en":"","zh":"冰麒麟","cn":"冰麒麟"},
  {"jp":"テオ・テスカトル","en":"Teostra","zh":"炎王龍","cn":"炎王龙"},
  {"jp":"ヴァルハザク","en":"Vaal Hazak","zh":"屍套龍","cn":"尸套龙"},
  {"jp":"ゼノ・ジーヴァ","en":"Xeno'jiiva","zh":"冥燈龍","cn":"冥灯龙"},
  {"jp":"ネルギガンテ","en":"Nergigante","zh":"滅盡龍","cn":"灭尽龙"},
  {"jp":"ゾラ・マグダラオス","en":"Zorah Magdaros","zh":"熔山龍","cn":"熔山龙"},
  {"jp":"クシャルダオラ","en":"Kushala Daora","zh":"鋼龍","cn":"钢龙"},
  {"jp":"キリン","en":"Kirin","zh":"麒麟","cn":"麒麟"},
  {"jp":"マム・タロト","en":"","zh":"爛輝龍","cn":"烂辉龙"},
  {"jp":"ジュラトドス","en":"Jyuratodus","zh":"泥魚龍","cn":"泥鱼龙"},
  {"jp":"ヴォルガノス","en":"Lavasioth","zh":"溶岩龍","cn":"溶岩龙"},
  {"jp":"プケプケ","en":"Pukei-Pukei","zh":"毒妖鳥","cn":"毒妖鸟"},
  {"jp":"ツィツィヤック","en":"Tzitzi-Ya-Ku","zh":"眩鳥","cn":"眩鸟"},
  {"jp":"クルルヤック","en":"Kulu-Ya-Ku","zh":"搔鳥","cn":"搔鸟"},
  {"jp":"ベヒーモス","en":"Behemoth","zh":"貝希摩斯","cn":"贝希摩斯"}]


var mem={};
function searchMHW(content,userid,groupid,callback){
  var retlist = [];
  var first = content.substring(0,1);
  if(first=='w'){
    var m = mem[userid];
    console.log(m);
    var num = parseInt(content.substring(1));
    var d = m[num];
    var ret = d.zh+'\n[CQ:image,file=send/mhw/'+d.en+']';
    callback(ret);
  }else{
    for(var i=0;i<list.length;i++){
      var d = list[i];
      if((d.jp.indexOf(content)>=0)||(d.en.indexOf(content)>=0)||(d.zh.indexOf(content)>=0)||(d.cn.indexOf(content)>=0)){
        retlist.push(d);
      }
    }
    var ret = ''
    if(retlist.length==1){
      ret = retlist[0].cn+'\n[CQ:image,file=send/mhw/monsters/'+retlist[0].en+']';
    }else{
      ret = '请选择：\n';
      for(var i=0;i<retlist.length;i++){
        ret = ret + '`ww'+i+':'+retlist[i].cn+'\n';
      }
      mem[userid] = retlist;
    }
    callback(ret);
  }
}

module.exports={
  searchMHW
}
