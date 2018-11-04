window.srcbyline = (function(app) {
    'use strict';

    app.init = function() {
        var nodeList = [].slice.call(document.querySelectorAll('[data-srcbyline]'));

        app.fileCache = {};

        nodeList.forEach(processNode);
    };

    function processNode(node) {
        var input = node.dataset.srcbyline.split(/\?/),
            filename = input[0],
            ext = filename && filename.split(/\./)[1],
            lineNums = input[1] && input[1].split(/\;/);

        if (!filename || !lineNums) {
            return;
        }

        if (app.fileCache[filename]) {
            // we already have it...
            insertLines(node, app.fileCache[filename], lineNums);

        } else if (app.fileCache[filename] === null) {
            // it's being processed now, so hang out and try again shortly...
            setTimeout(function() {
                waitForFile(node, filename, lineNums);
            }, 100);

        } else {
            // Grab the file and process it
            // but first, indicate to any future nodes that we're working on this one already
            app.fileCache[filename] = null;

            getSource(filename, function(data) {
                if (data !== null) {
                    app.fileCache[filename] = {
                        filename: filename,
                        lines: data
                    };
                    insertLines(node, app.fileCache[filename], lineNums);
                }
            });
        }
    }

    function waitForFile(node, filename, lineNums) {
        if (app.fileCache[filename]) {
            insertLines(node, app.fileCache[filename], lineNums);
        } else {
            setTimeout(function() {
                waitForFile(node, filename, lineNums);
            }, 100);
        }
    }

    function insertLines(node, data, lineNums) {
        var content = [];

        lineNums.forEach(function(lineSelect) {
            var lines;

            if (/^\s*[0-9]+\s*$/.test(lineSelect)) {
                content.push(data.lines[Number(lineSelect)-1] || '');

            } else if (/^\s*[0-9]+\-[0-9]+\s*$/.test(lineSelect)) {
                lines = getNumbersInRange(lineSelect);
                lines.forEach(function(line) {
                    content.push(data.lines[line-1] || '');
                });
            }
        });

        node.innerHTML = highlight(trimLines(content).join("\n"));
    }

    function trimLines(content) {
        var i, l,
            minSpacing = 99;
        
        for (i=0, l=content.length; i<l; ++i) {
            var spaces = content[i].match(/^(\s+)/);
            if (spaces) {
                if (spaces[1].length < minSpacing) {
                    minSpacing = spaces[1].length;
                }

            } else {
                // if there is no match, then we have a line with no spaces, so we can't trim
                minSpacing = 0;
                break;
            }
        }

        return content.map(function(line) {
            return line.substr(minSpacing);
        });
    }

    function getNumbersInRange(range) {
        var i,
            nums = [],
            ends = range.split(/\-/),
            stop = Number(ends[1]);

        if (!ends || ends.length !== 2) {
            return nums;
        }

        for (i=Number(ends[0]); i<=stop; ++i) {
            nums.push(i);
        }

        return nums;
    }

    function highlight(content) {
        var parsed = content;

        if (window.hljs) {
            try {
                parsed = hljs.highlightAuto(content).value;
            } catch(err) {
                console.warn(err);
                parsed = content;
            }
        }

        return parsed;
    }

    function getSource(filename, cb) {
        var srcXhr = new XMLHttpRequest();
        cb = (cb || function(){});

        srcXhr.open("GET", filename, true);
        srcXhr.onreadystatechange = function(){
            if (srcXhr.readyState >= 4) {
                if (srcXhr.status == 200) {
                    cb(srcXhr.responseText.split("\n"));
                } else  {
                    console.warn(srcXhr.status, srcXhr.responseText);
                    cb(null);
                }
            }
        };
        srcXhr.send();
    }

    return app;

})(window.srcbyline || {});
