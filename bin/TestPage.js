#!/usr/bin/env node

var USAGE = _multiline(function() {/*
    Usage:
        node TestPage.js [--help]
                         [--verbose]
                         [--nobrowser]
                         [--nonode]

*/});

var NODE_TEST_PAGE = _multiline(function() {/*
__SCRIPT__

*/});

var BROWSER_TEST_PAGE = _multiline(function() {/*
<!DOCTYPE html><html><head><title>test</title>
<meta name="viewport" content="width=device-width, user-scalable=no">
<meta charset="utf-8"></head><body>

<script id="worker" type="javascript/worker">
onmessage = function(event) {
    self.MESSAGE = event.data;

    __IMPORT_SCRIPTS__

    self.postMessage({ error: self.errorMessage || "" });
};
</script>

__SCRIPT__

</body></html>

*/});


function put(msg) { console.log(msg); }
put.error = function(msg) { put("\u001b[31m" + msg + "\u001b[0m"); };
put.warn  = function(msg) { put("\u001b[33m" + msg + "\u001b[0m"); };
put.info  = function(msg) { put("\u001b[32m" + msg + "\u001b[0m"); };

var fs   = require("fs");
var argv = process.argv.slice(2);
var NodeModule = require("uupaa.nodemodule.js");
var package = JSON.parse(fs.readFileSync("package.json", "UTF-8"));

var options = _parseCommandLineOptions({
        help:       false,      // Boolean - true is show help.
        verbose:    false,      // Boolean - true is verbose mode.
        browser:    true,       // Boolean - true is update test/index.html file.
        node:       true,       // Boolean - true is update test/index.node.js file.
    });

if (options.help) {
    put.warn( USAGE );
    return;
}

var files = NodeModule.files({ dir: "", develop: true }); // { all, node, worker, browser, label }

if (options.verbose) {
    put.info( "files: \n    " + JSON.stringify(files, null, 2).replace(/\n/g, "\n    ") + "\n" );
}

if (options.browser) {
    var browserTestPage = _createBrowserTestPage(options, files, package);

    fs.writeFileSync("test/index.html", browserTestPage);

    if (options.verbose) {
        put.info( "update test/index.html: \n    " + browserTestPage.replace(/\n/g, "\n    " ) );
    }
}
if (options.node) {
    var nodeTestPage = _createNodeTestPage(options, files, package);

    fs.writeFileSync("test/index.node.js", nodeTestPage);

    if (options.verbose) {
        put.info( "update test/index.node.js: \n    " + nodeTestPage.replace(/\n/g, "\n    " ) );
    }
}

// =========================================================
function _createBrowserTestPage(options,   // @arg Object -
                                files,     // @arg Object - { all, node, worker, browser, label }
                                package) { // @arg Object - package.json
                                           // @ret String

    var build = package["x-build"] || package["build"];
    var source = build["source"] ||
                 build["files"]; // [DEPRECATED]
    var importScriptFiles = NodeModule.uniqueArray(files.worker.concat(source).map(_worker)).unique;

    if ( /(all|worker)/i.test( build.target.join(" ") ) ) {
        importScriptFiles.push('importScripts(MESSAGE.BASE_DIR + "../' + build.output + '");');
        importScriptFiles.push('importScripts(MESSAGE.BASE_DIR + "./test.js");');
        BROWSER_TEST_PAGE = BROWSER_TEST_PAGE.replace("__IMPORT_SCRIPTS__", importScriptFiles.join("\n    "));
    } else {
        BROWSER_TEST_PAGE = BROWSER_TEST_PAGE.replace("__IMPORT_SCRIPTS__", "");
    }

    var scriptFiles = NodeModule.uniqueArray(files.browser.concat(source).map(_browser)).unique;

    if ( /(all|browser)/i.test( build.target.join(" ") ) ) { // browser ready module
        scriptFiles.push('<script src="../' + build.output + '"></script>');
        scriptFiles.push('<script src="./test.js"></script>');
        BROWSER_TEST_PAGE = BROWSER_TEST_PAGE.replace("__SCRIPT__", scriptFiles.join("\n"));
    } else {
        BROWSER_TEST_PAGE = BROWSER_TEST_PAGE.replace("__SCRIPT__", "");
    }
    return BROWSER_TEST_PAGE;

    function _worker(file) {
        return 'importScripts(MESSAGE.BASE_DIR + "../' + file + '");';
    }

    function _browser(file) {
        return '<script src="../' + file + '"></script>';
    }
}

function _createNodeTestPage(options,   // @arg Object
                             files,     // @arg Object - { all, node, worker, browser, label }
                             package) { // @arg Object - package.json
                                        // @ret String

    var build = package["x-build"] || package["build"];
    var source = build["source"] ||
                 build["files"]; // [DEPRECATED]
    var requireFiles = NodeModule.uniqueArray(files.node.concat(source).map(_node)).unique;

    if ( /(all|node)/i.test( build.target.join(" ") ) ) { // node ready module
        requireFiles.push('require("../' + build.output + '");');
        requireFiles.push('require("./test.js");');
        return NODE_TEST_PAGE.replace("__SCRIPT__", requireFiles.join("\n"));
    }
    return "";

    function _node(file) {
        return 'require("../' + file + '");';
    }
}

function _parseCommandLineOptions(options) { // @arg Object:
                                             // @ret Object:
    for (var i = 0, iz = argv.length; i < iz; ++i) {
        switch (argv[i]) {
        case "-h":
        case "--help":      options.help    = true; break;
        case "-v":
        case "--verbose":   options.verbose = true; break;
        case "--nobrowser": options.browser = false; break;
        case "--nonode":    options.node    = false; break;
        default:
        }
    }
    return options;
}

function _multiline(fn) { // @arg Function:
                          // @ret String:
    return (fn + "").split("\n").slice(1, -1).join("\n");
}

