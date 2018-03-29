let io = require('socket.io-client');
let socket = io.connect('http://localhost:8080');
let name_regex = /^[0-9a-zA-Z\-\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf\u3400-\u4dbf]+$/;

/*  
    player =
    {
       id: "",
       name: "",
       room: ""
    }
*/
let players = [];

socket.on('connect', function () {

    console.log('Connected');

    socket.emit('player_manager_service');

    socket.on('add_player', function (data) {
        if (!name_regex.test(data.name)) socket.emit('player_name_invalid', {
            id: data.id
        })
        else
        if (players.find(player => player.name == data.name)) socket.emit('player_already_exists', {
            id: data.id,
            name: data.name
        })
        else {
            socket.emit('player_added', {
                id: data.id,
                name: data.name
            });
            players.push(data);
            console.log('New player: ' + data.name);
            console.log('Players:', players.map(x => x.name));
        }
    })

    socket.on('player_disconnect', function (data) {
        socket.emit('player_disconnected', {
            id: data.id,
            name: data.name
        });
        let index = players.findIndex(x => x.id == data.id);
        players.splice(index, 1);
        console.log('Players:', players.map(x => x.name));

    })

})

socket.on('disconnect', function () {
    console.log('Disconnected');
});