/* 
  Window Variables
  window.openBookId
  window.Popper
  window.chaptersOpen
  window.bookmarksOpen
  window.book
  window.addBooksCancel
  window.table
  window.rendition
  window.db
  window.theme
  window.libraryFiles
  window.scrollBacklog
*/

var resizeTime;
var resizeTimeout = false;
var resizeDelta = 200;

var resizeTimeInteract;
var resizeTimeoutInteract = false;
var resizeDeltaInteract = 200;
var firstRun = true;
var scrollBacklog = 0;

function resize(){

    if (firstRun == true) {
        firstRun = false;
        return;
    }
  
    resizeTime = new Date();
    if (resizeTimeout === false) {
        resizeTimeout = true;
        setTimeout(resizeend, resizeDelta);
    }

    function resizeend() {
        if (new Date() - resizeTime < resizeDelta) {
            setTimeout(resizeend, resizeDelta);
        }
        else {
            resizeTimeout = false;
            setTimeoutScroll(true, false); 
            sizeContentDiv();
            if (window.rendition) {
                window.rendition.resize(); 
            }
        }                
    }
};

$(function() {
    
    window.api.onResponse((response) => {
        if (response.error) {
            console.log(response.data); //printed second
            console.log(new Date().getTime());
        } 
    });
    window.api.request('ping'); //printed first

    window.chaptersOpen = true;
    window.bookmarksOpen = true;
    window.theme = 'light';

    $(window).on("resize", resize);

    updateLibraryLocation(false).then((path) => {
        updateLibrary(true, path);
    });  

    window.addEventListener("resize", () => {
        $('#result').height($('html').height() - 42);
        if (window.book)
        window.book.rendition.display();
    });

    initResizeableElements();

    $('#resolveMissingBookModal').on('show.bs.modal', function (event) {
        var button = $(event.relatedTarget); // Button that triggered the modal
        var bookId = button.data('bookid'); // Extract info from data-* attributes
    
        $('#resolveMissingBookModal .btn-danger').on('click', () => {
            removeBook(bookId);
            $('#resolveMissingBookModal').modal('hide');
        });

        $('#resolveMissingBookModal .btn-primary').on('click', () => {
            $('#resolveMissingBookFileSelect').trigger('click');
        });

        $('#resolveMissingBookFileSelect').on('change', () => {
            resolveMissingBook(db, bookId);
            $('#resolveMissingBookModal').modal('hide');     
        });
    
    });

    $('exitToSystemTray').on('click', () => {
    
    
    })

});

function resolveMissingBook(db, bookId) {
    let files = $('#resolveMissingBookFileSelect').prop('files');
    let path = files[0].path;
    let filename = files[0].name;
    window.api.onResolveMissingBooks((response) => {
        if (response.error == false) {
            updateLibrary(false);
        } else {
            $('#serverErrorMessage').html(response.message);
            $('#serverErrorModal').modal('show');
            return;
        }
    });
    window.api.resolveMissingBooks(path, filename, bookId);
}

function addBooks() {
    console.log('addBooks')
    let libraryPathQuery = new Promise((resolve, reject) => {
        window.api.onGetLibraryLocation((response) => {
            window.api.getLibraryLocationRemoveResponseHandler('GLLKEY');
            resolve(response);
        });
        window.api.getLibraryLocation(); //printed first
    });

    libraryPathQuery.then((response1) => {
        console.log('pathQuery')
        if (response1.error == false) {
            let libraryPath = response1.data[0].LibraryLocation
            let libraryPathQuery  = new Promise((resolve, reject) => {
                window.api.onAddBooksToLibrary((response2) => {
                    resolve(response2);
                });
                window.api.addBooksToLibrary(); //printed first
            });
            libraryPathQuery.then((response2) => {
                console.log('addBookstoLibray')
                if (response2.error == false) {
                    let fileList = response2.data;
                    if (fileList.length == 0) {
                        return;
                    }
                    console.log('made it 1')
                    for (let flx = 0; flx < fileList.length; flx++) {
                        if (!fileList[flx].includes(libraryPath)) {
                            $('#addBooksMustBeInLibraryFolder').show();
                            setTimeout(function(){
                                $('#addBooksMustBeInLibraryFolder').hide();
                            },5000);
                            return;
                        }
                    }
                    console.log('made it 2')
                    let numFiles = fileList.length;
                    let count = 0;
                    
                    // Create a query to check for existing book paths
                    let pathListQuery = new Promise((resolve, reject) => {
                        window.api.onGetBooksPaths((response3) => {
                            window.api.getBooksPathsRemoveResponseHandler('GBPKEY');
                            resolve(response3);
                        });
                        window.api.getBooksPaths(); //printed first
                    });
                    pathListQuery.then((response3) => {
                        console.log('runingpathlistquery')
                        if (response3.error == false) {
                            let rows = response3.data;
                            $('.progress-bar').css('width', '0%');
                            window.addBooksCancel = false;
                
                            // Set up the cancel onclick
                            $('#addBooksCancel').on('click', ()=> {
                                window.addBooksCancel = true;
                            })
                
                            // Show the progress bar, blocking interaction with the rest of the web page
                            $('.progressContainer').show();
                
                            // Start adding the books one by one to the database
                            console.log('addBookstodb')
                            addBooktoDB([], numFiles, count, fileList, rows, 0);
                        } 
                        else {
                            $('#serverErrorMessage').html(response3.message);
                            $('#serverErrorModal').modal('show');
                            return;
                        }
                    });
                } else {
                    $('#serverErrorMessage').html(response2.message);
                    $('#serverErrorModal').modal('show');
                    return;
                }
            });
        } else {
            $('#serverErrorMessage').html(response1.message);
            $('#serverErrorModal').modal('show');
            return;
        }
    });
}      

