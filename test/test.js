var ModuleTestTest = (function(global) {

var _inNode    = "process"        in global;
var _inWorker  = "WorkerLocation" in global;
var _inBrowser = "document"       in global;

return new Test("Test", {
        disable:    false,
        browser:    true,
        worker:     true,
        node:       true,
        button:     true,
        both:       true,
    }).add([
        pass,
//        miss,
//        error,
    ]).run().clone();

function pass(next) {
    next && next.pass();
}

function miss(next) {
    next && next.miss();
}

function error(next) {
    throw new Error();
}

})((this || 0).self || global);

