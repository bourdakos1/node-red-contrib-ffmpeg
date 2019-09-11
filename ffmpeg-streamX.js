module.exports = RED => {
  const { spawn } = require('child_process')
  const ws = require('ws')
  var url = require('url')

  const TELLO_VIDEO_PORT = 11111
  const TELLO_HOST = '192.168.10.1'

  const HOST = 'localhost'
  const PORT = 1880

  var serverUpgradeAdded = false
  function handleServerUpgrade(request, socket, head) {
    const pathname = url.parse(request.url).pathname
    if (listenerNodes.hasOwnProperty(pathname)) {
      listenerNodes[pathname].server.handleUpgrade(
        request,
        socket,
        head,
        function done(ws) {
          listenerNodes[pathname].server.emit('connection', ws, request)
        }
      )
    } else {
      // Don't destroy the socket as other listeners may want to handle the
      // event.
    }
  }
  var listenerNodes = {}

  function ObjectDetectionNode(config) {
    RED.nodes.createNode(this, config)
    this.path = config.path
    const node = this

    ////////////////////////////////////////////////////////////////////////////
    // node._clients = {}
    // function handleConnection(/*socket*/ socket) {
    //   console.log('Client has been connected')
    //   var id = (1 + Math.random() * 4294967295).toString(16)
    //   node._clients[id] = socket
    //   node.emit('opened', {
    //     count: Object.keys(node._clients).length,
    //     id: id
    //   })

    //   socket.on('close', function() {
    //     delete node._clients[id]
    //     node.emit('closed', {
    //       count: Object.keys(node._clients).length,
    //       id: id
    //     })
    //   })
    //   socket.on('message', function(data, flags) {
    //     node.handleEvent(id, socket, 'message', data, flags)
    //   })
    //   socket.on('error', function(err) {
    //     node.emit('erro', { err: err, id: id })
    //   })
    // }

    // if (!serverUpgradeAdded) {
    //   RED.server.on('upgrade', handleServerUpgrade)
    //   serverUpgradeAdded = true
    // }

    // var path = RED.settings.httpNodeRoot || '/'
    // path =
    //   path +
    //   (path.slice(-1) == '/' ? '' : '/') +
    //   (node.path.charAt(0) == '/' ? node.path.substring(1) : node.path)
    // node.fullPath = path

    // console.log(node.fullPath)

    // if (listenerNodes.hasOwnProperty(path)) {
    //   node.error(RED._('websocket.errors.duplicate-path', { path: node.path }))
    //   return
    // }
    // listenerNodes[node.fullPath] = node
    var serverOptions = {
      noServer: true
    }
    if (RED.settings.webSocketNodeVerifyClient) {
      serverOptions.verifyClient = RED.settings.webSocketNodeVerifyClient
    }
    // Create a WebSocket Server
    node.server = new ws.Server(serverOptions)
    // node.server.setMaxListeners(0)
    // node.server.on('connection', handleConnection)
    ////////////////////////////////////////////////////////////////////////////

    node.status({ fill: 'grey', shape: 'ring', text: 'model loading...' })

    RED.httpNode.post('/tellostream', (req, res) => {
      res.connection.setTimeout(0)
      req.on('data', data => {
        console.log('serving data')
        node.broadcast(data)
      })
    })

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
      `http://${HOST}:${PORT}/tellostream`
    ])
  }

  ObjectDetectionNode.prototype.broadcast = function(data) {
    this.server.clients.forEach(function each(client) {
      if (client.readyState === ws.OPEN) {
        client.send(data)
      }
    })
    // try {
    //   for (let client in this._clients) {
    //     if (this._clients.hasOwnProperty(client)) {
    //       this._clients[client].send(data)
    //     }
    //   }
    // } catch (e) {
    //   // swallow any errors
    // }
  }

  RED.nodes.registerType('ffmpeg-stream', ObjectDetectionNode)
}
