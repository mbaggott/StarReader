const { readFileSync } = require('fs') // used to read files
const { dialog, ipcMain} = require('electron') // used to communicate asynchronously from the main process to renderer processes.
const networkDialog = require('node-file-dialog')
const {app, BrowserWindow, Tray, Menu} = require('electron')
const path = require('path')
const http = require('http')
const fs = require('fs')
const EPub = require("epub")
const sqlite3 = require('sqlite3')
var database = require('./database');
const port = process.argv[2] || 9000;

let isQuitting
let tray;
let appInTray;
let win;
let db;

// Called when lectron has finished initialising and is ready to create browsder windows. Some API's won't work till after this step
app.whenReady().then(() =>  {
  
  db = database.initDb(sqlite3).then((db) => {
    database.configureDatabaseTables(db)
    const server = http.createServer(function (req, res) {
        console.log(`${req.method} ${req.url}`)
      
        // parse URL
        let fixedurl = req.url.replace('/', '\\')
        const parsedUrl = new URL(__dirname + fixedurl)
        // extract URL path
        let pathname = `${parsedUrl.href}`
      
        pathname = pathname.replace(/^(\.)+/, '.') //disallow access to root folder
      
        // maps file extention to MIME typere
        const map = {
          '.ico': 'image/x-icon',
          '.html': 'text/html',
          '.js': 'text/javascript',
          '.json': 'application/json',
          '.css': 'text/css',
          '.png': 'image/png',
          '.jpg': 'image/jpeg',
          '.wav': 'audio/wav',
          '.mp3': 'audio/mpeg',
          '.svg': 'image/svg+xml',
          '.pdf': 'application/pdf',
          '.doc': 'application/msword'
        }

        fs.stat(pathname, function (err, exist) {
            if(err) {
              // if the file is not found, return 404
              res.statusCode = 404
              res.end(`File ${pathname} not found!`)
              return;
            }
        
            // if is a directory search for index file matching the extention
            if (fs.statSync(pathname).isDirectory()) {
                pathname += '/index.html'
            }
            
            // based on the URL path, extract the file extention. e.g. .js, .doc, ...
            const ext = path.parse(pathname).ext
        
            // read file from file system
            fs.readFile(pathname, function(err, data){
              if(err){
                res.statusCode = 500;
                res.end(`Error getting the file: ${err}.`)
              } else {
                if (pathname.includes('index.html')) {
                    let index = require('cheerio').load(data)
                    index('head').append('<script>window.networkSession = true</script>')
                    
                    res.setHeader('Content-type', map[ext] || 'text/plain' )
                    res.end(index.html())
                } else {
                
                    // if the file is found, set Content-type and send data
                    res.setHeader('Content-type', map[ext] || 'text/plain' )
                    res.end(data)
                }
              }
            });
          });
        
        
        }).listen(parseInt(port, () => {
            console.log('Listening on port 9000')
        }));
        
        console.log(`Server listening on port ${port}`);
      
        const { Server } = require("socket.io");
        const io = new Server(server);
    startApp(db, io)
  });
});

app.on('window-all-closed', () => {
    if (process.platform != 'darwin') {
        app.quit()
    }
})

app.on('before-quit', function () {
    isQuitting = true
});


// on Mac it's common to re-create a window in the app when the dark icon is clicked and there are no other windows open
app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length == 0) {
        startApp()
    }
})

function startApp(db, io) {
    app.allowRendererProcessReuse = false
    let mainWindow = createWindow()
    listenEvents(db, ipcMain, mainWindow, fs)
    socketListenEvents(db, io, mainWindow, fs)
    initTrayQuit(mainWindow)
}

function createWindow() {
    // Create the browser window
    win = new BrowserWindow({
        width: 1366,
        height: 768,
        webPreferences: {
            nnodeIntegration: false, // is default value after Electron v5
            contextIsolation: true, // protect against prototype pollution
            enableRemoteModule: false, // turn off remote
            crossOriginEmbedderPolicy: "requireCorp",

            preload: path.join(__dirname, "/preload.js") // use a preload script
        }
    })

    win.setMenuBarVisibility(false)

    // load the index.html
    win.loadFile('index.html')

    //open the dev tools
    win.webContents.openDevTools()

    return win
}

