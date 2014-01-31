new Test().add([
        testOK,
//      testNG,
    ]).run().worker(function(err, test) {
        if (!err) {
//          var undo = Test.swap(Test, Test_);

            new Test(test).run().worker(function(err, test) {
//              undo = Test.undo(undo);
            });
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


