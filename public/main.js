var socket = io(); //reference to socket for sending/receiving data
var canvasW = 0; //Width of the canvas in px. Same as window width
var canvasH = 0; //height of the canvas in px. Same as the window height
var canvas; //reference to the canvas
var users = []; //List of all connected users
var me = {}; //The current user's data
var map = []; //The currently loaded map tiles. The size of the grid atm
var grid = {}; //The grid used to display the map
var gridSizeX = 0; //Size of the visible map area
var gridSizeY = 0; //Size of the visible map area
var mapSizeX = 0; //size of total map
var mapSizeY = 0; //size of the total map
var currentX = 0; //The top left x we are visitng
var currentY = 0; //the top left y we are visitng

$(document).ready(function(){
	canvas = document.getElementById("canvasMain");
	resizeCanvas();
	/************ BUTTON CLICK EVENTS **************/
	$("#btnGo").on('click', function(){
		//Move our view
		currentX = parseInt($("#txtXCoord").val());
		currentY = parseInt($("#txtYCoord").val());

		if(currentY - gridSizeY < 0){
			currentY = 0
		}

		if(currentY + gridSizeY > mapSizeY - 1){
			currentY = mapSizeY - gridSizeY;
		}

		if(currentX - gridSizeX < 0){
			currentX = 0
		}

		if(currentX + gridSizeX > mapSizeX - 1){
			currentX = mapSizeX - gridSizeX;
		}

		moveView(currentX, currentY);
	});

	//TODO - Currently these limit movement however they should wrap the world
	$("#btnUp").on('click', function(){
		//Move our view
		if(currentY - gridSizeY < 0){
			currentY = 0
		}else{
			currentY -= gridSizeY;
		}
		moveView(currentX, currentY);
	});

	$("#btnDown").on('click', function(){
		//Move our view
		if(currentY + gridSizeY > mapSizeY - 1){
			currentY = mapSizeY - gridSizeY;
		}else{
			currentY += gridSizeY;
		}
		moveView(currentX, currentY);
	});

	$("#btnLeft").on('click', function(){
		//Move our view
		if(currentX - gridSizeX < 0){
			currentX = 0
		}else{
			currentX -= gridSizeX;
		}
		moveView(currentX, currentY);
	});

	$("#btnRight").on('click', function(){
		//Move our view
		//Dont allow navigation past the edge
		if(currentX + gridSizeX > mapSizeX - 1){
			currentX = mapSizeX - gridSizeX;
		}else{
			currentX += gridSizeX;
		}
		moveView(currentX, currentY);
	});

	/**********END BUTTON CLICK EVENTS***************/
	canvas.addEventListener("mousedown", getMouseClick, false);

	//Sent when connected to the server this is your user data
	socket.on('userInfo', function(u){
		me = u;
		map = u.mapData;
		gridSizeX = u.gridSizeX; //Size of the visible map area
		gridSizeY = u.gridSizeY; //Size of the visible map area
		mapSizeX  = u.mapSizeX; //size of total map
		mapSizeY  = u.mapSizeY; //size of the total map
		currentX  = u.currentX; //The top left x we are visitng
		currentY  = u.currentY;

      	grid = new HT.Grid(gridSizeX,gridSizeY, currentX, currentY, map);
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
		grid = new HT.Grid(gridSizeX,gridSizeY, currentX, currentY, map);
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

		grid = new HT.Grid(gridSizeX,gridSizeY,currentX,currentY,map);
		drawHexGrid();
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
	if(clickedHex){
		clickedHex.selected = !clickedHex.selected;
		drawHexGrid();
		socket.emit('canvasClick', {x:clickedHex.Id.col, y:clickedHex.Id.row});

	}}

function moveView(x, y){
	socket.emit('moveView', {x:x,y:y});
}