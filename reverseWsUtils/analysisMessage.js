const {
  getGroupInfo,
  updateGroupInfo,
  updateGroupInfoResponse
} = require('./updateGroupInfo')

const {
  getUserInfo,
  updateUserInfo,
  updateUserInfoResponse
} = require('./updateUserInfo')

const { handle_msg_D2 } = require('../baibai2');

const mixinInfos = (context, ws) => {
  if(!context.mixin_group_info) {
    let groupInfo = getGroupInfo(context.group_id)
    if(groupInfo) {
      context.mixin_group_info = groupInfo
    } else {
      updateGroupInfo(context, ws)
      return
    }
  }
  if(!context.mixin_user_info) {
    let userInfo = getUserInfo(context.user_id)
    if(userInfo) {
      context.mixin_user_info = userInfo
    } else {
      updateUserInfo(context, ws)
      return
    }
  }

  if(context) {
    // console.log(`======\n${JSON.stringify(context)}`)
    // (content,from,name,groupid,callback,groupName,nickname,msgType,port,msgObjSource)
    let { message, message_type, user_id, group_id, sender, mixin_group_info, mixin_user_info } = context
    let { card } = sender
    let { group_name } = mixin_group_info
    let { user_name } = mixin_user_info

    handle_msg_D2(message, user_id, card || user_name, group_id, (d) => {
      console.log(`===\nwill send\n${d}\n===`)
    }, group_name, user_name, message_type, 30015, context )
  }
}

const analysisMessage = (message, ws) => {
  let context = JSON.parse(message.toString())
  // 认为是上报信息
  if(context.post_type) {
    switch(context.post_type) {
      case 'message':
        mixinInfos(context, ws)
        //
        // if(context.message == 'HELLO') {
        //   console.log(`\n\n\n TARGET \n\n\n`)
        //   // ws.send(JSON.stringify({
        //   //   "action": "send_message",
        //   //   "params": {
        //   //     "detail_type": "group",
        //   //     "group_id": context.group_id,
        //   //     "message": 'WORLD'
        //   //   }
        //   // }));
        // }
        break
      case 'meta_event':
        console.log(`[WS META EVENT][${context.meta_event_type}][${JSON.stringify(context.status)}]`)
        break
      default:
        console.log(`\n[UNKNOWN POST TYPE]\n[${JSON.stringify(context)}]\n`)
    }

    return
  }

  // 认为是动作返回信息
  if(context.status) {
    if(context.echo && context.echo.action) {
      switch(context.echo.action) {
        case 'get_group_info':
          mixinInfos(updateGroupInfoResponse(context), ws)
          break
        case 'get_user_info':
          mixinInfos(updateUserInfoResponse(context), ws)
          break
        default:
      }
    } else {
      console.log(`\n[UNKNOWN ACTION RESPONSE]\n[${context}]\n`)
    }
    return
  }

  console.log(`\n[UNKNOWN MESSAGE]\n${message}\n`)
}

module.exports = {
  analysisMessage
}