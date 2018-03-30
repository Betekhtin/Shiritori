let socket = io.connect(window.location.hostname + ':8080', {
    resource: 'api'
})

socket.on('connect', function () {
    player = {
        id: socket.id,
        name: undefined,
        room: undefined
    };
    socket.emit('subscribe', {
        player: player,
        room: 'lobby'
    });
    init_rooms();
})


let logged_in = false;

$(window).bind('beforeunload', function() {
    socket.emit('player_disconnect', player); 
    socket.close();
});

// NAME INPUT
$('#send_name').on('click', function () {
    button_loading('#send_name', 'Loading');
    let name = $('#name').val();
    let id = socket.id;
    console.log('ID: ' + id, 'Name: ' + name);
    player = {
        id: id,
        name: name,
        room: undefined
    }
    popover_disable();
    socket.emit('add_player', player)
})
socket.on('player_name_invalid', function (data) {
    stop_button_loading('#send_name', 'Enter');
    $('#send_name').attr('disabled', false);
    popover_message('Invalid name', 'The name you chose is invalid. Only english letters, digits and japanese characters are allowed. Please, try using another name.');
    console.log('Player name invalid');
});

socket.on('player_already_exists', function (data) {
    stop_button_loading('#send_name', 'Enter');
    $('#send_name').attr('disabled', false);
    popover_message('Name already taken', 'This name was already taken by another player in the current session. Please, try using another name.')
    console.log('Player already exists');
});

socket.on('player_added', function (data) {
    logged_in = true;
    stop_button_loading('#send_name', 'Enter');
    disable_tooltips();
    username = data.name;
    $('#name_input').html('<span class="navbar-brand">こんにちは、' + player.name + '</span>');
    console.log('Player added');
    popover_disable();
})

// DISCONNECT
socket.on('disconnect', function () {
    socket.emit('player_disconnect', player)
    console.log('Disconnected');
});


// DISPLAYING ROOMS
function init_rooms() {
    loading('Loading rooms...')
    console.log('Requesting rooms');
    socket.emit('request_rooms', player);
    socket.on('rooms', function (data) {
        console.log("Rooms:", data)
        loading_stop();
        update_rooms(data);
    });
};

function update_rooms(data) {
    if (data.length < 1) {
        console.log("No rooms")
        $('#rooms').hide();
        $('#no_rooms').show();
    } else {
        $('#rooms').show();
        let body = $('#rooms_body');
        for (room of data) {
            let waiting = room.status == 'waiting'
            let html = `<tr>
                            <th scope="row">${room.name}</th>
                            <td>${room.host.name}</td>
                            <td>${room.players.length}/${room.max_players}</td>
                            <td><span class="${room.status}">${waiting ? 'Waiting':'In game'}</span></td>
                            <td>
                                <span class="d-block btn_wrp ${waiting ? '':'ingame_wrp'}" tabindex="0" data-toggle="tooltip" data-placement="top" 
                                    title="${waiting ? (logged_in ? '':'Enter your name before joining a room'):'Game is already in progress'}">
                                    <button class="btn btn-block btn-secondary room_btn ${waiting? '':'ingame_btn'}" style="pointer-events: none;" ${waiting && logged_in? '':'disabled'}>Join</button>
                                </span>
                            </td>
                        </tr>`;
            body.append(html);
        }
        enable_tooltips();
    }
}


// CREATING A ROOM
$('#create_room_btn').on('click', function () {
    button_loading('#create_room_btn', 'Loading');
    $('#close_room_creation').attr('disable', true);
    socket.emit('create_room', {
        name: $('#room_name').val(),
        host: {
            name: player.name,
            id: player.id
        },
        players: [],
        max_players: $('#room_max_players').val(),
        status: 'waiting',
        current_word: null,
        used_words: []
    });
});

socket.on('room_name_taken', function (data) {
    console.log('Room name taken');
    $('#close_room_creation').attr('disable', false);
    stop_button_loading('#create_room_btn', 'Create room');
});

socket.on('room_created', function (data) {
    console.log('Room created');
});


// COSMETIC FUNCTIONS

enable_tooltips();

function button_loading(selector, message) {
    $(selector).attr('disabled', true);
    $(selector).html('<i class="fa fa-circle-o-notch fa-spin"></i> ' + message);
}

function stop_button_loading(selector, message) {
    $(selector).attr('disabled', false);
    $(selector).html(message);
}

function popover_message(title, message) {
    let pop = $('#name');
    pop.attr('title', title);
    pop.attr('data-content', message);
    pop.popover('show');
};

function popover_disable() {
    let pop = $('#name');
    pop.popover('dispose');
}

function loading(message) {
    let load = $('#loading');
    let load_msg = $('#loading_message');
    load_msg.html(message);
    load.show();
}

function loading_stop() {
    let load = $('#loading');
    load.hide();
}

function enable_tooltips() {
    $('.btn_wrp').tooltip('enable');
}

function disable_tooltips() {
    $('.room_btn').attr('style', '');
    $('.room_btn').attr('disabled', false);
    $('.ingame_btn').attr('disabled', true);
    $('.ingame_btn').attr('style', 'pointer-events: none');
    $('.btn_wrp').tooltip('disable');
    $('.ingame_wrp').tooltip('enable');
}