Test.js
=========

Test Runner.

# Document

- https://github.com/uupaa/Test.js/wiki/Test

and

- https://github.com/uupaa/WebModule and [slide](http://uupaa.github.io/Slide/slide/WebModule/index.html)
- https://github.com/uupaa/Help.js and [slide](http://uupaa.github.io/Slide/slide/Help.js/index.html)

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

# for Developers

1. Install development dependency tools

    ```sh
    $ brew install closure-compiler
    $ brew install node
    $ npm install -g plato
    ```

2. Clone Repository and Install

    ```sh
    $ git clone git@github.com:uupaa/Test.js.git
    $ cd Test.js
    $ npm install
    ```

3. Build and Minify

    `$ npm run build`

4. Test

    `$ npm run test`

5. Lint

    `$ npm run lint`


