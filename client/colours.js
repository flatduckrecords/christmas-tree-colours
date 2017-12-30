var socket = require('socket.io/node_modules/socket.io-client')('https://lights.flatduckrecords.co.uk');
var neopixels = require('rpi-ws281x-native');
var Colour = require('color');
var isOnline = require('is-online');
var exec = require('child_process').exec;

var NUM_LEDS = 50,
    pixelData = new Uint32Array(NUM_LEDS),
    pixelDataProcessed = new Uint32Array(NUM_LEDS),
    dimmed = true,
    lightsChanged = true,
    room = 'default';

neopixels.init(NUM_LEDS);
neopixels.render(pixelData);

/** Set up the colours and assign them randomly  **/

function random(min, max) {
	return Math.round(Math.random() * (max - min) + min);
}

// our predefined colour palette
var defaultcolours = [
	{"name":"W", "value": {h:316, s:100, l:50}},
	{"name":"E", "value": {h:57, s:100, l:50}},
	{"name":"B", "value": {h:14, s:100, l:50}},
	{"name":"T", "value": {h:273, s:100, l:50}},
	/*{"name":"E", "value": {h:57, s:100, l:80}},*/
	{"name":"A", "value": {h:0, s:100, l:50}},
	{"name":"M", "value": {h:172, s:100, l:50}}
];

var colours = defaultcolours;

/*{"name":"white", "value": {h:20, s:80, l:80}},
{"name":"yellow", "value" : {h:35, s:100, l:60}},
{"name":"blue", "value" : {h:185, s:100, l:50}},
{"name":"red", "value" : {h:350, s:80, l:50}},
{"name":"green", "value" : {h:160, s:90, l:50}},*/

// array to hold the Light objects
var lights = [];

// assign each light a random colour
for (var i = 0; i<NUM_LEDS; i++) { 
	lights.push(new Light(colours[random(0, colours.length-1)].value, i)); 	
}


function reassign(palette) {
    colours = palette || colours;    
    for(var i = 0; i<lights.length; i++) {
		lights[i].reassignColour(colours);
	}
}

function lightmap() {
    var lightIndex = [];
    for(var i = 0; i<lights.length; i++) {
        lightIndex.push(lights[i].colour); 
	}
    socket.emit('lightmap', {"lightmap": lightIndex}); 
}

function Light(colour, id) {
    this.id = id;
	var lightOn = false;
	this.brightness = 0;
	this.changed = true;
	this.colour = colour;
	var turnOnTime = 0;
	var turnOffDelay = 0;
	var fadeSpeed = Math.random()*0.6+0.03; 
	var flickerSpeed = Math.random()*1+2;
	var flickerMinBrightness = 0;
	var flickerCountdown = 0;
	this.colourChange = false;

	this.reassignColour = function(colours) {
        var newColour = colours[random(0, colours.length-1)].value;
        this.colourChange = this.colour.h != newColour.h;
        this.colour = newColour;
        socket.emit('blink', {"id": this.id, "colour": this.colour});
	}
	this.update = function() {
		var newBrightness = this.brightness; 
		if(newBrightness<0.001) { newBrightness = 0; }
		
		if(flickerCountdown>0) {
			flickerCountdown--;
			var target = (flickerCountdown%4<flickerSpeed)?0.5:flickerMinBrightness;
			newBrightness+=((target-newBrightness))*0.8;
		} else if(dimmed){ 
			newBrightness+=((0.3-newBrightness))*fadeSpeed;
			if(Math.abs(0.3-newBrightness)<0.01) newBrightness = 0.3; 	
		} else if(lightOn) { 
			newBrightness+=((1-newBrightness))*0.3;
		} else { 
			if(turnOffDelay>0) {
				turnOffDelay--; 
				newBrightness+=((1-newBrightness))*0.85; 
			} else { 
				newBrightness*=0.7;
			}
		}
		
		// detect brightness or colour changes
		this.changed = (this.brightness!=newBrightness || this.colourChange)
		this.brightness=newBrightness;
		
		// reset colour-change flag
		this.colourChange = false;

	};
	this.turnLightOff = function() {
		if(lightOn) { 
			lightOn = false; 
			var framessinceturnon = Math.floor((Date.now()-turnOnTime)/16); // 16 mils per frame
			if(framessinceturnon<6) { 
				turnOffDelay = 6; 
			}
		}
	}
	this.startFlicker = function(strength) {
		strength = (typeof strength !== 'undefined') ? strength : 1; // 1 is full strength
		flickerCountdown = 8; 
		flickerMinBrightness = 0.5-(strength/2); 
	}
	this.getColour = function() { 
		if(this.brightness <0.001) {
			return 0;
		} 
		else {
			return Colour().hsl(this.colour.h, this.colour.s, this.colour.l * this.brightness).rgbNumber();
		} 
	}
	this.getHue = function() {
		return this.colour.h;
	}
}

