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
      } else {
        resizeTimeout = false;
        setTimeoutScroll(true, false); 
        sizeContentDiv();
        if (window.rendition) {
          window.rendition.resize(); 
        }
      }               
  }
  
  

};

$(document).ready(function() {

  const sqlite3 = require('sqlite3')

  window._ = require( 'lodash' );
  const EPub = window._ = require( 'EPub' );
  window.Popper = require('popper.js').default;
  window.chaptersOpen = true;
  window.bookmarksOpen = true;
  window.theme = 'light';
  window.EPub = EPub;
  window.fs = require('fs');

  // pdfMake
  var pdfMake = require('pdfmake/build/pdfmake.js');
  var pdfFonts = require('pdfmake/build/vfs_fonts.js');
  pdfMake.vfs = pdfFonts.pdfMake.vfs;

  $(window).on("resize", resize);

  let database;
  initDatabase(sqlite3).then((db) => {
    database = db;
    window.db = db;
    configureDatabseTables(db);
    updateLibraryLocation(false).then((path) => {
      updateLibrary(true, path);
    });
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
    
    $('#resolveMissingBookModal .btn-danger').click(function() {
      removeBook('', bookId);
      $('#resolveMissingBookModal').modal('hide');
    });

    $('#resolveMissingBookModal .btn-primary').click(function() {
      $('#resolveMissingBookFileSelect').trigger('click');
    });

    $('#resolveMissingBookFileSelect').change(function (){
      resolveMissingBook(db, bookId);
      $('#resolveMissingBookModal').modal('hide');     
    });
    
  });

});

function resolveMissingBook(db, bookId) {
  let files = $('#resolveMissingBookFileSelect').prop('files');
  let path = files[0].path;
  let filename = files[0].name;
  let query = 'UPDATE Books SET Path = "' + path + '", Filename = "' + filename+ '" WHERE id = ' + bookId + ''
      db.run(query, function(err) {
        if (err) {
          console.log(err);
          return;
        } 
        updateLibrary(false);
      });
}

function addBooks() {
  let libraryPathQuery = new Promise((resolve, reject) => {
    var responseObj;
    let query = 'SELECT LibraryLocation FROM Settings';
    window.db.all(query, [], function cb(err, rows) {
      if (err) {
        responseObj = {
          'error': err
        };
        reject(responseObj);
      } else {
        resolve(rows[0].LibraryLocation);
      }
    });
  });

  libraryPathQuery.then((libraryPath) => {
    let fileList = ipcRenderer.sendSync('addBooksToLibrary', libraryPath);
    if (fileList.length == 0) {
      return;
    }
    for (let flx = 0; flx < fileList.length; flx++) {
      if (!fileList[flx].includes(libraryPath)) {
        $('#addBooksMustBeInLibraryFolder').show();
        setTimeout(function(){
          $('#addBooksMustBeInLibraryFolder').hide();
        },5000);
        return;
      }
    }
    let numFiles = fileList.length;
    let count = 0;
    
    // Create a query to check for existing book paths
    let pathListQuery = new Promise((resolve, reject) => {
      var responseObj;
      let query = 'SELECT Path FROM Books';
      window.db.all(query, [], function cb(err, rows) {
        if (err) {
          responseObj = {
            'error': err
          };
          reject(responseObj);
        } else {
          let pathList = [];
          rows.forEach((row, index) => {
            pathList.push(row.Path);
          });
          resolve(pathList);
        }
      });
    });
    // Get the path list result, then continue
    pathListQuery.then((pathListQuery) => {
      $('.progress-bar').css('width', '0%');
      window.addBooksCancel = false;

      // Set up the cancel onclick
      $('#addBooksCancel').click( ()=> {
          window.addBooksCancel = true;
      })

      // Show the progress bar, blocking interaction with the rest of the web page
      $('.progressContainer').show();

      // Start adding the books one by one to the database
      addBooktoDB(numFiles, count, fileList, pathListQuery, 0)
    });
  });
}      

 async function initDatabase(sqlite3){
    const dbPromise = new sqlite3.Database('./db/eserverdb.db', { Promise });
    return await dbPromise
}

