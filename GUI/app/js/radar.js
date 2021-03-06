'use strict';

const {ipcRenderer} = require('electron');


var canvas = document.getElementById ( "my_Canvas" );
var textCanvas = document.getElementById( "text" );
var ctxTextCanvas = textCanvas.getContext( "2d" );
var gl = canvas.getContext('experimental-webgl');
var bangImage = document.getElementById ( "bang" );

const targetShape = [0.0, 0.0, 0.02, 0.02, -0.02, 0.02, 0.0, 0.0];
const targetRadius = 0.02;
const targetBallRadius = 0.04;
const BALL_STEP = 0.005;

var ballIndex = 0;
var rotateAngle = 0;
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

textCanvas.addEventListener("mousedown", mouseDown, false);
textCanvas.addEventListener("mouseup", mouseUp, false);
textCanvas.addEventListener("mouseout", mouseUp, false);
textCanvas.addEventListener("mousemove", mouseMove, false); 

var shaderProgram = createshaders(gl);

var currentAngle = 0;
var currentRadius = 0;

var vertices2 = [];

var Sx = 1.0, Sy = 1.0;

var targetList = [];

var targetBalls = [];

for( var indexBalls = 0 ; indexBalls < 50 ; ++indexBalls ){
	let targetBallRadius = 0.9 * Math.random();
	let targetAngle = Math.floor( 360 * Math.random());
	targetBalls.push({
		targetHit : 0.0,
		targetX : targetBallRadius * Math.cos( targetAngle * ( Math.PI/180 )),
		targetY : targetBallRadius * Math.sin( targetAngle * ( Math.PI/180 )),
		xStep : BALL_STEP * ( Math.floor( Math.random() * 100 ) % 2 ? 1 : -1 ),
		yStep : BALL_STEP * ( Math.floor( Math.random() * 100 ) % 2 ? 1 : -1 ),
		index: indexBalls,
		verticesTargetBall : []
	});
}

ballIndex = targetBalls.length;

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

var animate = function(time) { 
	drawScreen();	
    window.requestAnimationFrame(animate);
}

animate(0);

main();

function main() {

    ipcRenderer.on('message', ( event, arg ) =>{
        /*document.getElementById("inputtype").innerHTML = `Input Type : ${arg.inputType}`;
        document.getElementById("angle").innerHTML = `Angle : ${arg.angle} degrees`;
        document.getElementById("radius").innerHTML = `Radius : ${arg.radius}`;*/
        if( arg.inputType === "INP1"){
            currentAngle = arg.angle;
            currentRadius = arg.radius / 400;
        }
        else if( arg.inputType === "INP2"){
            if( targetList.indexOf( arg.index ) === -1){
                targetList[arg.index] = { 
                    targetHit : 0.0, 
                    targetX : arg.targetX/400, 
                    targetY : arg.targetY/400, 
                    angleTarget : arg.angle,
                    firstHit : false,
                    hasHit : false, 
                    verticesTarget: []
                }; 
            }
            else{
                let target = targetList[arg.index];
                target.targetX =  arg.targetX/400; 
                target.targetY = arg.targetY/400; 
                target.angleTarget = arg.angle;
            }
        }        
    });        
}

