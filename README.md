## sciencefair-elife

Code to setup eLife as a data source for Science Fair.

WIP.

### instructions

```
npm install
./cli.js --help
```

grab/update the file metadata for the corpus

```
./cli.js update
```

sync files (might take a *long* time the first time)

```
./cli.js sync
```

once you've synced, you can generated bibJSON metadata for each article

```
./cli.js generate

```
