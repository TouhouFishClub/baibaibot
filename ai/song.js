var http = require('http');
var https = require('https');
const Axios = require('axios')


function searchSongByName(userName,songName,callback){
  var param = 's=aaa&type=1';
  getSong(param).then(function(data){
    var code = data.code;
    if(code==200){
      if(data.result.songs){
        var song = data.result.songs[0];
        console.log(song);
        var id = song.id;
        var songurl = 'http://music.163.com/song?id='+id;
        callback(songurl);
      }else{
        callback('不知道'+songName+'是什么歌哇！'+userName+'唱给我听好不好哇！')
      }
    }else{
      callback('不知道'+songName+'是什么歌哇！'+userName+'唱给我听好不好哇！')
    }
  })


}

const getSong = param =>
  new Promise((resolve, reject) => {
    Axios.post('https://music.163.com/api/search/pc',param, {
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.75 Safari/537.36'
      }
    })
      .then(response => resolve(response.data))
      .catch(error => {
        console.log(error)
      })
  })

module.exports={
  searchSongByName
}