function drawScreen( ) {
	// Clear the canvas 
	ctxTextCanvas.clearRect( 0, 0, textCanvas.width, textCanvas.height );
	gl.clearColor(0.5, 0.5, 0.5, 0.9);
	
	gl.enable(gl.DEPTH_TEST);
	gl.clear(gl.COLOR_BUFFER_BIT);
	gl.viewport( 0, 0, canvas.width, canvas.height );
	gl.lineWidth( 0.1 );
	
	//let radius = 0.9 * ( 1 + 0.1 * Math.random());
	let xVal = currentRadius * Math.cos( currentAngle * ( Math.PI/180 ));
	let yVal = currentRadius * Math.sin( currentAngle * ( Math.PI/180 ));
	const delta = 1;
	vertices2[Math.floor(2*currentAngle/delta)] = xVal;
	vertices2[Math.floor(2*currentAngle/delta+1)] = yVal;
	//currentAngle = currentAngle + ( changeOrient ? -1 : 1 ) * delta;
	
	let vertices4 = [ 
		0.0 
		, 0.0 
		, 0.99 * Math.cos( currentAngle * (Math.PI/180)) 
		, 0.99 * Math.sin ( currentAngle * (Math.PI/180)) 
		, 0.99 * Math.cos( (currentAngle-5) * (Math.PI/180)) 
		, 0.99 * Math.sin( (currentAngle - 5 ) * (Math.PI/180)) 
	];
	
	/*if( currenLAngle > 180 ) changeOrient = true; 
	if ( currentAngle < 0 ) changeOrient = false;*/ 
	//if( currentAngle > 360 ) currentAngle = 0;

	drawBall();

	computeTargets ( currentAngle, targetList ) ;
	
	drawTargets( 
		targetList 
		, canvas 
		, gl 
		, shaderProgram 
	);
	
	let indexTarget = 0;
	
	for ( var targetRow of targetList ) {
        if( targetRow === undefined ) continue;

		if( targetRow.firstHit
		    && targetRow.outOfTarget === false ){
				
			let key = "targetRow" + indexTarget; 
			if( misc_buffers[key] === undefined ){ 
				misc_buffers[key] = gl.createBuffer();
			}		
			drawVertices( 
				[
					targetRow.targetX
					, targetRow.targetY
					, targetRow.targetX 
					, targetRow.targetY + 0.05
					, targetRow.targetX - 0.04
					, targetRow.targetY + 0.05
				]
				, canvas
				, gl
				, gl.LINE_STRIP
				, misc_buffers[key]
				, shaderProgram
				, [0.5, 0.5, 0.5, 0.9] );
				
			++indexTarget;
		}		
	}

	if ( misc_buffers["vertices4"] === undefined ){
		misc_buffers["vertices4"] = gl.createBuffer();
	}
	
	if ( misc_buffers["vertices2"] === undefined ){
		misc_buffers["vertices2"] = gl.createBuffer();
	}
	
	drawVertices( vertices2, canvas, gl, gl.LINE_STRIP, misc_buffers["vertices2"], shaderProgram, [ 0.5, 0.5, 1.0, 1.0] );
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
	drawVertices ( verticesGraph, canvas, gl, gl.LINES, misc_buffers["verticesGraph"], shaderProgram, [1.0, 1.0, 1.0, 1.0], false );
}

function computeTargets ( 
	currentAngle 
	, targetList )
{
	for( var target of targetList ){
        if( target === undefined ) continue;

		if( currentAngle === target.angleTarget 
            && target.targetHit === 0.0 ){
				
			target.hasHit = target.firstHit = true;
			target.targetHit += 0.005;			
		}
		if( target.firstHit
			&& target.hasHit ){
			
			if( target.targetHit !== 0 ){
				target.targetHit += 0.005;
				if( target.targetHit > targetRadius ){
					target.targetHit = 0.0;
					target.hasHit = false;
				}
			}
			
			target.verticesTarget = [target.targetX, target.targetY];
			for( var i = 0 ; i <= 360 ; i+= 45 ){
				let X = target.targetX + (( [45, 135, 225, 315].indexOf(i) !== -1 ? targetRadius / 2.0 : targetRadius ) + target.targetHit ) * Math.cos( i * (Math.PI/180));
				let Y = target.targetY + (( [45, 135, 225, 315].indexOf(i) !== -1 ? targetRadius / 2.0 : targetRadius ) + target.targetHit ) * Math.sin( i * (Math.PI/180));
				target.verticesTarget.push( X, Y );
			}
		}		
	}	
}
	
