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


var colors = ['red', 'yellow', 'pink', 'blue'];
var users = [];

io.on('connection', function(socket){
  /*************NEW USER CONNECTED*********************/
	console.log('a user connected');
  //Create an object to keep track of the new user
  var user = {};
  user.color = colors[users.length];
  user.id = users.length;
  users.push(user);
  //Tell the new user what their color and stuff is
  socket.emit('userInfo', user);

  //Tell all the current users there is a new user to keep track of
  socket.broadcast.emit('newUser', user);

  //Tell the new user what users are already in the game
  socket.emit('existingUsers', users);

  console.log(users);

  /*******END NEW USER CONNECTED********************/

  /************USER EVENTS**************************/

  socket.on('canvasClick', function(data){
    console.log(data);
  });
  /*************END USER EVENTS*********************/

  //Handle a user disconnecting
	socket.on('disconnect', function(){
		console.log('user disconnected');
	});

});