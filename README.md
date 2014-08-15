# Test.js [![Build Status](https://travis-ci.org/uupaa/Test.js.png)](http://travis-ci.org/uupaa/Test.js)

[![npm](https://nodei.co/npm/uupaa.test.js.png?downloads=true&stars=true)](https://nodei.co/npm/uupaa.test.js/)

Test Runner.

## Document

- [Test.js wiki](https://github.com/uupaa/Test.js/wiki/Test)
- [Development](https://github.com/uupaa/WebModule/wiki/Development)
- [WebModule](https://github.com/uupaa/WebModule)
    - [Slide](http://uupaa.github.io/Slide/slide/WebModule/index.html)
    - [Development](https://github.com/uupaa/WebModule/wiki/Development)


## How to use

### Browser

```js
<script src="lib/Test.js">
<script>

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

### WebWorkers

```js
importScripts("lib/Test.js");

    ...
```

### Node.js

```js
var Test = require("lib/Test.js");

    ...
```
