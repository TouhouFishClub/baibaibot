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
  localImageToBase64,
  localAssetsToBase64
} = require('../util/imageToBase64')

// 延迟加载以避免循环依赖
// const { handle_msg_D2 } = require('../baibai2');
const { saveChat} = require("../ai/chat/collect");

// AI 对话模块
const { 
  isAIEnabled, 
  enhanceReply,
  resetMessageCount,
  handleProactiveReply,
  checkMentionTrigger,
  generateMentionReply
} = require('../ai/chat/core/aiChat');

const replaceImageToBase64 = message =>
  message.split('[CQ:image,file=file:').map((sp, index) => {
    if(index) {
      let tsp = sp.split(']'), url = tsp[0]
      tsp[0] = localImageToBase64(url)
      return tsp.join(']')
    }
    return sp
  }).join('[CQ:image,file=base64://')

const replaceRecordToBase64 = message =>
  message.split('[CQ:record,file=file:').map((sp, index) => {
    if(index) {
      let tsp = sp.split(']'), url = tsp[0]
      tsp[0] = localAssetsToBase64(url)
      return tsp.join(']')
    }
    return sp
  }).join('[CQ:record,file=base64://')

const sendMessage = (context, ws, port, oneBotVersion) => {
  // if(port === 'mine'){
  //   console.log(`======\n[ws message]\n${JSON.stringify(context)}`)
  // }
  let { raw_message, message_type, user_id, group_id, sender, mixins, time } = context
  // if(port === 'mine'){
  //   console.log(`\n\n\n\n****CONTEXT*****\n\n${JSON.stringify(context)}\n\n********\n\n\n\n`)
  // }
  let { card, nickname } = sender
  let { group_info, user_info, bot_name } = mixins
  // if(port === 'mine'){
  //   console.log(`\n\n\n\n****MIXINS*****\n\n${JSON.stringify(mixins)}\n\n********\n\n\n\n`)
  // }

  var group_name;
  if(group_info){
    group_name= group_info.group_name
  }else{
    group_name = "no_group_name";
  }
  
  // console.log(`\n\n\n\n****user info*****\n\n${JSON.stringify(user_info)}\n\n********\n\n\n\n`)
  let { user_name } = user_info || {user_name: '未知'}

  console.log(`[ws msg][${port}][${group_name}(${group_id})][${card || nickname || user_name}(${user_id})]${raw_message}`)

  saveChat(group_id, user_id, card || nickname || user_name, raw_message, bot_name, context);

  // 延迟加载 handle_msg_D2 以避免循环依赖
  const { handle_msg_D2 } = require('../baibai2');
  
  // 定义发送消息的回调函数
  const sendCallback = async (msg) => {
    if(!msg) {
      return
    }
    
    // AI 对话增强：如果群启用了 AI 对话，优化回复内容
    // 但如果消息只包含 CQ 码（图片、语音等），则跳过优化
    if (isAIEnabled(group_id)) {
      // 检查消息是否只包含 CQ 码，去除所有 [CQ:...] 后看是否还有文本内容
      const textContent = msg.replace(/\[CQ:[^\]]+\]/g, '').trim()
      
      if (textContent.length > 0) {
        // 有文本内容，进行 AI 优化
        try {
          console.log(`[AI Chat] 群 ${group_id} 正在优化回复...`)
          msg = await enhanceReply(msg, group_id, port)
          resetMessageCount(group_id)
          console.log(`[AI Chat] 优化完成`)
        } catch (error) {
          console.error('[AI Chat] 优化回复失败，使用原始回复:', error.message)
        }
      } else {
        // 只有 CQ 码（图片、语音等），跳过优化，但仍重置计数
        console.log(`[AI Chat] 群 ${group_id} 消息仅包含媒体内容，跳过优化`)
        resetMessageCount(group_id)
      }
    }
    
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
    if(msg.indexOf('[CQ:record,file') > -1){
      message = replaceRecordToBase64(msg)
    }
    let sendBody
    if(oneBotVersion === 12) {
      sendBody = {
        "action": "send_message",
        "params": {
          "detail_type": "group",
          "group_id": group_id,
          "message": message
        }
      }
    } else {
      sendBody = {
        "action": "send_msg",
        "params": {
          "message_type": "group",
          "group_id": group_id,
          "message": message
        }
      }
    }
    saveChat(group_id, 10000, `百百${port}`, msg, port);
    ws.send(JSON.stringify(sendBody));
  }
  
  // 检查是否触发了 AI 对话（以"百百"开头或 @ 了机器人）
  if (isAIEnabled(group_id) && checkMentionTrigger(raw_message)) {
    console.log(`[AI Chat] 群 ${group_id} 检测到呼叫百百，生成 AI 回复...`)
    // 异步生成 AI 回复
    ;(async () => {
      try {
        const reply = await generateMentionReply(
          raw_message, 
          group_id, 
          port, 
          card || nickname || user_name
        )
        if (reply) {
          await sendCallback(reply)
        }
      } catch (error) {
        console.error('[AI Chat] 生成呼叫回复失败:', error.message)
      }
    })()
    // 仍然调用 handle_msg_D2，以便其他模块也能处理（如果有匹配的命令）
  }
  
  handle_msg_D2(raw_message, user_id, card || nickname || user_name, group_id, sendCallback, group_name, user_name, message_type, port || 30015, context)
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