function addBooktoDB(bookArray, numFiles, count, fileList, pathList, booksAdded) {
    console.log(fileList)
    console.log(count)
    console.log(numFiles)
    $('.alert').hide();
    $('.progress-bar').css('width', (count / numFiles * 100) + '%');
    if (count > 0) {
        $('.progress-bar').css('width', (count / numFiles * 100) + '%');
    }
    if (numFiles == count) {
        console.log(numFiles)
        console.log(count)
        if (booksAdded == 0) {
            $('#allBooksAddedDuplicates').show();
            setTimeout(function(){
                $('#allBooksAddedDuplicates').hide();
            },5000);
        } 
        else if (numFiles > booksAdded) {
            $('#someBooksAddedDuplicates').show();
            setTimeout(function(){
                $('#someBooksAddedDuplicates').hide();
            },5000);
        }
        if (booksAdded > 0) {
            console.log('sending')
            sendBooksToDatabase(bookArray);
        }
        window.addBooksCancel = false;
        $('.progressContainer').hide();
        return;
    }
  
    let epubFile = fileList[count];
    console.log(epubFile)
    // Check if file path already exists in the Database. If it does, skip this book.
    if (pathList.length === 0) {
        if (numFiles > count && window.addBooksCancel == false) {
            console.log('running execute 1')
            addBookToDBExecute(bookArray, numFiles, count, fileList, pathList, epubFile, ++booksAdded)
        } 
        else {
            // If finished, update the library Grid, and reset cancel back to false so it can be used again.
            console.log('running DB1')
            sendBooksToDatabase(bookArray);
        }
    } else if (pathList.includes(epubFile)) {
        console.log('running if')
        if (numFiles > count && window.addBooksCancel == false) {
            console.log('running Db2')
            addBooktoDB(bookArray, numFiles, ++count, fileList, pathList, booksAdded);
        } 
        else {
            // If finished, update the library Grid, and reset cancel back to false so it can be used again.
            console.log('running DB3')
            sendBooksToDatabase(bookArray);
        }
        return;
    }
    else {
        console.log('running execute');
        addBookToDBExecute(bookArray, numFiles, count, fileList, pathList, epubFile, ++booksAdded)
    }
} 

function sendBooksToDatabase(bookArray) {
    window.api.onAddBooksToDatabase((response) => {
        console.log(response);
        if (response.error == false) {
            updateLibrary(false);
            window.addBooksCancel = false;
            $('.progressContainer').hide();
        } 
        else {
            $('#serverErrorMessage').html(response.message);
            $('#serverErrorModal').modal('show');
            return;
        } 
    });
    window.api.addBooksToDatabase(bookArray);

}

function addBookToDBExecute(bookArray, numFiles, count, fileList, pathList, epubFile, booksAdded) {
    console.log(epubFile)
    var filename = epubFile.split('\\').pop().split('/').pop();
    // Insert the book into the database, and recursively call the function again, so all books are inserted one by one into the Database.
    let epub = window.ePub(epubFile);
    let title;
    let author;
    epub.loaded.spine.then((spine) => {
        Object.values(spine.spineItems).reduce(function(p, item) {
            return p.then(function(bookArray) {
                return getContents(item, epub).then(function(contents) {
                    //const contents = await item[index].load(epub.load.bind(epub));
                    title = $(contents).find('head').find('title').html();
                    let meta = $(contents).find('head').find('meta[name=author]');
                    author = meta.attr('content');
                    bookObject = {
                        'title': title,
                        'author': author,
                        'epubFile': epubFile,
                        'filename': filename
                    }
                    return bookObject;
                });
            });
        }, $.Deferred().resolve([])).then(function(bookObject) {
            bookArray.push(bookObject);
            addBooktoDB(bookArray, numFiles, ++count, fileList, pathList, booksAdded);
        }, function(err) {
            // err is the error from the rejected promise that stopped the chain of execution
        });
            
        
        
    });
}

