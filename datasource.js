var s3bucket = require('./s3bucket.js')
var fs = require('fs')
var untildify = require('untildify')
var path = require('path')
var mkdirp = require('mkdirp')

// only sync the full-sized JPG, and the full article PDF and XML
var filepattern = /v[0-9]+\.(jpg|pdf|xml)/

function sync (cb) {
  var localdir = untildify('~/.sciencefair/data/elife/')
  mkdirp.sync(localdir)

  s3bucket.getPrefixes(function (err, prefixes) {
    if (err) cb(err)

    // prefixes.forEach(syncArticle)
    syncArticle(prefixes[0].Prefix[0])
  })

  function syncArticle (prefix) {
    mkdirp.sync(path.join(localdir, prefix.replace(/^\//, '')))
    s3bucket.listPrefix(prefix, function (err, listing) {
      if (err) cb(err)
      var objects = listing.map(parseEntry)
      var i = 0

      var iterator

      iterator = function (err) {
        if (err) return cb(err)
        // emit filesynced
        i += 1
        if (i < objects.length) {
          if (filepattern.test(objects[i].path)) {
            syncFile(objects[i], iterator)
          } else {
            iterator()
          }
        } else {
          cb()
        }
      }

      syncFile(objects[i], iterator)
    })
  }

  function parseEntry (entry) {
    return {
      path: entry.Key[0],
      modified: new Date(entry.LastModified[0])
    }
  }

  function syncFile (entry, donefn) {
    console.log('syncing file', entry.path)
    var localpath = path.join(localdir, entry.path)
    fs.stat(localpath, function (err, stat) {
      if (err) {
        console.log('local file missing. downloading...')
        s3bucket.syncFile(entry.path, localpath, donefn)
      } else {
        var localmod = new Date(stat.mtime)
        if (entry.modified > localmod) {
          console.log('remote file is newer. updating...')
          s3bucket.syncFile(entry.path, localpath, donefn)
        } else {
          console.log('no update needed')
          donefn()
        }
      }
    })
  }
}

sync(function (err) {
  if (err) throw err
  console.log('all syncing done')
})
