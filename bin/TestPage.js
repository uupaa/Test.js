#!/usr/bin/env node

var _USAGE = _multiline(function() {/*
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
<meta charset="utf-8"></head><body>

<script id="worker" type="javascript/worker">
onmessage = function(event) {
    var baseDir = event.data.baseDir;

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
        help:       false,      // Boolean: true is show help.
        verbose:    false,      // Boolean: true is verbose mode.
        browser:    true,       // Boolean: true is update test/index.html file.
        node:       true,       // Boolean: true is update test/index.node.js file.
    });

if (options.help) {
    put.warn( _USAGE );
    return;
}

var moduleData = NodeModule.collectModuleData({ dir: "", develop: true });

if (options.verbose) {
    put.info( "moduleData: \n    " + JSON.stringify(moduleData, null, 2).replace(/\n/g, "\n    ") + "\n" );
}

if (options.browser) {
    var browserTestPage = _createBrowserTestPage(options, moduleData, package);

    fs.writeFileSync("test/index.html", browserTestPage);

    if (options.verbose) {
        put.info( "update test/index.html: \n    " + browserTestPage.replace(/\n/g, "\n    " ) );
    }
}
if (options.node) {
    var nodeTestPage = _createNodeTestPage(options, moduleData, package);

    fs.writeFileSync("test/index.node.js", nodeTestPage);

    if (options.verbose) {
        put.info( "update test/index.node.js: \n    " + nodeTestPage.replace(/\n/g, "\n    " ) );
    }
}

// =========================================================
function _createBrowserTestPage(options,    // @arg Object:
                                moduleData, // @arg Object:
                                package) {  // @arg Object: package.json
                                            // @ret String:

    var build = package["x-build"] || package["build"];
    var importScriptFiles = moduleData.workerFiles.concat(build.files).map(_worker);

    if ( /(all|worker)/i.test( build.target.join(" ") ) ) {
        importScriptFiles.push('importScripts(baseDir + "../' + build.output + '");');
        importScriptFiles.push('importScripts(baseDir + "./test.js");');
        BROWSER_TEST_PAGE = BROWSER_TEST_PAGE.replace("__IMPORT_SCRIPTS__", importScriptFiles.join("\n    "));
    } else {
        BROWSER_TEST_PAGE = BROWSER_TEST_PAGE.replace("__IMPORT_SCRIPTS__", "");
    }

    var scriptFiles = moduleData.browserFiles.concat(build.files).map(_browser);

    if ( /(all|browser)/i.test( build.target.join(" ") ) ) { // browser ready module
        scriptFiles.push('<script src="../' + build.output + '"></script>');
        scriptFiles.push('<script src="./test.js"></script>');
        BROWSER_TEST_PAGE = BROWSER_TEST_PAGE.replace("__SCRIPT__", scriptFiles.join("\n"));
    } else {
        BROWSER_TEST_PAGE = BROWSER_TEST_PAGE.replace("__SCRIPT__", "");
    }
    return BROWSER_TEST_PAGE;

    function _worker(file) {
        return 'importScripts(baseDir + "../' + file + '");';
    }

    function _browser(file) {
        return '<script src="../' + file + '"></script>';
    }
}

function _createNodeTestPage(options,    // @arg Object:
                             moduleData, // @arg Object:
                             package) {  // @arg Object: package.json
                                         // @ret String:

    var build = package["x-build"] || package["build"];
    var files = moduleData.nodeFiles.concat(build.files).map(_node);

    if ( /(all|node)/i.test( build.target.join(" ") ) ) { // node ready module
        files.push('require("../' + build.output + '");');
        files.push('require("./test.js");');
        return NODE_TEST_PAGE.replace("__SCRIPT__", files.join("\n"));
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

