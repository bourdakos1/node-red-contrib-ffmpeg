# node-red-contrib-ffmpeg
[![NPM Version](https://img.shields.io/npm/v/node-red-contrib-ffmpeg.svg)](https://npmjs.org/package/node-red-contrib-ffmpeg)
[![NPM Downloads](https://img.shields.io/npm/dm/node-red-contrib-ffmpeg.svg)](https://npmjs.org/package/node-red-contrib-ffmpeg)

A simple ffmpeg wrapper for streaming video from a [DJI Tello Drone](https://www.ryzerobotics.com/tello) or a [Raspberry Pi](https://www.raspberrypi.org/).

![](images/example.png)

## Installation
```
$ npm install node-red-contrib-ffmpeg
```

> **Note:** This node requires that you have [ffmpeg](https://ffmpeg.org/) installed on your machine.

## Configure your node
Open the node's configuration panel to set `Device Type` and the `Stream URL`.
![](images/configure.png)
> **Note:** In this example our stream will be accessible at `ws://<host>:<port>/stream`

## Using the stream
To render the video stream in the browser, we use a library called [JSMpeg](https://github.com/phoboslab/jsmpeg).
```html
<html>
  <body>
    <!-- import JSMpeg -->
    <script src="jsmpeg.min.js"></script>
    <!-- create a canvas tag to render our video stream -->
    <canvas id="video-canvas"></canvas>
    <script>
      const videoCanvas = document.getElementById('video-canvas')
      // The stream URL that we set in the previous step.
      const url = `ws://${window.location.hostname}:${window.location.port}/stream`
      // Initialize the player.
      new JSMpeg.Player(url, { canvas: videoCanvas })
    </script>
  </body>
</html>
```

## Device specific instructions
There are a few minor hardware specific steps depending on your device.

### Tello Drone
Before you can use your Tello Drone you **MUST** activate it in the official Tello Drone app.
Once your drone is activated, you can connect to it's WiFi Network `TELLO-XXXXXX` and send it commands via UDP.

In the example flow, to start the video stream, click the `command` command followed by `streamon` command.

### Raspberry Pi
Before you can stream with a Raspberry Pi, you will need to attach a camera and enable it.

To enable camera support, run the following command:
```
sudo raspi-config
```

Then use the arrow keys to choose _Interfacing Options_ > _Camera_ and select to enable the camera. Once the camera is enabled, reboot your Raspberry Pi.

> **Note:** For the most up-to-date instructions for Raspberry Pi Camera setup, check out the [official documentation](https://www.raspberrypi.org/documentation/configuration/camera.md).

The Raspberry Pi will start streaming as soon as you start node red.

## Authors
- [Nicholas Bourdakos](https://github.com/bourdakos1)
- [Pooja Mistry ](https://github.com/pmmistry)
