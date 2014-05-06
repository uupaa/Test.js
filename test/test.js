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
        testOK,
      //testNG,
    ]).run().clone();

function testOK(next) {

    if (1) {
        next && next.pass();
    } else {
        next && next.miss();
    }
}

function testNG(next) {

    if (0) {
        next && next.pass();
    } else {
        next && next.miss();
    }
}

})((this || 0).self || global);

