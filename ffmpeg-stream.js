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

  const HOST = '0.0.0.0'
  const PORT = RED.settings.uiPort
  const STREAM = generateUUID()

  let serverUpgradeAdded = false
  let listenerNodes = {}

  function ObjectDetectionNode(config) {
    RED.nodes.createNode(this, config)
    this.deviceType = config.devicetype
    this.path = config.url
    const node = this

    node.clients = {}
    node.isStreaming = false

    function displayStatus() {
      const RING = 'ring'
      const DOT = 'dot'
      const GREY = 'grey'
      const GREEN = 'green'

      let color
      let shape
      let message

      const numberOfClient = Object.keys(node.clients).length

      if (numberOfClient > 0 && node.isStreaming) {
        color = GREEN
        shape = DOT
      } else {
        color = GREY
        shape = RING
      }

      if (node.isStreaming) {
        message = `streaming—${numberOfClient} connected`
      } else {
        message = `waiting to stream—${numberOfClient} connected`
      }

      node.status({ fill: color, shape: shape, text: message })
    }
    displayStatus()

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
      node.clients[id] = socket
      displayStatus()

      socket.on('close', () => {
        delete node.clients[id]
        displayStatus()
      })
    })

    node.on('close', () => {
      delete listenerNodes[node.fullPath]

      // Don't know if this does anything...
      RED.httpNode._router.stack.forEach((route, i, routes) => {
        if (
          route.route &&
          route.route.path === `/${STREAM}` &&
          route.route.methods['post']
        ) {
          routes.splice(i, 1)
        }
      })

      node.server.close()
      node.ffmpeg.stderr.pause()
      node.ffmpeg.stdout.pause()
      node.ffmpeg.stdin.pause()
      node.ffmpeg.kill()
    })

    RED.httpNode.post(`/${STREAM}`, (req, res) => {
      res.connection.setTimeout(0)
      let lastDataReceived
      req.on('data', data => {
        if (lastDataReceived) {
          clearTimeout(lastDataReceived)
        }
        lastDataReceived = setTimeout(() => {
          // No data after 2 seconds, the stream has probably disconnected.
          node.isStreaming = false
          displayStatus()
        }, 2000)

        node.isStreaming = true
        displayStatus()
        try {
          for (let client in node.clients) {
            if (node.clients.hasOwnProperty(client)) {
              node.clients[client].send(data)
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

    switch (node.deviceType) {
      case 'tello':
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
          `http://${HOST}:${PORT}${basePath}${STREAM}`
        ])
        break
      case 'raspi':
        node.ffmpeg = spawn('ffmpeg', [
          '-hide_banner',
          '-f',
          'v4l2',
          '-framerate',
          '25',
          '-video_size',
          '640x640',
          '-i',
          '/dev/video0',
          '-f',
          'mpegts',
          '-codec:v',
          'mpeg1video',
          '-s',
          '640x640',
          // '1280x720',
          '-b:v',
          '10m',
          '-bf',
          '0',
          '-q',
          '4', // 1 to 31
          `http://${HOST}:${PORT}${basePath}${STREAM}`
        ])
        break
    }

    node.ffmpeg.stderr.on('data', data => {
      console.log(`${data}`)
    })
  }

  RED.nodes.registerType('ffmpeg-stream', ObjectDetectionNode)
}
