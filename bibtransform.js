function noop (str) { return str }

var compress = {
  title: noop,
  author: function (arr) {
    return arr.map(function (auth) {
      return `${auth.surname}:${auth['given-names']}`
    }).join('☆')
  },
  abstract: noop,
  identifier: function (arr) {
    return arr.map(function (id) {
      return `${id.type}:${id.id}`
    }).join('☆')
  },
  date: function (obj) {
    return `${obj.year}☆${obj.month}☆${obj.day}`
  },
  license: noop
}

var decompress = {
  title: noop,
  author: function (str) {
    return str.split('☆').map(function (auth) {
      var parts = auth.split(':')
      return {
        surname: parts[0],
        'given-names': parts[0]
      }
    })
  },
  abstract: noop,
  identifier: function (str) {
    return str.split('☆').map(function (id) {
      var parts = id.split(':')
      return {
        type: parts[0],
        id: parts[1]
      }
    })
  },
  date: function (str) {
    var parts = str.split('☆')
    return {
      year: parts[0],
      month: parts[1],
      day: parts[2]
    }
  },
  license: noop
}

var bibfields = ['title', 'author', 'abstract', 'identifier', 'date', 'license']

function compressor (bib) {
  return bibfields.map(function (key) {
    return compress[key](bib[key])
  }).join('★')
}

function decompressor (bib) {
  var parts = bib.split('★')
  var result = {}
  bibfields.forEach(function (key, i) {
    result[key] = decompress[key](parts[i])
  })
  return result
}

module.exports = {
  compress: compressor,
  decompress: decompressor
}
