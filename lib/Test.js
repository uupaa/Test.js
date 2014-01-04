// @name: Test.js

/*
    new Test().add([
        testCase1,
        testCase2,
    ]).run();
 */

(function(global) {

// --- define ----------------------------------------------
// --- variable --------------------------------------------
// --- interface -------------------------------------------
function Test() {
    this._items = {}; // db. { item-name: fn, ... }
}
Test.name = "Test";
Test.repository = "https://github.com/uupaa/Test.js";

Test.prototype.add = Test_add; // Test#add(items:FunctionArray):this
Test.prototype.run = Test_run; // Test#run(callback:Function = null):this

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

    if (typeof document !== "undefined") {
        window.addEventListener("load", function() {
            // --- add <input type="button" onclick="test()" value="test()" /> buttons ---
            Object.keys(that._items).forEach(function(itemName) {
                var inputNode = document.createElement("input");

                inputNode.setAttribute("type", "button");
                inputNode.setAttribute("value", itemName + "()");
                inputNode.setAttribute("onclick", itemName + "()");

                document.body.appendChild(inputNode);
            });
            // --- error handler ---
            window.addEventListener("error", function(message, lineno, filename) {
                document.body.style.backgroundColor = "red";
            });

            _run(that, function(err) {
                document.body.style.backgroundColor = err ? "red" : "lime";

                callback && callback(err);
            });
        });
    } else {
        _run(that, function(err) {
            var color = { // console color
                    RED:    '\u001b[31m', YELLOW: '\u001b[33m',
                    GREEN:  '\u001b[32m', CLR:    '\u001b[0m'
                };

            err ? console.log(color.RED   + "error." + color.CLR)
                : console.log(color.GREEN + "ok."    + color.CLR);

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
        err ? console.log("Test#run fail.")
            : console.log("Test#run success.");
        finished && finished(err);
    }
}

//{@assert
function _if(booleanValue, errorMessageString) {
    if (booleanValue) {
        throw new Error(errorMessageString);
    }
}
//}@assert

// --- export ----------------------------------------------
if (global.process) { // node.js
    module.exports = Test;
}
global.Test = Test;

})(this.self || global);