const getContents = async function(item, epub) {
    let content = item.load(epub.load.bind(epub));
    return content;
}

    
async function updateLibraryLocation(manualEdit) {
    let key;
    return new Promise((resolve, reject) => {
        $('.loadingContainer').css('display', 'flex');
        $('#libraryLocationModal').on('show.bs.modal', function (event) {
            $('#libraryLocationModal .btn-primary').on('click', () =>   {
                window.api.onSelectLibraryLocation((response) => {
                    window.api.selectLibraryLocationRemoveResponseHandler('SLLKEY');
                    if (response.error == false) {
                        folder =  response.data; 
                        if (folder.length == 0) {
                            return;
                        }
                        var escapedPath = folder.toString().replace(/\\/g, "/");
                        // If no folder selected
                        let currentPath = $('#libraryLocationModal').attr('data-currentpath');
                        let newPath = folder + '\\';
                        var escapedPath = folder.toString().replace(/\\/g, "/");
                        //update the list of books in the library from the slelected folder
                        window.api.onGetBookFileListModal((response) => {
                            window.api.getBookFileListModalRemoveResponseHandler('GBFLMKEY');
                            if (response.error) {
                                window.libraryFiles = response.data;
                            }
                        });
                        window.api.getBookFileListModal(escapedPath);    
                        var dataResult = $('#libraryLocationModal').attr('data-result');
                        // If there is no setting for a libraryLocation yet, insert it into the Database, set the setting value on the settings page, the calling method will update the library 
                        // Resolve with the escaped path of the new library location
                        if (dataResult == 'nosetting') {
                            window.api.onInsertLibraryLocation((response) => {
                                window.api.insertLibraryLocationRemoveResponseHandler('ILLKEY');
                                if (response.error == false) {
                                    $('.loadingContainer').css('display', 'none');
                                    $('#libraryLocation').html(escapedPath);
                                } else {
                                    $('#serverErrorMessage').html(response.message);
                                    $('#serverErrorModal').modal('show');
                                    return;
                                }
                            });
                            window.api.insertLibraryLocation(folder);
                        } 
                        // If libraryLocation doesn't exist on the HDD, update the DB with the new setting, re-write the book paths with the new location
                        // resolve with the escaped path of the new library location
                        else {
                            let settingsId = $('#libraryLocationModal').attr('data-settingsid');
                            window.api.onUpdateLibraryLocation((response) => {
                                window.api.updateLibraryLocationRemoveResponseHandler('ULLKEY');
                                if (response.error == false) {
                                    $('#libraryLocation').html(folder);
                                    rewriteBooksPaths(currentPath, newPath);
                                } else {
                                    $('#serverErrorMessage').html(response.message);
                                    $('#serverErrorModal').modal('show');
                                    return;
                                }
                            });
                            window.api.updateLibraryLocation(folder, settingsId);
                        }
                        // If libraryLocation does exist on the HDD, just update the setting on the Settings page
                        resolve(escapedPath);
                        $('#libraryLocationModal').modal('hide');
                    } 
                    else {
                        $('#serverErrorMessage').html(response.message);
                        $('#serverErrorModal').modal('show');
                        return;
                    }
                });
                window.api.selectLibraryLocation();
            });
        });

        window.api.onGetLibraryLocation((response) => {
            window.api.getLibraryLocationRemoveResponseHandler('GLLKEY');
            if (response.error == false) {
                let rows = response.data;
                // If performing a manual edit through the settings page
                if (manualEdit == true) {
                    let currentPath = rows[0].LibraryLocation + '\\';

                    window.api.onSelectLibraryLocation((response) => {
                        window.api.selectLibraryLocationRemoveResponseHandler('SLLKEY');
                        if (response.error == false) {
                            folder =  response.data; 
                            if (folder.length == 0){
                                $('.loadingContainer').css('display', 'none');
                                return;
                            }
                            let newPath = folder + '\\';
                            window.api.onUpdateLibraryLocation((response) => {
                                window.api.updateLibraryLocationRemoveResponseHandler('ULLKEY');
                                if (response.error == false) {
                                    $('#libraryLocation').html(folder);
                                    var escapedPath = folder.toString().replace(/\\/g, "/");
                                    rewriteBooksPaths(currentPath, newPath);
                                } else {
                                    $('#serverErrorMessage').html(response.message);
                                    $('#serverErrorModal').modal('show');
                                    return;
                                }
                            });
                            window.api.updateLibraryLocation(folder, rows(0).id);
                        } 
                        else {
                            $('#serverErrorMessage').html(response.message);
                            $('#serverErrorModal').modal('show');
                            return;
                        }
                    });
                    window.api.selectLibraryLocation();
                } else if (rows == undefined || rows.length == 0) {
                    // If libraryLocation setting does not exist in the databse
                    $('#libraryLocationModal').attr('data-result', 'nosetting');
                    $('#libraryLocationModalClose').css('display', 'none');
                    $('#libraryLocationModal').modal('show');
                    
                } else {
                    // Get library Location stored in the DB, and see if it exists on the HDD. Send that result to the modal.
                    var escapedPath = rows[0].LibraryLocation.replace(/\\/g, "/");
                    window.api.onLibraryLocationExists((response) => {
                        window.api.libraryLocationExistsRemoveResponseHandler('LLEKEY');
                        if (response.error == false) {
                           result = response.data;
                           if (result == true) {
                                $('.loadingContainer').css('display', 'none');
                                $('#libraryLocation').html(rows[0].LibraryLocation);
                                resolve(escapedPath);
                            } 
                            else {
                                let currentPath = rows[0].LibraryLocation + '\\';
                                $('#libraryLocationModal').attr('data-result', result);
                                $('#libraryLocationModal').attr('data-settingsid', rows[0].id);
                                $('#libraryLocationModal').attr('data-currentpath', currentPath);
                                $('#libraryLocationModalClose').css('display', 'none');
                                $('#libraryLocationModal').modal('show');   
                            }  
                        }
                    });
                    window.api.libraryLocationExists(escapedPath);
                }
            } else {
                $('#serverErrorMessage').html(response.message);
                $('#serverErrorModal').modal('show');
                return;
            }
        });
        window.api.getLibraryLocation();
    });
}