const analysisMessage = async (message, ws, bot_name, oneBotVersion = 12) => {
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
        if(context.message_type === 'private') {
          console.log(context);
          var user_id = context.user_id;
          if(!(user_id+"").startsWith("35747")){
            return
          }
          var user_name = context.sender.nickname;
          var botid = context.self_id;
          var raw_message = context.raw_message;


          const { handle_msg_D2 } = require('../baibai2');
          handle_msg_D2(raw_message, user_id, user_name, user_id, msg => {
            if(!msg) {
              return
            }
            msg = msg
              .replace(/CQ:image,file=sen/gi, "CQ:image,file=file:/home/flan/baibai/coolq-data/cq/data/image/sen")
              .replace(/CQ:cardimage,file=sen/gi, "CQ:cardimage,file=file:/home/flan/baibai/coolq-data/cq/data/image/sen")
              .replace(/CQ:record,file=sen/gi, "CQ:record,file=file:/home/flan/baibai/coolq-data/cq/data/record/sen")

            // console.log(`===\nwill send\n${msg}\n===`)
            console.log(`[ws private send][${user_name}(${user_id})]${msg}`)
            let message = msg
            if(msg.indexOf('[CQ:image,file') > -1){
              message = replaceImageToBase64(msg)
              // console.log(`检测到图片，转化为以下格式：\n${message}`)
            }
            if(msg.indexOf('[CQ:record,file') > -1){
              message = replaceRecordToBase64(msg)
            }
            let sendBody
            if(oneBotVersion === 12) {
              sendBody = {
                "action": "send_message",
                "params": {
                  "detail_type": "private",
                  "user_id": user_id,
                  "message": message
                }
              }
            } else {
              sendBody = {
                "action": "send_msg",
                "params": {
                  "message_type": "private",
                  "user_id": user_id,
                  "message": message
                }
              }
            }
            //saveChat(group_id, 10000, `百百${port}`, msg, port);
            ws.send(JSON.stringify(sendBody));
          }, user_name, user_name, context.message_type, bot_name, context )
        }else
        if(context.message_type === 'group') {
          // mixinInfos(context, ws)
          var groupid = context.group_id;
          if((groupid+"").startsWith("20570")){
            if(bot_name!=25334){
              return
            }
          }
          if(bot_name==25334){
            if((groupid+"").startsWith("20570")||(groupid+"").startsWith("22169")){

            }else{
              //return
            }
          }

          // 获取群信息，添加错误处理
          let group_info = null
          try {
            group_info = await createAction({
              "action": "get_group_info",
              "params": {
                "group_id": context.group_id
              }
            }, bot_name)
          } catch (error) {
            console.warn(`[WS] 获取群信息失败 [群ID: ${context.group_id}]:`, error.message)
            group_info = { group_name: `群${context.group_id}` } // 提供默认值
          }

          // 获取用户信息，添加错误处理
          let user_info = null
          try {
            user_info = await createAction({
              "action": oneBotVersion === 12 ? "get_user_info" : "get_stranger_info",  // 修复：去掉多余空格
              "params": {
                "user_id": context.user_id
              },
            }, bot_name)
          } catch (error) {
            console.warn(`[WS] 获取用户信息失败 [用户ID: ${context.user_id}]:`, error.message)
            user_info = { nickname: `用户${context.user_id}` } // 提供默认值
          }

          context.mixins = {
            group_info,
            user_info,
            bot_name
          }

          sendMessage(context, ws, bot_name, oneBotVersion)

          // AI 主动回复检查：如果群启用了 AI 对话，检查是否需要主动回复
          if (isAIEnabled(context.group_id)) {
            setTimeout(async () => {
              try {
                // 创建发送回调函数
                const proactiveSendCallback = async (msg) => {
                  if (!msg) return
                  
                  msg = msg
                    .replace(/CQ:image,file=sen/gi, "CQ:image,file=file:/home/flan/baibai/coolq-data/cq/data/image/sen")
                    .replace(/CQ:cardimage,file=sen/gi, "CQ:cardimage,file=file:/home/flan/baibai/coolq-data/cq/data/image/sen")
                    .replace(/CQ:record,file=sen/gi, "CQ:record,file=file:/home/flan/baibai/coolq-data/cq/data/record/sen")
                  
                  console.log(`[AI Chat][主动回复][${group_info?.group_name || context.group_id}]${msg}`)
                  
                  let message = msg
                  if (msg.indexOf('[CQ:image,file') > -1) {
                    message = replaceImageToBase64(msg)
                  }
                  if (msg.indexOf('[CQ:record,file') > -1) {
                    message = replaceRecordToBase64(msg)
                  }
                  
                  let sendBody
                  if (oneBotVersion === 12) {
                    sendBody = {
                      "action": "send_message",
                      "params": {
                        "detail_type": "group",
                        "group_id": context.group_id,
                        "message": message
                      }
                    }
                  } else {
                    sendBody = {
                      "action": "send_msg",
                      "params": {
                        "message_type": "group",
                        "group_id": context.group_id,
                        "message": message
                      }
                    }
                  }
                  saveChat(context.group_id, 10000, `百百${bot_name}`, msg, bot_name)
                  ws.send(JSON.stringify(sendBody))
                }
                
                await handleProactiveReply(context.group_id, context.user_id, bot_name, proactiveSendCallback)
              } catch (error) {
                console.error('[AI Chat] 主动回复检查失败:', error.message)
              }
            }, 1000)
          }

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
        console.log(`[ws info][WS META EVENT][${bot_name}][${context.meta_event_type}][${JSON.stringify(context.status)}]`)
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