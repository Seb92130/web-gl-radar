var canvas = document.getElementByld ( "my_Canvas" );
var gl = canvas.getcontext('experimental-webgl');

var drag = false;
var old_x, old_y;
var dX = 0, dY = 0;

var mouseDown = function(e){ 
	drag = true; 
	old_x = e.pageX, old_y = e.pageY; 
	e.preventDefault(); 
	return false; 
};

var mouseUp = function (e){ 
	drag = false 
};

var mouseMove = function(e) {
	if (!drag) return false;
	dX = (e.pageX-old_x) /canvas.width;
	dY = (old_y-e.pageY) /canvas.height;
	e.preventDefault();
};

canvas.addEventListener("mousedown", mouseDown, false);
canvas.addEventListener("mouseup", mouseUp, false);
canvas.addEventListener("mouseout", mouseOut, false);
canvas.addEventListener("mousemove", mouseMove, false); 

var shaderProgram = createshaders(gl);

var currentAngle = 0;

var Sx = 1.0, Sy = 1.0;

var targetList = [];

for( let index = 0 ; index < 100 ; ++index ){
	1et tmpTargetX = ( Math.floor( Math.random() * 100 ) % 2 === 0 ? 1.0 : -1.0 ) * Math.random() * 0.9;
	1et tmpTargetY = ( Math.floor( Math.random() * 100 ) % 2 === 0 ? 1.0 : -1.0 ) * Math.random() * 0.9;
	let angle = Math.floor( Math.atan2(tmpTargetY, tmpTargetX) * (180/Math.PI)); 
	targetList.push({ 
		targetHit : 0.0, 
		targetX : tmpTargetX, 
		targetY : tmpTargetY, 
		angleTarget : ( angle + 360 ) % 360,
		firstHit : false,
		hasHit : false, 
		verticesTarget: []
	});
}

var changeOrient = false;
var vertices3 = [];

for( var i = 0; i < 360 ; i+=5 ) { 
	vertices3.push( 
		0.99 * Math.cos( i * (Math.PI/180))
		, 0.99 * Math.sin ( i * ( Math.PI/180 ))
	);
}

var insideCirclesVertices = [];

for( var step = 0.0 ; step <= 1.0 ; step+=0.2 ){
	let tmp = [];
	for( var i = 0; i < 360 ; i+=5 ){ 
		tmp.push( 
			step * Math.cos( i * (Math.PI/180))
			, step * Math.sin ( i * ( Math.PI/180) ) 
		);
	}
	insideCirclesVertices.push(tmp) ;
}

var verticesGraph = []; 
for( var i = -1.0 ; i <= 1.0 ; i += 0.2 ){
	verticesGraph.push( i, 1.0, i, -1.0, 1.0, i, -1.0, i );
}

let misc_buffers = [];
let point_buffers = [];

let targetColorVector= [
	1.0, 0.0, 0.0, 0.5,
	1.0, 0.0, 0.0, 0.5,
	1.0, 0.0, 0.0, 0.5,
	1.0, 0.0, 0.0, 0.5,
	1.0, 0.0, 0.0, 0.5,
	1.0, 0.0, 0.0, 0.5,
	1.0, 0.0, 0.0, 0.5,
	1.0, 0.0, 0.0, 0.5,
	0.85, 0.85, 0.85, 0.8,
	0.85, 0.85, 0.85, 0.8,
	0.85, 0.85, 0.85, 0.8,
	0.85, 0.85, 0.85, 0.8,
	0.85, 0.85, 0.85, 0.8,
	0.85, 0.85, 0.85, 0.8,
	0.85, 0.85, 0.85, 0.8,
	0.85, 0.85, 0.85, 0.8,
	0.85, 0.85, 0.85, 0.8,
	0.85, 0.85, 0.85, 0.8,
];

const colorBuffer = gl.createBuffer();

gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(targetColorVector), gl.STATIC_DRAW);
gl.bindBuffer(gl.ARRAY_BUFFER, null);

animate = function(time) { 
	myMethod(); 
	window.requestAnimationFrame(animate);
}

animate(0);

