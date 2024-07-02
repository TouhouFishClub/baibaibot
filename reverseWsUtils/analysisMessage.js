const deepMerge = require('./utils/deepMerge')

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
  createAction,
  responseAction
} = require('./manager/actionManager')

const {
  localImageToBase64
} = require('../util/imageToBase64')

const { handle_msg_D2 } = require('../baibai2');
const { saveChat} = require("../ai/chat/collect");

const replaceImageToBase64 = message =>
  message.split('[CQ:image,file=file:').map((sp, index) => {
    if(index) {
      let tsp = sp.split(']'), url = tsp[0]
      tsp[0] = localImageToBase64(url)
      return tsp.join(']')
    }
    return sp
  }).join('[CQ:image,file=base64://')

const sendMessage = (context, ws, port) => {
  // console.log(`======\n[ws message]\n${JSON.stringify(context)}`)
  let { message, message_type, user_id, group_id, sender, mixins, time } = context
  let { card } = sender
  let { group_info, user_info, bot_name } = mixins
  let { group_name } = group_info

  console.log(`\n\n\n\n****user info*****\n\n${JSON.stringify(user_info)}\n\n********\n\n\n\n`)
  let { user_name } = user_info

  console.log(`[ws msg][${group_name}(${group_id})][${card || user_name}(${user_id})]${message}`)

  saveChat(group_id, user_id, card || user_name, message, bot_name, context);

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
  }, group_name, user_name, message_type, port || 30015, context )
}

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
    sendMessage(context, ws)
  }
}

const analysisMessage = async (message, ws, bot_name) => {
  let context = JSON.parse(message.toString())
  // 认为是上报信息
  if(context.post_type) {
    if(context.time * 1000 + 30000 < Date.now()){
      return
    }
    // console.log(`==========\n\n\n\n`)
    // console.log(context)
    // console.log(`\n\n\n\n==========`)
    switch(context.post_type) {
      case 'message':
        // console.log(`======\n[ws message]\n${JSON.stringify(context)}`)
        // 暂时只处理群信息
        if(context.message_type === 'group') {
          // mixinInfos(context, ws)

          let group_info = await createAction({
            "action": "get_group_info",
            "params": {
              "group_id": context.group_id
            }
          }, bot_name)

          let user_info = await createAction({
            "action": "get_user_info",
            "params": {
              "user_id": context.user_id
            },
          }, bot_name)

          context.mixins = {
            group_info,
            user_info,
            bot_name
          }

          sendMessage(context, ws, bot_name)

          // if(context.message === 'HELLO') {
          //   console.log(`\n\n\n TARGET \n\n\n`)
          //   // ws.send(JSON.stringify({
          //   //   "action": "send_message",
          //   //   "params": {
          //   //     "detail_type": "group",
          //   //     "group_id": context.group_id,
          //   //     "message": 'WORLD'
          //   //   }
          //   // }));
          //   console.log(`==================\n[await ws action response]\n\n${JSON.stringify(res)}\n\n`)
          // }
        }
        break
      case 'meta_event':
        console.log(`[ws info][WS META EVENT][${context.meta_event_type}][${JSON.stringify(context.status)}]`)
        break
      default:
        console.log(`[ws info]\n[UNKNOWN POST TYPE]\n[${JSON.stringify(context)}]\n`)
    }
    return
  }

  // 认为是动作返回信息
  if(context.status) {
    if(context?.echo?.action) {
      responseAction(context)
    } else {
      console.log(`[ws info]\n[UNKNOWN ACTION RESPONSE]\n[${JSON.stringify(context)}]\n`)
    }
    return
    // if(context.echo && context.echo.action) {
    //   switch(context.echo.action) {
    //     case 'get_group_info':
    //       mixinInfos(updateGroupInfoResponse(context), ws)
    //       break
    //     case 'get_user_info':
    //       mixinInfos(updateUserInfoResponse(context), ws)
    //       break
    //     default:
    //   }
    // } else {
    //   console.log(`[ws info]\n[UNKNOWN ACTION RESPONSE]\n[${JSON.stringify(context)}]\n`)
    // }
    // return
  }

  console.log(`[ws info]\n[UNKNOWN MESSAGE]\n${message}\n`)
}

module.exports = {
  analysisMessage
}