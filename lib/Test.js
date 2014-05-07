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

var _inNode    = "process"        in global;
var _inWorker  = "WorkerLocation" in global;
var _inBrowser = "document"       in global;
var _stylish   = _isConsoleStyleReady();
var _testSecondaryModule = !!(global["MESSAGE"] || 0)["SECONDARY"];

// --- define ----------------------------------------------
var _CONSOLE_COLOR = {
        RED:    "\u001b[31m",
        YELLOW: "\u001b[33m",
        GREEN:  "\u001b[32m",
        CLEAR:  "\u001b[0m"
    };

// --- interface -------------------------------------------
function Test(moduleName, // @arg String: target module.
              param) {    // @arg Object(= {}): { disable, browser, worker, node, button, both }
                          //     param.disable   - Boolean(= false): Disable all tests.
                          //     param.browser   - Boolean(= false): Enable the browser test.
                          //     param.worker    - Boolean(= false): Enable the webWorker test.
                          //     param.node      - Boolean(= false): Enable the node.js test.
                          //     param.button    - Boolean(= false): Show test buttons.
                          //     param.both      - Boolean(= false): Test the primary and secondary module.
                          // @help: Test
//{@assert
    _if(!Valid.type(param, "Object", "disable,browser,worker,node,button,both"), Test, "param");
//}@assert

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

    if (_inBrowser) {
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

function Test_add(items) { // @arg TestItemFunctionArray: test items. [fn, ...]
                           // @help: Test#add
                           // @desc: add test item(s).
//{@assert
    _if(!Valid.type(items, "Array"), Test_add, "items");
    if (items.length) {
        _if(items.every(isFunction) === false, Test_add, "items");
    }
    function isFunction(fn) { return typeof fn === "function"; }
//}@assert

    this._items = this._items.concat(items);
    return this;
}

function Test_run(callback) { // @arg Function(= null): callback(err:Error)
                              // @ret this:
                              // @help: Test.run
    var that = this;
    var route = "node_1st > browser_1st > worker_1st";

    if (that._both) {
        if (_inWorker) {
            route += " > 1000 > swap > node_2nd > browser_2nd";
        } else {
            route += " > 1000 > swap > node_2nd > browser_2nd > worker_2nd";
        }
    }

    Task.run(route, {
        node_1st:    function(task) {    _node(that, task); },
        browser_1st: function(task) { _browser(that, task); },
        worker_1st:  function(task) {  _worker(that, task); },
        swap:        function(task) {
            _swap(that);
            task.pass();
        },
        node_2nd:    function(task) {    _node(that, task); },
        browser_2nd: function(task) { _browser(that, task); },
        worker_2nd:  function(task) {  _worker(that, task); }
    }, function(err) {
        _undo(that);
        if (callback) {
            callback(err);
        }
    });
    return this;
}

function Test_clone() { // @ret TestItemFunctionArray:
                        // @help: Test#clone
    return this._items.slice();
}

function _browser(that, task) {
    if (that._browser) {
        if (_inBrowser) {
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

function _addTestButtons(that, items) { // @arg TestItemFunctionArray:
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

function _worker(that, task) {
    if (that._worker) {
        if (_inWorker) {
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
        } else if (_inBrowser) {
            _createWorker(that, task);
            return;
        }
    }
    task.pass();
}

function _node(that, task) {
    if (that._node) {
        if (_inNode) {
            _testRunner(that, function(err) {
                var order = _order(that);

                if (err) {
                    console.error(_CONSOLE_COLOR.RED + "Node(" + order + ") error." + _CONSOLE_COLOR.CLEAR);
                } else {
                    console.log(_CONSOLE_COLOR.GREEN + "Node(" + order + ") ok."    + _CONSOLE_COLOR.CLEAR);
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

function _testRunner(that, finishedCallback) { // @are Function(= null):
    var items = that._items.slice(); // clone
    var task = new Task(items.length, _callback, { "tick": _next });

    _next();

    function _next() {
        var fn = items.shift();

        if (fn) {
            var order = that._swaped ? "secondary" : "primary";
            var nextObject = {};
            var itemName = fn["name"] || (fn + "").split(" ")[1].split("\x28")[0];

            // function testModuleName_xxx(next) {
            //     if (1) {
            //         next && next.pass();
            //     } else {
            //         next && next.miss();
            //     }
            // }

            nextObject["pass"] = function() {
                _passLogger(order, itemName);
                nextObject = null;
                task.pass();
            };
            nextObject["miss"] = function() {
                _missLogger(order, itemName);
                nextObject = null;
                task.miss();
            };
            fn(nextObject);
        }
    }
    function _callback(err) {
        if (finishedCallback) {
            finishedCallback(err);
        }
    }
}

function _passLogger(order, itemName) {
    if (global["console"] && global["console"]["log"]) {
        if (_inNode) {
            console.log(_CONSOLE_COLOR.GREEN + "Node(" + order + "): " + _CONSOLE_COLOR.CLEAR + itemName);
        } else if (_inWorker) {
            console.log("Worker(" + order + "): " + itemName);
        } else if (_inBrowser) {
            if (_stylish) {
                console.log("%cBrowser(" + order + "):%c", "color:#0c0", "", itemName);
            } else {
                console.log("Browser(" + order + "):", itemName);
            }
        }
    }
}

function _missLogger(order, itemName) {
    if (global["console"] && global["console"]["error"]) {
        if (_inNode) {
            console.log(_CONSOLE_COLOR.RED + "Node(" + order + "): " + _CONSOLE_COLOR.CLEAR + itemName);
        } else if (_inWorker) {
            console.error("Worker(" + order + "): " + itemName);
        } else if (_inBrowser) {
            if (_stylish) {
                console.error("%cBrowser(" + order + "):%c", "color:red", "", itemName);
            } else {
                console.error("Browser(" + order + "):", itemName);
            }
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

//{@assert
function _if(value, fn, hint) {
    if (value) {
        var msg = fn.name + " " + hint;

        console.error(Valid.stack(msg));
        if (global["Help"]) {
            global["Help"](fn, hint);
        }
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
    global["Test_"] = Test; // secondary
} else {
    global["Test"]  = Test; // primary
}

})((this || 0).self || global);

