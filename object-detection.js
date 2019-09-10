const fs = require('fs')
const path = require('path')
const tf = require('@tensorflow/tfjs-node')
const { createCanvas, Image } = require('canvas')

module.exports = RED => {
  function ObjectDetectionNode(config) {
    RED.nodes.createNode(this, config)
    this.path = config.path
    const node = this

    node.status({ fill: 'grey', shape: 'ring', text: 'model loading...' })

    const labels = (() => {
      try {
        return JSON.parse(fs.readFileSync(path.join(node.path, LABELS_JSON)))
      } catch (e) {
        node.status({
          fill: 'yellow',
          shape: 'ring',
          text: 'failed to load labels'
        })
      }
    })()

    const handler = tf.io.fileSystem(path.join(node.path, MODEL_JSON))
    const modelPromise = tf.loadGraphModel(handler)

    modelPromise
      .then(() => {
        if (labels) {
          node.status({ fill: 'green', shape: 'dot', text: 'model ready' })
        } else {
          node.status({
            fill: 'yellow',
            shape: 'dot',
            text: 'failed to load labels'
          })
        }
      })
      .catch(() => {
        node.status({
          fill: 'red',
          shape: 'dot',
          text: 'failed to load model'
        })
      })

    node.on('input', msg => {
      const canvas = createCanvas(300, 300)
      const ctx = canvas.getContext('2d')
      const img = new Image()
      img.onload = async () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        const model = TFWrapper(await modelPromise, labels)
        model.detect(canvas).then(predictions => {
          predictions = predictions.map(prediction => ({
            ...prediction,
            bbox: prediction.bbox.map(c => c / canvas.width) // normalize coordinates.
          }))
          msg.payload = predictions
          node.send(msg)
        })
      }
      img.src = `data:image/jpg;base64,${msg.payload}`
    })
  }
  RED.nodes.registerType('object-detection', ObjectDetectionNode)
}
