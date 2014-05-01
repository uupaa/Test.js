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
function Test(param) { // @arg Object: { worker, swap, button, source, runtime }
                       //     param.worker  - Boolean(= false): enable WebWorker test.
                       //     param.swap    - Boolean(= false): enable Runtime swap test.
                       //     param.button  - Boolean(= false): disable test button.
                       //     param.source  - Function: source module. eg. global["Valid"]
                       //     param.runtime - Function: runtime module. eg: global["Valid_"]
    if (!param || param.constructor !== ({}).constructor) {
        throw new TypeError("Test(param is not Object)");
    }
    this._items   = []; // test items.
    this._swaped  = false;
    this._worker  = param["worker"]  || false;
    this._swap    = param["swap"]    || false;
    this._button  = param["button"]  || false;
    this._source  = param["source"]  || null;
    this._runtime = param["runtime"] || null;

    if (!this._source) {
        throw new TypeError("Test(param.source is null)");
    }
}

Test["repository"] = "https://github.com/uupaa/Test.js";

Test["prototype"]["add"]        = Test_add;         // Test#add(items:TestItemFunctionArray):this
Test["prototype"]["run"]        = Test_run;         // Test#run(callback:Function = null):this
Test["prototype"]["worker"]     = Test_worker;      // Test#worker(callback:Function = null):this
Test["prototype"]["hasRuntime"] = Test_hasRuntime;  // Test#hasRuntime():Boolean
// --- swap Source <-> Runtime ---
Test["prototype"]["swap"]       = Test_swap;        // Test#swap():this
Test["prototype"]["undo"]       = Test_undo;        // Test#undo():this

// --- implement -------------------------------------------
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

function Test_run(callback) { // @arg Function(= null): callback(err:Error, test:Test)
//{@assert
    _if(!Valid.type(callback, "Function/omit"), "Test#run(callback)");
//}@assert

    var that = this;

    if (_inBrowser) {
        _setUncaughtExceptionHandler();
        if (document["readyState"] === "complete") { // already document loaded
            _onload();
        } else {
            global.addEventListener("load", _onload);
        }

    } else if (_inNode) {
        _run(that, function(err) {
            if (err) {
                console.error(_CONSOLE_COLOR.RED + "Node error." + _CONSOLE_COLOR.CLEAR);
            } else {
                console.log(_CONSOLE_COLOR.GREEN + "Node ok."    + _CONSOLE_COLOR.CLEAR);
            }
            if (callback) {
                callback(err, that);
            }
            if (err) {
                process.exit(1); // failure ( need Travis-CI )
            }
        });
    } else if (_inWorker) {
        _run(that, function(err) {
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
            if (callback) {
                callback(err, that);
            }
        });
    }
    return this;

    function _onload() {
        _run(that, function(err) {
            if (err) {
                console.error("Browser error.");
            } else {
                console.log("Browser ok.");
            }
            document.body["style"]["backgroundColor"] = err ? "red"
                                                            : "lime";
            if (that._button) {
                _addTestItemButtons(that._items);
            }

            if (callback) {
                callback(err, that);
            }
        });
    }
}

function _setUncaughtExceptionHandler() {
    global.addEventListener("error", function(event) { // message, lineno, filename
        document.body["style"]["backgroundColor"] = "red";
    });
}

function _addTestItemButtons(items) { // @arg TestItemFunctionArray:
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

function _run(that, finished) { // @are Function(= null):
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

function Test_worker(callback,  // @arg Function(= null): callback(err:Error, test:Test)
                     options) { // @arg Object(= null): { type, src }
                                //      options.type(= "inline") - String: "inline" or "url"
                                //      options.src(= "#worker") - String: node-id or url
//{@assert
    _if(!Valid.type(callback, "Function/omit"), "Test#worker(callback)");
    _if(!Valid.type(options, "Object/omit", "type,src"), "Test#worker(,options)");
    if (options) {
        if ("type" in options) {
            _if(!/^(inline|url)$/.test(options.type), "Test#worker(,options.type)");
        }
        if ("src"  in options) {
            _if(!Valid.type(options.src, "String"), "Test#worker(,options.src)");
        }
    }
//}@assert

    if (_inWorker || !("Worker" in global) || !this._worker) {
        if (callback) {
            callback(null, this);
        }
        return;
    }

    options = options || {};
    var that = this;
    var type = options.type || "inline";
    var src  = options.src  || "#worker";

    if (type === "inline") {
        src = _createObjectURL(src); // "blob:null/...."
    }
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
            if (callback) {
                callback(errorMessage ? new Error(errorMessage) : null, that);
            }
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
        if (callback) {
            callback(null, that);
        }
    }
    return this;
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

function Test_swap() { // @ret this:
                       // @help: Test#swap
    if (this._swap && this.hasRuntime()) {
        var source = this._source["name"] || "";

        if (!this._swaped) {
            this._swaped = true;
            global["$$$" + source + "$$$"] = this._source;
            global[source] = this._runtime; // swap module
        }
    }
    return this;
}

function Test_undo() { // @ret this:
                       // @help: Test#undo
    if (this._swap && this.hasRuntime()) {
        var source = this._source["name"] || "";

        if (this._swaped) {
            this._swaped = false;
            global[source] = global["$$$" + source + "$$$"]
            delete global["$$$" + source + "$$$"]
        }
    }
    return this;
}

function Test_hasRuntime() { // @ret Boolean: has runtime
                             // @help: Test#hasRuntime
    return !!this._runtime;
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

