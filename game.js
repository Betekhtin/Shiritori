let socket = io.connect(window.location.hostname + ':8080', {
  resource: 'api'
})

console.log('りそう > うつわ > わりあて') // Cheatsheet for testing

let player = {
  id: undefined,
  name: undefined,
  room: undefined,
  isHost: undefined
}

let room = {
  room: undefined,
  host: undefined,
  players: [],
  status: undefined
}

let game = {
  current_player: undefined,
  current_word: undefined,
  word_info: undefined,
  used_words: []
}

socket.on('connect', function () {
  player = {
    id: socket.id,
    name: undefined,
    room: undefined
  }
  socket.emit('subscribe', {
    player: player,
    room: 'lobby'
  })
  player.room = 'lobby'
  init_rooms()
})

let logged_in = false

$(window).bind('beforeunload', function () {
  socket.emit('unsubscribe', {
    player: player,
    room: player.room
  })
  socket.emit('player_disconnect', player)
  socket.close()
})

// NAME INPUT
$('#send_name').on('click', function () {
  button_loading('#send_name', 'Loading')
  let name = $('#name').val()
  let id = socket.id
  console.log('ID: ' + id, 'Name: ' + name)
  player = {
    id: id,
    name: name,
    room: undefined
  }
  popover_disable('#name')
  socket.emit('add_player', player)
})

socket.on('player_name_invalid', function (data) {
  stop_button_loading('#send_name', 'Enter')
  $('#send_name').attr('disabled', false)
  popover_message('#name', 'Invalid name', 'The name you chose is invalid. Only english letters, digits and japanese characters are allowed. Please, try using another name.')
  console.log('Player name invalid')
})

socket.on('player_already_exists', function (data) {
  stop_button_loading('#send_name', 'Enter')
  $('#send_name').attr('disabled', false)
  popover_message('#name', 'Name already taken', 'This name was already taken by another player in the current session. Please, try using another name.')
  console.log('Player already exists')
})

socket.on('player_added', function (data) {
  player.name = data.name
  logged_in = true
  stop_button_loading('#send_name', 'Enter')
  disable_tooltips()
  $('#name_input').html('<span class="navbar-brand">こんにちは、' + player.name + '</span>')
  console.log('Player added')
  popover_disable('#name')
})

// DISCONNECT
socket.on('disconnect', function () {
  socket.emit('player_disconnect', player)
  console.log('Disconnected')
})

// DISPLAYING ROOMS
function init_rooms () {
  loading('Loading rooms...')
  console.log('Requesting rooms')
  socket.emit('request_rooms', player)
  socket.on('rooms', function (data) {
    console.log('Rooms:', data)
    loading_stop()
    update_rooms(data)
  })
}

function update_rooms (data) {
  if (data.length < 1) {
    console.log('No rooms')
    $('#rooms').hide()
    $('#no_rooms').show()
  } else {
    $('#rooms').show()
    $('#no_rooms').hide()
    let body = $('#rooms_body')
    body.html('')
    for (room of data) {
      let waiting = room.status === 'waiting'
      let html = `
        <tr>
            <th scope="row">${room.room}</th>
            <td>${room.host.name}</td>
            <td>${room.players.length}/${room.max_players}</td>
            <td><span class="${room.status}">${waiting ? 'Waiting' : 'In game'}</span></td>
            <td>
                <span class="d-block btn_wrp ${waiting ? '' : 'ingame_wrp'}" tabindex="0" data-toggle="tooltip" data-placement="top" 
                      title="${waiting ? (logged_in ? '' : 'Enter your name before joining a room') : 'Game is already in progress'}">
                    <button room_name="${room.room}" class="btn btn-block btn-secondary room_btn room_join ${waiting ? '' : 'ingame_btn'}" style="pointer-events: none;" ${waiting && logged_in ? '' : 'disabled'}>Join</button>
                </span>
            </td>
        </tr>`

      body.append(html)
    }

    $('.room_join').on('click', function () {
      let name = $(this).attr('room_name')
      player.room = name
      player.isHost = false
      init_game()
      socket.emit('subscribe', {
        player: player,
        room: name
      })
      socket.emit('unsubscribe', {
        player: player,
        room: 'lobby'
      })
    })
    enable_tooltips()
  }
}

