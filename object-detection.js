const path = require('path')
const { spawn } = require('child_process')

const ws = require('ws')
const express = require('express')
const app = express()

// path to accept the incoming MPEG-TS stream
const TELLO_VIDEO_PORT = 11111
const TELLO_HOST = '192.168.10.1'

const HOST = 'localhost'
const PORT =  3000 



module.exports = RED => {
  function ObjectDetectionNode(config) {
    RED.nodes.createNode(this, config)
    this.path = config.path
    const node = this

    node.status({ fill: 'grey', shape: 'ring', text: 'model loading...' })

    app.post(`/tellostream`, (req, res) => {
      res.connection.setTimeout(0)

      req.on('data', function(data) {
        wsServer.broadcast(data)
      })

    }) 
    // HTTP Server to accept incoming MPEG-TS Stream
    const server = app.listen(PORT, HOST, () => {
      const host = server.address().address
      const port = server.address().port
      console.log(`Server started at http://${host}:${port}/`)
    })

// Websocket Server to send video data
const wsServer = new ws.Server({ server: server })

wsServer.broadcast = function(data) {
  wsServer.clients.forEach(function each(client) {
    if (client.readyState === ws.OPEN) {
      client.send(data)
    }
  })
}

const ffmpeg = spawn('ffmpeg', [
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
