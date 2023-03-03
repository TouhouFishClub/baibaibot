const {secret} = require('../../secret');
const OPENAI_API_KEY =  secret.u5;
var request = require('request')
//const OpenAI = require('openai-api');
//const openai = new OpenAI(OPENAI_API_KEY);

async function getai(content) {
  const gptResponse = await openai.complete({
    engine: 'text-davinci-003',
    prompt: content,
    maxTokens: 700,
    temperature: 0.7,
    topP: 1,
    presencePenalty: 0,
    frequencyPenalty: 0,
    bestOf: 1,
    n: 1,
    stream: false,
    stop: ['tttt']
  });
  return gptResponse.data;

}

async function NogetChatgptReplay(content,gid,qq,callback){
  if((qq+"").startsWith("35747")){
    content = content.trim();
    var rd = await getai(content);
    var txt = rd.choices[0].text;
    var ret = txt;
    callback(ret);
  }
}

function getChatgptReplay(content,gid,qq,callback){
  var url = 'https://api.openai.com/v1/chat/completions'
  var bd = {
    "model": "gpt-3.5-turbo",
    "messages": [{"role": "user", "content": content}]
  }
  request({
    url: url,
    method: "POST",
    headers: {
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/67.0.3396.99 Safari/537.36',
      'content-type': 'application/json',
      'Authorization': 'Bearer '+OPENAI_API_KEY
    },
    proxy: 'http://192.168.17.241:2346',
    body: JSON.stringify(bd)
  }, function (error, response, resbody) {
    if (error && error.code) {
      console.log('pipe error catched!')
      console.log(error);
    } else {
      var data = eval('(' + resbody + ')');
      console.log(data.choices[0])
      var txt = data.choices[0].message.content;
      var ret = txt;
      callback(ret);
    }
  });
}

module.exports={
  getChatgptReplay
}
