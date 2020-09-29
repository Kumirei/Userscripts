// ==UserScript==
// @name         Wanikani Forums: User Tags
// @namespace    https://greasyfork.org/en/scripts/36581-wanikani-forums-user-tags
// @version      0.4.1
// @description  Makes it possible to tag users on the forums.
// @author       Kumirei
// @include      https://community.wanikani.com*
// @require      https://greasyfork.org/scripts/5392-waitforkeyelements/code/WaitForKeyElements.js?version=115012
// @grant        none
// ==/UserScript==
/*jshint esversion: 8 */

(function() {
		const textColor = "#000";
		var userList = [];
		setTriggers();

		// Make sure the script is always running
		function setTriggers() {
				// When loading a page
				window.addEventListener('load', initialiseScript);

				// When using the back and forward buttons
				window.addEventListener('popstate', initialiseScript);

				// When navigating the forums
				(function(history){
						var pushState = history.pushState;
						history.pushState = function(state) {
								if (typeof history.onpushstate == "function") {
										history.onpushstate({state: state});
								}
								initialiseScript();
								return pushState.apply(history, arguments);
						};
				})(window.history);
		}

		// Adds info to the current page
		function initialiseScript() {
				userList = getUserList();
				insertStyle();
				waitForKeyElements(".topic-post article", addTags);
		}

		// Retrieves the list of users and their tags
		function getUserList() {
				userList = localStorage.getItem('WKForumsTagsUserList');
				if (userList === null || userList === "") {
						userList = [];
				}
				else {
						userList = $.parseJSON(userList);

						// If list is stored the old way, fix it
						if (typeof userList[0] == "number") {
								var newList = {};
								for (var i=0; i<userList.length; i+=2) {
										newList[userList[i]] = userList[i+1];
								}
								userList = newList;
								localStorage.setItem('WKForumsTagsUserList', JSON.stringify(userList));
						}
				}
				return userList;
		}

		// Adds styling to the tags
		function insertStyle() {
				$('head').append(
						'<style class="user-tag">'+
						'    .names span { '+
						'        display: inline !important;'+
						'        max-width: 100% !important;'+
						'    }'+
						''+
						'    .user-tag input {'+
						'        background: transparent;'+
						'        color: '+textColor+';'+
						'        border: none;'+
						'    }'+
						'</style>'
				);
		}

		// Adds the tags to the posts
		function addTags() {
				$('.topic-post article').each(function(i){
						var userTag = "";
						if ($(this).find(".user-tag").length === 0){
								var userID = Number($(this).attr('data-user-id'));
								if (userID in userList) userTag = userList[userID];
								$(this).find('.names').append(
										'<span class="user-tag">'+
										'    <input '+
										'        id="wkTagsUser'+i+'" '+
										'        value="'+userTag+'">'+
										'</input></span>');
								if ($('#wkTagsUser'+i).length) $('#wkTagsUser'+i)[0].onkeypress = function(key){if (key.keyCode == 13) saveTags(userID, i);}
						}
				});
		}

		// Saves the tag to the user
		function saveTags(userID, index) {
				var newTag = $('#wkTagsUser'+index).val();
				updateTags(userID, newTag);
				userList[userID] = newTag;
				localStorage.setItem("WKForumsTagsUserList", JSON.stringify(userList));
		};

		// Updates all other posts by the same user to the new tag
		function updateTags(userID, tag) {
				$('article[data-user-id="'+userID+'"]').each(function(){
						$(this).find('.user-tag input').val(tag);
				});
		}
})();
