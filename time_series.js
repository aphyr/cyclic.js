// Cyclic
function Cyclic(size) {
  if (! size > 0) {
    throw new RangeError("Size must be greater than 0");
  }
  this.size = size;
  this.imin = 0;
  this.removeCallbacks = [];

  this.init();
}

// The minimum index
Cyclic.prototype.min = function() {
  return this.imin;
};

// The maximum index
Cyclic.prototype.max = function() {
  return this.imin + this.size - 1;
};

// Returns the index, in the underlying data structure, of the given virtual
// index.
Cyclic.prototype.rawIndex = function(i) {
  var offset = i - this.imin;
  if (offset < 0 || offset >= this.size) {
    throw new RangeError("out of bounds");
  }
  return i % this.size;
};

// Returns the virtual index of the given physical index
Cyclic.prototype.virtualIndex = function(i) {
  // TODO
}

// Get an element at virtual index i
Cyclic.prototype.get = function(i) {
  return this.getRaw(this.rawIndex(i));
};

// Set an element at virtual index i
Cyclic.prototype.set = function(i, x) {
  return this.setRaw(this.rawIndex(i), x);
};

// c.onRemove(function(x) { ... }) asks c to call the given function with
// each element x as it is removed.
Cyclic.prototype.onRemove = function(f) {
  this.removeCallbacks.push(f);
};

// Append an element at the end of the Cyclic, advancing its window by 1.
Cyclic.prototype.append = function(x) {
  var old = this.getRaw(this.imin % this.size);
  if (old !== null) {
    _.each(this.removeCallbacks, function(callback) {
      callback(this.imin, old);
    });
  }

  this.set(this.imin, x);
  this.imin++;
  return x;
};

// Advances this cyclic such that its maximum element is at i,
// calling remove callbacks with each removed element.
Cyclic.prototype.slide = function(target) {
  for (var i = this.imin; i <= (target - this.size); i++) {
    // Flush old value to callbacks
    var old = this.getRaw(i % this.size);
    if (old != null) {
      _.each(this.removeCallbacks, function(callback) {
        callback(i, old);
      });
    }

    this.removeRaw(i % this.size);
    this.imin = i + 1;
  }
};

// Insert element x at the given index, advancing the window to include x if
// necessary. If x falls *before* the Cyclic's window, ignores it.
Cyclic.prototype.insert = function(i, x) {
  this.slide(i);
  try {
    this.set(i, x);
  } catch(e) { 
    if (! e instanceof RangeError) {
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

  a = new Array(this.size);
  for (var i = 0; i < this.size; i++) {
    a[i] = null;
  }
  this.as[dimension] = a;
  return a;
};

CyclicArrayMap.prototype.getRaw = function(i) {
  var x = {};
  var val;
  var dimension;
  for (dimension in this.as) {
    val = this.as[dimension][i];
    if (val != null) {
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

CyclicArrayMap.prototype.setRaw = function(i, x) {
  var dimension;
  for (dimension in x) {
    this.arrayFor(dimension)[i] = x[dimension];
  }
  return x;
};
