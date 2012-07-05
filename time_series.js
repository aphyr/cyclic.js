// Cyclic
// 
// Create a cyclic array. 
//
// Size is the number of elements in the window.
//
// Offset is the (first/lowest/oldest) element's index.
//
// For time-series bucketing, scale is the number of indexes a given element
// covers; indexes are divided by this factor, rounded towards -infinity.  If
// your element indexes are, say, -10, 0, 10, 20, 30, ..., scale = 10 will
// make those elements consecutive.
function Cyclic(size, offset, scale) {
  if (! size > 0) {
    throw new RangeError("Size must be greater than 0");
  }
  this.size = size;

  if (scale === undefined) {
    this.scale = 1;
  } else {
    this.scale = scale;
  }

  if (offset === undefined) {
    this.offset = 0;
  } else {
    this.offset = Math.floor(offset / this.scale);
  }

  this.removeCallbacks = [];
  this.ignoreCallbacks = [];
  this.highWatermark = -1/0;
  this.init();
}

// The minimum index
Cyclic.prototype.min = function() {
  return this.offset * this.scale;
};

// The maximum index
Cyclic.prototype.max = function() {
  return (this.offset + this.size - 1) * this.scale;
};

// Is there any data in this Cyclic? If true, definitely empty. If false,
// *might* be empty.
Cyclic.prototype.isEmpty = function() {
  return(this.highWatermark < this.min());
};

// Returns the index, in the underlying data structure, of the given virtual
// index.
Cyclic.prototype.rawIndex = function(i) {
  i = Math.floor(i / this.scale);

  var offset = i - this.offset;
  if (offset < 0 || offset >= this.size) {
    throw new RangeError("out of bounds");
  }
  return i % this.size;
};

// Returns the virtual index of the given physical index
Cyclic.prototype.virtualIndex = function(i) {
  // TODO
};

// Get an element at virtual index i
Cyclic.prototype.get = function(i) {
  return this.getRaw(this.rawIndex(i));
};

// Set an element at virtual index i
Cyclic.prototype.set = function(i, x) {
  var res = this.setRaw(this.rawIndex(i), x, i);
  if (i > this.highWatermark) {
    this.highWatermark = i;
  }
  return res;
};

// Remove an element at virtual index i
Cyclic.prototype.remove = function(i) {
  var old = this.getRaw(this.rawIndex(i));

  if (null !== old) {
    _.each(this.removeCallbacks, function(callback) {
      callback(i, old);
    });
  }

  return this.removeRaw(this.rawIndex(i));
};

// c.onRemove(function(index, element) { ... }) calls the given function every
// time an element is removed from the window.
Cyclic.prototype.onRemove = function(f) {
  this.removeCallbacks.push(f);
};

// c.onIgnore(function(index, element) { ... }) calls the given function every
// time an element is inserted but ignored because it falls before the window.
Cyclic.prototype.onIgnore = function(f) {
  this.ignoreCallbacks.push(f);
};

// Append an element at the end of the Cyclic, advancing its window by 1.
Cyclic.prototype.append = function(x) {
  var scale = this.scale; 
  var old = this.getRaw(this.offset % this.size);
  if (old !== null) {
    _.each(this.removeCallbacks, function(callback) {
      callback(this.offset * scale, old);
    });
  }

  this.set(this.offset, x);
  this.offset++;
  return x;
};

// Advances this cyclic such that its maximum element is at i,
// calling remove callbacks with each removed element.
Cyclic.prototype.slide = function(target) {
  var scale = this.scale;
  var newOffset = Math.floor(target/this.scale) - this.size;
  // Go through and flush old data. 
  for (var i = this.offset; i <= newOffset; i++) {
    if (this.isEmpty()) {
      // Shortcut; we can just flip our virtual index.
      this.offset = newOffset + 1;
      return;
    }
 
    // Flush old value to callbacks
    var old = this.getRaw(i % this.size);
    if (old !== null) {
      _.each(this.removeCallbacks, function(callback) {
        callback(i * scale, old);
      });
    }

    this.removeRaw(i % this.size);
    this.offset = i + 1;
  }
};

