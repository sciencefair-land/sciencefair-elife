const {app, BrowserWindow} = require('electron')
var path = require('path')

var main = null

app.on('ready', function () {
  main = new BrowserWindow({
    height: 720,
    resizable: true,
    title: 'elife-sciencefair',
    width: 1050,
    titleBarStyle: 'hidden',
    fullscreen: false
  })

  main.maximize()

  main.loadURL(path.join('file://', __dirname, '/serve.html'))

  main.on('closed', function () {
    main = null
  })
})
