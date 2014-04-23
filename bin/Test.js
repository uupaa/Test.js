#!/usr/bin/env node

var _USAGE = _multiline(function() {/*
    Usage:
        node bin/Test.js [--help]
                         [--verbose]
                         [--browser]
                         [--node]

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

var options = _parseCommandLineOptions({
        help:       false,      // Boolean: true is show help.
        verbose:    false,      // Boolean: true is verbose mode.
        browser:    false,      // Boolean: true is update test/index.html file.
        node:       false,      // Boolean: true is update test/index.node.js file.
    });

var json = null;
var path = "build.json";



if (fs.existsSync(path)) {
    json = JSON.parse(fs.readFileSync(path, "UTF-8"));
} else {
    console.log(_CONSOLE_COLOR.RED + "Error, build.json file not found. You can try 'npm run build' command." + _CONSOLE_COLOR.CLEAR);
    return;
}
if (options.help) {
    console.log(_CONSOLE_COLOR.YELLOW + _USAGE + _CONSOLE_COLOR.CLEAR);
    return;
}

//console.log("JSON: = " + JSON.stringify(json, null, 2));

if (options.browser) {
    updateBrowserTestFile(options, json);
}
if (options.node) {
    updateNodeTestFile(options, json);
}

// =========================================================
function updateBrowserTestFile(options, // @arg Object:
                               json_) { // @arg Object:
    // --- worker ---
    var json = JSON.parse(JSON.stringify(json_));

    json.devDependenciesFiles = _filter(json.devDependenciesModules,
                                        json.devDependenciesFiles,
                                        json.moduleTargets,
                                        "worker");
    json.dependenciesFiles = _filter(json.dependenciesModules,
                                     json.dependenciesFiles,
                                     json.moduleTargets,
                                     "worker");

    if ( /worker/i.test( json.build.target.join(" ") ) ) { // worker ready module
        var importScriptFiles = [].concat( json.devDependenciesFiles.map(_worker),
                                           json.dependenciesFiles.map(_worker),
                                           json.build.files.map(_worker) );

        importScriptFiles.push('importScripts(baseDir + "../' + json.build.output + '");');
        importScriptFiles.push('importScripts(baseDir + "./test.js");');
        indexHTMLFile = indexHTMLFile.replace("__IMPORT_SCRIPTS__", importScriptFiles.join("\n    "));
    } else {
        indexHTMLFile = indexHTMLFile.replace("__IMPORT_SCRIPTS__", "");
    }


    // --- browser ---
    var json = JSON.parse(JSON.stringify(json_));

    json.devDependenciesFiles = _filter(json.devDependenciesModules, json.devDependenciesFiles,
                                        json.moduleTargets, "browser");
    json.dependenciesFiles    = _filter(json.dependenciesModules, json.dependenciesFiles,
                                        json.moduleTargets, "browser");

    if ( /browser/i.test( json.build.target.join(" ") ) ) { // browser ready module
        var scriptFiles = [].concat( json.devDependenciesFiles.map(_browser),
                                     json.dependenciesFiles.map(_browser),
                                     json.build.files.map(_browser) );

        scriptFiles.push('<script src="../' + json.build.output + '"></script>');
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

function updateNodeTestFile(options, // @arg Object:
                            json_) {  // @arg Object:

    // --- node.js ---
    var json = JSON.parse(JSON.stringify(json_));

    json.devDependenciesFiles = _filter(json.devDependenciesModules, json.devDependenciesFiles,
                                        json.moduleTargets, "node");
    json.dependenciesFiles    = _filter(json.dependenciesModules, json.dependenciesFiles,
                                        json.moduleTargets, "node");

    if ( /node/i.test( json.build.target.join(" ") ) ) { // node ready module
        var result = [].concat( json.devDependenciesFiles.map(_node),
                                json.dependenciesFiles.map(_node),
                                json.build.files.map(_node) );

        result.push('require("../' + json.build.output + '");');
        result.push('require("./test.js");');

        fs.writeFileSync("test/index.node.js", result.join("\n"));
    } else {
        fs.writeFileSync("test/index.node.js", "");
    }

    function _node(file) {
        return 'require("../' + file + '");';
    }
}

function _filter(dependenciesModules, // @arg WebModuleNameStringArray: ["uupaa.console.js", "uupaa.valid.js", ...]
                 dependenciesFiles,   // @arg WebModuleFilePathStringArray: ["node_modules/uupaa.console.js/lib/Console.js", "node_modules/uupaa.valid.js/lib/Valid.js", ...]
                 moduleTargets,       // @arg Object: { "uupaa.console.js": ["Worker"], ... }
                 targetName) {        // @arg String: "browser", "worker", "node"

    var rex = new RegExp(targetName, "i");

    return dependenciesModules.reduce(function(result, moduleName) { // "uupaa.console.js"
                if (moduleName in moduleTargets) {
                    var selector = moduleTargets[moduleName].join(" ");

                    if ( rex.test(selector) ) { // module ready?
                        for (var i = 0, iz = dependenciesFiles.length; i < iz; ++i) {
                            if ( dependenciesFiles[i].indexOf(moduleName) >= 0) {
                                result.push( dependenciesFiles[i] );
                                return result;
                            }
                        }
                    }
                }
                return result;
            }, []);
}

function _parseCommandLineOptions(options) { // @arg Object:
                                             // @ret Object:
    for (var i = 0, iz = argv.length; i < iz; ++i) {
        switch (argv[i]) {
        case "-h":
        case "--help":      options.help    = true; break;
        case "-v":
        case "--verbose":   options.verbose = true; break;
        case "--browser":   options.browser = true; break;
        case "--node":      options.node    = true; break;
        default:
        }
    }
    return options;
}

function _multiline(fn) { // @arg Function:
                          // @ret String:
    return (fn + "").split("\n").slice(1, -1).join("\n");
}