// CREATING A ROOM
$('#create_room_btn').on('click', function () {
  button_loading('#create_room_btn', 'Loading')
  $('#close_room_creation').attr('disabled', true)
  socket.emit('create_room', {
    room: $('#room_name').val(),
    host: {
      name: player.name,
      id: player.id
    },
    players: [],
    max_players: $('#room_max_players').val(),
    status: 'waiting'
  })
})

socket.on('room_name_taken', function (data) {
  console.log('Room name taken')
  popover_message('#room_name', 'Room name taken', 'A room with this name already exists. Plese, choose another name.')
  $('#close_room_creation').attr('disabled', false)
  stop_button_loading('#create_room_btn', 'Create room')
})

socket.on('room_created', function (data) {
  console.log('Room created')
  socket.emit('subscribe', {
    player: player,
    room: data.room
  })
  socket.emit('unsubscribe', {
    player: player,
    room: 'lobby'
  })
  room.room = data.room
  room.host = data.host.name
  room.status = data.status
  player.room = data.room
  player.isHost = true
  init_game()
})

const add_player = name => {
  let html = `
    <tr style='
      color: 
      ${(name === player.name)
        ? '#28A745'
        : 'black'}
      '
      player_name="${name}"> 
      <td>${name}${(name === room.host.name) ? '★ ' : ''}</td>
    </tr>
  `
  $('#players').append(html)
}

function init_game () {
  // Init game field
  $('#content').html(`
    <div class="row" id="game">
      <div id="sidebar" class="col-4 d-flex flex-column">
      <table class="table table-sm">
        <thead>
          <tr scope="col"><b>Players</b></tr>
        </thead>
        <tbody id="players">
        </tbody>
      </table>
      </div>
      <div id="game_field" class="col-8 center-block container">
      </div>
    </div>`)
  $('#room_creation').modal('hide')
}

function formCurrentWordHtml (word, wordInfo) {
  if (word.lenght === 1) {
    return `<span class="last_kana">${word}</span>`
  }
  let html = word.slice(0, word.length - 2)
  if (word[word.length - 1] === wordInfo.last_kana) {
    return html +
           word[word.length - 2] +
           `<span class="last_kana">${word[word.length - 1]}</span>`
  } else {
    return html +
           `<span class="last_kana">${word[word.length - 2]}</span>` +
            word[word.length - 1]
  }
}

function formWordInfoHtml (wordInfo) {
  return wordInfo.word + '(' + wordInfo.romaji + ') - ' + wordInfo.translation
}

function update_players (players) {
  $('#players').html('')
  for (let name of players) {
    add_player(name)
  }
  if (player.isHost) {
    $('#start_game_button').remove()
    $('#sidebar').append(
      `<button id="start_game_button" type="button" class="btn btn-block btn-active mt-auto">
        Start
      </button>`
    )
    $('#start_game_button').on('click', function () {
      $(this).remove()
      socket.emit('game_start', room)
    })
  }
}

socket.on('room_joined', function (data) {
  room.room = data.room
  room.host = data.host
  room.status = data.status
  room.players = data.players
  console.log('Player joined room: ', data)
  update_players(data.players)
})

socket.on('room_left', function (data) {
  console.log('Player left room: ', data)
  console.log(data)
  $(`[player_name='${data.name}']`).remove()
})

socket.on('game_started', function (data) {
  console.log('Game started: ', data)
  $(`[player_name=${data.current_player}]`).css('background-color', '#DDDDDD')
  game.current_player = data.current_player
  game.current_word = data.current_word
  game.word_info = data.word_info
  game.used_words = data.used_words
  let word_send_container = `
    <div id="word_send_container" class="row align-items-center justify-content-center form-inline">
      <input id="word_input" class="form-control" name="word" type=text></input>
      <button id="send_word" class="btn btn-active">Send</button>
    </div>
    <p id="info_hiragana" class="text-grey text-center" style="padding-top: 10px;">Remember! Only <span class="last_kana">hiragana</span> is allowed!</p>`
  $('#game_field').html(`
    <h6 class="text-grey text-center my-auto">Current word:</h6>
    <h1 id="current_word" class="text-center my-auto" style="font-size: 5rem">${formCurrentWordHtml(data.current_word, data.word_info)}</h1>
    <h6 class="text-grey text-center my-auto">${formWordInfoHtml(data.word_info)}</h3>
    ${(game.current_player === player.name)
      ? word_send_container
      : ''}`)
  $('#send_word').on('click', function () {
    let word = $('#word_input').val()
    socket.emit('word', {
      room: room.room,
      word: word
    })
  })
})

