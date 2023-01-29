const OpenAI = require('openai-api');
var secret = require('../../secret');
const OPENAI_API_KEY =  secret.u5;
const openai = new OpenAI(OPENAI_API_KEY);

async function getai(content) {
  const gptResponse = await openai.complete({
    engine: 'text-davinci-003',
    prompt: content,
    maxTokens: 800,
    temperature: 0.7,
    topP: 1,
    presencePenalty: 0,
    frequencyPenalty: 0,
    bestOf: 1,
    n: 1,
    stream: false,
    stop: ['\n']
  });
  return gptResponse.data;

}

function getChatgptReplay(content,gid,qq,callback){
  content = content.trim();
  var rd = getai(content);
  var choices = rd.choices;
  var ret = choices.join('\n');
  console.log(ret);
}

getChatgptReplay('讲个笑话吧','ss','ww',function(r){console.log(r)})

module.exports={
  getChatgptReplay
}