function socketListenEvents(db, io, mainWindow, fs) {
    io.on('connection', (socket) => {
        
        socket.on('socketRequest', (msg) => {
          console.log('request: ' + msg)
        });

        socket.on('readEpubFromFile', (path) => {
            try {
                let file = openFile(path);
                socket.emit('onReadEpubFromFile', {
                    error: false,
                    data: file
                })
            }
            catch (err) {
                socket.emit('onReadEpubFromFile', {
                    error: true,
                    message: err
                })
            }
        })
        
        socket.on('selectLibraryLocation', () => {
    
            const config={type:'directory'}
            networkDialog(config).then(dir => {
                io.emit('onSelectLibraryLocation', {
                    error: false,
                    data: dir
                })
            }).catch(err => {
                io.emit('onSelectLibraryLocation', {
                    error: true,
                    message: err
                })
            })
            
        }) 
           
        socket.on('getBooks', () => {
            database.getBooks(db).then((response) => {
                socket.emit('onGetBooks', response)
            })   
        })

        socket.on('removeBook', (bookId) => {
            database.removeBook(db, bookId).then((response) => {
                socket.emit('onRemoveBook', response)
            })   
        })

        socket.on('getBookFileList', (folder) => {
            if (fs.statSync(folder)) {
                const walkSync = (dir, filelist = []) => {
                    fs.readdirSync(dir).forEach(file => {
                  
                      filelist = fs.statSync(path.join(dir, file)).isDirectory()
                        ? walkSync(path.join(dir, file), filelist)
                        : filelist.concat(path.join(dir, file))
                  
                    })
                  return filelist;
                }
                var files = walkSync(folder, [])
                socket.emit('onGetBookFileList', {
                    error: false,
                    data: files
                })
            } else {
                socket.emit('onGetBookFileList', {
                    error: true,
                    data: []
                })
            }
        })

        socket.on('getBookFileListModal', (folder) => {
            if (fs.statSync(folder)) {
                const walkSync = (dir, filelist = []) => {
                    fs.readdirSync(dir).forEach(file => {
                  
                      filelist = fs.statSync(path.join(dir, file)).isDirectory()
                        ? walkSync(path.join(dir, file), filelist)
                        : filelist.concat(path.join(dir, file))
                  
                    })
                  return filelist;
                }
                var files = walkSync(folder, [])
                io.emit("onGetBookFileListModal", {
                    error: false,
                    data: files
                })
            } else {
                io.emit("onGetBookFileListModal", {
                    error: true,
                    data: []
                })
            }
    
            
        })

        socket.on('getLibraryLocation', () => {
            database.getLibraryLocation(db).then((response) => {
                io.emit('onGetLibraryLocation', response)
            })
        });

        socket.on('libraryLocationExists', (folder) => {
            fs.stat(folder, function (err) {
                if(err) {
                    // if the file is not found, return 404
                    io.emit('onLibraryLocationExists', {
                        error: false,
                        data: false
                    })
                    return
                }
                if (fs.statSync(folder)) {
                    io.emit('onLibraryLocationExists', {
                        error: false,
                        data: true
                    })
                } else {
                    io.emit('onLibraryLocationExists', {
                        error: false,
                        data: false
                    })
                    
                }  
            })
        })

        socket.on('insertLibraryLocation', async (arg) => {
            database.insertLibraryLocation(db, arg).then((response) => {
                socket.emit('onInsertLibraryLocation', response)
            })
            
        })

        socket.on('updateLibraryLocation', async(arg) => {
            database.updateLibraryLocation(db, arg.folder, arg.id).then((response) => {
                socket.emit('onUpdateLibraryLocation', response);
            })
            
        })

        socket.on('getBooksPaths', async () => {
            database.getBooksPaths(db, path).then((response) => {
                socket.emit('onGetBooksPaths', response);
            })        
        })

        socket.on('updateBooksPaths', async (arg) => {
            database.updateBooksPathsGetRows(db, arg.path, arg.rowId).then((response) => {
                win.webContents.send("onUpdateBooksPaths", response);
            })        
        })

        socket.on('resolveMissingBooks', async (arg) => {
            database.resolveMissingBooks(db, arg.path, arg.filename, arg.bookId).then((response) => {
                socket.emit('onResolveMissingBooks', response);
            })        
        })

        socket.on('recordReadPosition', async (arg) => {
            database.recordReadPosition(db, arg.bookId, arg.cfi).then((response) => {
                socket.emit('onRecordReadPosition', response);
            })        
        })

        socket.on('getBookmarks', async (bookId) => {
            database.getBookmarks(db, bookId).then((response) => {
                socket.emit('onGetBookmarks', response);
            })        
        })

        socket.on('addBookmark', async (arg) => {
            database.addBookmark(db, arg.bookId, arg.cfi).then((response) => {
                socket.emit('onAddBookmark', response);
            })        
        })

        socket.on('updateBookmarkTitle', async (arg) => {
            database.updateBookmarkTitle(db, arg.title, arg.bookId).then((response) => {
                socket.emit('onUpdateBookmarkTitle', response);
            })        
        })

        socket.on('deleteBookmark', async (bookId) => {
            database.deleteBookmark(db, bookId).then((response) => {
                socket.emit('onDeleteBookmark', response);
            })        
        })

        socket.on('goToLastRead', async (bookId) => {
            database.goToLastRead(db, bookId).then((response) => {
                socket.emit('onGoToLastRead', response);
            })        
        })
    });
}

