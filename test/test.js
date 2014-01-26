new Test().add([
        testOK,
//      testNG,
    ]).run().worker(function(err, test) {
        if (!err && typeof Test_ !== "undefined") {
            Test = Test_;
            new Test(test).run().worker();
        }
    });

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


