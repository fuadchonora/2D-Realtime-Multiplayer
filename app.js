var express = require("express");
var Server = require("http").Server;
var session = require("express-session");
//var RedisStore = require("connect-redis")(session);

var app = express();
var server = Server(app);
var io = require("socket.io")(server);



var sessionMiddleware = session({
    //store: new RedisStore({host:"127.0.0.1",port:6379}), // XXX redis server config
    secret: "keyboard cat",
    resave: false,
    saveUninitialized:false
});
io.use(function(socket, next) {
    sessionMiddleware(socket.request, socket.request.res, next);
});
app.use(sessionMiddleware);



app.get('/',function(req, res) {
    //req.session // Session object in a normal request
    req.session.user_id = Math.random();
    res.sendFile(__dirname + '/index.html');
});
app.use('/client',express.static(__dirname + '/client'));




var SOCKET_LIST = {};
//var PLAYER_LIST = {};
var ROOMS = [[]];

io.sockets.on('connection', function(socket){
    //socket.request.session.user_id
    socket.id = Math.random();//socket.request.session.user_id;
    SOCKET_LIST[socket.id] = socket;
    SOCKET_LIST[socket.id].status = 'in-online';
    SOCKET_LIST[socket.id].x = 0;
    SOCKET_LIST[socket.id].y = 0;
    SOCKET_LIST[socket.id].number = "" + Math.floor(10 * Math.random());
    console.log(socket.id+"  Connected");
    console.log('Total Players : '+Object.keys(SOCKET_LIST).length);

    socket.emit('registerUser',{id:socket.id});

    socket.on('invitePlayer',function(data){
        SOCKET_LIST[data.opId].emit('invitation',{opId:socket.id})
    })

    socket.on('createRoom',function(data){
        console.log('Created New Room');
        SOCKET_LIST[socket.id].status = 'in-room';
        ROOMS[0][ROOMS[0].length] = SOCKET_LIST[socket.id];
        SOCKET_LIST[data.opId].status = 'in-room';
        ROOMS[0][ROOMS[0].length] = SOCKET_LIST[data.opId];
    });
    socket.on('invitationReject',function(data){
        console.log('an invitation rejected')
        SOCKET_LIST[data.opId].emit('invitationReject');
    })

    socket.on('joinRoom',function(){
        console.log(socket.id+'  Joined the room');
        SOCKET_LIST[socket.id].status = 'in-room';
        ROOMS[0][ROOMS[0].length] = SOCKET_LIST[socket.id];
    });
    socket.on('leaveRoom',function(){
        console.log(socket.id+'  Leaved the room');
        for(var i in ROOMS[0]){
            if(ROOMS[0][i].id==socket.id){
                delete ROOMS[0][i];
                SOCKET_LIST[socket.id].status = 'in-online';
            }
        }
    })

    socket.on('newPosition',function(data){
        if(data.x && data.y){
            SOCKET_LIST[socket.id].x = data.x;
            SOCKET_LIST[socket.id].y = data.y;
        }
    })

    socket.on('disconnect',function(){
        console.log(socket.id+"  disconnected");
        delete SOCKET_LIST[socket.id];
        for(var i in ROOMS[0]){
            if(ROOMS[0][i].id==socket.id){
                delete ROOMS[0][i];
                console.log(socket.id+'  Leaved the room');
            }
        }
    });

});

setInterval(function(){

    var currentPlayers = {};
    for(var i in SOCKET_LIST){
        currentPlayers[SOCKET_LIST[i].id]={
            id:SOCKET_LIST[i].id,
            status:SOCKET_LIST[i].status,
            x:SOCKET_LIST[i].x,
            y:SOCKET_LIST[i].y,
        };
    }
    io.emit('updateList',currentPlayers);
},1000);


setInterval(function(){

    var pack = [];
    for(var i in ROOMS[0]){
        var socket = ROOMS[0][i];
        pack.push({
            status:socket.status,
            x:socket.x,
            y:socket.y,
            number:socket.number
        });
    }

    for(var i in ROOMS[0]){
        var socket = ROOMS[0][i];
        socket.emit('updatePositions',pack);
    }

    //io.emit('updatePositions',pack);

},1000/25);

server.listen(2000, function () {
    console.log('server listening on http://localhost:2000');
});
