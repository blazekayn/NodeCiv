const e = require('express');
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
var tick = 0;
var debug = true;
var gridSizeX = 10; //Size of the visible map area
var gridSizeY = 7; //Size of the visible map area
var mapSizeX = 250; //size of total map
var mapSizeY = 250; //size of the total map
var currentX = 0; //The top left x we are visitng
var currentY = 0; //the top left y we are visitng
//var colors = ['#7FFF00', '#DC143C', '#00FFFF', '#8B008B', '#191970', '#FF4500'];
var users = [];
var socketUsers = [];
var tiles = [];
var cities = [];
// for (var x = 0; x < mapSizeX; x++){
//   for(var y = 0; y < mapSizeY; y++){
loadMapFromDB();

    //Add logic to run this if no tiles come back from the db for first time setup
    // getResult('INSERT INTO tbl_map_tile(x_coord, y_coord, map_tile_type_id) VALUES(?,?,UPPER(?));', [x, y, getTile(x,y).tileType], function(err, results){
    // });
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
//   }
// }

io.on('connection', function(socket){
  /*************NEW USER CONNECTED*********************/
	console.log('a user connected');
  console.log('waiting for login');
  /*******END NEW USER CONNECTED********************/

  /**************USER LOGIN*************************/
  socket.on('login', function(data){
    console.log("login request: " ,data.username, data.password);
    getResult('SELECT username, active FROM tbl_user WHERE username=? AND password=?',[data.username, data.password], function(err, results){
      if(err){ 
        console.log("login failed: error");
        socket.emit('loginFailed'); //error occured
        return;
      }
      if(!results || results.length === 0){
        console.log("login failed: bad password", JSON.stringify(results));
        socket.emit('loginFailed'); //user not found
        return;
      }
      console.log("login successful: ", JSON.stringify(results));
      if(results[0].active === 1){
        socket.emit('loginSuccess');
        //Create an object to keep track of the new user
        var user = createUser();
        user.username = data.username
        
        users.push(user);
        socketUsers.push({socket: socket, user:user});
        updateUser(user); //get userdata
        //Tell the new user what their color and stuff is
        var sendData = {};
        sendData.map = getTileArea(0,0)
        sendData.gridSizeX = gridSizeX; //Size of the visible map area
        sendData.gridSizeY = gridSizeY; //Size of the visible map area
        sendData.mapSizeX  = mapSizeX; //size of total map
        sendData.mapSizeY  = mapSizeY; //size of the total map
        sendData.currentX  = currentX; //The top left x we are visitng
        sendData.currentY  = currentY;
        socket.emit('gameInfo', sendData);

        //Tell all the current users there is a new user to keep track of
        socket.broadcast.emit('newUser', user);
        //Tell the new user what users are already in the game
        socket.emit('existingUsers', users);

        //Setup user events
        setUserEvents(socket, user);
        return;
      }else{
        //login failed
        console.log('login failed: no results returned');
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
      getResult('INSERT INTO tbl_user(username, password, wood, food, gold) VALUES(?,?, 1500, 1500, 1500);', [data.username, data.password], function(err, results){
        if(err){
          return; //user not created database error
        }
        console.log('user created: ' + data.username);
        socket.emit('registerSuccess');

        var user = createUser();
        user.username = data.username

        //Give this user a starting City
        var tile = getRandomEmptyTile();
        if(tile && !(tile.owner)){
          createCity(tile, user, function(message){
            var returnData = {};
            returnData.map = getTileArea(user.currentX,user.currentY);
            returnData.message = message;
            socket.emit('cityBuilt', returnData);
          });
        }
      });
    });
  });
  /***************END USER LOGIN***********/
});

/*******GAME LOOP**********/
//everysecond
setInterval(gameLoop,6000); //10 tick a minute

function gameLoop(){
	console.log('Game Loop :  ' + tick++);
  	getResult('CALL sp_game_loop();',null,function(){});
  	for(var i = 0; i < users.length; i++){
		updateUser(users[i]);
  }
  // Lets try running without this. I think its just for added security
  // but the map we have in memory should be correct.
	// if(tick % 5 === 0){//every 5th tick reload map from DB
	// 	console.log('Pull Map From DB');
	// 	loadMapFromDB();
	// }
}

function loadMapFromDB(){
	tiles = [];
	getResult('SELECT ' +
					'tmt.x_coord, ' +
	    			'tmt.y_coord, ' +
	    			'LOWER(map_tile_type_id) AS tiletype, ' +
	    			'tu.username AS city_owner ' +
				'FROM tbl_map_tile tmt ' +
				'LEFT JOIN tbl_city tc ON tmt.x_coord = tc.x_coord AND tmt.y_coord = tc.y_coord ' +
				'LEFT JOIN tbl_user tu ON tc.owner_id = tu.user_id;', [], function(err, results){
		//console.log(results);
		for(var i = 0; i < results.length; i++){
    		var tile = createTile(results[i].x_coord, results[i].y_coord, results[i].tiletype);
    		if(results[i].city_owner){
    			tile.owner = results[i].city_owner;
    			var city = {};
				city.x = results[i].x_coord;
				city.y = results[i].y_coord;
				city.user = results[i].city_owner;
				tile.city = city;
    		}
    		tiles.push(tile);
		}
    });
}

function updateUser(user){
	getResult('CALL sp_get_user_data(?);', [user.username], function(err, results){
    	if(err){
    		return;
      }
      var resultArray = Object.values(JSON.parse(JSON.stringify(results)));
      var userResult = resultArray[0][0];
    	user.gold = userResult.gold;
    	user.wood = userResult.wood;
    	user.food = userResult.food;
    	user.population =  userResult.population;
      user.happy = userResult.happiness;
      user.alliance = userResult.alliance_name;

    	var cities = [];
    	for(var i = 0; i < resultArray[1].length; i++){
    		var city = {};
			city.x = resultArray[1][i].x_coord;
			city.y = resultArray[1][i].y_coord;
			city.user = user.username;
      city.displayName = resultArray[1][i].display_name;
      city.warrior = resultArray[1][i].warrior;
			cities.push(city);
    	}
      user.cities = cities;
      
      if(resultArray.length > 2){
        var invites = [];
        for(var i = 0; i < resultArray[2].length; i++){
          var invite = {};
          invite.alliance = resultArray[2][i].alliance_name;
          invites.push(invite);
        }
        user.invites = invites;
      }

	    var uSocket = getSocketByUser(user);
	    if(uSocket){
	      uSocket.emit('gameUpdate', {user:user, map:getTileArea(user.currentX,user.currentY)});
	    }
    });
}
/**************************/


/******************HELPER FUNCTION*********************/
function setUserEvents(socket, user){
   /************USER EVENTS**************************/

  socket.on('canvasClick', function(data){
    var tile = getTile(data.x, data.y);
    // tile.selected = !tile.selected;
    // if(tile.selected){
   tile.owner = user.color;
   console.log('clicked owner ' + user.username);
    // }else{
    //tile.owner = null;
    // }
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
    //console.log('user ' + user.color + ' ' + (tile.selected ? '' : 'de') + 'selected tile (' + data.x + ',' + data.y + ')');
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
  	console.log('received build city: ' + data.x + ', ' + data.y);
    var tile = getTile(data.x,data.y);
    console.log(tile.x + ', ' + tile.y);
    console.log(tile);
    console.log(!!tile);

    createCity(tile, user, function(message){
      var returnData = {};
      returnData.map = getTileArea(user.currentX,user.currentY);
      returnData.message = message;
      socket.emit('cityBuilt', returnData);
    });

  });

  socket.on('sendAttack', function(data){
  	
    sendAttack(attack, user, function(message){
      var returnData = {};
      returnData.map = getTileArea(user.currentX,user.currentY);
      returnData.message = message;
      socket.emit('cityBuilt', returnData);
    });

  });

  socket.on('createAlliance', function(data){
    console.log('received create alliance: ' + data.name);

    createAlliance(data.name, user, function(message){
      socket.emit('allianceCreated',message);
      if(message == "success"){
        user.alliance = data.name;
      }
    });
  });

  socket.on('createAllianceInvite', function(data){
    console.log('received create alliance invite: ' + data.name);

    createAllianceInvite(data.name, user, function(message){
      socket.emit('allianceInviteCreated',message);
    });
  });

  socket.on('loadAlliance', function(){
    console.log('loading alliance screen');

    loadAlliance(user);
  });

  socket.on('acceptAllianceInvite', function(allianceName){
    console.log(user.username + ' accepted alliance invite: ' + allianceName);

    acceptAllianceInvite(allianceName, user, function(message){
      socket.emit('allianceInviteCreated',message);
      if(message == "success"){
        user.alliance = allianceName;
      }
    });
  });

  socket.on('leaveAlliance', function(){
    leaveAlliance(user, function(message){
      socket.emit('leaveAlliance',message);
      if(message == "success"){
        user.alliance = null;
      }
    });
  });

  socket.on('getCityByCoords', function(data){
    getCityData(data, user, function(cityData){
      socket.emit('cityLoaded',cityData);
    });
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
        if(data.channel == "global"){
          //send to everyone who is not the sender because the sender all has a local copy handled by the client code
          socket.broadcast.emit('globalMessage', {text:data.text, sentBy:user.username, time:(new Date()).getTime()});
        }else if(data.channel == "alliance"){
          //send chat to this person's alliance members
          for(var i = 0; i < socketUsers.length; i++){
            //The alliance names match and its not the sending user then send it to everyone
            if(socketUsers[i].user.alliance == user.alliance && socketUsers[i].user.username !== user.username){
              socketUsers[i].socket.emit('allianceMessage', {text:data.text, sentBy:user.username, time:(new Date()).getTime()});
            }
          }
        }
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
  //user.color = colors[users.length%6];
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
function createTile(x,y,tileType){
  var tile = {}
  tile.x = x;
  tile.y = y;
  tile.tileType = tileType
  //tile.tileType = createTileType();
  //tile.selected = false;
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

/**************************************************/
/* FUNCTION USED FOR BUILDING A NEW CITY CALLED   */
/* WHEN A USER CLICKS THE "PLACE CITY" BUTTON 	  */
/**************************************************/
function createCity(tile, user, callback){
	console.log('building city');
	getResult('SELECT fn_build_city(?,?,?) AS error_code;',[user.username,tile.x, tile.y], function(err, results){
		var message = "";
		switch(results[0].error_code){
		case 0:
			//success
		  	console.log(user.username + ' created a city at (' + tile.x + ',' + tile.y + ')');
			var city = {};
			city.x = tile.x;
			city.y = tile.y;
			city.user = user.username;

			console.log(city);
			tile.city = city;
			tile.owner = user;
			callback('success');
			break;
		case 1:
			//not enough resources
			console.log(user.username + ' not enough resouces to build a city at (' + tile.x + ',' + tile.y + ')');
			callback('Not enough resources');
			break;
		case 2:
			//city already exists
			console.log(user.username + ' city already exists at (' + tile.x + ',' + tile.y + ')');
			callback('A city is already built here.');
			break;
		default:
			//server error
			console.log(user.username + ' server error when building a city at (' + tile.x + ',' + tile.y + ')');
			callback('Oops Sever Error');
		}
		return message;
	});
}

/****************************************************/
/* FUNCTION USED FOR CREATING A NEW ALLIANCE        */
/* WHEN A USER CLICKS THE "CREATE ALLIANCE" BUTTON 	*/
/****************************************************/
function createAlliance(name, user, callback){
  console.log("Creating Alliance");
  getResult('SELECT fn_create_alliance(?,?) AS error_code;',[user.username,name], function(err, results){
    var message = "";
    console.log(JSON.stringify(results));
    switch(results[0].error_code){
    case 0:
      //success
      console.log('Alliance ' + name + ' created by ' + user.username);
      callback('success');
      break;
    case 1:
      //User is in an alliance
      console.log('You are already in an alliance.');
      callback('You are already in an alliance.');
      break;
    case 2:
      //Alliance name taken
      console.log('An alliance with that name already exists.');
      callback('An alliance with that name already exists.');
      break;
    default:
      //server error
      console.log('Server error when trying to create alliance.');
      callback('Oops Sever Error');
    }
    return message;
  });
}

/************************************************************/
/* FUNCTION USED FOR LOADING DATA TO POPULATE ALLIANCE MENU */
/* WHEN A USER OPENS THE ALLIANCE MENU                    	*/
/************************************************************/
function loadAlliance(user){
  console.log("Loading Alliance");
  getResult('CALL sp_get_alliance_data(?);',[user.username], function(err, results){
    if(err){
      return;
    }
    var resultArray = Object.values(JSON.parse(JSON.stringify(results)));
    var data = {};
    var allianceUsers = [];
    for(var i = 0; i < resultArray[0].length; i++){
      var allianceUser = {};
      allianceUser.username = resultArray[0][i].username;
      allianceUser.rank = resultArray[0][i].rank;
      allianceUsers.push(allianceUser);
    }
    data.users = allianceUsers;
    
    var dataResult = resultArray[1][0];
    console.log(JSON.stringify(dataResult));
    data.alliance_name = dataResult.alliance_name;
    data.alliance_leader = dataResult.username;

    //Check for length because sometimes there are no active invites
    if(resultArray.length > 2){
      var invitedUsers = [];
      for(var i = 0; i < resultArray[2].length; i++){
        var invitedUsers = {};
        invitedUser.username = resultArray[2][i].username;
        invitedUsers.push(invitedUser);
      }
      data.invitedUsers = invitedUsers;
    }

    var uSocket = getSocketByUser(user);
    if(uSocket){
      uSocket.emit('allianceLoaded', data);
    }
  });
}

/****************************************************/
/* FUNCTION USED FOR CREATING AN ALLIANCE INVITE    */
/* WHEN A USER CLICKS THE "INVITE" BUTTON 	        */
/****************************************************/
function createAllianceInvite(name, user, callback){
  console.log("Creating Alliance Invite");
  getResult('SELECT fn_create_alliance_invite(?,?) AS error_code;',[user.username,name], function(err, results){
    var message = "";
    console.log(JSON.stringify(results));
    switch(results[0].error_code){
    case 0:
      //success
      callback('success');
      break;
    case 1:
      //Not high enough rank to invite
      console.log('You do not have permission to invite.');
      callback('You do not have permission to invite.');
      break;
    case 2:
      //Already invited
      console.log('This user has already been invited to the alliance.');
      callback('This user has already been invited to the alliance.');
      break;
    default:
      //server error
      console.log('Server error when trying to create alliance invite.');
      callback('Oops Sever Error');
    }
    return message;
  });
}

/****************************************************/
/* FUNCTION USED FOR ACCEPTING AN ALLIANCE INVITE   */
/* WHEN A USER CLICKS THE "INVITE" BUTTON 	        */
/****************************************************/
function acceptAllianceInvite(name, user, callback){
  console.log("Accepting Alliance Invite");
  getResult('SELECT fn_accept_alliance_invite(?,?) AS error_code;',[user.username,name], function(err, results){
    var message = "";
    console.log(JSON.stringify(results));
    switch(results[0].error_code){
    case 0:
      //success
      callback('success');
      break;
    case 1:
      //Not high enough rank to invite
      console.log('You are already in an alliance.');
      callback('You are already in an alliance.');
      break;
    case 2:
      //Already invited
      console.log('You are not invited to this alliance.');
      callback('You are not invited to this alliance.');
      break;
    case 3:
      //Already invited
      console.log('The alliance is already full.');
      callback('The alliance is already full.');
      break;
    default:
      //server error
      console.log('Server error when trying to create alliance invite.');
      callback('Oops Sever Error');
    }
    return message;
  });
}

/****************************************************/
/* FUNCTION USED FOR ACCEPTING AN ALLIANCE INVITE   */
/* WHEN A USER CLICKS THE "INVITE" BUTTON 	        */
/****************************************************/
function leaveAlliance(user, callback){
  console.log("Leave alliance");
  getResult('SELECT fn_leave_alliance(?) AS error_code;',[user.username], function(err, results){
    var message = "";
    console.log(JSON.stringify(results));
    switch(results[0].error_code){
    case 0:
      //success
      callback('success');
      break;
    case 1:
      //Not in alliance
      console.log('You are not in an alliance.');
      callback('You are not in an alliance.');
      break;
    case 2:
      //Leader cant leave
      console.log('Pass leader to someone else to leave alliance.');
      callback('Pass leader to someone else to leave alliance.');
      break;
    default:
      //server error
      console.log('Server error when trying to create alliance invite.');
      callback('Oops Sever Error');
    }
    return message;
  });
}

/**************************************************/
/* FUNCTION USED FOR ATTACKING ANOTHER PLAYER CITY*/
/* WHEN A USER CLICKS THE "ATTACK" BUTTON 	      */
/**************************************************/
function sendAttack(attack, user, callback){
  var ticks = 0;
  var a = attack.fromX - attack.toX;
  var b = attack.fromY - attack.toY;
  ticks = Math.ceil(Math.sqrt( a*a + b*b ));
  getResult('SELECT fn_send_attack(?,?,?,?,?,?,?) AS error_code;',
    [user.username, attack.fromX, attack.fromY, attack.toX, attack.toY, attack.warriors, ticks], 
    function(err, results){
      var message = "";
      switch(results[0].error_code){
      case 0:
        //success
        console.log(user.username + ' sent an attack to (' + attack.toX + ',' + attack.toY + ')');
        callback('success');
        break;
      case 1:
        //not enough resources
        console.log(user.username + ' not enough resouces to build a city at (' + tile.x + ',' + tile.y + ')');
        callback('Not enough resources');
        break;
      case 2:
        //city already exists
        console.log(user.username + ' city already exists at (' + tile.x + ',' + tile.y + ')');
        callback('A city is already built here.');
        break;
      default:
        //server error
        console.log(user.username + ' server error when building a city at (' + tile.x + ',' + tile.y + ')');
        callback('Oops Sever Error');
      }
      return message;
    }
  );
}

function getRandomEmptyTile(){
  var randX = Math.floor((Math.random() * 250)); //Get a random number 0-249
  var randY = Math.floor((Math.random() * 250)); //Get a random number 0-249
  var tile = getTile(randX, randY);
  var trys = 0;
  while(tile.owner){
    if(trys > 250*250){
      return false;
    }
    if(randX < 250){
      randX++;
    }else{
      randX = 0;
    }
    if(randY < 250){
      randY++;
    }else{
      randY = 0;
    }
    tile = getTile(randX, randY);
    trys++;
  }
  return tile;
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