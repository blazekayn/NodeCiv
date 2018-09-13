var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var mysql = require('mysql');
//Other Code Modules I made
require('./server_modules/chatserver.js');

var pool = mysql.createPool({
  connectionLimit: 100,
  host: "localhost",
  user: "gameuser",
  password: "password",
  port: 3306,
  database: "game_data"
});

/**
* Get database result asyn
*
**/
function executeQuery(query, params, callback) {
  pool.getConnection(function (err, connection){
    if(err){
      console.log(err);
      return callback(err, null);
    } else if(connection){
      connection.query(query, params, function(err, rows, fields){
        connection.release();
        if(err){
          return callback(err, null);
        }
        return callback(null, rows);
      });
    }else{
      return callback(true, "No Connection");
    }
  });
}

function getResult(query, params, callback){
  executeQuery(query, params, function(err, rows){
    if(!err){
      callback(null, rows);
    }else{
      console.log(err);
      callback(true, err);
    }
  });
}
/*****************************************/


app.use(express.static('public'));

app.get('/', function(req, res){
  res.sendFile(__dirname + '/public/main.html');
});

var port = process.env.PORT || 3000;
http.listen(port, function(){
	console.log('listening on :' + port);
});

//Tile Stuff
var gridSizeX = 10; //Size of the visible map area
var gridSizeY = 7; //Size of the visible map area
var mapSizeX = 250; //size of total map
var mapSizeY = 250; //size of the total map
var currentX = 0; //The top left x we are visitng
var currentY = 0; //the top left y we are visitng
var colors = ['#7FFF00', '#DC143C', '#00FFFF', '#8B008B', '#191970', '#FF4500'];
var users = [];
var socketUsers = [];
var tiles = [];
var cities = [];
for (var x = 0; x < mapSizeX; x++){
  for(var y = 0; y < mapSizeY; y++){
    tiles.push(createTile(x,y));
    // pool.getConnection(function (err, connection){
    //   if(err){
    //     return callback(err, null);
    //   } else if(connection){
    //     connection.query('INSERT INTO tbl_map_tile(x_coord, y_coord, map_tile_type_id, tile_level) VALUES(', params, function(err, rows, fields){
    //       connection.release();
    //       if(err){
    //         return callback(err, null);
    //       }
    //       return callback(null, rows);
    //     });
    //   }else{
    //     return callback(true, "No Connection");
    //   }
    // });
  }
}

io.on('connection', function(socket){
  /*************NEW USER CONNECTED*********************/
	console.log('a user connected');
  console.log('waiting for login');
  /*******END NEW USER CONNECTED********************/

  /**************USER LOGIN*************************/
  socket.on('login', function(data){
    getResult('SELECT active, user_id FROM tbl_user WHERE username=? AND password=?',[data.username, data.password], function(err, results){
      if(err){ 
        socket.emit('loginFailed'); //error occured
        return;
      }
      if(!results || results.length === 0){
        socket.emit('loginFailed'); //user not found
        return;
      }
      if(results[0].active === 1){
        socket.emit('loginSuccess');
        //Create an object to keep track of the new user
        var user = createUser();
        user.username = data.username
        users.push(user);
        socketUsers.push({socket: socket, user:user});
        //Tell the new user what their color and stuff is
        socket.emit('userInfo', {user:user, map:getTileArea(0,0)});

        //Tell all the current users there is a new user to keep track of
        socket.broadcast.emit('newUser', user);
        console.log('New user color ' + user.color);
        //Tell the new user what users are already in the game
        socket.emit('existingUsers', users);

        //Setup user events
        setUserEvents(socket, user);
        return;
      }else{
        //login failed
        socket.emit('loginFailed'); //user not active
        return;
      }
    });

  });
    
  socket.on('register', function(data){
    getResult('SELECT * FROM tbl_user WHERE username=?', [data.username], function(err, results){
      if(err){
        socket.emit('registerFailed'); //database error
        return;
      }
      if(results.length > 0){
        socket.emit('registerFailed'); //user exists
        return;
      }
      getResult('INSERT INTO tbl_user(username, password) VALUES(?,?);', [data.username, data.password], function(err, results){
        if(err){
          return; //user not created database error
        }
        console.log('user created: ' + data.username);
        socket.emit('registerSuccess');
      });
    });
  });
  /***************END USER LOGIN***********/
});

/*******GAME LOOP**********/
//everysecond
setInterval(gameLoop,1000);

