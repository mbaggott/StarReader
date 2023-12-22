const {
    contextBridge,
    ipcRenderer
} = require("electron");

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
            const saferFn = (event, ...args) => fn(...args)
            ipcRenderer.on('selectLibraryLocationResponse', saferFn)
            const key = 'SLLKEY'
            listeners[key] = saferFn
        },
        selectLibraryLocationRemoveResponseHandler: (key) => {
            const fn = listeners[key]
            delete listeners[key]
            ipcRenderer.removeListener('selectLibraryLocationResponse', fn);
        },
        selectLibraryLocation: () => ipcRenderer.send("selectLibraryLocation"),
        onGetBooks: (fn, key) => {
            // Deliberately strip event as it includes `sender` 
            const saferFn = (event, ...args) => fn(...args)
            ipcRenderer.on('getBooksResponse', saferFn)
            listeners[key] = saferFn
        },
        getBooksRemoveResponseHandler: (key) => {
            const fn = listeners[key]
            delete listeners[key]
            ipcRenderer.removeListener('getBooksResponse', fn);
        },
        getBooks: () => ipcRenderer.send("getBooks"),
        onRemoveBook: (fn) => {
            // Deliberately strip event as it includes `sender` 
            const saferFn = (event, ...args) => fn(...args)
            ipcRenderer.on('removeBookResponse', saferFn)
            const key = 'RBKEY'
            listeners[key] = saferFn
        },
        removeBookRemoveResponseHandler: (key) => {
            const fn = listeners[key];
            delete listeners[key];
            ipcRenderer.removeListener('removeBookResponse', fn);
        },
        removeBook: (bookId) => ipcRenderer.send("removeBook", bookId),
        onGetBookFileList: (fn) => {
            // Deliberately strip event as it includes `sender` 
            const saferFn = (event, ...args) => fn(...args)
            ipcRenderer.on('getBookFileListResponse', saferFn)
            const key = 'GBFLKEY'
            listeners[key] = saferFn
        },
        getBookFileListRemoveResponseHandler: (key) => {
            const fn = listeners[key]
            delete listeners[key]
            ipcRenderer.removeListener('getBookFileListResponse', fn);
        },
        getBookFileList: (escapedPath) => ipcRenderer.send("getBookFileList", escapedPath),
        onGetBookFileListModal: (fn) => {
            // Deliberately strip event as it includes `sender` 
            const saferFn = (event, ...args) => fn(...args)
            ipcRenderer.on('getBookFileListModalResponse', saferFn)
            const key = 'GBFLMKEY'
            listeners[key] = saferFn
        },
        getBookFileListModalRemoveResponseHandler: (key) => {
            const fn = listeners[key]
            delete listeners[key]
            ipcRenderer.removeListener('getBookFileListModalResponse', fn);
        },
        getBookFileListModal: (escapedPath) => ipcRenderer.send("getBookFileListModal", escapedPath),
        onGetLibraryLocation: (fn) => {
            // Deliberately strip event as it includes `sender` 
            const saferFn = (event, ...args) => fn(...args)
            ipcRenderer.on('getLibraryLocationResponse', saferFn)
            const key = 'GLLKEY'
            listeners[key] = saferFn
        },
        getLibraryLocationRemoveResponseHandler: (key) => {
            const fn = listeners[key]
            delete listeners[key]
            ipcRenderer.removeListener('getLibraryLocationResponse', fn)
        },
        getLibraryLocation: () => ipcRenderer.send("getLibraryLocation", false),
        onLibraryLocationExists: (fn) => {
            // Deliberately strip event as it includes `sender`
            const saferFn = (event, ...args) => fn(...args)
            ipcRenderer.on('libraryLocationExistsResponse', saferFn)
            const key = 'LLEKEY'
            listeners[key] = saferFn 
        },
        libraryLocationExistsRemoveResponseHandler: (key) => {
            const fn = listeners[key]
            delete listeners[key]
            ipcRenderer.removeListener('libraryLocationExistsResponse', fn)
        },
        libraryLocationExists: (escapedPath) => ipcRenderer.send("libraryLocationExists", escapedPath),
        onInsertLibraryLocation: (fn) => {
            // Deliberately strip event as it includes `sender` 
            const saferFn = (event, ...args) => fn(...args)
            ipcRenderer.on('insertLibraryLocationResponse', saferFn)
            const key = 'ILLKEY'
            listeners[key] = saferFn 
        },
        insertLibraryLocationRemoveResponseHandler: (key) => {
            const fn = listeners[key]
            delete listeners[key]
            ipcRenderer.removeListener('insertLibraryLocationResponse', fn)
        },
        insertLibraryLocation: (folder) => ipcRenderer.send("insertLibraryLocation", folder),
        onUpdateLibraryLocation: (fn) => {
            // Deliberately strip event as it includes `sender`
            const saferFn = (event, ...args) => fn(...args)
            ipcRenderer.on('updateLibraryLocationResponse', saferFn)
            const key = 'ULLKEY'
            listeners[key] = saferFn 
        },
        updateLibraryLocationRemoveResponseHandler: (key) => {
            const fn = listeners[key]
            delete listeners[key]
            ipcRenderer.removeListener('updateLibraryLocationResponse', fn)
        },
        updateLibraryLocation: (folder, settingsId) => ipcRenderer.send("updateLibraryLocation", folder, settingsId),
        onGetBooksPaths: (fn) => {
            // Deliberately strip event as it includes `sender`
            const saferFn = (event, ...args) => fn(...args)
            ipcRenderer.on('getBooksPathsResponse', saferFn)
            const key = 'GBPKEY'
            listeners[key] = saferFn 
        },
        getBooksPathsRemoveResponseHandler: (key) => {
            const fn = listeners[key]
            delete listeners[key]
            ipcRenderer.removeListener('getBooksPathsResponse', fn)
        },
        getBooksPaths: () => ipcRenderer.send("getBooksPaths"),
        onUpdateBooksPaths: (fn) => {
            // Deliberately strip event as it includes `sender`
            const saferFn = (event, ...args) => fn(...args)
            ipcRenderer.on('updateBooksPathsResponse', saferFn)
            const key = 'UBPKEY'
            listeners[key] = saferFn 
        },
        updateBooksPathsRemoveResponseHandler: (key) => {
            const fn = listeners[key]
            delete listeners[key]
            ipcRenderer.removeListener('updateBooksPathsResponse', fn)
        },
        updateBooksPaths: (path, rowId) => ipcRenderer.send("updateBooksPaths", path, rowId),
        onResolveMissingBooks: (fn) => {
            // Deliberately strip event as it includes `sender`
            const saferFn = (event, ...args) => fn(...args)
            ipcRenderer.on('resolveMissingBooksResponse', saferFn)
            const key = 'RMBKEY'
            listeners[key] = saferFn 
        },
        resolveMissingBooksRemoveResponseHandler: (key) => {
            const fn = listeners[key]
            delete listeners[key]
            ipcRenderer.removeListener('resolveMissingBooksResponse', fn)
        },
        resolveMissingBooks: (path, filename, bookId) => ipcRenderer.send("resolveMissingBooks", path, filename, bookId),
        onAddBooksToLibrary: (fn) => {
            // Deliberately strip event as it includes `sender`
            const saferFn = (event, ...args) => fn(...args)
            ipcRenderer.on('addBooksToLibraryResponse', saferFn)
            const key = 'ABTLKEY'
            listeners[key] = saferFn 
        },
        addBooksToLibraryRemoveResponseHandler: (key) => {
            const fn = listeners[key]
            delete listeners[key]
            ipcRenderer.removeListener('addBooksToLibraryResponse', fn)
        },
        addBooksToLibrary: (libraryPath) => ipcRenderer.send("addBooksToLibrary", libraryPath),
        onAddBooksToDatabase: (fn) => {
            // Deliberately strip event as it includes `sender`
            const saferFn = (event, ...args) => fn(...args)
            ipcRenderer.on('addBooksToDatabaseResponse', saferFn)
            const key = 'ABTDKEY'
            listeners[key] = saferFn  
        },
        addBooksToDatabaseRemoveResponseHandler: (key) => {
            const fn = listeners[key]
            delete listeners[key]
            ipcRenderer.removeListener('addBooksToDatabaseResponse', fn)
        },
        addBooksToDatabase: (bookArray) => ipcRenderer.send("addBooksToDatabase", bookArray),
        onReadEpubFromFile: (fn) => {
            // Deliberately strip event as it includes `sender`
            const saferFn = (event, ...args) => fn(...args)
            ipcRenderer.on('readEpubFromFileResponse', saferFn)
            const key = 'REFFKEY'
            listeners[key] = saferFn  
        },
        readEpubFromFileRemoveResponseHandler: (key) => {
            const fn = listeners[key]
            delete listeners[key]
            ipcRenderer.removeListener('readEpubFromFileResponse', fn)
        },
        readEpubFromFile: (path) => ipcRenderer.send("readEpubFromFile", path),
        onRecordReadPosition: (fn) => {
            // Deliberately strip event as it includes `sender`
            const saferFn = (event, ...args) => fn(...args)
            ipcRenderer.on('recordReadPositionResponse', saferFn)
            const key = 'RRPKEY'
            listeners[key] = saferFn  
        },
        recordReadPositionRemoveResponseHandler: async (key) => {
            const fn = listeners[key]
            delete listeners[key]
            await ipcRenderer.removeListener('recordReadPositionResponse', fn)
        },
        recordReadPosition: (bookId, cfi) => ipcRenderer.send("recordReadPosition", bookId, cfi),
        onGetBookmarks: (fn) => {
            // Deliberately strip event as it includes `sender`
            const saferFn = (event, ...args) => fn(...args)
            ipcRenderer.on('getBookmarksResponse', saferFn)
            const key = 'GBKEY'
            listeners[key] = saferFn   
        },
        getBookmarksRemoveResponseHandler: (key) => {
            const fn = listeners[key]
            delete listeners[key]
            ipcRenderer.removeListener('getBookmarksResponse', fn)
        },
        getBookmarks: (bookId) => ipcRenderer.send("getBookmarks", bookId),
        onAddBookmark: (fn) => {
            // Deliberately strip event as it includes `sender`
            const saferFn = (event, ...args) => fn(...args)
            ipcRenderer.on('addBookmarkResponse', saferFn)
            const key = 'ABKEY'
            listeners[key] = saferFn   
        },
        addBookmarkRemoveResponseHandler: (key) => {
            const fn = listeners[key]
            delete listeners[key]
            ipcRenderer.removeListener('addBookmarkResponse', fn)
        },
        addBookmark: (bookId, cfi) => ipcRenderer.send("addBookmark", bookId, cfi),
        onUpdateBookmarkTitle: (fn) => {
            // Deliberately strip event as it includes `sender`
            const saferFn = (event, ...args) => fn(...args)
            ipcRenderer.on('updateBookmarkTitleResponse', saferFn)
            const key = 'UBTKEY'
            listeners[key] = saferFn   
        },
        updateBookmarkTitleRemoveResponseHandler: (key) => {
            const fn = listeners[key]
            delete listeners[key]
            ipcRenderer.removeListener('updateBookmarkTitleResponse', fn)
        },
        updateBookmarkTitle: (title, bookId) => ipcRenderer.send("updateBookmarkTitle", title, bookId),
        onDeleteBookmark: (fn) => {
            // Deliberately strip event as it includes `sender`
            const saferFn = (event, ...args) => fn(...args)
            ipcRenderer.on('deleteBookmarkResponse', saferFn)
            const key = 'DBKEY'
            listeners[key] = saferFn   
        },
        deleteBookmarkRemoveResponseHandler: (key) => {
            const fn = listeners[key]
            delete listeners[key]
            ipcRenderer.removeListener('deleteBookmarkResponse', fn)
        },
        deleteBookmark: (bookId) => ipcRenderer.send("deleteBookmark", bookId),
        onGoToLastRead: (fn) => {
            // Deliberately strip event as it includes `sender`
            const saferFn = (event, ...args) => fn(...args)
            ipcRenderer.on('goToLastReadResponse', saferFn)
            const key = 'GTLRKEY'
            listeners[key] = saferFn   
        },
        goToLastReadRemoveResponseHandler: (key) => {
            const fn = listeners[key]
            delete listeners[key]
            ipcRenderer.removeListener('goToLastReadResponse', fn)
        },
        goToLastRead: (bookId) => ipcRenderer.send("goToLastRead", bookId),
    }
);