var fs = require('fs');
var _ = require('underscore')._;

eval(fs.readFileSync("time_series.js") + '');

var should = require("should");

describe("CyclicArray", function() {
  describe('new', function() {
    it('should create a non-empty array', function() {
      var a = new CyclicArray(10);
      a.size.should.equal(10);
      a.min().should.equal(0);
      a.max().should.equal(9);
    });
  });

  var testGets = function(a) {
    (function() { a.get(-1) }).should.throw('out of bounds');
    should.equal(a.get(0), null);
    should.equal(a.get(1), null);
    should.equal(a.get(2), null);
    (function() { a.get(3) }).should.throw('out of bounds');
  }

  var testSets = function(a) {
    (function() { a.set(-1, 'a') }).should.throw('out of bounds');
    a.set(0, 'a').should.equal('a');
    a.set(1, 'b').should.equal('b');
    a.set(2, 'c').should.equal('c');
    (function() { a.set(3, 'd') }).should.throw('out of bounds');

    a.get(0).should.equal('a');
    a.get(1).should.equal('b');
    a.get(2).should.equal('c');
  }

  describe('basic', function() {
    it('#get', function() {
      testGets(new CyclicArray(3));
    });

    it('#set', function() {
      testSets(new CyclicArray(3));
    });
  });

  it('appends', function() {
    var dead = [];
    var a = new CyclicArray(3);
    a.onRemove(function(i, x) { dead.push(x); });
    
    // Append a single element
    a.append("a");
    dead.should.eql([]);
    (function() { a.get(0) }).should.throw('out of bounds');
    should.equal(a.get(1), null);
    should.equal(a.get(2), null);
    a.get(3).should.equal("a");
    (function() { a.get(4) }).should.throw('out of bounds');

    // Again!
    a.append("b");
    a.append("c");
    dead.should.eql([]);
    a.get(3).should.equal("a");
    a.get(4).should.equal("b");
    a.get(5).should.equal("c");

    // Moar
    a.append("d");
    a.append("e");
    dead.should.eql(["a", "b"]);
    (function() { a.get(4) }).should.throw('out of bounds');
    a.get(5).should.equal("c");
    a.get(6).should.equal("d");
    a.get(7).should.equal("e");
    a.min().should.equal(5);
    a.max().should.equal(7);
  });

  it('inserts', function() {
    var dead = [];
    var a = new CyclicArray(3);
    a.onRemove(function(i, x) { dead.push(x) });
  
    a.insert(0, "a");
    dead.should.eql([]);
    a.get(0).should.equal("a");
    a.min().should.equal(0);
    a.max().should.equal(2);

    a.insert(10, "b");
    dead.should == ["a"];
    a.get(10).should.equal("b")
    a.min().should.equal(8);
    a.max().should.equal(10);

    a.insert(9, "c");
    a.insert(8, "d");
    a.insert(7, "e");
    dead.should.eql(['a']);
    (function() { a.get(7) }).should.throw('out of bounds');
    a.get(8).should.equal("d");
    a.get(9).should.equal("c");
    a.get(10).should.equal("b");
  });

  describe('scale', function() {
    it('indexes', function() {
      var a = new CyclicArray(10, -5, 2);

      // Verify that indexes are rounded/aligned properly.
      a.rawIndex(-2.5).should.eql(-2);

      a.rawIndex(-2).should.eql(-1);
      a.rawIndex(-1.5).should.eql(-1);
      a.rawIndex(-1).should.eql(-1);
      a.rawIndex(-0.5).should.eql(-1);

      a.rawIndex(0).should.eql(0);
      a.rawIndex(0.5).should.eql(0);
      a.rawIndex(1).should.eql(0);
      a.rawIndex(1.5).should.eql(0);

      a.rawIndex(2).should.eql(1);
    });

    it('inserts', function() {
      var dead = [];
      var a = new CyclicArray(3, 0, 3);
      a.onRemove(function(x, y) { dead.push([x,y]) });

      a.insert(0, "a");
      a.get(0).should.eql("a");
      a.insert(1, "b");
      a.get(0).should.eql("b");
      a.get(1).should.eql("b");
      a.get(2).should.eql("b");

      // Sequential writes
      a.insert(2, "c");
      a.insert(3, "d");
      a.insert(4, "e");
      a.insert(5, "f");
      a.insert(6, "g");
      a.insert(7, "h");
      a.insert(8, "i");
      a.insert(9, "j");
      a.insert(10, "k");
      a.insert(11, "l");

      // 0-3 should be out of bounds
      (function() { a.get(2) }).should.throw("out of bounds");
      dead.should.eql([[0, 'c']]);

      // Check that writes were partitioned
      a.get(3).should.eql("f");
      a.get(5).should.eql("f");
      a.get(6).should.eql("i");
      a.get(8).should.eql("i");
      a.get(9).should.eql("l");
      a.get(11).should.eql("l");
      
      // 12 should be out of bounds 
      (function() { a.get(12) }).should.throw("out of bounds");

      // One last insert, to confirm removed scaling
      a.insert(12, "m");
      dead.should.eql([[0, 'c'], [3, 'f']]);
    });
  });
});

describe("CyclicArrayMap", function() {
  it("empty", function() {
    var a = new CyclicArrayMap(3);
    a.get(0).should.eql({});
    (function() { a.get(3) }).should.throw("out of bounds");
  });

  it("univariate", function() {
    var a = new CyclicArrayMap(3);
    var dead = [];
    a.onRemove(function(i, x) { dead.push([i, x]) });

    a.insert(1, {x: 1});
    a.insert(3, {x: 2});
    a.insert(-10,  {x: 3});
    a.insert(4, {x: 4});

    a.get(3).should.eql({x: 2});
    a.get(4).should.eql({x: 4});
    dead.should.eql([[0, {}],
                    [1, {x: 1}]]); 
  });
  
  it("multivariate", function() {
    var a = new CyclicArrayMap(3);
    var dead = [];
    a.onRemove(function(i, x) { dead.push([i, x]) });

    a.insert(1, {x: 1});
    a.insert(3, {x: 1, y: 2});
    a.insert(-10,  {z: 3});
    a.insert(4, {x: 4, z: 5});

    a.get(3).should.eql({x: 1, y: 2});
    a.get(4).should.eql({x: 4, z: 5});
    dead.should.eql([[0, {}],
                    [1, {x: 1}]]); 
  });
});
