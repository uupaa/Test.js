(function(global) {
"use strict";

// --- dependency module -----------------------------------
//{@dev
//  This code block will be removed in `$ npm run build-release`. http://git.io/Minify
var Valid = global["Valid"] || require("uupaa.valid.js"); // http://git.io/Valid
//}@dev
var Task    = global["Task"]    || require("uupaa.task.js");

// --- local variable --------------------------------------
var _stylish = _isConsoleStyleReady();
var _runOnNode = "process" in global;
var _runOnWorker = "WorkerLocation" in global;
var _runOnBrowser = "document" in global;
var _testSecondaryModule = !!(global["MESSAGE"] || 0)["SECONDARY"]; // from WebWorker

// --- define ----------------------------------------------
var CONSOLE_COLOR = {
        RED:    "\u001b[31m",
        YELLOW: "\u001b[33m",
        GREEN:  "\u001b[32m",
        CLEAR:  "\u001b[0m"
    };

// --- interface -------------------------------------------
function Test(moduleName, // @arg String - target module.
              param) {    // @arg Object = {} - { disable, browser, worker, node, button, both }
                          // @param.disable Boolean = false - Disable all tests.
                          // @param.browser Boolean = false - Enable the browser test.
                          // @param.worker  Boolean = false - Enable the webWorker test.
                          // @param.node    Boolean = false - Enable the node.js test.
                          // @param.button  Boolean = false - Show test buttons.
                          // @param.both    Boolean = false - Test the primary and secondary module.
//{@dev
    Valid(Valid.type(param, "Object"), Test, "param");
    Valid(Valid.keys(param, "disable,browser,worker,node,button,both"), Test, "param");
//}@dev

    param = param || {};

    this._items   = []; // test items.
    this._swaped  = false;
    this._module  = moduleName;

    this._browser = param["browser"] || false;
    this._worker  = param["worker"]  || false;
    this._node    = param["node"]    || false;
    this._button  = param["button"]  || false;
    this._both    = param["both"]    || false;

    if (param["disable"]) {
        this._browser = false;
        this._worker  = false;
        this._node    = false;
        this._button  = false;
        this._both    = false;
    }

    if (_runOnBrowser) {
        _setUncaughtExceptionHandler();
    }
}

Test["repository"] = "https://github.com/uupaa/Test.js";

Test["prototype"]["add"]   = Test_add;   // Test#add(items:TestItemFunctionArray):this
Test["prototype"]["run"]   = Test_run;   // Test#run(callback:Function = null):this
Test["prototype"]["clone"] = Test_clone; // Test#clone():TestItemFunctionArray

// --- implement -------------------------------------------
function _setUncaughtExceptionHandler() {
    global.addEventListener("error", function() { // message, lineno, filename
        document.body["style"]["backgroundColor"] = "red";
    });
}

function Test_add(items) { // @arg TestItemFunctionArray - test items. [fn, ...]
                           // @desc add test item(s).
//{@dev
    Valid(Valid.type(items, "Array"), Test_add, "items");
    if (items.length) {
        Valid(items.every(isFunction), Test_add, "items");
    }
    function isFunction(fn) { return typeof fn === "function"; }
//}@dev

    this._items = this._items.concat(items);
    return this;
}

function Test_run(callback) { // @arg Function = null - callback(err:Error)
                              // @ret this
    var that = this;
    var route = "node_1st > browser_1st > worker_1st";

    if (that._both) {
        if (_runOnWorker) {
            route += " > 1000 > swap > node_2nd > browser_2nd";
        } else {
            route += " > 1000 > swap > node_2nd > browser_2nd > worker_2nd";
        }
    }

    Task.run(route, {
        node_1st:    function(task) {    _nodeTestRunner(that, task); },
        browser_1st: function(task) { _browserTestRunner(that, task); },
        worker_1st:  function(task) {  _workerTestRunner(that, task); },
        swap:        function(task) {
            _swap(that);
            task.pass();
        },
        node_2nd:    function(task) {    _nodeTestRunner(that, task); },
        browser_2nd: function(task) { _browserTestRunner(that, task); },
        worker_2nd:  function(task) {  _workerTestRunner(that, task); }
    }, function(err) {
        _undo(that);
        if (callback) {
            callback(err);
        }
    });
    return this;
}

function Test_clone() { // @ret TestItemFunctionArray
    return this._items.slice();
}

function _browserTestRunner(that, task) {
    if (that._browser) {
        if (_runOnBrowser) {
            if (document["readyState"] === "complete") { // already document loaded
                _onload();
            } else {
                global.addEventListener("load", _onload);
            }
            return;
        }
    }
    task.pass();

    function _onload() {
        _testRunner(that, function(err) {
            var order = _order(that);

            if (_stylish) {
                if (err) {
                    console.error("Browser(" + order + ") error.");
                } else {
                    console.log("%cBrowser(" + order + ") ok.%c", "color:#0c0", "");
                }
            } else {
                if (err) {
                    console.error("Browser(" + order + ") error.");
                } else {
                    console.log("Browser(" + order + ") ok.");
                }
            }
            document.body["style"]["backgroundColor"] = err ? "red" : "lime";
            if (that._button) {
                _addTestButtons(that, that._items);
            }
            task.done(err);
        });
    }
}

function _addTestButtons(that, items) { // @arg TestItemFunctionArray
    // add <input type="button" onclick="test()" value="test()" /> buttons
    items.forEach(function(fn, index) {
        var itemName = fn["name"] || (fn + "").split(" ")[1].split("\x28")[0];

        if (!document.querySelector("#" + itemName)) {
            var inputNode = document.createElement("input");
            var nextObject = "{" +
                    "pass:function(){console.log('"   + itemName + " pass');}," +
                    "miss:function(){console.error('" + itemName + " miss');}"  +
                "}";

            inputNode.setAttribute("id", itemName);
            inputNode.setAttribute("type", "button");
            inputNode.setAttribute("value", itemName + "()");
            inputNode.setAttribute("onclick", "ModuleTest" + that._module +
                                              "[" + index + "](" + nextObject + ")");

            document.body.appendChild(inputNode);
        }
    });
}

function _workerTestRunner(that, task) {
    if (that._worker) {
        if (_runOnWorker) {
            if (_testSecondaryModule) {
                _swap(that);
            }
            _testRunner(that, function(err) {
                var order = _order(that);

                if ("console" in global) { // WebWorker console impl?
                    if (err) {
                        console.error("Worker(" + order + ") error.");
                    } else {
                        console.log("Worker(" + order + ") ok.");
                    }
                }
                if (err) {
                    global["errorMessage"] = err.message; // [!] set WorkerGlobal.errorMessage
                }
                if (_testSecondaryModule) {
                    _undo(that);
                }
                task.done(err);
            });
            return;
        } else if (_runOnBrowser) {
            _createWorker(that, task);
            return;
        }
    }
    task.pass();
}

function _nodeTestRunner(that, task) {
    if (that._node) {
        if (_runOnNode) {
            _testRunner(that, function(err) {
                var order = _order(that);

                if (err) {
                    console.error(CONSOLE_COLOR.RED + "Node(" + order + ") error." + CONSOLE_COLOR.CLEAR);
                } else {
                    console.log(CONSOLE_COLOR.GREEN + "Node(" + order + ") ok."    + CONSOLE_COLOR.CLEAR);
                }
                task.done(err);
                if (err) {
                    process.exit(1); // failure ( need Travis-CI )
                }
            });
            return;
        }
    }
    task.pass();
}

// ----------------------------------------------
function Next(task, order, itemName, style) {
    this._task = task;
    this._order = order;
    this._itemName = itemName;
    this._style = style;
}
Next["prototype"]["pass"] = Next_pass;
Next["prototype"]["miss"] = Next_miss;

function Next_pass(message) { // @arg String = ""
    message = message || this._itemName;

    var order = this._order;

    switch (this._style) {
    case "node":    console.log(CONSOLE_COLOR.GREEN + "Node(" + order + "): " + CONSOLE_COLOR.CLEAR + message); break;
    case "worker":  console.log("Worker(" + order + "): " + message); break;
    case "color":   console.log("%cBrowser(" + order + "):%c", "color:#0c0", "", message); break;
    case "browser": console.log("Browser(" + order + "):", message);
    }
    this._task.pass();
}

function Next_miss(message) { // @arg String = ""
    message = message || this._itemName;

    var order = this._order;

    switch (this._style) {
    case "node":    console.error(CONSOLE_COLOR.RED + "Node(" + order + "): " + CONSOLE_COLOR.CLEAR + message); break;
    case "worker":  console.error("Worker(" + order + "): " + message); break;
    case "color":   console.error("%cBrowser(" + order + "):%c", "color:#0c0", "", message); break;
    case "browser": console.error("Browser(" + order + "):", message);
    }
    this._task.miss();
}
// ----------------------------------------------

function _testRunner(that,               // @arg this
                     finishedCallback) { // @arg Function = null
    var items = that._items.slice(); // clone
    var task  = new Task(items.length, _callback, { "tick": _next });
    var style = "";

    if (global["console"]) {
        style = _runOnNode   ? "node"
              : _runOnWorker ? "worker"
              : _stylish     ? "color"
                             : "browser";
    }

    _next();

    function _next() {
        var fn = items.shift();

        if (fn) {
            var order = that._swaped ? "secondary" : "primary";
            var itemName = fn["name"] || (fn + "").split(" ")[1].split("\x28")[0];
            var next = new Next(task, order, itemName, style);

            // function testItem(next) {
            //     if (1) {
            //         next && next.pass();
            //     } else {
            //         next && next.miss();
            //     }
            // }
            if (_runOnNode) {
                try {
                    fn(next);
                } catch (o_O) { // [!] catch uncaught exception
                    next.miss("Catch " + o_O.message + " in " + itemName);
                    throw o_O;
                }
            } else {
                fn(next);
            }
        }
    }
    function _callback(err) {
        if (finishedCallback) {
            finishedCallback(err);
        }
    }
}

function _createWorker(that, task) {
    var src = _createObjectURL("#worker"); // "blob:null/...."

    if (src) {
        var worker = new Worker(src);

        worker.onmessage = function(event) {
            if ( /^blob:/.test(src) ) { // src is objectURL?
                (global["URL"] || global["webkitURL"]).revokeObjectURL(src); // [!] GC
            }
            var errorMessage = event.data.error;

            if (errorMessage) {
                document.body.style.backgroundColor = "red"; // [!] RED screen
            }
            task.done(errorMessage ? new Error(errorMessage) : null);
        };

        var baseDir = location.href.split("/").slice(0, -1).join("/") + "/";

        worker.postMessage({
            "WORKER_ID":    1,
            "REQUEST_ID":   1,
            "INIT":         true,
            "ORIGIN":       location.href,
            "SCRIPT":       [],
            "BASE_DIR":     baseDir,
            "SECONDARY":    that._swaped
        });
    } else {
        task.pass();
    }
}

function _createObjectURL(nodeSelector) {
    var node = document.querySelector(nodeSelector);

    if (node && "Blob" in global) {
        // create Worker from inline <script id="worker" type="javascript/worker"> content
        var blob = new Blob([ node.textContent ], { type: "application/javascript" });

        return (global["URL"] || global["webkitURL"]).createObjectURL(blob);
    }
    return "";
}

function _swap(that) {
    if (that._both) {
        var moduleName = that._module;

        if (!that._swaped) {
            that._swaped = true;
            global["$$$" + moduleName + "$$$"] = global[moduleName];
            global[moduleName] = global[moduleName + "_"]; // swap primary <-> secondary module
        }
    }
}

function _undo(that) {
    if (that._both) {
        var moduleName = that._module;

        if (that._swaped) {
            that._swaped = false;
            global[moduleName] = global["$$$" + moduleName + "$$$"];
            delete global["$$$" + moduleName + "$$$"];
        }
    }
}

function _isConsoleStyleReady() {
    if (global["navigator"]) {
        if ( /Chrome/.test( global["navigator"]["userAgent"] || "" ) ) {
            return true;
        }
    }
    return false;
}

function _order(that) {
    return that._swaped ? "secondary" : "primary";
}

// --- export ----------------------------------------------
if ("process" in global) {
    module["exports"] = Test;
}
global["Test" in global ? "Test_" : "Test"] = Test; // switch module. http://git.io/Minify

})((this || 0).self || global); // WebModule idiom. http://git.io/WebModule

