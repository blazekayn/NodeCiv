var canvasW = 0;
var canvasH = 0;
var canvas;
var currentX = 0;
var currentY = 0;
var grid;
var socket = io();
var users = [];
var me = {};

$(document).ready(function(){
	canvas = document.getElementById("canvasMain");
	resizeCanvas();
	drawHexGrid();

	$("#btnGo").on('click', function(){
		//Move our view
		currentX = $("#txtXCoord").val();
		currentY = $("#txtYCoord").val();
		//redraw the grid
		drawHexGrid();
	});

	canvas.addEventListener("mousedown", getMouseClick, false);

	//Sent when connected to the server this is your user data
	socket.on('userInfo', function(u){
		me = u;
      	console.log(u);
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


});

$(window).resize(function(){
	resizeCanvas();
	drawHexGrid();
});

function resizeCanvas(){
    canvas.width = document.body.clientWidth; //document.width is obsolete
    canvas.height = document.body.clientHeight; //document.height is obsolete
    canvasW = canvas.width;
    canvasH = canvas.height;
	grid = new HT.Grid(canvasW, canvasH, currentX, currentY);
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
	var xCoord = event.x;
	var yCoord = event.y;

	socket.emit('canvasClick', {x:xCoord, y:yCoord});

	// var clickedHex = grid.GetHexAt(new HT.Point(x,y));
	// clickedHex.selected = !clickedHex.selected;
	// drawHexGrid();

	// alert(clickedHex.Id);
}