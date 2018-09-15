console.log('Using /server_modules/chatserver.js');

/***************CHAT EVENTS**********************/
var InitializeChatServer = function(socket){

	socket.on('globalMessage', function(data){
		writeChatMessage(data.sentBy, data.text)
	});

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
}
  /*************END CHAT EVENTS********************/