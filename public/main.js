var socket = io(); //reference to socket for sending/receiving data
var canvasW = 0;   //Width of the canvas in px. Same as window width
var canvasH = 0;   //height of the canvas in px. Same as the window height
var canvas;        //reference to the canvas
var users = [];    //List of all connected users
var me = {};       //The current user's data
var map = [];      //The currently loaded map tiles. The size of the grid atm
var grid = {}; 	   //The grid used to display the map
var gridSizeX = 0; //Size of the visible map area
var gridSizeY = 0; //Size of the visible map area
var mapSizeX = 0;  //size of total map
var mapSizeY = 0;  //size of the total map
var currentX = 0;  //The top left x we are visitng
var currentY = 0;  //the top left y we are visitng
var selectedTile = {};
var loggedIn = false;

$(document).ready(function(){
	if(!loggedIn){
		$('#divLoginMenu').show();
	};

	canvas = document.getElementById("canvasMain");
	resizeCanvas();
	/************ BUTTON CLICK EVENTS **************/
	$('#btnLogin').on('click', function(){
		//Send credentials to server and see if we logged in
		socket.emit('login', {username:$('#txtUsername').val(), password:$('#txtPassword').val()});
		$('#spanLoginError').text('');
		$('#btnLogin').prop("disabled",true);
	});

	$('#btnRegister').on('click', function(){
		socket.emit('register', {username:$('#txtUsername').val(), password:$('#txtPassword').val()});
		$('#spanLoginError').text('');
		$('#btnLogin').prop("disabled",true);
		$('#btnRegister').prop("disabled",true);
	});

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

	$('#spanActionsMenuClose').on('click', function(){
		$('#divActionsMenu').hide();
	});

	$('#btnPlaceCity').on('click', function(){
		socket.emit('buildCity', selectedTile);
	});

	/**********END BUTTON CLICK EVENTS***************/
	canvas.addEventListener("mousedown", getMouseClick, false);

	//Sent when connected to the server this is your user data
	socket.on('userInfo', function(data){
		me = data.user;
		map = data.map;
		gridSizeX = me.gridSizeX; //Size of the visible map area
		gridSizeY = me.gridSizeY; //Size of the visible map area
		mapSizeX  = me.mapSizeX; //size of total map
		mapSizeY  = me.mapSizeY; //size of the total map
		currentX  = me.currentX; //The top left x we are visitng
		currentY  = me.currentY;

		$('#spanGold').text('Gold: ' + me.gold);
		$('#spanWood').text('Wood: ' + me.wood);
		$('#spanFood').text('Food: ' + me.food);
		$('#spanPopulation').text('Population: ' + me.population);
		$('#spanHappy').text('Happiness: ' + me.happy + '/100');

      	grid = new HT.Grid(gridSizeX,gridSizeY, currentX, currentY, map);
      	drawHexGrid();
    });

	//runs 1/sec
	socket.on('gameUpdate', function(data){
		me = data.user;
		map = data.map; //TODO : right now updating the map causes race issue
		$('#spanGold').text('Gold: ' + me.gold);
		$('#spanWood').text('Wood: ' + me.wood);
		$('#spanFood').text('Food: ' + me.food);
		$('#spanPopulation').text('Population: ' + me.population);
		$('#spanHappy').text('Happiness: ' + me.happy + '/100');


		grid = new HT.Grid(gridSizeX,gridSizeY, currentX, currentY, map);
      	drawHexGrid();
	});

	//Sent after the users credentials are checked
	socket.on('loginSuccess', function(data){
		loggedIn = true;
		$('#divLoginMenu').hide();
	});

	socket.on('loginFailed', function(data){
		$('#btnLogin').prop("disabled",false);
		$('#txtPassword').val('');
		$('#spanLoginError').text('Invalid Login');
	});

	socket.on('registerSuccess', function(data){
		$('#btnLogin').prop("disabled",false);
	});

	socket.on('registerFailed', function(data){
		$('#btnLogin').prop("disabled",false);
		$('#btnRegister').prop("disabled",false);
		$('#txtPassword').val('');
		$('#spanLoginError').text('User not created');
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

	socket.on('clickedTile', function(data){
		$('#divActionsMenu').show(); //TODO
		$('#spanActionsMenuClickedTile').text('{' + data.x + ', ' + data.y + '} Type: ' + data.tileType);
		selectedTile = data;
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

//https://stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-rgb
function hexToRgb(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}