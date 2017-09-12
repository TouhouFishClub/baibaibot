const adventure = require('./actions/adventure')

const DQCore = (userId, content, callback) => {
  const sp = content.trim().split(' ')
  switch(sp[0]){
    case '冒险':
      return adventure(userId)
  }
}

const allGameAction = {
  '冒险': 1
}

module.exports = {
  DQCore,
  allGameAction
}