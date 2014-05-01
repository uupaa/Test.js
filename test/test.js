var ModuleTest = (function(global) {

var testParam = {
        disable:    false,
        node:       true,
        browser:    true,
        worker:     true,
        button:     true,
        both:       false,
        primary:    global["Test"],
        secondary:  global["Test_"],
    };

var items = [
        testOK,
      //testNG,
    ];

new Test(testParam).add(items).run();

function testOK(next) {

    if (1) {
        console.log("testOK ok");
        next && next.pass();
    } else {
        console.log("testOK ng");
        next && next.miss();
    }
}

function testNG(next) {

    if (0) {
        console.log("testNG ok");
        next && next.pass();
    } else {
        console.log("testNG ng");
        next && next.miss();
    }
}

return items;
})((this || 0).self || global);

