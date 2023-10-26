let userInfoHash = {

}

const getUserInfo = user_id => {
  return userInfoHash[user_id] && Date.now() < userInfoHash[user_id].expire ? userInfoHash[user_id].data : false
}

const updateUserInfo = (context, ws) => {
  ws.send(JSON.stringify({
    "action": "get_user_info",
    "params": {
      "user_id": context.user_id
    },
    "echo": {
      "source": context,
      "action": "get_user_info"
    }
  }))
}
const updateUserInfoResponse = context => {
  userInfoHash[context.data.user_id] = {
    data: context.data,
    expire: Date.now() + 30 * 60 * 1000
  }

  return Object.assign(
    context.echo.source,
    Object.assign({}, {
      mixins : {
        user_info: context.data
      }
    })
  )
}

module.exports = {
  getUserInfo,
  updateUserInfo,
  updateUserInfoResponse
}