function drawTargets(
	targetList
	, canvas
	, gl
	, shaderProgram )
{
	let index = 0;
	for( var target of targetList ){
        if( target === undefined ) continue;

		var boundX = Math.abs( 0.99 * Math.cos( target.angleTarget * (Math.PI/180)));
		var boundY = Math.abs( 0.99 * Math.sin( target.angleTarget * (Math.PI/180)));
		if( Math.abs(target.targetX) < boundX
			&& Math.abs(target.targetY) < boundY
			&& target.firstHit ){
				
			target.outOfTarget = false;
			if( point_buffers[index] === undefined ){
				point_buffers[index] = gl.createBuffer();
			}
			
			drawVertices(
				target.verticesTarget
				, canvas
				, gl
				, gl.TRIANGLE_FAN
				, point_buffers[index]
				, shaderProgram
				, [1.0, 0.0, 0.0, 0.5]
				, true /*applyScale*/
				, false /*makeGradient*/
				, null /*colorBuffer*/
				, true /*centerGradient*/
				, [target.targetX,target.targetY]
			);
			
			var pixelX = (( target.targetX - 0.1 + 0.015 * ( Sx - 1.0 )) * Sx + dX + 1.0 )* canvas.width/2.0;
			var pixelY = canvas.height - (( target.targetY + 0.05 ) * Sy + dY + 1.0 ) * canvas.height/2.0;
			
			ctxTextCanvas.fillText( "(" + target.targetX.toFixed(2) + "," + target.targetY.toFixed(2) + ")", pixelX, pixelY ); 
		}
		else{
			target.outOfTarget = true;
		}
		++index;
	}
}	

function createshaders(
	gl
	, fragmentShader = "fragment-shader" )
{
	let vertCode = document.getElementById("vertex-shader").firstChild.nodeValue;
	let vertShader = gl.createShader(gl.VERTEX_SHADER);
	gl.shaderSource( vertShader, vertCode );
	gl.compileShader(vertShader);
	
	let fragCode = document.getElementById(fragmentShader).firstChild.nodeValue;
	let fragShader = gl.createShader(gl.FRAGMENT_SHADER);
	gl.shaderSource(fragShader, fragCode);
	gl.compileShader(fragShader);
	
	let shaderProgram = gl.createProgram();
	gl.attachShader(shaderProgram, vertShader);
	gl.attachShader(shaderProgram, fragShader);
	gl.linkProgram(shaderProgram);
	gl.useProgram(shaderProgram);
	
	return shaderProgram;
}	
	
