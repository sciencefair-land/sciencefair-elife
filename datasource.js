var fs = require('fs')
var untildify = require('untildify')
var path = require('path')
var mkdirp = require('mkdirp').sync
var queue = require('queue')
var _ = require('lodash')
var dl = require('download')
var unzip = require('unzip')
var glob = require('matched').sync
var select = require('beau-selector')
var mv = require('mv')

var xmlzip = 'https://github.com/elifesciences/elife-article-xml/archive/master.zip'
var listingURL = 'https://elife-publishing-cdn.s3.amazonaws.com/'
var dir = untildify('~/.sciencefair/data/elife')
mkdirp(path.join(dir, 'tmp'))

var q = queue()

function download (src, dst, cb) {
  console.log('downloading', src, 'to', dst)
  dl(src)
    .pipe(fs.createWriteStream(dst))
    .on('finish', cb)
}

function unpack (zip, dst, cb) {
  // unzip downloaded zip file and unpack it
  // returning path of unpacked dir
  console.log('unpacking', zip, 'to', dst)
  fs.createReadStream(zip)
    .pipe(unzip.Extract({ path: dst }))
    .on('finish', function () {
      console.log('unpacked zip to', dst)
      cb()
    })
    .on('error', cb)
}

function getarticles (dir) {
  // read article filenames and return only the latest version
  // article filename for each article
  var articles = glob(['*.xml'], { cwd: path.join(dir, 'articles') })
  console.log('total number of xml files:', articles.length)
  return _.map(_.groupBy(articles, stripVersion), function (vs) {
    return vs.sort()[vs.length - 1] + '.xml'
  })
}

function stripVersion (a) {
  return a.split(/v[0-9]/)[0]
}

function extractimgpaths (xmlfile, cb) {
  // open xml file and return array of paths to images from
  // <graphic> elements
  var xml = fs.readFileSync(xmlfile)
  select(xml, {
    query: '//graphic',
    attribute: 'xlink:href'
  }, cb)
}

function queuedownload (src, dst) {
  q.push(function (cb) {
    download(src, dst, cb)
  })
}

function queueimgdownload (imgpath) {
  var jpg = imgpath.replace('.tif', '.jpg')
  var articleno = imgpath.split('-')[1]
  var src = [listingURL, articleno, jpg].join('/')
  // given an image path, download the image from
  // s3 bucket
  var dstdir = path.join(dir, 'articles', articleno)
  mkdirp(dstdir)
  var dst = path.join(dstdir, jpg)

  queuedownload(src, dst)
}

function handlearticles (articles) {
  var done = _.after(articles.length, function () {
    q.start()
  })
  articles.forEach(function (article) {
    extractimgpaths(article, function (imgpaths) {
      imgpaths.forEach(queueimgdownload)
      done()
    })
  })
}

function movearticles () {
  var src = path.join(dir, 'tmp', 'elife-article-xml-master', 'articles')
  var dst = path.join(dir, 'articles')
  mv(src, dst, function (err) {
    if (err) throw err

    var articles = getarticles(dst)
    console.log('found', articles.length, 'articles')
    handlearticles(articles)
  })
}

function unpackxml (err) {
  if (err) throw err
  unpack(
    path.join(dir, 'tmp', 'articles.zip'),
    path.join(dir, 'tmp'),
    function (err) {
      if (err) throw err
      movearticles()
    }
  )
}

download(xmlzip, path.join(dir, 'tmp', 'articles.zip'), unpackxml)
