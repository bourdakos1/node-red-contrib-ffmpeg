module.exports = RED => {
  const { spawn } = require('child_process')
  const ws = require('ws')
  const url = require('url')

  const TELLO_VIDEO_PORT = 11111
  const TELLO_HOST = '192.168.10.1'

  console.log(RED.settings.uiPort)

  const HOST = '0.0.0.0'
  const PORT = RED.settings.uiPort
  const STREAM = `stream_${(1 + Math.random() * 4294967295).toString(16)}`

  var serverUpgradeAdded = false
  var listenerNodes = {}

  function handleServerUpgrade(request, socket, head) {
    const pathname = url.parse(request.url).pathname
    if (listenerNodes.hasOwnProperty(pathname)) {
      listenerNodes[pathname].server.handleUpgrade(
        request,
        socket,
        head,
        ws => {
          listenerNodes[pathname].server.emit('connection', ws, request)
        }
      )
    } else {
      // Don't destroy the socket as other listeners may want to handle the
      // event.
    }
  }

  function ObjectDetectionNode(config) {
    RED.nodes.createNode(this, config)
    this.path = config.path
    const node = this

    ////////////////////////////////////////////////////////////////////////////
    node._clients = {}
    function handleConnection(/*socket*/ socket) {
      var id = (1 + Math.random() * 4294967295).toString(16)
      node._clients[id] = socket

      socket.on('close', function() {
        delete node._clients[id]
      })
    }

    if (!serverUpgradeAdded) {
      RED.server.on('upgrade', handleServerUpgrade)
      serverUpgradeAdded = true
    }

    var path = RED.settings.httpNodeRoot || '/'
    path =
      path +
      (path.slice(-1) == '/' ? '' : '/') +
      (node.path.charAt(0) == '/' ? node.path.substring(1) : node.path)
    node.fullPath = path

    if (listenerNodes.hasOwnProperty(path)) {
      node.error(RED._('websocket.errors.duplicate-path', { path: node.path }))
      return
    }
    listenerNodes[node.fullPath] = node
    var serverOptions = {
      noServer: true
    }
    if (RED.settings.webSocketNodeVerifyClient) {
      serverOptions.verifyClient = RED.settings.webSocketNodeVerifyClient
    }
    // Create a WebSocket Server
    node.server = new ws.Server(serverOptions)
    node.server.setMaxListeners(0)
    node.server.on('connection', handleConnection)

    node.on('close', function() {
      delete listenerNodes[node.fullPath]
      node.server.close()
    })
    ////////////////////////////////////////////////////////////////////////////

    node.status({ fill: 'grey', shape: 'ring', text: 'model loading...' })

    RED.httpNode.post(`/${STREAM}`, (req, res) => {
      res.connection.setTimeout(0)
      req.on('data', data => {
        try {
          for (let client in this._clients) {
            if (this._clients.hasOwnProperty(client)) {
              this._clients[client].send(data)
            }
          }
        } catch (e) {
          // swallow any errors
        }
      })
    })

    // spawn('ffmpeg', [
    //   '-hide_banner',
    //   '-f',
    //   'v4l2',
    //   '-framerate',
    //   '25',
    //   '-video_size',
    //   '640x640',
    //   '-i',
    //   '/dev/video0',
    //   '-f',
    //   'mpegts',
    //   '-codec:v',
    //   'mpeg1video',
    //   '-s',
    //   '640x640',
    //   // '1280x720',
    //   '-b:v',
    //   '10m',
    //   '-bf',
    //   '0',
    //   '-q',
    //   '4', // 1 to 31
    //   `http://${HOST}:${PORT}/${STREAM}`
    // ])

    spawn('ffmpeg', [
      '-hide_banner',
      '-i',
      `udp://${TELLO_HOST}:${TELLO_VIDEO_PORT}`,
      '-f',
      'mpegts',
      '-codec:v',
      'mpeg1video',
      '-s',
      '640x480',
      '-b:v',
      '800k',
      '-bf',
      '0',
      '-r',
      '20',
      `http://${HOST}:${PORT}/${STREAM}`
    ])
  }

  RED.nodes.registerType('ffmpeg-stream', ObjectDetectionNode)
}
