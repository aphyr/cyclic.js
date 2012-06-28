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
