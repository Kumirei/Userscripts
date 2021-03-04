// ==UserScript==
// @name        WaniKani Stroke Order
// @namespace   japanese
// @version     1.1.7
// @description Shows a kanji's stroke order on its page and during lessons and reviews.
// @license     GPL version 3 or any later version; http://www.gnu.org/copyleft/gpl.html
// @include     http*://*wanikani.com/kanji/*
// @include     http*://*wanikani.com/level/*/kanji/*
// @include     http*://*wanikani.com/review/session
// @include     http*://*wanikani.com/lesson/session
// @author      Looki, maintained by Kumirei
// @grant       GM_xmlhttpRequest
// @connect     jisho.org
// @connect     cloudfront.net
// @require     http://ajax.googleapis.com/ajax/libs/jquery/1.10.2/jquery.min.js
// @require     https://cdnjs.cloudflare.com/ajax/libs/snap.svg/0.5.1/snap.svg-min.js
// ==/UserScript==

/*
 * Thanks a lot to ...
 * Wanikani Phonetic-Semantic Composition - Userscript
 * by ruipgpinheiro (LordGravewish)
 * ... for code showing me how to insert sections during kanji reviews.
 * The code heavily borrows from that script!
 * Also thanks to Halo for a loading bug fix!
 */

;(function () {
    /*
     * Helper Functions/Variables
     */
    $ = unsafeWindow.$

    /*
     * Global Variables/Objects/Classes
     */
    var PageEnum = Object.freeze({ unknown: 0, kanji: 1, reviews: 2, lessons: 3 })
    var curPage = PageEnum.unknown
    var JISHO = 'http://jisho.org'
    var strokeOrderCss =
        "<style type='text/css'>" +
        '.stroke_order_diagram--bounding_box {fill: none;stroke: #ddd; stroke-width: 2; stroke-linecap: square;stroke-linejoin: square;}' +
        '.stroke_order_diagram--bounding_box {fill: none;stroke: #ddd; stroke-width: 2;stroke-linecap: square;stroke-linejoin: square;}' +
        '.stroke_order_diagram--existing_path {fill: none;stroke: #aaa;stroke-width: 3;stroke-linecap: round;stroke-linejoin: round;}' +
        '.stroke_order_diagram--current_path {fill: none;stroke: #000;stroke-width: 3; stroke-linecap: round; stroke-linejoin: round;}' +
        '.stroke_order_diagram--path_start {fill: rgba(255,0,0,0.7);stroke: none;}' +
        '.stroke_order_diagram--guide_line {fill: none; stroke: #ddd;stroke-width: 2;stroke-linecap: square; stroke-linejoin: square; stroke-dasharray: 5, 5;}</style>'

    /*
     * Main
     */
    function init() {
        // Determine page type
        if (/\/kanji\/./.test(document.URL)) {
            curPage = PageEnum.kanji
        } else if (/\/review/.test(document.URL)) {
            curPage = PageEnum.reviews
        } else if (/\/lesson/.test(document.URL)) {
            curPage = PageEnum.lessons
        }

        // Create and store the element that will hold the image
        unsafeWindow.diagram = createDiagramSection()

        // Register callback for when to load stroke order
        switch (curPage) {
            case PageEnum.kanji:
                loadDiagram()
                break
            case PageEnum.reviews:
                var o = new MutationObserver(function (mutations) {
                    // The last one always has 2 mutations, so let's use that
                    if (mutations.length != 2) return

                    // Reviews dynamically generate the DOM. We always need to re-insert the element
                    if (getKanji() !== null) {
                        setTimeout(function () {
                            var diagram = createDiagramSection()
                            if (diagram !== null && diagram.length > 0) {
                                unsafeWindow.diagram = diagram
                                loadDiagram()
                            }
                        }, 150)
                    }
                })
                o.observe(document.getElementById('item-info'), { attributes: true })
                break
            case PageEnum.lessons:
                o = new MutationObserver(loadDiagram)
                o.observe(document.getElementById('supplement-kan'), { attributes: true })
                loadDiagram()
                break
        }
    }

    if (document.readyState === 'complete') {
        init()
    } else {
        window.addEventListener('load', init)
    }

    /*
     * Returns the current kanji
     */
    function getKanji() {
        switch (curPage) {
            case PageEnum.kanji:
                return document.title[document.title.length - 1]

            case PageEnum.reviews:
                var curItem = $.jStorage.get('currentItem')
                if ('kan' in curItem) return curItem.kan.trim()
                else return null
                break
            case PageEnum.lessons:
                var kanjiNode = $('#character')

                if (kanjiNode === undefined || kanjiNode === null) return null

                return kanjiNode.text().trim()
        }

        return null
    }

    /*
     * Creates a section for the diagram and returns a pointer to its content
     */
    function createDiagramSection() {
        // Reviews hack: Only do it once
        if ($('#stroke_order').length == 0) {
            let sectionHTML =
                '<section><h2>Stroke Order</h2><div style="width:100%;overflow-x: auto; overflow-y: hidden"><svg id="stroke_order"></svg></div></section>'

            switch (curPage) {
                case PageEnum.kanji:
                    $(sectionHTML).insertAfter('#information')
                    break
                case PageEnum.reviews:
                    console.log('prepend')
                    $('#item-info-col2').prepend(sectionHTML)
                    break
                case PageEnum.lessons:
                    $('#supplement-kan-breakdown .col1').append(sectionHTML)
                    break
            }
            $(strokeOrderCss).appendTo('head')
        }

        return $('#stroke_order').empty()
    }

    /*
     * Adds the diagram section element to the appropriate location
     */
    function loadDiagram() {
        if (!unsafeWindow || !unsafeWindow.diagram.length) return

        diagram.empty()
        setTimeout(function () {
            GM_xmlhttpRequest({
                method: 'GET',
                url: new URL(JISHO + '/search/' + getKanji() + '%20%23kanji'),
                onload: function (xhr) {
                    var diagram = unsafeWindow.diagram
                    if (xhr.status == 200) {
                        var strokeOrderSvg = xhr.responseText.match(/var url = '\/\/(.+)';/)
                        if (strokeOrderSvg) {
                            GM_xmlhttpRequest({
                                method: 'GET',
                                url: new URL('https://' + strokeOrderSvg[1]),
                                onload: function (xhr) {
                                    diagram.empty()
                                    new strokeOrderDiagram(diagram.get(0), $.parseXML(xhr.responseText, 'xml'))
                                },
                                onerror: function (xhr) {
                                    unsafeWindow.diagram.html('Error while loading diagram')
                                },
                            })
                        }
                    } else {
                        console.error(xhr.responseText)
                        unsafeWindow.diagram.html('Error while loading diagram ')
                    }
                },
                onerror: function (xhr) {
                    console.error(xhr.responseText)
                    unsafeWindow.diagram.html('Error while loading diagram')
                },
            })
        }, 0)
    }

    /*
     * Lifted from jisho.org
     */
    var strokeOrderDiagram = function (element, svgDocument) {
        var s = Snap(element)
        var diagramSize = 200
        var coordRe = '(?:\\d+(?:\\.\\d+)?)'
        var strokeRe = new RegExp('^[LMT]\\s*(' + coordRe + ')[,\\s](' + coordRe + ')', 'i')
        var f = Snap(svgDocument.getElementsByTagName('svg')[0])
        var allPaths = f.selectAll('path')
        var drawnPaths = []
        var canvasWidth = (allPaths.length * diagramSize) / 2
        var canvasHeight = diagramSize / 2
        var frameSize = diagramSize / 2
        var frameOffsetMatrix = new Snap.Matrix()
        frameOffsetMatrix.translate(-frameSize / 16 + 2, -frameSize / 16 + 2)

        // Set drawing area
        s.node.style.width = canvasWidth + 'px'
        s.node.style.height = canvasHeight + 'px'
        s.node.setAttribute('viewBox', '0 0 ' + canvasWidth + ' ' + canvasHeight)

        // Draw global guides
        var boundingBoxTop = s.line(1, 1, canvasWidth - 1, 1)
        var boundingBoxLeft = s.line(1, 1, 1, canvasHeight - 1)
        var boundingBoxBottom = s.line(1, canvasHeight - 1, canvasWidth - 1, canvasHeight - 1)
        var horizontalGuide = s.line(0, canvasHeight / 2, canvasWidth, canvasHeight / 2)
        boundingBoxTop.attr({ class: 'stroke_order_diagram--bounding_box' })
        boundingBoxLeft.attr({ class: 'stroke_order_diagram--bounding_box' })
        boundingBoxBottom.attr({ class: 'stroke_order_diagram--bounding_box' })
        horizontalGuide.attr({ class: 'stroke_order_diagram--guide_line' })

        // Draw strokes
        var pathNumber = 1
        allPaths.forEach(function (currentPath) {
            var moveFrameMatrix = new Snap.Matrix()
            moveFrameMatrix.translate(frameSize * (pathNumber - 1) - 4, -4)

            // Draw frame guides
            var verticalGuide = s.line(
                frameSize * pathNumber - frameSize / 2,
                1,
                frameSize * pathNumber - frameSize / 2,
                canvasHeight - 1,
            )
            var frameBoxRight = s.line(frameSize * pathNumber - 1, 1, frameSize * pathNumber - 1, canvasHeight - 1)
            verticalGuide.attr({ class: 'stroke_order_diagram--guide_line' })
            frameBoxRight.attr({ class: 'stroke_order_diagram--bounding_box' })

            // Draw previous strokes
            drawnPaths.forEach(function (existingPath) {
                var localPath = existingPath.clone()
                localPath.transform(moveFrameMatrix)
                localPath.attr({ class: 'stroke_order_diagram--existing_path' })
                s.append(localPath)
            })

            // Draw current stroke
            currentPath.transform(frameOffsetMatrix)
            currentPath.transform(moveFrameMatrix)
            currentPath.attr({ class: 'stroke_order_diagram--current_path' })
            s.append(currentPath)

            // Draw stroke start point
            var match = strokeRe.exec(currentPath.node.getAttribute('d'))
            var pathStartX = match[1]
            var pathStartY = match[2]
            var strokeStart = s.circle(pathStartX, pathStartY, 4)
            strokeStart.attr({ class: 'stroke_order_diagram--path_start' })
            strokeStart.transform(moveFrameMatrix)

            pathNumber++
            drawnPaths.push(currentPath.clone())
        })
    }
})()
