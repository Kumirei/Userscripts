(function() {
    // Add a custom event for when BP creates a new body
    var newBody = new Event('new-body');
    waitForKeyElements('body > header', function(e) {fireEvent(newBody);});

    // Add a custom event for when you get a new item in reviews
    var newReviewItem = new Event('new-review-item');
    waitForKeyElements('.level_lesson_info a', function(e) {fireEvent(newReviewItem);});

    // Add a custom event when you go to study or cram page
    var quizPage = new Event('quiz-page');
    waitForKeyElements('#show-grammar', function(e) {fireEvent(quizPage);});

    // Add a custom event when you go to study page
    var studyPage = new Event('study-page');
    waitForKeyElements('#study-page #show-grammar', function(e) {fireEvent(studyPage);});

    // Add a custom event when you go to cram page
    var cramPage = new Event('cram-page');
    waitForKeyElements('#cram-page #show-grammar', function(e) {fireEvent(cramPage);});

    // Fires the given event on the HTML element
    function fireEvent(event) {
        var retryInterval = setInterval(function(){
            if (document.readyState == "complete") {
                $('HTML')[0].dispatchEvent(event);
                clearInterval(retryInterval);
            }
        }, 100);
    }
})();
