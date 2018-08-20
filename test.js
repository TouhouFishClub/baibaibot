const ignoreUser = require('./ai/ignoreUser')

const callback = msg => {
  console.log(msg)
}

ignoreUser(10000, 7998, 'aaa', callback)
ignoreUser(10000, 7998, 'aaa', callback)
ignoreUser(10000, 7998, 'aaa', callback)
ignoreUser(10000, 7998, 'aaa', callback)
ignoreUser(10000, 7998, 'aaa', callback)
