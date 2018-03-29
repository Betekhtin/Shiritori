let socket = io.connect(window.location.hostname + ':8080', {
    resource: 'api'
})
let player = {
    id: socket.id,
    name: undefined,
    room: undefined
};

$('#send_name').on('click', function () {
    $('#send_name').attr('disabled', true);
    loading('Checking name...');
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
    loading_stop();
    $('#send_name').attr('disabled', false);
    popover_message('Invalid name', 'The name you chose is invalid. Only english letters, digits and japanese characters are allowed. Please, try using another name.');
    console.log('Player name invalid');
});

socket.on('player_already_exists', function (data) {
    loading_stop();
    $('#send_name').attr('disabled', false);
    popover_message('Name already taken', 'This name was already taken by another player in the current session. Please, try using another name.')
    console.log('Player already exists');
});

socket.on('player_added', function (data) {
    loading_stop();
    username = data.name;
    $('#name_input').html('<span class="navbar-brand">こんにちは、' + player.name + '</span>');
    console.log('Player added');
    popover_disable();
    init_rooms();
})

socket.on('disconnect', function(){
    let name = $('#name').val();
    let id = socket.id;
    socket.emit('player_disconnect', player)
    console.log('Disconnected');   
});

function popover_message(title, message){
    let pop = $('#name');
    pop.attr('title', title);
    pop.attr('data-content', message);
    pop.popover('show');
};

function popover_disable(){
    let pop = $('#name');
    pop.popover('dispose');
}

function loading(message){
    let load = $('#loading');
    let load_msg = $('#loading_message');
    load_msg.html(message);
    load.show();
}

function loading_stop(){
    let load = $('#loading');
    load.hide();
}

function init_rooms(){
    console.log("Requesting rooms");
    socket.emit('request_rooms', player)
    socket.on('rooms', function(data){
        console.log("Rooms:", data)
    })
};