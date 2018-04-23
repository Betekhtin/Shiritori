'use strict'

let request = require('request')
let fs = require('fs')

let urls = require('./urls.json')

function getLastKana (word) {
  switch (word[word.length - 1]) {
    case 'ぁ': return 'あ'
    case 'ぃ': return 'い'
    case 'ぅ': return 'う'
    case 'ぇ': return 'え'
    case 'ぉ': return 'お'
    case 'ー': return getLastKana(word.slice(0, word.length - 2))
    case 'ゃ': return 'や'
    case 'ゅ': return 'ゆ'
    case 'ょ': return 'よ'
    default: return word[word.length - 1]
  }
}

// transform urls
let goals = urls[0]
urls.splice(0, 1)
urls = urls.map(function (url) {
  let id = url.split('/')
  id = id[id.length - 1]
  return goals + id + '?'
})

let dictionary = {}

// Adding しりとり to the dictionary because every game starts with it
dictionary['しりとり'] = {
  'word': 'しりとり',
  'romaji': 'shiritori',
  'translation': 'japanese word chain game',
  'part_of_speech': 'noun',
  'is_noun': true,
  'last_kana': 'り'
}

// Adding this because I want my game to have hydrogen bomb in it
dictionary['すいばく'] = {
  'word': '水爆',
  'romaji': 'suibaku',
  'translation': 'hydrogen bomb',
  'part_of_speech': 'noun',
  'is_noun': true,
  'last_kana': 'く'
}

let nounCount = 0
for (let url of urls) {
  request(url, function (err, res, data) {
    if (err) throw err
    let items = JSON.parse(data)
    items = items['goal_items']
    for (let item of items) {
      /*
                "りんご": {
                    "word": "リンゴ",
                    "romaji": "ringo",
                    "translation": "apple",
                    "part_of_speech": "noun",
                    "is_noun": true,
                    "last_kana": "ご"
                }
            */
      item = item.item
      dictionary[item.cue.transliterations.Hira] = {
        'word': item.cue.text,
        'romaji': item.cue.transliterations.Latn,
        'translation': item.response.text,
        'part_of_speech': item.cue.part_of_speech.toLowerCase(),
        'is_noun': item.cue.part_of_speech.search('Noun') !== -1,
        'last_kana': getLastKana(item.cue.transliterations.Hira)// item.cue.transliterations.Hira.slice(-1)
      }
      if (item.cue.part_of_speech.search('Noun') !== -1) nounCount++
    }
    console.log('Done with ' + url)
  })
}

setTimeout(function () {
  fs.writeFile('dictionary.json', JSON.stringify(dictionary, null, 4),
    () => console.log('Dictionary written'))
  console.log(nounCount + ' nouns')
}, 15000)
