new Test().add([
        testOK,
//      testNG,
    ]).run(function(err, test) {
        if (1) {
            err || test.worker(function(err, test) {
                if (!err && typeof Test_ !== "undefined") {
//                  var name = Test.swap(Test, Test_);

                    new Test(test).run().worker(function(err, test) {
//                      Test.undo(name);
                    });
                }
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


