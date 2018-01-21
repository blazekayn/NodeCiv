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
		currentX = parseInt($("#txtXCoord").val());
		currentY = parseInt($("#txtYCoord").val());
		//redraw the grid
		grid = new HT.Grid(canvasW * 100, canvasH * 100, currentX, currentY);
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
	grid = new HT.Grid(canvasW * 100, canvasH * 100, currentX, currentY);
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


	var clickedHex = grid.GetHexAt(new HT.Point(x,y));
	clickedHex.selected = !clickedHex.selected;
	socket.emit('canvasClick', clickedHex.Id);

	drawHexGrid();
}