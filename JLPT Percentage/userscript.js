// ==UserScript==
// @name         BunPro: JLPT Percentage
// @namespace    http://tampermonkey.net/
// @version      0.2.8
// @description  Adds percentages to the progress bars.
// @author       Kumirei
// @include      http://bunpro.jp/*
// @include      https://bunpro.jp/*
// @include      http://www.bunpro.jp/*
// @include      https://www.bunpro.jp/*
// @grant        none
// ==/UserScript==

(function() {
	$('head').append('<style id="BunProPercentageScript">' +
					 '    .profile-jlpt-level .progress .percentage {' +
					 '        position: absolute; '+
					 '        left: 50%;' +
					 '        line-height: 15px;' +
					 '        transform: translate(-50%,0);' +
					 '        text-shadow: 1px 0px black;' +
					 '    }' +
					 '</style>');
	waitForSelector('.profile-jlpt-level .progress-bar').then(function(e) {
		var percentage = String(Math.round(e.attr('aria-valuenow')*10)/10) + "%";
		$(e[0].parentNode).append('<span class="percentage">' + percentage + '</span>');
	});

	waitForSelector('.profile-jlpt-level').then(function(e) {
		if (!$('.profile-jlpt-level.total').length) {
			var bar = $('.profile-jlpt-level')[0].cloneNode(true);
			bar.className += ' total';
			$(bar).find('.percentage').remove();
			bar.childNodes[1].innerText = "Total";
			var barelem = $(bar).find('.progress-bar');
			var total = 0;
			var learned = 0;
			$('.row > .progress-count').each(function(i, e) {
				var counts = e.childNodes[0].textContent.split("/");
				total += Number(counts[1]);
				learned += Number(counts[0]);
			});
			barelem.attr('aria-valuenow', learned/total*100);
			barelem.attr('style', 'width: ' + learned/total*100 + '%;');
			$(bar).find('.progress-count')[0].innerText = String(learned) + '/' + String(total);
			var lastbar = $('.profile-jlpt-level');
			$(lastbar[lastbar.length-1]).after(bar);
		}
	});

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
})();
