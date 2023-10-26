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

const {
  localImageToBase64
} = require('../util/imageToBase64')

const { handle_msg_D2 } = require('../baibai2');

const replaceImageToBase64 = message =>
  message.split('[CQ:image,file=file:').map((sp, index) => {
    if(index) {
      let tsp = sp.split(']'), url = tsp[0]
      tsp[0] = localImageToBase64(url)
      return tsp.join(']')
    }
    return sp
  }).join('[CQ:image,file=base64://')

const sendMessage = (context, ws) => {
  console.log(`======\n[ws message]\n${JSON.stringify(context)}`)
  let { message, message_type, user_id, group_id, sender, mixins } = context
  let { card } = sender
  let { group_info, user_info } = mixins
  let { group_name } = group_info
  let { user_name } = user_info

  console.log(`[ws msg][${group_name}(${group_id})][${card || user_name}(${user_id})]${message}`)

  handle_msg_D2(message, user_id, card || user_name, group_id, msg => {
    msg = msg
      .replace(/CQ:image,file=sen/gi, "CQ:image,file=file:/home/flan/baibai/coolq-data/cq/data/image/sen")
      .replace(/CQ:cardimage,file=sen/gi, "CQ:cardimage,file=file:/home/flan/baibai/coolq-data/cq/data/image/sen")
      .replace(/CQ:record,file=sen/gi, "CQ:record,file=file:/home/flan/baibai/coolq-data/cq/data/record/sen")

    // console.log(`===\nwill send\n${msg}\n===`)
    console.log(`[ws send][${group_name}(${group_id})]${msg}`)
    let message = msg
    if(msg.indexOf('[CQ:image,file') > -1){
      message = replaceImageToBase64(msg)
      // console.log(`检测到图片，转化为以下格式：\n${message}`)
    }
    ws.send(JSON.stringify({
      "action": "send_message",
      "params": {
        "detail_type": "group",
        "group_id": group_id,
        "message": message
      }
    }));
  }, group_name, user_name, message_type, 30015, context )
}

const mixinInfos = (context, ws) => {
  if(!context?.mixins?.group_info) {
    let group_info = getGroupInfo(context.group_id)
    if(group_info) {
      context.mixins = Object.assign(
        context.mixins,
        group_info
      )
    } else {
      updateGroupInfo(context, ws)
      return
    }
  }
  if(!context?.mixins?.user_info) {
    let user_info = getUserInfo(context.user_id)
    if(user_info) {
      context.mixins = Object.assign(
        context.mixins,
        user_info
      )
    } else {
      updateUserInfo(context, ws)
      return
    }
  }
  if(context) {
    sendMessage(context, ws)
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
      console.log(`\n[UNKNOWN ACTION RESPONSE]\n[${JSON.stringify(context)}]\n`)
    }
    return
  }

  console.log(`\n[UNKNOWN MESSAGE]\n${message}\n`)
}

module.exports = {
  analysisMessage
}