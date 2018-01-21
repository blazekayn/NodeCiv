var canvasW = 0;
var canvasH = 0;
var canvas;
var currentX = 0;
var currentY = 0;
var socket = io();
var users = [];
var me = {};
var map = [];
var grid = {};

$(document).ready(function(){
	canvas = document.getElementById("canvasMain");
	resizeCanvas();
	/************ BUTTON CLICK EVENTS **************/
	$("#btnGo").on('click', function(){
		//Move our view
		currentX = parseInt($("#txtXCoord").val());
		currentY = parseInt($("#txtYCoord").val());

		moveView(currentX, currentY);
	});

	$("#btnUp").on('click', function(){
		//Move our view
		currentY -= 6;
		moveView(currentX, currentY);
	});

	$("#btnDown").on('click', function(){
		//Move our view
		currentY += 6
		moveView(currentX, currentY);
	});

	$("#btnLeft").on('click', function(){
		//Move our view
		currentX -= 10;
		moveView(currentX, currentY);
	});

	$("#btnRight").on('click', function(){
		//Move our view
		currentX += 10;
		moveView(currentX, currentY);
	});

	/**********END BUTTON CLICK EVENTS***************/
	canvas.addEventListener("mousedown", getMouseClick, false);

	//Sent when connected to the server this is your user data
	socket.on('userInfo', function(u){
		me = u;
		map = u.mapData;
      	console.log(u);
      	console.log(map);

      	grid = new HT.Grid(10,7, currentX, currentY, map);
      	drawHexGrid();
    });

	//Sent when first connecting is a list of current users in the game
    socket.on('existingUsers', function(users){
     	console.log(users);
    });

    //Sent when a new user connects
	socket.on('newUser', function(u){
		console.log(u);
		users.push(u);
    });

	socket.on('userClick', function(data){
		map = data;
		grid = new HT.Grid(10,7, currentX, currentY, map);
		drawHexGrid();
	});

	socket.on('newView', function(data){
		map = data.map;
		if(currentX !== data.x){
			console.log('X-Desync Detected');
			currentX = data.x;
		}
		if(currentY !== data.y){
			console.log('Y-Desync Detected');
			currentY = data.y;
		}

		$("#txtXCoord").val(currentX);
		$("#txtYCoord").val(currentY);

		grid = new HT.Grid(10,7,currentX,currentY,map);
	});

});

$(window).resize(function(){
	resizeCanvas();
});

function resizeCanvas(){
    canvas.width = document.body.clientWidth; //document.width is obsolete
    canvas.height = document.body.clientHeight; //document.height is obsolete
    canvasW = canvas.width;
    canvasH = canvas.height;
    drawHexGrid();
}

function drawHexGrid(){
	var ctx = canvas.getContext('2d');
	ctx.clearRect(0, 0, canvasW, canvasH);
	for(var h in grid.Hexes)
	{
		grid.Hexes[h].draw(ctx);
	}
}

function getMouseClick(event)
{
	var x = event.x;
	var y = event.y;

	var clickedHex = grid.GetHexAt(new HT.Point(x, y));
	clickedHex.selected = !clickedHex.selected;
	drawHexGrid();

	socket.emit('canvasClick', {x:clickedHex.Id.col, y:clickedHex.Id.row});
}

function moveView(x, y){
	socket.emit('moveView', {x:x,y:y});
}