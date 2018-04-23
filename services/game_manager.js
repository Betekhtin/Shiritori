let io = require('socket.io-client')
let dictionary = require('../dictionary.json')
let socket = io.connect('http://localhost:8080')
/*
  GAME_TEMPLATE =
  {
    room: "", // Room name
    current_player: "", // name
    players: [],
    current_word: "", // Kana of word from the dictionary
    word_info: {}, // Info about current word
    used_words: [] // list of words that were already used
  }
*/
let games = []

const deleteGame = room => {
  console.log('Deleting game: ', room)
  for (let i = 0; i < games.length; ++i) {
    if (games[i].room === room) {
      delete games[i]
      return
    }
  }
}

const addWord = (word, room) => {
  for (let i = 0; i < games.length; ++i) {
    if (games[i].room === room) {
      games[i].used_words.push(word)
      games[i].current_word = word
      games[i].word_info = dictionary[word]
      return
    }
  }
}

const chooseNextPlayer = room => {
  for (let i = 0; i < games.length; ++i) {
    if (games[i].room === room) {
      let nextIndex =
        (games[i].players.indexOf(games[i].current_player) + 1) %
        games[i].players.length
      let nextPlayer = games[i].players[nextIndex]
      games[i].current_player = nextPlayer
      return nextPlayer
    }
  }
}

socket.on('connect', function () {
  console.log('Game manager connected')

  socket.emit('game_manager_service')

  socket.on('game_start', function (data) {
    console.log('Game started in room: ', data)
    let newGame = {
      room: data.room,
      current_player: data.host.name,
      players: data.players,
      current_word: 'しりとり',
      word_info: dictionary['しりとり'],
      used_words: ['しりとり']
    }
    games.push(newGame)
    socket.emit('game_started', newGame)
  })

  socket.on('word', function (data) {
    let check = checkDictionary(data.word)
    if (!check[0]) {
      data.reason = check[1]
      socket.emit('game_over', data)
    } else {
      for (let game of games) {
        if (game.room === data.room) {
          if (game.used_words.includes(data.word)) {
            data.reason = 'word_used'
            socket.emit('game_over', data)
          } else {
            if (data.word[0] !== game.word_info.last_kana) {
              console.log(data.word[0], game.word_info.last_kana)
              data.reason = 'wrong_beginning'
              socket.emit('game_over', data)
            } else {
              addWord(data.word, data.room)
              data.nextPlayer = chooseNextPlayer(data.room)
              data.word_info = dictionary[data.word]
              socket.emit('word_accepted', data)
            }
          }
          break
        }
      }
    }
  })

  socket.on('room_deleted', function (data) {
    console.log('Room deleted: ', data)
    deleteGame(data)
  })
})

function checkDictionary (word) {
  if (!(word in dictionary)) {
    return [false, 'no_such_word']
  }
  if (dictionary[word].last_kana === 'ん') {
    return [false, 'ends_with_n']
  }
  if (dictionary[word].part_of_speech !== 'noun') {
    return [false, 'not_noun']
  }

  return [true]
}
