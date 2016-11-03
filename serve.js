var hyperdrive = require('hyperdrive')
var level = require('level')
var raf = require('random-access-file')
var walker = require('folder-walker')
var untildify = require('untildify')
var through = require('through2')

var dir = untildify('~/elife-publishing-cdn/')

var drive = hyperdrive(level('science-fair-elife.db'))
var archive = drive.createArchive({
  live: true,
  file: function (name) {
    return raf(dir + name) // assuming elife is in ./elife
  }
})

walker(dir).pipe(through.obj(visit)).on('finish', function () {
  console.log('your key', archive.key.toString('hex'))

  var discovery = require('discovery-swarm')
  var defaults = require('datland-swarm-defaults')

  var swarm = discovery(defaults({
    hash: false,
    stream: function () {
      return archive.replicate()
    }
  }))

  swarm.join(archive.discoveryKey)
})

function visit (data, enc, cb) {
  console.log('appending to feed:', data.relname)
  archive.append({ type: data.type, name: data.relname }, cb)
}
