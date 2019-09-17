module.exports = RED => {
  const { spawn } = require('child_process')
  const ws = require('ws')
  const url = require('url')

  const TELLO_VIDEO_PORT = 11111
  const TELLO_HOST = '192.168.10.1'

  const HOST = 'localhost'
  const PORT = RED.settings.uiPort
  const STREAM = `stream_${(1 + Math.random() * 4294967295).toString(16)}`

  let serverUpgradeAdded = false
  let listenerNodes = {}

  function ObjectDetectionNode(config) {
    RED.nodes.createNode(this, config)
    this.path = config.path
    const node = this

    node.status({ fill: 'grey', shape: 'ring', text: 'waiting' })

    node._clients = {}

    if (!serverUpgradeAdded) {
      RED.server.on('upgrade', (request, socket, head) => {
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
      })
      serverUpgradeAdded = true
    }

    const basePath = RED.settings.httpNodeRoot || '/'
    node.fullPath =
      basePath +
      (basePath.endsWith('/') ? '' : '/') + // ensure base path ends with `/`
      (node.path.startsWith('/') ? node.path.substring(1) : node.path) // If the first character is `/` remove it.

    if (listenerNodes.hasOwnProperty(path)) {
      node.error(RED._('websocket.errors.duplicate-path', { path: node.path }))
      return
    }
    listenerNodes[node.fullPath] = node
    const serverOptions = {
      noServer: true
    }
    if (RED.settings.webSocketNodeVerifyClient) {
      serverOptions.verifyClient = RED.settings.webSocketNodeVerifyClient
    }

    node.server = new ws.Server(serverOptions)
    node.server.setMaxListeners(0)
    node.server.on('connection', socket => {
      node.status({
        fill: 'grey',
        shape: 'ring',
        text: 'connected & waiting for stream'
      })
      const id = (1 + Math.random() * 4294967295).toString(16)
      node._clients[id] = socket

      socket.on('close', () => {
        delete node._clients[id]
      })
    })

    node.on('close', () => {
      delete listenerNodes[node.fullPath]
      node.server.close()
    })

    RED.httpNode.post(`/${STREAM}`, (req, res) => {
      res.connection.setTimeout(0)
      req.on('data', data => {
        try {
          if (Object.keys(this._clients).length === 0) {
            node.status({
              fill: 'grey',
              shape: 'ring',
              text: 'streaming & waiting to connect'
            })
          }
          for (let client in this._clients) {
            if (this._clients.hasOwnProperty(client)) {
              node.status({
                fill: 'green',
                shape: 'dot',
                text: 'connected & streaming'
              })
              this._clients[client].send(data)
            }
          }
        } catch (e) {
          // swallow any errors
        }
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
      `http://${HOST}:${PORT}/${STREAM}`
    ])
  }

  RED.nodes.registerType('ffmpeg-stream', ObjectDetectionNode)
}
