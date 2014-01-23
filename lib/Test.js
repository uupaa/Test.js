// @name: Test.js

/*
    new Test().add([
        testCase1,
        testCase2,
    ]).run().worker(function(err, test) {
        if (!err) {
            Xxx = Xxx_;
            new Test(test).run().worker();
        }
    });
 */

(function(global) {

// --- define ----------------------------------------------
var CONSOLE_COLOR = {
        RED:    "\u001b[31m",
        YELLOW: "\u001b[33m",
        GREEN:  "\u001b[32m",
        CLEAR:  "\u001b[0m"
    };

// --- variable --------------------------------------------
var _inNode     = "process"        in global;
var _inWorker   = "WorkerLocation" in global;
var _inBrowser  = "document"       in global;
var _hasConsole = "console"        in global;

// --- interface -------------------------------------------
function Test(test) { // @arg Test(= null): base test item.
    // test item db. { item-name: fn, ... }
    this["_items"] = test ? test.clone()  // copy constructor.
                          : {};           // empty.
}
Test["name"] = "Test";
Test["repository"] = "https://github.com/uupaa/Test.js";

Test["prototype"]["add"]    = Test_add;    // Test#add(items:FunctionArray):this
Test["prototype"]["clone"]  = Test_clone;  // Test#clone():NameStringAdnFunctionObject
Test["prototype"]["run"]    = Test_run;    // Test#run(callback:Function = null):this
Test["prototype"]["worker"] = Test_worker; // Test#worker(callback:Function = null):this

// --- implement -------------------------------------------
function Test_add(items) { // @arg FunctionArray: test items. [function, ...]
                           // @help: Test#add
                           // @desc: add test item(s).
//{@assert
    _if(!Array.isArray(items), "invalid Test#add(items)");
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
    callback && _if(typeof callback !== "function", "invalid Test#run(callback)");
//}@assert

    var that = this;

    if (_inBrowser) {
        _addErrorHandler();
        if (document.readyState === "complete") { // already document loaded
            _onload();
        } else {
            global.addEventListener("load", _onload);
        }

        function _onload() {
            _run(that, function(err) {
                err ? console.error("Browser error.")
                    :   console.log("Browser ok.");

                document.body.style.backgroundColor = err ? "red" : "lime";
                _addButtons(that._items);

                callback && callback(err, that);
            });
        }

    } else if (_inNode) {
        _run(that, function(err) {
            err ? console.error(CONSOLE_COLOR.RED   + "Node error." + CONSOLE_COLOR.CLEAR)
                :   console.log(CONSOLE_COLOR.GREEN + "Node ok."    + CONSOLE_COLOR.CLEAR);

            callback && callback(err, that);
        });
    } else if (_inWorker) {
        _run(that, function(err) {
            if (_hasConsole) {
                err ? console.error("Worker error.")
                    :   console.log("Worker ok.");
            }
            err && (global["errorMessage"] = err.message); // [!] WorkerLocation.error = "error..."

            callback && callback(err, that);
        });
    }
    return this;
}

function _addErrorHandler() {
    global.addEventListener("error", function(message, lineno, filename) {
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
    var task = new Task(itemFunctions.length, _callback, "", _next);

    _next();

    function _next() {
        var fn = itemFunctions.shift();

        fn && fn(task);
    }
    function _callback(err, args) {
        finished && finished(err);
    }
}

function Test_worker(callback) { // @arg Function(= null): callback(err:Error, test:Test)
//{@assert
    callback && _if(typeof callback !== "function", "invalid Test#runWorker(,callback)");
//}@assert

    if (_inWorker) {
        callback && callback(null, this);
        return;
    }

    var that = this;

    if ("Worker" in global && "Blob" in global) {

        // create Worker from inline <script id="worker" type="javascript/worker"> content
        var blob    = new Blob([ document.querySelector("#worker").textContent ],
                               { type: "application/javascript" });
        var worker  = new Worker( (URL || webkitURL).createObjectURL(blob) );
        var baseDir = _getDir(location.href);

        worker.onmessage = function(event) {
            var errorMessage = event.data.error;

            if (errorMessage) {
                document.body.style.backgroundColor = "red";
            }
            callback && callback(errorMessage ? new Error(errorMessage)
                                              : null, that);
        };
        worker.postMessage({ baseDir: baseDir });
    } else {
        callback && callback(null, that);
    }
    return this;
}

function _getDir(path) {
    var ary = path.split("/");

    ary.pop(); // chomp "file.ext"
    return ary.join("/") + "/";
}

//{@assert
function _if(booleanValue, errorMessageString) {
    if (booleanValue) {
        throw new Error(errorMessageString);
    }
}
//}@assert

// --- export ----------------------------------------------
if (_inNode) {
    module["exports"] = Test;
}
global["Test"] = Test;

})(this.self || global);

