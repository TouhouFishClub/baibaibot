const socket = {

}

const socketManager = {
  set(port, ws){
    socket[port] = ws
  },
  get(port) {
    return socket[port]
  }
}

module.exports = socketManager