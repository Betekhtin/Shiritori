let express = require('express');
let http = require('http');
let bodyParser = require('body-parser');
let path = require('path');
let socketIO = require('socket.io');
let app = express();
let server = http.Server(app);
let io = socketIO(server);
let PORT = 8080;

let player_manager_service, room_manager_service;

io.on('connection', function (socket) {
    
    //PLAYER JOINS ROOM
    socket.on('subscribe', function (data) {
        console.log(data.player.name + ' joins the room \'' + data.room + '\'');
        socket.join(data.room);
    });

    //PLAYER LEAVES ROOM
    socket.on('unsubscribe', function (data) {
        console.log(data.player.name + ' leaves the room \'' + data.room + '\'');
        socket.leave(data.room);
    });

    //ADD PLAYER SERVICE CONNECTION
    socket.on('player_manager_service', function () {
        console.log('Player manager service connected:', socket.id);
        player_manager_service = socket;
    });

    //ADDING NEW PLAYER
    socket.on('add_player', function (data) {
        console.log("Adding player: (" + data.id + ', ' + data.name + ")");
        player_manager_service.emit('add_player', data);
    });

    socket.on('player_name_invalid', function (data) {
        console.log('Player name invalid: (' + data.id + ', ' + data.name + ')');
        io.to(data.id).emit('player_name_invalid');
    });

    socket.on('player_already_exists', function (data) {
        console.log('Player already exists: (' + data.id + ', ' + data.name + ')');
        io.to(data.id).emit('player_already_exists');
    });

    socket.on('player_added', function (data) {
        console.log('Player added: (' + data.id + ', ' + data.name + ')');
        io.to(data.id).emit('player_added', data);
    })

    //REMOVING PLAYER
    socket.on('player_disconnect', function (data) {
        console.log("Player disconnected: (" + data.id + ', ' + data.name + ")");
        player_manager_service.emit('player_disconnect', data);
    });

    socket.on('player_disconnected', function (data) {
        console.log("Player removed: (" + data.id + ', ' + data.name + ")");
    });

    //ROOM MANAGER SERVICE CONNECTION
    socket.on('room_manager_service', function () {
        console.log('Room manager service connected:', socket.id);
        room_manager_service = socket;
    });

    //ROOM LIST REQUEST
    socket.on('request_rooms', function (data) {
        console.log('Rooms requested by ' + data.name + ' (' + data.id + ')');
        room_manager_service.emit('request_rooms', data);
    });

    //SENDING ROOMS
    socket.on('rooms', function (data) {
        console.log('Sending rooms to ' + data.name + ' (' + data.id + ')');
        io.to(data.id).emit('rooms', data.rooms);
    });

    //CREATE ROOM REQUEST
    socket.on('create_room', function (data) {
        console.log('Room creating request from ' + data.name + ' (' + data.id + ')');
        room_manager_service.emit('create_room', data);
    });

    //ROOM NAME TAKEN
    socket.on('room_name_taken', function (data) {
        console.log('Room name taken: ' + data.name);
        io.to(data.host.id).emit('room_name_taken', data);
    });

});


//ROUTING AND STUFF
app.set('port', PORT);

app.use(express.static(__dirname + '/public'));

server.listen(PORT, function () {
    console.log('Starting server on port ' + PORT);
});