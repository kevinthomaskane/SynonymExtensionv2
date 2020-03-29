/**
 * @desc performs data fetch 
 * @param {string} word - either selected text or a 'clickable' word
 * @return {promise} - promise will resolve with results from query
 */
function fetchData (word) {
  return (
    new Promise (function (resolve, reject) {
      fetch('https://www.synonym.com/autocomplete?term=' + word + '&format=json')
        .then(function (response) {
          return response.json();
        })
        .then(function (results) {
          if (results.documents.length > 0) {
            resolve(results.documents)
          } else {
            resolve([])
          }
        })
        .catch(function (e) {
          resolve([])
        })
    })
  )
}

/**
 * @desc initiates data fetch and sends results to content.js
 * @param {string} word - either selected text or a 'clickable'
 * @param {bool} fromContextMenu - indicates whether word is a 'clickable' or not
 */
function handleMessageTransmit (word, fromContextMenu) {
  var results = fetchData(word)

  results.then(function (data) {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {results: data, fromContextMenu: fromContextMenu})
    })
  })
}

// add synonym to context menu
chrome.contextMenus.create({
  id: "synonym-context-item",
  title: "synonym",
  contexts: ["selection"]
});

// add listener to context menu click
chrome.contextMenus.onClicked.addListener(function (info) {
  handleMessageTransmit(info.selectionText, true /* fromContextMenu */)
})

// listener for message that comes in when user clicks a 'clickable'
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.word) {
    handleMessageTransmit(request.word, false /* fromContextMenu */)
  }
})
