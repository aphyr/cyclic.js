# Usage

``` js
// This array holds a window of 10 elements, from 0 to 9.
a = new CyclicArray(10);
a.insert(0, "a"); // "a" is now at position 0.
a.get(0)  // returns "a"
a.get(-1) // throws RangeError
a.get(1)  // returns null

// When elements are removed from the array, this function is called.
a.onRemove(function(index, value) {
  console.log(index, value);
});

// Inserts can happen in any order within the window
a.insert(2, "c");
a.insert(1, "b");

// Inserts before the window are silently ignored
a.insert(-1, "b"); // does nothing

// Inserts *after* the window force the window to slide forward to include
// them; removing old elements if necessary.
a.insert(15, "x");
// a now ranges from 6 to 15
// Also calls onRemove(0, "a"), onRemove(1, "b"), onRemove(2, "c")
```

Hack: After creation, you can set a.imin = 12345 to arbitrarily establish the
first index.


CyclicArrayMap
===

CyclicArrayMap behaves like a cyclic array of maps. Internally it's a map of
arrays, which is much more efficient when the keys are dense. It behaves pretty much like CyclicArray. Space is allocated for each unique dimension encountered.

``` js
cam = new CyclicArrayMap(10);

cam.insert(0, {x: 10, y: 5});
cam.get(0) // #=> {x: 10, y: 5}

cam.insert(10, {x: 2, foo: 17});
cam.get(10) // #=> {x: 2, foo: 17}
// cam.onRemove callbacks receive callback(0, {x: 10, y: 5})
```