function addBooktoDB(numFiles, count, fileList, pathList, booksAdded) {
  $('.alert').hide();
  $('.progress-bar').css('width', (count / numFiles * 100) + '%');
  if (count > 0) {
    $('.progress-bar').css('width', (count / numFiles * 100) + '%');
  }
  if (numFiles == count) {
      if (booksAdded == 0) {
        $('#allBooksAddedDuplicates').show();
        setTimeout(function(){
          $('#allBooksAddedDuplicates').hide();
        },5000);
      } else if (numFiles > booksAdded) {
        $('#someBooksAddedDuplicates').show();
        setTimeout(function(){
          $('#someBooksAddedDuplicates').hide();
        },5000);
      }
      updateLibrary(false);
      window.addBooksCancel = false;
      $('.progressContainer').hide();
    return;
  }
  
  let epubFile = fileList[count];
  // Check if file path already exists in the Database. If it does, skip this book.
  if (pathList.length === 0) {
    if (numFiles > count && window.addBooksCancel == false) {
      addBookToDBExecute(numFiles, count, fileList, pathList, epubFile, ++booksAdded)
    } else {
      // If finished, update the library Grid, and reset cancel back to false so it can be used again.
      updateLibrary(false);
      window.addBooksCancel = false;
      $('.progressContainer').hide();
    }
  } else if (pathList.includes(epubFile)) {
    if (numFiles > count && window.addBooksCancel == false) {
      addBooktoDB(numFiles, ++count, db, fileList, pathList, EPub, booksAdded);
    } else {
      // If finished, update the library Grid, and reset cancel back to false so it can be used again.
      updateLibrary(false);
      window.addBooksCancel = false;
      $('.progressContainer').hide();
    }
    return;
  } else {
    addBookToDBExecute(numFiles, count, fileList, pathList, epubFile, ++booksAdded)
  }

}



function addBookToDBExecute(numFiles, count, fileList, pathList, epubFile, booksAdded) {
  var filename = epubFile.split('\\').pop().split('/').pop();
  let epub = new window.EPub(epubFile);
  // Insert the book into the database, and recursively call the function again, so all books are inserted one by one into the Database.
  epub.on("end", function(){
    let query = 'INSERT INTO Books (Title, Author, Path, Filename) VALUES ("' + epub.metadata.title + '","' + epub.metadata.creator + '","' + epubFile + '", "' + filename + '");'
    window.db.run(query, function(err) {
      if (err) {
        console.log(err);
        return;
      }
      // Keep going until all books are added, unless the cancel button has been pressed. Cancel will cancel the add totally before adding the next book.
      addBooktoDB(numFiles, ++count, fileList, pathList, booksAdded);
      epub.getChapter("chapter_id", function(err, text){});
    });
  });
  // The epub.on command will not run until epub is parsed.
  epub.parse();
}

function updateLibrary(firstRun, path) {
  if (path) {
    window.libraryFiles = ipcRenderer.sendSync('getBookFileList', path);
  }
  window.jsonData = [];
     
  // Query all the books in the database
  let query = 'SELECT * FROM Books';
  window.db.all(query, [], (err, rows) => {
    if (err) {
      throw err;
    }

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
            jsonDataRow.push('<td><img class = "removeBookIcon icon" src = "./img/icons/iconRemove22.png" onclick = "removeBook(\'' + escapedPath + '\', ' + row.id + ')"/></td>');
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
      
    } else {
      $('#booksTable').DataTable().ajax.reload(null, false);
      $('a[data-toggle="tab"]').on("shown.bs.tab", function (e) {
        $($.fn.dataTable.tables(true)).DataTable().fixedHeader.adjust();
      });
  
    }
  });
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
    columns: 
      [{title: 'ID'}, {title: 'Read'}, {title: 'Title'}, {title: 'Author'}, {title: 'Path'}, {title: 'Filename'}, {title: ''}],
    responsive: true,
    searching: true,
    paging: true
  });
  $('#booksTable_filter').hide();
}

// Get a book in the form of an array buffer from main.js where file handling is done
function readBook(bookPath, bookId) {
  window.openBookId = bookId;
  let arrbuf = ipcRenderer.sendSync('readEpubFromFile', bookPath);
  displayBook(arrbuf)
}

