var request = require('request')
var parseString = require('xml2js').parseString
var fs = require('fs')
var listingURL = 'https://elife-publishing-cdn.s3.amazonaws.com/'

module.exports = {
  getPrefixes: function (cb) {
    var prefixes = []

    function getListing (marker) {
      var url = listingURL + '?delimiter=/'
      if (marker) {
        url += '&marker=' + marker
      }
      request(url, handleResponse)
    }

    function handleResponse (err, response, body) {
      if (err) cb(err)
      parseString(body, handleListing)
    }

    function handleListing (err, listing) {
      if (err) cb(err)

      prefixes = prefixes.concat(listing.ListBucketResult.CommonPrefixes)

      if (listing.ListBucketResult.IsTruncated[0] === 'true') {
        var marker = listing.ListBucketResult.NextMarker[0]
        return getListing(marker)
      }

      cb(null, prefixes)
    }

    getListing()
  },
  listPrefix: function (prefix, cb) {
    var contents = []

    function getListing (marker) {
      var url = listingURL + '?prefix=' + prefix
      if (marker) {
        url += '&marker=' + marker
      }
      request(url, handleResponse)
    }

    function handleResponse (err, response, body) {
      if (err) cb(err)
      parseString(body, handleListing)
    }

    function handleListing (err, listing) {
      if (err) cb(err)

      contents = contents.concat(listing.ListBucketResult.Contents)

      if (listing.ListBucketResult.IsTruncated[0] === 'true') {
        var lastIdx = listing.ListBucketResult.Contents.length - 1
        var marker = listing.ListBucketResult.Contents[lastIdx].Key
        return getListing(marker)
      }

      cb(null, contents)
    }

    getListing()
  },
  syncFile: function (file, destination, cb) {
    var source = listingURL + file
    request(source)
      .pipe(fs.createWriteStream(destination))
      .on('error', cb)
      .on('end', cb)
  }
}
