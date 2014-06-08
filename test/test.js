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
 //ok       testPass0Arg,
        testPass1Arg,
        testPass3Arg,
 //ok       testMiss,
 //ok       testError,
    ]).run().clone();

function testPass0Arg() {
}

function testPass1Arg(test) {
    test.pass(1, 2);
}

function testPass3Arg(test, pass, miss) {
    test.done(pass(1, 2));
}

function testMiss(task, pass, miss) {
    //miss();
    //test.miss();
    task.done(miss(1, 2));
}

function testError(task, pass, miss) {
    miss();
    throw new Error();
}

})((this || 0).self || global);

