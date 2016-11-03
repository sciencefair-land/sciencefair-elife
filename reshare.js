var hyperdrive = require('hyperdrive')
var level = require('level')
var untildify = require('untildify')
var raf = require('random-access-file')

var dir = untildify('~/elife-publishing-cdn/')
const key = new Buffer('6804daebcd58bf3ef512ab6adee9ea4b9b065fa3ede73856b5f6ed4a2551fc1f', 'hex')

var drive = hyperdrive(level('science-fair-elife.db'))
var archive = drive.createArchive(key, {
  file: function (name) {
    return raf(dir + name)
  }
})

var discovery = require('discovery-swarm')
var defaults = require('datland-swarm-defaults')

var swarm = discovery(defaults({
  hash: false,
  stream: function () {
    return archive.replicate()
  }
}))

swarm.join(key)
