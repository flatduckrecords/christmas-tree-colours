function initialise() { 
	initInterface(); 	
	update(); 	
}


function initInterface() {
    var j = 0;    
    for(var i = 0; i<50;i++){
        $("#lightmap").append("<div id=\"px"+ ( Math.abs(i-50) -1 )+"\"/>");
        switch(j++) {
            case 0:
            case 2:
            case 5:
            case 9:
            case 14:
            case 20:
            case 27:
            case 35:
            case 44:
            case 47:
                $("#lightmap").append("<br>");
        }
    }

}

function update() { }

function displayCurrentMessage(message, time){
    $("#message").html(message);
    if(typeof(time) != "undefined") {
        $("#message").attr("title", getReadableTimestamp(time));        
    }
}


function updateDisplay() { 
	
	if(socket.connected) {
    	
	} 		
}

function leadingZeroes(figure) {
    return ("0" + figure).slice(-2);
}


function paletteSwap(send) {
    
	if(send) {
		socket.emit('resetpalette', {palette:palette,time:Date.now()});
	}
}

function getReadableTimestamp(timestamp) {
    var date = new Date(timestamp);
    console.log("getting date", date.getDate());
    return(leadingZeroes(date.getDate()) + "/" + leadingZeroes((date.getMonth()+1)) + "/" + date.getFullYear() + " " + leadingZeroes(date.getHours())  + "." + leadingZeroes(date.getMinutes())  + ":" + leadingZeroes(date.getSeconds()));
}


function initSocket() { 
	var socket = io.connect();
	
	//console.log(socket);

	socket.on('led', function (data) {
	
	});
	socket.on('connect', function() { 
		socket.emit('register', {type:'sender', room:'default'}); 
	});
	socket.on('registered', function(data) { 
		console.log('registered', data); 
		socket.name = name = data.name;
		socket.timeOffset =   Date.now() - data.time;
		displayCurrentMessage(data.recordedMessage, data.recordedMessageTime);
	});
	
	socket.on('control', function(state) { 
		//console.log('control', state); 
	});

	socket.on('letter', function(data) { 
		//console.log('letter', data); 
	});
	socket.on('mouse', function(data) { 
		//console.log('mouse', data);
	});
	socket.on('lightmap', function(data) { 
		console.log('lightmap', data);
		for (var i = 0; i < data.lightmap.length;i++){
    		var hue = data.lightmap[i].h;
    		var sat = data.lightmap[i].s;
    		var lux = data.lightmap[i].l;
    		$("#px"+i).css({background: "hsla("+hue+","+sat+"%,"+lux+"%,1)"});
		}
	});
	socket.on('blink', function(data) { 
		//console.log('lightmap', data);
		var i = data.id;
		var hue = data.colour.h;
		var sat = data.colour.s;
		var lux = data.colour.l;
		$("#px"+i).css({background: "hsla("+hue+","+sat+"%,"+lux+"%,1)"});
	});
	socket.on('status', function(data) { 
		//console.log('status', data);
	});
	
	socket.on('resetpalette', function(data) { 
		displayCurrentMessage(getMessage(data));
	});
	
	socket.on('queuejoined', function(data) { 
		//console.log('queuejoined', data); 
	});
	socket.on('queueleft', function(data) { 
		//console.log('queueleft', data); 
	});
	socket.on('reload', function(url) { 

		if(url) { 
				document.location = url;
		} else {
			if(room=="default") 
				document.location = window.location.href.split("?")[0]+"?nocache="+Date.now(); 
			else 
				document.location = window.location.href.split("?")[0]+"?room="+room+"&nocache="+Date.now(); 
		}
	});
	
	return socket; 
}

function getMessage(data) {
    if(typeof(data.palette) == "undefined"){
        return;
    }
	var message = "";
	for (var i = 0; i<data.palette.length;i++){
		message += data.palette[i].name;
	}
	return message;

}

var socket = initSocket(); 

var palette = [
    {"name":"S", "value": {h:259, s:100, l:50}},
    {"name":"A", "value": {h:0, s:100, l:50}},
    {"name":"N", "value": {h:187, s:100, l:50}},
    {"name":"D", "value": {h:43, s:100, l:50}},
    {"name":"Y", "value": {h:345, s:100, l:50}}
];

var chromatographemic = function() {
    $("div.blocks div").remove();
  	var label = $("#textbox").get(0).value;
  	var data = [];
    if(history.pushState){
        history.pushState({},"chromatographemic", window.location.origin + window.location.pathname + "?text=" + encodeURIComponent(label));
    }
  	for(x = 0; x <= (label.length-1); x++){
		//console.log(x);
  	    var a = label[x].charCodeAt(0);
		var hue = 0;
		var sat = 0;
		var lux = 100;
		if((a >= 65) && (a<=90)){
			hue = myscaler(a, 65, 90);
			sat = 100;
			lux = 50;
		}
		if((a >= 97) && (a<=122)){
			hue = myscaler(a, 97, 122);
			sat = 66;
			lux = 50;
		}
  	    if((hue >= 0) && (hue<=360)){
	  		$("div.blocks").append($("<div/>").css({background: "hsla("+hue+","+sat+"%,"+lux+"%,1)"}).html(label[x])); //hue + "@" + sat
	  		data.push({"name":String.fromCharCode(a), "value": {"h":hue, "s":sat, "l":lux}});
	  	} else {
	  		$("div.blocks").append($("<div/>").css({background: "#000"}));
	  	}
  	}
  	palette = data;
  };
  
	function myscaler(x, r1, r2) {
		//console.log(x, r1, r2);
		var m = (360-0)/(r2-r1);
		//m = (360-0)/(122-97);
		var c = (0-r1) * m;
		return Math.floor((m*x)+c);
	}


$(document).ready(function() {

  initialise();
  if(window.location.search.length > 0){
    $("#textbox").val(decodeURIComponent(window.location.search.replace(/\?[a-z]*=/g,"")));
    chromatographemic();
  }

  $("#textbox").focus();

  $("#textbox").on("keyup", chromatographemic);



});