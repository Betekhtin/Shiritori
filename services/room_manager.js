let io = require('socket.io-client');
let socket = io.connect('http://localhost:8080');

/*
    room =
    {
        name: "",
        host: "", //name
        players: [], //name and score
        state: "", //in_game, waiting
        current_word: {} //word from dictionary
        used_words: []
    }
*/
let test_room = {
    name: "room1",
    host: "player1",
    players: [],
    state: "waiting",
    current_word: {},
    used_words: []
}

let rooms = [test_room];

socket.on('connect', function () {

    console.log('Connected');

    socket.emit('room_manager_service');

    socket.on('request_rooms', function (data) {
        console.log('Rooms requested:', data.name);
        data.rooms = rooms.filter(x => x.state == 'waiting');
        socket.emit('rooms', data);
    });

});