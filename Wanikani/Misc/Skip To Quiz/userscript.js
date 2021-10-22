// ==UserScript==
// @name         Wanikani: Skip to Quiz
// @namespace    http://tampermonkey.net/
// @version      1.1.1
// @description  Enables the quiz button without having to go through any of the lessons.
// @author       Kumirei
// @match        https://www.wanikani.com/lesson/session
// @match        https://preview.wanikani.com/lesson/session
// @grant        none
// ==/UserScript==
/*global $, wkof */
/*jshint esversion: 9 */

(function() {
  // Make quiz button look clickable
  add_css(
    '#lesson #batch-items ul li[data-index="quiz"] span {background-color: #004fdd; cursor: pointer !important;}',
    "skip-to-quiz-css"
  );

  // Enable clicking quiz button by adding class that the existing
  // click handler / keyup handler checks for before it fires
  onEachElementReady('li[data-index="quiz"]', null, function(e) {
    e = $(e);
    bindFirst(e, "click", function() {
      e.addClass("active-quiz");
    });
    bindFirst($("body"), "keyup", function(evt) {
      if (evt.key == "q") e.addClass("active-quiz");
    });
  });

  // Library Functions

  // Adds CSS to document
  // Does not escape its input
  function add_css(css, id = "") {
    document
      .getElementsByTagName("head")[0]
      .insertAdjacentHTML("beforeend", `<style id="${id}">${css}</style>`);
  }

  // Calls callback once on each element matching selector that is added
  // to the DOM, including existing elements at the time the function is first called.
  // options is options for the MutationObserver (optional, is merged with default options  {childList: true, subtree: true})
  function onEachElementReady(selector, options, callback) {
    if (!options) options = {};

    let els_found = new Set();
    function check_available() {
      for (const el of document.querySelectorAll(selector)) {
        if (!els_found.has(el)) {
          els_found.add(el);
          callback(el);
        }
      }
    }

    queueMicrotask(check_available);

    let mo = new MutationObserver(check_available);
    mo.observe(document.documentElement, {
      childList: true,
      subtree: true,
      ...options
    });
  }

  // Adds a jQuery event listener that runs before all ones added so far
  // Based on https://stackoverflow.com/questions/2360655/jquery-event-handlers-always-execute-in-order-they-were-bound-any-way-around-t
  // [name] is the name of the event "click", "mouseover", ..
  // same as you'd pass it to bind()
  // [fn] is the handler function
  let bindFirst = function(jqel, name, fn) {
    // bind as you normally would
    // don't want to miss out on any jQuery magic
    jqel.on(name, fn);

    // Thanks to a comment by @Martin, adding support for
    // namespaced events too.
    jqel.each(function() {
      var handlers = $._data(this, "events")[name.split(".")[0]];
      // take out the handler we just inserted from the end
      var handler = handlers.pop();
      // move it at the beginning
      handlers.splice(0, 0, handler);
    });
  };
})();
