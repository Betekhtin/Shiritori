let express = require('express')
let http = require('http')
let path = require('path')
let socketIO = require('socket.io')
let obfuscator = require('javascript-obfuscator')
let fs = require('fs')

let clientCode = fs.readFileSync(path.join(__dirname, 'game.js'), 'utf8')
let obfuscationOptions = {
  compact: true,
  controlFlowFlattening: true,
  deadCodeInjection: true,
  debugProtection: true, // Should be false only while debugging
  disableConsoleOutput: true, // Should be false only while debugging
  renameGlobals: true
}
clientCode = obfuscator.obfuscate(clientCode, obfuscationOptions).getObfuscatedCode()
let filename = path.join(__dirname, 'public', 'scripts', 'game_obf.js')
fs.writeFileSync(filename, clientCode)

let app = express()
let server = http.Server(app)
let io = socketIO(server)
let PORT = 8080

let playerManagerService, roomManagerService, gameManagerService

io.on('connection', function (socket) {
  // ----- 1. ROOM MANAGEMENT -----

  // ROOM MANAGER SERVICE CONNECTION
  socket.on('room_manager_service', function () {
    console.log('Room manager service connected:', socket.id)
    roomManagerService = socket
  })

  // PLAYER JOINS ROOM
  socket.on('subscribe', function (data) {
    console.log(data.player.name + ' subscribes to the room \'' + data.room + '\'')
    socket.join(data.room)
    if (data.room !== 'lobby') roomManagerService.emit('room_joining', data)
  })

  // PLAYER LEAVES ROOM
  socket.on('unsubscribe', function (data) {
    console.log(data.player.name + ' unsubscribes from the room \'' + data.room + '\'')
    socket.leave(data.room)
    if (data.room !== 'lobby') roomManagerService.emit('room_leaving', data)
  })

  // PLAYERS JOINING AND LEAVING ROOM
  socket.on('room_joined', function (data) {
    console.log(data.player.name + ' joins the room \'' + data.room + '\'')
    io.to(data.room).emit('room_joined', data)
  })

  socket.on('room_left', function (data) {
    console.log(data.player.name + ' left the room \'' + data.room + '\'')
    io.to(data.room).emit('room_left', data.player)
  })

  socket.on('room_deleted', function (data) {
    console.log('Room deleted: ', data)
    gameManagerService.emit('room_deleted', data)
  })

  // ROOM LIST REQUEST
  socket.on('request_rooms', function (data) {
    console.log('Rooms requested by ' + data.name + ' (' + data.id + ')')
    roomManagerService.emit('request_rooms', data)
  })

  // SENDING ROOMS
  socket.on('rooms', function (data) {
    console.log('Sending rooms to ' + data.name + ' (' + data.id + ')')
    io.to(data.id).emit('rooms', data.rooms)
  })

  // CREATE ROOM REQUEST
  socket.on('create_room', function (data) {
    console.log('Room creating request from ' + data.host.name + ' (' + data.host.id + ')')
    roomManagerService.emit('create_room', data)
  })

  // ROOM NAME TAKEN
  socket.on('room_name_taken', function (data) {
    console.log('Room name taken: ' + data.name)
    io.to(data.host.id).emit('room_name_taken', data)
  })

  socket.on('room_created', function (data) {
    console.log('Room ' + data.name + ' created by ' + data.host.name + '(' + data.host.id + ')')
    io.to(data.host.id).emit('room_created', data)
  })

  socket.on('rooms_lobby_update', function (data) {
    io.to('lobby').emit('rooms', data)
  })

  // ------------------------------

  // ----- 2. PLAYERS MANAGEMENT -----

  // ADD PLAYER SERVICE CONNECTION
  socket.on('player_manager_service', function () {
    console.log('Player manager service connected:', socket.id)
    playerManagerService = socket
  })

  // ADDING NEW PLAYER
  socket.on('add_player', function (data) {
    console.log('Adding player: (' + data.id + ', ' + data.name + ')')
    playerManagerService.emit('add_player', data)
  })

  socket.on('player_name_invalid', function (data) {
    console.log('Player name invalid: (' + data.id + ', ' + data.name + ')')
    io.to(data.id).emit('player_name_invalid')
  })

  socket.on('player_already_exists', function (data) {
    console.log('Player already exists: (' + data.id + ', ' + data.name + ')')
    io.to(data.id).emit('player_already_exists')
  })

  socket.on('player_added', function (data) {
    console.log('Player added: (' + data.id + ', ' + data.name + ')')
    io.to(data.id).emit('player_added', data)
  })

  // REMOVING PLAYER
  socket.on('player_disconnect', function (data) {
    console.log('Player disconnected: (' + data.id + ', ' + data.name + ')')
    playerManagerService.emit('player_disconnect', data)
    console.log('Player removed: (' + data.id + ', ' + data.name + ')')
  })

  // ---------------------------------

  // ----- 3. GAME MANAGEMENT -----

  socket.on('game_manager_service', function () {
    console.log('Game manager service connected:', socket.id)
    gameManagerService = socket
  })

  socket.on('game_start', function (data) {
    console.log('Starting game in room: ', data)
    roomManagerService.emit('game_start', data)
    gameManagerService.emit('game_start', data)
  })

  socket.on('game_started', function (data) {
    console.log('Game started in room: ', data.room)
    io.to(data.room).emit('game_started', data)
  })

  socket.on('word', function (data) {
    gameManagerService.emit('word', data)
  })

  socket.on('word_accepted', function (data) {
    io.to(data.room).emit('word_accepted', data)
  })

  socket.on('game_over', function (data) {
    io.to(data.room).emit('game_over', data)
  })
  // ------------------------------
})

// ROUTING AND STUFF
app.set('port', PORT)

app.use(express.static(path.join(__dirname, 'public')))

server.listen(PORT, function () {
  console.log('Starting server on port ' + PORT)
})