// Advances the cyclic to drop elements up to and including i.
Cyclic.prototype.slidePast = function(i) {
  this.slide(i + this.size); 
};

// Insert element x at the given index, advancing the window to include x if
// necessary. If x falls *before* the Cyclic's window, ignores it. Returns true if inserted, false otherwise.
Cyclic.prototype.insert = function(i, x) {
  this.slide(i);
  try {
    this.set(i, x);
    return true;
  } catch(e) { 
    if (e instanceof RangeError) {
      // Ignore
      _.each(this.ignoreCallbacks, function(callback) {
        callback(i, x);
      });
      return false;
    } else {
      throw e;
    }
  }
};


// Cyclic Array /////////////////////////////////////////////////////////////
function CyclicArray(size) {
  this.a = [];
  Cyclic.apply(this, arguments);
}

// Inherit from Cyclic without invoking Cyclic's constructor
CyclicArray.prototype = (function(parent) {
  function protoCreator() {}
  protoCreator.prototype = parent.prototype;
  return new protoCreator();
})(Cyclic);

// Initialize the array
CyclicArray.prototype.init = function() {
  for (var i = 0; i < this.size; i++) {
    this.a[i] = null;
  }
};

CyclicArray.prototype.setRaw = function(i, value) {
  this.a[i] = value;
  return value;
};

CyclicArray.prototype.getRaw = function(i, value) {
  return this.a[i];
};

CyclicArray.prototype.removeRaw = function(i, value) {
  this.a[i] = null;
};

// Cyclic Array Map /////////////////////////////////////////////////////////
function CyclicArrayMap(size) {
  this.as = {};
  this.highWatermarks = {};
  Cyclic.apply(this, arguments);
}

// Inherit from Cyclic without invoking Cyclic's constructor
CyclicArrayMap.prototype = (function(parent) {
  function protoCreator() {}
  protoCreator.prototype = parent.prototype;
  return new protoCreator();
})(Cyclic);

CyclicArrayMap.prototype.init = function() {
};

// The array for a given dimension
CyclicArrayMap.prototype.arrayFor = function(dimension) {
  var a = this.as[dimension];
  if (a !== undefined) {
    return a;
  }

  this.gc();
  
  // Create a new array.
  a = new Array(this.size);
  for (var i = 0; i < this.size; i++) {
    a[i] = null;
  }
  this.as[dimension] = a;
  this.highWatermarks[dimension] = -1/0;
  return a;
};

// Returns a list of dimensions in this CAM which have totally empty arrays.
CyclicArrayMap.prototype.emptyDimensions = function() {
  var empty = [];
  var min = this.min();
  var k;
  for (k in this.as) {
    if (this.highWatermarks[k] < min) {
      empty.push(k);
    }
  }
  return empty;
}

// Clean up unused arrays.
CyclicArrayMap.prototype.gc = function() {
  var empty = this.emptyDimensions();
  var k;
  var i;
  for (i = 0; i < empty.length; i++) {
    k = empty[i];
    delete this.as[k];
    delete this.highWatermarks[k];
  }
}

CyclicArrayMap.prototype.getRaw = function(i) {
  var x = {};
  var val;
  var dimension;
  for (dimension in this.as) {
    val = this.as[dimension][i];
    if (val !== null) {
      x[dimension] = val;
    }
  }
  return x;
};

CyclicArrayMap.prototype.removeRaw = function(i, x) {
  var dimension;
  for (dimension in x) {
    this.arrayFor(dimension)[i] = null;
  }
};

CyclicArrayMap.prototype.setRaw = function(i, x, virtualI) {
  var dimension;
  for (dimension in x) {
    this.arrayFor(dimension)[i] = x[dimension];
    if (virtualI > this.highWatermarks[dimension]) {
      this.highWatermarks[dimension] = virtualI;
    }
  }
  return x;
};
