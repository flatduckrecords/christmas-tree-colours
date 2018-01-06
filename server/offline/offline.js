var canvas = document.getElementById('crt');

if (canvas.getContext) {
	var ctx = canvas.getContext('2d');
	ctx.canvas.width  = 640;//window.innerWidth;
	ctx.canvas.height = 480;//window.innerHeight;
	ctx.font = '48px sans-serif';
	ctx.textAlign = 'center';
	var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
} else {
	// canvas-unsupported code here
	console.err("no canvas support")
}

function update() {
	
	static();
	text();
	window.requestAnimationFrame(update);
	
}

function text() {
	ctx.fillText('OFFLINE', canvas.width/2, canvas.height/2);
}

function static() {
	
	var rand;
	
	for (var i = 0; i < imageData.data.length; i += 4) {
		rand = getRandomIntInclusive(0,255);
		imageData.data[i]     = rand; // red
		imageData.data[i + 1] = rand; // green
		imageData.data[i + 2] = rand; // blue
		imageData.data[i + 3] = 255;  // alpha
	}
	ctx.putImageData(imageData, 0, 0);
};

function getRandomIntInclusive(min, max) {
	min = Math.ceil(min);
	max = Math.floor(max);
	return Math.floor(Math.random() * (max - min + 1)) + min; //The maximum is inclusive and the minimum is inclusive 
}

window.requestAnimationFrame(update);