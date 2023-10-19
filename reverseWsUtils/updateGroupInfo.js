let groupInfoHash = {

}

const getGroupInfo = group_id => {
  return groupInfoHash[group_id] && Date.now() < groupInfoHash[group_id].expire ? groupInfoHash[group_id].data : false
}

const updateGroupInfo = (context, ws) => {
  ws.send(JSON.stringify({
    "action": "get_group_info",
    "params": {
      "group_id": context.group_id
    },
    "echo": {
      "source": context,
      "action": "get_group_info"
    }
  }))
}

const updateGroupInfoResponse = context => {
  groupInfoHash[context.data.group_id] = {
    data: context.data,
    expire: Date.now() + 30 * 60 * 1000
  }
  return Object.assign(context.echo.source, {
    mixin_group_info: context.data
  })
}

module.exports = {
  getGroupInfo,
  updateGroupInfo,
  updateGroupInfoResponse
}