function updateLibrary(firstRun, path) {
    if (path) {
        window.api.onGetBookFileList((response) => {
            window.api.getBookFileListRemoveResponseHandler('GBFLKEY');
            if (response.error == false) {
                window.libraryFiles = response.data;
                window.api.onGetBooks((response) => {
                    window.api.getBooksRemoveResponseHandler('GBKEY');
                    if (response.error == false) {
                        rows=response.data;
                        // Populate the books Grid
                        rows.forEach((row, index) => {
                            let jsonDataRow = [];
                            var count = 0;
                            for (const [key, value] of Object.entries(row)) {
                                switch (count) {
                                    case 0:
                                        jsonDataRow.push(value);
                                        // The onclick must be an escaped path. Character that must be escaped are \ " and '
                                        var escapedPath = row.Path.replace(/\\/g, "\\\\");
                                        escapedPath = escapedPath.replace(/"/g, '\\"');
                                        escapedPath = escapedPath.replace(/'/g, "\\'");
                                        if (window.libraryFiles.includes(row.Path)) {
                                            questionClass = 'resolveBookHide'
                                            readClass = 'readBookShow'
                                        } else {
                                            questionClass = 'resolveBookShow'
                                            readClass = 'readBookHide'
                                        }
                                        jsonDataRow.push('<td>' +
                                                    '<img class = "' + readClass + ' readBookIcon icon inline" src = "./img/icons/iconRead22.png" onclick = "readBook(\'' + escapedPath + '\', ' + row.id + ')"/>' +
                                                    '<a class = "' + questionClass + '" href="#resolveMissingBookModal" data-toggle="modal" data-bookid="' + row.id + '">' +
                                                    '<img id = "missingBook icon' + row.id + '"class = "missingBookIcon icon inline" src = "./img/icons/iconQuestion22.png"/>' +
                                                    '</a>' +
                                                    '</td>');
                                        break;
                                    case 4:
                                        jsonDataRow.push(value);
                                        // The onclick must be an escaped path. Character that must be escaped are \ " and '
                                        var escapedPath = row.Path.replace(/\\/g, "\\\\");
                                        escapedPath = escapedPath.replace(/"/g, '\\"');
                                        escapedPath = escapedPath.replace(/'/g, "\\'");
                                        jsonDataRow.push('<td><img class = "removeBookIcon icon" src = "./img/icons/iconRemove22.png" onclick = "removeBook(' + row.id + ')"/></td>');
                                            break;
                                        default:
                                        jsonDataRow.push(value); 
                                        break;
                                }
                                count++;
                            }
                            window.jsonData.push(jsonDataRow);
                        });
                        // Setup - add a text input to each footer cell
                        if (firstRun == true) {    
                            initBooksTable();
                            $('a[data-toggle="tab"]').on("shown.bs.tab", function (e) {
                                $($.fn.dataTable.tables(true)).DataTable().fixedHeader.adjust();
                            });
                    
                            $('#booksTable thead tr').clone(true).appendTo( '#booksTable thead' );
                            $('#booksTable thead tr:eq(1) th').each( function (i) {
                                if ( i <= 1 || i == 6) {
                                    $(this).replaceWith('<th></th>');
                                }
                    
                                var title = $(this).text();
                                $(this).replaceWith('<th><input type="text" id = "tableSortHeader' + i + '" placeholder="Search '+ title +'" /></th>');
                                let elem = '#tableSortHeader' + i;
                                $(elem).on('keyup change', function () {
                                    if (window.table.column(i).search() !== $(elem).val()) {
                                        window.table.column(i).search($(elem).val()).draw();
                                    }
                                });
                            });   
                        } 
                        else {
                            $('#booksTable').DataTable().ajax.reload(null, false);
                            $('a[data-toggle="tab"]').on("shown.bs.tab", function (e) {
                                $($.fn.dataTable.tables(true)).DataTable().fixedHeader.adjust();
                            });
                        
                        }
                    }
                    else {
                        $('#serverErrorMessage').html(response.message);
                        $('#serverErrorModal').modal('show');
                        return;
                    }
                });
                window.api.getBooks(path);   
            }
        });
        window.api.getBookFileList(path);    
    }
    window.jsonData = [];
}

function initBooksTable() {
    window.table = $('#booksTable').DataTable( {
        "fnServerData": function () {
            window.table.clear();
            window.table.rows.add(window.jsonData);
            window.table.draw(false); 
        },
        "columnDefs": [
            { className: "dataTableSmallText", "targets": [ 4, 5 ] },
            { className: "dataTableCenter", "targets": [ 1, 6 ] }
        ],
        data: window.jsonData,
        orderCellsTop: true,
        fixedHeader: {
            header: true,
            headerOffset: $('.nav').outerHeight()
        },
        columns: [{title: 'ID'}, {title: 'Read'}, {title: 'Title'}, {title: 'Author'}, {title: 'Path'}, {title: 'Filename'}, {title: ''}],
        responsive: true,
        searching: true,
        paging: true
    });
    $('#booksTable_filter').hide();
}

// Get a book in the form of an array buffer from main.js where file handling is done
function readBook(path, bookId) {
    window.openBookId = bookId;
    window.api.onReadEpubFromFile((response) => {
        if (response.error == false) {
            displayBook(response.data)
        } else {
            $('#serverErrorMessage').html(response.message);
            $('#serverErrorModal').modal('show');
         return;
        }
    });
    window.api.readEpubFromFile(path);
 
}

function removeBook(bookId) {
    window.api.removeBookRemoveResponseHandler('RBKEY');
    window.api.onRemoveBook((response) => {
        if (response.error == false) {
            updateLibrary(false);
        } else {
            $('#serverErrorMessage').html(response.message);
            $('#serverErrorModal').modal('show');
            return;
        }
    });
    window.api.removeBook(bookId);
    
}

// Displays the book in the "Read" tab
function displayBook(arrbuf) {
    $('#result').empty();

    // Destroy any previous book before openeing a new one
    if (window.book) {
        window.book.destroy();
    }

    // Convert the array buffer into a blob so it can be read by EPub
    const blob = new Blob([arrbuf], { type: 'application/epub+zip' });
    window.book = ePub(blob);
    var rendition = window.book.renderTo('result', { method: 'pagination', width: '100%', height: '100%' });
    window.rendition = rendition;
    rendition.themes.default({
        "body": { "padding-bottom": "50px !important" }
    })
    var displayed = rendition.display();

    $('#read-tab').trigger('click');
  
    $('#nextButton').on('click', () => {
        rendition.next().then(() => {
            recordReadPosition();
        });
        setTimeout(() => { setTimeoutFunction() }, 100);
    });

    $('#previousButton').on('click', () => {
        rendition.prev().then(() => {
            recordReadPosition()
        });
        setTimeout(() => { setTimeoutFunction() }, 100);
    });

    setTimeoutScroll(true, false);

    $('.navigationButton').hover(function() {
        $(this).fadeTo(0, 1);
    }, function() {
        $(this).fadeTo(0, 0);
    });

    $('.chaptersButton').show();
    $('.bookmarksButton').show();
    $('.chaptersHeaderContainer').show();
    $('.bookmarksHeaderContainer').show();
    if($('#bookmarks:hidden').length == 0) { 
        let right = $('#bookmarks').width() + 20;
        $('#nextButton').css('right', right);
    } 
    else {
        $('#nextButton').css('right', 0);
    }
    if($('#chapters:hidden').length == 0) { 
        $('#previousButton').css('left', $('#chapters').width());
    } 
    else {
        $('#previousButton').css('left', 0);
    }
        
    // Read the chapters
    $('#chaptersAutoGen').empty();
    window.book.ready.then(function(){
        window.book.loaded.navigation.then(function(toc){
            toc.forEach(function(chapter) {
                var chapterDiv = $('<div></div>');  
                var href = $('<div><a data-href =  "' + chapter.href + '" onclick = "' + `loadChapterFromTOC(this)` + '"href = #">' + chapter.label + '</a></div><hr>');
                $(chapterDiv).append(href);
                $('#chaptersAutoGen').append(chapterDiv);
            });
        });
    });

    // Display the bookmarks
    populateBookmarks();
    initThemes();
    addCustomCSS();
    sizeContentDiv();
    goToLastRead();
}

function setTimeoutScroll(firstTime, sepcifiedMS) {
    if (firstTime) {
        setTimeout(() => { setTimeoutFunction() }, 1000);
    }
    else {
        if (sepcifiedMS != false) {
        setTimeout(() => { setTimeoutFunction() }, sepcifiedMS);
        } else {
        setTimeout(() => { setTimeoutFunction() }, 10);
        }
    }
    
}

function setTimeoutFunction() {
  $('#result iframe').contents().find('html').one('wheel', (event) => {
    if(event.originalEvent.wheelDelta / 120 > 0) {
        window.rendition.prev().then(() => {  
          recordReadPosition();
          setTimeoutScroll(false, false);
        });
    }
    else{
        window.rendition.next().then(() => {
          recordReadPosition();
          setTimeoutScroll(false, false);
        });   
    }
  });
}

function loadChapterFromTOC(element) {
    let url = $("a:focus").attr('data-href');
    window.rendition.display(url);
    setTimeout(() => { setTimeoutFunction() }, 100);
}

function closeChapters() {
    window.currentCFI = window.rendition.currentLocation().start.cfi;
    $('#chapters').hide();
    window.chaptersOpen = false;
    if($('#bookmarks:hidden').length == 0) {
        $('#contents').width($('body').width() - $('#bookmarks').width() -20);
    } 
    else {
        $('#contents').width($('body').width()-20);
    }
    $("#previousButton").css("left", 0);
    window.rendition.resize();  
        setTimeout(() => { setTimeoutFunction() }, 100);
    }

function closeBookmarks() {
    window.currentCFI = window.rendition.currentLocation().start.cfi;
    $('#bookmarks').hide();
    window.bookmarksOpen = false;
    if($('#chapters:hidden').length == 0) {
        $('#contents').width($('body').width() - $('#chapters').width() -20);
    }
    else {
        $('#contents').width($('body').width() - 20);
    }
    $("#nextButton").css("right", 0);
    window.rendition.resize();  
    setTimeout(() => { setTimeoutFunction() }, 100);    
}

function chaptersButtonPressed() {
    if (window.chaptersOpen == true) {
        window.currentCFI = window.rendition.currentLocation().start.cfi;
        $('#chapters').hide();
        window.chaptersOpen = false;
        if ($('#bookmarks:hidden').length == 0) {
            $('#contents').width($('body').width() - $('#bookmarks').width() -20);
        } 
        else {
            $('#contents').width($('body').width());
        }
        window.rendition.resize();  
        $("#previousButton").css("left", 0);
        setTimeout(() => { setTimeoutFunction() }, 100);
    } 
    else {
        $('#chapters').show();
        window.chaptersOpen = true;
        if ($('#bookmarks:hidden').length == 0) {
            $('#contents').width($('body').width() - $('#chapters').width() - $('#bookmarks').width() -20);
        } 
        else {
            $('#contents').width($('body').width() - $('#chapters').width() -20);
        }
        window.rendition.resize();  
        $("#previousButton").css("left", $('#chapters').width());
        setTimeout(() => { setTimeoutFunction() }, 100);
        window.rendition.display(window.currentCFI);
    }
}

function bookmarksButtonPressed() {
    if (window.bookmarksOpen == true) {
        window.currentCFI = window.rendition.currentLocation().start.cfi;
        $('#bookmarks').hide();
        window.bookmarksOpen = false;
        if($('#chapters:hidden').length == 0) {
            $('#contents').width($('body').width() - $('#chapters').width() -20);
        } 
        else {
            $('#contents').width($('body').width() -20);
        }
        window.rendition.resize();  
        $("#nextButton").css("right", 0);
        setTimeout(() => { setTimeoutFunction() }, 100);
    }
     else {
        $('#bookmarks').show();
        window.bookmarksOpen = true;
        if($('#chapters:hidden').length == 0) {
            $('#contents').width($('body').width() - $('#chapters').width() - $('#bookmarks').width() -20);
        }
        else {
            $('#contents').width($('body').width() - $('#bookmarks').width() -20);
        }
        window.rendition.resize();  
        let right = $('#bookmarks').width() + 20;
        $("#nextButton").css("right", right);
        setTimeout(() => { setTimeoutFunction() }, 100);
        window.rendition.display(window.currentCFI);
    }
}

function addCustomCSS() {
    window.rendition.hooks.content.register(function(contents){
        var loaded = Promise.all([
            //contents.addScript("https://code.jquery.com/jquery-2.1.4.min.js"),
            contents.addStylesheet('./stylesheets/epub.css')
        ]);

        // return loaded promise
        return loaded;
    });
}

function sizeContentDiv() {
    if($('#bookmarks:hidden').length == 0 && $('#chapters:hidden').length == 0) {
        var contentsWidth = parseInt($('body').width() - $('#bookmarks').width() - $('#chapters').width() - 20);
        $('#contents').width(contentsWidth);
        $('#previousButton').css('left', $('#chapters').width());
        let right = $('#bookmarks').width() + 20;
        $('#nextButton').css('right', right);
    }      
    
    else if($('#bookmarks:hidden').length == 0) { 
        $('#contents').width($('body').width() - $('#bookmarks').width() - 20);
        let right = $('#bookmarks').width() + 20;
        $('#nextButton').css('right', right);
        $('#previousButton').css('left', 0);
    } 

    else if($('#chapters:hidden').length == 0) { 
        $('#contents').width($('body').width() - $('#chapters').width() - 20);
        $('#previousButton').css('left', $('#chapters').width());
        $('#nextButton').css('right', 20);
        
    }
    else {
        $('#contents').width($('body').width() - 20);
        $('#nextButton').css('right', 20);
        $('#previousButton').css('left', 0);
    }
}

function navigateToBookmark(position) {
    window.rendition.display(position);
    setTimeoutScroll(false, 200);  
}

function initResizeableElements() {
  
    interact('#bookmarks')
    .resizable({
        edges: {
            top   : false,       
            left  : true,  
            bottom: false,
            right : false,   
        },
        modifiers: [
            interact.modifiers.restrictSize({
                min: { width: 100, height: $('#bookmarks').height() },
                max: { width: 500, height: $('#bookmarks').height() },
            })
        ],
    }).on('resizemove', event => {

        let resizeContentsAmount = event.rect.width - parseFloat(event.target.style.width);
        
        let { x, y } = event.target. et;

        x = parseFloat(x) || 0;
        y = 0;
        
        resizeTimeInteract = new Date();
        if (resizeTimeoutInteract === false) {
            resizeTimeoutInteract = true;
            setTimeout(resizeend, resizeDeltaInteract);
        }

        function resizeend() {
            if (new Date() - resizeTimeInteract < resizeDeltaInteract) {
                setTimeout(resizeend, resizeDeltaInteract);
            } else {
                window.rendition.resize();
                resizeTimeoutInteract = false;
                setTimeoutScroll(true, false);  
            }               
        }

        $('#contents').width($('#contents').width() - resizeContentsAmount);

        Object.assign(event.target.style, {
            width: `${event.rect.width}px`,
            transform: `translateX(${event.deltaRect.left}px)`
        });

        Object.assign(event.target.dataset, { x, y });
        
        if ($('#bookmarks:hidden').length == 0) { 
            let right = $('#bookmarks').width() + 20;
        $('#nextButton').css('right', right);
        } 
        else {
            $('#nextButton').css('right', 0);
        }
        if ($('#chapters:hidden').length == 0) { 
            let chaptersWidth = $('#chapters').width();
            $('#previousButton').css('left', chaptersWidth);
        } 
        else {
            $('#previousButton').css('left', 0);
        }
    });
    
    interact('#chapters')
    .resizable({
        edges: {
            top   : false,       
            left  : false,  
            bottom: false,
            right : true,   
        },
        modifiers: [
            interact.modifiers.restrictSize({
                min: { width: 100, height: $('#chapters').height() },
                max: { width: 500, height: $('#chapters').height() },
            })
        ],
    }).on('resizemove', event => {

        let resizeContentsAmount = event.rect.width - parseFloat(event.target.style.width);
        
        let { x, y } = event.target.dataset;

        x = parseFloat(x) || 0;
        y = 0;
        
        resizeTimeInteract = new Date();
        if (resizeTimeoutInteract === false) {
        resizeTimeoutInteract = true;
            setTimeout(resizeend, resizeDeltaInteract);
        }

        function resizeend() {
            if (new Date() - resizeTimeInteract < resizeDeltaInteract) {
                setTimeout(resizeend, resizeDeltaInteract);
            } else {
                window.rendition.resize();
                resizeTimeoutInteract = false;
                setTimeoutScroll(true, false);  
            }               
        }

        $('#contents').width($('#contents').width() - resizeContentsAmount);

        Object.assign(event.target.style, {
            width: `${event.rect.width}px`,
            transform: `translateX(${event.deltaRect.left}px)`
        });

        Object.assign(event.target.dataset, { x, y });
        
        if ($('#bookmarks:hidden').length == 0) { 
            let right = $('#bookmarks').width() + 20;
            $('#nextButton').css('right', right);
        } 
        else {
            $('#nextButton').css('right', 0);
        }
        if ($('#chapters:hidden').length == 0) { 
            let chaptersWidth = $('#chapters').width();
            $('#previousButton').css('left', chaptersWidth);
        } 
        else {
            $('#previousButton').css('left', 0);
        }
    });
}

function initThemes() {
    window.rendition.themes.register({
        "dark" : "./stylesheets/themeDark.css",
        "light" : "./stylesheets/themeLight.css",
    });
    if (window.theme == 'light') {
        window.rendition.themes.select("light");
    }
    if (window.theme == 'dark') {
        window.rendition.themes.select("dark");
    }
  
}

function nightModeButtonPressed() {
    if (window.theme == 'light') {
        $('.lightMode').addClass('darkMode');
        $('.lightMode').removeClass('lightMode');
        if (window.rendition) {
            window.rendition.themes.select("dark");
        }
        window.theme = 'dark';
    }
    else if (window.theme == 'dark') {
        $('.darkMode').addClass('lightMode');
        $('.darkMode').removeClass('darkMode');
        if (window.rendition) {
            window.rendition.themes.select("light");
        }
        window.theme = 'light';
    }
}

function populateBookmarks() {
    window.api.onGetBookmarks((response) => {
        if (response.error == false) {
            $('#bookmarksList').empty();
            let rows = response.data;
            rows.forEach((row, index) => { 
                var elementId = 'bookmarkInput' + row.id;
                var title = '';
                if (row.UserTitle == null) {
                    title = row.Title;
                } else {
                    title = row.UserTitle;
                }
                var listItem = $('<li class="list-group-item bookmarksListItem lightMode" onclick= "navigateToBookmark(\'' + row.Position + '\')" data-bookmarkId = "' + row.id + '">' +
                                '<input readonly id = "' + elementId + '" value = "' + title + '"></input>' +
                                '<img id = "bookmarkDelete" class = "nightModeBMButton bookmarkButton icon" onclick = "deleteBookmark(' + row.id + ')" src = "./img/icons/iconDelete32.png" />' +
                                '<img id = "bookmarkEdit" class = "nightModeBMButton bookmarkButton icon" onclick = "editBookmark(' + row.id + ')" src = "./img/icons/iconEdit32.png" />' +
                                '</li>');
                $('#bookmarksList').append(listItem);
              });
        } else {
            $('#serverErrorMessage').html(response.message);
            $('#serverErrorModal').modal('show');
            return;
        }
    });
    window.api.getBookmarks(window.openBookId);
}

function addBookmark() {
    window.api.onAddBookmark((response) => {
        if (response.error == false) {
            populateBookmarks();
        } else {
            $('#serverErrorMessage').html(response.message);
            $('#serverErrorModal').modal('show');
            return;
        }
    });
    window.api.addBookmark(window.openBookId, window.rendition.currentLocation().start.cfi);
}

function deleteBookmark(id) {
    window.api.onDeleteBookmark((response) => {
        if (response.error == false) {
            populateBookmarks();
        } else {
            $('#serverErrorMessage').html(response.message);
            $('#serverErrorModal').modal('show');
            return;
        }
    });
    window.api.deleteBookmark(id);
}

function editBookmark(id) {
    let elementId = '#bookmarkInput' + id;
    let input = $(elementId);
    input.attr("readonly", false);
    input.css("pointer-events", 'auto'); 
    let inputLength = input.val().length;
    input.trigger('focus');
    input[0].setSelectionRange(0, inputLength);
    input.on('blur keyup', function(e) {
        if((e.type == 'keyup') && (e.keyCode == 10 || e.keyCode == 13)) {
            window.api.onUpdateBookmarkTitle((response) => {
                if (response.error == false) {
                    input.attr("readonly", true);
                    input.css("pointer-events", 'none');
                    populateBookmarks();    
                } else {
                    $('#serverErrorMessage').html(response.message);
                    $('#serverErrorModal').modal('show');
                    return;
                }
            });
            window.api.updateBookmarkTitle(input.val(), id);
        } else if (e.type == 'keyup' && e.keyCode == 27) {
            input.attr("readonly", true);
            input.css("pointer-events", 'none');
            populateBookmarks(); 
            input.trigger('blur');
        } else if (e.type == 'blur') {
            window.api.onUpdateBookmarkTitle((response) => {
                if (response.error == false) {
                    input.attr("readonly", true);
                    input.css("pointer-events", 'none');
                    populateBookmarks();        
                } else {
                    $('#serverErrorMessage').html(response.message);
                    $('#serverErrorModal').modal('show');
                    return;
                }
            });
            window.api.updateBookmarkTitle(input.val(), id);
        }  
    });
}

async function rewriteBooksPaths(currentPath, newPath) {
    try {
        rows = await getRows();
    }
    catch (err) {
        $('#serverErrorMessage').html(err);
        $('#serverErrorModal').modal('show');
        return;
    }  
    for (const row of rows) {
        let path = row.Path;
        path = path.replace(currentPath, newPath);
        try {
            await updateBooksPaths(path, row.id);
        } 
        catch (err) {
            $('#serverErrorMessage').html(err);
            $('#serverErrorModal').modal('show');
            return;
        }
    }
    $('.loadingContainer').css('display', 'none');
    updateLibrary(false, newPath);
}

function getRows() {
    return new Promise(function (resolve, reject) {
        window.api.onGetBooks((response) => {
            window.api.getBooksRemoveResponseHandler('GBKEY');
            if (response.error == false) {
                resolve(response.data);   
            } else {
                reject(response.messaage);
            }
        });
        window.api.getBooks();
    });
}

function updateBooksPaths(path, rowId) {
  return new Promise((resolve, reject) => {
    window.api.onUpdateBooksPaths((response) => {
        if (response.error == false) {
            resolve();   
        } else {
            reject(response.messaage);
        }
    });
    window.api.updateBooksPaths();
  
  });
}

function recordReadPosition() {
    window.api.onRecordReadPosition((response) => {
        if (response.error == true) {   
            $('#serverErrorMessage').html(response.message);
            $('#serverErrorModal').modal('show');
            return;
        }
    });
    window.api.recordReadPosition(window.openBookId, window.rendition.currentLocation().start.cfi);
}

function goToLastRead() {
    window.api.onGoToLastRead((response) => {
        if (response.error == true) {   
            $('#serverErrorMessage').html(response.message);
            $('#serverErrorModal').modal('show');
            return;
        }
        window.rendition.display(response.data);
    });
    window.api.goToLastRead(window.openBookId);
}