var parseString = require('xml2js').parseString
var fs = require('fs')
var path = require('path')
var glob = require('matched')
var exists = require('exists-file').sync
var untildify = require('untildify')

function toBib (body) {
  var article = body.article.front[0]['article-meta'][0]
  var metadata = {
    title: parseTitle(article['title-group'][0]['article-title'][0]),
    author: parseAuthor(article['contrib-group'][0]),
    abstract: parseAbstract(article['abstract']),
    identifier: parseIdentifier(article['article-id']),
    year: parseYear(article['pub-date'])
  }
  metadata.path = metadata.identifier.filter(function (id) {
    return id.type === 'publisher-id'
  })[0].id
  return metadata
}

function parseTitle (title) {
  if (typeof title === 'string') {
    return title
  } else {
    return title._
  }
}

function parseAuthor (author) {
  if (!author.contrib) return []
  return author.contrib.map(function (entry) {
    if (entry.name) {
      return {
        surname: entry.name[0].surname[0],
        'given-names': entry.name[0]['given-names'][0]
      }
    } else {
      return null
    }
  }).filter(function (entry) {
    return entry != null
  })
}

function parseAbstract (abstract) {
  if (abstract && abstract.length > 0) return abstract[0]
  return null
}

function parseIdentifier (ids) {
  return ids.map(function (id) {
    return {
      type: id.$['pub-id-type'],
      id: id._
    }
  })
}

function parseYear (date) {
  return date[0].year[0]
}

console.log('generating metadata')

var dir = untildify('~/.sciencefair/data/elife_dws/')

var n = 0

glob.sync(['*/*.xml'], { cwd: dir }).forEach(function (xmlfile) {
  var parts = path.parse(xmlfile)
  var json = path.join(dir, parts.name + '.json')
  if (!exists(json)) {
    n += 1
    var xml = fs.readFileSync(path.join(dir, xmlfile), 'utf8')
    parseString(xml, function (err, body) {
      if (err) throw err
      if (body.article) {
        fs.writeFileSync(json, JSON.stringify(toBib(body)))
        console.log('wrote', json)
      } else {
        console.log('error: malformed XML in file', xmlfile)
      }
    })
  }
})

if (n === 0) {
  console.log('nothing to do - all XML files have a matching JSON')
} else {
  console.log('generated', n, 'metadata JSON files')
}
