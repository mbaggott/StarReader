const electron = require('electron')
const { readFileSync } = require('fs') // used to read files
const { dialog, ipcMain } = require('electron') // used to communicate asynchronously from the main process to renderer processes.
const {app, BrowserWindow, Tray, Menu} = require('electron')
const path = require('path');
const fs = require('fs');

let isQuitting
let tray;
let appInTray;

// Called when lectron has finished initialising and is ready to create browsder windows. Some API's won't work till after this step
app.whenReady().then(() =>  {
  startApp()
});

app.on('window-all-closed', () => {
    if (process.platform != 'darwin') {
        app.quit()
    }
})

app.on('before-quit', function () {
    isQuitting = true;
  });

// on Mac it's common to re-create a window in the app when the dark icon is clicked and there are no other windows open
app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length == 0) {
        startApp()
    }
})

function startApp() {
    app.allowRendererProcessReuse = false
    let mainWindow = createWindow()
    listenEvents(ipcMain, mainWindow, fs)
    initTrayQuit(mainWindow)
}

function createWindow() {
    // Create the browser window
    let win = new BrowserWindow({
        width: 1366,
        height: 768,
        webPreferences: {
            nodeIntegration: true
        }
    })

    win.setMenuBarVisibility(false)

    // load the index.html
    win.loadFile('index.html')

    //open the dev tools
    win.webContents.openDevTools()

    return win
}

function listenEvents(ipcMain, mainWindow, fs) {
    // this is the event listener that will respond when we will request it in the web page
    ipcMain.on('readEpubFromFile', (event, arg) => {
        var file = openFile(arg);
        event.returnValue = openFile(arg);
    })

    ipcMain.on('getBookFileList', (event, arg) => {
        if (fs.existsSync(arg)) {
            const walkSync = (dir, filelist = []) => {
                fs.readdirSync(dir).forEach(file => {
              
                  filelist = fs.statSync(path.join(dir, file)).isDirectory()
                    ? walkSync(path.join(dir, file), filelist)
                    : filelist.concat(path.join(dir, file));
              
                });
              return filelist;
            }
            var files = walkSync(arg, []);
            event.returnValue = files;
        } else {
            event.returnValue = [];
        }

        
    })

    ipcMain.on('addBooksToLibrary', async (event, arg) => {
        const result = await dialog.showOpenDialog(mainWindow, {
            properties:  ['openFile', 'multiSelections'],
            defaultPath:  arg,
          })
        event.returnValue = result.filePaths;
    })

    ipcMain.on('selectLibraryLocation', async (event, arg) => {
        const result = await dialog.showOpenDialog(mainWindow, {
            properties: ['openDirectory'],
          })
        event.returnValue = result.filePaths;
    })

    ipcMain.on('libraryLocationExists', async (event, arg) => {
        if (fs.existsSync(arg)) {
            event.returnValue = true;
        } else {
            event.returnValue = false;
        }
        
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
    var ab = new ArrayBuffer(buf.length);
    var view = new Uint8Array(ab);
    for (var i = 0; i < buf.length; ++i) {
        view[i] = buf[i];
    }
    return ab;
}

function initTrayQuit(mainWindow) {
    tray = new Tray(path.join(__dirname, 'img/icons/IconTray64.png'));
  
    tray.setContextMenu(Menu.buildFromTemplate([
      {
        label: 'Show App', click: function () {
            mainWindow.show();
        }
      },
      {
        label: 'Quit', click: function () {
          isQuitting = true;
          app.quit();
        }
      }
    ]));

    tray.setToolTip('StarReader')
    tray.on('click', function() {
        if (appInTray) {
          mainWindow.show();
          appInTray = false;
        } else {
          mainWindow.hide();
          appInTray = true;
        }
    });
  
    mainWindow.on('close', function (event) {
      if (!isQuitting) {
        event.preventDefault();
        mainWindow.hide();
        appInTray = true;
        event.returnValue = false;
      }
    });

}



