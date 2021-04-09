const {
    contextBridge,
    ipcRenderer
} = require("electron");

const {
    sqlite3
} = require("sqlite3");

let listeners = {}

contextBridge.exposeInMainWorld(
    "api", {
        onResponse: (fn) => {
            // Deliberately strip event as it includes `sender` 
            ipcRenderer.on('response', (event, ...args) => fn(...args));
        },
        request: (data) => ipcRenderer.send("request", {
            data,
        }),
        onSelectLibraryLocation: (fn) => {
            // Deliberately strip event as it includes `sender` 
            ipcRenderer.on('selectLibraryLocationResponse', (event, ...args) => fn(...args));
        },
        selectLibraryLocation: () => ipcRenderer.send("selectLibraryLocation"),
        onGetBooks: (fn) => {
            // Deliberately strip event as it includes `sender` 
            ipcRenderer.on('getBooksResponse', (event, ...args) => fn(...args));
        },
        getBooks: () => ipcRenderer.send("getBooks"),
        onRemoveBook: (fn) => {
            // Deliberately strip event as it includes `sender` 
            ipcRenderer.on('removeBookResponse', (event, ...args) => fn(...args));
        },
        removeBook: (bookId) => ipcRenderer.send("removeBookResponse", bookId),
        onGetBookFileList: (fn) => {
            // Deliberately strip event as it includes `sender` 
            ipcRenderer.on('getBookFileListResponse', (event, ...args) => fn(...args));
        },
        getBookFileList: (escapedPath) => ipcRenderer.send("getBookFileList", escapedPath),
        onGetBookFileListModal: (fn) => {
            // Deliberately strip event as it includes `sender` 
            ipcRenderer.on('getBookFileListModalResponse', (event, ...args) => fn(...args));
        },
        getBookFileListModal: (escapedPath) => ipcRenderer.send("getBookFileListModal", escapedPath),
        onGetLibraryLocation: (fn) => {
            // Deliberately strip event as it includes `sender` 
            const saferFn = (event, ...args) => fn(...args)
            ipcRenderer.on('getLibraryLocationResponse', saferFn);
            const key = 'GLLKEY';
            listeners[key] = saferFn;
        },
        getLibraryLocationRemoveResponseHandler: (key) => {
            const fn = listeners[key];
            delete listeners[key];
            ipcRenderer.removeListener('getLibraryLocationResponse', fn);
        },
        getLibraryLocation: () => ipcRenderer.send("getLibraryLocation"),
        onLibraryLocationExists: (fn) => {
            // Deliberately strip event as it includes `sender` 
            ipcRenderer.on('libraryLocationExistsResponse', (event, ...args) => fn(...args));
        },
        libraryLocationExists: (escapedPath) => ipcRenderer.send("libraryLocationExists", escapedPath),
        onInsertLibraryLocation: (fn) => {
            // Deliberately strip event as it includes `sender` 
            ipcRenderer.on('insertLibraryLocationResponse', (event, ...args) => fn(...args));
        },
        insertLibraryLocation: (folder) => ipcRenderer.send("insertLibraryLocation", folder),
        onUpdateLibraryLocation: (fn) => {
            // Deliberately strip event as it includes `sender` 
            ipcRenderer.on('updateLibraryLocationResponse', (event, ...args) => fn(...args));
        },
        updateLibraryLocation: (folder, settingsId) => ipcRenderer.send("updateLibraryLocation", folder, settingsId),
        onGetBooksPaths: (fn) => {
            // Deliberately strip event as it includes `sender` 
            ipcRenderer.on('getBooksPathsResponse', (event, ...args) => fn(...args));
        },
        getBooksPaths: () => ipcRenderer.send("getBooksPaths"),
        onUpdateBooksPaths: (fn) => {
            // Deliberately strip event as it includes `sender` 
            ipcRenderer.on('updateBooksPathsResponse', (event, ...args) => fn(...args));
        },
        upateBooksPaths: (path, rowId) => ipcRenderer.send("updateBooksPaths", path, rowId),
        onResolveMissingBooks: (fn) => {
            // Deliberately strip event as it includes `sender` 
            ipcRenderer.on('resolveMissingBooksResponse', (event, ...args) => fn(...args));
        },
        resolveMissingBooks: (path, filename, bookId) => ipcRenderer.send("resolveMissingBooks", path, filename, bookId),
        onAddBooksToLibrary: (fn) => {
            // Deliberately strip event as it includes `sender` 
            ipcRenderer.on('addBooksToLibraryResponse', (event, ...args) => fn(...args));
        },
        addBooksToLibrary: (libraryPath) => ipcRenderer.send("addBooksToLibrary", libraryPath),
        onAddBooksToDatabase: (fn) => {
            // Deliberately strip event as it includes `sender` 
            ipcRenderer.on('addBooksToDatabaseResponse', (event, ...args) => fn(...args));
        },
        addBooksToDatabase: (bookArray) => ipcRenderer.send("addBooksToDatabase", bookArray),
        onReadEpubFromFile: (fn) => {
            // Deliberately strip event as it includes `sender` 
            ipcRenderer.on('readEpubFromFileResponse', (event, ...args) => fn(...args));
        },
        readEpubFromFile: (path) => ipcRenderer.send("readEpubFromFile", path),
        onRecordReadPosition: (fn) => {
            // Deliberately strip event as it includes `sender` 
            ipcRenderer.on('recordReadpositionResponse', (event, ...args) => fn(...args));
        },
        recordReadposition: (bookId, cfi) => ipcRenderer.send("recordReadPosition", bookId, cfi),
        onGetBookmarks: (fn) => {
            // Deliberately strip event as it includes `sender` 
            ipcRenderer.on('getBookmarksResponse', (event, ...args) => fn(...args));
        },
        getBookmarks: (bookId) => ipcRenderer.send("getBookmarks", bookId),
        onAddBookmark: (fn) => {
            // Deliberately strip event as it includes `sender` 
            ipcRenderer.on('addBookmarkResponse', (event, ...args) => fn(...args));
        },
        addBookmark: (bookId, cfi) => ipcRenderer.send("addBookmark", bookId, cfi),
        onUpdateBookmarkTitle: (fn) => {
            // Deliberately strip event as it includes `sender` 
            ipcRenderer.on('updateBookmarkTitleResponse', (event, ...args) => fn(...args));
        },
        updateBookmarkTitle: (title, bookId) => ipcRenderer.send("updateBookmarkTitle", title, bookId),
        onDeleteBookmark: (fn) => {
            // Deliberately strip event as it includes `sender` 
            ipcRenderer.on('deleteBookmarkResponse', (event, ...args) => fn(...args));
        },
        deleteBookmark: (bookId) => ipcRenderer.send("deleteBookmark", bookId),
        onRecordReadPosition: (fn) => {
            // Deliberately strip event as it includes `sender` 
            ipcRenderer.on('recordReadPositionResponse', (event, ...args) => fn(...args));
        },
        recordReadPosition: (bookId, cfi) => ipcRenderer.send("recordReadPosition", bookId, cfi),
        onGoToLastRead: (fn) => {
            // Deliberately strip event as it includes `sender` 
            ipcRenderer.on('goToLastReadResponse', (event, ...args) => fn(...args));
        },
        goToLastRead: (bookId) => ipcRenderer.send("goToLastRead", bookId),
    }
);