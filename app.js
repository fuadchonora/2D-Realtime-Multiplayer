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

io.sockets.on('connection', function(socket){
    //socket.request.session.user_id
    socket.id = socket.request.session.user_id;
    socket.x = 0;
    socket.y = 0;
    socket.number = "" + Math.floor(10 * Math.random());
    SOCKET_LIST[socket.id] = socket;
    console.log(socket.id+"  Connected");

    //socket.emit('assignUser',{userId:socket.id});

    socket.on('newPosition',function(data){
        SOCKET_LIST[socket.id].x = data.x;
        SOCKET_LIST[socket.id].y = data.y;
    })

    socket.on('disconnect',function(){
        console.log(socket.id+"  disconnected");
        delete SOCKET_LIST[socket.id];
    });

});

setInterval(function(){
    var pack = [];
    for(var i in SOCKET_LIST){
        var socket = SOCKET_LIST[i];
        pack.push({
            x:socket.x,
            y:socket.y,
            number:socket.number
        });
    }
    for(var i in SOCKET_LIST){
        var socket = SOCKET_LIST[i];
        socket.emit('updatePositions',pack);
    }
},1000/25);

server.listen(2000, function () {
    console.log('server listening on http://localhost:2000');
});
