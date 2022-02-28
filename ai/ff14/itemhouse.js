var request = require('request');

function searchFF14HouseItem(content,gid,uid,callback){
  content="桌";
  var url = 'http://cn.ff14housing.com/itemlist.php?q='+encodeURIComponent(content)+'&seach=';

  request({
    url: url,
    method: "GET"
  }, function(error, response, body){
    if(error&&error.code){
      console.log('pipe error catched!')
      console.log(error);
    }else{
      //console.log(body);
      var n1 = body.indexOf('<!-- Item List -->');
      var s1 = body.substring(n1+2);
      //console.log(s1.substring(0,2000));
      var sa = s1.split('<img src="./images/pic/');
      for(var i=0;i<sa.length;i++){
        var n2 = sa[i].indexOf('/>')
        console.log(sa[i].substring(0,n2));
      }
    }
  })
}
searchFF14HouseItem()

module.exports={
  searchFF14HouseItem
}