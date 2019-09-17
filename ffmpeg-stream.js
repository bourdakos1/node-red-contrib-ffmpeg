function generateUUID() {
  var d = new Date().getTime()
  if (Date.now) {
    d = Date.now() //high-precision timer
  }
  var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(
    c
  ) {
    var r = (d + Math.random() * 16) % 16 | 0
    d = Math.floor(d / 16)
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
  return uuid
}

module.exports = RED => {
  const { spawn } = require('child_process')
  const ws = require('ws')
  const url = require('url')

  const TELLO_VIDEO_PORT = 11111
  const TELLO_HOST = '192.168.10.1'

  const HOST = 'localhost'
  const PORT = RED.settings.uiPort
  const STREAM = generateUUID()

  let serverUpgradeAdded = false
  let listenerNodes = {}

  function ObjectDetectionNode(config) {
    RED.nodes.createNode(this, config)
    const node = this

    node.status({ fill: 'grey', shape: 'ring', text: 'waiting...' })
    node.path = generateUUID()
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

    setInterval(() => {
      // TODO: This is super hacky...
      node.send({ payload: `ws://${HOST}:${PORT}${node.fullPath}` })
    }, 500)

    if (listenerNodes.hasOwnProperty(node.fullPath)) {
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
      const id = generateUUID()
      node._clients[id] = socket

      socket.on('close', () => {
        delete node._clients[id]
      })
    })

    node.on('close', () => {
      delete listenerNodes[node.fullPath]
      node.server.close()
      node.ffmpeg.stderr.pause()
      node.ffmpeg.stdout.pause()
      node.ffmpeg.stdin.pause()
      node.ffmpeg.kill()
    })

    RED.httpNode.post(`/${STREAM}`, (req, res) => {
      res.connection.setTimeout(0)
      req.on('data', data => {
        try {
          if (Object.keys(this._clients).length === 0) {
            node.status({
              fill: 'grey',
              shape: 'ring',
              text: 'streaming'
            })
          }
          for (let client in this._clients) {
            if (this._clients.hasOwnProperty(client)) {
              node.status({
                fill: 'green',
                shape: 'dot',
                text: 'streaming'
              })
              this._clients[client].send(data)
            }
          }
        } catch (e) {
          // swallow any errors
        }
      })
    })

    if (node.ffmpeg) {
      node.ffmpeg.stderr.pause()
      node.ffmpeg.stdout.pause()
      node.ffmpeg.stdin.pause()
      node.ffmpeg.kill()
    }

    node.ffmpeg = spawn('ffmpeg', [
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
    node.ffmpeg.stderr.on('data', data => {
      console.log(`${data}`)
    })
  }

  RED.nodes.registerType('ffmpeg-stream', ObjectDetectionNode)
}
