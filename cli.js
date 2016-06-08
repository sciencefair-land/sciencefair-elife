#!/usr/bin/env node
var program = require('commander')
var pjson = require('./package.json')

program
  .version(pjson.version)

program
  .command('update')
  .description('download eLife corpus metadata if it is more than 1 day old')
  .action(function () {
    require('./datasource.js')
  })

program
  .command('sync')
  .description('sync missing or updated files from eLife corpus')
  .action(function () {
    require('./datasource.js')
  })

program
  .command('generate')
  .description('produce bibJSON metadata for each article with a fulltext XML')
  .action(function () {
    require('./metadata.js')
  })

program.parse(process.argv)

if (!process.argv.slice(2).length) {
  program.help()
}
