# christmas-tree-colours
IOT Christmas Lights

This little project was loosely based on [Seb Lee-Delisle](https://seb.ly/)'s 
[Internet of Stranger Things](https://24ways.org/2016/internet-of-stranger-things/).

I had a lot of fun building that project, and wanted to reuse the Web Socket and
Neopixels ideas to do something more Christmas-y.

This project has a Node.js client and server architecture. The server provides a
public web interface and coordinates the communication via Web Sockets.

The client is designed to run on a Raspberry Pi with an array of Neopixel LEDs
attached. These can optionally be wrapped around a Christmas tree. If you want 
to communitcate with The Upside Down, please see Seb's original project.
