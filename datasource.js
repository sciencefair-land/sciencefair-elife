var s3bucket = require('./s3bucket.js')
var fs = require('fs')
var untildify = require('untildify')
var path = require('path')
var mkdirp = require('mkdirp')
var queue = require('queue')

// only sync the full-sized JPG, and the full article PDF and XML
function keepfile (path) {
  return /v[0-9]+\.(jpg|pdf|xml)/.test(path) && (path.indexOf('figures') === -1)
}

function sync (cb) {
  var localdir = untildify('~/.sciencefair/data/elife/')
  mkdirp.sync(localdir)

  var q = queue({ concurrency: 1 })
  var filestosync = []
  var q2 = queue({ concurrency: 1 })

  q.on('end', function (err) {
    if (err) console.trace(err)
    console.log('All metadata synced')
    console.log('Processing', filestosync.length, 'items in download queue')
    filestosync.forEach(function (pair) {
      var remote = pair[0]
      var local = pair[1]
      q2.push(function (next) {
        s3bucket.syncFile(remote, local, next)
      })
    })
    q2.start()
  })

  q2.on('end', function (err) {
    if (err) console.trace(err)
    console.log('All downloads completed')
  })

  console.log('Fetching bucket metadata')
  s3bucket.getPrefixes(function (err, prefixes) {
    if (err) cb(err)
    console.log('Found', prefixes.length, 'articles')
    prefixes.forEach(function (resp) {
      syncArticle(resp.Prefix[0])
    })
    if (!q.running) q.start()
  })

  function syncArticle (prefix) {
    q.push(function (nextprefix) {
      mkdirp.sync(path.join(localdir, prefix.replace(/^\//, '')))
      s3bucket.listPrefix(prefix, function (err, listing) {
        // console.log('Syncing article', prefix)
        if (err) cb(err)
        listing.map(parseEntry).forEach(function (entry) {
          if (keepfile(entry.path)) {
            syncFile(entry)
          }
        })
        nextprefix()
      })
    })
  }

  function parseEntry (entry) {
    return {
      path: entry.Key[0],
      modified: new Date(entry.LastModified[0])
    }
  }

  function syncFile (entry) {
    var localpath = path.join(localdir, entry.path)
    fs.stat(localpath, function (err, stat) {
      // console.log('Checking file', entry.path)
      if (err) {
        // console.log('Local file missing. download queued...')
        filestosync.push([entry.path, localpath])
      } else {
        var localmod = new Date(stat.mtime)
        if (entry.modified > localmod) {
          // console.log('Remote file is newer. download queued...')
          filestosync.push([entry.path, localpath])
        } else {
          // console.log('No upda1wte needed')
        }
      }
    })
  }
}

sync(function (err) {
  if (err) throw err
  console.log('all syncing done')
})