function gameLoop(){
  getResult('CALL sp_game_loop()',null,function(){});
  for(var i = 0; i < users.length; i++){
    // users[i].gold += users[i].goldRate;
    // users[i].wood += users[i].woodRate;
    // users[i].food += users[i].foodRate;
    // users[i].population += users[i].popRate;
    // users[i].happy = Math.min(users[i].happy + users[i].happyRate, 100); //limit happy at 100
    getResult('SELECT gold, wood, food, population, happiness FROM tbl_user WHERE username IN (?);', [users[i].username], function(err, results){
    	if(err){
    		return;
    	}
    	console.log(results);
    	console.log(results[0]);
    	console.log(results[0].gold);
    	var temp = results[0];
    	return temp;
    });
    var uSocket = getSocketByUser(users[i]);
    if(uSocket){
      uSocket.emit('gameUpdate', {user:users[i], map:getTileArea(users[i].currentX,users[i].currentY)});
    }
  }

}
/**************************/


/******************HELPER FUNCTION*********************/
function setUserEvents(socket, user){
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
    //io.emit('userClick', getTileArea(0,0));
    for(var i = 0; i < users.length; i++){
      if(users[i].currentX <= data.x && //user can see the changed tile
        users[i].currentY <= data.y && 
        users[i].currentX + gridSizeX >= data.x  && 
        users[i].currentY + gridSizeY >= data.y ){
          var uSocket = getSocketByUser(users[i]);
          uSocket.emit('userClick', getTileArea(users[i].currentX, users[i].currentY));
      }
    }

    socket.emit('clickedTile', tile);
    console.log('user ' + user.color + ' ' + (tile.selected ? '' : 'de') + 'selected tile (' + data.x + ',' + data.y + ')');
  });

  socket.on('moveView', function(data){
    var map = {};
    map.map = getTileArea(data.x,data.y);
    map.x = data.x;
    map.y = data.y;
    user.currentX = data.x;
    user.currentY = data.y;
    socket.emit('newView', map);
  });

  socket.on('buildCity', function(data){
    var tile = getTile(data.x,data.y);
    tile.owner = user.color;
    var city = createCity(data.x, data.y, user);
    tile.city = city;
  });
  /*************END USER EVENTS*********************/

  /***************CHAT EVENTS**********************/
  socket.on('chatMessage', function(data){
    if(!data){
      return;
    }
    if(data.text){
      getResult("INSERT INTO tbl_chat_message(sent_by, message_text) VALUES(?,?)",[1,data.text], function(err, results){
        if(err){
          return;
        }
        //send to everyone who is not the sender because the sender all has a local copy handled by the client code
        socket.broadcast.emit('globalMessage', {text:data.text, sentBy:user.username, time:(new Date()).getTime()});
      });
    }
  });

  /*************END CHAT EVENTS********************/

  //Handle a user disconnecting
  socket.on('disconnect', function(){
    console.log('user disconnected');
  });
}

//Returns a socket based on the given user
function getSocketByUser(user){
  for(var i = 0; i < socketUsers.length; i++){
    if(socketUsers[i].user.id === user.id){
      return socketUsers[i].socket;
    }
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

//create a new user
function createUser(){
  var user = {};
  user.color = colors[users.length%6];
  user.id = users.length;
  user.gridSizeX = gridSizeX; //Size of the visible map area
  user.gridSizeY = gridSizeY; //Size of the visible map area
  user.mapSizeX  = mapSizeX; //size of total map
  user.mapSizeY  = mapSizeY; //size of the total map
  user.currentX  = currentX; //The top left x we are visitng
  user.currentY  = currentY;
  user.gold = 100;
  user.goldRate = 1;
  user.wood = 100;
  user.woodRate = 1;
  user.food = 100;
  user.foodRate = 1;
  user.population = 100;
  user.popRate = 1;
  user.happy = 100;
  user.happyRate = 0;
  return user;
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
  tile.city = null;
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

function createCity(x,y, user){
  var city = {}
  city.x = x;
  city.y = y;
  city.userId = user.id;
  city.color = user.color;
  console.log(user.color + ' created a city at (' + x + ',' + y + ')');
  return city;
}

/**
 * Returns a distance between two hexes
 * @this {HT.Grid}
 * @return {number}
 */
getHexDistance = function(/*{x,y}*/ h1, /*{x,y}*/ h2) {
  //a good explanation of this calc can be found here:
  //http://playtechs.blogspot.com/2007/04/hex-grids.html
  var deltaX = h1.x - h2.x;
  var deltaY = h1.y - h2.y;
  return ((Math.abs(deltaX) + Math.abs(deltaY) + Math.abs(deltaX - deltaY)) / 2);
};

/******************* SQL FUNCTIONS **********************/
function sql(s, c){
  con.connect(function(err) {
    if (err) throw err;
    console.log("Connected!");
    con.query(s, function(err, result){
      if(err) throw err;
      return result;
    });
  });
  return null;
}