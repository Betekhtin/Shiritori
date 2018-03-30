let io = require('socket.io-client');
let socket = io.connect('http://localhost:8080');

/*
    room =
    {
        name: "",
        host: {
            name: "",
            id: ""
        },
        players: [], //name and score
        max_players: "", //int
        status: "", //in_game, waiting
        current_word: "" //word from dictionary
        used_words: []
    }
*/
let test_rooms = [
    {
        name: "room 1",
        host: "player 1",
        players: ["player 1"],
        max_players: 32,
        status: "waiting",
        current_word: {},
        used_words: []
    },
    {
        name: "room 2",
        host: "player 2",
        players: ["player 2"],
        max_players: 32,
        status: "in_game",
        current_word: {},
        used_words: []
    }
];

let rooms = [];

socket.on('connect', function () {

    console.log('Connected');

    socket.emit('room_manager_service');

    socket.on('request_rooms', function (data) {
        console.log('Rooms requested:', data.name + ' (' + data.id + ')');
        data.rooms = rooms;
        socket.emit('rooms', data);
    });

    socket.on('create_room', function (data) {
        if (rooms.find(room => room.name == data.name)) {
            socket.emit('room_name_taken', data);
        } else {
            rooms.push(data);
            socket.emit('room_created', data);
        };
    });

});