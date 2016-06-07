var request = require('request')
var parseString = require('xml2js').parseString
var download = require('download')
var fs = require('fs')
var listingURL = 'https://elife-publishing-cdn.s3.amazonaws.com/'

module.exports = {
  list: function (map, filter, cb) {
    var contents = []

    function getListing (token) {
      var url = listingURL + '?list-type=2'
      if (token) {
        url += '&continuation-token=' + encodeURIComponent(token.trim())
      }
      request(url, handleResponse)
    }

    function handleResponse (err, response, body) {
      if (err) cb(err)
      parseString(body, handleListing)
    }

    function handleListing (err, listing) {
      if (err) cb(err)

      try {
        var keepers = listing.ListBucketResult.Contents.map(map).filter(filter)
        contents = contents.concat(keepers)
        console.log('Retrieved', contents.length, 'metadata items')
      } catch (err) {
        console.log(listing)
      }

      if (listing.ListBucketResult.IsTruncated[0] === 'true') {
        var token = listing.ListBucketResult.NextContinuationToken[0]
        return getListing(token)
      }

      cb(null, contents)
    }

    getListing()
  },
  syncFile: function (file, destination, cb) {
    var source = listingURL + file
    console.log(source)
    var dl = download(source).pipe(fs.createWriteStream(destination))
    dl.on('finish', cb)
  }
}
