const { ChatGPTAPI, getOpenAIAuth } =require('chatgpt');

async function example() {
  // use puppeteer to bypass cloudflare (headful because of captchas)
  const openAIAuth = await getOpenAIAuth({
    email: 'rtdfkv5349@outback.asia',
    password: 'Iqacceyw79044'
  })

  const api = new ChatGPTAPI({ ...openAIAuth })
  await api.ensureAuth()

  // send a message and wait for the response
  const response = await api.sendMessage(
    'Write a python version of bubble sort.'
  )

  // response is a markdown-formatted string
  console.log(response)
}