function removeBook(bookPath, bookId) {
  let query1 = 'DELETE FROM Books WHERE id = ' + bookId;
  let query2 = 'DELETE FROM Bookmarks WHERE BookId = ' + bookId;
  db.run(query1, [], function(err) {
    if (err) {
      console.log('Error: ' + err);
    } else {
      db.run(query2, [], function(err) {
        if (err) {
          console.log('Error: ' + err);
        } else {
          updateLibrary(false)
        }
      });
    }
  });
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
  
  $('#nextButton').click(() => {
    rendition.next().then(() => {
      recordReadPosition();
    });
    setTimeout(() => { setTimeoutFunction() }, 100);
  });

  $('#previousButton').click(() => {
    rendition.prev().then(() => {
      recordReadPosition()
    });
    setTimeout(() => { setTimeoutFunction() }, 100);
  });

  setTimeoutScroll(true, false);

  $('.navigationButton').hover(function() {
    $(this).fadeTo(0, 1);
  },function() {
    $(this).fadeTo(0, 0);
  });

  $('.chaptersButton').show();
  $('.bookmarksButton').show();
  $('.chaptersHeaderContainer').show();
  $('.bookmarksHeaderContainer').show();
  if($('#bookmarks:hidden').length == 0) { 
    let right = $('#bookmarks').width() + 20;
    $('#nextButton').css('right', right);
  } else {
    $('#nextButton').css('right', 0);
  }
  if($('#chapters:hidden').length == 0) { 
    $('#previousButton').css('left', $('#chapters').width());
  } else {
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
  } else {
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
  } else {
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
    } else {
      $('#contents').width($('body').width());
    }
    window.rendition.resize();  
    $("#previousButton").css("left", 0);
    setTimeout(() => { setTimeoutFunction() }, 100);
  } else {
    $('#chapters').show();
    window.chaptersOpen = true;
    if ($('#bookmarks:hidden').length == 0) {
      $('#contents').width($('body').width() - $('#chapters').width() - $('#bookmarks').width() -20);
    } else {
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
    } else {
      $('#contents').width($('body').width() -20);
    }
    window.rendition.resize();  
    $("#nextButton").css("right", 0);
    setTimeout(() => { setTimeoutFunction() }, 100);
  } else {
    $('#bookmarks').show();
    window.bookmarksOpen = true;
    if($('#chapters:hidden').length == 0) {
      $('#contents').width($('body').width() - $('#chapters').width() - $('#bookmarks').width() -20);
    } else {
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

function addBookmark() {
  let query = 'SELECT * FROM Bookmarks WHERE BookId = ' + window.openBookId + '';
  window.db.all(query, [], (err, rows) => {
    if (err) {
      throw err;
    } else {
      var bookmarkNumber = rows.length + 1;
      db.run('INSERT INTO Bookmarks (BookId, Title, Position) VALUES ("' + window.openBookId + '","Bookmark #' + bookmarkNumber + '","' + window.rendition.currentLocation().start.cfi + '");', function(err) {
        if (err) {
          console.log(err);
          return;
        } else {
          populateBookmarks()
        }
        
      });
      
    }
  });
}

function populateBookmarks() {
  $('#bookmarksList').empty();
  let query = 'SELECT * FROM Bookmarks WHERE BookId = ' + window.openBookId + '';
  window.db.all(query, [], (err, rows) => {
    if (err) {
      throw err;
    } else {
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
      
    }
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
    
    if($('#bookmarks:hidden').length == 0) { 
      let right = $('#bookmarks').width() + 20;
      $('#nextButton').css('right', right);
    } else {
      $('#nextButton').css('right', 0);
    }
    if($('#chapters:hidden').length == 0) { 
      let chaptersWidth = $('#chapters').width();
      $('#previousButton').css('left', chaptersWidth);
    } else {
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
    
    if($('#bookmarks:hidden').length == 0) { 
      let right = $('#bookmarks').width() + 20;
      $('#nextButton').css('right', right);
    } else {
      $('#nextButton').css('right', 0);
    }
    if($('#chapters:hidden').length == 0) { 
      let chaptersWidth = $('#chapters').width();
      $('#previousButton').css('left', chaptersWidth);
    } else {
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

function deleteBookmark(id) {
  let query = 'DELETE FROM Bookmarks WHERE id = ' + id + '';
  db.run(query, [], function(err) {
    if (err) {
      console.log('Error: ' + err);
    } else {
      populateBookmarks();
    }
  });
}

function editBookmark(id) {
  let elementId = '#bookmarkInput' + id;
  let input = $(elementId);
  input.attr("readonly", false);
  input.css("pointer-events", 'auto'); 
  let inputLength = input.val().length;
  input.focus();
  input[0].setSelectionRange(0, inputLength);
  input.bind('blur keyup', function(e) {
    if((e.type == 'keyup') && (e.keyCode == 10 || e.keyCode == 13)) {
      let query = 'UPDATE Bookmarks SET UserTitle = "' + input.val() + '" WHERE id = ' + id + ''
      db.run(query, function(err) {
        if (err) {
          console.log(err);
          return;
        } 
        input.attr("readonly", true);
        input.css("pointer-events", 'none');
        populateBookmarks();        
      });
    } else if (e.type == 'keyup' && e.keyCode == 27) {
      input.attr("readonly", true);
      input.css("pointer-events", 'none');
      populateBookmarks(); 
      input.blur();
    } else if (e.type == 'blur') {
      let query = 'UPDATE Bookmarks SET UserTitle = "' + input.val() + '" WHERE id = ' + id + ''
      db.run(query, function(err) {
        if (err) {
          console.log(err);
          return;
        } 
        input.attr("readonly", true);
        input.css("pointer-events", 'none');
        populateBookmarks();        
      });
    }
  });
}

async function updateLibraryLocation(manualEdit) {
  return new Promise((resolve, reject) => {
    $('.loadingContainer').css('display', 'flex');
    $('#libraryLocationModal').on('show.bs.modal', function (event) {
      $('#libraryLocationModal .btn-primary').click(function() {
        let folder = ipcRenderer.sendSync('selectLibraryLocation');
        if (folder.length == 0) {
          return;
        }
        var escapedPath = folder.toString().replace(/\\/g, "/");
        // If no folder selected
        let currentPath = $('#libraryLocationModal').attr('data-currentpath');
        let newPath = folder + '\\';
        var escapedPath = folder.toString().replace(/\\/g, "/");
        //update the list of books in the library from the slelected folder
        window.libraryFiles = ipcRenderer.sendSync('getBookFileList', escapedPath);
        var dataResult = $('#libraryLocationModal').attr('data-result');
        // If there is no setting for a libraryLocation yet, insert it into the Database, set the setting value on the settings page, the calling method will update the library 
        // Resolve with the escaped path of the new library location
        if (dataResult == 'nosetting') {
          let query2 = 'INSERT INTO Settings (LibraryLocation) VALUES ("' + folder + '");'
          db.run(query2, [], function(err) {
            if (err) {
              console.log('Error inserting LibraryLocation to Settings table:' + err)
              reject();
              return;
            }
            $('.loadingContainer').css('display', 'none');
            $('#libraryLocation').html(escapedPath);
          });
        }  
        // If libraryLocation doesn't exist on the HDD, update the DB with the new setting, re-write the book paths with the new location
        // resolve with the escaped path of the new library location
        else {
          let settingsId = $('#libraryLocationModal').attr('data-settingsid');
          let query3 = 'UPDATE Settings SET LibraryLocation = "' + folder + '" WHERE id = ' + parseInt(settingsId) + ''
          db.run(query3, function(err) {
            if (err) {
              console.log('Error updating LastRead position:' + err);
              return;
            } 
            $('#libraryLocation').html(folder);
            rewriteBooksPaths(currentPath, newPath);
          });
        // If libraryLocation does exist on the HDD, just update the setting on the Settings page
        }

        resolve(escapedPath);
        $('#libraryLocationModal').modal('hide');
      });
    });

    
    let query1 = 'SELECT id, LibraryLocation FROM Settings';
    window.db.all(query1, [], function cb(err, rows) {
      // If performing a manual edit through the settings page
      if (manualEdit == true) {
        let currentPath = rows[0].LibraryLocation + '\\';
        let folder = ipcRenderer.sendSync('selectLibraryLocation');
        if (folder.length == 0){
          $('.loadingContainer').css('display', 'none');
          return;
        }
        let newPath = folder + '\\';
        let query2 = 'UPDATE Settings SET LibraryLocation = "' + folder + '" WHERE id = ' + rows[0].id + ''
        db.run(query2, [], function(err) {
          if (err) {
            console.log('Error inserting LibraryLocation to Settings table:' + err)
            reject();
            return;
          }
          $('#libraryLocation').html(folder);
          var escapedPath = folder.toString().replace(/\\/g, "/");
          rewriteBooksPaths(currentPath, newPath);
         
        });
        // If libraryLocation setting does not exist in the databse
      } else if (rows == undefined || rows.length == 0) {
        $('#libraryLocationModal').attr('data-result', 'nosetting');
        $('#libraryLocationModalClose').css('display', 'none');
        $('#libraryLocationModal').modal('show');
        
      } else {    
        // Get library Location stored in the DB, and see if it exists on the HDD. Send that result to the modal.
        var escapedPath = rows[0].LibraryLocation.replace(/\\/g, "/");
        let result = ipcRenderer.sendSync('libraryLocationExists', escapedPath);  
        if (result == true) {
          $('.loadingContainer').css('display', 'none');
          $('#libraryLocation').html(rows[0].LibraryLocation);
          resolve(escapedPath);
        } else {
          let currentPath = rows[0].LibraryLocation + '\\';
          $('#libraryLocationModal').attr('data-result', result);
          $('#libraryLocationModal').attr('data-settingsid', rows[0].id);
          $('#libraryLocationModal').attr('data-currentpath', currentPath);
          $('#libraryLocationModalClose').css('display', 'none');
          $('#libraryLocationModal').modal('show');   
        }  
      }
    });
  });
}

async function rewriteBooksPaths(currentPath, newPath) {
  rows = await getRows();  
  for (const row of rows) {
    let path = row.Path;
    path = path.replace(currentPath, newPath);
    await updateBooksPaths(path, row.id);
  }
  $('.loadingContainer').css('display', 'none');
  updateLibrary(false, newPath);
}

function getRows() {
  return new Promise((resolve, reject) => {
    let query1 = 'Select * FROM Books';
    db.all(query1, [], function cb(err, rows) {
      if (err) {
        console.log('Error updating Path in Books ' + err)
        reject();
      }  
      resolve(rows);
    })
  });
}

function updateBooksPaths(path, rowId) {
  return new Promise((resolve, reject) => {
    let query2 = 'UPDATE Books SET Path = "' + path + '" WHERE id = ' + rowId + '';
    db.all(query2, [], function(err) {
      if (err) {
        console.log('Error updating Path in Books ' + err)
        reject();
      }
      resolve();
    });
  
  });
}

function configureDatabseTables(db) {
  
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
}

function recordReadPosition() {
  let query1 = 'SELECT * FROM LastRead';
  let query2 = 'INSERT INTO LastRead (BookId, Position) VALUES ("' + window.openBookId + '", "' + window.rendition.currentLocation().start.cfi + '");'

  db.all(query1, [], function cb(err, rows) {
    var matchedRow = false;
    rows.forEach((row, index) => {
      if (row.BookId == window.openBookId) {
        matchedRow = row;
      }
    });
    if (matchedRow == false) {
      db.run(query2, [], function(err) {
        if (err) {
          console.log('Error inserting LastRead position:' + err)
        }
      });
    } else {
      let query3 = 'UPDATE LastRead SET Position = "' + window.rendition.currentLocation().start.cfi + '" WHERE id = ' + matchedRow.id + ''
      db.run(query3, function(err) {
        if (err) {
          console.log('Error updating LastRead position:' + err);
        } 
      });
    }
  });
}

function goToLastRead() {
  let query = 'SELECT * FROM LastRead';
  db.all(query, [], function cb(err, rows) {
    var matchedRow = false;
    rows.forEach((row, index) => {
      if (row.BookId == window.openBookId) {
        matchedRow = row;
      }
    });
    if (matchedRow != false) {
      window.rendition.display(matchedRow.Position);
    } 
  });
}