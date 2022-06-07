const list = [
  "馄饨",
  "拉面",
  "烩面",
  "热干面",
  "刀削面",
  "油泼面",
  "炸酱面",
  "炒面",
  "重庆小面",
  "米线",
  "酸辣粉",
  "土豆粉",
  "螺狮粉",
  "凉皮儿",
  "麻辣烫",
  "肉夹馍",
  "羊肉汤",
  "炒饭",
  "盖浇饭",
  "卤肉饭",
  "烤肉饭",
  "黄焖鸡米饭",
  "驴肉火烧",
  "川菜",
  "麻辣香锅",
  "火锅",
  "酸菜鱼",
  "烤串",
  "披萨",
  "烤鸭",
  "汉堡",
  "炸鸡",
  "寿司",
  "蟹黄包",
  "煎饼果子",
  "生煎",
  "炒年糕",
  "卤煮火烧",
  "春卷",
  "肠粉",
  "豆汁",
  "酸梅汤",
  "煲仔饭",
  "担担面",
  "小笼包",
  "莲子粥",
  "豌豆糕",
  "手抓饼",
  "菠萝饭",
  "臭豆腐",
  "烤苕皮",
  "胡辣汤",
  "炸鸡排",
  "牛杂",
  "米粉",
  "灌汤包",
  "锅盔",
  "串串香",
  "羊肉泡馍",
  "biangbiang面",
  "鸡蛋仔",
  "辣鱼蛋",
  "糖油粑粑",
  "棒棒鸡",
  "水果捞",
  "烤脑花",
  "爆米花",
  "我两拳"
]
let hash = {

}

const fs = require('fs'),
const chishenme = (qq, st, callback, hasMine = true) => {
  let r
  if(st.match('嘉然') && Math.random() > 0.4) {
    r = `${st}${hasMine ? '我' : ''}两拳`
  } else {

    if(Math.random()<0.1){
      r = `${st}${list[parseInt(Math.random() * list.length)]}`
    }else{
      fs.readdir('../coolq-data/cq/data/image/send/food/', function (err, files) {
        var len = files.length;
        var rdfile = files[Math.floor(Math.random() * len)];
        var imgret = '' + '[CQ:'+imgtype+',file=send/setu/' + rdfile + ']';
        r = imgret+'\n'+st+rdfile;
      })
    }






  }
  let c = 1
  if(hash[qq]) {
    if(hash[qq].st == st) {
      c = hash[qq].c + 1
      if(c > 3 && hash[qq].exp > Date.now()) {
        r = hash[qq].r
        callback(`${r}，爱吃不吃`)
        return
      }
    }
  }
  hash[qq] = {
    st,
    c,
    exp: Date.now() + 30 * 60 * 1000,
    r
  }
  callback(r)
}




function getdouguo(c){
  var url = "https://www.douguo.com/zuixin/"+c;
  request({
    url: url,
    method: "GET",
    headers:{
      'User-Agent':'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/67.0.3396.99 Safari/537.36'
    }
  }, function(error, response, body) {
    if (error && error.code) {
      console.log('pipe error catched!')
      console.log(error);
    } else {
      var n1 = body.indexOf('<h2 class="title">最新菜谱 </h2>');
      if(n1>10){
        var s1 = body.substring(n1+3);
        var ss = '<img src="https://cp1.douguo.com/upload';
        var s2 = s1;
        var n0 = s2.indexOf(ss);
        while(n0>1){
          var s3 = s2.substring(n0);
          var n2 = s3.indexOf('>');
          var sq = s3.substring(0,n2);
          var s4 = s3.substring(n2+4);
          s2 = s4;
          n0 = s2.indexOf(ss);
          var n5 = sq.indexOf('"');
          var s5 = sq.substring(n5+1);
          var n6 = s5.indexOf('"');
          var img = s5.substring(0,n6);
          var s6 = s5.substring(n6+1);
          var n7 = s6.indexOf('"');
          var s7 = s6.substring(n7+1);
          var n8 = s7.indexOf('"');
          var name = s7.substring(0,n8);
          console.log(img,name);
          var n9 = name.lastIndexOf('#');
          if(n9>0){
            name = name.substring(n9+1);
          }
          var fn = "food/"+name;
          console.log(fn);
          if(name.length>0){
            var imgreq = request({
              url: img,
              method: "GET"
            }, function(error, response, body){
              if(error&&error.code){
                console.log('pipe error catched!')
                console.log(error);
              }
            }).pipe(fs.createWriteStream(fn));
          }



        }
      }

    }
    getdouguo(c+24);
  });
}











module.exports = {
  chishenme
}