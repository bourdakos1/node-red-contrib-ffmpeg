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
  var activeListenerNodes = 0

  // A node red node that sets up a local websocket server
  function WebSocketListenerNode(n) {
    // Create a RED node
    RED.nodes.createNode(this, n)
    var node = this

    // Store local copies of the node configuration (as defined in the .html)
    node.path = n.path
    node.wholemsg = n.wholemsg === 'true'

    node._inputNodes = [] // collection of nodes that want to receive events
    node._clients = {}
    // match absolute url
    node.isServer = !/^ws{1,2}:\/\//i.test(node.path)
    node.closing = false
    node.tls = n.tls

    function startconn() {
      // Connect to remote endpoint
      node.tout = null
      var options = {}
      if (node.tls) {
        var tlsNode = RED.nodes.getNode(node.tls)
        if (tlsNode) {
          tlsNode.addTLSOptions(options)
        }
      }
      var socket = new ws(node.path, options)
      socket.setMaxListeners(0)
      node.server = socket // keep for closing
      handleConnection(socket)
    }

    function handleConnection(/*socket*/ socket) {
      var id = (1 + Math.random() * 4294967295).toString(16)
      if (node.isServer) {
        node._clients[id] = socket
        node.emit('opened', {
          count: Object.keys(node._clients).length,
          id: id
        })
      }
      socket.on('open', function() {
        if (!node.isServer) {
          node.emit('opened', { count: '', id: id })
        }
      })
      socket.on('close', function() {
        if (node.isServer) {
          delete node._clients[id]
          node.emit('closed', {
            count: Object.keys(node._clients).length,
            id: id
          })
        } else {
          node.emit('closed', { count: '', id: id })
        }
        if (!node.closing && !node.isServer) {
          clearTimeout(node.tout)
          node.tout = setTimeout(function() {
            startconn()
          }, 3000) // try to reconnect every 3 secs... bit fast ?
        }
      })
      socket.on('message', function(data, flags) {
        node.handleEvent(id, socket, 'message', data, flags)
      })
      socket.on('error', function(err) {
        node.emit('erro', { err: err, id: id })
        if (!node.closing && !node.isServer) {
          clearTimeout(node.tout)
          node.tout = setTimeout(function() {
            startconn()
          }, 3000) // try to reconnect every 3 secs... bit fast ?
        }
      })
    }

    if (node.isServer) {
      activeListenerNodes++
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
        node.error(
          RED._('websocket.errors.duplicate-path', { path: node.path })
        )
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
    } else {
      node.closing = false
      startconn() // start outbound connection
    }

    node.on('close', function() {
      if (node.isServer) {
        delete listenerNodes[node.fullPath]
        node.server.close()
        node._inputNodes = []
        activeListenerNodes--
        // if (activeListenerNodes === 0 && serverUpgradeAdded) {
        //     RED.server.removeListener('upgrade', handleServerUpgrade);
        //     serverUpgradeAdded = false;
        // }
      } else {
        node.closing = true
        node.server.close()
        if (node.tout) {
          clearTimeout(node.tout)
          node.tout = null
        }
      }
    })
  }

  RED.nodes.registerType('websocket-client', WebSocketListenerNode)

  WebSocketListenerNode.prototype.registerInputNode = function(
    /*Node*/ handler
  ) {
    this._inputNodes.push(handler)
  }

  WebSocketListenerNode.prototype.removeInputNode = function(/*Node*/ handler) {
    this._inputNodes.forEach(function(node, i, inputNodes) {
      if (node === handler) {
        inputNodes.splice(i, 1)
      }
    })
  }

  WebSocketListenerNode.prototype.handleEvent = function(
    id,
    /*socket*/ socket,
    /*String*/ event,
    /*Object*/ data,
    /*Object*/ flags
  ) {
    var msg
    if (this.wholemsg) {
      try {
        msg = JSON.parse(data)
      } catch (err) {
        msg = { payload: data }
      }
    } else {
      msg = {
        payload: data
      }
    }
    msg._session = { type: 'websocket', id: id }
    for (var i = 0; i < this._inputNodes.length; i++) {
      this._inputNodes[i].send(msg)
    }
  }

  WebSocketListenerNode.prototype.broadcast = function(data) {
    try {
      if (this.isServer) {
        for (let client in this._clients) {
          if (this._clients.hasOwnProperty(client)) {
            this._clients[client].send(data)
          }
        }
      } else {
        this.server.send(data)
      }
    } catch (e) {
      // swallow any errors
      this.warn('ws:' + i + ' : ' + e)
    }
  }

  WebSocketListenerNode.prototype.reply = function(id, data) {
    var session = this._clients[id]
    if (session) {
      try {
        session.send(data)
      } catch (e) {
        // swallow any errors
      }
    }
  }

  function ObjectDetectionNode(config) {
    RED.nodes.createNode(this, config)
    this.path = config.path
    const node = this

    this.serverConfig = RED.nodes.getNode('websocket-client')
    console.log(this.serverConfig)

    node.status({ fill: 'grey', shape: 'ring', text: 'model loading...' })

    RED.httpNode.post('/tellostream', (req, res) => {
      res.connection.setTimeout(0)
      req.on('data', data => {
        node.serverConfig.broadcast(data)
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

  RED.nodes.registerType('object-detection', ObjectDetectionNode)
}
