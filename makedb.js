var yuno = require('yunodb')
var untildify = require('untildify')
var fs = require('fs')
var glob = require('matched')
var path = require('path')
var after = require('lodash/after')

var dir = untildify('~/.sciencefair/elife/meta')

const dbopts = {
  location: './yunodb',
  keyField: '$.identifier[0].id',
  indexMap: {
    'title': true,
    'author': true,
    'date': false,
    'identifier': false,
    'abstract': true
  }
}

var files = glob.sync(['*.json'], { cwd: dir })

const done = after(files.length, () => console.log('all entries written to db'))

yuno(dbopts, (err, db) => {
  if (err) throw err

  files.forEach(file => {
    const entryjson = fs.readFileSync(path.join(dir, file), 'utf8')
    const entry = JSON.parse(entryjson)
    db.add(entry, (err) => {
      if (err) throw err
      console.log('wrote entry:', entry)
      done()
    })
  })
})
