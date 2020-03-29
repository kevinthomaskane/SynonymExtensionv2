;(function () {
  
  function App () {
    this.results = [];
    this.error = '';
    this.popupTarget = null;
    this.resultsList = null;
    this.synonymLinks = null;

    /**
     * @desc set up message handler for receiving data from background.js ... fetch for synonyms is handled in background.js and results appear on request object in callback.  if request.fromContextMenu is true, it means that the data isn't coming from a 'clickable' request, so popupTarget will have to be created and inserted
     */
    this.handleMessages = function () {
      var _this = this;

      chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
        if (request.results.length > 0) {
          _this.results = request.results;
          _this.error = '';
        } else {
          _this.error = 'Sorry, no results were found';
          _this.results = [];
        }

        if (request.fromContextMenu) {
          _this.insertPopupTargetNode();
        }

        _this.buildPopupHTML();

        // close connection to background script
        sendResponse('received');
      });
    }

    /**
     * @desc gets position of selection and inserts a div immediately after selected word.  this acts as a target for placement of popup
     */
    this.insertPopupTargetNode = function () {
      var s = window.getSelection();

      // get height of selected element for displaying popup at correct position
      var height = getComputedStyle(s.focusNode.parentElement).fontSize;

      // get selected text on page location within its current node
      var range = s.getRangeAt(0);
      var newRange = document.createRange();
      newRange.setStart(s.focusNode, range.endOffset);

      // create div element to append after selection range (will appear inline immediately after selection)
      var div = document.createElement('div');
      div.id = 'syn-ext-target';
      div.style.height = height;
      newRange.insertNode(div);

      this.popupTarget = div;
    }

    /**
     * @desc after popupTarget gets added to page, set its innerHTML and trigger results build. Clears popupTarget html on subsequent requests 
     */
    this.buildPopupHTML = function () {
      this.popupTarget.innerHTML = '\
        <div class="syn-ext">\
          <h1 class="syn-ext-logo syn-ext-site-link">synonym.com</h1>\
          <div class="syn-ext-wrapper">\
            <div class="syn-ext-results-wrapper">\
              <ol class="syn-ext-results-list"></ol>\
            </div>\
            <div class="syn-ext-footer">\
              powered by <a href="#" aria-label="synonym.com" class="syn-ext-site-link">synonym.com</a>\
            </div>\
          </div>\
        </div>\
      '

      this.resultsList = document.querySelector('.syn-ext-results-list');
      this.synonymLinks = document.querySelectorAll('.syn-ext-site-link');

      this.handleResults();

      // add clickliseners to header and footer links
      this.handleSiteNavigation();
    }

    /**
     * @desc if error then displays error, otherwise loops through results array and sets html output string for each result. adds click listeners to syns/ants of each result.
     */
    this.handleResults = function () {
      if (this.error) {
        this.resultsList.innerHTML = '<li class="syn-ext-error">' + this.error + '</li>';
        return
      }

      var _this = this;
      var str = '';

      this.results.forEach(function(result, i) {
        str += _this.buildResultsHTML(result.root, result.pos, result.definition, result.synonyms, result.antonyms, i + 1);
      })

      this.resultsList.innerHTML = str;

      this.handleClickables();

      // add listener to body for popup to close
      this.handleClickAway();
    }

    /**
     * @desc constructs an html string to be appended to results container for each result
     * @param {string} root - the actual word
     * @param {string} pos - part of speech
     * @param {string} definition - the definition
     * @param {array} synonyms - synonyms of result
     * @param {array} antonyms - antonyms of result
     * @param {number} num - the index of the result within results array, used for creating numerical list. global namespace css issues occur when relying on default ol styling.
     * @return {string} - html string of result
     */
    this.buildResultsHTML = function (root, pos, definition, synonyms, antonyms, num) {
      var li = '\
        <li class="syn-ext-result">\
          <h1 class="syn-ext-result-title">' + num + '. ' + root.trim() + '</h1>\
          <p class="syn-ext-result-definition">\
            <span class="part-of-speech">' + this.returnPartOfSpeech(pos) + '. </span>' + definition.trim() + '\
          </p>\
          <div class="syn-ext-result-section synonyms">\
            <p class="syn-ext-result-section-title">Synonyms</p>\
            <div class="syn-ext-clickables-wrapper">' + this.buildClickablesList(synonyms) + '</div>\
          </div>\
          <div class="syn-ext-result-section antonyms">\
            <p class="syn-ext-result-section-title">Antonyms</p>\
            <div class="syn-ext-clickables-wrapper">' + this.buildClickablesList(antonyms) + '</div>\
          </div>\
        </li>';

      return li
    }

    /**
     * @desc builds html string of synonyms for a given result
     * @param {array} list - list of syns/ants for given word
     * @return {string} - html string of syns/ants
     */
    this.buildClickablesList = function (list) {
      if (list.length > 0) {
        var str = '';

        list.forEach(function(element) {
          var node = '<span data-word="' + element.trim() +'" class="syn-ext-clickable">' + element.trim() + '</span>';
          str += node;
        })

        return str
      }
    }

    /**
     * @desc takes in pos letter and returns the part of speech as a full word
     * @param {string} pos - part of speech for given result, comes in as singular letter representation
     * @return {string} - part of speech for given result
     */
    this.returnPartOfSpeech = function (pos) {
      if (pos === 'a' || pos === 's') {
        return 'adjective'
      } else if (pos === 'r') {
        return 'adverb'
      } else if (pos ==='n') {
        return 'noun'
      } else if (pos === 'v') {
        return 'verb'
      }
    }

    /**
     * @desc attaches click listeners to syns/ants of each result. sends message to background.js for API call.  Once background.js fetches data, it sends data back to chrome.runtime.onMessage handler in this.init()
     */
    this.handleClickables = function () {
      var clickables = Array.from(this.resultsList.querySelectorAll('.syn-ext-clickable'));

      clickables.forEach(function (clickable) {
        clickable.addEventListener('click', function (e) {
          e.stopPropagation();
          chrome.runtime.sendMessage({word: clickable.getAttribute('data-word')});
        })
      })
    }

    /**
     * @desc close popup when user clicks outside and remove it from DOM
     */
    this.handleClickAway = function () {
      var _this = this;

      document.body.addEventListener('click', function (e) {
        if (!_this.popupTarget.contains(e.target)) {
          _this.popupTarget.remove();
        }
      })
    }

    /**
     * @desc handle navigation to synonym.com from footer/header links
     */
    this.handleSiteNavigation = function () {
      var links = Array.from(this.synonymLinks);

      links.forEach(function(link) {
        link.addEventListener('click', function () {
          window.open('https://www.synonym.com');
        })
      })
    }


    /**
     * @desc initialize app by listening to messages from background.js
     */
    this.init = function () {
      this.handleMessages();
    }
  }

  var s = new App();
  s.init();

})();
