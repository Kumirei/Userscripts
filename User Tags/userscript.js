// ==UserScript==
// @name         Wanikani Forums: User Tags
// @namespace    https://greasyfork.org/en/scripts/36581-wanikani-forums-user-tags
// @version      1.0.1
// @description  Makes it possible to tag users on the forums.
// @author       Kumirei
// @include      https://community.wanikani.com*
// @grant        none
// ==/UserScript==

;(function ($) {
    var userList = []
    setTriggers()

    // Make sure the script is always running
    function setTriggers() {
        // When loading a page
        window.addEventListener('load', initialiseScript)

        // When using the back and forward buttons
        window.addEventListener('popstate', initialiseScript)

        // When navigating the forums
        ;(function (history) {
            var pushState = history.pushState
            history.pushState = function (state) {
                if (typeof history.onpushstate == 'function') {
                    history.onpushstate({ state: state })
                }
                initialiseScript()
                return pushState.apply(history, arguments)
            }
        })(window.history)
    }

    // Adds info to the current page
    async function initialiseScript() {
        userList = getUserList()
        insertStyle()
        let observer = new MutationObserver(addTags);
        let postStream = await waitForSelector('.post-stream')
        observer.observe(postStream, {attributes: true, subtree: true});
        addTags()
    }

    // Waits for a selector query to yield results
    function waitForSelector(s) {
        let resolve, reject, promise = new Promise((res, rej)=>{resolve=res; reject=rej})
        let i = setInterval(()=>{
            let result = document.querySelector(s)
            if (!!result) {
                clearInterval(i)
                resolve(result)
            }
        }, 100)
        return promise
    }

    // Retrieves the list of users and their tags
    function getUserList() {
        userList = localStorage.getItem('WKFTags')
        if (!userList) {
            userList = {}
        } else {
            userList = $.parseJSON(userList)
        }
        return userList
    }

    // Adds the tags to the posts
    function addTags() {
        $('.topic-post > article:not(.tagged)').each(function (i) {
            $(this).addClass('tagged')
            var userID = $(this).attr('data-user-id')
            var postID = $(this).attr('data-post-id')
            const userTag = userList[userID] || ''
            $(this)
                .find('>> .topic-body:not(.embedded-posts) .names')
                .append(
                '<span class="user-tag">' +
                '    <input autocomplete="off" value="' +
                userTag +
                '"></input>' +
                '</span>',
            )
            let input = $(this).find('.user-tag input')
            input.on('keydown', (e) => saveTags(userID, postID, event.target))
        })
    }

    // Saves the tag to the user
    function saveTags(userID, postID, input) {
        setTimeout((_) => {
            // Give DOM time to update the input value
            let newTag = input.value
            updateTags(userID, postID, newTag)
            userList[userID] = newTag
            localStorage.setItem('WKFTags', JSON.stringify(userList))
        }, 10)
    }

    // Updates all other posts by the same user to the new tag
    function updateTags(userID, postID, tag) {
        $('article[data-user-id="' + userID + '"]').each(function () {
            if ($(this).attr('data-post-id') != postID) $(this).find('.user-tag input').val(tag)
        })
    }

    // Adds styling to the tags
    function insertStyle() {
        $('head').append(
            '<style class="user-tag">' +
            '    .user-tag {' +
            '        flex: 1;' +
            '        padding-right: 4px;' +
            '    }' +
            '' +
            '    .user-tag input {' +
            '        background: transparent;' +
            '        border: none;' +
            '        width: 100%;' +
            '    }' +
            '' +
            '    .user-tag input:focus {' +
            '        outline-offset: -1px;' +
            '        outline-style: dashed;' +
            '        outline-color: inherit;' +
            '    }' +
            '</style>',
        )
    }
})(window.jQuery)