function listenEvents(db, ipcMain, mainWindow, fs) {
      
    ipcMain.on("request", (IpcMainEvent, args) => {
        // Use node module (ie. "fs");
        // perhaps save value of args.data to file with a timestamp
        console.log('ping')
        console.log(new Date().getTime())
        win.webContents.send("response", {
            error: true,
            data: 'pong'
        })
    })

    ipcMain.on('readEpubFromFile', (event, path) => {
        try {
            let file = openFile(path);
            win.webContents.send("readEpubFromFileResponse", {
                error: false,
                data: file
            })
        }
        catch (err) {
            win.webContents.send("readEpubFromFileResponse", {
                error: true,
                message: err
            })
        }
    })

    ipcMain.on('selectLibraryLocation', async (event, arg) => {
        try {
            const result = await dialog.showOpenDialog(mainWindow, {
                properties: ['openDirectory'],
            })
            win.webContents.send("selectLibraryLocationResponse", {
                error: false,
                data: result.filePaths
            })
        } 
        catch (err) {
            win.webContents.send("selectLibraryLocationResponse", {
                error: true,
                message: err
            })
        }
    })

    ipcMain.on('getBooks', (event) => {
        database.getBooks(db).then((response) => {
            win.webContents.send("getBooksResponse", response)
        })   
    })

    ipcMain.on('removeBook', (event, bookId) => {
        database.removeBook(db, bookId).then((response) => {
            win.webContents.send("removeBookResponse", response)
        })   
    })

    ipcMain.on('getBookFileList', (event, arg) => {
        if (fs.statSync(arg)) {
            const walkSync = (dir, filelist = []) => {
                fs.readdirSync(dir).forEach(file => {
              
                  filelist = fs.statSync(path.join(dir, file)).isDirectory()
                    ? walkSync(path.join(dir, file), filelist)
                    : filelist.concat(path.join(dir, file))
              
                })
              return filelist;
            }
            var files = walkSync(arg, [])
            win.webContents.send("getBookFileListResponse", {
                error: false,
                data: files
            })
        } else {
            win.webContents.send("getBookFileListResponse", {
                error: true,
                data: []
            })
        }
    })

    ipcMain.on('getBookFileListModal', (event, arg) => {
        if (fs.statSync(arg)) {
            const walkSync = (dir, filelist = []) => {
                fs.readdirSync(dir).forEach(file => {
              
                  filelist = fs.statSync(path.join(dir, file)).isDirectory()
                    ? walkSync(path.join(dir, file), filelist)
                    : filelist.concat(path.join(dir, file))
              
                })
              return filelist;
            }
            var files = walkSync(arg, [])
            win.webContents.send("getBookFileListModalResponse", {
                error: false,
                data: files
            })
        } else {
            win.webContents.send("getBookFileListModalResponse", {
                error: true,
                data: []
            })
        }

        
    })

    ipcMain.on('getLibraryLocation', async (event) => {
        database.getLibraryLocation(db).then((response) => {
            win.webContents.send("getLibraryLocationResponse", response)
        })
        
    })

    ipcMain.on('libraryLocationExists', async (event, arg) => {
        fs.stat(arg, function (err) {
            if(err) {
                // if the file is not found, return 404
                win.webContents.send("libraryLocationExistsResponse", {
                    error: false,
                    data: false
                })
                return
            }
            if (fs.statSync(arg)) {
                win.webContents.send("libraryLocationExistsResponse", {
                    error: false,
                    data: true
                })
            } else {
                win.webContents.send("libraryLocationExistsResponse", {
                    error: false,
                    data: false
                })
            }  
        })
    })

    ipcMain.on('insertLibraryLocation', async (event, arg) => {
        database.insertLibraryLocation(db, arg).then((response) => {
            win.webContents.send("insertLibraryLocationResponse", response)
        })
        
    })

    ipcMain.on('updateLibraryLocation', async (event, arg1, arg2) => {
        database.updateLibraryLocation(db, arg1, arg2).then((response) => {
            win.webContents.send("updateLibraryLocationResponse", response);
        })
        
    })

    ipcMain.on('getBooksPaths', async (event) => {
        database.getBooksPaths(db, path).then((response) => {
            win.webContents.send("getBooksPathsResponse", response);
        })        
    })

    ipcMain.on('updateBooksPaths', async (event, path, rowId) => {
        database.updateBooksPathsGetRows(db, path, rowId).then((response) => {
            win.webContents.send("updateBooksPathsResponse", response);
        })        
    })

    ipcMain.on('resolveMissingBooks', async (event, path, filename, bookId) => {
        database.resolveMissingBooks(db, path, filename, bookId).then((response) => {
            win.webContents.send("resolveMissingBooksResponse", response);
        })        
    })


    ipcMain.on('addBooksToLibrary', async (event, libraryPath) => {
        try {
            let result = await dialog.showOpenDialog(mainWindow, {
                properties:  ['openFile', 'multiSelections'],
                defaultPath:  libraryPath,
            })
            win.webContents.send("addBooksToLibraryResponse", {
                error: false,
                data: result.filePaths
            })
        } 
        catch (err) {
            win.webContents.send("addBooksToLibraryResponse", {
                error: true,
                message: err
            })
        }
    })

    ipcMain.on('addBooksToDatabase', async (event, bookArray) => {
        database.addBooksToDatabase(db, bookArray, 0, {error: false}).then((response) => {
            win.webContents.send("addBooksToDatabaseResponse", response);
        })        
    })

    ipcMain.on('recordReadPosition', async (event, bookId, cfi) => {
        database.recordReadPosition(db, bookId, cfi).then((response) => {
            win.webContents.send("recordReadPositionResponse", response);
        })        
    })

    ipcMain.on('getBookmarks', async (event, bookId) => {
        database.getBookmarks(db, bookId).then((response) => {
            win.webContents.send("getBookmarksResponse", response);
        })        
    })

    ipcMain.on('addBookmark', async (event, bookId, cfi) => {
        database.addBookmark(db, bookId, cfi).then((response) => {
            win.webContents.send("addBookmarkResponse", response);
        })        
    })

    ipcMain.on('updateBookmarkTitle', async (event, title, bookId) => {
        database.updateBookmarkTitle(db, title, bookId).then((response) => {
            win.webContents.send("updateBookmarkTitleResponse", response);
        })        
    })

    ipcMain.on('deleteBookmark', async (event, bookId) => {
        database.deleteBookmark(db, bookId).then((response) => {
            win.webContents.send("deleteBookmarkResponse", response);
        })        
    })

    ipcMain.on('goToLastRead', async (event, bookId) => {
        database.goToLastRead(db, bookId).then((response) => {
            win.webContents.send("goToLastReadResponse", response);
        })        
    })

}

