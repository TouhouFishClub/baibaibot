const OpenAI = require('openai-api');
const {secret} = require('../../secret');
const OPENAI_API_KEY =  secret.u5;
const openai = new OpenAI(OPENAI_API_KEY);

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

async function getChatgptReplay(content,gid,qq,callback){
  if((qq+"").startsWith("35747")){
    content = content.trim();
    var rd = await getai(content);
    var txt = rd.choices[0].text;
    var ret = txt;
    callback(ret);
  }
}


module.exports={
  getChatgptReplay
}