socket.on('word_accepted', function (data) {
  $('word_send_container').html('')
  $('info_hiragana').html('')
  $(`[player_name=${game.current_player}]`).css('background-color', '')
  $(`[player_name=${data.nextPlayer}]`).css('background-color', '#DDDDDD')
  game.current_player = data.nextPlayer
  game.current_word = data.word
  game.word_info = data.word_info
  let word_send_container = `
    <div id="word_send_container" class="row align-items-center justify-content-center form-inline">
      <input id="word_input" class="form-control" name="word" type=text></input>
      <button id="send_word" class="btn btn-active">Send</button>
    </div>
    <p id="info_hiragana" class="text-grey text-center" style="padding-top: 10px;">Remember! Only <span class="last_kana">hiragana</span> is allowed!</p>`
  $('#game_field').html(`
    <h6 class="text-grey text-center my-auto">Current word:</h6>
    <h1 id="current_word" class="text-center my-auto" style="font-size: 5rem">${formCurrentWordHtml(data.word, data.word_info)}</h1>
    <h6 class="text-grey text-center my-auto">${formWordInfoHtml(data.word_info)}</h3>
    ${(game.current_player === player.name)
      ? word_send_container
      : ''}`)
  $('#send_word').on('click', function () {
    let word = $('#word_input').val()
    socket.emit('word', {
      room: room.room,
      word: word
    })
  })
})

function getGameOverMessage (data) {
  switch (data.reason) {
    case 'no_such_word': return `Unfortunatyly, there is no word ${data.word}`
    case 'ends_with_n': return 'The word should not end with ん'
    case 'not_noun': return 'Only nouns are allowed'
    case 'word_used': return 'Unfortunately, this word was already used'
    case 'wrong_beginning': return 'First kana is not equal to the last kana of previous word'
    default: return ''
  }
}

socket.on('game_over', function (data) {
  console.log('Game over: ', data)
  $('#game_field').html(`
    <h6 class="text-grey text-center my-auto">GAME OVER</h6>
    <h1 id="current_word" class="text-center my-auto" style="font-size: 5rem">${data.word}</h1>
    <h6 class="text-grey text-center my-auto">${getGameOverMessage(data)}</h3>
    <h6 class="text-grey text-center my-auto">You will be returned to the lobby in 5 seconds</h3>
 `)
  socket.emit('subscribe', {
    player: player,
    room: 'lobby'
  })
  socket.emit('unsubscribe', {
    player: player,
    room: player.room
  })
  player.room = undefined
  player.isHost = undefined
  room = {
    room: undefined,
    host: undefined,
    players: [],
    status: undefined
  }
  game = {
    current_player: undefined,
    current_word: undefined,
    word_info: undefined,
    used_words: []
  }
  setTimeout(() => {
    location.reload()
  }, 5000)
})

// COSMETIC FUNCTIONS
enable_tooltips()

function button_loading (selector, message) {
  $(selector).attr('disabled', true)
  $(selector).html('<i class="fa fa-circle-o-notch fa-spin"></i> ' + message)
}

function stop_button_loading (selector, message) {
  $(selector).attr('disabled', false)
  $(selector).html(message)
}

function popover_message (selector, title, message) {
  let pop = $(selector)
  pop.attr('title', title)
  pop.attr('data-content', message)
  pop.popover('show')
};

function popover_disable (selector) {
  let pop = $(selector)
  pop.popover('dispose')
}

function loading (message) {
  let load = $('#loading')
  let load_msg = $('#loading_message')
  load_msg.html(message)
  load.show()
}

function loading_stop () {
  let load = $('#loading')
  load.hide()
}

function enable_tooltips () {
  $('.btn_wrp').tooltip('enable')
}

function disable_tooltips () {
  $('.room_btn').attr('style', '')
  $('.room_btn').attr('disabled', false)
  $('.ingame_btn').attr('disabled', true)
  $('.ingame_btn').attr('style', 'pointer-events: none')
  $('.btn_wrp').tooltip('disable')
  $('.ingame_wrp').tooltip('enable')
}
