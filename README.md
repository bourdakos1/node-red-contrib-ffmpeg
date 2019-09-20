# Node-RED FFmpeg Video Stream
This repository contains Node-RED flow examples that demonstrate how to capture the video streaming from a [DJI Tello Drone](https://www.ryzerobotics.com/tello) or a [Raspberry Pi](https://www.raspberrypi.org/) using the [Node-RED visual editor](http://nodered.org). 

## Introduction 

**The** [**node-red-contrib-ffmpeg**](https://flows.nodered.org/node/node-red-contrib-ffmpeg) **node**
The [node-red-contrib-ffmpeg](https://flows.nodered.org/node/node-red-contrib-ffmpeg) node allows users to stream video from either a tello drone or a raspberry pi 

![](https://paper-attachments.dropbox.com/s_4AE263202A5F2B1AAEA143CCE67F527ABF702C9E039F2D12D9A80F69EFFF67A1_1568854029763_Screen+Shot+2019-09-18+at+8.44.10+PM.png)


## To get started with Tello Drone 
- Install [Node-RED](https://github.com/johnwalicki/Node-RED-Tello-Control/blob/master/docs/PART2.md)
- Install node-red-contrib-ffmpeg node : `npm install node-red-contrib-ffmpeg` 
- Install ffmpeg  `brew install ffmpeg`
once installed run :  `ffmpeg `
 output should be : 
```
ffmpeg version 4.1.4 Copyright (c) 2000-2019 the FFmpeg developers
  built with Apple LLVM version 10.0.1 (clang-1001.0.46.4)
  configuration: --prefix=/usr/local/Cellar/ffmpeg/4.1.4_2 --enable-shared --enable-pthreads --enable-version3 --enable-avresample --cc=clang --host-cflags='-I/Library/Java/JavaVirtualMachines/adoptopenjdk-12.0.1.jdk/Contents/Home/include -I/Library/Java/JavaVirtualMachines/adoptopenjdk-12.0.1.jdk/Contents/Home/include/darwin' --host-ldflags= --enable-ffplay --enable-gnutls --enable-gpl --enable-libaom --enable-libbluray --enable-libmp3lame --enable-libopus --enable-librubberband --enable-libsnappy --enable-libtesseract --enable-libtheora --enable-libvorbis --enable-libvpx --enable-libx264 --enable-libx265 --enable-libxvid --enable-lzma --enable-libfontconfig --enable-libfreetype --enable-frei0r --enable-libass --enable-libopencore-amrnb --enable-libopencore-amrwb --enable-libopenjpeg --enable-librtmp --enable-libspeex --enable-videotoolbox --disable-libjack --disable-indev=jack --enable-libaom --enable-libsoxr
  libavutil      56. 22.100 / 56. 22.100
  libavcodec     58. 35.100 / 58. 35.100
  libavformat    58. 20.100 / 58. 20.100
  libavdevice    58.  5.100 / 58.  5.100
  libavfilter     7. 40.101 /  7. 40.101
  libavresample   4.  0.  0 /  4.  0.  0
  libswscale      5.  3.100 /  5.  3.100
  libswresample   3.  3.100 /  3.  3.100
  libpostproc    55.  3.100 / 55.  3.100
Hyper fast Audio and Video encoder
usage: ffmpeg [options] [[infile options] -i infile]... {[outfile options] outfile}...
```
  
- Run Node-RED locally `node-red`
- Import [flow](https://github.com/bourdakos1/node-red-contrib-ffmpeg/blob/master/flows/tellodroneflow.json) 
- Turn Tello Wifi on 
- Inject Command and then streamon in the flow 

******Flow should look like this :** 

![](https://paper-attachments.dropbox.com/s_4AE263202A5F2B1AAEA143CCE67F527ABF702C9E039F2D12D9A80F69EFFF67A1_1568854320998_Screen+Shot+2019-09-18+at+8.48.09+PM.png)

-  In another tab , go to : 
    `http://127.0.0.1:1880/dashboard `

**Output should look like this :** 

![](https://paper-attachments.dropbox.com/s_4AE263202A5F2B1AAEA143CCE67F527ABF702C9E039F2D12D9A80F69EFFF67A1_1568997635594_Screen+Shot+2019-09-19+at+4.02.31+PM.png)


You should be seeing live stream from your tellodrone in your browser. 

## To get started with streaming on Raspberry Pi 
- Confirm you have Node-RED and ffmpeg installed on Raspberry Pi 
    To confirm node-red  --> open pi terminal and type `nod-red` 
    you should see node-red run and point you to a browser session 
    To confirm ffmpeg  --> open pi terminal and type `ffmpeg` 
    You should see : 
    ```ffmpeg version 4.1.4 Copyright (c) 2000-2019 the FFmpeg developers
      built with Apple LLVM version 10.0.1 (clang-1001.0.46.4)
      configuration: --prefix=/usr/local/Cellar/ffmpeg/4.1.4_2 --enable-shared --enable-pthreads --enable-version3 --enable-avresample --cc=clang --host-cflags='-I/Library/Java/JavaVirtualMachines/adoptopenjdk-12.0.1.jdk/Contents/Home/include -I/Library/Java/JavaVirtualMachines/adoptopenjdk-12.0.1.jdk/Contents/Home/include/darwin' --host-ldflags= --enable-ffplay --enable-gnutls --enable-gpl --enable-libaom --enable-libbluray --enable-libmp3lame --enable-libopus --enable-librubberband --enable-libsnappy --enable-libtesseract --enable-libtheora --enable-libvorbis --enable-libvpx --enable-libx264 --enable-libx265 --enable-libxvid --enable-lzma --enable-libfontconfig --enable-libfreetype --enable-frei0r --enable-libass --enable-libopencore-amrnb --enable-libopencore-amrwb --enable-libopenjpeg --enable-librtmp --enable-libspeex --enable-videotoolbox --disable-libjack --disable-indev=jack --enable-libaom --enable-libsoxr
      libavutil      56. 22.100 / 56. 22.100
      libavcodec     58. 35.100 / 58. 35.100
      libavformat    58. 20.100 / 58. 20.100
      libavdevice    58.  5.100 / 58.  5.100
      libavfilter     7. 40.101 /  7. 40.101
      libavresample   4.  0.  0 /  4.  0.  0
      libswscale      5.  3.100 /  5.  3.100
      libswresample   3.  3.100 /  3.  3.100
      libpostproc    55.  3.100 / 55.  3.100
    Hyper fast Audio and Video encoder
    usage: ffmpeg \[options\] [[infile options] -i infile]... {[outfile options] outfile}...```
    

If you don’t have ffmpeg installed follow [these instructions](https://www.jeffreythompson.org/blog/2014/11/13/installing-ffmpeg-for-raspberry-pi/) to install ffmpeg on pi 

- Run Node-RED and import [flow](https://github.com/bourdakos1/node-red-contrib-ffmpeg/blob/master/flows/raspberrypiflow.json) 

**Flow should look like :** 

![](https://paper-attachments.dropbox.com/s_4AE263202A5F2B1AAEA143CCE67F527ABF702C9E039F2D12D9A80F69EFFF67A1_1568998435783_Screen+Shot+2019-09-18+at+8.48.20+PM.png)

ffmpeg-stream node should point to device type Raspberry Pi 

![](https://paper-attachments.dropbox.com/s_4AE263202A5F2B1AAEA143CCE67F527ABF702C9E039F2D12D9A80F69EFFF67A1_1568998495259_Screen+Shot+2019-09-20+at+12.45.12+PM.png)

When you go to `http://127.0.0.1:1880/dashboard` you should see streaming output 

