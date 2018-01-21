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

	$("#btnGo").on('click', function(){
		//Move our view
		currentX = parseInt($("#txtXCoord").val());
		currentY = parseInt($("#txtYCoord").val());
	});

	canvas.addEventListener("mousedown", getMouseClick, false);

	//Sent when connected to the server this is your user data
	socket.on('userInfo', function(u){
		me = u;
		map = u.mapData;
      	console.log(u);
      	console.log(map);

      	grid = new HT.Grid(10,7, 0, 0, map);
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
		grid = new HT.Grid(10,7, 0, 0, map);
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
	clickedHex.selected = !clickedHex.selected;
	drawHexGrid();

	socket.emit('canvasClick', {x:clickedHex.Id.col, y:clickedHex.Id.row});
}