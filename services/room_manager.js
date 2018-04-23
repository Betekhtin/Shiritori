let io = require('socket.io-client')
let socket = io.connect('http://localhost:8080')

/*
    ROOM_TEMPLATE =
    {
      room: "",
      host: {
        name: "",
        id: ""
      },
      players: [], // names
      max_players: "", //int
      status: "", // in_game, waiting
    }
*/

/* // Rooms for lobby behavior tasting
let testRooms = [
  {
    room: 'room 1',
    host: 'player 1',
    players: ['player 1'],
    max_players: 32,
    status: 'waiting'
  },
  {
    room: 'room 2',
    host: 'player 2',
    players: ['player 2'],
    max_players: 32,
    status: 'in_game'
  }
]
*/

let rooms = []

socket.on('connect', function () {
  console.log('Room manager connected')

  socket.emit('room_manager_service')

  socket.on('request_rooms', function (data) {
    console.log('Rooms requested:', data.name + ' (' + data.id + ')')
    data.rooms = rooms
    socket.emit('rooms', data)
  })

  socket.on('create_room', function (data) {
    if (rooms.find(room => room.room === data.room)) {
      console.log('Room name taken: ', data)
      socket.emit('room_name_taken', data)
    } else {
      console.log('Room created: ', data)
      rooms.push(data)
      socket.emit('room_created', data)
      socket.emit('rooms_lobby_update', rooms)
    }
  })

  socket.on('room_joining', function (data) {
    for (let room of rooms) {
      if (room.room === data.room) {
        if (room.players.length === room.max_players) {
          console.log('Max amount of players reached:', room.room)
          return
        }
        console.log(`${data.player.name} joined the room: ${room.room}`)
        room.players.push(data.player.name)
        data.players = room.players
        data.host = room.host
        socket.emit('room_joined', data)
        socket.emit('rooms_lobby_update', rooms)
        return
      }
    }
    console.log(`Join attempt - no room named '${data.room}'`)
  })

  socket.on('room_leaving', function (data) {
    for (let i = 0; i < rooms.length; ++i) {
      let room = rooms[i]
      if (room.room === data.room) {
        if (!room.players.includes(data.player.name)) {
          console.log(`No player ${data.player.name} in room ${data.room}`)
        }
        if (room.players.length - 1 === 0) {
          console.log('Room is empty: ', room.room)
          rooms = rooms.filter(el => {
            return el.room !== room.room
          })
          data.rooms = rooms
          socket.emit('rooms_lobby_update', rooms)
          socket.emit('room_deleted', room.room)
          return
        } else {
          console.log(`${data.player.name} left the room: ${room.room}`)
          rooms[i].players = rooms[i].players.filter(player => {
            return player !== data.player.name
          })
          socket.emit('room_left', data)
          return
        }
      }
    }

    console.log(`Leave attempt - no room named '${data.room}'`)
  })

  socket.on('game_start', function (data) {
    console.log('Game started in room: ', data)
    for (let i = 0; i < rooms.length; ++i) {
      if (rooms[i].room === data.room) {
        rooms[i].status = 'in_game'
        break
      }
    }
    socket.emit('rooms_lobby_update', rooms)
  })
})