// function to read from a json file
function openFile(bookPath) {
    try {
        var buf = readFileSync(bookPath)
        var arrbuf = toArrayBuffer(buf)
    } catch(e) {
        console.log('Error:', e.stack)
    }
    return arrbuf
  }

  function toArrayBuffer(buf) {
    var ab = new ArrayBuffer(buf.length)
    var view = new Uint8Array(ab);
    for (var i = 0; i < buf.length; ++i) {
        view[i] = buf[i]
    }
    return ab
}

function initTrayQuit(mainWindow) {
    tray = new Tray(path.join(__dirname, 'img/icons/IconTray64.png'))
  
    tray.setContextMenu(Menu.buildFromTemplate([
      {
        label: 'Show App', click: function () {
            mainWindow.show()
        }
      },
      {
        label: 'Quit', click: function () {
          isQuitting = true
          app.quit()
        }
      }
    ]))

    tray.setToolTip('StarReader')
    tray.on('click', function() {
        if (appInTray) {
          mainWindow.show()
          appInTray = false
        } else {
          mainWindow.hide()
          appInTray = true
        }
    })
  
    mainWindow.on('close', function (event) {
      if (!isQuitting) {
        event.preventDefault()
        mainWindow.hide()
        appInTray = true
        event.returnValue = false
      }
    })

}



