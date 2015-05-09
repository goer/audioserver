// var JSData = require('js-data');
// var DSHttpAdapter = require('js-data-http');

// var adapter = new DSHttpAdapter();
// adapter.defaults.basePath = 'http://192.168.35.126:2403/';


// var chat = new JSData.DS();
// chat.registerAdapter(
// 	'http', 
// 	adapter, 
// 		{ 	default: true,
// 		}
// 	);
// var Message = chat.defineResource('message');
// Message.findAll({ roomid: "123" }).then(function(ms){
// 	array.forEach(ms,function(v,k){
// 		console.log("m:"+v.id);
// 	});
// })


// var Restangular=require('node-restangular');

// Restangular.setBaseUrl('http://192.168.35.126:2403/');
// Restangular.all('message').getList().then(function(msgs){
// 	console.log("msgs:"+msgs);
// })


// var unirest = require('unirest');
// var _ = require('underscore');
// unirest.get('http://192.168.35.126:2403/message').end(function(response){
// 		console.log("status:"+response.status);
// 		if(response.status===200){
// 			res.status=200;
// 			res.body=response.body;
// 			// _.each(response.body,function(v, k){
// 			// 	console.log("message:"+v.id);
// 			// });
// 		}
// 	});

// express = require('express');
// app = require('express.io')();
// app.http().io();
// var fs=require('fs');
// var bodyParser = require('body-parser');
// var jsonParser = bodyParser.json();


var express = require('express')
    , app = express()
    , server = require('http').createServer(app)
    , io = require("socket.io").listen(server)
	, util = require('util')
	, bodyParser = require('body-parser')
	;

function saveAudioData(data,cb){

	var buf = new Buffer(data, 'base64'); 
	var uuid = require('uuid');
	var fin = '/tmp/'+uuid.v4()+'.wav';
	var fout = uuid.v4()+'.mp3';
	var fs=require('fs');
	var input = fs.createWriteStream(fin);
	input.write(buf);
	input.end();
	var child_process= require('child_process');
	var ffmpeg = child_process.spawn('ffmpeg', [ '-v', 'debug', '-i', fin, '-f', 'mp3', '-y', 'public/audio/'+fout]);
	ffmpeg.stderr.on('close', function() {
	    console.log('Saving OK: '+fout);
	    fs.unlink(fin);
	    cb(fout);
	});
	return fout;

}
var ENV = 'development';

app.set('port', process.env.OPENSHIFT_NODEJS_PORT || 7070);
app.set('ipaddr', process.env.OPENSHIFT_NODEJS_IP || "0.0.0.0");
app.use(express.static(__dirname + '/public'));	

//app.use(express.bodyParser());
//app.use(express.methodOverride());

//app.use(bodyParser.urlencoded());
//app.use(bodyParser.json());


app.use('/api/audio',bodyParser.json());
app.get('/api/audio/test', function(req, res) {
	console.log('Receive Audio Message:')
	res.json({statusid:200, content:'cool !'});
});

app.post('/api/audio/messageaudio', function(req, res) {

	console.log('Receive Audio Message:')
	var uuid = require('uuid');
	//if (!req.body) return res.json({id:uuid.v4(),statusid:400});
	//console.log('BODY:'+JSON.stringify( util.inspect(req) ));
	//var data = JSON.parse(req.body);
	var data = req.body;
	var m={id:uuid.v4(), statusid:200, roomid: data.roomid,   typeid: 2, userid: data.userid }
	saveAudioData(data.content,function(fo){
		m.content= fo
		io.sockets.in(data.roomid).emit('message',m);
		console.log('Audio OK:'+JSON.stringify(m))
		res.json(m);
	});

});


// setup deployd
//MongoDB 2.4 database added.  Please make note of these credentials:
//
//	Root User:     admin
//Root Password: hTUSfXHY-Fbq
//Database Name: audioserver
//
//Connection URL: mongodb://$OPENSHIFT_MONGODB_DB_HOST:$OPENSHIFT_MONGODB_DB_PORT/
//URL:        http://audioserver-fonetix.rhcloud.com/
//SSH to:     554c9bf94382ec6feb00001f@audioserver-fonetix.rhcloud.com
//Git remote: ssh://554c9bf94382ec6feb00001f@audioserver-fonetix.rhcloud.com/~/git/audioserver.git/
//Cloned to:  /Users/goer/projects/testaudio/server/audioserver


require('deployd').attach(server, {
	socketIo: io,  // if not provided, attach will create one for you.
	env: ENV,
	db: {
		host: process.env.OPENSHIFT_MONGODB_DB_HOST || 'localhost' ,
		port: process.env.OPENSHIFT_MONGODB_DB_PORT || 27017,
		name: '-deployd',
		//name: 'audioserver',
		//credentials : {
		//	username: 'admin',
		//	password: 'hTUSfXHY-Fbq'
		//}


	}
});
// After attach, express can use server.handleRequest as middleware
app.use(server.handleRequest);


// app.use(function (req, res, next) {
// 		res.header("Access-Control-Allow-Origin", "*");
//         res.header("Access-Control-Allow-Headers", "X-Requested-With");
//         res.header("Access-Control-Allow-Headers", "Content-Type");
//         res.header("Access-Control-Allow-Methods", "PUT, GET, POST, DELETE, OPTIONS");
//         next();
//     }
// );


io.on('connection', function(s) {

	console.dir("New User");
	s.emit('connected',{status:200,message: 'connected'})

	s.on('join',function(data){
		console.log('Join user:'+data.userid+' join room:'+data.roomid);
		s.join(data.roomid);
	})

	s.on('leave',function(data){
		console.log('Leave user:'+data.userid+' join room:'+data.roomid);
		s.leave(data.roomid);
	})

	s.on('message',function(data){
		console.log('Message user:'+data.userid+'  room:'+data.roomid+' content:'+data.content);
		s.emit('message', data);
	})


})


server.listen(app.get('port'), app.get('ipaddr'), function(){
    console.log('Express server listening on  IP: ' + app.get('ipaddr') + ' and port ' + app.get('port'));
});

