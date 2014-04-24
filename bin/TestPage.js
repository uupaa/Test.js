#!/usr/bin/env node

var _USAGE = _multiline(function() {/*
    Usage:
        node bin/TestPage.js [--help]
                             [--verbose]
                             [--nobrowser]
                             [--nonode]

*/});

var indexHTMLFile = _multiline(function() {/*
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

var _CONSOLE_COLOR = {
        RED:    "\u001b[31m",
        YELLOW: "\u001b[33m",
        GREEN:  "\u001b[32m",
        CLEAR:  "\u001b[0m"
    };

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
    console.log(_CONSOLE_COLOR.YELLOW + _USAGE + _CONSOLE_COLOR.CLEAR);
    return;
}

var moduleData = NodeModule.collectModuleData({ dir: "", result: null, develop: true });

moduleData = NodeModule.collectModuleData({ dir: "", result: moduleData, develop: false });

if (options.verbose) {
    console.log(_CONSOLE_COLOR.GREEN + JSON.stringify(moduleData, null, 2) + _CONSOLE_COLOR.CLEAR);
}

if (options.browser) {
    createBrowserTestPage(options, moduleData, package);
}
if (options.node) {
    createNodeTestPage(options, moduleData, package);
}

// =========================================================
function createBrowserTestPage(options,    // @arg Object:
                               moduleData, // @arg Object:
                               package) {  // @arg Object: package.json

    var build = package["x-build"] || package["build"];
    var importScriptFiles = moduleData.workerFiles.concat(build.files).map(_worker);

    if ( /(all|worker)/i.test( build.target.join(" ") ) ) {
        importScriptFiles.push('importScripts(baseDir + "../' + build.output + '");');
        importScriptFiles.push('importScripts(baseDir + "./test.js");');
        indexHTMLFile = indexHTMLFile.replace("__IMPORT_SCRIPTS__", importScriptFiles.join("\n    "));
    } else {
        indexHTMLFile = indexHTMLFile.replace("__IMPORT_SCRIPTS__", "");
    }

    var scriptFiles = moduleData.browserFiles.concat(build.files).map(_browser);

    if ( /(all|browser)/i.test( build.target.join(" ") ) ) { // browser ready module
        scriptFiles.push('<script src="../' + build.output + '"></script>');
        scriptFiles.push('<script src="./test.js"></script>');
        indexHTMLFile = indexHTMLFile.replace("__SCRIPT__", scriptFiles.join("\n"));
    } else {
        indexHTMLFile = indexHTMLFile.replace("__SCRIPT__", "");
    }

    fs.writeFileSync("test/index.html", indexHTMLFile + "\n");

    function _worker(file) {
        return 'importScripts(baseDir + "../' + file + '");';
    }

    function _browser(file) {
        return '<script src="../' + file + '"></script>';
    }
}

function createNodeTestPage(options,    // @arg Object:
                            moduleData, // @arg Object:
                            package) {  // @arg Object: package.json

    var build = package["x-build"] || package["build"];
    var result = moduleData.nodeFiles.concat(build.files).map(_node);

    if ( /(all|node)/i.test( build.target.join(" ") ) ) { // node ready module
        result.push('require("../' + build.output + '");');
        result.push('require("./test.js");');

        fs.writeFileSync("test/index.node.js", result.join("\n"));
    } else {
        fs.writeFileSync("test/index.node.js", "");
    }

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