function myMethod() {
	// Clear the canvas 
	gl.clearColor(0.5, 0.5, 0.5, 0.9);
	gl.enable(gl.DEPTH_TEST);
	gl.clear(gl.COLOR_BUFFER_BIT);
	gl.viewport( 0, 0, canvas.width, canvas.height );
	gl.linewidth( 0.1 );
	
	let radius = 0.9 * ( 1 + 0.1 * Math.random());
	let xVal = radius * Math.cos( currentAngle * ( Math.PI/180 ));
	let yVal = radius * Math.sin( currentAngle * ( Math.PI/180 ));
	const delta = 1;
	vertices2[Math.floor(2*currentAngle/delta)] = xVal;
	vertices2[Math.floor(2*currentAngle/delta+1)] = yVal;
	currentAngle = currentAngle + ( changeOrient ? -1 : 1 ) * delta;
	
	let vertices4 = [ 
		0.0 
		, 0.0 
		, 0.99 * Math.cos( currentAngle * (Math.PI/180)) 
		, 0.99 * Math.sin ( current.Angle * (Math.PI/180)) 
		, 0.99 * Math.cos( (currentAngle-5) * (Math.PI/180)) 
		, 0.99 * Math.sin( (currentAngle - 5 ) * (Math.PI/180)) 
	];
	
	/*if( currenLAngle > 180 ) changeOrient = true; 
	if ( currentAngle < 0 ) changeOrient = false;*/ 
	if( currentAngle > 360 ) currentAngle = 0;

	computeTargets ( currentAngle, targetList ) ;

	drawTargets( 
		targetList 
		, canvas 
		, gl 
		, shaderProgram 
	);
	
	if ( misc_buffers["vertices4"] === undefined ){
		misc_buffers["vertices4"] = gl.createBuffer();
	}
	
	drawVertices( vertices4, canvas, gl, gl.TRIANGLES, misc_buffers["vertices4"], shaderProgram, [ 0.4, 1.0, 0.0, 1.0], true , true );
	
	let index = 0; 
	for ( var circleVertices of insideCirclesVertices ) { 
		let key = "circleVertices" + index; 
		if( misc_buffers[key] === undefined ){ 
			misc_buffers[key] = gl.createBuffer();
		}
		drawVertices( circleVertices, canvas, gl, gl.LINE_LOOP, misc_buffers[key], shaderProgram, [0.5, 0.5, 0.5, 0.9] ); 
		++index;
	}

	if ( misc_buffers["line1"] === undefined ){
		misc_buffers["line1"] = gl.createBuffer();
	}
	
	drawVertices ( [0.99 ,0.0, -0.99,0.0],canvas, gl, gl.LINE_LOOP, misc_buffers["line1"], shaderProgram, [0.5,0.5,0.5,0.9]);
	
	if ( misc_buffers["line2"] === undefined ){
		misc_buffers["line2"] = gl.createBuffer();
	}
	
	drawVertices ( [0.0 ,0.99, 0.0,-0.99],canvas, gl, gl.LINE_LOOP, misc_buffers["line2"], shaderProgram, [0.5,0.5,0.5,0.9]);
	
	if ( misc_buffers["vertices3"] === undefined ){
		misc_buffers["vertices3"] = gl.createBuffer();
	}
	drawVertices ( vertices3, canvas, gl, gl.TRIANGLE_FAN, misc_buffers["vertices3"], shaderProgram, [0.9, 0.9, 0.9, 1.0] ) ;

	if ( misc_buffers["verticesGraph"] === undefined ){
		misc_buffers["verticesGraph"] = gl.createBuffer();
	}
	drawVertices ( verticesGraph, canvas, gl, gl.LINES, misc_buffers["verticesGraph"], shaderProgram, [0.9, 0.9, 0.9, 1.0], false );
}

function computeTargets ( 
	currentAngle 
	, targetList )
{
	for( target of targetlist ){
		if( Math.abs(currentAngle - target.angleTarget) < 1
			&& target.targetHit === 0.0 ){
				
			target.hasHit = target.firstHit = true;
			target.targetHit += 0.0û5; 
			target.targetX += (( Math.random() * 100 ) % 2 === 0 ? -1.0 : 1.0 ) * 0.01 * Math.random(); 
			target.targetY += (( Math.random() * 100 ) % 2 === 0 ? -1.0 : 1.0 ) * 0.01 * Math.random();
		}
		
		
		
		
	}	
}
	
	
	
	
	