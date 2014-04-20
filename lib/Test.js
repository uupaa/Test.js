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
function Test(test) { // @arg Test(= null): test instance.
    // test item db. { item-name: fn, ... }
    this._items = test ? test["clone"]()  // copy constructor.
                       : {};              // empty.
}

Test["repository"] = "https://github.com/uupaa/Test.js";

// --- swap Object <-> Object _ ---
Test["swap"]                = Test_swap;   // Test.swap(module1:Object/Function, module2:Object/Function):ModuleNameString
Test["undo"]                = Test_undo;   // Test.undo(moduleName:String):void

Test["prototype"]["add"]    = Test_add;    // Test#add(items:FunctionArray):this
Test["prototype"]["run"]    = Test_run;    // Test#run(callback:Function = null):this
Test["prototype"]["clone"]  = Test_clone;  // Test#clone():NameStringAdnFunctionObject
Test["prototype"]["worker"] = Test_worker; // Test#worker(callback:Function = null):this

// --- implement -------------------------------------------
function Test_add(items) { // @arg FunctionArray: test items. [function, ...]
                           // @help: Test#add
                           // @desc: add test item(s).
//{@assert
    _if(!Valid.type(items, "Array"),       "Test#add(items)");
    if (items.length) {
        _if(!Valid.type(items[0], "Function"), "Test#add(items)");
    }
//}@assert

    var that = this;

    items.forEach(function(fn) {
        that._items[fn.name] = fn;
    });
    return this;
}

function Test_clone() { // @ret NameStringAdnFunctionObject: test items. { name: function, ... }
                        // @help: Test#clone
                        // @desc: clone test item(s).
    var rv = {};

    for (var name in this._items) {
        rv[name] = this._items[name];
    }
    return rv;
}

function Test_run(callback) { // @arg Function(= null): callback(err:Error, test:Test)
//{@assert
    _if(!Valid.type(callback, "Function/omit"), "Test#run(callback)");
//}@assert

    var that = this;

    if (_inBrowser) {
        _addErrorHandler();
        if (document.readyState === "complete") { // already document loaded
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
                process.exit(1); // failure
            }
        });
    } else if (_inWorker) {
        _run(that, function(err) {
            if ("console" in global) {
                if (err) {
                    console.error("Worker error.");
                } else {
                    console.log("Worker ok.");
                }
            }
            if (err) {
                global["errorMessage"] = err.message; // [!] WorkerLocation.error = "error..."
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
            document.body.style.backgroundColor = err ? "red"
                                                      : "lime";
            _addButtons(that._items);

            if (callback) {
                callback(err, that);
            }
        });
    }
}

function _addErrorHandler() {
    global.addEventListener("error", function(event) { // message, lineno, filename
        document.body.style.backgroundColor = "red";
    });
}

function _addButtons(items) {
    // add <input type="button" onclick="test()" value="test()" /> buttons
    Object.keys(items).forEach(function(itemName) {
        if (!document.querySelector("#" + itemName)) {
            var inputNode = document.createElement("input");

            inputNode.setAttribute("id", itemName);
            inputNode.setAttribute("type", "button");
            inputNode.setAttribute("value", itemName + "()");
            inputNode.setAttribute("onclick", itemName + "()");

            document.body.appendChild(inputNode);
        }
    });
}

function _run(that, finished) { // @are Function(= null):
    var itemNames = Object.keys(that._items);
    var itemFunctions = itemNames.map(function(itemName) {
                return that._items[itemName];
            });
    var task = new Task(itemFunctions.length, _callback, { "tick": _next });

    _next();

    function _next() {
        var fn = itemFunctions.shift();

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

    if (_inWorker || !("Worker" in global)) {
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
            "baseDir":      baseDir,
            "href":         location.href
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

function Test_swap(module1,   // @arg Object/Function: module1 object.
                   module2) { // @arg Object/Function: module2 object.
                              // @ret ModuleNameString: module name.
//{@assert
    _if(!Valid.type(module1, "Object/Function"), "Test#swap(module1)");
    _if(!Valid.type(module2, "Object/Function"), "Test#swap(,module2)");
//}@assert

    var name = module1.name || "";

    if (global["$" + name]) { // window.$module exists?
        // swaped
    } else {
        global["$" + name] = module1;
        global[name] = module2; // swap module
    }
    return name;
}

function Test_undo(name) { // @arg String: module name.
    if (global["$" + name]) {
        global[name] = global["$" + name];
        delete global["$" + name];
    }
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

