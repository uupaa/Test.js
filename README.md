=========
Test.js
=========

![](https://travis-ci.org/uupaa/Test.js.png)

Test Runner.

# Document

- [Test.js wiki](https://github.com/uupaa/Test.js/wiki/Test)
- [Development](https://github.com/uupaa/WebModule/wiki/Development)
- [WebModule](https://github.com/uupaa/WebModule) ([Slide](http://uupaa.github.io/Slide/slide/WebModule/index.html))


# How to use

```js
<script src="lib/Test.js">
<script>
// for Browser

    new Test().add([
        testCase1,
        testCase2,
    ]).run(function(err, test) {
        if (1) {
            err || test.worker(function(err, test) {
                if (!err && typeof Module_ !== "undefined") {
                    var name = Test.swap(Module, Module_);

                    new Test(test).run(function(err, test) {
                        Test.undo(name);
                    });
                }
            });
        }
    });

</script>
```

```js
// for WebWorkers
importScripts("lib/Test.js");

    ...
```

```js
// for Node.js
var Test = require("lib/Test.js");

    ...
```
