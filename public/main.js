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
var selectedTile = {}; //Last tile clicked. This should probably be reset to null when you close the action menu
var loggedIn = false;

$(document).ready(function(){
	if(!loggedIn){
		var un = getCookie('username');
		var pw = getCookie('password');
		if(un !== '' && pw !== ''){
			$('#txtUsername').val(un);
			$('#txtPassword').val(pw);
			$('#chkRememberMe').prop('checked', true);
			socket.emit('login', {username:un, password:pw});
			$('#spanLoginError').text('');
			$('#btnLogin').prop("disabled",true);
		}else{
			$('#divLoginMenu').show();
		}
	}

	canvas = document.getElementById("canvasMain");
	resizeCanvas();
	/************ BUTTON CLICK EVENTS **************/
	$('#btnLogin').on('click', function(){
		//Send credentials to server and see if we logged in
		socket.emit('login', {username:$('#txtUsername').val(), password:$('#txtPassword').val()});
		$('#spanLoginError').text('');
		$('#btnLogin').prop("disabled",true);
		if($('#chkRememberMe').is(':checked')){
			//obviously not secure... fix later
			setCookie('username', $('#txtUsername').val(), 100);
			setCookie('password', $('#txtPassword').val(), 100);
		}
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

	$('#spanCityPopupClose').on('click', function(){
		$('#divCityPopup').hide();
	});

	$('#btnPlaceCity').on('click', function(){
		socket.emit('buildCity', selectedTile);
	});

	$('#btnSendMessage').on('click', function(){
		var chatMessage = $('#txtChatMessage').val();
		$('#txtChatMessage').val('');
		//Send the new chat message to the server
		socket.emit('chatMessage', {text:chatMessage});
		writeChatMessage(me.username,chatMessage);
	});

	$('#txtChatMessage').keyup(function(event){
		if(event.which === 13){
			$('#btnSendMessage').trigger('click');
		}
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

		$('#spanGold').text('Gold: ' + me.gold.toLocaleString());
		$('#spanWood').text('Wood: ' + me.wood.toLocaleString());
		$('#spanFood').text('Food: ' + me.food.toLocaleString());
		$('#spanPopulation').text('Population: ' + me.population.toLocaleString());
		$('#spanHappy').text('Happiness: ' + me.happy + '/100');

      	grid = new HT.Grid(gridSizeX,gridSizeY, currentX, currentY, map);
      	drawHexGrid();
    });

	//runs 1/sec
	socket.on('gameUpdate', function(data){
		me = data.user;
		map = data.map; //TODO : right now updating the map causes race issue
		
		//Update Resources Section of User Menu
		$('#spanGold').text('Gold: ' + me.gold);
		$('#spanWood').text('Wood: ' + me.wood);
		$('#spanFood').text('Food: ' + me.food);
		$('#spanPopulation').text('Population: ' + me.population);
		$('#spanHappy').text('Happiness: ' + me.happy + '/100');

		//Update Cities Section of User Menu
		var html = '';
    	for(var i = 0; i < me.cities.length; i++){
    		html += '<div class="user-menu-city"><span onClick="openCityPopup(' + me.cities[i].x + ', ' + me.cities[i].y + ')">' + me.cities[i].displayName + ' (' + me.cities[i].x + ',' + me.cities[i].y + ')</span></div>';
    	}
    	$('#divUserCities').html(html);


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
		$('#divActionsMenu').show();
		// $(document).on('keyup',function(event){
		// 	if(event.keyCode === 27){//escape key
		// 		$('#divActionsMenu').hide();
		// 	}
		// });
		$('#spanActionMenuErrorMessage').text('');
		$('#spanActionsMenuClickedTile').text('{' + data.x + ', ' + data.y + '} Type: ' + data.tileType);
		selectedTile = data;
		if(selectedTile.city){
			$('#btnPlaceCity').hide();
		}else{
			$('#btnPlaceCity').show();
		}
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

	socket.on('cityBuilt', function(data){
		var message = data.message;
		if(message === 'success'){
			$('#divActionsMenu').hide();
			map = data.map;
			grid = new HT.Grid(gridSizeX,gridSizeY,currentX,currentY,map);
			drawHexGrid();
		}else{
			$('#spanActionMenuErrorMessage').text(message);
		}
	});

	socket.on('globalMessage', function(data){
		writeChatMessage(data.sentBy, data.text)
	});

});

$(window).resize(function(){
	resizeCanvas();
});

function openCityPopup(x, y){
	$('#divCityPopup').show();
	var city = getCityByCoords(x, y);
	$('#spanCityPopupTitle').text(city.displayName + ' (' + city.x + ',' + city.y + ')');
}

function getCityByCoords(x, y){
	for(var i = 0; i < me.cities.length; i++){
		if(me.cities[i].x === x && me.cities[i].y === y){
			return me.cities[i];
		}
	}
	return null;
}

function resizeCanvas(){
    canvas.width = 1100;//document.body.clientWidth; //document.width is obsolete
    canvas.height = 600;//document.body.clientHeight; //document.height is obsolete
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
		//clickedHex.selected = !clickedHex.selected;
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

function writeChatMessage(sender, chatMessage){
	var time = new Date();

	if(sender !== me.username){
		$('#divChatLog').append('<div class="chat-div"><span class="other-span">' + sender + '<' + time.getHours() + ":" + time.getMinutes() + ":" + time.getSeconds() + '>: ' + '</span><span class="message-span">' + chatMessage + '</span></div>');
	}else{
		$('#divChatLog').append('<div class="chat-div"><span class="sender-span">' + sender + '<span class="time-span"><' + time.getHours() + ":" + time.getMinutes() + ":" + time.getSeconds() + '></span>: ' + '</span><span class="message-span">' + chatMessage + '</span></div>');
	}
	document.getElementById("divChatContainer").scrollTop = document.getElementById("divChatContainer").scrollHeight;
}

//https://www.w3schools.com/js/js_cookies.asp
function getCookie(cname) {
    var name = cname + "=";
    var decodedCookie = decodeURIComponent(document.cookie);
    var ca = decodedCookie.split(';');
    for(var i = 0; i <ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length, c.length);
        }
    }
    return "";
}

function setCookie(cname, cvalue, exdays) {
    var d = new Date();
    d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
    var expires = "expires="+d.toUTCString();
    document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}