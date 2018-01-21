var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.use(express.static('public'));

app.get('/', function(req, res){
  res.sendFile(__dirname + '/public/main.html');
});

http.listen(80, '0.0.0.0', function(){
	console.log('listening on *:80');
});

//Tile Stuff
var tiles = [];
for (var x = 0; x < 100; x++){
  for(var y = 0; y < 100; y++){
    var tile = {}
    tile.x = x;
    tile.y = y;
    tile.tileType = (Math.floor((Math.random() * 5) + 1) > 1 ? "land" : "water");
    tile.selected = false;
    tile.color = (tile.tileType === 'land' ? 'green' : 'lightBlue');
    tiles.push(tile);
  }
}

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

var colors = ['red', 'yellow', 'pink', 'blue', 'darkGreen', 'gary'];
var users = [];

io.on('connection', function(socket){
  /*************NEW USER CONNECTED*********************/
	console.log('a user connected');
  //Create an object to keep track of the new user
  var user = {};
  user.color = colors[users.length%6];
  user.id = users.length;
  user.mapData = getTileArea(0,0);
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
      tile.color = user.color;
    }else{
      tile.color = (tile.tileType === 'land' ? 'green' : 'lightBlue');
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