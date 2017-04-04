const s3 = require('s3')

const untildify = require('untildify')
const _ = require('lodash')
const mkdirp = require('mkdirp').sync

const dir = untildify('/mnt/elife-sciencefair/articles')
mkdirp(dir)
const bucket = 'elife-publishing-cdn'

// better for bandwidth
const http = require('http')
const https = require('https')
http.globalAgent.maxSockets = https.globalAgent.maxSockets = 20

// configure the s3 client
const client = s3.createClient({
  maxAsyncS3: 20,     // this is the default
  s3RetryCount: 3,    // this is the default
  s3RetryDelay: 1000, // this is the default
  s3Options: {
    accessKeyId: process.env.ELIFE_S3_ID,
    secretAccessKey: process.env.ELIFE_S3_KEY,
    // any other options are passed to new AWS.S3()
    // See: http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Config.html#constructor-property
  },
});

// only download the 600w images and the fulltext xml
const keep = /v.-600w\.jpg|-v.\.xml/

const params = {
  localDir: ".",
  s3Params: {
    Bucket: bucket,
    Prefix: "",
    // other options supported by putObject, except Body and ContentLength.
    // See: http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#putObject-property
  },
  getS3Params: (localfile, s3Object, cb) => {
    if (keep.test(localfile)) {
      return cb(null, {})
    } else {
      return cb(null, null)
    }
  }
}


// setup download progress
const ProgressBar = require('progress')
const prettybytes = require('pretty-bytes')
let bar

// syncer
const downloader = client.downloadDir(params)
downloader.on(
  'error', err => console.error("unable to sync:", err.stack)
)
downloader.on(
  'progress', () => {
    if (downloader.progressTotal > 0) {
      if (!bar) {
        bar = new ProgressBar(':bar :doneamt / :totamt', {
          width: 100,
          total: downloader.progressTotal
        })
      } else {
        bar.update(downloader.progressAmount / downloader.progressTotal, {
          doneamt: prettybytes(downloader.progressAmount),
          totamt: prettybytes(downloader.progressTotal)
        })
      }
    }
  }
)
downloader.on(
  'end', () => console.log("done downloading")
)
