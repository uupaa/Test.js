// @name: Test.js

/*
    new Test().add([
        testCase1,
        testCase2,
    ]).run().worker();
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
function Test() {
    this["_items"] = {}; // db. { item-name: fn, ... }
}
Test["name"] = "Test";
Test["repository"] = "https://github.com/uupaa/Test.js";

Test["prototype"]["add"]    = Test_add;    // Test#add(items:FunctionArray):this
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

function Test_run(callback) { // @arg Function(= null): callback(err:Error)
//{@assert
    if (callback) {
        _if(typeof callback !== "function", "invalid Test#run(callback)");
    }
//}@assert

    var that = this;

    if (_inBrowser) {
        global.addEventListener("load", function() {
            // --- add <input type="button" onclick="test()" value="test()" /> buttons ---
            Object.keys(that._items).forEach(function(itemName) {
                var inputNode = document.createElement("input");

                inputNode.setAttribute("type", "button");
                inputNode.setAttribute("value", itemName + "()");
                inputNode.setAttribute("onclick", itemName + "()");

                document.body.appendChild(inputNode);
            });
            // --- error handler ---
            global.addEventListener("error", function(message, lineno, filename) {
                document.body.style.backgroundColor = "red";
            });

            console.log("--- in Browser ---");
            _run(that, function(err) {
                if (_hasConsole) {
                    err ? console.error("Browser error.")
                        :   console.log("Browser ok.");
                }
                document.body.style.backgroundColor = err ? "red" : "lime";

                callback && callback(err);
            });
        });
    } else if (_inNode) {
        console.log("--- in Node.js ---");
        _run(that, function(err) {
            err ? console.error(CONSOLE_COLOR.RED   + "Node error." + CONSOLE_COLOR.CLEAR)
                :   console.log(CONSOLE_COLOR.GREEN + "Node ok."    + CONSOLE_COLOR.CLEAR);

            callback && callback(err);
        });
    } else if (_inWorker) {
        console.log("--- in Worker ---");
        _run(that, function(err) {
            if (_hasConsole) {
                err ? console.error("Worker error.")
                    :   console.log("Worker ok.");
            }
            if (err) {
                global["errorMessage"] = err.message; // [!] WorkerLocation.error = "error..."
            }

            callback && callback(err);
        });
    }
    return this;
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

function Test_worker(callback) { // @arg Function(= null): callback(err:Error)
//{@assert
    callback && _if(typeof callback !== "function", "invalid Test#runWorker(,callback)");
//}@assert

    if (_inWorker) {
        callback && callback(null);
        return;
    }

    var that = this;

    if ("Worker" in global && "Blob" in global) {
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
                                              : null);
        };
        worker.postMessage({ baseDir: baseDir });
    } else {
        callback && callback(null);
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

