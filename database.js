function performAddBookRecursion(db, bookArray, count) {
    return addBooksToDatabaseExecute(db, bookArray, count).then((response) =>  {
        return {'count': ++count, 'response': response};
    })
}

async function addBooksToDatabaseExecute(db, bookArray, count) {  
    let book = bookArray[count];
    return new Promise((resolve, reject) => {
        let query = 'INSERT INTO Books (Title, Author, Path, Filename) VALUES ("' + book.title + '","' + book.author + '","' + book.epubFile + '", "' + book.filename + '");'
        db.run(query, function(err) {
            if (err) {
                resolve({'error': true, 'message': err})
            }
            resolve({'error': false, 'count': count})
        })
    });
}

module.exports = {
    initDb: async function (sqlite3) {
        const dbPromise = new sqlite3.Database('./db/eserverdb.db', { Promise });
        return await dbPromise
    },
    configureDatabaseTables: function (db) {
  
        db.run('CREATE TABLE IF NOT EXISTS Books (id INTEGER PRIMARY KEY AUTOINCREMENT, Title TEXT NOT NULL, Author TEXT NOT NULL, Path TEXT NOT NULL, Filename TEXT NOT NULL);', [], function(err) {
          if (err) {
            console.log('Table Books already exists:' + err)
          }
        });
        db.run('CREATE TABLE IF NOT EXISTS Bookmarks (id INTEGER PRIMARY KEY AUTOINCREMENT, BookId INTEGER NOT NULL, Title TEXT NOT NULL, UserTitle TEXT, Position TEXT NOT NULL);', [], function(err) {
          if (err) {
            console.log('Table Bookmarks already exists:' + err)
          }
        });
      
        db.run('CREATE TABLE IF NOT EXISTS LastRead (id INTEGER PRIMARY KEY AUTOINCREMENT, BookId INTEGER NOT NULL, Position TEXT NOT NULL);', [], function(err) {
          if (err) {
            console.log('Table LastRead already exists:' + err)
          }
        });
      
        db.run('CREATE TABLE IF NOT EXISTS Settings (id INTEGER PRIMARY KEY AUTOINCREMENT, LibraryLocation TEXT NOT NULL);', [], function(err) {
          if (err) {
            console.log('Table Settings already exists:' + err)
          }
        });
        
        /*db.run('ALTER TABLE Bookmarks ADD COLUMN LastReadPosition TEXT', [], function(err) {
          if (err) {
            console.log('Column in table Bookmarks already exists: ' + err)
          }
        });*/
    },
    getLibraryLocation: async function (db) {  
        return new Promise(function (resolve, reject) {
            let query1 = 'SELECT id, LibraryLocation FROM Settings';
            db.all(query1, [], function cb(err, rows) {
                if (err) {
                    resolve({
                        error: true,
                        message: 'Error getting id from Settings table: ' + err
                    })
                }
                resolve({
                    error: false,
                    data: rows
                })
            })
        })
    },
    insertLibraryLocation: async function (db, folder) {  
        return new Promise(function (resolve, reject) {
            let query = 'INSERT INTO Settings (LibraryLocation) VALUES ("' + folder + '");'
            db.run(query, [], function(err) {
                if (err) {
                    resolve({
                        error: true,
                        message: 'Error inserting LibraryLocation to Settings table: ' + err
                    })
                }   
                resolve({
                    error: false
                })
            })
        })
    },
    updateLibraryLocation: async function (db, folder, settingsId) {  
        return new Promise(function (resolve, reject) {
            let query = 'UPDATE Settings SET LibraryLocation = "' + folder + '" WHERE id = ' + parseInt(settingsId) + ''
            db.run(query, function(err) {
                if (err) {
                    resolve({
                        error: true,
                        message: 'Error updating LibraryLocation: ' + err
                    })
                } 
                resolve({
                    error: false
                })   
            })
        })
    },
    updateBooksPathsGetRows: async function (db, path, rowId) {  
        return new Promise(function (resolve, reject) {
            let query2 = 'UPDATE Books SET Path = "' + path + '" WHERE id = ' + rowId + ''
            db.all(query2, [], function(err) {
                if (err) {
                    resolve({
                        error: true,
                        message: 'Error updating Path in Books: ' + err
                    })
                }
                resolve({
                    error: false
                })
            })
        })
    },
    getBooks: async function (db) {  
        return new Promise(function (resolve, reject) {
            let query = 'SELECT * FROM Books';
            db.all(query, [], (err, rows) => {
                if (err) {
                    resolve({
                        error: true,
                        message: 'Error getting books from Books table: ' + err
                    })
                }
                resolve({
                    error: false,
                    data: rows
                })
            })  
        })
    },
    getBooksPaths: async function (db) {  
        return new Promise(function (resolve, reject) {
            let query = 'SELECT Path FROM Books'
            db.all(query, [], function cb(err, rows) {
                if (err) {
                    resolve({
                        error: true,
                        message: 'Error getting books Path from Books table: ' + err
                    })
                }
                let pathList = [];
                rows.forEach((row, index) => {
                    pathList.push(row.Path);
                })
                console.log(pathList)
                resolve({
                    error: false,
                    data: pathList
                })
            })
        })
    },
    removeBook: async function (db, bookId) {  
        return new Promise(function (resolve, reject) {
            let query1 = 'DELETE FROM Books WHERE id = ' + bookId;
            let query2 = 'DELETE FROM Bookmarks WHERE BookId = ' + bookId;
            db.run(query1, [], function(err) {
                if (err) {
                    resolve({
                        error: true,
                        message: 'Error deleting book from library: ' + err
                    })
                } else {
                    db.run(query2, [], function(err) {
                        if (err) {
                            resolve({
                                error: true,
                                message: 'Error deleting bookmarks from library: ' + err
                            })
                        } 
                        resolve({
                            error: false
                        })
                    });
                }   
            });
        })
    },
    resolveMissingBooks: async function (db, path, filename, bookId) {  
        return new Promise(function (resolve, reject) {
            let query = 'UPDATE Books SET Path = "' + path + '", Filename = "' + filename+ '" WHERE id = ' + bookId + ''
            db.run(query, function(err) {
                if (err) {
                    resolve({
                        error: true,
                        message: 'Unable to update book(s) in database: ' + err
                    })
                }
                resolve({
                    error: false
                })
            });
        })
    },

    addBooksToDatabase: async function (db, bookArray, count, error) {  
        return new Promise(function (resolve, reject) {  
            performAddBookRecursion(db, bookArray, count).then(function (response) {
                    if (response.response.error == true) {
                        resolve({
                            error: true,
                            message: response.response.message
                        })
                    }
                    if (response.count > bookArray.length - 1) {
                        resolve({
                            error: false
                        })
                    }
                    else {
                        resolve (module.exports.addBooksToDatabase(db, bookArray, ++count, error))
                    }
                })
        })

        
    },
    recordReadPosition: async function (bookId, cfi) {  
        return new Promise(function (resolve, reject) {
            let query1 = 'SELECT * FROM LastRead';
            let query2 = 'INSERT INTO LastRead (BookId, Position) VALUES ("' + bookId + '", "' + cfi + '");'

            db.all(query1, [], function cb(err, rows) {
                if (err) {
                    resolve({
                        error: true,
                        message: 'Unable to select rows form LastRead table: ' + err
                    })
                }
                var matchedRow = false;
                rows.forEach((row, index) => {
                    if (row.BookId == bookId) {
                        matchedRow = row;
                    }
                });
                if (matchedRow == false) {
                    db.run(query2, [], function(err) {
                        if (err) {
                            resolve({
                                error: true,
                                message: 'Unable to insert Position into LastRead table: ' + err
                            })
                        }
                        resolve()
                    });
                } 
                else {
                    let query3 = 'UPDATE LastRead SET Position = "' + bookId + '" WHERE id = ' + matchedRow.id + ''
                    db.run(query3, function(err) {
                        if (err) {
                            resolve({
                                error: true,
                                message: 'Unable to update position in LastRead table: ' + err
                            })
                        }
                        resolve()
                    });
                }
            })
        })
    },
    getBookmarks: async function (db, bookId) {  
        return new Promise(function (resolve, reject) {
            let query = 'SELECT * FROM Bookmarks WHERE BookId = ' + bookId + '';
            db.all(query, [], (err, rows) => {
                if (err) {
                    resolve({
                        error: true,
                        message: 'Unable to update UserTitle in Bookmarks table: ' + err
                    })
                }
                console.log('resolvio')
                resolve({
                    error: false,
                    data: rows
                })
            })
        })
    },
    addBookmark: async function (db, bookId, cfi) {  
        return new Promise(function (resolve, reject) {
            let query1 = 'SELECT * FROM Bookmarks WHERE BookId = ' + bookId + '';
            db.all(query1, [], (err, rows) => {
                if (err) {
                    resolve({
                        error: true,
                        message: 'Unable to retrieve Bookmarks from Bookmarks table: ' + err
                    })
                }
                let bookmarkNumber = rows.length + 1;
                let query2 = 'INSERT INTO Bookmarks (BookId, Title, Position) VALUES ("' + bookId + '","Bookmark #' + bookmarkNumber + '","' + cfi + '");'
                db.run(query2, function(err) {
                    if (err) {
                        resolve({
                            error: true,
                            message: 'Unable to add Bookmark to Bookmarks table: ' + err
                        })
                    } 
                    resolve({
                        error: false
                    })
                    
                });
            })
        })
    },
    updateBookmarkTitle: async function (db, title, bookId) {  
        return new Promise(function (resolve, reject) {
            let query = 'UPDATE Bookmarks SET UserTitle = "' + title + '" WHERE id = ' + bookId + ''
            db.run(query, function(err) {
                if (err) {
                    resolve({
                        error: true,
                        message: 'Unable to update UserTitle in Bookmarks table: ' + err
                    })
                }
                resolve({
                    error: false
                })
            })
        })
    },
    deleteBookmark: async function (db, id) {  
        return new Promise(function (resolve, reject) {
            let query = 'DELETE FROM Bookmarks WHERE id = ' + id + '';
            db.run(query, [], function(err) {
                if (err) {
                    resolve({
                        error: true,
                        message: 'Unable to delete Boomark from Bookmarks table: ' + err
                    })
                }
                resolve({
                    error: false
                })
            })
        })
    },
    recordReadPosition: async function (db, bookId, cfi) {  
        return new Promise(function (resolve, reject) {
            let query1 = 'SELECT * FROM LastRead';
            let query2 = 'INSERT INTO LastRead (BookId, Position) VALUES ("' + bookId + '", "' + cfi + '");'

            db.all(query1, [], function cb(err, rows) {
                if (err) {
                    resolve({
                        error: true,
                        message: 'Error getting all rows from LastRead table: ' + err
                    })
                }
                var matchedRow = false;
                rows.forEach((row, index) => {
                    if (row.BookId == bookId) {
                        matchedRow = row;
                    }
                });
                if (matchedRow == false) {
                    db.run(query2, [], function(err) {
                        if (err) {
                            resolve({
                                error: true,
                                message: 'Error inserting position in LastReadTable: ' + err
                            })
                        }
                        resolve({
                            error: false
                        })
                    });
                } else {
                    let query3 = 'UPDATE LastRead SET Position = "' + cfi + '" WHERE id = ' + matchedRow.id + '' 
                    db.run(query3, function(err) {
                        if (err) {
                            resolve({
                                error: true,
                                message: 'Error updating position in LastRead table: ' + err
                            })
                        }
                        resolve({
                            error: false
                        })
                    })    
                }
            })
        });
    },
    goToLastRead: async function (db, bookId) {  
        return new Promise(function (resolve, reject) {
            let query = 'SELECT * FROM LastRead';
            db.all(query, [], function cb(err, rows) {
                if (err) {
                    resolve({
                        error: true,
                        message: 'Unable to access rows from LastRead table' + err
                    })
                }
                var matchedRow = false;
                rows.forEach((row, index) => {
                    if (row.BookId == bookId) {
                        matchedRow = row;
                    }
                });
                if (matchedRow != false) {
                    resolve({
                        error: false,
                        data: matchedRow.Position
                    })
                } 
            })
        })
    },
};