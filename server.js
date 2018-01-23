var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.use(express.static('public'));

app.get('/', function(req, res){
  res.sendFile(__dirname + '/public/main.html');
});

http.listen(3000, '0.0.0.0', function(){
	console.log('listening on *:3000');
});

//Tile Stuff
var gridSizeX = 10; //Size of the visible map area
var gridSizeY = 7; //Size of the visible map area
var mapSizeX = 100; //size of total map
var mapSizeY = 100; //size of the total map
var currentX = 0; //The top left x we are visitng
var currentY = 0; //the top left y we are visitng
var colors = ['#7FFF00', '#DC143C', '#00FFFF', '#8B008B', '#191970', '#FF4500'];
var users = [];
var tiles = [];
for (var x = 0; x < mapSizeX; x++){
  for(var y = 0; y < mapSizeY; y++){
    tiles.push(createTile(x,y));
  }
}


io.on('connection', function(socket){
  /*************NEW USER CONNECTED*********************/
	console.log('a user connected');
  //Create an object to keep track of the new user
  var user = {};
  user.color = colors[users.length%6];
  user.id = users.length;
  user.mapData = getTileArea(0,0);
  user.gridSizeX = gridSizeX; //Size of the visible map area
  user.gridSizeY = gridSizeY; //Size of the visible map area
  user.mapSizeX  = mapSizeX; //size of total map
  user.mapSizeY  = mapSizeY; //size of the total map
  user.currentX  = currentX; //The top left x we are visitng
  user.currentY  = currentY;
  users.push(user);
  //Tell the new user what their color and stuff is
  socket.emit('userInfo', user);

  //Tell all the current users there is a new user to keep track of
  socket.broadcast.emit('newUser', user);
  console.log('New user color ' + user.color);
  //Tell the new user what users are already in the game
  socket.emit('existingUsers', users);

  /*******END NEW USER CONNECTED********************/

  /************USER EVENTS**************************/

  socket.on('canvasClick', function(data){
    var tile = getTile(data.x, data.y);
    tile.selected = !tile.selected;
    if(tile.selected){
      tile.owner = user.color;
      console.log('clicked owner ' + user.color);
    }else{
      tile.owner = null;
    }
    io.emit('userClick', getTileArea(0,0));
    console.log('user ' + user.color + ' ' + (tile.selected ? '' : 'de') + 'selected tile (' + data.x + ',' + data.y + ')');
  });

  socket.on('moveView', function(data){
    var map = {};
    map.map = getTileArea(data.x,data.y);
    map.x = data.x;
    map.y = data.y;
    socket.emit('newView', map);
  });
  /*************END USER EVENTS*********************/

  //Handle a user disconnecting
	socket.on('disconnect', function(){
		console.log('user disconnected');
	});

});

/******************HELPER FUNCTION*********************/
//Returns a siingle tile at x,y
function getTile(x,y){
  for(var i = 0; i < tiles.length; i++){
    if(tiles[i].x === x && tiles[i].y === y){
      return tiles[i];
    }
  }
}

//Returns the area around x,y (ie x,y to x+9,y+6)
function getTileArea(x,y){
  tArea = [];
  for(var i = 0; i < 10; i++){
    for(var j = 0; j < 7; j++){
      tArea.push(getTile(x+i, y+j));
    }
  }
  return tArea;
}

//Creates Tiles
function createTile(x,y){
  var tile = {}
  tile.x = x;
  tile.y = y;
  tile.tileType = createTileType();
  tile.selected = false;
  tile.color = getTileColorFromType(tile.tileType); //will be replaced with texture name sometime
  tile.owner = null;
  return tile;
}

//Get a random tyle type
function createTileType(){
  var rand = Math.floor((Math.random() * 100)); //Get a random number 0-99
  if (rand < 5){ //0-4 : 5/100
    return 'gold';
  }else if(rand < 15){//5-14 : 10/100
    return 'pond';
  }else if(rand < 27){//15-26 : 12/100
    return 'forest';
  }else if(rand < 47){//27-46 : 20/100
    return 'water';
  }else if(rand < 67){//47-66 : 20/100
    return 'flat';
  }else{//67-99 33/100
    return 'land';
  }
}

function getTileColorFromType(tileType){
  switch(tileType){
    case 'gold':
      return '#B8860B';
    case 'pond':
      return '#ADD8E6';
    case 'forest':
      return '#556B2F';
    case 'water':
      return '#00008B';
    case 'flat':
      return '#DEB887';
    case 'land':
      return '#008000';
    default:
      return '#FF69B4';
  }
}