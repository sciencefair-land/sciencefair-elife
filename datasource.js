var s3bucket = require('./s3bucket.js')
var fs = require('fs')
var untildify = require('untildify')
var path = require('path')
var mkdirp = require('mkdirp')
var queue = require('queue')
var moment = require('moment')
var _ = require('lodash')
var exists = require('exists-file').sync

function sync (cb) {
  var localdir = untildify('~/.sciencefair/data/elife/')
  mkdirp.sync(localdir)

  var q = queue({ concurrency: 1 })

  var syncFile = function (entry) {
    if (/pdf$/.test(entry.path)) return false
    var localpath = path.join(localdir, entry.path)
    if (!exists(localpath)) {
      q.push(function (next) {
        s3bucket.syncFile(entry.path, localpath, next)
      })
    }
  }

  q.on('end', function (err) {
    if (err) console.trace(err)
  })

  q.on('error', function (err) {
    console.trace(err)
  })

  console.log('Checking for cached listing')

  var listingfile = path.join(localdir, 'listing.json')
  fs.stat(listingfile, function (err, stat) {
    if (err) {
      console.log('No cached listing, downloading listing')
      refresh()
    } else {
      if (moment(stat.mtime) >= moment().startOf('day')) {
        console.log('Using cached listing')
        var listing = JSON.parse(fs.readFileSync(listingfile, 'utf8'))
        listing.forEach(syncFile)
        q.start()
      } else {
        console.log('Cached listing outdated, refreshing')
        refresh()
      }
    }
  })

  function refresh () {
    s3bucket.list(parseEntry, keepfile, function (err, listing) {
      if (err) cb(err)

      saveListing(listing)

      var done = _.after(listing.length, function () {
        q.start()
      })

      listing.forEach(function (entry) {
        if (keepfile(entry.path)) {
          syncFile(entry, done)
        } else {
          done()
        }
      })
    })
  }

  function saveListing (listing) {
    fs.writeFileSync(listingfile, JSON.stringify(listing, null, 2))
    console.log('Listing saved to JSON file')
  }

  // only sync the full-sized JPG, and the full article PDF and XML
  function keepfile (entry) {
    return /v[0-9]+\.(jpg|xml)/.test(entry.path)
  }

  function parseEntry (entry) {
    return {
      path: entry.Key[0],
      modified: moment(entry.LastModified[0]).valueOf()
    }
  }
}

sync(function (err) {
  if (err) throw err
  console.log('all syncing done')
})
