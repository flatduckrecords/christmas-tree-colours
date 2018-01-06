#!/usr/bin/env nodejs

const express = require('express'); 
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io').listen(server);
const Pushover = require('node-pushover');

// notifications
const push = new Pushover({
    token: "API--TOKEN",
    user: "USER--KEY"
});

push.send("Chromatographemic", "Server initialising! ["+ getReadableTimestamp(new Date()) +"]", function (err/* , res */){
    if(err){
        console.log("We have an error:");
        console.log(err);
        console.log(err.stack);
    }else{
        //console.log("Message send successfully");
        //console.log(res);
    }
});

// get the port number from the arguments otherwise use default 80. 	
const port = parseInt(process.argv[2], 10) || 80;

console.log('starting server on port', port, "["+ getReadableTimestamp(new Date()) +"]"); 

//start the webserver on specified port
server.listen(port); 
//tell the server that ./public/ contains the static webpages
app.use(express.static(__dirname+'/public')); 


// list of receivers (i.e. Raspberry Pi)
const receivers = []; 
// list of senders (i.e. browsers)
const senders = []; 

// the time we last got a message
let recordedMessage = "";
let recordedMessageTime = ""; 

//setInterval(update, 1000);

//function update() {
//    const now = Date.now();
//}

io.sockets.on('connection', function (socket) { //gets called whenever a client connects

    const ip = socket.handshake.headers['x-forwarded-for'] || socket.handshake.address;
    console.log('Client connected: ', ip);

    socket.messageCount=0;
    socket.startTime = 0;

    // if we get a message of type 'register' then...
    socket.on('register', function (data) {
        //console.log('register', data);
        if(socket.registered) {
            console.log('client already registered!');
            return;
        }
        socket.registered = true;

        // in future there will be separate rooms...
        if((!checkRegisterData(data)) || (data.room!="default")) {
            killClient(socket);
            return;
        }

        socket.room = data.room;
        socket.join(data.room);
        socket.name = 'Barbara';

        if(data.type=='sender') {
            senders.push(socket);
            socket.type = 'sender';
            console.log ("senders : "+senders.length, "receivers : "+receivers.length);
            // send out confirmation that the socket has registered
            socket.emit('registered', { name: socket.name, time:Date.now(), recordedMessage: recordedMessage, recordedMessageTime: recordedMessageTime });
            
            //setTimeout(function() {socket.emit('reload', 'http://seb.ly');}, 5000); 
        } else if(data.type=='receiver') {
            receivers.push(socket);
            socket.type = 'receiver';
            console.log ("new receiver : ", receivers.length);
            // send out confirmation that the socket has registered
            socket.emit('registered', { name: socket.name });
        }

    });

    socket.on('resetpalette', function(data) {
        let message = "";
        if(typeof(data.palette) !== "undefined"){
            for (let i = 0; i<data.palette.length;i++){
                    message += data.palette[i].name;
            }
        }
        
        recordedMessage = message;
        recordedMessageTime = Date.now();
                
        io.sockets.to("default").emit('resetpalette', data);
        message = '"' + message + '"' + " [" + ip + "] " + getReadableTimestamp(data.time);
        console.log(message + "\r\n");
        //push.send("Palette Swap", message);
    });

    socket.on('lightmap', function(data) {
            //console.log("Reciever reports lightmap:", data);
            io.sockets.to("default").emit('lightmap', data);
        });
    socket.on('blink', function(data) {
            //console.log("A light has blinked:", data);
            io.sockets.to("default").emit('blink', data);
        });
    
    socket.on('disconnect', function (/* data */) { 
        //console.log('disconnected '+socket); 
        removeElementFromArray(socket, receivers); 
        removeElementFromArray(socket, senders); 
    });
});
function checkRegisterData(data) { 
    if(!data.hasOwnProperty('room')) return false; 
    if(!data.hasOwnProperty('type')) return false; 
    if(!((data.type=='sender') || (data.type=='receiver'))) return false; 
    return true;
}
function killClient(socket) { 
    console.log('kill', socket.connected); 
    if(socket && (socket.connected)) { 
        socket.disconnect(); 
    }
}
function removeElementFromArray(element, array) { 
    const index = array.indexOf(element);
    if(index>-1) { 
        array.splice(index, 1);
        return true;  
    } else {
        return false; 
    }
    
}
function leadingZeroes(figure) {
    return ("0" + figure).slice(-2);
}
function getReadableTimestamp(timestamp) {
    const date = new Date(timestamp);
    return(leadingZeroes(date.getDate()) + "/" + leadingZeroes((date.getMonth()+1)) + "/" + date.getFullYear() + " " + leadingZeroes(date.getHours())  + "." + leadingZeroes(date.getMinutes())  + ":" + leadingZeroes(date.getSeconds()));
}