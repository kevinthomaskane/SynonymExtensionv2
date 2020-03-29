;(function () {
  
  function App () {
    this.currentWord = '';
    this.results = [];
    this.error = '';
    this.inputElement = document.querySelector('.syn-ext-search');
    this.resultsList = document.querySelector('.syn-ext-results-list');
    this.synonymLinks = document.querySelectorAll('.syn-ext-site-link');

    /**
     * @desc updates current word from user-input in html input field. initiates submit handler
     */
    this.handleInput = function () {
      var _this = this;

      this.inputElement.addEventListener('keyup', function (e) {
        if (e.key === 'Enter') {
          _this.error = '';
          _this.handleInputSubmit();
          return
        }
        _this.currentWord = e.target.value;
      })
    }

    /**
     * @desc makes request to API from user input submit, then initiates results handling
     */
    this.handleInputSubmit = function () {
      var _this = this;

      fetch('https://www.synonym.com/autocomplete?term=' + this.currentWord + '&format=json')
        .then(function (response) {
          return response.json();
        })
        .then(function (results) {
          if (results.documents.length > 0) {
            _this.results = results.documents;
          } else {
            _this.error = 'Sorry, no results were found.';
          }
          _this.handleResults();
        })
        .catch(function (e) {
          _this.error = 'Sorry, no results were found.';
          _this.handleResults();
        })
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
     * @desc attaches click listeners to syns/ants of each result
     */
    this.handleClickables = function () {
      var _this = this;
      var clickables = Array.from(this.resultsList.querySelectorAll('.syn-ext-clickable'));

      clickables.forEach(function (clickable) {
        clickable.addEventListener('click', function () {
          _this.currentWord = clickable.getAttribute('data-word');
          _this.inputElement.value = _this.currentWord;
          _this.handleInputSubmit();
          window.scrollTo(0,0)
        })
      })
    }


    /**
     * @desc handle navigation to synonym.com from footer/header links
     */
    this.handleSiteNavigation = function () {
      var links = Array.from(this.synonymLinks);
      links.forEach(function(link) {
        link.addEventListener('click', function () {
          chrome.tabs.create({ active: true, url: 'https://www.synonym.com' });
        })
      })
    }

    /**
     * @desc initialize app by adding listener to input
     */
    this.init = function () {
      this.handleInput();
      this.handleSiteNavigation();
    }
  }

  var s = new App();
  s.init();

})();
