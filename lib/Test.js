// @name: Test.js
// @require: Valid.js, Task.js
// @cutoff: @assert @node

(function(global) {
"use strict";

// --- variable --------------------------------------------
//{@assert
var Valid = global["Valid"] || require("uupaa.valid.js");
//}@assert

var Task = global["Task"] || require("uupaa.task.js");

var _inNode     = "process"        in global;
var _inWorker   = "WorkerLocation" in global;
var _inBrowser  = "document"       in global;

// --- define ----------------------------------------------
var _CONSOLE_COLOR = {
        RED:    "\u001b[31m",
        YELLOW: "\u001b[33m",
        GREEN:  "\u001b[32m",
        CLEAR:  "\u001b[0m"
    };

// --- interface -------------------------------------------
function Test(param) { // @arg Object: { disable, browser, worker, node, button, both, primary, secondary }
                       //     param.disable - Boolean(= false): disable test.
                       //     param.browser - Boolean(= false): enable Browser test.
                       //     param.worker  - Boolean(= false): enable WebWorker test.
                       //     param.node    - Boolean(= false): enable Node.js test.
                       //     param.both    - Boolean(= false): enable test primary and secondary.
                       //     param.button  - Boolean(= false): enable test button.
                       //     param.primary  - Function: primary module(source). eg. global["Valid"]
                       //     param.secondary - Function: secondary module(runtime). eg: global["Valid_"]
    if (!param || param.constructor !== ({}).constructor) {
        throw new TypeError("Test(param is not Object)");
    }
    this._items  = []; // test items.
    this._param  = param || {};
    this._swaped = false;

    if (!this._param["primary"]) {
        throw new TypeError("Test(param.primary is null)");
    }
    if (_inBrowser) {
        _setUncaughtExceptionHandler();
    }
}

Test["repository"] = "https://github.com/uupaa/Test.js";

Test["prototype"]["add"] = Test_add; // Test#add(items:TestItemFunctionArray):this
Test["prototype"]["run"] = Test_run; // Test#run(callback:Function = null):this

// --- implement -------------------------------------------
function _setUncaughtExceptionHandler() {
    global.addEventListener("error", function(event) { // message, lineno, filename
        document.body["style"]["backgroundColor"] = "red";
    });
}

function Test_add(items) { // @arg TestItemFunctionArray: test items. [fn, ...]
                           // @help: Test#add
                           // @desc: add test item(s).
//{@assert
    _if(!Valid.type(items, "Array"), "Test#add(items)");
    if (items.length) {
        _if(items.every(isFunction) === false, "Test#add(items)");
    }
    function isFunction(fn) { return typeof fn === "function"; }
//}@assert

    this._items = this._items.concat(items);
    return this;
}

function Test_run(callback) { // @arg Function(= null): callback(err:Error)
                              // @help: Test.run
    var that = this;

    var route = "node_1st > browser_1st > worker_1st";

    if (that._param["secondary"]) {
        route += "> 1000 > swap > node_2nd > browser_2nd > worker_2nd > undo";
    }

    Task.run(route, {
        node_1st:    function(task) {    _node(that, task); },
        browser_1st: function(task) { _browser(that, task); },
        worker_1st:  function(task) {  _worker(that, task); },
        swap:        function(task) {    _swap(that, task); },
        node_2nd:    function(task) {    _node(that, task); },
        browser_2nd: function(task) { _browser(that, task); },
        worker_2nd:  function(task) {  _worker(that, task); },
        undo:        function(task) {    _undo(that, task); }
    }, function(err) {
        if (callback) {
            callback(err);
        }
    });
}

function _browser(that, task) {
    if (!that._param["disable"]) {
        if (that._param["browser"]) {
            if (_inBrowser) {
                if (document["readyState"] === "complete") { // already document loaded
                    _onload();
                } else {
                    global.addEventListener("load", _onload);
                }
                return;
            }
        }
    }
    task.pass();

    function _onload() {
        _runTest(that, function(err) {
            if (err) {
                console.error("Browser error.");
            } else {
                console.log("Browser ok.");
            }
            document.body["style"]["backgroundColor"] = err ? "red" : "lime";
            if (that._param["button"]) {
                _addTestButtons(that._items);
            }
            task.done(err);
        });
    }
}

function _addTestButtons(items) { // @arg TestItemFunctionArray:
    // add <input type="button" onclick="test()" value="test()" /> buttons
    items.forEach(function(fn, index) {
        var itemName = fn["name"];

        if (!document.querySelector("#" + itemName)) {
            var inputNode = document.createElement("input");

            inputNode.setAttribute("id", itemName);
            inputNode.setAttribute("type", "button");
            inputNode.setAttribute("value", itemName + "()");
            inputNode.setAttribute("onclick", "ModuleTest[" + index + "]()");

            document.body.appendChild(inputNode);
        }
    });
}

function _worker(that, task) {
    if (!that._param["disable"]) {
        if (that._param["worker"]) {
            if (_inWorker) {
                _runTest(that, function(err) {
                    if ("console" in global) { // WebWorker console impl?
                        if (err) {
                            console.error("Worker error.");
                        } else {
                            console.log("Worker ok.");
                        }
                    }
                    if (err) {
                        global["errorMessage"] = err.message; // [!] set WorkerGlobal.errorMessage
                    }
                    task.done(err);
                });
            } else if (_inBrowser) {
                _createWorker(that, task);
            }
            return;
        }
    }
    task.pass();
}

function _node(that, task) {
    if (!that._param["disable"]) {
        if (that._param["node"]) {
            if (_inNode) {
                _runTest(that, function(err) {
                    if (err) {
                        console.error(_CONSOLE_COLOR.RED + "Node error." + _CONSOLE_COLOR.CLEAR);
                    } else {
                        console.log(_CONSOLE_COLOR.GREEN + "Node ok."    + _CONSOLE_COLOR.CLEAR);
                    }
                    task.done(err);
                    if (err) {
                        process.exit(1); // failure ( need Travis-CI )
                    }
                });
                return;
            }
        }
    }
    task.pass();
}

function _runTest(that, finished) { // @are Function(= null):
    var items = that._items.slice(); // clone
    var task = new Task(items.length, _callback, { "tick": _next });

    _next();

    function _next() {
        var fn = items.shift();

        if (fn) {
            fn(task);
        }
    }
    function _callback(err) {
        if (finished) {
            finished(err);
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
            "BASE_DIR":     baseDir
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

function _swap(that, task) {
    if (that._param["swap"] && that._param["secondary"]) {
        var primary = that._param["primary"];
        var name = primary["name"] || "";

        if (!that._swaped) {
            that._swaped = true;
            global["$$$" + name + "$$$"] = primary;
            global[name] = that._param["secondary"]; // swap module
        }
    }
    task.pass();
}

function _undo(that, task) {
    if (that._param["swap"] && that._param["secondary"]) {
        var primary = that._param["primary"];
        var name = primary["name"] || "";

        if (that._swaped) {
            that._swaped = false;
            global[name] = global["$$$" + name + "$$$"]
            delete global["$$$" + name + "$$$"]
        }
    }
    task.pass();
}

//{@assert
function _if(value, msg) {
    if (value) {
        console.error(Valid.stack(msg));
        throw new Error(msg);
    }
}
//}@assert

// --- export ----------------------------------------------
//{@node
if (_inNode) {
    module["exports"] = Test;
}
//}@node
if (global["Test"]) {
    global["Test_"] = Test; // already exsists
} else {
    global["Test"]  = Test;
}

})((this || 0).self || global);