function updatePixels() { 
	for(var i = 0; i<NUM_LEDS; i++) { 
		var pixel = pixelData[i]; 
		if(pixel==0) {
			pixelDataProcessed[i] = 0; 
		} else { 
			var g = pixel>>16; 
			var r = (pixel>>8) & 0xff; 
			var b = pixel & 0xff; 
			pixelDataProcessed[i] =  (r << 16) + (g  << 8) + b ; 
		}
	}
	neopixels.render(pixelDataProcessed);
}

/**  This is the main animation loop  **/
function update() {
    
    // randomly choose a light to flicker (the multiple of 60 slows it down a bit)
    var lightToFlicker = random(0,(lights.length * 60));

	for(var i = 0; i<lights.length; i++) { 
		var light=lights[i];

		if(dimmed && (lightToFlicker==i)) {
			light.startFlicker(0.5);
			light.reassignColour(colours);
		}
		
		light.update(); 

		if(light.changed) {
			pixelData[i] = lights[i].getColour();
			lightsChanged = true;
		}
	}
	if(lightsChanged) {
		updatePixels(); 
		lightsChanged = false; 
	}
}

/** Handle websocket communications **/
function initSocketConnection() { 
	socket.on('connect', function(){
		//console.log("connected!");
		socket.emit('register', {type:'receiver', room:room}); 
		showMessage('join room '+room); 
	});
	socket.on('registered', function(data) { 
			//console.log('registered', data); 
			//console.log("Connected! Your id is "+data.name+" ");
	});
	socket.on('letter', function(data){
		//console.log('letter', data);
		lastMessageTime = Date.now();
	});
	socket.on('resetpalette', function(data){
		//console.log('resetpalette');
		reassign(data.palette);
		lastMessageTime = Date.now();
	});
	socket.on('resetletters', function(){
		//console.log('resetletters');
		for(var i = 0; i<lights.length; i++) { 
			lights[i].turnLightOff(); 
			lights[i].startFlicker(); 
		} 
		lastMessageTime = Date.now();
	});
	socket.on('status', function(data) {
		//console.log('statuschange');
		if(data.activeSenderName=="") dimmed = true; 
		else dimmed = false;
		lightmap();
	});
	socket.on('disconnect', function(){
	});
	
/*socket.on('reboot', function() { 
	console.log("REBOOT!"); 
	execute('/sbin/reboot', function(callback){
    	console.log(callback);
	});
});*/	
}

function doRainbowStrobe(){ 

	for(var loop=0; loop<360*3; loop+=10) { 
		for(var i = 0; i<NUM_LEDS; i++) {
			//console.log(loop, i); 
			var position = (i*10)+loop; 
			var b;
			if(position<360*2) 
				b = map(position, 360, 360*2, 0,1, true);  
			else
				b = map(position, 360*2, 360*3, 1,0, true);
				  
			pixelData[i] = Colour().hsl(position%360, 100,50*b).rgbNumber(); 
			
		}
		updatePixels();
	}
	
	
}

function map(value, min1, max1, min2, max2, clampResult) { 
	var returnvalue = ((value-min1) / (max1 - min1) * (max2-min2)) + min2; 
	if(clampResult) return clamp(returnvalue, min2, max2); 
	else return returnvalue; 
};

function clamp(value, min, max) { 
	if(max<min) { 
		var temp = min; 
		min = max; 
		max = temp; 
	}
	return Math.max(min, Math.min(value, max)); 
};

function showMessage(message) { 
	console.log(message);
}

function initialise() {
	doRainbowStrobe();
	initSocketConnection();
	setInterval(update, 1000/60);
}

initialise();

process.stdin.resume();//so the program will not close instantly

function exitHandler(options, err) {
	neopixels.reset();
	if (err) console.log(err.stack);
	if (options.exit) process.exit();
}

//do something when app is closing
process.on('exit', exitHandler.bind(null,{cleanup:true}));

//catches ctrl+c event
process.on('SIGINT', exitHandler.bind(null, {exit:true}));

//catches uncaught exceptions
process.on('uncaughtException', exitHandler.bind(null, {exit:true}));


function execute(command, callback){
	exec(command, function(error, stdout, stderr){ callback(stdout); });
}