function drawVertices(
	vertices
	, canvas
	, gl
	, type
	, vertex_buffer
	, shaderProgram
	, colors
	, applyScale = true
	, makeGradien = false
	, color_buffer = null
	, makeCenterGradient = false
	, centerPoint = null )
{
	gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
	
	var coord = gl.getAttribLocation( shaderProgram, "coordinates");
	gl.vertexAttribPointer(coord, 2, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(coord);
	
	var u_colorLocation = gl.getUniformLocation(shaderProgram, "u_Color");
	gl.uniform4f(u_colorLocation, ...colors);
	
	var scaling = applyScale ? new Float32Array([Sx,Sy]) : new Float32Array([1.0, 1.0]);
	
	var uScalingFactor = gl.getUniformLocation(shaderProgram, "uScalingFactor");
	gl.uniform2f(uScalingFactor, ...scaling);
	
	var translation = applyScale ? new Float32Array([dX,dY]) : new Float32Array([0.0, 0.0]);
	
	var uTranslation = gl.getUniformLocation(shaderProgram, "uTranslation");
	gl.uniform2f(uTranslation, ...translation);
	
	var u_Makegradien = gl.getUniformLocation(shaderProgram, "u_Makegradien");
	gl.uniform1i(u_Makegradien, makeGradien);
	
	var u_canvasHeight = gl.getUniformLocation(shaderProgram, "u_canvasHeight");
	gl.uniform1f(u_canvasHeight, canvas.height);
	
	var u_canvasWidth = gl.getUniformLocation(shaderProgram, "u_canvasWidth");
	gl.uniform1f(u_canvasWidth, canvas.width);
	
	var u_radius = gl.getUniformLocation(shaderProgram, "u_radius");
	gl.uniform1f(u_radius, targetRadius);
	
	var u_hasColorVector = gl.getUniformLocation(shaderProgram, "u_hasColorVector");
	var vertexColor = gl.getAttribLocation( shaderProgram, "aVertexColor");
	
	var u_MakeCentergradien = gl.getUniformLocation(shaderProgram, "u_MakeCentergradien");
	gl.uniform1i(u_MakeCentergradien, makeCenterGradient);
	
	if( centerPoint
		&& makeCenterGradient ){
		
		var u_CenterPoint = gl.getUniformLocation(shaderProgram, "u_CenterPoint");
		gl.uniform2f(u_CenterPoint, ...centerPoint);
	}
	
	if( color_buffer !== null ){
		gl.uniform1i(u_hasColorVector, true);
		gl.bindBuffer(gl.ARRAY_BUFFER, color_buffer);
		gl.vertexAttribPointer(vertexColor, 4, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(vertexColor);
	}
	else{
		gl.disableVertexAttribArray(vertexColor);
		gl.uniform1i(u_hasColorVector, false);
	}
	
	gl.drawArrays( type, 0, vertices.length / 2 );
	gl.bindBuffer( gl.ARRAY_BUFFER, null );
}	

function drawBall()
{
	var ballsToRemove = [];
	rotateAngle += 5;
	if( rotateAngle === 360 ) rotateAngle = 0;

	for( var targetBall of targetBalls ){
		let angle = Math.floor( Math.atan2( targetBall.targetY, targetBall.targetX ) * ( 180/Math.PI ));
		let boundX = Math.abs( 0.9 * Math.cos( angle * ( Math.PI/180)));
		let boundY = Math.abs( 0.9 * Math.sin( angle * ( Math.PI/180)));

		if( Math.abs( targetBall.targetX) > boundX 
			&& Math.abs( targetBall.targetY) > boundY ){

			computeNextDir( targetBall, angle );
		}

		var hasCollide = false;
		var nearFromCollide = false;
		let ballKey = "Ball" + targetBall.index;
		let distFromCollide = 0;

		if( misc_buffers[ballKey] === undefined ){
			misc_buffers[ballKey] = gl.createBuffer();
		}

		if( targetBall.targetHit === 0.0 ){
			for( var targetBallForCollide of targetBalls ){
				if( targetBallForCollide.index === targetBall.index 
					|| targetBallForCollide.targetHit >= 0.005 ){

					continue;
				}
				let distanceFromOther = 
					Math.sqrt( 
						Math.pow(( targetBall.targetX - targetBallForCollide.targetX ), 2 )
						+ Math.pow(( targetBall.targetY - targetBallForCollide.targetY ), 2 ));

				if( distanceFromOther <= targetBallRadius ){
					let angleCollide = Math.floor( Math.atan2( targetBallForCollide.targetY, targetBallForCollide.targetX ) * ( 180/Math.PI ));
					hasCollide = true;
					targetBallForCollide.targetHit += 0.001;
				}
				if( distanceFromOther <= (targetBallRadius + 0.1 )){
					nearFromCollide = true;
					distFromCollide = ( targetBallRadius + 0.1 ) - distanceFromOther;
				}
			}
			if( hasCollide ){
				targetBall.targetHit += 0.001;
			}
			targetBall.verticesTargetBall = [ targetBall.targetX, targetBall.targetY ];
			if( nearFromCollide === true ){
				targetBall.xStep += BALL_STEP * ( Math.floor( Math.random() * 100 ) % 2 ? 1 : -1 ) * Math.random();
				targetBall.yStep += BALL_STEP * ( Math.floor( Math.random() * 100 ) % 2 ? 1 : -1 ) * Math.random();				
			}

			for( var i = 0 ; i <= 360 ; i+= 45 ){
				let X = targetBall.targetX + (( [45, 135, 225, 315].indexOf(i) !== -1 ? targetRadius / 2.0 : targetRadius ) + targetBall.targetHit ) * Math.cos(( i + rotateAngle ) * (Math.PI/180));
				let Y = targetBall.targetY + (( [45, 135, 225, 315].indexOf(i) !== -1 ? targetRadius / 2.0 : targetRadius ) + targetBall.targetHit ) * Math.sin(( i + rotateAngle ) * (Math.PI/180));
				targetBall.verticesTargetBall.push( X, Y );
			}

			drawVertices(
				targetBall.verticesTargetBall
				, canvas
				, gl
				, gl.TRIANGLE_FAN
				, misc_buffers[ballKey]
				, shaderProgram
				, nearFromCollide ? 
					[0.5 + (( 0.1 - distFromCollide ) / 0.1 ) * 0.5, 0.0, 0.0, 1.0 ]
					: [
						0.2 + ( targetBall.index % 2 ) / 2 * 0.6
						, 0.2 + ( targetBall.index % 3 ) / 3 * 0.6
						, 0.2 + ( targetBall.index % 5 ) / 5 * 0.6, 0.5
					]
				, true /*applyScale*/
				, false /*makeGradient*/
				, null /*colorBuffer*/
				, true /*centerGradient*/
				, [targetBall.targetX,targetBall.targetY]
			);

			targetBall.targetX += targetBall.xStep;
			targetBall.targetY += targetBall.yStep;
		}
		else{
			targetBall.targetHit += 0.001;
			if( targetBall.targetHit > 0.09 ){
				targetBall.targetHit = 0.0;
				ballsToRemove.push(targetBall);
			}

			var pixelX = ( targetBall.targetX * Sx +dX + 1.0 )* ctxTextCanvas.canvas.width/2.0;
			var pixelY = ctxTextCanvas.canvas.height - ( targetBall.targetY * Sy + dY + 1.0 ) * ctxTextCanvas.canvas.height/2.0;	
			var size = ( 50 + 30 * ( 0.09 - ( 0.09 - targetBall.targetHit )) / 0.09 ) * Sx;
			var factor = ( 25 + 15 * ( 0.09 - ( 0.09 - targetBall.targetHit )) / 0.09 ) * Sx;
			ctxTextCanvas.drawImage( bangImage, pixelX - factor, pixelY - factor, size, size );		
		}
	}
	for( var ballToRemove of ballsToRemove ){
		let ballKey = "Ball" + ballToRemove.index;
		if( misc_buffers[ballKey] !== undefined ){
			gl.deleteBuffer( misc_buffers[ ballKey ]);
			delete misc_buffers[ballKey];
		}
		targetBalls.splice( targetBalls.indexOf( ballToRemove ), 1 );		
	}
}

function computeNextDir( 
	targetBall
	, currentAngle
	, reboundAllAround = false )
{
	let randAngle = 0;
	if( Math.abs( currentAngle - 180 ) < 3 ){
		randAngle = 30;
	}
	else{
		randAngle = ( reboundAllAround == true ? 360 * Math.random() : ( 120 + 60 * ( currentAngle % 45 ) + 90 * Math.random()) % 360 );
	}

	targetBall.xStep = BALL_STEP * Math.cos( randAngle * Math.PI / 180 );
	targetBall.yStep = BALL_STEP * Math.sin( randAngle * Math.PI / 180 );				
}

function push()
{
	Sx += 0.1;
	Sy += 0.1;
}

function pop()
{
	Sx -= 0.1;
	Sy -= 0.1;
}

function addBall()
{
	let targetBallRadius = 0.9 * Math.random();
	let targetAngle = Math.floor( 360 * Math.random());
	targetBalls.push({
		targetHit : 0.0,
		targetX : targetBallRadius * Math.cos( targetAngle * ( Math.PI/180 )),
		targetY : targetBallRadius * Math.sin( targetAngle * ( Math.PI/180 )),
		xStep : BALL_STEP * ( Math.floor( Math.random() * 100 ) % 2 ? 1 : -1 ),
		yStep : BALL_STEP * ( Math.floor( Math.random() * 100 ) % 2 ? 1 : -1 ),
		index: ballIndex++,
		verticesTargetBall : []
	});	
}