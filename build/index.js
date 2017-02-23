(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define([], factory);
	else if(typeof exports === 'object')
		exports["js-interpreter"] = factory();
	else
		root["js-interpreter"] = factory();
})(this, function() {
return /******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;
/******/
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = __webpack_require__(1);


/***/ },
/* 1 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * @license
	 * JavaScript Interpreter
	 *
	 * Copyright 2013 Google Inc.
	 *
	 * Licensed under the Apache License, Version 2.0 (the "License");
	 * you may not use this file except in compliance with the License.
	 * You may obtain a copy of the License at
	 *
	 *   http://www.apache.org/licenses/LICENSE-2.0
	 *
	 * Unless required by applicable law or agreed to in writing, software
	 * distributed under the License is distributed on an "AS IS" BASIS,
	 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
	 * See the License for the specific language governing permissions and
	 * limitations under the License.
	 */
	
	/**
	 * @fileoverview Interpreting JavaScript in JavaScript.
	 * @author fraser@google.com (Neil Fraser)
	 */
	'use strict';
	
	/**
	 * Create a new interpreter.
	 * @param {string|!Object} code Raw JavaScript text or AST.
	 * @param {Function=} opt_initFunc Optional initialization function.  Used to
	 *     define APIs.  When called it is passed the interpreter object and the
	 *     global scope object.
	 * @constructor
	 */
	var acorn = __webpack_require__(2);
	
	var Interpreter = function(code, opt_initFunc) {
	  if (typeof code == 'string') {
	    code = acorn.parse(code, Interpreter.PARSE_OPTIONS);
	  }
	  this.ast = code;
	  this.initFunc_ = opt_initFunc;
	  this.paused_ = false;
	  this.polyfills_ = [];
	  // Predefine some common primitives for performance.
	  this.UNDEFINED = new Interpreter.Primitive(undefined, this);
	  this.NULL = new Interpreter.Primitive(null, this);
	  this.NAN = new Interpreter.Primitive(NaN, this);
	  this.TRUE = new Interpreter.Primitive(true, this);
	  this.FALSE = new Interpreter.Primitive(false, this);
	  this.NUMBER_ZERO = new Interpreter.Primitive(0, this);
	  this.NUMBER_ONE = new Interpreter.Primitive(1, this);
	  this.STRING_EMPTY = new Interpreter.Primitive('', this);
	  // Create and initialize the global scope.
	  var scope = this.createScope(this.ast, null);
	  // Fix the parent properties now that the global scope exists.
	  //this.UNDEFINED.parent = undefined;
	  //this.NULL.parent = undefined;
	  this.NAN.parent = this.NUMBER;
	  this.TRUE.parent = this.BOOLEAN;
	  this.FALSE.parent = this.BOOLEAN;
	  this.NUMBER_ZERO.parent = this.NUMBER;
	  this.NUMBER_ONE.parent = this.NUMBER;
	  this.STRING_EMPTY.parent = this.STRING;
	  // Run the polyfills.
	  this.ast = acorn.parse(this.polyfills_.join('\n'), Interpreter.PARSE_OPTIONS);
	  this.polyfills_ = undefined;  // Allow polyfill strings to garbage collect.
	  this.stripLocations_(this.ast);
	  this.stateStack = [{
	    node: this.ast,
	    scope: scope,
	    thisExpression: scope,
	    done: false
	  }];
	  this.run();
	  this.value = this.UNDEFINED;
	  // Point at the main program.
	  this.ast = code;
	  this.stateStack = [{
	    node: this.ast,
	    scope: scope,
	    thisExpression: scope,
	    done: false
	  }];
	};
	
	/**
	 * @const {!Object} Configuration used for all Acorn parsing.
	 */
	Interpreter.PARSE_OPTIONS = {
	  ecmaVersion: 5
	};
	
	/**
	 * Property descriptor of readonly properties.
	 */
	Interpreter.READONLY_DESCRIPTOR = {
	  configurable: true,
	  enumerable: true,
	  writable: false
	};
	
	/**
	 * Property descriptor of non-enumerable properties.
	 */
	Interpreter.NONENUMERABLE_DESCRIPTOR = {
	  configurable: true,
	  enumerable: false,
	  writable: true
	};
	
	/**
	 * Property descriptor of readonly, non-enumerable properties.
	 */
	Interpreter.READONLY_NONENUMERABLE_DESCRIPTOR = {
	  configurable: true,
	  enumerable: false,
	  writable: false
	};
	
	/**
	 * Add more code to the interpreter.
	 * @param {string|!Object} code Raw JavaScript text or AST.
	 */
	Interpreter.prototype.appendCode = function(code) {
	  var state = this.stateStack[this.stateStack.length - 1];
	  if (!state || state.node.type != 'Program') {
	    throw Error('Expecting original AST to start with a Program node.');
	  }
	  if (typeof code == 'string') {
	    code = acorn.parse(code, Interpreter.PARSE_OPTIONS);
	  }
	  if (!code || code.type != 'Program') {
	    throw Error('Expecting new AST to start with a Program node.');
	  }
	  this.populateScope_(code, state.scope);
	  // Append the new program to the old one.
	  for (var i = 0, node; node = code.body[i]; i++) {
	    state.node.body.push(node);
	  }
	  state.done = false;
	};
	
	/**
	 * Execute one step of the interpreter.
	 * @return {boolean} True if a step was executed, false if no more instructions.
	 */
	Interpreter.prototype.step = function() {
	  var state = this.stateStack[0];
	  if (!state || state.node.type == 'Program' && state.done) {
	    return false;
	  } else if (this.paused_) {
	    return true;
	  }
	  this['step' + state.node.type]();
	  if (!state.node.end) {
	    // This is polyfill code.  Keep executing until we arrive at user code.
	    return this.step();
	  }
	  return true;
	};
	
	/**
	 * Execute the interpreter to program completion.  Vulnerable to infinite loops.
	 * @return {boolean} True if a execution is asynchonously blocked,
	 *     false if no more instructions.
	 */
	Interpreter.prototype.run = function() {
	  while (!this.paused_ && this.step()) {}
	  return this.paused_;
	};
	
	/**
	 * Initialize the global scope with buitin properties and functions.
	 * @param {!Interpreter.Object} scope Global scope.
	 */
	Interpreter.prototype.initGlobalScope = function(scope) {
	  // Initialize uneditable global properties.
	  this.setProperty(scope, 'Infinity', this.createPrimitive(Infinity),
	                   Interpreter.READONLY_DESCRIPTOR);
	  this.setProperty(scope, 'NaN', this.NAN,
	                   Interpreter.READONLY_DESCRIPTOR);
	  this.setProperty(scope, 'undefined', this.UNDEFINED,
	                   Interpreter.READONLY_DESCRIPTOR);
	  this.setProperty(scope, 'window', scope,
	                   Interpreter.READONLY_DESCRIPTOR);
	  this.setProperty(scope, 'self', scope); // Editable.
	
	  // Initialize global objects.
	  this.initFunction(scope);
	  this.initObject(scope);
	  // Unable to set scope's parent prior (this.OBJECT did not exist).
	  scope.parent = this.OBJECT;
	  this.initArray(scope);
	  this.initNumber(scope);
	  this.initString(scope);
	  this.initBoolean(scope);
	  this.initDate(scope);
	  this.initMath(scope);
	  this.initRegExp(scope);
	  this.initJSON(scope);
	  this.initError(scope);
	
	  // Initialize global functions.
	  var thisInterpreter = this;
	  var wrapper;
	  wrapper = function(num) {
	    num = num || thisInterpreter.UNDEFINED;
	    return thisInterpreter.createPrimitive(isNaN(num.toNumber()));
	  };
	  this.setProperty(scope, 'isNaN',
	                   this.createNativeFunction(wrapper));
	
	  wrapper = function(num) {
	    num = num || thisInterpreter.UNDEFINED;
	    return thisInterpreter.createPrimitive(isFinite(num.toNumber()));
	  };
	  this.setProperty(scope, 'isFinite',
	                   this.createNativeFunction(wrapper));
	
	  this.setProperty(scope, 'parseFloat',
	                   this.getProperty(this.NUMBER, 'parseFloat'));
	
	  this.setProperty(scope, 'parseInt',
	                   this.getProperty(this.NUMBER, 'parseInt'));
	
	  var func = this.createObject(this.FUNCTION);
	  func.eval = true;
	  this.setProperty(func, 'length', this.NUMBER_ONE,
	                   Interpreter.READONLY_DESCRIPTOR);
	  this.setProperty(scope, 'eval', func);
	
	  var strFunctions = [
	    [escape, 'escape'], [unescape, 'unescape'],
	    [decodeURI, 'decodeURI'], [decodeURIComponent, 'decodeURIComponent'],
	    [encodeURI, 'encodeURI'], [encodeURIComponent, 'encodeURIComponent']
	  ];
	  for (var i = 0; i < strFunctions.length; i++) {
	    wrapper = (function(nativeFunc) {
	      return function(str) {
	        str = (str || thisInterpreter.UNDEFINED).toString();
	        try {
	          str = nativeFunc(str);
	        } catch (e) {
	          // decodeURI('%xy') will throw an error.  Catch and rethrow.
	          thisInterpreter.throwException(thisInterpreter.URI_ERROR, e.message);
	        }
	        return thisInterpreter.createPrimitive(str);
	      };
	    })(strFunctions[i][0]);
	    this.setProperty(scope, strFunctions[i][1],
	                     this.createNativeFunction(wrapper));
	  }
	
	  // Run any user-provided initialization.
	  if (this.initFunc_) {
	    this.initFunc_(this, scope);
	  }
	};
	
	/**
	 * Initialize the Function class.
	 * @param {!Interpreter.Object} scope Global scope.
	 */
	Interpreter.prototype.initFunction = function(scope) {
	  var thisInterpreter = this;
	  var wrapper;
	  // Function constructor.
	  wrapper = function(var_args) {
	    if (this.parent == thisInterpreter.FUNCTION) {
	      // Called with new.
	      var newFunc = this;
	    } else {
	      var newFunc = thisInterpreter.createObject(thisInterpreter.FUNCTION);
	    }
	    if (arguments.length) {
	      var code = arguments[arguments.length - 1].toString();
	    } else {
	      var code = '';
	    }
	    var args = [];
	    for (var i = 0; i < arguments.length - 1; i++) {
	      args.push(arguments[i].toString());
	    }
	    args = args.join(', ');
	    if (args.indexOf(')') != -1) {
	      throw SyntaxError('Function arg string contains parenthesis');
	    }
	    // Interestingly, the scope for constructed functions is the global scope,
	    // even if they were constructed in some other scope.
	    newFunc.parentScope =
	        thisInterpreter.stateStack[thisInterpreter.stateStack.length - 1].scope;
	    var ast = acorn.parse('$ = function(' + args + ') {' + code + '};',
	        Interpreter.PARSE_OPTIONS);
	    newFunc.node = ast.body[0].expression.right;
	    thisInterpreter.setProperty(newFunc, 'length',
	        thisInterpreter.createPrimitive(newFunc.node.length),
	        Interpreter.READONLY_DESCRIPTOR);
	    return newFunc;
	  };
	  this.FUNCTION = this.createObject(null);
	  this.setProperty(scope, 'Function', this.FUNCTION);
	  // Manually setup type and prototype because createObj doesn't recognize
	  // this object as a function (this.FUNCTION did not exist).
	  this.FUNCTION.type = 'function';
	  this.setProperty(this.FUNCTION, 'prototype', this.createObject(null));
	  this.FUNCTION.nativeFunc = wrapper;
	
	  wrapper = function(thisArg, args) {
	    var state = thisInterpreter.stateStack[0];
	    // Rewrite the current 'CallExpression' to apply a different function.
	    state.func_ = this;
	    // Assign the 'this' object.
	    state.funcThis_ = thisArg;
	    // Bind any provided arguments.
	    state.arguments = [];
	    if (args) {
	      if (thisInterpreter.isa(args, thisInterpreter.ARRAY)) {
	        for (var i = 0; i < args.length; i++) {
	          state.arguments[i] = thisInterpreter.getProperty(args, i);
	        }
	      } else {
	        thisInterpreter.throwException(thisInterpreter.TYPE_ERROR,
	            'CreateListFromArrayLike called on non-object');
	      }
	    }
	    state.doneArgs_ = true;
	    state.doneExec_ = false;
	  };
	  this.setNativeFunctionPrototype(this.FUNCTION, 'apply', wrapper);
	
	  wrapper = function(thisArg, var_args) {
	    var state = thisInterpreter.stateStack[0];
	    // Rewrite the current 'CallExpression' to call a different function.
	    state.func_ = this;
	    // Assign the 'this' object.
	    state.funcThis_ = thisArg;
	    // Bind any provided arguments.
	    state.arguments = [];
	    for (var i = 1; i < arguments.length; i++) {
	      state.arguments.push(arguments[i]);
	    }
	    state.doneArgs_ = true;
	    state.doneExec_ = false;
	  };
	  this.setNativeFunctionPrototype(this.FUNCTION, 'call', wrapper);
	
	  wrapper = function(thisArg, var_args) {
	    // Clone function
	    var clone = thisInterpreter.createFunction(this.node, this.parentScope);
	    // Assign the 'this' object.
	    if (thisArg) {
	      clone.boundThis_ = thisArg;
	    }
	    // Bind any provided arguments.
	    clone.boundArgs_ = [];
	    for (var i = 1; i < arguments.length; i++) {
	      clone.boundArgs_.push(arguments[i]);
	    }
	    return clone;
	  };
	  this.setNativeFunctionPrototype(this.FUNCTION, 'bind', wrapper);
	  // Function has no parent to inherit from, so it needs its own mandatory
	  // toString and valueOf functions.
	  wrapper = function() {
	    return thisInterpreter.createPrimitive(this.toString());
	  };
	  this.setNativeFunctionPrototype(this.FUNCTION, 'toString', wrapper);
	  this.setProperty(this.FUNCTION, 'toString',
	      this.createNativeFunction(wrapper), Interpreter.NONENUMERABLE_DESCRIPTOR);
	  wrapper = function() {
	    return thisInterpreter.createPrimitive(this.valueOf());
	  };
	  this.setNativeFunctionPrototype(this.FUNCTION, 'valueOf', wrapper);
	  this.setProperty(this.FUNCTION, 'valueOf',
	      this.createNativeFunction(wrapper), Interpreter.NONENUMERABLE_DESCRIPTOR);
	};
	
	/**
	 * Initialize the Object class.
	 * @param {!Interpreter.Object} scope Global scope.
	 */
	Interpreter.prototype.initObject = function(scope) {
	  var thisInterpreter = this;
	  var wrapper;
	  // Object constructor.
	  wrapper = function(value) {
	    if (!value || value == thisInterpreter.UNDEFINED ||
	        value == thisInterpreter.NULL) {
	      // Create a new object.
	      if (this.parent == thisInterpreter.OBJECT) {
	        // Called with new.
	        return this;
	      } else {
	        return thisInterpreter.createObject(thisInterpreter.OBJECT);
	      }
	    }
	    if (value.isPrimitive) {
	      // Wrap the value as an object.
	      var obj = thisInterpreter.createObject(value.parent);
	      obj.data = value.data;
	      return obj;
	    }
	    // Return the provided object.
	    return value;
	  };
	  this.OBJECT = this.createNativeFunction(wrapper);
	  this.setProperty(scope, 'Object', this.OBJECT);
	
	  // Static methods on Object.
	  wrapper = function(obj) {
	    var pseudoList = thisInterpreter.createObject(thisInterpreter.ARRAY);
	    var i = 0;
	    for (var key in obj.properties) {
	      thisInterpreter.setProperty(pseudoList, i,
	          thisInterpreter.createPrimitive(key));
	      i++;
	    }
	    return pseudoList;
	  };
	  this.setProperty(this.OBJECT, 'getOwnPropertyNames',
	      this.createNativeFunction(wrapper), Interpreter.NONENUMERABLE_DESCRIPTOR);
	
	  wrapper = function(obj) {
	    var pseudoList = thisInterpreter.createObject(thisInterpreter.ARRAY);
	    var i = 0;
	    for (var key in obj.properties) {
	      if (obj.notEnumerable[key]) {
	        continue;
	      }
	      thisInterpreter.setProperty(pseudoList, i,
	          thisInterpreter.createPrimitive(key));
	      i++;
	    }
	    return pseudoList;
	  };
	  this.setProperty(this.OBJECT, 'keys',
	      this.createNativeFunction(wrapper), Interpreter.NONENUMERABLE_DESCRIPTOR);
	
	  wrapper = function(obj, prop, descriptor) {
	    prop = (prop || thisInterpreter.UNDEFINED).toString();
	    if (!(descriptor instanceof Interpreter.Object)) {
	      thisInterpreter.throwException(thisInterpreter.TYPE_ERROR,
	          'Property description must be an object.');
	      return;
	    }
	    if (!obj.properties[prop] && obj.preventExtensions) {
	      thisInterpreter.throwException(thisInterpreter.TYPE_ERROR,
	          'Can\'t define property ' + prop + ', object is not extensible');
	      return;
	    }
	    var value = thisInterpreter.getProperty(descriptor, 'value');
	    if (value == thisInterpreter.UNDEFINED) {
	      value = null;
	    }
	    var get = thisInterpreter.getProperty(descriptor, 'get');
	    var set = thisInterpreter.getProperty(descriptor, 'set');
	    var nativeDescriptor = {
	      configurable: thisInterpreter.pseudoToNative(
	          /** @type !Interpreter.Primitive */
	          (thisInterpreter.getProperty(descriptor, 'configurable'))),
	      enumerable: thisInterpreter.pseudoToNative(
	          /** @type !Interpreter.Primitive */
	          (thisInterpreter.getProperty(descriptor, 'enumerable'))),
	      writable: thisInterpreter.pseudoToNative(
	          /** @type !Interpreter.Primitive */
	          (thisInterpreter.getProperty(descriptor, 'writable'))),
	      get: get == thisInterpreter.UNDEFINED ? undefined : get,
	      set: set == thisInterpreter.UNDEFINED ? undefined : set
	    };
	    thisInterpreter.setProperty(obj, prop, value, nativeDescriptor);
	    return obj;
	  };
	  this.setProperty(this.OBJECT, 'defineProperty',
	      this.createNativeFunction(wrapper), Interpreter.NONENUMERABLE_DESCRIPTOR);
	
	  this.polyfills_.push(
	"Object.defineProperty(Array.prototype, 'defineProperties', {configurable: true, value:",
	  "function(obj, props) {",
	    "var keys = Object.keys(props);",
	    "for (var i = 0; i < keys.length; i++) {",
	      "Object.defineProperty(obj, keys[i], props[keys[i]]);",
	    "}",
	    "return obj;",
	  "}",
	"});",
	"");
	
	  wrapper = function(obj, prop) {
	    prop = (prop || thisInterpreter.UNDEFINED).toString();
	    if (!(prop in obj.properties)) {
	      return thisInterpreter.UNDEFINED;
	    }
	    var configurable = !obj.notConfigurable[prop];
	    var enumerable = !obj.notEnumerable[prop];
	    var writable = !obj.notWritable[prop];
	    var getter = obj.getter[prop];
	    var setter = obj.setter[prop];
	
	    var descriptor = thisInterpreter.createObject(thisInterpreter.OBJECT);
	    thisInterpreter.setProperty(descriptor, 'configurable',
	        thisInterpreter.createPrimitive(configurable));
	    thisInterpreter.setProperty(descriptor, 'enumerable',
	        thisInterpreter.createPrimitive(enumerable));
	    if (getter || setter) {
	      thisInterpreter.setProperty(descriptor, 'getter', getter);
	      thisInterpreter.setProperty(descriptor, 'setter', setter);
	    } else {
	      thisInterpreter.setProperty(descriptor, 'writable',
	          thisInterpreter.createPrimitive(writable));
	      thisInterpreter.setProperty(descriptor, 'value',
	          thisInterpreter.getProperty(obj, prop));
	    }
	    return descriptor;
	  };
	  this.setProperty(this.OBJECT, 'getOwnPropertyDescriptor',
	      this.createNativeFunction(wrapper), Interpreter.NONENUMERABLE_DESCRIPTOR);
	
	  wrapper = function(obj) {
	    if (obj.parent && obj.parent.properties &&
	        obj.parent.properties.prototype) {
	      return obj.parent.properties.prototype;
	    }
	    return thisInterpreter.NULL;
	  };
	  this.setProperty(this.OBJECT, 'getPrototypeOf',
	      this.createNativeFunction(wrapper), Interpreter.NONENUMERABLE_DESCRIPTOR);
	
	  wrapper = function(obj) {
	    return thisInterpreter.createPrimitive(!obj.preventExtensions);
	  };
	  this.setProperty(this.OBJECT, 'isExtensible',
	      this.createNativeFunction(wrapper), Interpreter.NONENUMERABLE_DESCRIPTOR);
	
	  wrapper = function(obj) {
	    if (!obj.isPrimitive) {
	      obj.preventExtensions = true;
	    }
	    return obj;
	  };
	  this.setProperty(this.OBJECT, 'preventExtensions',
	      this.createNativeFunction(wrapper), Interpreter.NONENUMERABLE_DESCRIPTOR);
	
	  // Instance methods on Object.
	  wrapper = function() {
	    return thisInterpreter.createPrimitive(this.toString());
	  };
	  this.setNativeFunctionPrototype(this.OBJECT, 'toString', wrapper);
	
	  wrapper = function() {
	    return thisInterpreter.createPrimitive(this.toString());
	  };
	  this.setNativeFunctionPrototype(this.OBJECT, 'toLocaleString', wrapper);
	
	  wrapper = function() {
	    return thisInterpreter.createPrimitive(this.valueOf());
	  };
	  this.setNativeFunctionPrototype(this.OBJECT, 'valueOf', wrapper);
	
	  wrapper = function(prop) {
	    if (this == thisInterpreter.NULL || this == thisInterpreter.UNDEFINED) {
	      thisInterpreter.throwException(thisInterpreter.TYPE_ERROR,
	          'Cannot convert undefined or null to object');
	      return;
	    }
	    prop = (prop || thisInterpreter.UNDEFINED).toString();
	    return (prop in this.properties) ?
	        thisInterpreter.TRUE : thisInterpreter.FALSE;
	  };
	  this.setNativeFunctionPrototype(this.OBJECT, 'hasOwnProperty', wrapper);
	
	  wrapper = function(prop) {
	    prop = (prop || thisInterpreter.UNDEFINED).toString();
	    var enumerable = prop in this.properties && !this.notEnumerable[prop];
	    return thisInterpreter.createPrimitive(enumerable);
	  };
	  this.setNativeFunctionPrototype(this.OBJECT, 'propertyIsEnumerable', wrapper);
	
	  wrapper = function(obj) {
	    while (true) {
	      if (obj.parent && obj.parent.properties &&
	          obj.parent.properties.prototype) {
	        obj = obj.parent.properties.prototype;
	        if (obj == this) {
	          return thisInterpreter.createPrimitive(true);
	        }
	      } else {
	        // No parent, reached the top.
	        return thisInterpreter.createPrimitive(false);
	      }
	    }
	  };
	  this.setNativeFunctionPrototype(this.OBJECT, 'isPrototypeOf',  wrapper);
	};
	
	/**
	 * Initialize the Array class.
	 * @param {!Interpreter.Object} scope Global scope.
	 */
	Interpreter.prototype.initArray = function(scope) {
	  var thisInterpreter = this;
	  var getInt = function(obj, def) {
	    // Return an integer, or the default.
	    var n = obj ? Math.floor(obj.toNumber()) : def;
	    if (isNaN(n)) {
	      n = def;
	    }
	    return n;
	  };
	  var strictComp = function(a, b) {
	    // Strict === comparison.
	    if (a.isPrimitive && b.isPrimitive) {
	      return a.data === b.data;
	    }
	    return a === b;
	  };
	  var wrapper;
	  // Array constructor.
	  wrapper = function(var_args) {
	    if (this.parent == thisInterpreter.ARRAY) {
	      // Called with new.
	      var newArray = this;
	    } else {
	      var newArray = thisInterpreter.createObject(thisInterpreter.ARRAY);
	    }
	    var first = arguments[0];
	    if (first && first.type == 'number') {
	      if (isNaN(thisInterpreter.arrayIndex(first))) {
	        thisInterpreter.throwException(thisInterpreter.RANGE_ERROR,
	                                       'Invalid array length');
	      }
	      newArray.length = first.data;
	    } else {
	      for (var i = 0; i < arguments.length; i++) {
	        newArray.properties[i] = arguments[i];
	      }
	      newArray.length = i;
	    }
	    return newArray;
	  };
	  this.ARRAY = this.createNativeFunction(wrapper);
	  this.setProperty(scope, 'Array', this.ARRAY);
	
	  // Static methods on Array.
	  wrapper = function(obj) {
	    return thisInterpreter.createPrimitive(
	        thisInterpreter.isa(obj, thisInterpreter.ARRAY));
	  };
	  this.setProperty(this.ARRAY, 'isArray',
	      this.createNativeFunction(wrapper), Interpreter.NONENUMERABLE_DESCRIPTOR);
	
	  // Instance methods on Array.
	  wrapper = function() {
	    if (this.length) {
	      var value = this.properties[this.length - 1];
	      delete this.properties[this.length - 1];
	      this.length--;
	    } else {
	      var value = thisInterpreter.UNDEFINED;
	    }
	    return value;
	  };
	  this.setNativeFunctionPrototype(this.ARRAY, 'pop', wrapper);
	
	  wrapper = function(var_args) {
	    for (var i = 0; i < arguments.length; i++) {
	      this.properties[this.length] = arguments[i];
	      this.length++;
	    }
	    return thisInterpreter.createPrimitive(this.length);
	  };
	  this.setNativeFunctionPrototype(this.ARRAY, 'push', wrapper);
	
	  wrapper = function() {
	    if (this.length) {
	      var value = this.properties[0];
	      for (var i = 1; i < this.length; i++) {
	        this.properties[i - 1] = this.properties[i];
	      }
	      this.length--;
	      delete this.properties[this.length];
	    } else {
	      var value = thisInterpreter.UNDEFINED;
	    }
	    return value;
	  };
	  this.setNativeFunctionPrototype(this.ARRAY, 'shift', wrapper);
	
	  wrapper = function(var_args) {
	    for (var i = this.length - 1; i >= 0; i--) {
	      this.properties[i + arguments.length] = this.properties[i];
	    }
	    this.length += arguments.length;
	    for (var i = 0; i < arguments.length; i++) {
	      this.properties[i] = arguments[i];
	    }
	    return thisInterpreter.createPrimitive(this.length);
	  };
	  this.setNativeFunctionPrototype(this.ARRAY, 'unshift', wrapper);
	
	  wrapper = function() {
	    for (var i = 0; i < this.length / 2; i++) {
	      var tmp = this.properties[this.length - i - 1];
	      this.properties[this.length - i - 1] = this.properties[i];
	      this.properties[i] = tmp;
	    }
	    return this;
	  };
	  this.setNativeFunctionPrototype(this.ARRAY, 'reverse', wrapper);
	
	  wrapper = function(index, howmany, var_args) {
	    index = getInt(index, 0);
	    if (index < 0) {
	      index = Math.max(this.length + index, 0);
	    } else {
	      index = Math.min(index, this.length);
	    }
	    howmany = getInt(howmany, Infinity);
	    howmany = Math.min(howmany, this.length - index);
	    var removed = thisInterpreter.createObject(thisInterpreter.ARRAY);
	    // Remove specified elements.
	    for (var i = index; i < index + howmany; i++) {
	      removed.properties[removed.length++] = this.properties[i];
	      this.properties[i] = this.properties[i + howmany];
	    }
	    // Move other element to fill the gap.
	    for (var i = index + howmany; i < this.length - howmany; i++) {
	      this.properties[i] = this.properties[i + howmany];
	    }
	    // Delete superfluous properties.
	    for (var i = this.length - howmany; i < this.length; i++) {
	      delete this.properties[i];
	    }
	    this.length -= howmany;
	    // Insert specified items.
	    for (var i = this.length - 1; i >= index; i--) {
	      this.properties[i + arguments.length - 2] = this.properties[i];
	    }
	    this.length += arguments.length - 2;
	    for (var i = 2; i < arguments.length; i++) {
	      this.properties[index + i - 2] = arguments[i];
	    }
	    return removed;
	  };
	  this.setNativeFunctionPrototype(this.ARRAY, 'splice', wrapper);
	
	  wrapper = function(opt_begin, opt_end) {
	    var list = thisInterpreter.createObject(thisInterpreter.ARRAY);
	    var begin = getInt(opt_begin, 0);
	    if (begin < 0) {
	      begin = this.length + begin;
	    }
	    begin = Math.max(0, Math.min(begin, this.length));
	    var end = getInt(opt_end, this.length);
	    if (end < 0) {
	      end = this.length + end;
	    }
	    end = Math.max(0, Math.min(end, this.length));
	    var length = 0;
	    for (var i = begin; i < end; i++) {
	      var element = thisInterpreter.getProperty(this, i);
	      thisInterpreter.setProperty(list, length++, element);
	    }
	    return list;
	  };
	  this.setNativeFunctionPrototype(this.ARRAY, 'slice', wrapper);
	
	  wrapper = function(opt_separator) {
	    if (!opt_separator || opt_separator.data === undefined) {
	      var sep = undefined;
	    } else {
	      var sep = opt_separator.toString();
	    }
	    var text = [];
	    for (var i = 0; i < this.length; i++) {
	      text[i] = this.properties[i];
	    }
	    return thisInterpreter.createPrimitive(text.join(sep));
	  };
	  this.setNativeFunctionPrototype(this.ARRAY, 'join', wrapper);
	
	  wrapper = function(var_args) {
	    var list = thisInterpreter.createObject(thisInterpreter.ARRAY);
	    var length = 0;
	    // Start by copying the current array.
	    for (var i = 0; i < this.length; i++) {
	      var element = thisInterpreter.getProperty(this, i);
	      thisInterpreter.setProperty(list, length++, element);
	    }
	    // Loop through all arguments and copy them in.
	    for (var i = 0; i < arguments.length; i++) {
	      var value = arguments[i];
	      if (thisInterpreter.isa(value, thisInterpreter.ARRAY)) {
	        for (var j = 0; j < value.length; j++) {
	          var element = thisInterpreter.getProperty(value, j);
	          thisInterpreter.setProperty(list, length++, element);
	        }
	      } else {
	        thisInterpreter.setProperty(list, length++, value);
	      }
	    }
	    return list;
	  };
	  this.setNativeFunctionPrototype(this.ARRAY, 'concat', wrapper);
	
	  wrapper = function(searchElement, opt_fromIndex) {
	    searchElement = searchElement || thisInterpreter.UNDEFINED;
	    var fromIndex = getInt(opt_fromIndex, 0);
	    if (fromIndex < 0) {
	      fromIndex = this.length + fromIndex;
	    }
	    fromIndex = Math.max(0, fromIndex);
	    for (var i = fromIndex; i < this.length; i++) {
	      var element = thisInterpreter.getProperty(this, i);
	      if (strictComp(element, searchElement)) {
	        return thisInterpreter.createPrimitive(i);
	      }
	    }
	    return thisInterpreter.createPrimitive(-1);
	  };
	  this.setNativeFunctionPrototype(this.ARRAY, 'indexOf', wrapper);
	
	  wrapper = function(searchElement, opt_fromIndex) {
	    searchElement = searchElement || thisInterpreter.UNDEFINED;
	    var fromIndex = getInt(opt_fromIndex, this.length);
	    if (fromIndex < 0) {
	      fromIndex = this.length + fromIndex;
	    }
	    fromIndex = Math.min(fromIndex, this.length - 1);
	    for (var i = fromIndex; i >= 0; i--) {
	      var element = thisInterpreter.getProperty(this, i);
	      if (strictComp(element, searchElement)) {
	        return thisInterpreter.createPrimitive(i);
	      }
	    }
	    return thisInterpreter.createPrimitive(-1);
	  };
	  this.setNativeFunctionPrototype(this.ARRAY, 'lastIndexOf', wrapper);
	
	  this.polyfills_.push(
	// Polyfill copied from:
	// developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array/every
	"Object.defineProperty(Array.prototype, 'every', {configurable: true, value:",
	  "function(callbackfn, thisArg) {",
	    "if (this == null || typeof callbackfn !== 'function') throw new TypeError;",
	    "var T, k;",
	    "var O = Object(this);",
	    "var len = O.length >>> 0;",
	    "if (arguments.length > 1) T = thisArg;",
	    "k = 0;",
	    "while (k < len) {",
	      "if (k in O && !callbackfn.call(T, O[k], k, O)) return false;",
	      "k++;",
	    "}",
	    "return true;",
	  "}",
	"});",
	
	// Polyfill copied from:
	// developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array/filter
	"Object.defineProperty(Array.prototype, 'filter', {configurable: true, value:",
	  "function(fun/*, thisArg*/) {",
	    "if (this === void 0 || this === null || typeof fun !== 'function') throw new TypeError;",
	    "var t = Object(this);",
	    "var len = t.length >>> 0;",
	    "var res = [];",
	    "var thisArg = arguments.length >= 2 ? arguments[1] : void 0;",
	    "for (var i = 0; i < len; i++) {",
	      "if (i in t) {",
	        "var val = t[i];",
	        "if (fun.call(thisArg, val, i, t)) res.push(val);",
	      "}",
	    "}",
	    "return res;",
	  "}",
	"});",
	
	// Polyfill copied from:
	// developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array/forEach
	"Object.defineProperty(Array.prototype, 'forEach', {configurable: true, value:",
	  "function(callback, thisArg) {",
	    "if (this == null || typeof callback !== 'function') throw new TypeError;",
	    "var T, k;",
	    "var O = Object(this);",
	    "var len = O.length >>> 0;",
	    "if (arguments.length > 1) T = thisArg;",
	    "k = 0;",
	    "while (k < len) {",
	      "if (k in O) callback.call(T, O[k], k, O);",
	      "k++;",
	    "}",
	  "}",
	"});",
	
	// Polyfill copied from:
	// developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array/map
	"Object.defineProperty(Array.prototype, 'map', {configurable: true, value:",
	  "function(callback, thisArg) {",
	    "if (this == null || typeof callback !== 'function') new TypeError;",
	    "var T, A, k;",
	    "var O = Object(this);",
	    "var len = O.length >>> 0;",
	    "if (arguments.length > 1) T = thisArg;",
	    "A = new Array(len);",
	    "k = 0;",
	    "while (k < len) {",
	      "if (k in O) A[k] = callback.call(T, O[k], k, O);",
	      "k++;",
	    "}",
	    "return A;",
	  "}",
	"});",
	
	// Polyfill copied from:
	// developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array/Reduce
	"Object.defineProperty(Array.prototype, 'reduce', {configurable: true, value:",
	  "function(callback /*, initialValue*/) {",
	    "if (this == null || typeof callback !== 'function') throw new TypeError;",
	    "var t = Object(this), len = t.length >>> 0, k = 0, value;",
	    "if (arguments.length == 2) {",
	      "value = arguments[1];",
	    "} else {",
	      "while (k < len && !(k in t)) k++;",
	      "if (k >= len) {",
	        "throw new TypeError('Reduce of empty array with no initial value');",
	      "}",
	      "value = t[k++];",
	    "}",
	    "for (; k < len; k++) {",
	      "if (k in t) value = callback(value, t[k], k, t);",
	    "}",
	    "return value;",
	  "}",
	"});",
	
	// Polyfill copied from:
	// developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array/ReduceRight
	"Object.defineProperty(Array.prototype, 'reduceRight', {configurable: true, value:",
	  "function(callback /*, initialValue*/) {",
	    "if (null === this || 'undefined' === typeof this || 'function' !== typeof callback) throw new TypeError;",
	    "var t = Object(this), len = t.length >>> 0, k = len - 1, value;",
	    "if (arguments.length >= 2) {",
	      "value = arguments[1];",
	    "} else {",
	      "while (k >= 0 && !(k in t)) k--;",
	      "if (k < 0) {",
	        "throw new TypeError('Reduce of empty array with no initial value');",
	      "}",
	      "value = t[k--];",
	    "}",
	    "for (; k >= 0; k--) {",
	      "if (k in t) value = callback(value, t[k], k, t);",
	    "}",
	    "return value;",
	  "}",
	"});",
	
	// Polyfill copied from:
	// developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array/some
	"Object.defineProperty(Array.prototype, 'some', {configurable: true, value:",
	  "function(fun/*, thisArg*/) {",
	    "if (this == null || typeof fun !== 'function') throw new TypeError;",
	    "var t = Object(this);",
	    "var len = t.length >>> 0;",
	    "var thisArg = arguments.length >= 2 ? arguments[1] : void 0;",
	    "for (var i = 0; i < len; i++) {",
	      "if (i in t && fun.call(thisArg, t[i], i, t)) {",
	        "return true;",
	      "}",
	    "}",
	    "return false;",
	  "}",
	"});",
	
	"Object.defineProperty(Array.prototype, 'sort', {configurable: true, value:",
	  "function(opt_comp) {",
	    "for (var i = 0; i < this.length; i++) {",
	      "var changes = 0;",
	      "for (var j = 0; j < this.length - i - 1; j++) {",
	        "if (opt_comp ?" +
	            "opt_comp(this[j], this[j + 1]) > 0 : this[j] > this[j + 1]) {",
	          "var swap = this[j];",
	          "this[j] = this[j + 1];",
	          "this[j + 1] = swap;",
	          "changes++;",
	        "}",
	      "}",
	      "if (changes <= 1) break;",
	    "}",
	    "return this;",
	  "}",
	"});",
	
	"Object.defineProperty(Array.prototype, 'toLocaleString', {configurable: true, value:",
	  "function() {",
	    "var out = [];",
	    "for (var i = 0; i < this.length; i++) {",
	      "out[i] = (this[i] === null || this[i] === undefined) ? '' : this[i].toLocaleString();",
	    "}",
	    "return out.join(',');",
	  "}",
	"});",
	"");
	};
	
	/**
	 * Initialize the Number class.
	 * @param {!Interpreter.Object} scope Global scope.
	 */
	Interpreter.prototype.initNumber = function(scope) {
	  var thisInterpreter = this;
	  var wrapper;
	  // Number constructor.
	  wrapper = function(value) {
	    value = value ? value.toNumber() : 0;
	    if (this.parent != thisInterpreter.NUMBER) {
	      // Called as Number().
	      return thisInterpreter.createPrimitive(value);
	    }
	    // Called as new Number().
	    this.data = value;
	    return this;
	  };
	  this.NUMBER = this.createNativeFunction(wrapper);
	  this.setProperty(scope, 'Number', this.NUMBER);
	
	  var numConsts = ['MAX_VALUE', 'MIN_VALUE', 'NaN', 'NEGATIVE_INFINITY',
	                   'POSITIVE_INFINITY'];
	  for (var i = 0; i < numConsts.length; i++) {
	    this.setProperty(this.NUMBER, numConsts[i],
	                     this.createPrimitive(Number[numConsts[i]]));
	  }
	
	  // Static methods on Number.
	  wrapper = function(str) {
	    str = str || thisInterpreter.UNDEFINED;
	    return thisInterpreter.createPrimitive(parseFloat(str.toString()));
	  };
	  this.setProperty(this.NUMBER, 'parseFloat',
	                   this.createNativeFunction(wrapper));
	
	  wrapper = function(str, radix) {
	    str = str || thisInterpreter.UNDEFINED;
	    radix = radix || thisInterpreter.UNDEFINED;
	    return thisInterpreter.createPrimitive(
	        parseInt(str.toString(), radix.toNumber()));
	  };
	  this.setProperty(this.NUMBER, 'parseInt',
	                   this.createNativeFunction(wrapper));
	
	  // Instance methods on Number.
	  wrapper = function(fractionDigits) {
	    fractionDigits = fractionDigits ? fractionDigits.toNumber() : undefined;
	    var n = this.toNumber();
	    return thisInterpreter.createPrimitive(n.toExponential(fractionDigits));
	  };
	  this.setNativeFunctionPrototype(this.NUMBER, 'toExponential', wrapper);
	
	  wrapper = function(digits) {
	    digits = digits ? digits.toNumber() : undefined;
	    var n = this.toNumber();
	    return thisInterpreter.createPrimitive(n.toFixed(digits));
	  };
	  this.setNativeFunctionPrototype(this.NUMBER, 'toFixed', wrapper);
	
	  wrapper = function(precision) {
	    precision = precision ? precision.toNumber() : undefined;
	    var n = this.toNumber();
	    return thisInterpreter.createPrimitive(n.toPrecision(precision));
	  };
	  this.setNativeFunctionPrototype(this.NUMBER, 'toPrecision', wrapper);
	
	  wrapper = function(radix) {
	    radix = radix ? radix.toNumber() : 10;
	    var n = this.toNumber();
	    return thisInterpreter.createPrimitive(n.toString(radix));
	  };
	  this.setNativeFunctionPrototype(this.NUMBER, 'toString', wrapper);
	
	  wrapper = function(locales, options) {
	    locales = locales ? thisInterpreter.pseudoToNative(locales) : undefined;
	    options = options ? thisInterpreter.pseudoToNative(options) : undefined;
	    return thisInterpreter.createPrimitive(
	        this.toNumber().toLocaleString(locales, options));
	  };
	  this.setNativeFunctionPrototype(this.NUMBER, 'toLocaleString', wrapper);
	};
	
	/**
	 * Initialize the String class.
	 * @param {!Interpreter.Object} scope Global scope.
	 */
	Interpreter.prototype.initString = function(scope) {
	  var thisInterpreter = this;
	  var wrapper;
	  // String constructor.
	  wrapper = function(value) {
	    value = value ? value.toString() : '';
	    if (this.parent != thisInterpreter.STRING) {
	      // Called as String().
	      return thisInterpreter.createPrimitive(value);
	    }
	    // Called as new String().
	    this.data = value;
	    return this;
	  };
	  this.STRING = this.createNativeFunction(wrapper);
	  this.setProperty(scope, 'String', this.STRING);
	
	  // Static methods on String.
	  wrapper = function(var_args) {
	    for (var i = 0; i < arguments.length; i++) {
	      arguments[i] = arguments[i].toNumber();
	    }
	    return thisInterpreter.createPrimitive(
	        String.fromCharCode.apply(String, arguments));
	  };
	  this.setProperty(this.STRING, 'fromCharCode',
	      this.createNativeFunction(wrapper), Interpreter.NONENUMERABLE_DESCRIPTOR);
	
	  // Instance methods on String.
	  // Methods with no arguments.
	  var functions = ['toLowerCase', 'toUpperCase',
	                   'toLocaleLowerCase', 'toLocaleUpperCase'];
	  for (var i = 0; i < functions.length; i++) {
	    wrapper = (function(nativeFunc) {
	      return function() {
	        return thisInterpreter.createPrimitive(nativeFunc.apply(this));
	      };
	    })(String.prototype[functions[i]]);
	    this.setNativeFunctionPrototype(this.STRING, functions[i], wrapper);
	  }
	
	  // Trim function may not exist in host browser.  Write them from scratch.
	  wrapper = function() {
	    var str = this.toString();
	    return thisInterpreter.createPrimitive(str.replace(/^\s+|\s+$/g, ''));
	  };
	  this.setNativeFunctionPrototype(this.STRING, 'trim', wrapper);
	  wrapper = function() {
	    var str = this.toString();
	    return thisInterpreter.createPrimitive(str.replace(/^\s+/g, ''));
	  };
	  this.setNativeFunctionPrototype(this.STRING, 'trimLeft', wrapper);
	  wrapper = function() {
	    var str = this.toString();
	    return thisInterpreter.createPrimitive(str.replace(/\s+$/g, ''));
	  };
	  this.setNativeFunctionPrototype(this.STRING, 'trimRight', wrapper);
	
	  // Methods with only numeric arguments.
	  functions = ['charAt', 'charCodeAt', 'substring', 'slice', 'substr'];
	  for (var i = 0; i < functions.length; i++) {
	    wrapper = (function(nativeFunc) {
	      return function() {
	        for (var j = 0; j < arguments.length; j++) {
	          arguments[j] = arguments[j].toNumber();
	        }
	        return thisInterpreter.createPrimitive(
	            nativeFunc.apply(this, arguments));
	      };
	    })(String.prototype[functions[i]]);
	    this.setNativeFunctionPrototype(this.STRING, functions[i], wrapper);
	  }
	
	  wrapper = function(searchValue, fromIndex) {
	    var str = this.toString();
	    searchValue = (searchValue || thisInterpreter.UNDEFINED).toString();
	    fromIndex = fromIndex ? fromIndex.toNumber() : undefined;
	    return thisInterpreter.createPrimitive(
	        str.indexOf(searchValue, fromIndex));
	  };
	  this.setNativeFunctionPrototype(this.STRING, 'indexOf', wrapper);
	
	  wrapper = function(searchValue, fromIndex) {
	    var str = this.toString();
	    searchValue = (searchValue || thisInterpreter.UNDEFINED).toString();
	    fromIndex = fromIndex ? fromIndex.toNumber() : undefined;
	    return thisInterpreter.createPrimitive(
	        str.lastIndexOf(searchValue, fromIndex));
	  };
	  this.setNativeFunctionPrototype(this.STRING, 'lastIndexOf', wrapper);
	
	  wrapper = function(compareString, locales, options) {
	    compareString = (compareString || thisInterpreter.UNDEFINED).toString();
	    locales = locales ? thisInterpreter.pseudoToNative(locales) : undefined;
	    options = options ? thisInterpreter.pseudoToNative(options) : undefined;
	    return thisInterpreter.createPrimitive(
	        this.toString().localeCompare(compareString, locales, options));
	  };
	  this.setNativeFunctionPrototype(this.STRING, 'localeCompare', wrapper);
	
	  wrapper = function(separator, limit) {
	    var str = this.toString();
	    if (separator) {
	      separator = thisInterpreter.isa(separator, thisInterpreter.REGEXP) ?
	          separator.data : separator.toString();
	    } else { // is this really necessary?
	      separator = undefined;
	    }
	    limit = limit ? limit.toNumber() : undefined;
	    var jsList = str.split(separator, limit);
	    var pseudoList = thisInterpreter.createObject(thisInterpreter.ARRAY);
	    for (var i = 0; i < jsList.length; i++) {
	      thisInterpreter.setProperty(pseudoList, i,
	          thisInterpreter.createPrimitive(jsList[i]));
	    }
	    return pseudoList;
	  };
	  this.setNativeFunctionPrototype(this.STRING, 'split', wrapper);
	
	  wrapper = function(var_args) {
	    var str = this.toString();
	    for (var i = 0; i < arguments.length; i++) {
	      str += arguments[i].toString();
	    }
	    return thisInterpreter.createPrimitive(str);
	  };
	  this.setNativeFunctionPrototype(this.STRING, 'concat', wrapper);
	
	  wrapper = function(regexp) {
	    var str = this.toString();
	    regexp = regexp ? regexp.data : undefined;
	    var match = str.match(regexp);
	    if (match === null) {
	      return thisInterpreter.NULL;
	    }
	    var pseudoList = thisInterpreter.createObject(thisInterpreter.ARRAY);
	    for (var i = 0; i < match.length; i++) {
	      thisInterpreter.setProperty(pseudoList, i,
	          thisInterpreter.createPrimitive(match[i]));
	    }
	    return pseudoList;
	  };
	  this.setNativeFunctionPrototype(this.STRING, 'match', wrapper);
	
	  wrapper = function(regexp) {
	    var str = this.toString();
	    regexp = regexp ? regexp.data : undefined;
	    return thisInterpreter.createPrimitive(str.search(regexp));
	  };
	  this.setNativeFunctionPrototype(this.STRING, 'search', wrapper);
	
	  wrapper = function(substr, newSubStr) {
	    var str = this.toString();
	    substr = (substr || thisInterpreter.UNDEFINED).valueOf();
	    newSubStr = (newSubStr || thisInterpreter.UNDEFINED).toString();
	    return thisInterpreter.createPrimitive(str.replace(substr, newSubStr));
	  };
	  this.setNativeFunctionPrototype(this.STRING, 'replace', wrapper);
	};
	
	/**
	 * Initialize the Boolean class.
	 * @param {!Interpreter.Object} scope Global scope.
	 */
	Interpreter.prototype.initBoolean = function(scope) {
	  var thisInterpreter = this;
	  var wrapper;
	  // Boolean constructor.
	  wrapper = function(value) {
	    value = value ? value.toBoolean() : false;
	    if (this.parent != thisInterpreter.BOOLEAN) {
	      // Called as Boolean().
	      return thisInterpreter.createPrimitive(value);
	    }
	    // Called as new Boolean().
	    this.data = value;
	    return this;
	  };
	  this.BOOLEAN = this.createNativeFunction(wrapper);
	  this.setProperty(scope, 'Boolean', this.BOOLEAN);
	};
	
	/**
	 * Initialize the Date class.
	 * @param {!Interpreter.Object} scope Global scope.
	 */
	Interpreter.prototype.initDate = function(scope) {
	  var thisInterpreter = this;
	  var wrapper;
	  // Date constructor.
	  wrapper = function(a, b, c, d, e, f, h) {
	    if (this.parent == thisInterpreter.DATE) {
	      // Called with new.
	      var newDate = this;
	    } else {
	      // Calling Date() as a function returns a string, no arguments are heeded.
	      return thisInterpreter.createPrimitive(Date());
	    }
	    if (!arguments.length) {
	      newDate.data = new Date();
	    } else if (arguments.length == 1 && (a.type == 'string' ||
	        thisInterpreter.isa(a, thisInterpreter.STRING))) {
	      newDate.data = new Date(a.toString());
	    } else {
	      var args = [null];
	      for (var i = 0; i < arguments.length; i++) {
	        args[i + 1] = arguments[i] ? arguments[i].toNumber() : undefined;
	      }
	      newDate.data = new (Function.prototype.bind.apply(Date, args));
	    }
	    return newDate;
	  };
	  this.DATE = this.createNativeFunction(wrapper);
	  this.setProperty(scope, 'Date', this.DATE);
	
	  // Static methods on Date.
	  wrapper = function() {
	    return thisInterpreter.createPrimitive(new Date().getTime());
	  };
	  this.setProperty(this.DATE, 'now',
	      this.createNativeFunction(wrapper), Interpreter.NONENUMERABLE_DESCRIPTOR);
	
	  wrapper = function(dateString) {
	    dateString = dateString ? dateString.toString() : undefined;
	    return thisInterpreter.createPrimitive(Date.parse(dateString));
	  };
	  this.setProperty(this.DATE, 'parse',
	      this.createNativeFunction(wrapper), Interpreter.NONENUMERABLE_DESCRIPTOR);
	
	  wrapper = function(a, b, c, d, e, f, h) {
	    var args = [];
	    for (var i = 0; i < arguments.length; i++) {
	      args[i] = arguments[i] ? arguments[i].toNumber() : undefined;
	    }
	    return thisInterpreter.createPrimitive(Date.UTC.apply(Date, args));
	  };
	  this.setProperty(this.DATE, 'UTC',
	      this.createNativeFunction(wrapper), Interpreter.NONENUMERABLE_DESCRIPTOR);
	
	  // Instance methods on Date.
	  var functions = ['getDate', 'getDay', 'getFullYear', 'getHours',
	      'getMilliseconds', 'getMinutes', 'getMonth', 'getSeconds', 'getTime',
	      'getTimezoneOffset', 'getUTCDate', 'getUTCDay', 'getUTCFullYear',
	      'getUTCHours', 'getUTCMilliseconds', 'getUTCMinutes', 'getUTCMonth',
	      'getUTCSeconds', 'getYear',
	      'setDate', 'setFullYear', 'setHours', 'setMilliseconds',
	      'setMinutes', 'setMonth', 'setSeconds', 'setTime', 'setUTCDate',
	      'setUTCFullYear', 'setUTCHours', 'setUTCMilliseconds', 'setUTCMinutes',
	      'setUTCMonth', 'setUTCSeconds', 'setYear',
	      'toDateString', 'toISOString', 'toJSON', 'toGMTString',
	      'toLocaleDateString', 'toLocaleString', 'toLocaleTimeString',
	      'toTimeString', 'toUTCString'];
	  for (var i = 0; i < functions.length; i++) {
	    wrapper = (function(nativeFunc) {
	      return function(var_args) {
	        var args = [];
	        for (var i = 0; i < arguments.length; i++) {
	          args[i] = thisInterpreter.pseudoToNative(arguments[i]);
	        }
	        return thisInterpreter.createPrimitive(
	            this.data[nativeFunc].apply(this.data, args));
	      };
	    })(functions[i]);
	    this.setNativeFunctionPrototype(this.DATE, functions[i], wrapper);
	  }
	};
	
	/**
	 * Initialize Math object.
	 * @param {!Interpreter.Object} scope Global scope.
	 */
	Interpreter.prototype.initMath = function(scope) {
	  var thisInterpreter = this;
	  var myMath = this.createObject(this.OBJECT);
	  this.setProperty(scope, 'Math', myMath);
	  var mathConsts = ['E', 'LN2', 'LN10', 'LOG2E', 'LOG10E', 'PI',
	                    'SQRT1_2', 'SQRT2'];
	  for (var i = 0; i < mathConsts.length; i++) {
	    this.setProperty(myMath, mathConsts[i],
	        this.createPrimitive(Math[mathConsts[i]]),
	        Interpreter.READONLY_NONENUMERABLE_DESCRIPTOR);
	  }
	  var numFunctions = ['abs', 'acos', 'asin', 'atan', 'atan2', 'ceil', 'cos',
	                      'exp', 'floor', 'log', 'max', 'min', 'pow', 'random',
	                      'round', 'sin', 'sqrt', 'tan'];
	  for (var i = 0; i < numFunctions.length; i++) {
	    var wrapper = (function(nativeFunc) {
	      return function() {
	        for (var j = 0; j < arguments.length; j++) {
	          arguments[j] = arguments[j].toNumber();
	        }
	        return thisInterpreter.createPrimitive(
	            nativeFunc.apply(Math, arguments));
	      };
	    })(Math[numFunctions[i]]);
	    this.setProperty(myMath, numFunctions[i],
	        this.createNativeFunction(wrapper),
	        Interpreter.NONENUMERABLE_DESCRIPTOR);
	  }
	};
	
	/**
	 * Initialize Regular Expression object.
	 * @param {!Interpreter.Object} scope Global scope.
	 */
	Interpreter.prototype.initRegExp = function(scope) {
	  var thisInterpreter = this;
	  var wrapper;
	  // Regex constructor.
	  wrapper = function(pattern, flags) {
	    if (this.parent == thisInterpreter.REGEXP) {
	      // Called with new.
	      var rgx = this;
	    } else {
	      var rgx = thisInterpreter.createObject(thisInterpreter.REGEXP);
	    }
	    pattern = pattern ? pattern.toString() : '';
	    flags = flags ? flags.toString() : '';
	    return thisInterpreter.populateRegExp_(rgx, new RegExp(pattern, flags));
	  };
	  this.REGEXP = this.createNativeFunction(wrapper);
	  this.setProperty(scope, 'RegExp', this.REGEXP);
	
	  this.setProperty(this.REGEXP.properties.prototype, 'global',
	      this.UNDEFINED, Interpreter.READONLY_NONENUMERABLE_DESCRIPTOR);
	  this.setProperty(this.REGEXP.properties.prototype, 'ignoreCase',
	      this.UNDEFINED, Interpreter.READONLY_NONENUMERABLE_DESCRIPTOR);
	  this.setProperty(this.REGEXP.properties.prototype, 'multiline',
	      this.UNDEFINED, Interpreter.READONLY_NONENUMERABLE_DESCRIPTOR);
	  this.setProperty(this.REGEXP.properties.prototype, 'source',
	      this.createPrimitive('(?:)'),
	      Interpreter.READONLY_NONENUMERABLE_DESCRIPTOR);
	
	  wrapper = function(str) {
	    str = str.toString();
	    return thisInterpreter.createPrimitive(this.data.test(str));
	  };
	  this.setNativeFunctionPrototype(this.REGEXP, 'test', wrapper);
	
	  wrapper = function(str) {
	    str = str.toString();
	    // Get lastIndex from wrapped regex, since this is settable.
	    this.data.lastIndex =
	        thisInterpreter.getProperty(this, 'lastIndex').toNumber();
	    var match = this.data.exec(str);
	    thisInterpreter.setProperty(this, 'lastIndex',
	        thisInterpreter.createPrimitive(this.data.lastIndex));
	
	    if (match) {
	      var result = thisInterpreter.createObject(thisInterpreter.ARRAY);
	      for (var i = 0; i < match.length; i++) {
	        thisInterpreter.setProperty(result, i,
	            thisInterpreter.createPrimitive(match[i]));
	      }
	      // match has additional properties.
	      thisInterpreter.setProperty(result, 'index',
	          thisInterpreter.createPrimitive(match.index));
	      thisInterpreter.setProperty(result, 'input',
	          thisInterpreter.createPrimitive(match.input));
	      return result;
	    }
	    return thisInterpreter.NULL;
	  };
	  this.setNativeFunctionPrototype(this.REGEXP, 'exec', wrapper);
	};
	
	/**
	 * Initialize JSON object.
	 * @param {!Interpreter.Object} scope Global scope.
	 */
	Interpreter.prototype.initJSON = function(scope) {
	  var thisInterpreter = this;
	  var myJSON = thisInterpreter.createObject(this.OBJECT);
	  this.setProperty(scope, 'JSON', myJSON);
	
	  var wrapper = function(text) {
	    try {
	      var nativeObj = JSON.parse(text.toString());
	    } catch (e) {
	      thisInterpreter.throwException(thisInterpreter.SYNTAX_ERROR, e.message);
	      return;
	    }
	    return thisInterpreter.nativeToPseudo(nativeObj);
	  };
	  this.setProperty(myJSON, 'parse', this.createNativeFunction(wrapper));
	
	  wrapper = function(value) {
	    var nativeObj = thisInterpreter.pseudoToNative(value);
	    return thisInterpreter.createPrimitive(JSON.stringify(nativeObj));
	  };
	  this.setProperty(myJSON, 'stringify', this.createNativeFunction(wrapper));
	};
	
	/**
	 * Initialize the Error class.
	 * @param {!Interpreter.Object} scope Global scope.
	 */
	Interpreter.prototype.initError = function(scope) {
	  var thisInterpreter = this;
	  // Error constructor.
	  this.ERROR = this.createNativeFunction(function(opt_message) {
	    if (this.parent == thisInterpreter.ERROR) {
	      // Called with new.
	      var newError = this;
	    } else {
	      var newError = thisInterpreter.createObject(thisInterpreter.ERROR);
	    }
	    if (opt_message) {
	      thisInterpreter.setProperty(newError, 'message',
	          thisInterpreter.createPrimitive(String(opt_message)),
	          Interpreter.NONENUMERABLE_DESCRIPTOR);
	    }
	    return newError;
	  });
	  this.setProperty(scope, 'Error', this.ERROR);
	  this.setProperty(this.ERROR.properties.prototype, 'message',
	      this.STRING_EMPTY, Interpreter.NONENUMERABLE_DESCRIPTOR);
	  this.setProperty(this.ERROR.properties.prototype, 'name',
	      this.createPrimitive('Error'), Interpreter.NONENUMERABLE_DESCRIPTOR);
	
	  var createErrorSubclass = function(name) {
	    var constructor = thisInterpreter.createNativeFunction(
	        function(opt_message) {
	          if (thisInterpreter.isa(this.parent, thisInterpreter.ERROR)) {
	            // Called with new.
	            var newError = this;
	          } else {
	            var newError = thisInterpreter.createObject(constructor);
	          }
	          if (opt_message) {
	            thisInterpreter.setProperty(newError, 'message',
	                thisInterpreter.createPrimitive(String(opt_message)),
	                Interpreter.NONENUMERABLE_DESCRIPTOR);
	          }
	          return newError;
	        });
	    thisInterpreter.setProperty(constructor, 'prototype',
	        thisInterpreter.createObject(thisInterpreter.ERROR));
	    thisInterpreter.setProperty(constructor.properties.prototype, 'name',
	        thisInterpreter.createPrimitive(name),
	        Interpreter.NONENUMERABLE_DESCRIPTOR);
	    thisInterpreter.setProperty(scope, name, constructor);
	
	    return constructor;
	  };
	
	  this.EVAL_ERROR = createErrorSubclass('EvalError');
	  this.RANGE_ERROR = createErrorSubclass('RangeError');
	  this.REFERENCE_ERROR = createErrorSubclass('ReferenceError');
	  this.SYNTAX_ERROR = createErrorSubclass('SyntaxError');
	  this.TYPE_ERROR = createErrorSubclass('TypeError');
	  this.URI_ERROR = createErrorSubclass('URIError');
	};
	
	/**
	 * Is an object of a certain class?
	 * @param {Object} child Object to check.
	 * @param {Object} parent Constructor of object.
	 * @return {boolean} True if object is the class or inherits from it.
	 *     False otherwise.
	 */
	Interpreter.prototype.isa = function(child, parent) {
	  if (!child || !parent) {
	    return false;
	  }
	  while (child.parent != parent) {
	    if (!child.parent || !child.parent.properties.prototype) {
	      return false;
	    }
	    child = child.parent.properties.prototype;
	  }
	  return true;
	};
	
	/**
	 * Compares two objects against each other.
	 * @param {!Object} a First object.
	 * @param {!Object} b Second object.
	 * @return {number} -1 if a is smaller, 0 if a == b, 1 if a is bigger,
	 *     NaN if they are not comparable.
	 */
	Interpreter.prototype.comp = function(a, b) {
	  if (a.isPrimitive && isNaN(a.data) ||
	      b.isPrimitive && isNaN(b.data)) {
	    // NaN is not comparable to anything, including itself.
	    return NaN;
	  }
	  if (a === b) {
	    return 0;
	  }
	  var aValue =
	        a.isPrimitive ? a.data : a.toString();
	  var bValue =
	        b.isPrimitive ? b.data : b.toString();
	  if (aValue < bValue) {
	    return -1;
	  } else if (aValue > bValue) {
	    return 1;
	  }
	  return 0;
	};
	
	/**
	 * Is a value a legal integer for an array?
	 * @param {*} n Value to check.
	 * @return {number} Zero, or a positive integer if the value can be
	 *     converted to such.  NaN otherwise.
	 */
	Interpreter.prototype.arrayIndex = function(n) {
	  n = Number(n);
	  if (!isFinite(n) || n != Math.floor(n) || n < 0) {
	    return NaN;
	  }
	  return n;
	};
	
	/**
	 * Class for a number, string, boolean, null, or undefined.
	 * @param {number|string|boolean|null|undefined} data Primitive value.
	 * @param {!Interpreter} interpreter The JS Interpreter to bind to.
	 * @constructor
	 */
	Interpreter.Primitive = function(data, interpreter) {
	  var type = typeof data;
	  this.data = data;
	  this.type = type;
	  if (type == 'number') {
	    this.parent = interpreter.NUMBER;
	  } else if (type == 'string') {
	    this.parent = interpreter.STRING;
	  } else if (type == 'boolean') {
	    this.parent = interpreter.BOOLEAN;
	  }
	};
	
	/**
	 * @type {number|string|boolean|null|undefined}
	 */
	Interpreter.Primitive.prototype.data = undefined;
	
	/**
	 * @type {string}
	 */
	Interpreter.Primitive.prototype.type = 'undefined';
	
	/**
	 * @type {Function}
	 */
	Interpreter.Primitive.prototype.parent = null;
	
	/**
	 * @type {boolean}
	 */
	Interpreter.Primitive.prototype.isPrimitive = true;
	
	/**
	 * Convert this primitive into a boolean.
	 * @return {boolean} Boolean value.
	 */
	Interpreter.Primitive.prototype.toBoolean = function() {
	  return Boolean(this.data);
	};
	
	/**
	 * Convert this primitive into a number.
	 * @return {number} Number value.
	 */
	Interpreter.Primitive.prototype.toNumber = function() {
	  return Number(this.data);
	};
	
	/**
	 * Convert this primitive into a string.
	 * @return {string} String value.
	 * @override
	 */
	Interpreter.Primitive.prototype.toString = function() {
	  return String(this.data);
	};
	
	/**
	 * Return the primitive value.
	 * @return {number|string|boolean|null|undefined} Primitive value.
	 * @override
	 */
	Interpreter.Primitive.prototype.valueOf = function() {
	  return this.data;
	};
	
	/**
	 * Create a new data object for a primitive.
	 * @param {number|string|boolean|null|undefined|RegExp} data Data to
	 *     encapsulate.
	 * @return {!Interpreter.Primitive|!Interpreter.Object} New data object.
	 */
	Interpreter.prototype.createPrimitive = function(data) {
	  // Reuse a predefined primitive constant if possible.
	  if (data === undefined) {
	    return this.UNDEFINED;
	  } else if (data === null) {
	    return this.NULL;
	  } else if (data === true) {
	    return this.TRUE;
	  } else if (data === false) {
	    return this.FALSE;
	  } else if (data === 0) {
	    return this.NUMBER_ZERO;
	  } else if (data === 1) {
	    return this.NUMBER_ONE;
	  } else if (data === '') {
	    return this.STRING_EMPTY;
	  } else if (data instanceof RegExp) {
	    return this.populateRegExp_(this.createObject(this.REGEXP), data);
	  }
	  return new Interpreter.Primitive(data, this);
	};
	
	/**
	 * Class for an object.
	 * @param {Interpreter.Object} parent Parent constructor function.
	 * @constructor
	 */
	Interpreter.Object = function(parent) {
	  this.notConfigurable = Object.create(null);
	  this.notEnumerable = Object.create(null);
	  this.notWritable = Object.create(null);
	  this.getter = Object.create(null);
	  this.setter = Object.create(null);
	  this.properties = Object.create(null);
	  this.parent = parent;
	};
	
	/**
	 * @type {string}
	 */
	Interpreter.Object.prototype.type = 'object';
	
	/**
	 * @type {Interpreter.Object}
	 */
	Interpreter.Object.prototype.parent = null;
	
	/**
	 * @type {boolean}
	 */
	Interpreter.Object.prototype.isPrimitive = false;
	
	/**
	 * @type {number|string|boolean|undefined|!RegExp}
	 */
	Interpreter.Object.prototype.data = undefined;
	
	/**
	 * Convert this object into a boolean.
	 * @return {boolean} Boolean value.
	 */
	Interpreter.Object.prototype.toBoolean = function() {
	  return true;
	};
	
	/**
	 * Convert this object into a number.
	 * @return {number} Number value.
	 */
	Interpreter.Object.prototype.toNumber = function() {
	  return Number(this.data === undefined ? this.toString() : this.data);
	};
	
	/**
	 * Convert this object into a string.
	 * @return {string} String value.
	 * @override
	 */
	Interpreter.Object.prototype.toString = function() {
	  return this.data === undefined ? ('[' + this.type + ']') : String(this.data);
	};
	
	/**
	 * Return the object value.
	 * @return {*} Value.
	 * @override
	 */
	Interpreter.Object.prototype.valueOf = function() {
	  return this.data === undefined ? this : this.data;
	};
	
	/**
	 * Create a new data object.
	 * @param {Interpreter.Object} parent Parent constructor function.
	 * @return {!Interpreter.Object} New data object.
	 */
	Interpreter.prototype.createObject = function(parent) {
	  var obj = new Interpreter.Object(parent);
	  // Functions have prototype objects.
	  if (this.isa(obj, this.FUNCTION)) {
	    obj.type = 'function';
	    this.setProperty(obj, 'prototype', this.createObject(this.OBJECT || null));
	  }
	  // Arrays have length.
	  if (this.isa(obj, this.ARRAY)) {
	    obj.length = 0;
	    obj.toString = function() {
	      var strs = [];
	      for (var i = 0; i < this.length; i++) {
	        var value = this.properties[i];
	        strs[i] = (!value || (value.isPrimitive && (value.data === null ||
	            value.data === undefined))) ? '' : value.toString();
	      }
	      return strs.join(',');
	    };
	  }
	  return obj;
	};
	
	/**
	 * Initialize a pseudo regular expression object based on a native regular
	 * expression object.
	 * @param {!Interpreter.Object} pseudoRegexp The existing object to set.
	 * @param {!RegExp} nativeRegexp The native regular expression.
	 * @return {!Interpreter.Object} Newly populated regular expression object.
	 * @private
	 */
	Interpreter.prototype.populateRegExp_ = function(pseudoRegexp, nativeRegexp) {
	  pseudoRegexp.data = nativeRegexp;
	  // lastIndex is settable, all others are read-only attributes
	  this.setProperty(pseudoRegexp, 'lastIndex',
	      this.createPrimitive(nativeRegexp.lastIndex),
	      Interpreter.NONENUMERABLE_DESCRIPTOR);
	  this.setProperty(pseudoRegexp, 'source',
	      this.createPrimitive(nativeRegexp.source),
	      Interpreter.READONLY_NONENUMERABLE_DESCRIPTOR);
	  this.setProperty(pseudoRegexp, 'global',
	      this.createPrimitive(nativeRegexp.global),
	      Interpreter.READONLY_NONENUMERABLE_DESCRIPTOR);
	  this.setProperty(pseudoRegexp, 'ignoreCase',
	      this.createPrimitive(nativeRegexp.ignoreCase),
	      Interpreter.READONLY_NONENUMERABLE_DESCRIPTOR);
	  this.setProperty(pseudoRegexp, 'multiline',
	      this.createPrimitive(nativeRegexp.multiline),
	      Interpreter.READONLY_NONENUMERABLE_DESCRIPTOR);
	  // Override a couple of Object's conversion functions.
	  pseudoRegexp.toString = function() {return String(this.data);};
	  pseudoRegexp.valueOf = function() {return this.data;};
	  return pseudoRegexp;
	};
	
	/**
	 * Create a new function.
	 * @param {Object} node AST node defining the function.
	 * @param {Object=} opt_scope Optional parent scope.
	 * @return {!Interpreter.Object} New function.
	 */
	Interpreter.prototype.createFunction = function(node, opt_scope) {
	  var func = this.createObject(this.FUNCTION);
	  func.parentScope = opt_scope || this.getScope();
	  func.node = node;
	  this.setProperty(func, 'length',
	      this.createPrimitive(func.node.params.length),
	      Interpreter.READONLY_DESCRIPTOR);
	  return func;
	};
	
	/**
	 * Create a new native function.
	 * @param {!Function} nativeFunc JavaScript function.
	 * @return {!Interpreter.Object} New function.
	 */
	Interpreter.prototype.createNativeFunction = function(nativeFunc) {
	  var func = this.createObject(this.FUNCTION);
	  func.nativeFunc = nativeFunc;
	  this.setProperty(func, 'length', this.createPrimitive(nativeFunc.length),
	      Interpreter.READONLY_DESCRIPTOR);
	  return func;
	};
	
	/**
	 * Create a new native asynchronous function.
	 * @param {!Function} asyncFunc JavaScript function.
	 * @return {!Interpreter.Object} New function.
	 */
	Interpreter.prototype.createAsyncFunction = function(asyncFunc) {
	  var func = this.createObject(this.FUNCTION);
	  func.asyncFunc = asyncFunc;
	  this.setProperty(func, 'length', this.createPrimitive(asyncFunc.length),
	      Interpreter.READONLY_DESCRIPTOR);
	  return func;
	};
	
	/**
	 * Converts from a native JS object or value to a JS interpreter object.
	 * Can handle JSON-style values.
	 * @param {*} nativeObj The native JS object to be converted.
	 * @return {!Interpreter.Object|!Interpreter.Primitive} The equivalent
	 *     JS interpreter object.
	 */
	Interpreter.prototype.nativeToPseudo = function(nativeObj) {
	  if (typeof nativeObj == 'boolean' ||
	      typeof nativeObj == 'number' ||
	      typeof nativeObj == 'string' ||
	      nativeObj === null || nativeObj === undefined ||
	      nativeObj instanceof RegExp) {
	    return this.createPrimitive(nativeObj);
	  }
	  var pseudoObj;
	  if (nativeObj instanceof Array) {  // Array.
	    pseudoObj = this.createObject(this.ARRAY);
	    for (var i = 0; i < nativeObj.length; i++) {
	      this.setProperty(pseudoObj, i, this.nativeToPseudo(nativeObj[i]));
	    }
	  } else {  // Object.
	    pseudoObj = this.createObject(this.OBJECT);
	    for (var key in nativeObj) {
	      this.setProperty(pseudoObj, key, this.nativeToPseudo(nativeObj[key]));
	    }
	  }
	  return pseudoObj;
	};
	
	/**
	 * Converts from a JS interpreter object to native JS object.
	 * Can handle JSON-style values.
	 * @param {!Interpreter.Object|!Interpreter.Primitive} pseudoObj The JS
	 *     interpreter object to be converted.
	 * @return {*} The equivalent native JS object or value.
	 */
	Interpreter.prototype.pseudoToNative = function(pseudoObj) {
	  if (pseudoObj.isPrimitive ||
	      this.isa(pseudoObj, this.NUMBER) ||
	      this.isa(pseudoObj, this.STRING) ||
	      this.isa(pseudoObj, this.BOOLEAN)) {
	    return pseudoObj.data;
	  }
	  var nativeObj;
	  if (this.isa(pseudoObj, this.ARRAY)) {  // Array.
	    nativeObj = [];
	    for (var i = 0; i < pseudoObj.length; i++) {
	      nativeObj[i] = this.pseudoToNative(pseudoObj.properties[i]);
	    }
	  } else {  // Object.
	    nativeObj = {};
	    for (var key in pseudoObj.properties) {
	      nativeObj[key] = this.pseudoToNative(pseudoObj.properties[key]);
	    }
	  }
	  return nativeObj;
	};
	
	/**
	 * Fetch a property value from a data object.
	 * @param {!Interpreter.Object|!Interpreter.Primitive} obj Data object.
	 * @param {*} name Name of property.
	 * @return {!Interpreter.Object|!Interpreter.Primitive|null} Property value
	 *     (may be UNDEFINED), or null if an error was thrown and will be caught.
	 */
	Interpreter.prototype.getProperty = function(obj, name) {
	  name = name.toString();
	  if (obj == this.UNDEFINED || obj == this.NULL) {
	    this.throwException(this.TYPE_ERROR,
	                        "Cannot read property '" + name + "' of " + obj);
	    return null;
	  }
	  // Special cases for magic length property.
	  if (this.isa(obj, this.STRING)) {
	    if (name == 'length') {
	      return this.createPrimitive(obj.data.length);
	    }
	    var n = this.arrayIndex(name);
	    if (!isNaN(n) && n < obj.data.length) {
	      return this.createPrimitive(obj.data[n]);
	    }
	  } else if (this.isa(obj, this.ARRAY) && name == 'length') {
	    return this.createPrimitive(obj.length);
	  }
	  while (true) {
	    if (obj.properties && name in obj.properties) {
	      var getter = obj.getter[name];
	      if (getter) {
	        // Flag this function as being a getter and thus needing immediate
	        // execution (rather than being the value of the property).
	        getter.isGetter = true;
	        return getter;
	      }
	      return obj.properties[name];
	    }
	    if (obj.parent && obj.parent.properties &&
	        obj.parent.properties.prototype) {
	      obj = obj.parent.properties.prototype;
	    } else {
	      // No parent, reached the top.
	      break;
	    }
	  }
	  return this.UNDEFINED;
	};
	
	/**
	 * Does the named property exist on a data object.
	 * @param {!Interpreter.Object|!Interpreter.Primitive} obj Data object.
	 * @param {*} name Name of property.
	 * @return {boolean} True if property exists.
	 */
	Interpreter.prototype.hasProperty = function(obj, name) {
	  name = name.toString();
	  if (obj.isPrimitive) {
	    throw TypeError('Primitive data type has no properties');
	  }
	  if (name == 'length' &&
	      (this.isa(obj, this.STRING) || this.isa(obj, this.ARRAY))) {
	    return true;
	  }
	  if (this.isa(obj, this.STRING)) {
	    var n = this.arrayIndex(name);
	    if (!isNaN(n) && n < obj.data.length) {
	      return true;
	    }
	  }
	  while (true) {
	    if (obj.properties && name in obj.properties) {
	      return true;
	    }
	    if (obj.parent && obj.parent.properties &&
	        obj.parent.properties.prototype) {
	      obj = obj.parent.properties.prototype;
	    } else {
	      // No parent, reached the top.
	      break;
	    }
	  }
	  return false;
	};
	
	/**
	 * Set a property value on a data object.
	 * @param {!Interpreter.Object} obj Data object.
	 * @param {*} name Name of property.
	 * @param {Interpreter.Object|Interpreter.Primitive} value
	 *     New property value or null if getter/setter is described.
	 * @param {Object=} opt_descriptor Optional descriptor object.
	 * @return {!Interpreter.Object|undefined} Returns a setter function if one
	 *     needs to be called, otherwise undefined.
	 */
	Interpreter.prototype.setProperty = function(obj, name, value, opt_descriptor) {
	  name = name.toString();
	  if (opt_descriptor && obj.notConfigurable[name]) {
	    this.throwException(this.TYPE_ERROR, 'Cannot redefine property: ' + name);
	  }
	  if (typeof value != 'object') {
	    throw Error('Failure to wrap a value: ' + value);
	  }
	  if (obj == this.UNDEFINED || obj == this.NULL) {
	    this.throwException(this.TYPE_ERROR,
	                        "Cannot set property '" + name + "' of " + obj);
	  }
	  if (opt_descriptor && (opt_descriptor.get || opt_descriptor.set) &&
	      (value || opt_descriptor.writable !== undefined)) {
	    this.throwException(this.TYPE_ERROR, 'Invalid property descriptor. ' +
	        'Cannot both specify accessors and a value or writable attribute');
	  }
	  if (obj.isPrimitive) {
	    return;
	  }
	  if (this.isa(obj, this.STRING)) {
	    var n = this.arrayIndex(name);
	    if (name == 'length' || (!isNaN(n) && n < obj.data.length)) {
	      // Can't set length or letters on Strings.
	      return;
	    }
	  }
	  if (this.isa(obj, this.ARRAY)) {
	    // Arrays have a magic length variable that is bound to the elements.
	    var i;
	    if (name == 'length') {
	      // Delete elements if length is smaller.
	      var newLength = this.arrayIndex(value.toNumber());
	      if (isNaN(newLength)) {
	        this.throwException(this.RANGE_ERROR, 'Invalid array length');
	      }
	      if (newLength < obj.length) {
	        for (i in obj.properties) {
	          i = this.arrayIndex(i);
	          if (!isNaN(i) && newLength <= i) {
	            delete obj.properties[i];
	          }
	        }
	      }
	      obj.length = newLength;
	      return;  // Don't set a real length property.
	    } else if (!isNaN(i = this.arrayIndex(name))) {
	      // Increase length if this index is larger.
	      obj.length = Math.max(obj.length, i + 1);
	    }
	  }
	  if (!obj.properties[name] && obj.preventExtensions) {
	    var scope = this.getScope();
	    if (scope.strict) {
	      this.throwException(this.TYPE_ERROR, 'Can\'t add property ' + name +
	                          ', object is not extensible');
	    }
	    return;
	  }
	  if (opt_descriptor) {
	    // Define the property.
	    obj.properties[name] = value;
	    if (!opt_descriptor.configurable) {
	      obj.notConfigurable[name] = true;
	    }
	    var getter = opt_descriptor.get;
	    if (getter) {
	      obj.getter[name] = getter;
	    } else {
	      delete obj.getter[name];
	    }
	    var setter = opt_descriptor.set;
	    if (setter) {
	      obj.setter[name] = setter;
	    } else {
	      delete obj.setter[name];
	    }
	    var enumerable = opt_descriptor.enumerable || false;
	    if (enumerable) {
	      delete obj.notEnumerable[name];
	    } else {
	      obj.notEnumerable[name] = true;
	    }
	    if (getter || setter) {
	      delete obj.notWritable[name];
	      obj.properties[name] = this.UNDEFINED;
	    } else {
	      var writable = opt_descriptor.writable || false;
	      if (writable) {
	        delete obj.notWritable[name];
	      } else {
	        obj.notWritable[name] = true;
	      }
	    }
	  } else {
	    // Set the property.
	    // Determine if there is a setter anywhere in the history chain.
	    var parent = obj;
	    while (true) {
	      if (parent.setter && parent.setter[name]) {
	        return parent.setter[name];
	      }
	      if (parent.parent && parent.parent.properties &&
	          parent.parent.properties.prototype) {
	        parent = parent.parent.properties.prototype;
	      } else {
	        // No parent, reached the top.
	        break;
	      }
	    }
	    // No setter, simple assignment.
	    if (!obj.notWritable[name]) {
	      obj.properties[name] = value;
	    }
	  }
	};
	
	/**
	 * Convenience method for adding a native function as a non-enumerable property
	 * onto an object's prototype.
	 * @param {!Interpreter.Object} obj Data object.
	 * @param {*} name Name of property.
	 * @param {!Function} wrapper Function object.
	 */
	Interpreter.prototype.setNativeFunctionPrototype =
	    function(obj, name, wrapper) {
	  this.setProperty(obj.properties.prototype, name,
	      this.createNativeFunction(wrapper),
	      Interpreter.NONENUMERABLE_DESCRIPTOR);
	};
	
	/**
	 * Delete a property value on a data object.
	 * @param {!Interpreter.Object} obj Data object.
	 * @param {*} name Name of property.
	 * @return {boolean} True if deleted, false if undeletable.
	 */
	Interpreter.prototype.deleteProperty = function(obj, name) {
	  name = name.toString();
	  if (obj.isPrimitive || obj.notWritable[name]) {
	    return false;
	  }
	  if (name == 'length' && this.isa(obj, this.ARRAY)) {
	    return false;
	  }
	  return delete obj.properties[name];
	};
	
	/**
	 * Returns the current scope from the stateStack.
	 * @return {!Interpreter.Object} Current scope dictionary.
	 */
	Interpreter.prototype.getScope = function() {
	  for (var i = 0; i < this.stateStack.length; i++) {
	    if (this.stateStack[i].scope) {
	      return this.stateStack[i].scope;
	    }
	  }
	  throw Error('No scope found.');
	};
	
	/**
	 * Create a new scope dictionary.
	 * @param {!Object} node AST node defining the scope container
	 *     (e.g. a function).
	 * @param {Interpreter.Object} parentScope Scope to link to.
	 * @return {!Interpreter.Object} New scope.
	 */
	Interpreter.prototype.createScope = function(node, parentScope) {
	  var scope = this.createObject(null);
	  scope.parentScope = parentScope;
	  if (!parentScope) {
	    this.initGlobalScope(scope);
	  }
	  this.populateScope_(node, scope);
	
	  // Determine if this scope starts with 'use strict'.
	  scope.strict = false;
	  if (parentScope && parentScope.strict) {
	    scope.strict = true;
	  } else {
	    var firstNode = node.body && node.body[0];
	    if (firstNode && firstNode.expression &&
	        firstNode.expression.type == 'Literal' &&
	        firstNode.expression.value == 'use strict') {
	      scope.strict = true;
	    }
	  }
	  return scope;
	};
	
	/**
	 * Create a new special scope dictionary. Similar to createScope(), but
	 * doesn't assume that the scope is for a function body. This is used for
	 * the catch clause and with statement.
	 * @param {!Interpreter.Object} parentScope Scope to link to.
	 * @param {Interpreter.Object=} opt_scope Optional object to transform into
	 *     scope.
	 * @return {!Interpreter.Object} New scope.
	 */
	Interpreter.prototype.createSpecialScope = function(parentScope, opt_scope) {
	  if (!parentScope) {
	    throw Error('parentScope required');
	  }
	  var scope = opt_scope || this.createObject(null);
	  scope.parentScope = parentScope;
	  scope.strict = parentScope.strict;
	  return scope;
	};
	
	
	/**
	 * Retrieves a value from the scope chain.
	 * @param {!Interpreter.Object|!Interpreter.Primitive} name Name of variable.
	 * @return {!Interpreter.Object|!Interpreter.Primitive|null} The value
	 *     or null if an error was thrown and will be caught.
	 */
	Interpreter.prototype.getValueFromScope = function(name) {
	  var scope = this.getScope();
	  var nameStr = name.toString();
	  while (scope) {
	    if (nameStr in scope.properties) {
	      return scope.properties[nameStr];
	    }
	    scope = scope.parentScope;
	  }
	  this.throwException(this.REFERENCE_ERROR, nameStr + ' is not defined');
	  return null;
	};
	
	/**
	 * Sets a value to the current scope.
	 * @param {!Interpreter.Object|!Interpreter.Primitive} name Name of variable.
	 * @param {!Interpreter.Object|!Interpreter.Primitive} value Value.
	 */
	Interpreter.prototype.setValueToScope = function(name, value) {
	  var scope = this.getScope();
	  var strict = scope.strict;
	  var nameStr = name.toString();
	  while (scope) {
	    if ((nameStr in scope.properties) || (!strict && !scope.parentScope)) {
	      if (!scope.notWritable[nameStr]) {
	        scope.properties[nameStr] = value;
	      }
	      return;
	    }
	    scope = scope.parentScope;
	  }
	  this.throwException(this.REFERENCE_ERROR, nameStr + ' is not defined');
	};
	
	/**
	 * Create a new scope for the given node.
	 * @param {!Object} node AST node (program or function).
	 * @param {!Interpreter.Object} scope Scope dictionary to populate.
	 * @private
	 */
	Interpreter.prototype.populateScope_ = function(node, scope) {
	  if (node.type == 'VariableDeclaration') {
	    for (var i = 0; i < node.declarations.length; i++) {
	      this.setProperty(scope, node.declarations[i].id.name, this.UNDEFINED);
	    }
	  } else if (node.type == 'FunctionDeclaration') {
	    this.setProperty(scope, node.id.name, this.createFunction(node, scope));
	    return;  // Do not recurse into function.
	  } else if (node.type == 'FunctionExpression') {
	    return;  // Do not recurse into function.
	  }
	  var parent = node.constructor;
	  for (var name in node) {
	    var prop = node[name];
	    if (prop && typeof prop == 'object') {
	      if (prop instanceof Array) {
	        for (var i = 0; i < prop.length; i++) {
	          if (prop[i] && prop[i].constructor == parent) {
	            this.populateScope_(prop[i], scope);
	          }
	        }
	      } else {
	        if (prop.constructor == parent) {
	          this.populateScope_(prop, scope);
	        }
	      }
	    }
	  }
	};
	
	/**
	 * Remove start and end values from AST.
	 * Used to remove highlighting from polyfills.
	 * @param {!Object} node AST node.
	 * @private
	 */
	Interpreter.prototype.stripLocations_ = function(node) {
	  delete node.start;
	  delete node.end;
	  for (var name in node) {
	    if (node.hasOwnProperty(name)) {
	      var prop = node[name];
	      if (prop && typeof prop == 'object') {
	        this.stripLocations_(prop);
	      }
	    }
	  }
	};
	
	/**
	 * Gets a value from the scope chain or from an object property.
	 * @param {!Interpreter.Object|!Interpreter.Primitive|!Array} left
	 *     Name of variable or object/propname tuple.
	 * @return {!Interpreter.Object|!Interpreter.Primitive|null} Value
	 *     or null if an error was thrown and will be caught.
	 */
	Interpreter.prototype.getValue = function(left) {
	  if (left instanceof Array) {
	    var obj = left[0];
	    var prop = left[1];
	    return this.getProperty(obj, prop);
	  } else {
	    return this.getValueFromScope(left);
	  }
	};
	
	/**
	 * Sets a value to the scope chain or to an object property.
	 * @param {!Interpreter.Object|!Interpreter.Primitive|!Array} left
	 *     Name of variable or object/propname tuple.
	 * @param {!Interpreter.Object|!Interpreter.Primitive} value Value.
	 * @return {!Interpreter.Object|undefined} Returns a setter function if one
	 *     needs to be called, otherwise undefined.
	 */
	Interpreter.prototype.setValue = function(left, value) {
	  if (left instanceof Array) {
	    var obj = left[0];
	    var prop = left[1];
	    return this.setProperty(obj, prop, value);
	  } else {
	    this.setValueToScope(left, value);
	    return undefined;
	  }
	};
	
	/**
	 * Throw an exception in the interpreter that can be handled by a
	 * interpreter try/catch statement.  If unhandled, a real exception will
	 * be thrown.  Can be called with either an error class and a message, or
	 * with an actual object to be thrown.
	 * @param {!Interpreter.Object} errorClass Type of error (if message is
	 *   provided) or the value to throw (if no message).
	 * @param {string=} opt_message Message being thrown.
	 */
	Interpreter.prototype.throwException = function(errorClass, opt_message) {
	  if (this.stateStack[0].interpreter) {
	    // This is the wrong interpreter, we are spinning on an eval.
	    try {
	      this.stateStack[0].interpreter.throwException(errorClass, opt_message);
	      return;
	    } catch (e) {
	      // The eval threw an error and did not catch it.
	      // Continue to see if this level can catch it.
	    }
	  }
	  if (opt_message === undefined) {
	    var error = errorClass;
	  } else {
	    var error = this.createObject(errorClass);
	    this.setProperty(error, 'message', this.createPrimitive(opt_message),
	        Interpreter.NONENUMERABLE_DESCRIPTOR);
	  }
	  this.executeException(error);
	};
	
	/**
	 * Throw an exception in the interpreter that can be handled by a
	 * interpreter try/catch statement.  If unhandled, a real exception will
	 * be thrown.
	 * @param {!Interpreter.Object} error Error object to execute.
	 */
	Interpreter.prototype.executeException = function(error) {
	  // Search for a try statement.
	  do {
	    this.stateStack.shift();
	    var state = this.stateStack[0];
	    if (state.node.type == 'TryStatement') {
	      state.throwValue = error;
	      return;
	    }
	  } while (state && state.node.type != 'Program');
	
	  // Throw a real error.
	  var realError;
	  if (this.isa(error, this.ERROR)) {
	    var errorTable = {
	      'EvalError': EvalError,
	      'RangeError': RangeError,
	      'ReferenceError': ReferenceError,
	      'SyntaxError': SyntaxError,
	      'TypeError': TypeError,
	      'URIError': URIError
	    };
	    var name = this.getProperty(error, 'name').toString();
	    var message = this.getProperty(error, 'message').valueOf();
	    var type = errorTable[name] || Error;
	    realError = type(message);
	  } else {
	    realError = error.toString();
	  }
	  throw realError;
	};
	
	///////////////////////////////////////////////////////////////////////////////
	// Functions to handle each node type.
	///////////////////////////////////////////////////////////////////////////////
	
	Interpreter.prototype['stepArrayExpression'] = function() {
	  var state = this.stateStack[0];
	  var node = state.node;
	  var n = state.n || 0;
	  if (!state.array) {
	    state.array = this.createObject(this.ARRAY);
	  } else if (state.value) {
	    this.setProperty(state.array, n - 1, state.value);
	  }
	  if (n < node.elements.length) {
	    state.n = n + 1;
	    if (node.elements[n]) {
	      this.stateStack.unshift({node: node.elements[n]});
	    } else {
	      // [0, 1, , 3][2] -> undefined
	      // Missing elements are not defined, they aren't undefined.
	      state.value = undefined;
	    }
	  } else {
	    state.array.length = state.n || 0;
	    this.stateStack.shift();
	    this.stateStack[0].value = state.array;
	  }
	};
	
	Interpreter.prototype['stepAssignmentExpression'] = function() {
	  var state = this.stateStack[0];
	  var node = state.node;
	  if (!state.doneLeft) {
	    state.doneLeft = true;
	    this.stateStack.unshift({node: node.left, components: true});
	    return;
	  }
	  if (!state.doneRight) {
	    if (!state.leftSide) {
	      state.leftSide = state.value;
	    }
	    if (state.doneGetter_) {
	      state.leftValue = state.value;
	    }
	    if (!state.doneGetter_ && node.operator != '=') {
	      state.leftValue = this.getValue(state.leftSide);
	      if (state.leftValue.isGetter) {
	        // Clear the getter flag and call the getter function.
	        state.leftValue.isGetter = false;
	        state.doneGetter_ = true;
	        this.stateStack.unshift({
	          node: {type: 'CallExpression'},
	          doneCallee_: true,
	          funcThis_: state.leftSide[0],
	          func_: state.leftValue,
	          doneArgs_: true,
	          arguments: []
	        });
	        return;
	      }
	    }
	    state.doneRight = true;
	    this.stateStack.unshift({node: node.right});
	    return;
	  }
	  if (state.doneSetter_) {
	    // Return if setter function.
	    // Setter method on property has completed.
	    // Ignore its return value, and use the original set value instead.
	    this.stateStack.shift();
	    this.stateStack[0].value = state.doneSetter_;
	    return;
	  }
	  var rightSide = state.value;
	  var value;
	  if (node.operator == '=') {
	    value = rightSide;
	  } else {
	    var rightValue = rightSide;
	    var leftNumber = state.leftValue.toNumber();
	    var rightNumber = rightValue.toNumber();
	    if (node.operator == '+=') {
	      var left, right;
	      if (state.leftValue.type == 'string' || rightValue.type == 'string') {
	        left = state.leftValue.toString();
	        right = rightValue.toString();
	      } else {
	        left = leftNumber;
	        right = rightNumber;
	      }
	      value = left + right;
	    } else if (node.operator == '-=') {
	      value = leftNumber - rightNumber;
	    } else if (node.operator == '*=') {
	      value = leftNumber * rightNumber;
	    } else if (node.operator == '/=') {
	      value = leftNumber / rightNumber;
	    } else if (node.operator == '%=') {
	      value = leftNumber % rightNumber;
	    } else if (node.operator == '<<=') {
	      value = leftNumber << rightNumber;
	    } else if (node.operator == '>>=') {
	      value = leftNumber >> rightNumber;
	    } else if (node.operator == '>>>=') {
	      value = leftNumber >>> rightNumber;
	    } else if (node.operator == '&=') {
	      value = leftNumber & rightNumber;
	    } else if (node.operator == '^=') {
	      value = leftNumber ^ rightNumber;
	    } else if (node.operator == '|=') {
	      value = leftNumber | rightNumber;
	    } else {
	      throw SyntaxError('Unknown assignment expression: ' + node.operator);
	    }
	    value = this.createPrimitive(value);
	  }
	  var setter = this.setValue(state.leftSide, value);
	  if (setter) {
	    state.doneSetter_ = value;
	    this.stateStack.unshift({
	      node: {type: 'CallExpression'},
	      doneCallee_: true,
	      funcThis_: state.leftSide[0],
	      func_: setter,
	      doneArgs_: true,
	      arguments: [value]
	    });
	    return;
	  }
	  // Return if no setter function.
	  this.stateStack.shift();
	  this.stateStack[0].value = value;
	};
	
	Interpreter.prototype['stepBinaryExpression'] = function() {
	  var state = this.stateStack[0];
	  var node = state.node;
	  if (!state.doneLeft) {
	    state.doneLeft = true;
	    this.stateStack.unshift({node: node.left});
	    return;
	  }
	  if (!state.doneRight) {
	    state.doneRight = true;
	    state.leftValue = state.value;
	    this.stateStack.unshift({node: node.right});
	    return;
	  }
	  this.stateStack.shift();
	  var leftSide = state.leftValue;
	  var rightSide = state.value;
	  var value;
	  var comp = this.comp(leftSide, rightSide);
	  if (node.operator == '==' || node.operator == '!=') {
	    if (leftSide.isPrimitive && rightSide.isPrimitive) {
	      value = leftSide.data == rightSide.data;
	    } else {
	      value = comp === 0;
	    }
	    if (node.operator == '!=') {
	      value = !value;
	    }
	  } else if (node.operator == '===' || node.operator == '!==') {
	    if (leftSide.isPrimitive && rightSide.isPrimitive) {
	      value = leftSide.data === rightSide.data;
	    } else {
	      value = leftSide === rightSide;
	    }
	    if (node.operator == '!==') {
	      value = !value;
	    }
	  } else if (node.operator == '>') {
	    value = comp == 1;
	  } else if (node.operator == '>=') {
	    value = comp == 1 || comp === 0;
	  } else if (node.operator == '<') {
	    value = comp == -1;
	  } else if (node.operator == '<=') {
	    value = comp == -1 || comp === 0;
	  } else if (node.operator == '+') {
	    var leftValue =
	        leftSide.isPrimitive ? leftSide.data : leftSide.toString();
	    var rightValue =
	        rightSide.isPrimitive ? rightSide.data : rightSide.toString();
	    value = leftValue + rightValue;
	  } else if (node.operator == 'in') {
	    value = this.hasProperty(rightSide, leftSide);
	  } else if (node.operator == 'instanceof') {
	    if (!this.isa(rightSide, this.FUNCTION)) {
	      this.throwException(this.TYPE_ERROR,
	          'Expecting a function in instanceof check');
	    }
	    value = this.isa(leftSide, rightSide);
	  } else {
	    var leftValue = leftSide.toNumber();
	    var rightValue = rightSide.toNumber();
	    if (node.operator == '-') {
	      value = leftValue - rightValue;
	    } else if (node.operator == '*') {
	      value = leftValue * rightValue;
	    } else if (node.operator == '/') {
	      value = leftValue / rightValue;
	    } else if (node.operator == '%') {
	      value = leftValue % rightValue;
	    } else if (node.operator == '&') {
	      value = leftValue & rightValue;
	    } else if (node.operator == '|') {
	      value = leftValue | rightValue;
	    } else if (node.operator == '^') {
	      value = leftValue ^ rightValue;
	    } else if (node.operator == '<<') {
	      value = leftValue << rightValue;
	    } else if (node.operator == '>>') {
	      value = leftValue >> rightValue;
	    } else if (node.operator == '>>>') {
	      value = leftValue >>> rightValue;
	    } else {
	      throw SyntaxError('Unknown binary operator: ' + node.operator);
	    }
	  }
	  this.stateStack[0].value = this.createPrimitive(value);
	};
	
	Interpreter.prototype['stepBlockStatement'] = function() {
	  var state = this.stateStack[0];
	  var node = state.node;
	  var n = state.n_ || 0;
	  if (node.body[n]) {
	    state.done = false;
	    state.n_ = n + 1;
	    this.stateStack.unshift({node: node.body[n]});
	  } else {
	    state.done = true;
	    if (state.node.type != 'Program') {
	      // Leave the root scope on the tree in case the program is appended to.
	      this.stateStack.shift();
	    }
	  }
	};
	
	Interpreter.prototype['stepBreakStatement'] = function() {
	  var state = this.stateStack.shift();
	  var node = state.node;
	  var label = null;
	  if (node.label) {
	    label = node.label.name;
	  }
	  state = this.stateStack.shift();
	  while (state &&
	         state.node.type != 'CallExpression' &&
	         state.node.type != 'NewExpression') {
	    if (label ? label == state.label : (state.isLoop || state.isSwitch)) {
	      return;
	    }
	    state = this.stateStack.shift();
	  }
	  // Syntax error, do not allow this error to be trapped.
	  throw SyntaxError('Illegal break statement');
	};
	
	Interpreter.prototype['stepCallExpression'] = function() {
	  var state = this.stateStack[0];
	  var node = state.node;
	  if (!state.doneCallee_) {
	    state.doneCallee_ = true;
	    this.stateStack.unshift({node: node.callee, components: true});
	    return;
	  }
	  if (!state.func_) {
	    // Determine value of the function.
	    if (state.value.type == 'function') {
	      state.func_ = state.value;
	    } else {
	      if (state.value.length) {
	        state.member_ = state.value[0];
	      }
	      state.func_ = this.getValue(state.value);
	      if (!state.func_) {
	        return;  // Thrown error, but trapped.
	      } else if (state.func_.type != 'function') {
	        this.throwException(this.TYPE_ERROR,
	            (state.value && state.value.type) + ' is not a function');
	        return;
	      }
	    }
	    // Determine value of 'this' in function.
	    if (state.node.type == 'NewExpression') {
	      state.funcThis_ = this.createObject(state.func_);
	      state.isConstructor_ = true;
	    } else if (state.func_.boundThis_) {
	      state.funcThis_ = state.func_.boundThis_;
	    } else if (state.value.length) {
	      state.funcThis_ = state.value[0];
	    } else {
	      state.funcThis_ =
	          this.stateStack[this.stateStack.length - 1].thisExpression;
	    }
	    if (state.func_.boundArgs_) {
	      state.arguments = state.func_.boundArgs_.concat();
	    } else {
	      state.arguments = [];
	    }
	    state.n_ = 0;
	  }
	  if (!state.doneArgs_) {
	    if (state.n_ != 0) {
	      state.arguments.push(state.value);
	    }
	    if (node.arguments[state.n_]) {
	      this.stateStack.unshift({node: node.arguments[state.n_]});
	      state.n_++;
	      return;
	    }
	    state.doneArgs_ = true;
	  }
	  if (!state.doneExec_) {
	    state.doneExec_ = true;
	    if (state.func_.node) {
	      var scope =
	          this.createScope(state.func_.node.body, state.func_.parentScope);
	      // Add all arguments.
	      for (var i = 0; i < state.func_.node.params.length; i++) {
	        var paramName = this.createPrimitive(state.func_.node.params[i].name);
	        var paramValue = state.arguments.length > i ? state.arguments[i] :
	            this.UNDEFINED;
	        this.setProperty(scope, paramName, paramValue);
	      }
	      // Build arguments variable.
	      var argsList = this.createObject(this.ARRAY);
	      for (var i = 0; i < state.arguments.length; i++) {
	        this.setProperty(argsList, this.createPrimitive(i),
	                         state.arguments[i]);
	      }
	      this.setProperty(scope, 'arguments', argsList);
	      var funcState = {
	        node: state.func_.node.body,
	        scope: scope,
	        thisExpression: state.funcThis_
	      };
	      this.stateStack.unshift(funcState);
	      state.value = this.UNDEFINED;  // Default value if no explicit return.
	    } else if (state.func_.nativeFunc) {
	      state.value = state.func_.nativeFunc.apply(state.funcThis_,
	                                                 state.arguments);
	    } else if (state.func_.asyncFunc) {
	      var thisInterpreter = this;
	      var callback = function(value) {
	        state.value = value || thisInterpreter.UNDEFINED;
	        thisInterpreter.paused_ = false;
	      };
	      var argsWithCallback = state.arguments.concat(callback);
	      state.func_.asyncFunc.apply(state.funcThis_, argsWithCallback);
	      this.paused_ = true;
	      return;
	    } else if (state.func_.eval) {
	      var code = state.arguments[0];
	      if (!code) {
	        state.value = this.UNDEFINED;
	      } else if (!code.isPrimitive) {
	        // JS does not parse String objects:
	        // eval(new String('1 + 1')) -> '1 + 1'
	        state.value = code;
	      } else {
	        var evalInterpreter = new Interpreter(code.toString());
	        evalInterpreter.stateStack[0].scope = this.getScope();
	        state = {
	          node: {type: 'Eval_'},
	          interpreter: evalInterpreter
	        };
	        this.stateStack.unshift(state);
	      }
	    } else {
	      throw TypeError('function not a function (huh?)');
	    }
	  } else {
	    // Execution complete.  Put the return value on the stack.
	    this.stateStack.shift();
	    if (state.isConstructor_ && state.value.type !== 'object') {
	      this.stateStack[0].value = state.funcThis_;
	    } else {
	      this.stateStack[0].value = state.value;
	    }
	  }
	};
	
	Interpreter.prototype['stepCatchClause'] = function() {
	  var state = this.stateStack[0];
	  var node = state.node;
	  if (!state.doneBody) {
	    state.doneBody = true;
	    var scope;
	    if (node.param) {
	      scope = this.createSpecialScope(this.getScope());
	      // Add the argument.
	      var paramName = this.createPrimitive(node.param.name);
	      this.setProperty(scope, paramName, state.throwValue);
	    }
	    this.stateStack.unshift({node: node.body, scope: scope});
	  } else {
	    this.stateStack.shift();
	  }
	};
	
	Interpreter.prototype['stepConditionalExpression'] = function() {
	  var state = this.stateStack[0];
	  if (!state.done) {
	    if (!state.test) {
	      state.test = true;
	      this.stateStack.unshift({node: state.node.test});
	    } else {
	      state.done = true;
	      if (state.value.toBoolean() && state.node.consequent) {
	        this.stateStack.unshift({node: state.node.consequent});
	      } else if (!state.value.toBoolean() && state.node.alternate) {
	        this.stateStack.unshift({node: state.node.alternate});
	      }
	    }
	  } else {
	    this.stateStack.shift();
	    if (state.node.type == 'ConditionalExpression') {
	      this.stateStack[0].value = state.value;
	    }
	  }
	};
	
	Interpreter.prototype['stepContinueStatement'] = function() {
	  var node = this.stateStack[0].node;
	  var label = null;
	  if (node.label) {
	    label = node.label.name;
	  }
	  var state = this.stateStack[0];
	  while (state &&
	         state.node.type != 'CallExpression' &&
	         state.node.type != 'NewExpression') {
	    if (state.isLoop) {
	      if (!label || (label == state.label)) {
	        return;
	      }
	    }
	    this.stateStack.shift();
	    state = this.stateStack[0];
	  }
	  // Syntax error, do not allow this error to be trapped.
	  throw SyntaxError('Illegal continue statement');
	};
	
	Interpreter.prototype['stepDoWhileStatement'] = function() {
	  var state = this.stateStack[0];
	  state.isLoop = true;
	  if (state.node.type == 'DoWhileStatement' && state.test === undefined) {
	    // First iteration of do/while executes without checking test.
	    state.value = this.TRUE;
	    state.test = true;
	  }
	  if (!state.test) {
	    state.test = true;
	    this.stateStack.unshift({node: state.node.test});
	  } else {
	    state.test = false;
	    if (!state.value.toBoolean()) {
	      this.stateStack.shift();
	    } else if (state.node.body) {
	      this.stateStack.unshift({node: state.node.body});
	    }
	  }
	};
	
	Interpreter.prototype['stepEmptyStatement'] = function() {
	  this.stateStack.shift();
	};
	
	Interpreter.prototype['stepEval_'] = function() {
	  var state = this.stateStack[0];
	  if (!state.interpreter.step()) {
	    this.stateStack.shift();
	    this.stateStack[0].value = state.interpreter.value || this.UNDEFINED;
	  }
	};
	
	Interpreter.prototype['stepExpressionStatement'] = function() {
	  var state = this.stateStack[0];
	  if (!state.done) {
	    state.done = true;
	    this.stateStack.unshift({node: state.node.expression});
	  } else {
	    this.stateStack.shift();
	    // Save this value to the interpreter for use as a return value if
	    // this code is inside an eval function.
	    this.value = state.value;
	  }
	};
	
	Interpreter.prototype['stepForInStatement'] = function() {
	  var state = this.stateStack[0];
	  state.isLoop = true;
	  var node = state.node;
	  if (!state.doneVariable_) {
	    state.doneVariable_ = true;
	    var left = node.left;
	    if (left.type == 'VariableDeclaration') {
	      // Inline variable declaration: for (var x in y)
	      left = left.declarations[0].id;
	    }
	    this.stateStack.unshift({node: left, components: true});
	    return;
	  }
	  if (!state.doneObject_) {
	    state.doneObject_ = true;
	    state.variable = state.value;
	    this.stateStack.unshift({node: node.right});
	    return;
	  }
	  if (typeof state.iterator == 'undefined') {
	    // First iteration.
	    state.object = state.value;
	    state.iterator = 0;
	  }
	  var name = null;
	  done: do {
	    var i = state.iterator;
	    for (var prop in state.object.properties) {
	      if (state.object.notEnumerable[prop]) {
	        continue;
	      }
	      if (i == 0) {
	        name = prop;
	        break done;
	      }
	      i--;
	    }
	    state.object = state.object.parent &&
	        state.object.parent.properties.prototype;
	    state.iterator = 0;
	  } while (state.object);
	  state.iterator++;
	  if (name === null) {
	    this.stateStack.shift();
	  } else {
	    this.setValueToScope(state.variable, this.createPrimitive(name));
	    if (node.body) {
	      this.stateStack.unshift({node: node.body});
	    }
	  }
	};
	
	Interpreter.prototype['stepForStatement'] = function() {
	  var state = this.stateStack[0];
	  state.isLoop = true;
	  var node = state.node;
	  var mode = state.mode || 0;
	  if (mode == 0) {
	    state.mode = 1;
	    if (node.init) {
	      this.stateStack.unshift({node: node.init});
	    }
	  } else if (mode == 1) {
	    state.mode = 2;
	    if (node.test) {
	      this.stateStack.unshift({node: node.test});
	    }
	  } else if (mode == 2) {
	    state.mode = 3;
	    if (node.test && state.value && !state.value.toBoolean()) {
	      // Loop complete.  Bail out.
	      this.stateStack.shift();
	    } else if (node.body) {
	      this.stateStack.unshift({node: node.body});
	    }
	  } else if (mode == 3) {
	    state.mode = 1;
	    if (node.update) {
	      this.stateStack.unshift({node: node.update});
	    }
	  }
	};
	
	Interpreter.prototype['stepFunctionDeclaration'] = function() {
	  this.stateStack.shift();
	};
	
	Interpreter.prototype['stepFunctionExpression'] = function() {
	  var state = this.stateStack.shift();
	  this.stateStack[0].value = this.createFunction(state.node);
	};
	
	Interpreter.prototype['stepIdentifier'] = function() {
	  var state = this.stateStack.shift();
	  var name = this.createPrimitive(state.node.name);
	  this.stateStack[0].value =
	      state.components ? name : this.getValueFromScope(name);
	};
	
	Interpreter.prototype['stepIfStatement'] =
	    Interpreter.prototype['stepConditionalExpression'];
	
	Interpreter.prototype['stepLabeledStatement'] = function() {
	  // No need to hit this node again on the way back up the stack.
	  var state = this.stateStack.shift();
	  this.stateStack.unshift({node: state.node.body,
	                          label: state.node.label.name});
	};
	
	Interpreter.prototype['stepLiteral'] = function() {
	  var state = this.stateStack.shift();
	  this.stateStack[0].value = this.createPrimitive(state.node.value);
	};
	
	Interpreter.prototype['stepLogicalExpression'] = function() {
	  var state = this.stateStack[0];
	  var node = state.node;
	  if (node.operator != '&&' && node.operator != '||') {
	    throw SyntaxError('Unknown logical operator: ' + node.operator);
	  }
	  if (!state.doneLeft_) {
	    state.doneLeft_ = true;
	    this.stateStack.unshift({node: node.left});
	  } else if (!state.doneRight_) {
	    if ((node.operator == '&&' && !state.value.toBoolean()) ||
	        (node.operator == '||' && state.value.toBoolean())) {
	      // Shortcut evaluation.
	      this.stateStack.shift();
	      this.stateStack[0].value = state.value;
	    } else {
	      state.doneRight_ = true;
	      this.stateStack.unshift({node: node.right});
	    }
	  } else {
	    this.stateStack.shift();
	    this.stateStack[0].value = state.value;
	  }
	};
	
	Interpreter.prototype['stepMemberExpression'] = function() {
	  var state = this.stateStack[0];
	  var node = state.node;
	  if (!state.doneObject_) {
	    state.doneObject_ = true;
	    this.stateStack.unshift({node: node.object});
	  } else if (!state.doneProperty_) {
	    state.doneProperty_ = true;
	    state.object = state.value;
	    this.stateStack.unshift({
	      node: node.property,
	      components: !node.computed
	    });
	  } else {
	    this.stateStack.shift();
	    if (state.components) {
	      this.stateStack[0].value = [state.object, state.value];
	    } else {
	      var value = this.getProperty(state.object, state.value);
	      if (!value) {
	        this.stateStack.unshift({});
	        this.throwException(this.TYPE_ERROR,
	            "Cannot read property '" + state.value + "' of " +
	            state.object.toString());
	        return;
	      }
	      if (value.isGetter) {
	        // Clear the getter flag and call the getter function.
	        value.isGetter = false;
	        this.stateStack.unshift({
	          node: {type: 'CallExpression'},
	          doneCallee_: true,
	          funcThis_: state.object,
	          func_: value,
	          doneArgs_: true,
	          arguments: []
	        });
	      } else {
	        this.stateStack[0].value = value;
	      }
	    }
	  }
	};
	
	Interpreter.prototype['stepNewExpression'] =
	    Interpreter.prototype['stepCallExpression'];
	
	Interpreter.prototype['stepObjectExpression'] = function() {
	  var state = this.stateStack[0];
	  var node = state.node;
	  var valueToggle = state.valueToggle;
	  var n = state.n || 0;
	  if (!state.object) {
	    state.object = this.createObject(this.OBJECT);
	    state.properties = Object.create(null);
	  } else {
	    if (valueToggle) {
	      state.key = state.value;
	    } else {
	      if (!state.properties[state.key]) {
	        // Create temp object to collect value, getter, and/or setter.
	        state.properties[state.key] = {};
	      }
	      state.properties[state.key][state.kind] = state.value;
	    }
	  }
	  if (node.properties[n]) {
	    if (valueToggle) {
	      state.n = n + 1;
	      this.stateStack.unshift({node: node.properties[n].value});
	    } else {
	      state.kind = node.properties[n].kind;
	      this.stateStack.unshift({node: node.properties[n].key, components: true});
	    }
	    state.valueToggle = !valueToggle;
	  } else {
	    for (var key in state.properties) {
	      var kinds = state.properties[key];
	      if ('get' in kinds || 'set' in kinds) {
	        // Set a property with a getter or setter.
	        var descriptor = {
	          configurable: true,
	          enumerable: true,
	          get: kinds['get'],
	          set: kinds['set']
	        };
	        this.setProperty(state.object, key, null, descriptor);
	      } else {
	        // Set a normal property with a value.
	        this.setProperty(state.object, key, kinds['init']);
	      }
	    }
	    this.stateStack.shift();
	    this.stateStack[0].value = state.object;
	  }
	};
	
	Interpreter.prototype['stepProgram'] =
	    Interpreter.prototype['stepBlockStatement'];
	
	Interpreter.prototype['stepReturnStatement'] = function() {
	  var state = this.stateStack[0];
	  var node = state.node;
	  if (node.argument && !state.done) {
	    state.done = true;
	    this.stateStack.unshift({node: node.argument});
	  } else {
	    var value = state.value || this.UNDEFINED;
	    do {
	      this.stateStack.shift();
	      if (this.stateStack.length == 0) {
	        // Syntax error, do not allow this error to be trapped.
	        throw SyntaxError('Illegal return statement');
	      }
	      state = this.stateStack[0];
	    } while (state.node.type != 'CallExpression' &&
	             state.node.type != 'NewExpression');
	    state.value = value;
	  }
	};
	
	Interpreter.prototype['stepSequenceExpression'] = function() {
	  var state = this.stateStack[0];
	  var node = state.node;
	  var n = state.n || 0;
	  if (node.expressions[n]) {
	    state.n = n + 1;
	    this.stateStack.unshift({node: node.expressions[n]});
	  } else {
	    this.stateStack.shift();
	    this.stateStack[0].value = state.value;
	  }
	};
	
	Interpreter.prototype['stepSwitchStatement'] = function() {
	  var state = this.stateStack[0];
	  state.checked = state.checked || [];
	  state.isSwitch = true;
	
	  if (!state.test) {
	    state.test = true;
	    this.stateStack.unshift({node: state.node.discriminant});
	    return;
	  }
	  if (!state.switchValue) {
	    // Preserve switch value between case tests.
	    state.switchValue = state.value;
	  }
	
	  var index = state.index || 0;
	  var currentCase = state.node.cases[index];
	  if (currentCase) {
	    if (!state.done && !state.checked[index] && currentCase.test) {
	      state.checked[index] = true;
	      this.stateStack.unshift({node: currentCase.test});
	      return;
	    }
	    // Test on the default case will be null.
	    if (state.done || !currentCase.test ||
	        this.comp(state.value, state.switchValue) == 0) {
	      state.done = true;
	      var n = state.n || 0;
	      if (currentCase.consequent[n]) {
	        this.stateStack.unshift({node: currentCase.consequent[n]});
	        state.n = n + 1;
	        return;
	      }
	    }
	    state.n = 0;
	    state.index = index + 1;
	  } else {
	    this.stateStack.shift();
	  }
	};
	
	Interpreter.prototype['stepThisExpression'] = function() {
	  this.stateStack.shift();
	  for (var i = 0; i < this.stateStack.length; i++) {
	    if (this.stateStack[i].thisExpression) {
	      this.stateStack[0].value = this.stateStack[i].thisExpression;
	      return;
	    }
	  }
	  throw Error('No this expression found.');
	};
	
	Interpreter.prototype['stepThrowStatement'] = function() {
	  var state = this.stateStack[0];
	  var node = state.node;
	  if (!state.argument) {
	    state.argument = true;
	    this.stateStack.unshift({node: node.argument});
	  } else {
	    this.throwException(state.value);
	  }
	};
	
	Interpreter.prototype['stepTryStatement'] = function() {
	  var state = this.stateStack[0];
	  var node = state.node;
	  if (!state.doneBlock) {
	    state.doneBlock = true;
	    this.stateStack.unshift({node: node.block});
	  } else if (state.throwValue && !state.doneHandler && node.handler) {
	    state.doneHandler = true;
	    this.stateStack.unshift({node: node.handler, throwValue: state.throwValue});
	    state.throwValue = null;  // This error has been handled, don't rethrow.
	  } else if (!state.doneFinalizer && node.finalizer) {
	    state.doneFinalizer = true;
	    this.stateStack.unshift({node: node.finalizer});
	  } else if (state.throwValue) {
	    // There was no catch handler, or the catch/finally threw an error.
	    // Throw the error up to a higher try.
	    this.executeException(state.throwValue);
	  } else {
	    this.stateStack.shift();
	  }
	};
	
	Interpreter.prototype['stepUnaryExpression'] = function() {
	  var state = this.stateStack[0];
	  var node = state.node;
	  if (!state.done) {
	    state.done = true;
	    var nextState = {node: node.argument};
	    if (node.operator == 'delete' || node.operator == 'typeof') {
	      nextState.components = true;
	    }
	    this.stateStack.unshift(nextState);
	    return;
	  }
	  this.stateStack.shift();
	  var value;
	  if (node.operator == '-') {
	    value = -state.value.toNumber();
	  } else if (node.operator == '+') {
	    value = state.value.toNumber();
	  } else if (node.operator == '!') {
	    value = !state.value.toBoolean();
	  } else if (node.operator == '~') {
	    value = ~state.value.toNumber();
	  } else if (node.operator == 'delete' || node.operator == 'typeof') {
	    if (state.value.length) {
	      var obj = state.value[0];
	      var name = state.value[1];
	    } else {
	      var obj = this.getScope();
	      var name = state.value;
	    }
	    if (node.operator == 'delete') {
	      value = this.deleteProperty(obj, name);
	    } else {
	      value = this.getProperty(obj, name).type;
	    }
	  } else if (node.operator == 'void') {
	    value = undefined;
	  } else {
	    throw SyntaxError('Unknown unary operator: ' + node.operator);
	  }
	  this.stateStack[0].value = this.createPrimitive(value);
	};
	
	Interpreter.prototype['stepUpdateExpression'] = function() {
	  var state = this.stateStack[0];
	  var node = state.node;
	  if (!state.doneLeft) {
	    state.doneLeft = true;
	    this.stateStack.unshift({node: node.argument, components: true});
	    return;
	  }
	  if (!state.leftSide) {
	    state.leftSide = state.value;
	  }
	  if (state.doneGetter_) {
	    state.leftValue = state.value;
	  }
	  if (!state.doneGetter_) {
	    state.leftValue = this.getValue(state.leftSide);
	    if (!state.leftValue) {
	      return;  // Thrown error, but trapped.
	    }
	    if (state.leftValue.isGetter) {
	      // Clear the getter flag and call the getter function.
	      state.leftValue.isGetter = false;
	      state.doneGetter_ = true;
	      this.stateStack.unshift({
	        node: {type: 'CallExpression'},
	        doneCallee_: true,
	        funcThis_: state.leftSide[0],
	        func_: state.leftValue,
	        doneArgs_: true,
	        arguments: []
	      });
	      return;
	    }
	  }
	  if (state.doneSetter_) {
	    // Return if setter function.
	    // Setter method on property has completed.
	    // Ignore its return value, and use the original set value instead.
	    this.stateStack.shift();
	    this.stateStack[0].value = state.doneSetter_;
	    return;
	  }
	  var leftValue = state.leftValue.toNumber();
	  var changeValue;
	  if (node.operator == '++') {
	    changeValue = this.createPrimitive(leftValue + 1);
	  } else if (node.operator == '--') {
	    changeValue = this.createPrimitive(leftValue - 1);
	  } else {
	    throw SyntaxError('Unknown update expression: ' + node.operator);
	  }
	  var returnValue = node.prefix ?
	      changeValue : this.createPrimitive(leftValue);
	  var setter = this.setValue(state.leftSide, changeValue);
	  if (setter) {
	    state.doneSetter_ = returnValue;
	    this.stateStack.unshift({
	      node: {type: 'CallExpression'},
	      doneCallee_: true,
	      funcThis_: state.leftSide[0],
	      func_: setter,
	      doneArgs_: true,
	      arguments: [changeValue]
	    });
	    return;
	  }
	  // Return if no setter function.
	  this.stateStack.shift();
	  this.stateStack[0].value = returnValue;
	};
	
	Interpreter.prototype['stepVariableDeclaration'] = function() {
	  var state = this.stateStack[0];
	  var node = state.node;
	  var n = state.n || 0;
	  if (node.declarations[n]) {
	    state.n = n + 1;
	    this.stateStack.unshift({node: node.declarations[n]});
	  } else {
	    this.stateStack.shift();
	  }
	};
	
	Interpreter.prototype['stepVariableDeclarator'] = function() {
	  var state = this.stateStack[0];
	  var node = state.node;
	  if (node.init && !state.done) {
	    state.done = true;
	    this.stateStack.unshift({node: node.init});
	    return;
	  }
	  if (node.init) {
	    // This setValue call never needs to deal with calling a setter function.
	    this.setValue(this.createPrimitive(node.id.name), state.value);
	  }
	  this.stateStack.shift();
	};
	
	Interpreter.prototype['stepWithStatement'] = function() {
	  var state = this.stateStack[0];
	  var node = state.node;
	  if (!state.doneObject) {
	    state.doneObject = true;
	    this.stateStack.unshift({node: node.object});
	  } else if (!state.doneBody) {
	    state.doneBody = true;
	    var scope = this.createSpecialScope(this.getScope(), state.value);
	    this.stateStack.unshift({node: node.body, scope: scope});
	  } else {
	    this.stateStack.shift();
	  }
	};
	
	Interpreter.prototype['stepWhileStatement'] =
	    Interpreter.prototype['stepDoWhileStatement'];
	
	module.exports = Interpreter;


/***/ },
/* 2 */
/***/ function(module, exports, __webpack_require__) {

	(function (global, factory) {
	   true ? factory(exports) :
	  typeof define === 'function' && define.amd ? define(['exports'], factory) :
	  (factory((global.acorn = global.acorn || {})));
	}(this, function (exports) { 'use strict';
	
	  // Reserved word lists for various dialects of the language
	
	  var reservedWords = {
	    3: "abstract boolean byte char class double enum export extends final float goto implements import int interface long native package private protected public short static super synchronized throws transient volatile",
	    5: "class enum extends super const export import",
	    6: "enum",
	    strict: "implements interface let package private protected public static yield",
	    strictBind: "eval arguments"
	  }
	
	  // And the keywords
	
	  var ecma5AndLessKeywords = "break case catch continue debugger default do else finally for function if return switch throw try var while with null true false instanceof typeof void delete new in this"
	
	  var keywords = {
	    5: ecma5AndLessKeywords,
	    6: ecma5AndLessKeywords + " const class extends export import super"
	  }
	
	  // ## Character categories
	
	  // Big ugly regular expressions that match characters in the
	  // whitespace, identifier, and identifier-start categories. These
	  // are only applied when a character is found to actually have a
	  // code point above 128.
	  // Generated by `bin/generate-identifier-regex.js`.
	
	  var nonASCIIidentifierStartChars = "\xaa\xb5\xba\xc0-\xd6\xd8-\xf6\xf8-\u02c1\u02c6-\u02d1\u02e0-\u02e4\u02ec\u02ee\u0370-\u0374\u0376\u0377\u037a-\u037d\u037f\u0386\u0388-\u038a\u038c\u038e-\u03a1\u03a3-\u03f5\u03f7-\u0481\u048a-\u052f\u0531-\u0556\u0559\u0561-\u0587\u05d0-\u05ea\u05f0-\u05f2\u0620-\u064a\u066e\u066f\u0671-\u06d3\u06d5\u06e5\u06e6\u06ee\u06ef\u06fa-\u06fc\u06ff\u0710\u0712-\u072f\u074d-\u07a5\u07b1\u07ca-\u07ea\u07f4\u07f5\u07fa\u0800-\u0815\u081a\u0824\u0828\u0840-\u0858\u08a0-\u08b4\u08b6-\u08bd\u0904-\u0939\u093d\u0950\u0958-\u0961\u0971-\u0980\u0985-\u098c\u098f\u0990\u0993-\u09a8\u09aa-\u09b0\u09b2\u09b6-\u09b9\u09bd\u09ce\u09dc\u09dd\u09df-\u09e1\u09f0\u09f1\u0a05-\u0a0a\u0a0f\u0a10\u0a13-\u0a28\u0a2a-\u0a30\u0a32\u0a33\u0a35\u0a36\u0a38\u0a39\u0a59-\u0a5c\u0a5e\u0a72-\u0a74\u0a85-\u0a8d\u0a8f-\u0a91\u0a93-\u0aa8\u0aaa-\u0ab0\u0ab2\u0ab3\u0ab5-\u0ab9\u0abd\u0ad0\u0ae0\u0ae1\u0af9\u0b05-\u0b0c\u0b0f\u0b10\u0b13-\u0b28\u0b2a-\u0b30\u0b32\u0b33\u0b35-\u0b39\u0b3d\u0b5c\u0b5d\u0b5f-\u0b61\u0b71\u0b83\u0b85-\u0b8a\u0b8e-\u0b90\u0b92-\u0b95\u0b99\u0b9a\u0b9c\u0b9e\u0b9f\u0ba3\u0ba4\u0ba8-\u0baa\u0bae-\u0bb9\u0bd0\u0c05-\u0c0c\u0c0e-\u0c10\u0c12-\u0c28\u0c2a-\u0c39\u0c3d\u0c58-\u0c5a\u0c60\u0c61\u0c80\u0c85-\u0c8c\u0c8e-\u0c90\u0c92-\u0ca8\u0caa-\u0cb3\u0cb5-\u0cb9\u0cbd\u0cde\u0ce0\u0ce1\u0cf1\u0cf2\u0d05-\u0d0c\u0d0e-\u0d10\u0d12-\u0d3a\u0d3d\u0d4e\u0d54-\u0d56\u0d5f-\u0d61\u0d7a-\u0d7f\u0d85-\u0d96\u0d9a-\u0db1\u0db3-\u0dbb\u0dbd\u0dc0-\u0dc6\u0e01-\u0e30\u0e32\u0e33\u0e40-\u0e46\u0e81\u0e82\u0e84\u0e87\u0e88\u0e8a\u0e8d\u0e94-\u0e97\u0e99-\u0e9f\u0ea1-\u0ea3\u0ea5\u0ea7\u0eaa\u0eab\u0ead-\u0eb0\u0eb2\u0eb3\u0ebd\u0ec0-\u0ec4\u0ec6\u0edc-\u0edf\u0f00\u0f40-\u0f47\u0f49-\u0f6c\u0f88-\u0f8c\u1000-\u102a\u103f\u1050-\u1055\u105a-\u105d\u1061\u1065\u1066\u106e-\u1070\u1075-\u1081\u108e\u10a0-\u10c5\u10c7\u10cd\u10d0-\u10fa\u10fc-\u1248\u124a-\u124d\u1250-\u1256\u1258\u125a-\u125d\u1260-\u1288\u128a-\u128d\u1290-\u12b0\u12b2-\u12b5\u12b8-\u12be\u12c0\u12c2-\u12c5\u12c8-\u12d6\u12d8-\u1310\u1312-\u1315\u1318-\u135a\u1380-\u138f\u13a0-\u13f5\u13f8-\u13fd\u1401-\u166c\u166f-\u167f\u1681-\u169a\u16a0-\u16ea\u16ee-\u16f8\u1700-\u170c\u170e-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176c\u176e-\u1770\u1780-\u17b3\u17d7\u17dc\u1820-\u1877\u1880-\u18a8\u18aa\u18b0-\u18f5\u1900-\u191e\u1950-\u196d\u1970-\u1974\u1980-\u19ab\u19b0-\u19c9\u1a00-\u1a16\u1a20-\u1a54\u1aa7\u1b05-\u1b33\u1b45-\u1b4b\u1b83-\u1ba0\u1bae\u1baf\u1bba-\u1be5\u1c00-\u1c23\u1c4d-\u1c4f\u1c5a-\u1c7d\u1c80-\u1c88\u1ce9-\u1cec\u1cee-\u1cf1\u1cf5\u1cf6\u1d00-\u1dbf\u1e00-\u1f15\u1f18-\u1f1d\u1f20-\u1f45\u1f48-\u1f4d\u1f50-\u1f57\u1f59\u1f5b\u1f5d\u1f5f-\u1f7d\u1f80-\u1fb4\u1fb6-\u1fbc\u1fbe\u1fc2-\u1fc4\u1fc6-\u1fcc\u1fd0-\u1fd3\u1fd6-\u1fdb\u1fe0-\u1fec\u1ff2-\u1ff4\u1ff6-\u1ffc\u2071\u207f\u2090-\u209c\u2102\u2107\u210a-\u2113\u2115\u2118-\u211d\u2124\u2126\u2128\u212a-\u2139\u213c-\u213f\u2145-\u2149\u214e\u2160-\u2188\u2c00-\u2c2e\u2c30-\u2c5e\u2c60-\u2ce4\u2ceb-\u2cee\u2cf2\u2cf3\u2d00-\u2d25\u2d27\u2d2d\u2d30-\u2d67\u2d6f\u2d80-\u2d96\u2da0-\u2da6\u2da8-\u2dae\u2db0-\u2db6\u2db8-\u2dbe\u2dc0-\u2dc6\u2dc8-\u2dce\u2dd0-\u2dd6\u2dd8-\u2dde\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303c\u3041-\u3096\u309b-\u309f\u30a1-\u30fa\u30fc-\u30ff\u3105-\u312d\u3131-\u318e\u31a0-\u31ba\u31f0-\u31ff\u3400-\u4db5\u4e00-\u9fd5\ua000-\ua48c\ua4d0-\ua4fd\ua500-\ua60c\ua610-\ua61f\ua62a\ua62b\ua640-\ua66e\ua67f-\ua69d\ua6a0-\ua6ef\ua717-\ua71f\ua722-\ua788\ua78b-\ua7ae\ua7b0-\ua7b7\ua7f7-\ua801\ua803-\ua805\ua807-\ua80a\ua80c-\ua822\ua840-\ua873\ua882-\ua8b3\ua8f2-\ua8f7\ua8fb\ua8fd\ua90a-\ua925\ua930-\ua946\ua960-\ua97c\ua984-\ua9b2\ua9cf\ua9e0-\ua9e4\ua9e6-\ua9ef\ua9fa-\ua9fe\uaa00-\uaa28\uaa40-\uaa42\uaa44-\uaa4b\uaa60-\uaa76\uaa7a\uaa7e-\uaaaf\uaab1\uaab5\uaab6\uaab9-\uaabd\uaac0\uaac2\uaadb-\uaadd\uaae0-\uaaea\uaaf2-\uaaf4\uab01-\uab06\uab09-\uab0e\uab11-\uab16\uab20-\uab26\uab28-\uab2e\uab30-\uab5a\uab5c-\uab65\uab70-\uabe2\uac00-\ud7a3\ud7b0-\ud7c6\ud7cb-\ud7fb\uf900-\ufa6d\ufa70-\ufad9\ufb00-\ufb06\ufb13-\ufb17\ufb1d\ufb1f-\ufb28\ufb2a-\ufb36\ufb38-\ufb3c\ufb3e\ufb40\ufb41\ufb43\ufb44\ufb46-\ufbb1\ufbd3-\ufd3d\ufd50-\ufd8f\ufd92-\ufdc7\ufdf0-\ufdfb\ufe70-\ufe74\ufe76-\ufefc\uff21-\uff3a\uff41-\uff5a\uff66-\uffbe\uffc2-\uffc7\uffca-\uffcf\uffd2-\uffd7\uffda-\uffdc"
	  var nonASCIIidentifierChars = "\u200c\u200d\xb7\u0300-\u036f\u0387\u0483-\u0487\u0591-\u05bd\u05bf\u05c1\u05c2\u05c4\u05c5\u05c7\u0610-\u061a\u064b-\u0669\u0670\u06d6-\u06dc\u06df-\u06e4\u06e7\u06e8\u06ea-\u06ed\u06f0-\u06f9\u0711\u0730-\u074a\u07a6-\u07b0\u07c0-\u07c9\u07eb-\u07f3\u0816-\u0819\u081b-\u0823\u0825-\u0827\u0829-\u082d\u0859-\u085b\u08d4-\u08e1\u08e3-\u0903\u093a-\u093c\u093e-\u094f\u0951-\u0957\u0962\u0963\u0966-\u096f\u0981-\u0983\u09bc\u09be-\u09c4\u09c7\u09c8\u09cb-\u09cd\u09d7\u09e2\u09e3\u09e6-\u09ef\u0a01-\u0a03\u0a3c\u0a3e-\u0a42\u0a47\u0a48\u0a4b-\u0a4d\u0a51\u0a66-\u0a71\u0a75\u0a81-\u0a83\u0abc\u0abe-\u0ac5\u0ac7-\u0ac9\u0acb-\u0acd\u0ae2\u0ae3\u0ae6-\u0aef\u0b01-\u0b03\u0b3c\u0b3e-\u0b44\u0b47\u0b48\u0b4b-\u0b4d\u0b56\u0b57\u0b62\u0b63\u0b66-\u0b6f\u0b82\u0bbe-\u0bc2\u0bc6-\u0bc8\u0bca-\u0bcd\u0bd7\u0be6-\u0bef\u0c00-\u0c03\u0c3e-\u0c44\u0c46-\u0c48\u0c4a-\u0c4d\u0c55\u0c56\u0c62\u0c63\u0c66-\u0c6f\u0c81-\u0c83\u0cbc\u0cbe-\u0cc4\u0cc6-\u0cc8\u0cca-\u0ccd\u0cd5\u0cd6\u0ce2\u0ce3\u0ce6-\u0cef\u0d01-\u0d03\u0d3e-\u0d44\u0d46-\u0d48\u0d4a-\u0d4d\u0d57\u0d62\u0d63\u0d66-\u0d6f\u0d82\u0d83\u0dca\u0dcf-\u0dd4\u0dd6\u0dd8-\u0ddf\u0de6-\u0def\u0df2\u0df3\u0e31\u0e34-\u0e3a\u0e47-\u0e4e\u0e50-\u0e59\u0eb1\u0eb4-\u0eb9\u0ebb\u0ebc\u0ec8-\u0ecd\u0ed0-\u0ed9\u0f18\u0f19\u0f20-\u0f29\u0f35\u0f37\u0f39\u0f3e\u0f3f\u0f71-\u0f84\u0f86\u0f87\u0f8d-\u0f97\u0f99-\u0fbc\u0fc6\u102b-\u103e\u1040-\u1049\u1056-\u1059\u105e-\u1060\u1062-\u1064\u1067-\u106d\u1071-\u1074\u1082-\u108d\u108f-\u109d\u135d-\u135f\u1369-\u1371\u1712-\u1714\u1732-\u1734\u1752\u1753\u1772\u1773\u17b4-\u17d3\u17dd\u17e0-\u17e9\u180b-\u180d\u1810-\u1819\u18a9\u1920-\u192b\u1930-\u193b\u1946-\u194f\u19d0-\u19da\u1a17-\u1a1b\u1a55-\u1a5e\u1a60-\u1a7c\u1a7f-\u1a89\u1a90-\u1a99\u1ab0-\u1abd\u1b00-\u1b04\u1b34-\u1b44\u1b50-\u1b59\u1b6b-\u1b73\u1b80-\u1b82\u1ba1-\u1bad\u1bb0-\u1bb9\u1be6-\u1bf3\u1c24-\u1c37\u1c40-\u1c49\u1c50-\u1c59\u1cd0-\u1cd2\u1cd4-\u1ce8\u1ced\u1cf2-\u1cf4\u1cf8\u1cf9\u1dc0-\u1df5\u1dfb-\u1dff\u203f\u2040\u2054\u20d0-\u20dc\u20e1\u20e5-\u20f0\u2cef-\u2cf1\u2d7f\u2de0-\u2dff\u302a-\u302f\u3099\u309a\ua620-\ua629\ua66f\ua674-\ua67d\ua69e\ua69f\ua6f0\ua6f1\ua802\ua806\ua80b\ua823-\ua827\ua880\ua881\ua8b4-\ua8c5\ua8d0-\ua8d9\ua8e0-\ua8f1\ua900-\ua909\ua926-\ua92d\ua947-\ua953\ua980-\ua983\ua9b3-\ua9c0\ua9d0-\ua9d9\ua9e5\ua9f0-\ua9f9\uaa29-\uaa36\uaa43\uaa4c\uaa4d\uaa50-\uaa59\uaa7b-\uaa7d\uaab0\uaab2-\uaab4\uaab7\uaab8\uaabe\uaabf\uaac1\uaaeb-\uaaef\uaaf5\uaaf6\uabe3-\uabea\uabec\uabed\uabf0-\uabf9\ufb1e\ufe00-\ufe0f\ufe20-\ufe2f\ufe33\ufe34\ufe4d-\ufe4f\uff10-\uff19\uff3f"
	
	  var nonASCIIidentifierStart = new RegExp("[" + nonASCIIidentifierStartChars + "]")
	  var nonASCIIidentifier = new RegExp("[" + nonASCIIidentifierStartChars + nonASCIIidentifierChars + "]")
	
	  nonASCIIidentifierStartChars = nonASCIIidentifierChars = null
	
	  // These are a run-length and offset encoded representation of the
	  // >0xffff code points that are a valid part of identifiers. The
	  // offset starts at 0x10000, and each pair of numbers represents an
	  // offset to the next range, and then a size of the range. They were
	  // generated by bin/generate-identifier-regex.js
	  var astralIdentifierStartCodes = [0,11,2,25,2,18,2,1,2,14,3,13,35,122,70,52,268,28,4,48,48,31,17,26,6,37,11,29,3,35,5,7,2,4,43,157,19,35,5,35,5,39,9,51,157,310,10,21,11,7,153,5,3,0,2,43,2,1,4,0,3,22,11,22,10,30,66,18,2,1,11,21,11,25,71,55,7,1,65,0,16,3,2,2,2,26,45,28,4,28,36,7,2,27,28,53,11,21,11,18,14,17,111,72,56,50,14,50,785,52,76,44,33,24,27,35,42,34,4,0,13,47,15,3,22,0,2,0,36,17,2,24,85,6,2,0,2,3,2,14,2,9,8,46,39,7,3,1,3,21,2,6,2,1,2,4,4,0,19,0,13,4,159,52,19,3,54,47,21,1,2,0,185,46,42,3,37,47,21,0,60,42,86,25,391,63,32,0,449,56,264,8,2,36,18,0,50,29,881,921,103,110,18,195,2749,1070,4050,582,8634,568,8,30,114,29,19,47,17,3,32,20,6,18,881,68,12,0,67,12,65,0,32,6124,20,754,9486,1,3071,106,6,12,4,8,8,9,5991,84,2,70,2,1,3,0,3,1,3,3,2,11,2,0,2,6,2,64,2,3,3,7,2,6,2,27,2,3,2,4,2,0,4,6,2,339,3,24,2,24,2,30,2,24,2,30,2,24,2,30,2,24,2,30,2,24,2,7,4149,196,60,67,1213,3,2,26,2,1,2,0,3,0,2,9,2,3,2,0,2,0,7,0,5,0,2,0,2,0,2,2,2,1,2,0,3,0,2,0,2,0,2,0,2,0,2,1,2,0,3,3,2,6,2,3,2,3,2,0,2,9,2,16,6,2,2,4,2,16,4421,42710,42,4148,12,221,3,5761,10591,541]
	  var astralIdentifierCodes = [509,0,227,0,150,4,294,9,1368,2,2,1,6,3,41,2,5,0,166,1,1306,2,54,14,32,9,16,3,46,10,54,9,7,2,37,13,2,9,52,0,13,2,49,13,10,2,4,9,83,11,7,0,161,11,6,9,7,3,57,0,2,6,3,1,3,2,10,0,11,1,3,6,4,4,193,17,10,9,87,19,13,9,214,6,3,8,28,1,83,16,16,9,82,12,9,9,84,14,5,9,423,9,838,7,2,7,17,9,57,21,2,13,19882,9,135,4,60,6,26,9,1016,45,17,3,19723,1,5319,4,4,5,9,7,3,6,31,3,149,2,1418,49,513,54,5,49,9,0,15,0,23,4,2,14,1361,6,2,16,3,6,2,1,2,4,2214,6,110,6,6,9,792487,239]
	
	  // This has a complexity linear to the value of the code. The
	  // assumption is that looking up astral identifier characters is
	  // rare.
	  function isInAstralSet(code, set) {
	    var pos = 0x10000
	    for (var i = 0; i < set.length; i += 2) {
	      pos += set[i]
	      if (pos > code) return false
	      pos += set[i + 1]
	      if (pos >= code) return true
	    }
	  }
	
	  // Test whether a given character code starts an identifier.
	
	  function isIdentifierStart(code, astral) {
	    if (code < 65) return code === 36
	    if (code < 91) return true
	    if (code < 97) return code === 95
	    if (code < 123) return true
	    if (code <= 0xffff) return code >= 0xaa && nonASCIIidentifierStart.test(String.fromCharCode(code))
	    if (astral === false) return false
	    return isInAstralSet(code, astralIdentifierStartCodes)
	  }
	
	  // Test whether a given character is part of an identifier.
	
	  function isIdentifierChar(code, astral) {
	    if (code < 48) return code === 36
	    if (code < 58) return true
	    if (code < 65) return false
	    if (code < 91) return true
	    if (code < 97) return code === 95
	    if (code < 123) return true
	    if (code <= 0xffff) return code >= 0xaa && nonASCIIidentifier.test(String.fromCharCode(code))
	    if (astral === false) return false
	    return isInAstralSet(code, astralIdentifierStartCodes) || isInAstralSet(code, astralIdentifierCodes)
	  }
	
	  // ## Token types
	
	  // The assignment of fine-grained, information-carrying type objects
	  // allows the tokenizer to store the information it has about a
	  // token in a way that is very cheap for the parser to look up.
	
	  // All token type variables start with an underscore, to make them
	  // easy to recognize.
	
	  // The `beforeExpr` property is used to disambiguate between regular
	  // expressions and divisions. It is set on all token types that can
	  // be followed by an expression (thus, a slash after them would be a
	  // regular expression).
	  //
	  // The `startsExpr` property is used to check if the token ends a
	  // `yield` expression. It is set on all token types that either can
	  // directly start an expression (like a quotation mark) or can
	  // continue an expression (like the body of a string).
	  //
	  // `isLoop` marks a keyword as starting a loop, which is important
	  // to know when parsing a label, in order to allow or disallow
	  // continue jumps to that label.
	
	  var TokenType = function TokenType(label, conf) {
	    if ( conf === void 0 ) conf = {};
	
	    this.label = label
	    this.keyword = conf.keyword
	    this.beforeExpr = !!conf.beforeExpr
	    this.startsExpr = !!conf.startsExpr
	    this.isLoop = !!conf.isLoop
	    this.isAssign = !!conf.isAssign
	    this.prefix = !!conf.prefix
	    this.postfix = !!conf.postfix
	    this.binop = conf.binop || null
	    this.updateContext = null
	  };
	
	  function binop(name, prec) {
	    return new TokenType(name, {beforeExpr: true, binop: prec})
	  }
	  var beforeExpr = {beforeExpr: true};
	  var startsExpr = {startsExpr: true};
	  // Map keyword names to token types.
	
	  var keywordTypes = {}
	
	  // Succinct definitions of keyword token types
	  function kw(name, options) {
	    if ( options === void 0 ) options = {};
	
	    options.keyword = name
	    return keywordTypes[name] = new TokenType(name, options)
	  }
	
	  var tt = {
	    num: new TokenType("num", startsExpr),
	    regexp: new TokenType("regexp", startsExpr),
	    string: new TokenType("string", startsExpr),
	    name: new TokenType("name", startsExpr),
	    eof: new TokenType("eof"),
	
	    // Punctuation token types.
	    bracketL: new TokenType("[", {beforeExpr: true, startsExpr: true}),
	    bracketR: new TokenType("]"),
	    braceL: new TokenType("{", {beforeExpr: true, startsExpr: true}),
	    braceR: new TokenType("}"),
	    parenL: new TokenType("(", {beforeExpr: true, startsExpr: true}),
	    parenR: new TokenType(")"),
	    comma: new TokenType(",", beforeExpr),
	    semi: new TokenType(";", beforeExpr),
	    colon: new TokenType(":", beforeExpr),
	    dot: new TokenType("."),
	    question: new TokenType("?", beforeExpr),
	    arrow: new TokenType("=>", beforeExpr),
	    template: new TokenType("template"),
	    ellipsis: new TokenType("...", beforeExpr),
	    backQuote: new TokenType("`", startsExpr),
	    dollarBraceL: new TokenType("${", {beforeExpr: true, startsExpr: true}),
	
	    // Operators. These carry several kinds of properties to help the
	    // parser use them properly (the presence of these properties is
	    // what categorizes them as operators).
	    //
	    // `binop`, when present, specifies that this operator is a binary
	    // operator, and will refer to its precedence.
	    //
	    // `prefix` and `postfix` mark the operator as a prefix or postfix
	    // unary operator.
	    //
	    // `isAssign` marks all of `=`, `+=`, `-=` etcetera, which act as
	    // binary operators with a very low precedence, that should result
	    // in AssignmentExpression nodes.
	
	    eq: new TokenType("=", {beforeExpr: true, isAssign: true}),
	    assign: new TokenType("_=", {beforeExpr: true, isAssign: true}),
	    incDec: new TokenType("++/--", {prefix: true, postfix: true, startsExpr: true}),
	    prefix: new TokenType("prefix", {beforeExpr: true, prefix: true, startsExpr: true}),
	    logicalOR: binop("||", 1),
	    logicalAND: binop("&&", 2),
	    bitwiseOR: binop("|", 3),
	    bitwiseXOR: binop("^", 4),
	    bitwiseAND: binop("&", 5),
	    equality: binop("==/!=", 6),
	    relational: binop("</>", 7),
	    bitShift: binop("<</>>", 8),
	    plusMin: new TokenType("+/-", {beforeExpr: true, binop: 9, prefix: true, startsExpr: true}),
	    modulo: binop("%", 10),
	    star: binop("*", 10),
	    slash: binop("/", 10),
	    starstar: new TokenType("**", {beforeExpr: true}),
	
	    // Keyword token types.
	    _break: kw("break"),
	    _case: kw("case", beforeExpr),
	    _catch: kw("catch"),
	    _continue: kw("continue"),
	    _debugger: kw("debugger"),
	    _default: kw("default", beforeExpr),
	    _do: kw("do", {isLoop: true, beforeExpr: true}),
	    _else: kw("else", beforeExpr),
	    _finally: kw("finally"),
	    _for: kw("for", {isLoop: true}),
	    _function: kw("function", startsExpr),
	    _if: kw("if"),
	    _return: kw("return", beforeExpr),
	    _switch: kw("switch"),
	    _throw: kw("throw", beforeExpr),
	    _try: kw("try"),
	    _var: kw("var"),
	    _const: kw("const"),
	    _while: kw("while", {isLoop: true}),
	    _with: kw("with"),
	    _new: kw("new", {beforeExpr: true, startsExpr: true}),
	    _this: kw("this", startsExpr),
	    _super: kw("super", startsExpr),
	    _class: kw("class"),
	    _extends: kw("extends", beforeExpr),
	    _export: kw("export"),
	    _import: kw("import"),
	    _null: kw("null", startsExpr),
	    _true: kw("true", startsExpr),
	    _false: kw("false", startsExpr),
	    _in: kw("in", {beforeExpr: true, binop: 7}),
	    _instanceof: kw("instanceof", {beforeExpr: true, binop: 7}),
	    _typeof: kw("typeof", {beforeExpr: true, prefix: true, startsExpr: true}),
	    _void: kw("void", {beforeExpr: true, prefix: true, startsExpr: true}),
	    _delete: kw("delete", {beforeExpr: true, prefix: true, startsExpr: true})
	  }
	
	  // Matches a whole line break (where CRLF is considered a single
	  // line break). Used to count lines.
	
	  var lineBreak = /\r\n?|\n|\u2028|\u2029/
	  var lineBreakG = new RegExp(lineBreak.source, "g")
	
	  function isNewLine(code) {
	    return code === 10 || code === 13 || code === 0x2028 || code === 0x2029
	  }
	
	  var nonASCIIwhitespace = /[\u1680\u180e\u2000-\u200a\u202f\u205f\u3000\ufeff]/
	
	  var skipWhiteSpace = /(?:\s|\/\/.*|\/\*[^]*?\*\/)*/g
	
	  function isArray(obj) {
	    return Object.prototype.toString.call(obj) === "[object Array]"
	  }
	
	  // Checks if an object has a property.
	
	  function has(obj, propName) {
	    return Object.prototype.hasOwnProperty.call(obj, propName)
	  }
	
	  // These are used when `options.locations` is on, for the
	  // `startLoc` and `endLoc` properties.
	
	  var Position = function Position(line, col) {
	    this.line = line
	    this.column = col
	  };
	
	  Position.prototype.offset = function offset (n) {
	    return new Position(this.line, this.column + n)
	  };
	
	  var SourceLocation = function SourceLocation(p, start, end) {
	    this.start = start
	    this.end = end
	    if (p.sourceFile !== null) this.source = p.sourceFile
	  };
	
	  // The `getLineInfo` function is mostly useful when the
	  // `locations` option is off (for performance reasons) and you
	  // want to find the line/column position for a given character
	  // offset. `input` should be the code string that the offset refers
	  // into.
	
	  function getLineInfo(input, offset) {
	    for (var line = 1, cur = 0;;) {
	      lineBreakG.lastIndex = cur
	      var match = lineBreakG.exec(input)
	      if (match && match.index < offset) {
	        ++line
	        cur = match.index + match[0].length
	      } else {
	        return new Position(line, offset - cur)
	      }
	    }
	  }
	
	  // A second optional argument can be given to further configure
	  // the parser process. These options are recognized:
	
	  var defaultOptions = {
	    // `ecmaVersion` indicates the ECMAScript version to parse. Must
	    // be either 3, 5, 6 (2015), 7 (2016), or 8 (2017). This influences support
	    // for strict mode, the set of reserved words, and support for
	    // new syntax features. The default is 7.
	    ecmaVersion: 7,
	    // `sourceType` indicates the mode the code should be parsed in.
	    // Can be either `"script"` or `"module"`. This influences global
	    // strict mode and parsing of `import` and `export` declarations.
	    sourceType: "script",
	    // `onInsertedSemicolon` can be a callback that will be called
	    // when a semicolon is automatically inserted. It will be passed
	    // th position of the comma as an offset, and if `locations` is
	    // enabled, it is given the location as a `{line, column}` object
	    // as second argument.
	    onInsertedSemicolon: null,
	    // `onTrailingComma` is similar to `onInsertedSemicolon`, but for
	    // trailing commas.
	    onTrailingComma: null,
	    // By default, reserved words are only enforced if ecmaVersion >= 5.
	    // Set `allowReserved` to a boolean value to explicitly turn this on
	    // an off. When this option has the value "never", reserved words
	    // and keywords can also not be used as property names.
	    allowReserved: null,
	    // When enabled, a return at the top level is not considered an
	    // error.
	    allowReturnOutsideFunction: false,
	    // When enabled, import/export statements are not constrained to
	    // appearing at the top of the program.
	    allowImportExportEverywhere: false,
	    // When enabled, hashbang directive in the beginning of file
	    // is allowed and treated as a line comment.
	    allowHashBang: false,
	    // When `locations` is on, `loc` properties holding objects with
	    // `start` and `end` properties in `{line, column}` form (with
	    // line being 1-based and column 0-based) will be attached to the
	    // nodes.
	    locations: false,
	    // A function can be passed as `onToken` option, which will
	    // cause Acorn to call that function with object in the same
	    // format as tokens returned from `tokenizer().getToken()`. Note
	    // that you are not allowed to call the parser from the
	    // callback—that will corrupt its internal state.
	    onToken: null,
	    // A function can be passed as `onComment` option, which will
	    // cause Acorn to call that function with `(block, text, start,
	    // end)` parameters whenever a comment is skipped. `block` is a
	    // boolean indicating whether this is a block (`/* */`) comment,
	    // `text` is the content of the comment, and `start` and `end` are
	    // character offsets that denote the start and end of the comment.
	    // When the `locations` option is on, two more parameters are
	    // passed, the full `{line, column}` locations of the start and
	    // end of the comments. Note that you are not allowed to call the
	    // parser from the callback—that will corrupt its internal state.
	    onComment: null,
	    // Nodes have their start and end characters offsets recorded in
	    // `start` and `end` properties (directly on the node, rather than
	    // the `loc` object, which holds line/column data. To also add a
	    // [semi-standardized][range] `range` property holding a `[start,
	    // end]` array with the same numbers, set the `ranges` option to
	    // `true`.
	    //
	    // [range]: https://bugzilla.mozilla.org/show_bug.cgi?id=745678
	    ranges: false,
	    // It is possible to parse multiple files into a single AST by
	    // passing the tree produced by parsing the first file as
	    // `program` option in subsequent parses. This will add the
	    // toplevel forms of the parsed file to the `Program` (top) node
	    // of an existing parse tree.
	    program: null,
	    // When `locations` is on, you can pass this to record the source
	    // file in every node's `loc` object.
	    sourceFile: null,
	    // This value, if given, is stored in every node, whether
	    // `locations` is on or off.
	    directSourceFile: null,
	    // When enabled, parenthesized expressions are represented by
	    // (non-standard) ParenthesizedExpression nodes
	    preserveParens: false,
	    plugins: {}
	  }
	
	  // Interpret and default an options object
	
	  function getOptions(opts) {
	    var options = {}
	
	    for (var opt in defaultOptions)
	      options[opt] = opts && has(opts, opt) ? opts[opt] : defaultOptions[opt]
	
	    if (options.ecmaVersion >= 2015)
	      options.ecmaVersion -= 2009
	
	    if (options.allowReserved == null)
	      options.allowReserved = options.ecmaVersion < 5
	
	    if (isArray(options.onToken)) {
	      var tokens = options.onToken
	      options.onToken = function (token) { return tokens.push(token); }
	    }
	    if (isArray(options.onComment))
	      options.onComment = pushComment(options, options.onComment)
	
	    return options
	  }
	
	  function pushComment(options, array) {
	    return function (block, text, start, end, startLoc, endLoc) {
	      var comment = {
	        type: block ? 'Block' : 'Line',
	        value: text,
	        start: start,
	        end: end
	      }
	      if (options.locations)
	        comment.loc = new SourceLocation(this, startLoc, endLoc)
	      if (options.ranges)
	        comment.range = [start, end]
	      array.push(comment)
	    }
	  }
	
	  // Registered plugins
	  var plugins = {}
	
	  function keywordRegexp(words) {
	    return new RegExp("^(" + words.replace(/ /g, "|") + ")$")
	  }
	
	  var Parser = function Parser(options, input, startPos) {
	    this.options = options = getOptions(options)
	    this.sourceFile = options.sourceFile
	    this.keywords = keywordRegexp(keywords[options.ecmaVersion >= 6 ? 6 : 5])
	    var reserved = ""
	    if (!options.allowReserved) {
	      for (var v = options.ecmaVersion;; v--)
	        if (reserved = reservedWords[v]) break
	      if (options.sourceType == "module") reserved += " await"
	    }
	    this.reservedWords = keywordRegexp(reserved)
	    var reservedStrict = (reserved ? reserved + " " : "") + reservedWords.strict
	    this.reservedWordsStrict = keywordRegexp(reservedStrict)
	    this.reservedWordsStrictBind = keywordRegexp(reservedStrict + " " + reservedWords.strictBind)
	    this.input = String(input)
	
	    // Used to signal to callers of `readWord1` whether the word
	    // contained any escape sequences. This is needed because words with
	    // escape sequences must not be interpreted as keywords.
	    this.containsEsc = false
	
	    // Load plugins
	    this.loadPlugins(options.plugins)
	
	    // Set up token state
	
	    // The current position of the tokenizer in the input.
	    if (startPos) {
	      this.pos = startPos
	      this.lineStart = this.input.lastIndexOf("\n", startPos - 1) + 1
	      this.curLine = this.input.slice(0, this.lineStart).split(lineBreak).length
	    } else {
	      this.pos = this.lineStart = 0
	      this.curLine = 1
	    }
	
	    // Properties of the current token:
	    // Its type
	    this.type = tt.eof
	    // For tokens that include more information than their type, the value
	    this.value = null
	    // Its start and end offset
	    this.start = this.end = this.pos
	    // And, if locations are used, the {line, column} object
	    // corresponding to those offsets
	    this.startLoc = this.endLoc = this.curPosition()
	
	    // Position information for the previous token
	    this.lastTokEndLoc = this.lastTokStartLoc = null
	    this.lastTokStart = this.lastTokEnd = this.pos
	
	    // The context stack is used to superficially track syntactic
	    // context to predict whether a regular expression is allowed in a
	    // given position.
	    this.context = this.initialContext()
	    this.exprAllowed = true
	
	    // Figure out if it's a module code.
	    this.strict = this.inModule = options.sourceType === "module"
	
	    // Used to signify the start of a potential arrow function
	    this.potentialArrowAt = -1
	
	    // Flags to track whether we are in a function, a generator, an async function.
	    this.inFunction = this.inGenerator = this.inAsync = false
	    // Positions to delayed-check that yield/await does not exist in default parameters.
	    this.yieldPos = this.awaitPos = 0
	    // Labels in scope.
	    this.labels = []
	
	    // If enabled, skip leading hashbang line.
	    if (this.pos === 0 && options.allowHashBang && this.input.slice(0, 2) === '#!')
	      this.skipLineComment(2)
	  };
	
	  // DEPRECATED Kept for backwards compatibility until 3.0 in case a plugin uses them
	  Parser.prototype.isKeyword = function isKeyword (word) { return this.keywords.test(word) };
	  Parser.prototype.isReservedWord = function isReservedWord (word) { return this.reservedWords.test(word) };
	
	  Parser.prototype.extend = function extend (name, f) {
	    this[name] = f(this[name])
	  };
	
	  Parser.prototype.loadPlugins = function loadPlugins (pluginConfigs) {
	      var this$1 = this;
	
	    for (var name in pluginConfigs) {
	      var plugin = plugins[name]
	      if (!plugin) throw new Error("Plugin '" + name + "' not found")
	      plugin(this$1, pluginConfigs[name])
	    }
	  };
	
	  Parser.prototype.parse = function parse () {
	    var node = this.options.program || this.startNode()
	    this.nextToken()
	    return this.parseTopLevel(node)
	  };
	
	  var pp = Parser.prototype
	
	  // ## Parser utilities
	
	  // Test whether a statement node is the string literal `"use strict"`.
	
	  pp.isUseStrict = function(stmt) {
	    return this.options.ecmaVersion >= 5 && stmt.type === "ExpressionStatement" &&
	      stmt.expression.type === "Literal" &&
	      stmt.expression.raw.slice(1, -1) === "use strict"
	  }
	
	  // Predicate that tests whether the next token is of the given
	  // type, and if yes, consumes it as a side effect.
	
	  pp.eat = function(type) {
	    if (this.type === type) {
	      this.next()
	      return true
	    } else {
	      return false
	    }
	  }
	
	  // Tests whether parsed token is a contextual keyword.
	
	  pp.isContextual = function(name) {
	    return this.type === tt.name && this.value === name
	  }
	
	  // Consumes contextual keyword if possible.
	
	  pp.eatContextual = function(name) {
	    return this.value === name && this.eat(tt.name)
	  }
	
	  // Asserts that following token is given contextual keyword.
	
	  pp.expectContextual = function(name) {
	    if (!this.eatContextual(name)) this.unexpected()
	  }
	
	  // Test whether a semicolon can be inserted at the current position.
	
	  pp.canInsertSemicolon = function() {
	    return this.type === tt.eof ||
	      this.type === tt.braceR ||
	      lineBreak.test(this.input.slice(this.lastTokEnd, this.start))
	  }
	
	  pp.insertSemicolon = function() {
	    if (this.canInsertSemicolon()) {
	      if (this.options.onInsertedSemicolon)
	        this.options.onInsertedSemicolon(this.lastTokEnd, this.lastTokEndLoc)
	      return true
	    }
	  }
	
	  // Consume a semicolon, or, failing that, see if we are allowed to
	  // pretend that there is a semicolon at this position.
	
	  pp.semicolon = function() {
	    if (!this.eat(tt.semi) && !this.insertSemicolon()) this.unexpected()
	  }
	
	  pp.afterTrailingComma = function(tokType, notNext) {
	    if (this.type == tokType) {
	      if (this.options.onTrailingComma)
	        this.options.onTrailingComma(this.lastTokStart, this.lastTokStartLoc)
	      if (!notNext)
	        this.next()
	      return true
	    }
	  }
	
	  // Expect a token of a given type. If found, consume it, otherwise,
	  // raise an unexpected token error.
	
	  pp.expect = function(type) {
	    this.eat(type) || this.unexpected()
	  }
	
	  // Raise an unexpected token error.
	
	  pp.unexpected = function(pos) {
	    this.raise(pos != null ? pos : this.start, "Unexpected token")
	  }
	
	  var DestructuringErrors = function DestructuringErrors() {
	    this.shorthandAssign = 0
	    this.trailingComma = 0
	  };
	
	  pp.checkPatternErrors = function(refDestructuringErrors, andThrow) {
	    var trailing = refDestructuringErrors && refDestructuringErrors.trailingComma
	    if (!andThrow) return !!trailing
	    if (trailing) this.raise(trailing, "Comma is not permitted after the rest element")
	  }
	
	  pp.checkExpressionErrors = function(refDestructuringErrors, andThrow) {
	    var pos = refDestructuringErrors && refDestructuringErrors.shorthandAssign
	    if (!andThrow) return !!pos
	    if (pos) this.raise(pos, "Shorthand property assignments are valid only in destructuring patterns")
	  }
	
	  pp.checkYieldAwaitInDefaultParams = function() {
	    if (this.yieldPos && (!this.awaitPos || this.yieldPos < this.awaitPos))
	      this.raise(this.yieldPos, "Yield expression cannot be a default value")
	    if (this.awaitPos)
	      this.raise(this.awaitPos, "Await expression cannot be a default value")
	  }
	
	  var pp$1 = Parser.prototype
	
	  // ### Statement parsing
	
	  // Parse a program. Initializes the parser, reads any number of
	  // statements, and wraps them in a Program node.  Optionally takes a
	  // `program` argument.  If present, the statements will be appended
	  // to its body instead of creating a new node.
	
	  pp$1.parseTopLevel = function(node) {
	    var this$1 = this;
	
	    var first = true, exports = {}
	    if (!node.body) node.body = []
	    while (this.type !== tt.eof) {
	      var stmt = this$1.parseStatement(true, true, exports)
	      node.body.push(stmt)
	      if (first) {
	        if (this$1.isUseStrict(stmt)) this$1.setStrict(true)
	        first = false
	      }
	    }
	    this.next()
	    if (this.options.ecmaVersion >= 6) {
	      node.sourceType = this.options.sourceType
	    }
	    return this.finishNode(node, "Program")
	  }
	
	  var loopLabel = {kind: "loop"};
	  var switchLabel = {kind: "switch"};
	  pp$1.isLet = function() {
	    if (this.type !== tt.name || this.options.ecmaVersion < 6 || this.value != "let") return false
	    skipWhiteSpace.lastIndex = this.pos
	    var skip = skipWhiteSpace.exec(this.input)
	    var next = this.pos + skip[0].length, nextCh = this.input.charCodeAt(next)
	    if (nextCh === 91 || nextCh == 123) return true // '{' and '['
	    if (isIdentifierStart(nextCh, true)) {
	      for (var pos = next + 1; isIdentifierChar(this.input.charCodeAt(pos), true); ++pos) {}
	      var ident = this.input.slice(next, pos)
	      if (!this.isKeyword(ident)) return true
	    }
	    return false
	  }
	
	  // check 'async [no LineTerminator here] function'
	  // - 'async /*foo*/ function' is OK.
	  // - 'async /*\n*/ function' is invalid.
	  pp$1.isAsyncFunction = function() {
	    if (this.type !== tt.name || this.options.ecmaVersion < 8 || this.value != "async")
	      return false
	
	    skipWhiteSpace.lastIndex = this.pos
	    var skip = skipWhiteSpace.exec(this.input)
	    var next = this.pos + skip[0].length
	    return !lineBreak.test(this.input.slice(this.pos, next)) &&
	      this.input.slice(next, next + 8) === "function" &&
	      (next + 8 == this.input.length || !isIdentifierChar(this.input.charAt(next + 8)))
	  }
	
	  // Parse a single statement.
	  //
	  // If expecting a statement and finding a slash operator, parse a
	  // regular expression literal. This is to handle cases like
	  // `if (foo) /blah/.exec(foo)`, where looking at the previous token
	  // does not help.
	
	  pp$1.parseStatement = function(declaration, topLevel, exports) {
	    var starttype = this.type, node = this.startNode(), kind
	
	    if (this.isLet()) {
	      starttype = tt._var
	      kind = "let"
	    }
	
	    // Most types of statements are recognized by the keyword they
	    // start with. Many are trivial to parse, some require a bit of
	    // complexity.
	
	    switch (starttype) {
	    case tt._break: case tt._continue: return this.parseBreakContinueStatement(node, starttype.keyword)
	    case tt._debugger: return this.parseDebuggerStatement(node)
	    case tt._do: return this.parseDoStatement(node)
	    case tt._for: return this.parseForStatement(node)
	    case tt._function:
	      if (!declaration && this.options.ecmaVersion >= 6) this.unexpected()
	      return this.parseFunctionStatement(node, false)
	    case tt._class:
	      if (!declaration) this.unexpected()
	      return this.parseClass(node, true)
	    case tt._if: return this.parseIfStatement(node)
	    case tt._return: return this.parseReturnStatement(node)
	    case tt._switch: return this.parseSwitchStatement(node)
	    case tt._throw: return this.parseThrowStatement(node)
	    case tt._try: return this.parseTryStatement(node)
	    case tt._const: case tt._var:
	      kind = kind || this.value
	      if (!declaration && kind != "var") this.unexpected()
	      return this.parseVarStatement(node, kind)
	    case tt._while: return this.parseWhileStatement(node)
	    case tt._with: return this.parseWithStatement(node)
	    case tt.braceL: return this.parseBlock()
	    case tt.semi: return this.parseEmptyStatement(node)
	    case tt._export:
	    case tt._import:
	      if (!this.options.allowImportExportEverywhere) {
	        if (!topLevel)
	          this.raise(this.start, "'import' and 'export' may only appear at the top level")
	        if (!this.inModule)
	          this.raise(this.start, "'import' and 'export' may appear only with 'sourceType: module'")
	      }
	      return starttype === tt._import ? this.parseImport(node) : this.parseExport(node, exports)
	
	      // If the statement does not start with a statement keyword or a
	      // brace, it's an ExpressionStatement or LabeledStatement. We
	      // simply start parsing an expression, and afterwards, if the
	      // next token is a colon and the expression was a simple
	      // Identifier node, we switch to interpreting it as a label.
	    default:
	      if (this.isAsyncFunction() && declaration) {
	        this.next()
	        return this.parseFunctionStatement(node, true)
	      }
	
	      var maybeName = this.value, expr = this.parseExpression()
	      if (starttype === tt.name && expr.type === "Identifier" && this.eat(tt.colon))
	        return this.parseLabeledStatement(node, maybeName, expr)
	      else return this.parseExpressionStatement(node, expr)
	    }
	  }
	
	  pp$1.parseBreakContinueStatement = function(node, keyword) {
	    var this$1 = this;
	
	    var isBreak = keyword == "break"
	    this.next()
	    if (this.eat(tt.semi) || this.insertSemicolon()) node.label = null
	    else if (this.type !== tt.name) this.unexpected()
	    else {
	      node.label = this.parseIdent()
	      this.semicolon()
	    }
	
	    // Verify that there is an actual destination to break or
	    // continue to.
	    for (var i = 0; i < this.labels.length; ++i) {
	      var lab = this$1.labels[i]
	      if (node.label == null || lab.name === node.label.name) {
	        if (lab.kind != null && (isBreak || lab.kind === "loop")) break
	        if (node.label && isBreak) break
	      }
	    }
	    if (i === this.labels.length) this.raise(node.start, "Unsyntactic " + keyword)
	    return this.finishNode(node, isBreak ? "BreakStatement" : "ContinueStatement")
	  }
	
	  pp$1.parseDebuggerStatement = function(node) {
	    this.next()
	    this.semicolon()
	    return this.finishNode(node, "DebuggerStatement")
	  }
	
	  pp$1.parseDoStatement = function(node) {
	    this.next()
	    this.labels.push(loopLabel)
	    node.body = this.parseStatement(false)
	    this.labels.pop()
	    this.expect(tt._while)
	    node.test = this.parseParenExpression()
	    if (this.options.ecmaVersion >= 6)
	      this.eat(tt.semi)
	    else
	      this.semicolon()
	    return this.finishNode(node, "DoWhileStatement")
	  }
	
	  // Disambiguating between a `for` and a `for`/`in` or `for`/`of`
	  // loop is non-trivial. Basically, we have to parse the init `var`
	  // statement or expression, disallowing the `in` operator (see
	  // the second parameter to `parseExpression`), and then check
	  // whether the next token is `in` or `of`. When there is no init
	  // part (semicolon immediately after the opening parenthesis), it
	  // is a regular `for` loop.
	
	  pp$1.parseForStatement = function(node) {
	    this.next()
	    this.labels.push(loopLabel)
	    this.expect(tt.parenL)
	    if (this.type === tt.semi) return this.parseFor(node, null)
	    var isLet = this.isLet()
	    if (this.type === tt._var || this.type === tt._const || isLet) {
	      var init$1 = this.startNode(), kind = isLet ? "let" : this.value
	      this.next()
	      this.parseVar(init$1, true, kind)
	      this.finishNode(init$1, "VariableDeclaration")
	      if ((this.type === tt._in || (this.options.ecmaVersion >= 6 && this.isContextual("of"))) && init$1.declarations.length === 1 &&
	          !(kind !== "var" && init$1.declarations[0].init))
	        return this.parseForIn(node, init$1)
	      return this.parseFor(node, init$1)
	    }
	    var refDestructuringErrors = new DestructuringErrors
	    var init = this.parseExpression(true, refDestructuringErrors)
	    if (this.type === tt._in || (this.options.ecmaVersion >= 6 && this.isContextual("of"))) {
	      this.checkPatternErrors(refDestructuringErrors, true)
	      this.toAssignable(init)
	      this.checkLVal(init)
	      return this.parseForIn(node, init)
	    } else {
	      this.checkExpressionErrors(refDestructuringErrors, true)
	    }
	    return this.parseFor(node, init)
	  }
	
	  pp$1.parseFunctionStatement = function(node, isAsync) {
	    this.next()
	    return this.parseFunction(node, true, false, isAsync)
	  }
	
	  pp$1.isFunction = function() {
	    return this.type === tt._function || this.isAsyncFunction()
	  }
	
	  pp$1.parseIfStatement = function(node) {
	    this.next()
	    node.test = this.parseParenExpression()
	    // allow function declarations in branches, but only in non-strict mode
	    node.consequent = this.parseStatement(!this.strict && this.isFunction())
	    node.alternate = this.eat(tt._else) ? this.parseStatement(!this.strict && this.isFunction()) : null
	    return this.finishNode(node, "IfStatement")
	  }
	
	  pp$1.parseReturnStatement = function(node) {
	    if (!this.inFunction && !this.options.allowReturnOutsideFunction)
	      this.raise(this.start, "'return' outside of function")
	    this.next()
	
	    // In `return` (and `break`/`continue`), the keywords with
	    // optional arguments, we eagerly look for a semicolon or the
	    // possibility to insert one.
	
	    if (this.eat(tt.semi) || this.insertSemicolon()) node.argument = null
	    else { node.argument = this.parseExpression(); this.semicolon() }
	    return this.finishNode(node, "ReturnStatement")
	  }
	
	  pp$1.parseSwitchStatement = function(node) {
	    var this$1 = this;
	
	    this.next()
	    node.discriminant = this.parseParenExpression()
	    node.cases = []
	    this.expect(tt.braceL)
	    this.labels.push(switchLabel)
	
	    // Statements under must be grouped (by label) in SwitchCase
	    // nodes. `cur` is used to keep the node that we are currently
	    // adding statements to.
	
	    for (var cur, sawDefault = false; this.type != tt.braceR;) {
	      if (this$1.type === tt._case || this$1.type === tt._default) {
	        var isCase = this$1.type === tt._case
	        if (cur) this$1.finishNode(cur, "SwitchCase")
	        node.cases.push(cur = this$1.startNode())
	        cur.consequent = []
	        this$1.next()
	        if (isCase) {
	          cur.test = this$1.parseExpression()
	        } else {
	          if (sawDefault) this$1.raiseRecoverable(this$1.lastTokStart, "Multiple default clauses")
	          sawDefault = true
	          cur.test = null
	        }
	        this$1.expect(tt.colon)
	      } else {
	        if (!cur) this$1.unexpected()
	        cur.consequent.push(this$1.parseStatement(true))
	      }
	    }
	    if (cur) this.finishNode(cur, "SwitchCase")
	    this.next() // Closing brace
	    this.labels.pop()
	    return this.finishNode(node, "SwitchStatement")
	  }
	
	  pp$1.parseThrowStatement = function(node) {
	    this.next()
	    if (lineBreak.test(this.input.slice(this.lastTokEnd, this.start)))
	      this.raise(this.lastTokEnd, "Illegal newline after throw")
	    node.argument = this.parseExpression()
	    this.semicolon()
	    return this.finishNode(node, "ThrowStatement")
	  }
	
	  // Reused empty array added for node fields that are always empty.
	
	  var empty = []
	
	  pp$1.parseTryStatement = function(node) {
	    this.next()
	    node.block = this.parseBlock()
	    node.handler = null
	    if (this.type === tt._catch) {
	      var clause = this.startNode()
	      this.next()
	      this.expect(tt.parenL)
	      clause.param = this.parseBindingAtom()
	      this.checkLVal(clause.param, true)
	      this.expect(tt.parenR)
	      clause.body = this.parseBlock()
	      node.handler = this.finishNode(clause, "CatchClause")
	    }
	    node.finalizer = this.eat(tt._finally) ? this.parseBlock() : null
	    if (!node.handler && !node.finalizer)
	      this.raise(node.start, "Missing catch or finally clause")
	    return this.finishNode(node, "TryStatement")
	  }
	
	  pp$1.parseVarStatement = function(node, kind) {
	    this.next()
	    this.parseVar(node, false, kind)
	    this.semicolon()
	    return this.finishNode(node, "VariableDeclaration")
	  }
	
	  pp$1.parseWhileStatement = function(node) {
	    this.next()
	    node.test = this.parseParenExpression()
	    this.labels.push(loopLabel)
	    node.body = this.parseStatement(false)
	    this.labels.pop()
	    return this.finishNode(node, "WhileStatement")
	  }
	
	  pp$1.parseWithStatement = function(node) {
	    if (this.strict) this.raise(this.start, "'with' in strict mode")
	    this.next()
	    node.object = this.parseParenExpression()
	    node.body = this.parseStatement(false)
	    return this.finishNode(node, "WithStatement")
	  }
	
	  pp$1.parseEmptyStatement = function(node) {
	    this.next()
	    return this.finishNode(node, "EmptyStatement")
	  }
	
	  pp$1.parseLabeledStatement = function(node, maybeName, expr) {
	    var this$1 = this;
	
	    for (var i = 0; i < this.labels.length; ++i)
	      if (this$1.labels[i].name === maybeName) this$1.raise(expr.start, "Label '" + maybeName + "' is already declared")
	    var kind = this.type.isLoop ? "loop" : this.type === tt._switch ? "switch" : null
	    for (var i$1 = this.labels.length - 1; i$1 >= 0; i$1--) {
	      var label = this$1.labels[i$1]
	      if (label.statementStart == node.start) {
	        label.statementStart = this$1.start
	        label.kind = kind
	      } else break
	    }
	    this.labels.push({name: maybeName, kind: kind, statementStart: this.start})
	    node.body = this.parseStatement(true)
	    this.labels.pop()
	    node.label = expr
	    return this.finishNode(node, "LabeledStatement")
	  }
	
	  pp$1.parseExpressionStatement = function(node, expr) {
	    node.expression = expr
	    this.semicolon()
	    return this.finishNode(node, "ExpressionStatement")
	  }
	
	  // Parse a semicolon-enclosed block of statements, handling `"use
	  // strict"` declarations when `allowStrict` is true (used for
	  // function bodies).
	
	  pp$1.parseBlock = function(allowStrict) {
	    var this$1 = this;
	
	    var node = this.startNode(), first = true, oldStrict
	    node.body = []
	    this.expect(tt.braceL)
	    while (!this.eat(tt.braceR)) {
	      var stmt = this$1.parseStatement(true)
	      node.body.push(stmt)
	      if (first && allowStrict && this$1.isUseStrict(stmt)) {
	        oldStrict = this$1.strict
	        this$1.setStrict(this$1.strict = true)
	      }
	      first = false
	    }
	    if (oldStrict === false) this.setStrict(false)
	    return this.finishNode(node, "BlockStatement")
	  }
	
	  // Parse a regular `for` loop. The disambiguation code in
	  // `parseStatement` will already have parsed the init statement or
	  // expression.
	
	  pp$1.parseFor = function(node, init) {
	    node.init = init
	    this.expect(tt.semi)
	    node.test = this.type === tt.semi ? null : this.parseExpression()
	    this.expect(tt.semi)
	    node.update = this.type === tt.parenR ? null : this.parseExpression()
	    this.expect(tt.parenR)
	    node.body = this.parseStatement(false)
	    this.labels.pop()
	    return this.finishNode(node, "ForStatement")
	  }
	
	  // Parse a `for`/`in` and `for`/`of` loop, which are almost
	  // same from parser's perspective.
	
	  pp$1.parseForIn = function(node, init) {
	    var type = this.type === tt._in ? "ForInStatement" : "ForOfStatement"
	    this.next()
	    node.left = init
	    node.right = this.parseExpression()
	    this.expect(tt.parenR)
	    node.body = this.parseStatement(false)
	    this.labels.pop()
	    return this.finishNode(node, type)
	  }
	
	  // Parse a list of variable declarations.
	
	  pp$1.parseVar = function(node, isFor, kind) {
	    var this$1 = this;
	
	    node.declarations = []
	    node.kind = kind
	    for (;;) {
	      var decl = this$1.startNode()
	      this$1.parseVarId(decl)
	      if (this$1.eat(tt.eq)) {
	        decl.init = this$1.parseMaybeAssign(isFor)
	      } else if (kind === "const" && !(this$1.type === tt._in || (this$1.options.ecmaVersion >= 6 && this$1.isContextual("of")))) {
	        this$1.unexpected()
	      } else if (decl.id.type != "Identifier" && !(isFor && (this$1.type === tt._in || this$1.isContextual("of")))) {
	        this$1.raise(this$1.lastTokEnd, "Complex binding patterns require an initialization value")
	      } else {
	        decl.init = null
	      }
	      node.declarations.push(this$1.finishNode(decl, "VariableDeclarator"))
	      if (!this$1.eat(tt.comma)) break
	    }
	    return node
	  }
	
	  pp$1.parseVarId = function(decl) {
	    decl.id = this.parseBindingAtom()
	    this.checkLVal(decl.id, true)
	  }
	
	  // Parse a function declaration or literal (depending on the
	  // `isStatement` parameter).
	
	  pp$1.parseFunction = function(node, isStatement, allowExpressionBody, isAsync) {
	    this.initFunction(node)
	    if (this.options.ecmaVersion >= 6 && !isAsync)
	      node.generator = this.eat(tt.star)
	    if (this.options.ecmaVersion >= 8)
	      node.async = !!isAsync
	
	    if (isStatement)
	      node.id = this.parseIdent()
	
	    var oldInGen = this.inGenerator, oldInAsync = this.inAsync, oldYieldPos = this.yieldPos, oldAwaitPos = this.awaitPos
	    this.inGenerator = node.generator
	    this.inAsync = node.async
	    this.yieldPos = 0
	    this.awaitPos = 0
	
	    if (!isStatement && this.type === tt.name)
	      node.id = this.parseIdent()
	    this.parseFunctionParams(node)
	    this.parseFunctionBody(node, allowExpressionBody)
	
	    this.inGenerator = oldInGen
	    this.inAsync = oldInAsync
	    this.yieldPos = oldYieldPos
	    this.awaitPos = oldAwaitPos
	    return this.finishNode(node, isStatement ? "FunctionDeclaration" : "FunctionExpression")
	  }
	
	  pp$1.parseFunctionParams = function(node) {
	    this.expect(tt.parenL)
	    node.params = this.parseBindingList(tt.parenR, false, this.options.ecmaVersion >= 8, true)
	    this.checkYieldAwaitInDefaultParams()
	  }
	
	  // Parse a class declaration or literal (depending on the
	  // `isStatement` parameter).
	
	  pp$1.parseClass = function(node, isStatement) {
	    var this$1 = this;
	
	    this.next()
	    this.parseClassId(node, isStatement)
	    this.parseClassSuper(node)
	    var classBody = this.startNode()
	    var hadConstructor = false
	    classBody.body = []
	    this.expect(tt.braceL)
	    while (!this.eat(tt.braceR)) {
	      if (this$1.eat(tt.semi)) continue
	      var method = this$1.startNode()
	      var isGenerator = this$1.eat(tt.star)
	      var isAsync = false
	      var isMaybeStatic = this$1.type === tt.name && this$1.value === "static"
	      this$1.parsePropertyName(method)
	      method.static = isMaybeStatic && this$1.type !== tt.parenL
	      if (method.static) {
	        if (isGenerator) this$1.unexpected()
	        isGenerator = this$1.eat(tt.star)
	        this$1.parsePropertyName(method)
	      }
	      if (this$1.options.ecmaVersion >= 8 && !isGenerator && !method.computed &&
	          method.key.type === "Identifier" && method.key.name === "async" && this$1.type !== tt.parenL &&
	          !this$1.canInsertSemicolon()) {
	        isAsync = true
	        this$1.parsePropertyName(method)
	      }
	      method.kind = "method"
	      var isGetSet = false
	      if (!method.computed) {
	        var key = method.key;
	        if (!isGenerator && !isAsync && key.type === "Identifier" && this$1.type !== tt.parenL && (key.name === "get" || key.name === "set")) {
	          isGetSet = true
	          method.kind = key.name
	          key = this$1.parsePropertyName(method)
	        }
	        if (!method.static && (key.type === "Identifier" && key.name === "constructor" ||
	            key.type === "Literal" && key.value === "constructor")) {
	          if (hadConstructor) this$1.raise(key.start, "Duplicate constructor in the same class")
	          if (isGetSet) this$1.raise(key.start, "Constructor can't have get/set modifier")
	          if (isGenerator) this$1.raise(key.start, "Constructor can't be a generator")
	          if (isAsync) this$1.raise(key.start, "Constructor can't be an async method")
	          method.kind = "constructor"
	          hadConstructor = true
	        }
	      }
	      this$1.parseClassMethod(classBody, method, isGenerator, isAsync)
	      if (isGetSet) {
	        var paramCount = method.kind === "get" ? 0 : 1
	        if (method.value.params.length !== paramCount) {
	          var start = method.value.start
	          if (method.kind === "get")
	            this$1.raiseRecoverable(start, "getter should have no params")
	          else
	            this$1.raiseRecoverable(start, "setter should have exactly one param")
	        } else {
	          if (method.kind === "set" && method.value.params[0].type === "RestElement")
	            this$1.raiseRecoverable(method.value.params[0].start, "Setter cannot use rest params")
	        }
	      }
	    }
	    node.body = this.finishNode(classBody, "ClassBody")
	    return this.finishNode(node, isStatement ? "ClassDeclaration" : "ClassExpression")
	  }
	
	  pp$1.parseClassMethod = function(classBody, method, isGenerator, isAsync) {
	    method.value = this.parseMethod(isGenerator, isAsync)
	    classBody.body.push(this.finishNode(method, "MethodDefinition"))
	  }
	
	  pp$1.parseClassId = function(node, isStatement) {
	    node.id = this.type === tt.name ? this.parseIdent() : isStatement ? this.unexpected() : null
	  }
	
	  pp$1.parseClassSuper = function(node) {
	    node.superClass = this.eat(tt._extends) ? this.parseExprSubscripts() : null
	  }
	
	  // Parses module export declaration.
	
	  pp$1.parseExport = function(node, exports) {
	    var this$1 = this;
	
	    this.next()
	    // export * from '...'
	    if (this.eat(tt.star)) {
	      this.expectContextual("from")
	      node.source = this.type === tt.string ? this.parseExprAtom() : this.unexpected()
	      this.semicolon()
	      return this.finishNode(node, "ExportAllDeclaration")
	    }
	    if (this.eat(tt._default)) { // export default ...
	      this.checkExport(exports, "default", this.lastTokStart)
	      var parens = this.type == tt.parenL
	      var expr = this.parseMaybeAssign()
	      var needsSemi = true
	      if (!parens && (expr.type == "FunctionExpression" ||
	                      expr.type == "ClassExpression")) {
	        needsSemi = false
	        if (expr.id) {
	          expr.type = expr.type == "FunctionExpression"
	            ? "FunctionDeclaration"
	            : "ClassDeclaration"
	        }
	      }
	      node.declaration = expr
	      if (needsSemi) this.semicolon()
	      return this.finishNode(node, "ExportDefaultDeclaration")
	    }
	    // export var|const|let|function|class ...
	    if (this.shouldParseExportStatement()) {
	      node.declaration = this.parseStatement(true)
	      if (node.declaration.type === "VariableDeclaration")
	        this.checkVariableExport(exports, node.declaration.declarations)
	      else
	        this.checkExport(exports, node.declaration.id.name, node.declaration.id.start)
	      node.specifiers = []
	      node.source = null
	    } else { // export { x, y as z } [from '...']
	      node.declaration = null
	      node.specifiers = this.parseExportSpecifiers(exports)
	      if (this.eatContextual("from")) {
	        node.source = this.type === tt.string ? this.parseExprAtom() : this.unexpected()
	      } else {
	        // check for keywords used as local names
	        for (var i = 0; i < node.specifiers.length; i++) {
	          if (this$1.keywords.test(node.specifiers[i].local.name) || this$1.reservedWords.test(node.specifiers[i].local.name)) {
	            this$1.unexpected(node.specifiers[i].local.start)
	          }
	        }
	
	        node.source = null
	      }
	      this.semicolon()
	    }
	    return this.finishNode(node, "ExportNamedDeclaration")
	  }
	
	  pp$1.checkExport = function(exports, name, pos) {
	    if (!exports) return
	    if (Object.prototype.hasOwnProperty.call(exports, name))
	      this.raiseRecoverable(pos, "Duplicate export '" + name + "'")
	    exports[name] = true
	  }
	
	  pp$1.checkPatternExport = function(exports, pat) {
	    var this$1 = this;
	
	    var type = pat.type
	    if (type == "Identifier")
	      this.checkExport(exports, pat.name, pat.start)
	    else if (type == "ObjectPattern")
	      for (var i = 0; i < pat.properties.length; ++i)
	        this$1.checkPatternExport(exports, pat.properties[i].value)
	    else if (type == "ArrayPattern")
	      for (var i$1 = 0; i$1 < pat.elements.length; ++i$1) {
	        var elt = pat.elements[i$1]
	        if (elt) this$1.checkPatternExport(exports, elt)
	      }
	    else if (type == "AssignmentPattern")
	      this.checkPatternExport(exports, pat.left)
	    else if (type == "ParenthesizedExpression")
	      this.checkPatternExport(exports, pat.expression)
	  }
	
	  pp$1.checkVariableExport = function(exports, decls) {
	    var this$1 = this;
	
	    if (!exports) return
	    for (var i = 0; i < decls.length; i++)
	      this$1.checkPatternExport(exports, decls[i].id)
	  }
	
	  pp$1.shouldParseExportStatement = function() {
	    return this.type.keyword || this.isLet() || this.isAsyncFunction()
	  }
	
	  // Parses a comma-separated list of module exports.
	
	  pp$1.parseExportSpecifiers = function(exports) {
	    var this$1 = this;
	
	    var nodes = [], first = true
	    // export { x, y as z } [from '...']
	    this.expect(tt.braceL)
	    while (!this.eat(tt.braceR)) {
	      if (!first) {
	        this$1.expect(tt.comma)
	        if (this$1.afterTrailingComma(tt.braceR)) break
	      } else first = false
	
	      var node = this$1.startNode()
	      node.local = this$1.parseIdent(this$1.type === tt._default)
	      node.exported = this$1.eatContextual("as") ? this$1.parseIdent(true) : node.local
	      this$1.checkExport(exports, node.exported.name, node.exported.start)
	      nodes.push(this$1.finishNode(node, "ExportSpecifier"))
	    }
	    return nodes
	  }
	
	  // Parses import declaration.
	
	  pp$1.parseImport = function(node) {
	    this.next()
	    // import '...'
	    if (this.type === tt.string) {
	      node.specifiers = empty
	      node.source = this.parseExprAtom()
	    } else {
	      node.specifiers = this.parseImportSpecifiers()
	      this.expectContextual("from")
	      node.source = this.type === tt.string ? this.parseExprAtom() : this.unexpected()
	    }
	    this.semicolon()
	    return this.finishNode(node, "ImportDeclaration")
	  }
	
	  // Parses a comma-separated list of module imports.
	
	  pp$1.parseImportSpecifiers = function() {
	    var this$1 = this;
	
	    var nodes = [], first = true
	    if (this.type === tt.name) {
	      // import defaultObj, { x, y as z } from '...'
	      var node = this.startNode()
	      node.local = this.parseIdent()
	      this.checkLVal(node.local, true)
	      nodes.push(this.finishNode(node, "ImportDefaultSpecifier"))
	      if (!this.eat(tt.comma)) return nodes
	    }
	    if (this.type === tt.star) {
	      var node$1 = this.startNode()
	      this.next()
	      this.expectContextual("as")
	      node$1.local = this.parseIdent()
	      this.checkLVal(node$1.local, true)
	      nodes.push(this.finishNode(node$1, "ImportNamespaceSpecifier"))
	      return nodes
	    }
	    this.expect(tt.braceL)
	    while (!this.eat(tt.braceR)) {
	      if (!first) {
	        this$1.expect(tt.comma)
	        if (this$1.afterTrailingComma(tt.braceR)) break
	      } else first = false
	
	      var node$2 = this$1.startNode()
	      node$2.imported = this$1.parseIdent(true)
	      if (this$1.eatContextual("as")) {
	        node$2.local = this$1.parseIdent()
	      } else {
	        node$2.local = node$2.imported
	        if (this$1.isKeyword(node$2.local.name)) this$1.unexpected(node$2.local.start)
	        if (this$1.reservedWordsStrict.test(node$2.local.name)) this$1.raiseRecoverable(node$2.local.start, "The keyword '" + node$2.local.name + "' is reserved")
	      }
	      this$1.checkLVal(node$2.local, true)
	      nodes.push(this$1.finishNode(node$2, "ImportSpecifier"))
	    }
	    return nodes
	  }
	
	  var pp$2 = Parser.prototype
	
	  // Convert existing expression atom to assignable pattern
	  // if possible.
	
	  pp$2.toAssignable = function(node, isBinding) {
	    var this$1 = this;
	
	    if (this.options.ecmaVersion >= 6 && node) {
	      switch (node.type) {
	        case "Identifier":
	        if (this.inAsync && node.name === "await")
	          this.raise(node.start, "Can not use 'await' as identifier inside an async function")
	        break
	
	      case "ObjectPattern":
	      case "ArrayPattern":
	        break
	
	      case "ObjectExpression":
	        node.type = "ObjectPattern"
	        for (var i = 0; i < node.properties.length; i++) {
	          var prop = node.properties[i]
	          if (prop.kind !== "init") this$1.raise(prop.key.start, "Object pattern can't contain getter or setter")
	          this$1.toAssignable(prop.value, isBinding)
	        }
	        break
	
	      case "ArrayExpression":
	        node.type = "ArrayPattern"
	        this.toAssignableList(node.elements, isBinding)
	        break
	
	      case "AssignmentExpression":
	        if (node.operator === "=") {
	          node.type = "AssignmentPattern"
	          delete node.operator
	          this.toAssignable(node.left, isBinding)
	          // falls through to AssignmentPattern
	        } else {
	          this.raise(node.left.end, "Only '=' operator can be used for specifying default value.")
	          break
	        }
	
	      case "AssignmentPattern":
	        break
	
	      case "ParenthesizedExpression":
	        node.expression = this.toAssignable(node.expression, isBinding)
	        break
	
	      case "MemberExpression":
	        if (!isBinding) break
	
	      default:
	        this.raise(node.start, "Assigning to rvalue")
	      }
	    }
	    return node
	  }
	
	  // Convert list of expression atoms to binding list.
	
	  pp$2.toAssignableList = function(exprList, isBinding) {
	    var this$1 = this;
	
	    var end = exprList.length
	    if (end) {
	      var last = exprList[end - 1]
	      if (last && last.type == "RestElement") {
	        --end
	      } else if (last && last.type == "SpreadElement") {
	        last.type = "RestElement"
	        var arg = last.argument
	        this.toAssignable(arg, isBinding)
	        if (arg.type !== "Identifier" && arg.type !== "MemberExpression" && arg.type !== "ArrayPattern")
	          this.unexpected(arg.start)
	        --end
	      }
	
	      if (isBinding && last && last.type === "RestElement" && last.argument.type !== "Identifier")
	        this.unexpected(last.argument.start)
	    }
	    for (var i = 0; i < end; i++) {
	      var elt = exprList[i]
	      if (elt) this$1.toAssignable(elt, isBinding)
	    }
	    return exprList
	  }
	
	  // Parses spread element.
	
	  pp$2.parseSpread = function(refDestructuringErrors) {
	    var node = this.startNode()
	    this.next()
	    node.argument = this.parseMaybeAssign(false, refDestructuringErrors)
	    return this.finishNode(node, "SpreadElement")
	  }
	
	  pp$2.parseRest = function(allowNonIdent) {
	    var node = this.startNode()
	    this.next()
	
	    // RestElement inside of a function parameter must be an identifier
	    if (allowNonIdent) node.argument = this.type === tt.name ? this.parseIdent() : this.unexpected()
	    else node.argument = this.type === tt.name || this.type === tt.bracketL ? this.parseBindingAtom() : this.unexpected()
	
	    return this.finishNode(node, "RestElement")
	  }
	
	  // Parses lvalue (assignable) atom.
	
	  pp$2.parseBindingAtom = function() {
	    if (this.options.ecmaVersion < 6) return this.parseIdent()
	    switch (this.type) {
	    case tt.name:
	      return this.parseIdent()
	
	    case tt.bracketL:
	      var node = this.startNode()
	      this.next()
	      node.elements = this.parseBindingList(tt.bracketR, true, true)
	      return this.finishNode(node, "ArrayPattern")
	
	    case tt.braceL:
	      return this.parseObj(true)
	
	    default:
	      this.unexpected()
	    }
	  }
	
	  pp$2.parseBindingList = function(close, allowEmpty, allowTrailingComma, allowNonIdent) {
	    var this$1 = this;
	
	    var elts = [], first = true
	    while (!this.eat(close)) {
	      if (first) first = false
	      else this$1.expect(tt.comma)
	      if (allowEmpty && this$1.type === tt.comma) {
	        elts.push(null)
	      } else if (allowTrailingComma && this$1.afterTrailingComma(close)) {
	        break
	      } else if (this$1.type === tt.ellipsis) {
	        var rest = this$1.parseRest(allowNonIdent)
	        this$1.parseBindingListItem(rest)
	        elts.push(rest)
	        if (this$1.type === tt.comma) this$1.raise(this$1.start, "Comma is not permitted after the rest element")
	        this$1.expect(close)
	        break
	      } else {
	        var elem = this$1.parseMaybeDefault(this$1.start, this$1.startLoc)
	        this$1.parseBindingListItem(elem)
	        elts.push(elem)
	      }
	    }
	    return elts
	  }
	
	  pp$2.parseBindingListItem = function(param) {
	    return param
	  }
	
	  // Parses assignment pattern around given atom if possible.
	
	  pp$2.parseMaybeDefault = function(startPos, startLoc, left) {
	    left = left || this.parseBindingAtom()
	    if (this.options.ecmaVersion < 6 || !this.eat(tt.eq)) return left
	    var node = this.startNodeAt(startPos, startLoc)
	    node.left = left
	    node.right = this.parseMaybeAssign()
	    return this.finishNode(node, "AssignmentPattern")
	  }
	
	  // Verify that a node is an lval — something that can be assigned
	  // to.
	
	  pp$2.checkLVal = function(expr, isBinding, checkClashes) {
	    var this$1 = this;
	
	    switch (expr.type) {
	    case "Identifier":
	      if (this.strict && this.reservedWordsStrictBind.test(expr.name))
	        this.raiseRecoverable(expr.start, (isBinding ? "Binding " : "Assigning to ") + expr.name + " in strict mode")
	      if (checkClashes) {
	        if (has(checkClashes, expr.name))
	          this.raiseRecoverable(expr.start, "Argument name clash")
	        checkClashes[expr.name] = true
	      }
	      break
	
	    case "MemberExpression":
	      if (isBinding) this.raiseRecoverable(expr.start, (isBinding ? "Binding" : "Assigning to") + " member expression")
	      break
	
	    case "ObjectPattern":
	      for (var i = 0; i < expr.properties.length; i++)
	        this$1.checkLVal(expr.properties[i].value, isBinding, checkClashes)
	      break
	
	    case "ArrayPattern":
	      for (var i$1 = 0; i$1 < expr.elements.length; i$1++) {
	        var elem = expr.elements[i$1]
	        if (elem) this$1.checkLVal(elem, isBinding, checkClashes)
	      }
	      break
	
	    case "AssignmentPattern":
	      this.checkLVal(expr.left, isBinding, checkClashes)
	      break
	
	    case "RestElement":
	      this.checkLVal(expr.argument, isBinding, checkClashes)
	      break
	
	    case "ParenthesizedExpression":
	      this.checkLVal(expr.expression, isBinding, checkClashes)
	      break
	
	    default:
	      this.raise(expr.start, (isBinding ? "Binding" : "Assigning to") + " rvalue")
	    }
	  }
	
	  var pp$3 = Parser.prototype
	
	  // Check if property name clashes with already added.
	  // Object/class getters and setters are not allowed to clash —
	  // either with each other or with an init property — and in
	  // strict mode, init properties are also not allowed to be repeated.
	
	  pp$3.checkPropClash = function(prop, propHash) {
	    if (this.options.ecmaVersion >= 6 && (prop.computed || prop.method || prop.shorthand))
	      return
	    var key = prop.key;
	    var name
	    switch (key.type) {
	    case "Identifier": name = key.name; break
	    case "Literal": name = String(key.value); break
	    default: return
	    }
	    var kind = prop.kind;
	    if (this.options.ecmaVersion >= 6) {
	      if (name === "__proto__" && kind === "init") {
	        if (propHash.proto) this.raiseRecoverable(key.start, "Redefinition of __proto__ property")
	        propHash.proto = true
	      }
	      return
	    }
	    name = "$" + name
	    var other = propHash[name]
	    if (other) {
	      var isGetSet = kind !== "init"
	      if ((this.strict || isGetSet) && other[kind] || !(isGetSet ^ other.init))
	        this.raiseRecoverable(key.start, "Redefinition of property")
	    } else {
	      other = propHash[name] = {
	        init: false,
	        get: false,
	        set: false
	      }
	    }
	    other[kind] = true
	  }
	
	  // ### Expression parsing
	
	  // These nest, from the most general expression type at the top to
	  // 'atomic', nondivisible expression types at the bottom. Most of
	  // the functions will simply let the function(s) below them parse,
	  // and, *if* the syntactic construct they handle is present, wrap
	  // the AST node that the inner parser gave them in another node.
	
	  // Parse a full expression. The optional arguments are used to
	  // forbid the `in` operator (in for loops initalization expressions)
	  // and provide reference for storing '=' operator inside shorthand
	  // property assignment in contexts where both object expression
	  // and object pattern might appear (so it's possible to raise
	  // delayed syntax error at correct position).
	
	  pp$3.parseExpression = function(noIn, refDestructuringErrors) {
	    var this$1 = this;
	
	    var startPos = this.start, startLoc = this.startLoc
	    var expr = this.parseMaybeAssign(noIn, refDestructuringErrors)
	    if (this.type === tt.comma) {
	      var node = this.startNodeAt(startPos, startLoc)
	      node.expressions = [expr]
	      while (this.eat(tt.comma)) node.expressions.push(this$1.parseMaybeAssign(noIn, refDestructuringErrors))
	      return this.finishNode(node, "SequenceExpression")
	    }
	    return expr
	  }
	
	  // Parse an assignment expression. This includes applications of
	  // operators like `+=`.
	
	  pp$3.parseMaybeAssign = function(noIn, refDestructuringErrors, afterLeftParse) {
	    if (this.inGenerator && this.isContextual("yield")) return this.parseYield()
	
	    var ownDestructuringErrors = false
	    if (!refDestructuringErrors) {
	      refDestructuringErrors = new DestructuringErrors
	      ownDestructuringErrors = true
	    }
	    var startPos = this.start, startLoc = this.startLoc
	    if (this.type == tt.parenL || this.type == tt.name)
	      this.potentialArrowAt = this.start
	    var left = this.parseMaybeConditional(noIn, refDestructuringErrors)
	    if (afterLeftParse) left = afterLeftParse.call(this, left, startPos, startLoc)
	    if (this.type.isAssign) {
	      this.checkPatternErrors(refDestructuringErrors, true)
	      if (!ownDestructuringErrors) DestructuringErrors.call(refDestructuringErrors)
	      var node = this.startNodeAt(startPos, startLoc)
	      node.operator = this.value
	      node.left = this.type === tt.eq ? this.toAssignable(left) : left
	      refDestructuringErrors.shorthandAssign = 0 // reset because shorthand default was used correctly
	      this.checkLVal(left)
	      this.next()
	      node.right = this.parseMaybeAssign(noIn)
	      return this.finishNode(node, "AssignmentExpression")
	    } else {
	      if (ownDestructuringErrors) this.checkExpressionErrors(refDestructuringErrors, true)
	    }
	    return left
	  }
	
	  // Parse a ternary conditional (`?:`) operator.
	
	  pp$3.parseMaybeConditional = function(noIn, refDestructuringErrors) {
	    var startPos = this.start, startLoc = this.startLoc
	    var expr = this.parseExprOps(noIn, refDestructuringErrors)
	    if (this.checkExpressionErrors(refDestructuringErrors)) return expr
	    if (this.eat(tt.question)) {
	      var node = this.startNodeAt(startPos, startLoc)
	      node.test = expr
	      node.consequent = this.parseMaybeAssign()
	      this.expect(tt.colon)
	      node.alternate = this.parseMaybeAssign(noIn)
	      return this.finishNode(node, "ConditionalExpression")
	    }
	    return expr
	  }
	
	  // Start the precedence parser.
	
	  pp$3.parseExprOps = function(noIn, refDestructuringErrors) {
	    var startPos = this.start, startLoc = this.startLoc
	    var expr = this.parseMaybeUnary(refDestructuringErrors, false)
	    if (this.checkExpressionErrors(refDestructuringErrors)) return expr
	    return this.parseExprOp(expr, startPos, startLoc, -1, noIn)
	  }
	
	  // Parse binary operators with the operator precedence parsing
	  // algorithm. `left` is the left-hand side of the operator.
	  // `minPrec` provides context that allows the function to stop and
	  // defer further parser to one of its callers when it encounters an
	  // operator that has a lower precedence than the set it is parsing.
	
	  pp$3.parseExprOp = function(left, leftStartPos, leftStartLoc, minPrec, noIn) {
	    var prec = this.type.binop
	    if (prec != null && (!noIn || this.type !== tt._in)) {
	      if (prec > minPrec) {
	        var logical = this.type === tt.logicalOR || this.type === tt.logicalAND
	        var op = this.value
	        this.next()
	        var startPos = this.start, startLoc = this.startLoc
	        var right = this.parseExprOp(this.parseMaybeUnary(null, false), startPos, startLoc, prec, noIn)
	        var node = this.buildBinary(leftStartPos, leftStartLoc, left, right, op, logical)
	        return this.parseExprOp(node, leftStartPos, leftStartLoc, minPrec, noIn)
	      }
	    }
	    return left
	  }
	
	  pp$3.buildBinary = function(startPos, startLoc, left, right, op, logical) {
	    var node = this.startNodeAt(startPos, startLoc)
	    node.left = left
	    node.operator = op
	    node.right = right
	    return this.finishNode(node, logical ? "LogicalExpression" : "BinaryExpression")
	  }
	
	  // Parse unary operators, both prefix and postfix.
	
	  pp$3.parseMaybeUnary = function(refDestructuringErrors, sawUnary) {
	    var this$1 = this;
	
	    var startPos = this.start, startLoc = this.startLoc, expr
	    if (this.inAsync && this.isContextual("await")) {
	      expr = this.parseAwait(refDestructuringErrors)
	      sawUnary = true
	    } else if (this.type.prefix) {
	      var node = this.startNode(), update = this.type === tt.incDec
	      node.operator = this.value
	      node.prefix = true
	      this.next()
	      node.argument = this.parseMaybeUnary(null, true)
	      this.checkExpressionErrors(refDestructuringErrors, true)
	      if (update) this.checkLVal(node.argument)
	      else if (this.strict && node.operator === "delete" &&
	               node.argument.type === "Identifier")
	        this.raiseRecoverable(node.start, "Deleting local variable in strict mode")
	      else sawUnary = true
	      expr = this.finishNode(node, update ? "UpdateExpression" : "UnaryExpression")
	    } else {
	      expr = this.parseExprSubscripts(refDestructuringErrors)
	      if (this.checkExpressionErrors(refDestructuringErrors)) return expr
	      while (this.type.postfix && !this.canInsertSemicolon()) {
	        var node$1 = this$1.startNodeAt(startPos, startLoc)
	        node$1.operator = this$1.value
	        node$1.prefix = false
	        node$1.argument = expr
	        this$1.checkLVal(expr)
	        this$1.next()
	        expr = this$1.finishNode(node$1, "UpdateExpression")
	      }
	    }
	
	    if (!sawUnary && this.eat(tt.starstar))
	      return this.buildBinary(startPos, startLoc, expr, this.parseMaybeUnary(null, false), "**", false)
	    else
	      return expr
	  }
	
	  // Parse call, dot, and `[]`-subscript expressions.
	
	  pp$3.parseExprSubscripts = function(refDestructuringErrors) {
	    var startPos = this.start, startLoc = this.startLoc
	    var expr = this.parseExprAtom(refDestructuringErrors)
	    var skipArrowSubscripts = expr.type === "ArrowFunctionExpression" && this.input.slice(this.lastTokStart, this.lastTokEnd) !== ")"
	    if (this.checkExpressionErrors(refDestructuringErrors) || skipArrowSubscripts) return expr
	    return this.parseSubscripts(expr, startPos, startLoc)
	  }
	
	  pp$3.parseSubscripts = function(base, startPos, startLoc, noCalls) {
	    var this$1 = this;
	
	    for (;;) {
	      var maybeAsyncArrow = this$1.options.ecmaVersion >= 8 && base.type === "Identifier" && base.name === "async" && !this$1.canInsertSemicolon()
	      if (this$1.eat(tt.dot)) {
	        var node = this$1.startNodeAt(startPos, startLoc)
	        node.object = base
	        node.property = this$1.parseIdent(true)
	        node.computed = false
	        base = this$1.finishNode(node, "MemberExpression")
	      } else if (this$1.eat(tt.bracketL)) {
	        var node$1 = this$1.startNodeAt(startPos, startLoc)
	        node$1.object = base
	        node$1.property = this$1.parseExpression()
	        node$1.computed = true
	        this$1.expect(tt.bracketR)
	        base = this$1.finishNode(node$1, "MemberExpression")
	      } else if (!noCalls && this$1.eat(tt.parenL)) {
	        var refDestructuringErrors = new DestructuringErrors, oldYieldPos = this$1.yieldPos, oldAwaitPos = this$1.awaitPos
	        this$1.yieldPos = 0
	        this$1.awaitPos = 0
	        var exprList = this$1.parseExprList(tt.parenR, this$1.options.ecmaVersion >= 8, false, refDestructuringErrors)
	        if (maybeAsyncArrow && !this$1.canInsertSemicolon() && this$1.eat(tt.arrow)) {
	          this$1.checkPatternErrors(refDestructuringErrors, true)
	          this$1.checkYieldAwaitInDefaultParams()
	          this$1.yieldPos = oldYieldPos
	          this$1.awaitPos = oldAwaitPos
	          return this$1.parseArrowExpression(this$1.startNodeAt(startPos, startLoc), exprList, true)
	        }
	        this$1.checkExpressionErrors(refDestructuringErrors, true)
	        this$1.yieldPos = oldYieldPos || this$1.yieldPos
	        this$1.awaitPos = oldAwaitPos || this$1.awaitPos
	        var node$2 = this$1.startNodeAt(startPos, startLoc)
	        node$2.callee = base
	        node$2.arguments = exprList
	        base = this$1.finishNode(node$2, "CallExpression")
	      } else if (this$1.type === tt.backQuote) {
	        var node$3 = this$1.startNodeAt(startPos, startLoc)
	        node$3.tag = base
	        node$3.quasi = this$1.parseTemplate()
	        base = this$1.finishNode(node$3, "TaggedTemplateExpression")
	      } else {
	        return base
	      }
	    }
	  }
	
	  // Parse an atomic expression — either a single token that is an
	  // expression, an expression started by a keyword like `function` or
	  // `new`, or an expression wrapped in punctuation like `()`, `[]`,
	  // or `{}`.
	
	  pp$3.parseExprAtom = function(refDestructuringErrors) {
	    var node, canBeArrow = this.potentialArrowAt == this.start
	    switch (this.type) {
	    case tt._super:
	      if (!this.inFunction)
	        this.raise(this.start, "'super' outside of function or class")
	
	    case tt._this:
	      var type = this.type === tt._this ? "ThisExpression" : "Super"
	      node = this.startNode()
	      this.next()
	      return this.finishNode(node, type)
	
	    case tt.name:
	      var startPos = this.start, startLoc = this.startLoc
	      var id = this.parseIdent(this.type !== tt.name)
	      if (this.options.ecmaVersion >= 8 && id.name === "async" && !this.canInsertSemicolon() && this.eat(tt._function))
	        return this.parseFunction(this.startNodeAt(startPos, startLoc), false, false, true)
	      if (canBeArrow && !this.canInsertSemicolon()) {
	        if (this.eat(tt.arrow))
	          return this.parseArrowExpression(this.startNodeAt(startPos, startLoc), [id], false)
	        if (this.options.ecmaVersion >= 8 && id.name === "async" && this.type === tt.name) {
	          id = this.parseIdent()
	          if (this.canInsertSemicolon() || !this.eat(tt.arrow))
	            this.unexpected()
	          return this.parseArrowExpression(this.startNodeAt(startPos, startLoc), [id], true)
	        }
	      }
	      return id
	
	    case tt.regexp:
	      var value = this.value
	      node = this.parseLiteral(value.value)
	      node.regex = {pattern: value.pattern, flags: value.flags}
	      return node
	
	    case tt.num: case tt.string:
	      return this.parseLiteral(this.value)
	
	    case tt._null: case tt._true: case tt._false:
	      node = this.startNode()
	      node.value = this.type === tt._null ? null : this.type === tt._true
	      node.raw = this.type.keyword
	      this.next()
	      return this.finishNode(node, "Literal")
	
	    case tt.parenL:
	      return this.parseParenAndDistinguishExpression(canBeArrow)
	
	    case tt.bracketL:
	      node = this.startNode()
	      this.next()
	      node.elements = this.parseExprList(tt.bracketR, true, true, refDestructuringErrors)
	      return this.finishNode(node, "ArrayExpression")
	
	    case tt.braceL:
	      return this.parseObj(false, refDestructuringErrors)
	
	    case tt._function:
	      node = this.startNode()
	      this.next()
	      return this.parseFunction(node, false)
	
	    case tt._class:
	      return this.parseClass(this.startNode(), false)
	
	    case tt._new:
	      return this.parseNew()
	
	    case tt.backQuote:
	      return this.parseTemplate()
	
	    default:
	      this.unexpected()
	    }
	  }
	
	  pp$3.parseLiteral = function(value) {
	    var node = this.startNode()
	    node.value = value
	    node.raw = this.input.slice(this.start, this.end)
	    this.next()
	    return this.finishNode(node, "Literal")
	  }
	
	  pp$3.parseParenExpression = function() {
	    this.expect(tt.parenL)
	    var val = this.parseExpression()
	    this.expect(tt.parenR)
	    return val
	  }
	
	  pp$3.parseParenAndDistinguishExpression = function(canBeArrow) {
	    var this$1 = this;
	
	    var startPos = this.start, startLoc = this.startLoc, val, allowTrailingComma = this.options.ecmaVersion >= 8
	    if (this.options.ecmaVersion >= 6) {
	      this.next()
	
	      var innerStartPos = this.start, innerStartLoc = this.startLoc
	      var exprList = [], first = true, lastIsComma = false
	      var refDestructuringErrors = new DestructuringErrors, oldYieldPos = this.yieldPos, oldAwaitPos = this.awaitPos, spreadStart, innerParenStart
	      this.yieldPos = 0
	      this.awaitPos = 0
	      while (this.type !== tt.parenR) {
	        first ? first = false : this$1.expect(tt.comma)
	        if (allowTrailingComma && this$1.afterTrailingComma(tt.parenR, true)) {
	          lastIsComma = true
	          break
	        } else if (this$1.type === tt.ellipsis) {
	          spreadStart = this$1.start
	          exprList.push(this$1.parseParenItem(this$1.parseRest()))
	          if (this$1.type === tt.comma) this$1.raise(this$1.start, "Comma is not permitted after the rest element")
	          break
	        } else {
	          if (this$1.type === tt.parenL && !innerParenStart) {
	            innerParenStart = this$1.start
	          }
	          exprList.push(this$1.parseMaybeAssign(false, refDestructuringErrors, this$1.parseParenItem))
	        }
	      }
	      var innerEndPos = this.start, innerEndLoc = this.startLoc
	      this.expect(tt.parenR)
	
	      if (canBeArrow && !this.canInsertSemicolon() && this.eat(tt.arrow)) {
	        this.checkPatternErrors(refDestructuringErrors, true)
	        this.checkYieldAwaitInDefaultParams()
	        if (innerParenStart) this.unexpected(innerParenStart)
	        this.yieldPos = oldYieldPos
	        this.awaitPos = oldAwaitPos
	        return this.parseParenArrowList(startPos, startLoc, exprList)
	      }
	
	      if (!exprList.length || lastIsComma) this.unexpected(this.lastTokStart)
	      if (spreadStart) this.unexpected(spreadStart)
	      this.checkExpressionErrors(refDestructuringErrors, true)
	      this.yieldPos = oldYieldPos || this.yieldPos
	      this.awaitPos = oldAwaitPos || this.awaitPos
	
	      if (exprList.length > 1) {
	        val = this.startNodeAt(innerStartPos, innerStartLoc)
	        val.expressions = exprList
	        this.finishNodeAt(val, "SequenceExpression", innerEndPos, innerEndLoc)
	      } else {
	        val = exprList[0]
	      }
	    } else {
	      val = this.parseParenExpression()
	    }
	
	    if (this.options.preserveParens) {
	      var par = this.startNodeAt(startPos, startLoc)
	      par.expression = val
	      return this.finishNode(par, "ParenthesizedExpression")
	    } else {
	      return val
	    }
	  }
	
	  pp$3.parseParenItem = function(item) {
	    return item
	  }
	
	  pp$3.parseParenArrowList = function(startPos, startLoc, exprList) {
	    return this.parseArrowExpression(this.startNodeAt(startPos, startLoc), exprList)
	  }
	
	  // New's precedence is slightly tricky. It must allow its argument to
	  // be a `[]` or dot subscript expression, but not a call — at least,
	  // not without wrapping it in parentheses. Thus, it uses the noCalls
	  // argument to parseSubscripts to prevent it from consuming the
	  // argument list.
	
	  var empty$1 = []
	
	  pp$3.parseNew = function() {
	    var node = this.startNode()
	    var meta = this.parseIdent(true)
	    if (this.options.ecmaVersion >= 6 && this.eat(tt.dot)) {
	      node.meta = meta
	      node.property = this.parseIdent(true)
	      if (node.property.name !== "target")
	        this.raiseRecoverable(node.property.start, "The only valid meta property for new is new.target")
	      if (!this.inFunction)
	        this.raiseRecoverable(node.start, "new.target can only be used in functions")
	      return this.finishNode(node, "MetaProperty")
	    }
	    var startPos = this.start, startLoc = this.startLoc
	    node.callee = this.parseSubscripts(this.parseExprAtom(), startPos, startLoc, true)
	    if (this.eat(tt.parenL)) node.arguments = this.parseExprList(tt.parenR, this.options.ecmaVersion >= 8, false)
	    else node.arguments = empty$1
	    return this.finishNode(node, "NewExpression")
	  }
	
	  // Parse template expression.
	
	  pp$3.parseTemplateElement = function() {
	    var elem = this.startNode()
	    elem.value = {
	      raw: this.input.slice(this.start, this.end).replace(/\r\n?/g, '\n'),
	      cooked: this.value
	    }
	    this.next()
	    elem.tail = this.type === tt.backQuote
	    return this.finishNode(elem, "TemplateElement")
	  }
	
	  pp$3.parseTemplate = function() {
	    var this$1 = this;
	
	    var node = this.startNode()
	    this.next()
	    node.expressions = []
	    var curElt = this.parseTemplateElement()
	    node.quasis = [curElt]
	    while (!curElt.tail) {
	      this$1.expect(tt.dollarBraceL)
	      node.expressions.push(this$1.parseExpression())
	      this$1.expect(tt.braceR)
	      node.quasis.push(curElt = this$1.parseTemplateElement())
	    }
	    this.next()
	    return this.finishNode(node, "TemplateLiteral")
	  }
	
	  // Parse an object literal or binding pattern.
	
	  pp$3.parseObj = function(isPattern, refDestructuringErrors) {
	    var this$1 = this;
	
	    var node = this.startNode(), first = true, propHash = {}
	    node.properties = []
	    this.next()
	    while (!this.eat(tt.braceR)) {
	      if (!first) {
	        this$1.expect(tt.comma)
	        if (this$1.afterTrailingComma(tt.braceR)) break
	      } else first = false
	
	      var prop = this$1.startNode(), isGenerator, isAsync, startPos, startLoc
	      if (this$1.options.ecmaVersion >= 6) {
	        prop.method = false
	        prop.shorthand = false
	        if (isPattern || refDestructuringErrors) {
	          startPos = this$1.start
	          startLoc = this$1.startLoc
	        }
	        if (!isPattern)
	          isGenerator = this$1.eat(tt.star)
	      }
	      this$1.parsePropertyName(prop)
	      if (!isPattern && this$1.options.ecmaVersion >= 8 && !isGenerator && !prop.computed &&
	          prop.key.type === "Identifier" && prop.key.name === "async" && this$1.type !== tt.parenL &&
	          this$1.type !== tt.colon && !this$1.canInsertSemicolon()) {
	        isAsync = true
	        this$1.parsePropertyName(prop, refDestructuringErrors)
	      } else {
	        isAsync = false
	      }
	      this$1.parsePropertyValue(prop, isPattern, isGenerator, isAsync, startPos, startLoc, refDestructuringErrors)
	      this$1.checkPropClash(prop, propHash)
	      node.properties.push(this$1.finishNode(prop, "Property"))
	    }
	    return this.finishNode(node, isPattern ? "ObjectPattern" : "ObjectExpression")
	  }
	
	  pp$3.parsePropertyValue = function(prop, isPattern, isGenerator, isAsync, startPos, startLoc, refDestructuringErrors) {
	    if ((isGenerator || isAsync) && this.type === tt.colon)
	      this.unexpected()
	
	    if (this.eat(tt.colon)) {
	      prop.value = isPattern ? this.parseMaybeDefault(this.start, this.startLoc) : this.parseMaybeAssign(false, refDestructuringErrors)
	      prop.kind = "init"
	    } else if (this.options.ecmaVersion >= 6 && this.type === tt.parenL) {
	      if (isPattern) this.unexpected()
	      prop.kind = "init"
	      prop.method = true
	      prop.value = this.parseMethod(isGenerator, isAsync)
	    } else if (this.options.ecmaVersion >= 5 && !prop.computed && prop.key.type === "Identifier" &&
	               (prop.key.name === "get" || prop.key.name === "set") &&
	               (this.type != tt.comma && this.type != tt.braceR)) {
	      if (isGenerator || isAsync || isPattern) this.unexpected()
	      prop.kind = prop.key.name
	      this.parsePropertyName(prop)
	      prop.value = this.parseMethod(false)
	      var paramCount = prop.kind === "get" ? 0 : 1
	      if (prop.value.params.length !== paramCount) {
	        var start = prop.value.start
	        if (prop.kind === "get")
	          this.raiseRecoverable(start, "getter should have no params")
	        else
	          this.raiseRecoverable(start, "setter should have exactly one param")
	      } else {
	        if (prop.kind === "set" && prop.value.params[0].type === "RestElement")
	          this.raiseRecoverable(prop.value.params[0].start, "Setter cannot use rest params")
	      }
	    } else if (this.options.ecmaVersion >= 6 && !prop.computed && prop.key.type === "Identifier") {
	      if (this.keywords.test(prop.key.name) ||
	          (this.strict ? this.reservedWordsStrict : this.reservedWords).test(prop.key.name) ||
	          (this.inGenerator && prop.key.name == "yield") ||
	          (this.inAsync && prop.key.name == "await"))
	        this.raiseRecoverable(prop.key.start, "'" + prop.key.name + "' can not be used as shorthand property")
	      prop.kind = "init"
	      if (isPattern) {
	        prop.value = this.parseMaybeDefault(startPos, startLoc, prop.key)
	      } else if (this.type === tt.eq && refDestructuringErrors) {
	        if (!refDestructuringErrors.shorthandAssign)
	          refDestructuringErrors.shorthandAssign = this.start
	        prop.value = this.parseMaybeDefault(startPos, startLoc, prop.key)
	      } else {
	        prop.value = prop.key
	      }
	      prop.shorthand = true
	    } else this.unexpected()
	  }
	
	  pp$3.parsePropertyName = function(prop) {
	    if (this.options.ecmaVersion >= 6) {
	      if (this.eat(tt.bracketL)) {
	        prop.computed = true
	        prop.key = this.parseMaybeAssign()
	        this.expect(tt.bracketR)
	        return prop.key
	      } else {
	        prop.computed = false
	      }
	    }
	    return prop.key = this.type === tt.num || this.type === tt.string ? this.parseExprAtom() : this.parseIdent(true)
	  }
	
	  // Initialize empty function node.
	
	  pp$3.initFunction = function(node) {
	    node.id = null
	    if (this.options.ecmaVersion >= 6) {
	      node.generator = false
	      node.expression = false
	    }
	    if (this.options.ecmaVersion >= 8)
	      node.async = false
	  }
	
	  // Parse object or class method.
	
	  pp$3.parseMethod = function(isGenerator, isAsync) {
	    var node = this.startNode(), oldInGen = this.inGenerator, oldInAsync = this.inAsync, oldYieldPos = this.yieldPos, oldAwaitPos = this.awaitPos
	
	    this.initFunction(node)
	    if (this.options.ecmaVersion >= 6)
	      node.generator = isGenerator
	    if (this.options.ecmaVersion >= 8)
	      node.async = !!isAsync
	
	    this.inGenerator = node.generator
	    this.inAsync = node.async
	    this.yieldPos = 0
	    this.awaitPos = 0
	
	    this.expect(tt.parenL)
	    node.params = this.parseBindingList(tt.parenR, false, this.options.ecmaVersion >= 8)
	    this.checkYieldAwaitInDefaultParams()
	    this.parseFunctionBody(node, false)
	
	    this.inGenerator = oldInGen
	    this.inAsync = oldInAsync
	    this.yieldPos = oldYieldPos
	    this.awaitPos = oldAwaitPos
	    return this.finishNode(node, "FunctionExpression")
	  }
	
	  // Parse arrow function expression with given parameters.
	
	  pp$3.parseArrowExpression = function(node, params, isAsync) {
	    var oldInGen = this.inGenerator, oldInAsync = this.inAsync, oldYieldPos = this.yieldPos, oldAwaitPos = this.awaitPos
	
	    this.initFunction(node)
	    if (this.options.ecmaVersion >= 8)
	      node.async = !!isAsync
	
	    this.inGenerator = false
	    this.inAsync = node.async
	    this.yieldPos = 0
	    this.awaitPos = 0
	
	    node.params = this.toAssignableList(params, true)
	    this.parseFunctionBody(node, true)
	
	    this.inGenerator = oldInGen
	    this.inAsync = oldInAsync
	    this.yieldPos = oldYieldPos
	    this.awaitPos = oldAwaitPos
	    return this.finishNode(node, "ArrowFunctionExpression")
	  }
	
	  // Parse function body and check parameters.
	
	  pp$3.parseFunctionBody = function(node, isArrowFunction) {
	    var isExpression = isArrowFunction && this.type !== tt.braceL
	
	    if (isExpression) {
	      node.body = this.parseMaybeAssign()
	      node.expression = true
	    } else {
	      // Start a new scope with regard to labels and the `inFunction`
	      // flag (restore them to their old value afterwards).
	      var oldInFunc = this.inFunction, oldLabels = this.labels
	      this.inFunction = true; this.labels = []
	      node.body = this.parseBlock(true)
	      node.expression = false
	      this.inFunction = oldInFunc; this.labels = oldLabels
	    }
	
	    // If this is a strict mode function, verify that argument names
	    // are not repeated, and it does not try to bind the words `eval`
	    // or `arguments`.
	    var useStrict = (!isExpression && node.body.body.length && this.isUseStrict(node.body.body[0])) ? node.body.body[0] : null
	    if (useStrict && this.options.ecmaVersion >= 7 && !this.isSimpleParamList(node.params))
	      this.raiseRecoverable(useStrict.start, "Illegal 'use strict' directive in function with non-simple parameter list")
	
	    if (this.strict || useStrict) {
	      var oldStrict = this.strict
	      this.strict = true
	      if (node.id)
	        this.checkLVal(node.id, true)
	      this.checkParams(node)
	      this.strict = oldStrict
	    } else if (isArrowFunction || !this.isSimpleParamList(node.params)) {
	      this.checkParams(node)
	    }
	  }
	
	  pp$3.isSimpleParamList = function(params) {
	    for (var i = 0; i < params.length; i++)
	      if (params[i].type !== "Identifier") return false
	    return true
	  }
	
	  // Checks function params for various disallowed patterns such as using "eval"
	  // or "arguments" and duplicate parameters.
	
	  pp$3.checkParams = function(node) {
	    var this$1 = this;
	
	    var nameHash = {}
	    for (var i = 0; i < node.params.length; i++) this$1.checkLVal(node.params[i], true, nameHash)
	  }
	
	  // Parses a comma-separated list of expressions, and returns them as
	  // an array. `close` is the token type that ends the list, and
	  // `allowEmpty` can be turned on to allow subsequent commas with
	  // nothing in between them to be parsed as `null` (which is needed
	  // for array literals).
	
	  pp$3.parseExprList = function(close, allowTrailingComma, allowEmpty, refDestructuringErrors) {
	    var this$1 = this;
	
	    var elts = [], first = true
	    while (!this.eat(close)) {
	      if (!first) {
	        this$1.expect(tt.comma)
	        if (allowTrailingComma && this$1.afterTrailingComma(close)) break
	      } else first = false
	
	      var elt
	      if (allowEmpty && this$1.type === tt.comma)
	        elt = null
	      else if (this$1.type === tt.ellipsis) {
	        elt = this$1.parseSpread(refDestructuringErrors)
	        if (this$1.type === tt.comma && refDestructuringErrors && !refDestructuringErrors.trailingComma) {
	          refDestructuringErrors.trailingComma = this$1.start
	        }
	      } else
	        elt = this$1.parseMaybeAssign(false, refDestructuringErrors)
	      elts.push(elt)
	    }
	    return elts
	  }
	
	  // Parse the next token as an identifier. If `liberal` is true (used
	  // when parsing properties), it will also convert keywords into
	  // identifiers.
	
	  pp$3.parseIdent = function(liberal) {
	    var node = this.startNode()
	    if (liberal && this.options.allowReserved == "never") liberal = false
	    if (this.type === tt.name) {
	      if (!liberal && (this.strict ? this.reservedWordsStrict : this.reservedWords).test(this.value) &&
	          (this.options.ecmaVersion >= 6 ||
	           this.input.slice(this.start, this.end).indexOf("\\") == -1))
	        this.raiseRecoverable(this.start, "The keyword '" + this.value + "' is reserved")
	      if (this.inGenerator && this.value === "yield")
	        this.raiseRecoverable(this.start, "Can not use 'yield' as identifier inside a generator")
	      if (this.inAsync && this.value === "await")
	        this.raiseRecoverable(this.start, "Can not use 'await' as identifier inside an async function")
	      node.name = this.value
	    } else if (liberal && this.type.keyword) {
	      node.name = this.type.keyword
	    } else {
	      this.unexpected()
	    }
	    this.next()
	    return this.finishNode(node, "Identifier")
	  }
	
	  // Parses yield expression inside generator.
	
	  pp$3.parseYield = function() {
	    if (!this.yieldPos) this.yieldPos = this.start
	
	    var node = this.startNode()
	    this.next()
	    if (this.type == tt.semi || this.canInsertSemicolon() || (this.type != tt.star && !this.type.startsExpr)) {
	      node.delegate = false
	      node.argument = null
	    } else {
	      node.delegate = this.eat(tt.star)
	      node.argument = this.parseMaybeAssign()
	    }
	    return this.finishNode(node, "YieldExpression")
	  }
	
	  pp$3.parseAwait = function() {
	    if (!this.awaitPos) this.awaitPos = this.start
	
	    var node = this.startNode()
	    this.next()
	    node.argument = this.parseMaybeUnary(null, true)
	    return this.finishNode(node, "AwaitExpression")
	  }
	
	  var pp$4 = Parser.prototype
	
	  // This function is used to raise exceptions on parse errors. It
	  // takes an offset integer (into the current `input`) to indicate
	  // the location of the error, attaches the position to the end
	  // of the error message, and then raises a `SyntaxError` with that
	  // message.
	
	  pp$4.raise = function(pos, message) {
	    var loc = getLineInfo(this.input, pos)
	    message += " (" + loc.line + ":" + loc.column + ")"
	    var err = new SyntaxError(message)
	    err.pos = pos; err.loc = loc; err.raisedAt = this.pos
	    throw err
	  }
	
	  pp$4.raiseRecoverable = pp$4.raise
	
	  pp$4.curPosition = function() {
	    if (this.options.locations) {
	      return new Position(this.curLine, this.pos - this.lineStart)
	    }
	  }
	
	  var Node = function Node(parser, pos, loc) {
	    this.type = ""
	    this.start = pos
	    this.end = 0
	    if (parser.options.locations)
	      this.loc = new SourceLocation(parser, loc)
	    if (parser.options.directSourceFile)
	      this.sourceFile = parser.options.directSourceFile
	    if (parser.options.ranges)
	      this.range = [pos, 0]
	  };
	
	  // Start an AST node, attaching a start offset.
	
	  var pp$5 = Parser.prototype
	
	  pp$5.startNode = function() {
	    return new Node(this, this.start, this.startLoc)
	  }
	
	  pp$5.startNodeAt = function(pos, loc) {
	    return new Node(this, pos, loc)
	  }
	
	  // Finish an AST node, adding `type` and `end` properties.
	
	  function finishNodeAt(node, type, pos, loc) {
	    node.type = type
	    node.end = pos
	    if (this.options.locations)
	      node.loc.end = loc
	    if (this.options.ranges)
	      node.range[1] = pos
	    return node
	  }
	
	  pp$5.finishNode = function(node, type) {
	    return finishNodeAt.call(this, node, type, this.lastTokEnd, this.lastTokEndLoc)
	  }
	
	  // Finish node at given position
	
	  pp$5.finishNodeAt = function(node, type, pos, loc) {
	    return finishNodeAt.call(this, node, type, pos, loc)
	  }
	
	  var TokContext = function TokContext(token, isExpr, preserveSpace, override) {
	    this.token = token
	    this.isExpr = !!isExpr
	    this.preserveSpace = !!preserveSpace
	    this.override = override
	  };
	
	  var types = {
	    b_stat: new TokContext("{", false),
	    b_expr: new TokContext("{", true),
	    b_tmpl: new TokContext("${", true),
	    p_stat: new TokContext("(", false),
	    p_expr: new TokContext("(", true),
	    q_tmpl: new TokContext("`", true, true, function (p) { return p.readTmplToken(); }),
	    f_expr: new TokContext("function", true)
	  }
	
	  var pp$6 = Parser.prototype
	
	  pp$6.initialContext = function() {
	    return [types.b_stat]
	  }
	
	  pp$6.braceIsBlock = function(prevType) {
	    if (prevType === tt.colon) {
	      var parent = this.curContext()
	      if (parent === types.b_stat || parent === types.b_expr)
	        return !parent.isExpr
	    }
	    if (prevType === tt._return)
	      return lineBreak.test(this.input.slice(this.lastTokEnd, this.start))
	    if (prevType === tt._else || prevType === tt.semi || prevType === tt.eof || prevType === tt.parenR)
	      return true
	    if (prevType == tt.braceL)
	      return this.curContext() === types.b_stat
	    return !this.exprAllowed
	  }
	
	  pp$6.updateContext = function(prevType) {
	    var update, type = this.type
	    if (type.keyword && prevType == tt.dot)
	      this.exprAllowed = false
	    else if (update = type.updateContext)
	      update.call(this, prevType)
	    else
	      this.exprAllowed = type.beforeExpr
	  }
	
	  // Token-specific context update code
	
	  tt.parenR.updateContext = tt.braceR.updateContext = function() {
	    if (this.context.length == 1) {
	      this.exprAllowed = true
	      return
	    }
	    var out = this.context.pop()
	    if (out === types.b_stat && this.curContext() === types.f_expr) {
	      this.context.pop()
	      this.exprAllowed = false
	    } else if (out === types.b_tmpl) {
	      this.exprAllowed = true
	    } else {
	      this.exprAllowed = !out.isExpr
	    }
	  }
	
	  tt.braceL.updateContext = function(prevType) {
	    this.context.push(this.braceIsBlock(prevType) ? types.b_stat : types.b_expr)
	    this.exprAllowed = true
	  }
	
	  tt.dollarBraceL.updateContext = function() {
	    this.context.push(types.b_tmpl)
	    this.exprAllowed = true
	  }
	
	  tt.parenL.updateContext = function(prevType) {
	    var statementParens = prevType === tt._if || prevType === tt._for || prevType === tt._with || prevType === tt._while
	    this.context.push(statementParens ? types.p_stat : types.p_expr)
	    this.exprAllowed = true
	  }
	
	  tt.incDec.updateContext = function() {
	    // tokExprAllowed stays unchanged
	  }
	
	  tt._function.updateContext = function(prevType) {
	    if (prevType.beforeExpr && prevType !== tt.semi && prevType !== tt._else &&
	        !((prevType === tt.colon || prevType === tt.braceL) && this.curContext() === types.b_stat))
	      this.context.push(types.f_expr)
	    this.exprAllowed = false
	  }
	
	  tt.backQuote.updateContext = function() {
	    if (this.curContext() === types.q_tmpl)
	      this.context.pop()
	    else
	      this.context.push(types.q_tmpl)
	    this.exprAllowed = false
	  }
	
	  // Object type used to represent tokens. Note that normally, tokens
	  // simply exist as properties on the parser object. This is only
	  // used for the onToken callback and the external tokenizer.
	
	  var Token = function Token(p) {
	    this.type = p.type
	    this.value = p.value
	    this.start = p.start
	    this.end = p.end
	    if (p.options.locations)
	      this.loc = new SourceLocation(p, p.startLoc, p.endLoc)
	    if (p.options.ranges)
	      this.range = [p.start, p.end]
	  };
	
	  // ## Tokenizer
	
	  var pp$7 = Parser.prototype
	
	  // Are we running under Rhino?
	  var isRhino = typeof Packages == "object" && Object.prototype.toString.call(Packages) == "[object JavaPackage]"
	
	  // Move to the next token
	
	  pp$7.next = function() {
	    if (this.options.onToken)
	      this.options.onToken(new Token(this))
	
	    this.lastTokEnd = this.end
	    this.lastTokStart = this.start
	    this.lastTokEndLoc = this.endLoc
	    this.lastTokStartLoc = this.startLoc
	    this.nextToken()
	  }
	
	  pp$7.getToken = function() {
	    this.next()
	    return new Token(this)
	  }
	
	  // If we're in an ES6 environment, make parsers iterable
	  if (typeof Symbol !== "undefined")
	    pp$7[Symbol.iterator] = function () {
	      var self = this
	      return {next: function () {
	        var token = self.getToken()
	        return {
	          done: token.type === tt.eof,
	          value: token
	        }
	      }}
	    }
	
	  // Toggle strict mode. Re-reads the next number or string to please
	  // pedantic tests (`"use strict"; 010;` should fail).
	
	  pp$7.setStrict = function(strict) {
	    var this$1 = this;
	
	    this.strict = strict
	    if (this.type !== tt.num && this.type !== tt.string) return
	    this.pos = this.start
	    if (this.options.locations) {
	      while (this.pos < this.lineStart) {
	        this$1.lineStart = this$1.input.lastIndexOf("\n", this$1.lineStart - 2) + 1
	        --this$1.curLine
	      }
	    }
	    this.nextToken()
	  }
	
	  pp$7.curContext = function() {
	    return this.context[this.context.length - 1]
	  }
	
	  // Read a single token, updating the parser object's token-related
	  // properties.
	
	  pp$7.nextToken = function() {
	    var curContext = this.curContext()
	    if (!curContext || !curContext.preserveSpace) this.skipSpace()
	
	    this.start = this.pos
	    if (this.options.locations) this.startLoc = this.curPosition()
	    if (this.pos >= this.input.length) return this.finishToken(tt.eof)
	
	    if (curContext.override) return curContext.override(this)
	    else this.readToken(this.fullCharCodeAtPos())
	  }
	
	  pp$7.readToken = function(code) {
	    // Identifier or keyword. '\uXXXX' sequences are allowed in
	    // identifiers, so '\' also dispatches to that.
	    if (isIdentifierStart(code, this.options.ecmaVersion >= 6) || code === 92 /* '\' */)
	      return this.readWord()
	
	    return this.getTokenFromCode(code)
	  }
	
	  pp$7.fullCharCodeAtPos = function() {
	    var code = this.input.charCodeAt(this.pos)
	    if (code <= 0xd7ff || code >= 0xe000) return code
	    var next = this.input.charCodeAt(this.pos + 1)
	    return (code << 10) + next - 0x35fdc00
	  }
	
	  pp$7.skipBlockComment = function() {
	    var this$1 = this;
	
	    var startLoc = this.options.onComment && this.curPosition()
	    var start = this.pos, end = this.input.indexOf("*/", this.pos += 2)
	    if (end === -1) this.raise(this.pos - 2, "Unterminated comment")
	    this.pos = end + 2
	    if (this.options.locations) {
	      lineBreakG.lastIndex = start
	      var match
	      while ((match = lineBreakG.exec(this.input)) && match.index < this.pos) {
	        ++this$1.curLine
	        this$1.lineStart = match.index + match[0].length
	      }
	    }
	    if (this.options.onComment)
	      this.options.onComment(true, this.input.slice(start + 2, end), start, this.pos,
	                             startLoc, this.curPosition())
	  }
	
	  pp$7.skipLineComment = function(startSkip) {
	    var this$1 = this;
	
	    var start = this.pos
	    var startLoc = this.options.onComment && this.curPosition()
	    var ch = this.input.charCodeAt(this.pos+=startSkip)
	    while (this.pos < this.input.length && ch !== 10 && ch !== 13 && ch !== 8232 && ch !== 8233) {
	      ++this$1.pos
	      ch = this$1.input.charCodeAt(this$1.pos)
	    }
	    if (this.options.onComment)
	      this.options.onComment(false, this.input.slice(start + startSkip, this.pos), start, this.pos,
	                             startLoc, this.curPosition())
	  }
	
	  // Called at the start of the parse and after every token. Skips
	  // whitespace and comments, and.
	
	  pp$7.skipSpace = function() {
	    var this$1 = this;
	
	    loop: while (this.pos < this.input.length) {
	      var ch = this$1.input.charCodeAt(this$1.pos)
	      switch (ch) {
	        case 32: case 160: // ' '
	          ++this$1.pos
	          break
	        case 13:
	          if (this$1.input.charCodeAt(this$1.pos + 1) === 10) {
	            ++this$1.pos
	          }
	        case 10: case 8232: case 8233:
	          ++this$1.pos
	          if (this$1.options.locations) {
	            ++this$1.curLine
	            this$1.lineStart = this$1.pos
	          }
	          break
	        case 47: // '/'
	          switch (this$1.input.charCodeAt(this$1.pos + 1)) {
	            case 42: // '*'
	              this$1.skipBlockComment()
	              break
	            case 47:
	              this$1.skipLineComment(2)
	              break
	            default:
	              break loop
	          }
	          break
	        default:
	          if (ch > 8 && ch < 14 || ch >= 5760 && nonASCIIwhitespace.test(String.fromCharCode(ch))) {
	            ++this$1.pos
	          } else {
	            break loop
	          }
	      }
	    }
	  }
	
	  // Called at the end of every token. Sets `end`, `val`, and
	  // maintains `context` and `exprAllowed`, and skips the space after
	  // the token, so that the next one's `start` will point at the
	  // right position.
	
	  pp$7.finishToken = function(type, val) {
	    this.end = this.pos
	    if (this.options.locations) this.endLoc = this.curPosition()
	    var prevType = this.type
	    this.type = type
	    this.value = val
	
	    this.updateContext(prevType)
	  }
	
	  // ### Token reading
	
	  // This is the function that is called to fetch the next token. It
	  // is somewhat obscure, because it works in character codes rather
	  // than characters, and because operator parsing has been inlined
	  // into it.
	  //
	  // All in the name of speed.
	  //
	  pp$7.readToken_dot = function() {
	    var next = this.input.charCodeAt(this.pos + 1)
	    if (next >= 48 && next <= 57) return this.readNumber(true)
	    var next2 = this.input.charCodeAt(this.pos + 2)
	    if (this.options.ecmaVersion >= 6 && next === 46 && next2 === 46) { // 46 = dot '.'
	      this.pos += 3
	      return this.finishToken(tt.ellipsis)
	    } else {
	      ++this.pos
	      return this.finishToken(tt.dot)
	    }
	  }
	
	  pp$7.readToken_slash = function() { // '/'
	    var next = this.input.charCodeAt(this.pos + 1)
	    if (this.exprAllowed) {++this.pos; return this.readRegexp()}
	    if (next === 61) return this.finishOp(tt.assign, 2)
	    return this.finishOp(tt.slash, 1)
	  }
	
	  pp$7.readToken_mult_modulo_exp = function(code) { // '%*'
	    var next = this.input.charCodeAt(this.pos + 1)
	    var size = 1
	    var tokentype = code === 42 ? tt.star : tt.modulo
	
	    // exponentiation operator ** and **=
	    if (this.options.ecmaVersion >= 7 && next === 42) {
	      ++size
	      tokentype = tt.starstar
	      next = this.input.charCodeAt(this.pos + 2)
	    }
	
	    if (next === 61) return this.finishOp(tt.assign, size + 1)
	    return this.finishOp(tokentype, size)
	  }
	
	  pp$7.readToken_pipe_amp = function(code) { // '|&'
	    var next = this.input.charCodeAt(this.pos + 1)
	    if (next === code) return this.finishOp(code === 124 ? tt.logicalOR : tt.logicalAND, 2)
	    if (next === 61) return this.finishOp(tt.assign, 2)
	    return this.finishOp(code === 124 ? tt.bitwiseOR : tt.bitwiseAND, 1)
	  }
	
	  pp$7.readToken_caret = function() { // '^'
	    var next = this.input.charCodeAt(this.pos + 1)
	    if (next === 61) return this.finishOp(tt.assign, 2)
	    return this.finishOp(tt.bitwiseXOR, 1)
	  }
	
	  pp$7.readToken_plus_min = function(code) { // '+-'
	    var next = this.input.charCodeAt(this.pos + 1)
	    if (next === code) {
	      if (next == 45 && this.input.charCodeAt(this.pos + 2) == 62 &&
	          lineBreak.test(this.input.slice(this.lastTokEnd, this.pos))) {
	        // A `-->` line comment
	        this.skipLineComment(3)
	        this.skipSpace()
	        return this.nextToken()
	      }
	      return this.finishOp(tt.incDec, 2)
	    }
	    if (next === 61) return this.finishOp(tt.assign, 2)
	    return this.finishOp(tt.plusMin, 1)
	  }
	
	  pp$7.readToken_lt_gt = function(code) { // '<>'
	    var next = this.input.charCodeAt(this.pos + 1)
	    var size = 1
	    if (next === code) {
	      size = code === 62 && this.input.charCodeAt(this.pos + 2) === 62 ? 3 : 2
	      if (this.input.charCodeAt(this.pos + size) === 61) return this.finishOp(tt.assign, size + 1)
	      return this.finishOp(tt.bitShift, size)
	    }
	    if (next == 33 && code == 60 && this.input.charCodeAt(this.pos + 2) == 45 &&
	        this.input.charCodeAt(this.pos + 3) == 45) {
	      if (this.inModule) this.unexpected()
	      // `<!--`, an XML-style comment that should be interpreted as a line comment
	      this.skipLineComment(4)
	      this.skipSpace()
	      return this.nextToken()
	    }
	    if (next === 61) size = 2
	    return this.finishOp(tt.relational, size)
	  }
	
	  pp$7.readToken_eq_excl = function(code) { // '=!'
	    var next = this.input.charCodeAt(this.pos + 1)
	    if (next === 61) return this.finishOp(tt.equality, this.input.charCodeAt(this.pos + 2) === 61 ? 3 : 2)
	    if (code === 61 && next === 62 && this.options.ecmaVersion >= 6) { // '=>'
	      this.pos += 2
	      return this.finishToken(tt.arrow)
	    }
	    return this.finishOp(code === 61 ? tt.eq : tt.prefix, 1)
	  }
	
	  pp$7.getTokenFromCode = function(code) {
	    switch (code) {
	      // The interpretation of a dot depends on whether it is followed
	      // by a digit or another two dots.
	    case 46: // '.'
	      return this.readToken_dot()
	
	      // Punctuation tokens.
	    case 40: ++this.pos; return this.finishToken(tt.parenL)
	    case 41: ++this.pos; return this.finishToken(tt.parenR)
	    case 59: ++this.pos; return this.finishToken(tt.semi)
	    case 44: ++this.pos; return this.finishToken(tt.comma)
	    case 91: ++this.pos; return this.finishToken(tt.bracketL)
	    case 93: ++this.pos; return this.finishToken(tt.bracketR)
	    case 123: ++this.pos; return this.finishToken(tt.braceL)
	    case 125: ++this.pos; return this.finishToken(tt.braceR)
	    case 58: ++this.pos; return this.finishToken(tt.colon)
	    case 63: ++this.pos; return this.finishToken(tt.question)
	
	    case 96: // '`'
	      if (this.options.ecmaVersion < 6) break
	      ++this.pos
	      return this.finishToken(tt.backQuote)
	
	    case 48: // '0'
	      var next = this.input.charCodeAt(this.pos + 1)
	      if (next === 120 || next === 88) return this.readRadixNumber(16) // '0x', '0X' - hex number
	      if (this.options.ecmaVersion >= 6) {
	        if (next === 111 || next === 79) return this.readRadixNumber(8) // '0o', '0O' - octal number
	        if (next === 98 || next === 66) return this.readRadixNumber(2) // '0b', '0B' - binary number
	      }
	      // Anything else beginning with a digit is an integer, octal
	      // number, or float.
	    case 49: case 50: case 51: case 52: case 53: case 54: case 55: case 56: case 57: // 1-9
	      return this.readNumber(false)
	
	      // Quotes produce strings.
	    case 34: case 39: // '"', "'"
	      return this.readString(code)
	
	      // Operators are parsed inline in tiny state machines. '=' (61) is
	      // often referred to. `finishOp` simply skips the amount of
	      // characters it is given as second argument, and returns a token
	      // of the type given by its first argument.
	
	    case 47: // '/'
	      return this.readToken_slash()
	
	    case 37: case 42: // '%*'
	      return this.readToken_mult_modulo_exp(code)
	
	    case 124: case 38: // '|&'
	      return this.readToken_pipe_amp(code)
	
	    case 94: // '^'
	      return this.readToken_caret()
	
	    case 43: case 45: // '+-'
	      return this.readToken_plus_min(code)
	
	    case 60: case 62: // '<>'
	      return this.readToken_lt_gt(code)
	
	    case 61: case 33: // '=!'
	      return this.readToken_eq_excl(code)
	
	    case 126: // '~'
	      return this.finishOp(tt.prefix, 1)
	    }
	
	    this.raise(this.pos, "Unexpected character '" + codePointToString(code) + "'")
	  }
	
	  pp$7.finishOp = function(type, size) {
	    var str = this.input.slice(this.pos, this.pos + size)
	    this.pos += size
	    return this.finishToken(type, str)
	  }
	
	  // Parse a regular expression. Some context-awareness is necessary,
	  // since a '/' inside a '[]' set does not end the expression.
	
	  function tryCreateRegexp(src, flags, throwErrorAt, parser) {
	    try {
	      return new RegExp(src, flags)
	    } catch (e) {
	      if (throwErrorAt !== undefined) {
	        if (e instanceof SyntaxError) parser.raise(throwErrorAt, "Error parsing regular expression: " + e.message)
	        throw e
	      }
	    }
	  }
	
	  var regexpUnicodeSupport = !!tryCreateRegexp("\uffff", "u")
	
	  pp$7.readRegexp = function() {
	    var this$1 = this;
	
	    var escaped, inClass, start = this.pos
	    for (;;) {
	      if (this$1.pos >= this$1.input.length) this$1.raise(start, "Unterminated regular expression")
	      var ch = this$1.input.charAt(this$1.pos)
	      if (lineBreak.test(ch)) this$1.raise(start, "Unterminated regular expression")
	      if (!escaped) {
	        if (ch === "[") inClass = true
	        else if (ch === "]" && inClass) inClass = false
	        else if (ch === "/" && !inClass) break
	        escaped = ch === "\\"
	      } else escaped = false
	      ++this$1.pos
	    }
	    var content = this.input.slice(start, this.pos)
	    ++this.pos
	    // Need to use `readWord1` because '\uXXXX' sequences are allowed
	    // here (don't ask).
	    var mods = this.readWord1()
	    var tmp = content, tmpFlags = ""
	    if (mods) {
	      var validFlags = /^[gim]*$/
	      if (this.options.ecmaVersion >= 6) validFlags = /^[gimuy]*$/
	      if (!validFlags.test(mods)) this.raise(start, "Invalid regular expression flag")
	      if (mods.indexOf("u") >= 0) {
	        if (regexpUnicodeSupport) {
	          tmpFlags = "u"
	        } else {
	          // Replace each astral symbol and every Unicode escape sequence that
	          // possibly represents an astral symbol or a paired surrogate with a
	          // single ASCII symbol to avoid throwing on regular expressions that
	          // are only valid in combination with the `/u` flag.
	          // Note: replacing with the ASCII symbol `x` might cause false
	          // negatives in unlikely scenarios. For example, `[\u{61}-b]` is a
	          // perfectly valid pattern that is equivalent to `[a-b]`, but it would
	          // be replaced by `[x-b]` which throws an error.
	          tmp = tmp.replace(/\\u\{([0-9a-fA-F]+)\}/g, function (_match, code, offset) {
	            code = Number("0x" + code)
	            if (code > 0x10FFFF) this$1.raise(start + offset + 3, "Code point out of bounds")
	            return "x"
	          })
	          tmp = tmp.replace(/\\u([a-fA-F0-9]{4})|[\uD800-\uDBFF][\uDC00-\uDFFF]/g, "x")
	          tmpFlags = tmpFlags.replace("u", "")
	        }
	      }
	    }
	    // Detect invalid regular expressions.
	    var value = null
	    // Rhino's regular expression parser is flaky and throws uncatchable exceptions,
	    // so don't do detection if we are running under Rhino
	    if (!isRhino) {
	      tryCreateRegexp(tmp, tmpFlags, start, this)
	      // Get a regular expression object for this pattern-flag pair, or `null` in
	      // case the current environment doesn't support the flags it uses.
	      value = tryCreateRegexp(content, mods)
	    }
	    return this.finishToken(tt.regexp, {pattern: content, flags: mods, value: value})
	  }
	
	  // Read an integer in the given radix. Return null if zero digits
	  // were read, the integer value otherwise. When `len` is given, this
	  // will return `null` unless the integer has exactly `len` digits.
	
	  pp$7.readInt = function(radix, len) {
	    var this$1 = this;
	
	    var start = this.pos, total = 0
	    for (var i = 0, e = len == null ? Infinity : len; i < e; ++i) {
	      var code = this$1.input.charCodeAt(this$1.pos), val
	      if (code >= 97) val = code - 97 + 10 // a
	      else if (code >= 65) val = code - 65 + 10 // A
	      else if (code >= 48 && code <= 57) val = code - 48 // 0-9
	      else val = Infinity
	      if (val >= radix) break
	      ++this$1.pos
	      total = total * radix + val
	    }
	    if (this.pos === start || len != null && this.pos - start !== len) return null
	
	    return total
	  }
	
	  pp$7.readRadixNumber = function(radix) {
	    this.pos += 2 // 0x
	    var val = this.readInt(radix)
	    if (val == null) this.raise(this.start + 2, "Expected number in radix " + radix)
	    if (isIdentifierStart(this.fullCharCodeAtPos())) this.raise(this.pos, "Identifier directly after number")
	    return this.finishToken(tt.num, val)
	  }
	
	  // Read an integer, octal integer, or floating-point number.
	
	  pp$7.readNumber = function(startsWithDot) {
	    var start = this.pos, isFloat = false, octal = this.input.charCodeAt(this.pos) === 48
	    if (!startsWithDot && this.readInt(10) === null) this.raise(start, "Invalid number")
	    if (octal && this.pos == start + 1) octal = false
	    var next = this.input.charCodeAt(this.pos)
	    if (next === 46 && !octal) { // '.'
	      ++this.pos
	      this.readInt(10)
	      isFloat = true
	      next = this.input.charCodeAt(this.pos)
	    }
	    if ((next === 69 || next === 101) && !octal) { // 'eE'
	      next = this.input.charCodeAt(++this.pos)
	      if (next === 43 || next === 45) ++this.pos // '+-'
	      if (this.readInt(10) === null) this.raise(start, "Invalid number")
	      isFloat = true
	    }
	    if (isIdentifierStart(this.fullCharCodeAtPos())) this.raise(this.pos, "Identifier directly after number")
	
	    var str = this.input.slice(start, this.pos), val
	    if (isFloat) val = parseFloat(str)
	    else if (!octal || str.length === 1) val = parseInt(str, 10)
	    else if (/[89]/.test(str) || this.strict) this.raise(start, "Invalid number")
	    else val = parseInt(str, 8)
	    return this.finishToken(tt.num, val)
	  }
	
	  // Read a string value, interpreting backslash-escapes.
	
	  pp$7.readCodePoint = function() {
	    var ch = this.input.charCodeAt(this.pos), code
	
	    if (ch === 123) {
	      if (this.options.ecmaVersion < 6) this.unexpected()
	      var codePos = ++this.pos
	      code = this.readHexChar(this.input.indexOf('}', this.pos) - this.pos)
	      ++this.pos
	      if (code > 0x10FFFF) this.raise(codePos, "Code point out of bounds")
	    } else {
	      code = this.readHexChar(4)
	    }
	    return code
	  }
	
	  function codePointToString(code) {
	    // UTF-16 Decoding
	    if (code <= 0xFFFF) return String.fromCharCode(code)
	    code -= 0x10000
	    return String.fromCharCode((code >> 10) + 0xD800, (code & 1023) + 0xDC00)
	  }
	
	  pp$7.readString = function(quote) {
	    var this$1 = this;
	
	    var out = "", chunkStart = ++this.pos
	    for (;;) {
	      if (this$1.pos >= this$1.input.length) this$1.raise(this$1.start, "Unterminated string constant")
	      var ch = this$1.input.charCodeAt(this$1.pos)
	      if (ch === quote) break
	      if (ch === 92) { // '\'
	        out += this$1.input.slice(chunkStart, this$1.pos)
	        out += this$1.readEscapedChar(false)
	        chunkStart = this$1.pos
	      } else {
	        if (isNewLine(ch)) this$1.raise(this$1.start, "Unterminated string constant")
	        ++this$1.pos
	      }
	    }
	    out += this.input.slice(chunkStart, this.pos++)
	    return this.finishToken(tt.string, out)
	  }
	
	  // Reads template string tokens.
	
	  pp$7.readTmplToken = function() {
	    var this$1 = this;
	
	    var out = "", chunkStart = this.pos
	    for (;;) {
	      if (this$1.pos >= this$1.input.length) this$1.raise(this$1.start, "Unterminated template")
	      var ch = this$1.input.charCodeAt(this$1.pos)
	      if (ch === 96 || ch === 36 && this$1.input.charCodeAt(this$1.pos + 1) === 123) { // '`', '${'
	        if (this$1.pos === this$1.start && this$1.type === tt.template) {
	          if (ch === 36) {
	            this$1.pos += 2
	            return this$1.finishToken(tt.dollarBraceL)
	          } else {
	            ++this$1.pos
	            return this$1.finishToken(tt.backQuote)
	          }
	        }
	        out += this$1.input.slice(chunkStart, this$1.pos)
	        return this$1.finishToken(tt.template, out)
	      }
	      if (ch === 92) { // '\'
	        out += this$1.input.slice(chunkStart, this$1.pos)
	        out += this$1.readEscapedChar(true)
	        chunkStart = this$1.pos
	      } else if (isNewLine(ch)) {
	        out += this$1.input.slice(chunkStart, this$1.pos)
	        ++this$1.pos
	        switch (ch) {
	          case 13:
	            if (this$1.input.charCodeAt(this$1.pos) === 10) ++this$1.pos
	          case 10:
	            out += "\n"
	            break
	          default:
	            out += String.fromCharCode(ch)
	            break
	        }
	        if (this$1.options.locations) {
	          ++this$1.curLine
	          this$1.lineStart = this$1.pos
	        }
	        chunkStart = this$1.pos
	      } else {
	        ++this$1.pos
	      }
	    }
	  }
	
	  // Used to read escaped characters
	
	  pp$7.readEscapedChar = function(inTemplate) {
	    var ch = this.input.charCodeAt(++this.pos)
	    ++this.pos
	    switch (ch) {
	    case 110: return "\n" // 'n' -> '\n'
	    case 114: return "\r" // 'r' -> '\r'
	    case 120: return String.fromCharCode(this.readHexChar(2)) // 'x'
	    case 117: return codePointToString(this.readCodePoint()) // 'u'
	    case 116: return "\t" // 't' -> '\t'
	    case 98: return "\b" // 'b' -> '\b'
	    case 118: return "\u000b" // 'v' -> '\u000b'
	    case 102: return "\f" // 'f' -> '\f'
	    case 13: if (this.input.charCodeAt(this.pos) === 10) ++this.pos // '\r\n'
	    case 10: // ' \n'
	      if (this.options.locations) { this.lineStart = this.pos; ++this.curLine }
	      return ""
	    default:
	      if (ch >= 48 && ch <= 55) {
	        var octalStr = this.input.substr(this.pos - 1, 3).match(/^[0-7]+/)[0]
	        var octal = parseInt(octalStr, 8)
	        if (octal > 255) {
	          octalStr = octalStr.slice(0, -1)
	          octal = parseInt(octalStr, 8)
	        }
	        if (octalStr !== "0" && (this.strict || inTemplate)) {
	          this.raise(this.pos - 2, "Octal literal in strict mode")
	        }
	        this.pos += octalStr.length - 1
	        return String.fromCharCode(octal)
	      }
	      return String.fromCharCode(ch)
	    }
	  }
	
	  // Used to read character escape sequences ('\x', '\u', '\U').
	
	  pp$7.readHexChar = function(len) {
	    var codePos = this.pos
	    var n = this.readInt(16, len)
	    if (n === null) this.raise(codePos, "Bad character escape sequence")
	    return n
	  }
	
	  // Read an identifier, and return it as a string. Sets `this.containsEsc`
	  // to whether the word contained a '\u' escape.
	  //
	  // Incrementally adds only escaped chars, adding other chunks as-is
	  // as a micro-optimization.
	
	  pp$7.readWord1 = function() {
	    var this$1 = this;
	
	    this.containsEsc = false
	    var word = "", first = true, chunkStart = this.pos
	    var astral = this.options.ecmaVersion >= 6
	    while (this.pos < this.input.length) {
	      var ch = this$1.fullCharCodeAtPos()
	      if (isIdentifierChar(ch, astral)) {
	        this$1.pos += ch <= 0xffff ? 1 : 2
	      } else if (ch === 92) { // "\"
	        this$1.containsEsc = true
	        word += this$1.input.slice(chunkStart, this$1.pos)
	        var escStart = this$1.pos
	        if (this$1.input.charCodeAt(++this$1.pos) != 117) // "u"
	          this$1.raise(this$1.pos, "Expecting Unicode escape sequence \\uXXXX")
	        ++this$1.pos
	        var esc = this$1.readCodePoint()
	        if (!(first ? isIdentifierStart : isIdentifierChar)(esc, astral))
	          this$1.raise(escStart, "Invalid Unicode escape")
	        word += codePointToString(esc)
	        chunkStart = this$1.pos
	      } else {
	        break
	      }
	      first = false
	    }
	    return word + this.input.slice(chunkStart, this.pos)
	  }
	
	  // Read an identifier or keyword token. Will check for reserved
	  // words when necessary.
	
	  pp$7.readWord = function() {
	    var word = this.readWord1()
	    var type = tt.name
	    if ((this.options.ecmaVersion >= 6 || !this.containsEsc) && this.keywords.test(word))
	      type = keywordTypes[word]
	    return this.finishToken(type, word)
	  }
	
	  var version = "4.0.3"
	
	  // The main exported interface (under `self.acorn` when in the
	  // browser) is a `parse` function that takes a code string and
	  // returns an abstract syntax tree as specified by [Mozilla parser
	  // API][api].
	  //
	  // [api]: https://developer.mozilla.org/en-US/docs/SpiderMonkey/Parser_API
	
	  function parse(input, options) {
	    return new Parser(options, input).parse()
	  }
	
	  // This function tries to parse a single expression at a given
	  // offset in a string. Useful for parsing mixed-language formats
	  // that embed JavaScript expressions.
	
	  function parseExpressionAt(input, pos, options) {
	    var p = new Parser(options, input, pos)
	    p.nextToken()
	    return p.parseExpression()
	  }
	
	  // Acorn is organized as a tokenizer and a recursive-descent parser.
	  // The `tokenizer` export provides an interface to the tokenizer.
	
	  function tokenizer(input, options) {
	    return new Parser(options, input)
	  }
	
	  // This is a terrible kludge to support the existing, pre-ES6
	  // interface where the loose parser module retroactively adds exports
	  // to this module.
	  function addLooseExports(parse, Parser, plugins) {
	    exports.parse_dammit = parse
	    exports.LooseParser = Parser
	    exports.pluginsLoose = plugins
	  }
	
	  exports.version = version;
	  exports.parse = parse;
	  exports.parseExpressionAt = parseExpressionAt;
	  exports.tokenizer = tokenizer;
	  exports.addLooseExports = addLooseExports;
	  exports.Parser = Parser;
	  exports.plugins = plugins;
	  exports.defaultOptions = defaultOptions;
	  exports.Position = Position;
	  exports.SourceLocation = SourceLocation;
	  exports.getLineInfo = getLineInfo;
	  exports.Node = Node;
	  exports.TokenType = TokenType;
	  exports.tokTypes = tt;
	  exports.TokContext = TokContext;
	  exports.tokContexts = types;
	  exports.isIdentifierChar = isIdentifierChar;
	  exports.isIdentifierStart = isIdentifierStart;
	  exports.Token = Token;
	  exports.isNewLine = isNewLine;
	  exports.lineBreak = lineBreak;
	  exports.lineBreakG = lineBreakG;
	
	  Object.defineProperty(exports, '__esModule', { value: true });
	
	}));

/***/ }
/******/ ])
});
;
//# sourceMappingURL=index.js.map
},{}],2:[function(require,module,exports){
var ASSET_LIST, ASSET_URLS, DUMMY_ASSET, loadAsset, loadedAssets;

exports.loadedAssets = loadedAssets = {};

DUMMY_ASSET = new Image();

exports.getAsset = function(asset) {
  if (asset in loadedAssets) {
    return loadedAssets[asset];
  } else {
    return DUMMY_ASSET;
  }
};

ASSET_LIST = ['goblin-side-passive-right', 'goblin-side-active-right', 'goblin-side-passive-left', 'goblin-side-active-left', 'rogue-side-passive-right', 'rogue-side-active-right', 'rogue-side-passive-left', 'rogue-side-active-left', 'mage-side-passive-right', 'mage-side-active-right', 'mage-side-passive-left', 'mage-side-active-left', 'knight-side-passive-right', 'knight-side-active-right', 'knight-side-passive-left', 'knight-side-active-left', 'archer-side-passive-right', 'archer-side-active-right', 'archer-side-passive-left', 'archer-side-active-left', 'fireball', 'dirt-1', 'dirt-2', 'dirt-3', 'wall-front', 'wall-top', 'grass', 'arrow'];

ASSET_URLS = {};

ASSET_LIST.forEach(function(name) {
  return ASSET_URLS[name] = "./assets/" + name + ".png";
});

loadAsset = function(name, callback) {
  loadedAssets[name] = new Image();
  loadedAssets[name].onload = callback;
  return loadedAssets[name].src = ASSET_URLS[name];
};

exports.loadAssets = function(callback) {
  var loadLoop;
  loadLoop = function(index) {
    if (index < ASSET_LIST.length) {
      return loadAsset(ASSET_LIST[index], function() {
        return loadLoop(index + 1);
      });
    } else {
      return callback(exports.loadedAssets);
    }
  };
  return loadLoop(0);
};

},{}],3:[function(require,module,exports){
var Archer, Arrow, Box, Bullet, CharacterTexturePack, Direction, FireParticle, Firelob, Knight, Mage, PlayerCharacter, Rogue, Vector, ref, ref1,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

ref = require('./player.coffee'), PlayerCharacter = ref.PlayerCharacter, CharacterTexturePack = ref.CharacterTexturePack, Bullet = ref.Bullet;

ref1 = require('./geometry.coffee'), Vector = ref1.Vector, Box = ref1.Box, Direction = ref1.Direction;

Arrow = (function(superClass) {
  extend(Arrow, superClass);

  function Arrow(time, pos1, direction, strength, allegiance) {
    this.pos = pos1;
    Arrow.__super__.constructor.call(this, 'arrow', this.pos, Arrow.SIZE, direction.vector().times(Arrow.MAX_SPEED * (1 - 1 / strength)), time + Arrow.MAX_LIFETIME * (1 - 1 / strength), Arrow.MAX_DAMAGE * (1 - 1 / strength), allegiance);
  }

  return Arrow;

})(Bullet);

Arrow.MAX_SPEED = 60;

Arrow.MAX_DAMAGE = 110;

Arrow.MAX_LIFETIME = 60;

Arrow.SIZE = new Vector(25, 10);

exports.Archer = Archer = (function(superClass) {
  extend(Archer, superClass);

  function Archer(allegiance, pos) {
    Archer.__super__.constructor.call(this, pos, new CharacterTexturePack('archer-side-passive-left', 'archer-side-passive-right', 'archer-side-active-left', 'archer-side-active-right'), allegiance);
    this.type = 'ARCHER';
    this.nockStart = 0;
    this.nocked = false;
  }

  Archer.prototype.serialize = function() {
    return {
      type: this.type,
      pos: this.pos.serialize(),
      health: this.health,
      attackDirection: this.attackDirection.angle,
      motionDirection: this.motionDirection.angle,
      nocked: this.nocked
    };
  };

  Archer.prototype.specialSetupHook = function(interpreter, scope) {
    interpreter.setProperty(scope, 'nock', interpreter.createNativeFunction((function(_this) {
      return function() {
        return _this.nock(_this.lastKnownGameState);
      };
    })(this)));
    return interpreter.setProperty(scope, 'release', interpreter.createNativeFunction((function(_this) {
      return function() {
        return _this.release(_this.lastKnownGameState);
      };
    })(this)));
  };

  Archer.prototype.nock = function(state) {
    if (!this.nocked) {
      this.nocked = this.active = true;
      return this.nockStart = state.time;
    }
  };

  Archer.prototype.release = function(state) {
    if (this.nocked) {
      this.nocked = this.active = false;
      return state.createBullet(new Arrow(state.time, this.pos.minus(new Vector(0, 25)), this.attackDirection, state.time - this.nockStart, this.allegiance));
    }
  };

  Archer.prototype.tick = function(state) {
    Archer.__super__.tick.apply(this, arguments);
    if (this.nocked) {
      this.velocity = new Vector(0, 0);
    }
    if (this.currentlyControlled) {
      if (!this.nocked && state.leftmouse) {
        return this.nock(state);
      } else if (this.nocked && !state.leftmouse) {
        return this.release(state);
      }
    }
  };

  return Archer;

})(PlayerCharacter);

Firelob = (function(superClass) {
  extend(Firelob, superClass);

  function Firelob(time, position, target, allegiance1) {
    var slope;
    this.allegiance = allegiance1;
    this.launchday = time;
    this.landday = time + Firelob.AIRTIME;
    this.deathday = time + Firelob.AIRTIME + Firelob.EXPLODE_TIME;
    this.texture = 'fireball';
    this.length = target.x - position.x;
    this.beginning = position.x;
    this.velocity = new Vector(1, 0);
    this.target = target;
    this.pos = position;
    this.size = Firelob.SIZE;
    slope = (target.y - position.y) / (target.x - position.x);
    this.flying = true;
    this.parabola = function(x) {
      return slope * (x - position.x) + position.y - (x - position.x) * (target.x - x) * (Firelob.HEIGHT * 4 / (Math.pow(target.x - position.x, 2)));
    };
    this.particles = [];
  }

  Firelob.prototype.render = function(renderContext) {
    var camera, canvas, ctx, i, len, particle, ref2;
    if (this.flying) {
      return Firelob.__super__.render.apply(this, arguments);
    } else {
      ctx = renderContext.ctx, camera = renderContext.camera, canvas = renderContext.canvas;
      ctx.save();
      ctx.translate(-camera.x + canvas.width / 2, -camera.y + canvas.height / 2);
      if (!this.flying) {
        ref2 = this.particles;
        for (i = 0, len = ref2.length; i < len; i++) {
          particle = ref2[i];
          ctx.fillStyle = particle.color;
          ctx.fillRect(particle.pos.x, particle.pos.y, particle.size, particle.size);
        }
      }
      return ctx.restore();
    }
  };

  Firelob.prototype.tick = function(state) {
    var i, ref2, x;
    if (state.time <= this.landday) {
      x = (state.time - this.launchday) / Firelob.AIRTIME * this.length + this.beginning;
      this.pos = new Vector(x, this.parabola(x));
    } else if (this.flying) {
      this.flying = false;
      for (i = 0, ref2 = Firelob.PARTICLES + Math.ceil(Math.random() * Firelob.PARTICLES); 0 <= ref2 ? i < ref2 : i > ref2; 0 <= ref2 ? i++ : i--) {
        this.particles.push(new FireParticle(this.target, Math.random() * Firelob.MAX_PARTICLE_SIZE, (new Direction(Math.random() * 2 * Math.PI)).vector().times(Firelob.MAX_SPEED * Math.random()), "rgb(255, " + (Math.floor(Math.random() * 255)) + ", 0)"));
      }
      state.players.filter((function(_this) {
        return function(x) {
          return x.allegiance !== _this.allegiance && x.pos.minus(_this.target).magnitude() < Firelob.SPLASH;
        };
      })(this)).forEach((function(_this) {
        return function(player) {
          return player.damage(Firelob.DAMAGE);
        };
      })(this));
    } else {
      this.particles.forEach(function(particle) {
        particle.pos = particle.pos.plus(particle.velocity);
        return particle.velocity = particle.velocity.times(0.8);
      });
    }
    if (state.time >= this.deathday) {
      return this.downflag = true;
    }
  };

  return Firelob;

})(Bullet);

Firelob.AIRTIME = 60;

Firelob.EXPLODE_TIME = 20;

Firelob.HEIGHT = 100;

Firelob.SPRAY = 3;

Firelob.SIZE = new Vector(25, 25);

Firelob.MAX_SPEED = 30;

Firelob.PARTICLES = 15;

Firelob.MAX_PARTICLE_SIZE = 25;

Firelob.SPLASH = 125;

Firelob.DAMAGE = 50;

FireParticle = (function() {
  function FireParticle(pos1, size, velocity, color) {
    this.pos = pos1;
    this.size = size;
    this.velocity = velocity;
    this.color = color;
  }

  return FireParticle;

})();

exports.Mage = Mage = (function(superClass) {
  extend(Mage, superClass);

  function Mage(allegiance, pos) {
    Mage.__super__.constructor.call(this, pos, new CharacterTexturePack('mage-side-passive-left', 'mage-side-passive-right', 'mage-side-active-left', 'mage-side-active-right'), allegiance);
    this.type = 'MAGE';
    this.casting = false;
    this.lastCast = 0;
    this.specialSetupCode = 'function cast(target) {\n  _cast(target.x, target.y);\n}';
  }

  Mage.prototype.serialize = function() {
    return {
      type: this.type,
      pos: this.pos.serialize(),
      health: this.health,
      attackDirection: this.attackDirection.angle,
      motionDirection: this.motionDirection.angle,
      casting: this.casting
    };
  };

  Mage.prototype.cast = function(state, target) {
    if (!this.casting && state.time - this.lastCast >= Mage.COOLDOWN) {
      state.createBullet(new Firelob(state.time, this.pos.minus(new Vector(0, 25)), target, this.allegiance));
      this.lastCast = state.time;
      return this.casting = this.active = true;
    }
  };

  Mage.prototype.specialSetupHook = function(interpreter, scope) {
    return interpreter.setProperty(scope, '_cast', interpreter.createNativeFunction((function(_this) {
      return function(x, y) {
        return _this.cast(_this.lastKnownGameState, new Vector(x.toNumber(), y.toNumber()));
      };
    })(this)));
  };

  Mage.prototype.tick = function(state) {
    Mage.__super__.tick.apply(this, arguments);
    if (this.casting) {
      this.velocity = new Vector(0, 0);
      if (state.time - this.lastCast >= Mage.DURATION) {
        this.casting = false;
        this.active = false;
      }
    }
    if (this.currentlyControlled) {
      if (!this.casting && state.time - this.lastCast >= Mage.COOLDOWN && state.leftmouse) {
        return this.cast(state, state.mousepos);
      }
    }
  };

  return Mage;

})(PlayerCharacter);

Mage.DURATION = 90;

Mage.COOLDOWN = 120;

exports.Knight = Knight = (function(superClass) {
  extend(Knight, superClass);

  function Knight(allegiance, pos) {
    Knight.__super__.constructor.call(this, pos, new CharacterTexturePack('knight-side-passive-left', 'knight-side-passive-right', 'knight-side-active-left', 'knight-side-active-right'), allegiance);
    this.type = 'KNIGHT';
    this.striking = false;
    this.lastStrike = 0;
    this.health = this.maxHealth = 200;
  }

  Knight.prototype.serialize = function() {
    return {
      type: this.type,
      pos: this.pos.serialize(),
      health: this.health,
      attackDirection: this.attackDirection.angle,
      motionDirection: this.motionDirection.angle,
      striking: this.striking
    };
  };

  Knight.prototype.strike = function(state) {
    if (!this.striking && state.time - this.lastStrike >= Knight.COOLDOWN) {
      this.lastStrike = state.time;
      this.striking = this.active = true;
      return state.players.forEach((function(_this) {
        return function(player) {
          var vector;
          if (player.allegiance !== _this.allegiance) {
            vector = player.pos.minus(_this.pos);
            if (vector.magnitude() < Knight.RANGE && Math.abs(vector.direction().minus(_this.attackDirection).angle) < Knight.SWEEP) {
              return player.damage(Knight.DAMAGE);
            }
          }
        };
      })(this));
    }
  };

  Knight.prototype.specialSetupHook = function(interpreter, scope) {
    return interpreter.setProperty(scope, 'strike', interpreter.createNativeFunction((function(_this) {
      return function(x, y) {
        return _this.strike(_this.lastKnownGameState);
      };
    })(this)));
  };

  Knight.prototype.tick = function(state) {
    if (this.striking && state.time - this.lastStrike > Knight.DURATION) {
      this.striking = this.active = false;
    }
    Knight.__super__.tick.apply(this, arguments);
    if (this.currentlyControlled) {
      if (!this.striking && state.time - this.lastStrike >= Knight.COOLDOWN && state.leftmouse) {
        return this.strike(state);
      }
    }
  };

  return Knight;

})(PlayerCharacter);

Knight.COOLDOWN = 40;

Knight.DURATION = 20;

Knight.RANGE = 50;

Knight.SWEEP = Math.PI / 2;

Knight.DAMAGE = 40;

exports.Rogue = Rogue = (function(superClass) {
  extend(Rogue, superClass);

  function Rogue(allegiance, pos) {
    Rogue.__super__.constructor.call(this, pos, new CharacterTexturePack('rogue-side-passive-left', 'rogue-side-passive-right', 'rogue-side-active-left', 'rogue-side-active-right'), allegiance);
    this.type = 'ROGUE';
    this.striking = false;
    this.lastStrike = 0;
    this.speed = 8;
  }

  Rogue.prototype.serialize = function() {
    return {
      type: this.type,
      pos: this.pos.serialize(),
      health: this.health,
      attackDirection: this.attackDirection.angle,
      motionDirection: this.motionDirection.angle
    };
  };

  Rogue.prototype.strike = function(state) {
    if (!this.striking && state.time - this.lastStrike >= Rogue.COOLDOWN) {
      this.lastStrike = state.time;
      this.striking = this.active = true;
      return state.players.forEach((function(_this) {
        return function(player) {
          var vector;
          if (player.allegiance !== _this.allegiance) {
            vector = player.pos.minus(_this.pos);
            if (vector.magnitude() < Rogue.RANGE && Math.abs(vector.direction().minus(_this.attackDirection).angle) < Rogue.SWEEP) {
              return player.damage(Rogue.DAMAGE);
            }
          }
        };
      })(this));
    }
  };

  Rogue.prototype.specialSetupHook = function(interpreter, scope) {
    return interpreter.setProperty(scope, 'strike', interpreter.createNativeFunction((function(_this) {
      return function(x, y) {
        return _this.strike(_this.lastKnownGameState);
      };
    })(this)));
  };

  Rogue.prototype.tick = function(state) {
    if (this.striking && state.time - this.lastStrike > Rogue.DURATION) {
      this.striking = this.active = false;
    }
    Rogue.__super__.tick.apply(this, arguments);
    if (this.currentlyControlled) {
      if (!this.striking && state.time - this.lastStrike >= Rogue.COOLDOWN && state.leftmouse) {
        return this.strike(state);
      }
    }
  };

  return Rogue;

})(PlayerCharacter);

Rogue.COOLDOWN = 30;

Rogue.DURATION = 20;

Rogue.RANGE = 40;

Rogue.SWEEP = Math.PI / 4;

Rogue.DAMAGE = 30;

},{"./geometry.coffee":5,"./player.coffee":8}],4:[function(require,module,exports){
exports.PLAYER_HEIGHT = 80;

exports.TILE_SIZE = 40;

},{}],5:[function(require,module,exports){
var Box, Direction, TILE_SIZE, Vector,
  modulo = function(a, b) { return (+a % (b = +b) + b) % b; };

TILE_SIZE = require('./constants.coffee').TILE_SIZE;

exports.Vector = Vector = (function() {
  function Vector(x, y) {
    Object.defineProperty(this, 'x', {
      writable: false,
      value: x
    });
    Object.defineProperty(this, 'y', {
      writable: false,
      value: y
    });
  }

  Vector.prototype.plus = function(other) {
    return new Vector(this.x + other.x, this.y + other.y);
  };

  Vector.prototype.minus = function(other) {
    return new Vector(this.x - other.x, this.y - other.y);
  };

  Vector.prototype.magnitude = function() {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  };

  Vector.prototype.times = function(s) {
    return new Vector(this.x * s, this.y * s);
  };

  Vector.prototype.normalize = function() {
    return this.times(1 / this.magnitude());
  };

  Vector.prototype.direction = function() {
    if (this.x === 0 && this.y === 0) {
      return new Direction(0);
    } else {
      return new Direction(Math.atan2(this.y, this.x));
    }
  };

  Vector.prototype.serialize = function() {
    return {
      x: this.x,
      y: this.y
    };
  };

  Vector.prototype.floor = function() {
    return new Vector(Math.floor(this.x), Math.floor(this.y));
  };

  Vector.prototype.ceil = function() {
    return new Vector(Math.ceil(this.x), Math.ceil(this.y));
  };

  return Vector;

})();

exports.Direction = Direction = (function() {
  function Direction(angle) {
    angle = modulo(angle, 2 * Math.PI);
    if (angle > Math.PI) {
      angle -= 2 * Math.PI;
    }
    Object.defineProperty(this, 'angle', {
      writable: false,
      value: angle
    });
  }

  Direction.prototype.vector = function() {
    return new Vector(Math.cos(this.angle), Math.sin(this.angle));
  };

  Direction.prototype.plus = function(other) {
    return new Direction(this.angle + other.angle);
  };

  Direction.prototype.minus = function(other) {
    return new Direction(this.angle - other.angle);
  };

  Direction.prototype.times = function(s) {
    return new Direction(this.angle * s);
  };

  return Direction;

})();

exports.Box = Box = (function() {
  function Box(corner, size) {
    Object.defineProperty(this, 'corner', {
      writable: false,
      value: corner
    });
    Object.defineProperty(this, 'size', {
      writable: false,
      value: size
    });
  }

  Box.prototype.center = function() {
    return this.corner.plus(this.size.times(0.5));
  };

  Box.prototype.contains = function(point) {
    var ref, ref1;
    return (this.corner.x < (ref = point.x) && ref < this.corner.x + this.size.x) && (this.corner.y < (ref1 = point.y) && ref1 < this.corner.y + this.size.y);
  };

  Box.prototype.intersects = function(box) {
    return !(box.corner.x + box.size.x < this.corner.x || this.corner.x + this.size.x < box.corner.x || box.corner.y + box.size.y < this.corner.y || this.corner.y + this.size.y < box.corner.y);
  };

  Box.prototype.toTiles = function() {
    return new Box(this.corner.times(1 / TILE_SIZE).floor(), this.size.times(1 / 25).ceil());
  };

  return Box;

})();

},{"./constants.coffee":4}],6:[function(require,module,exports){
var Archer, Box, Direction, Game, Knight, Mage, Map, PLAYER_HEIGHT, RenderContext, Rogue, Spectator, TILE_SIZE, Vector, assets, constants, edit, game, loadCode, lose, main, menus, playGame, ref, ref1, ref2, saveCode, win;

ref = require('./classes.coffee'), Archer = ref.Archer, Mage = ref.Mage, Rogue = ref.Rogue, Knight = ref.Knight;

ref1 = require('./geometry.coffee'), Vector = ref1.Vector, Direction = ref1.Direction, Box = ref1.Box;

RenderContext = require('./render.coffee').RenderContext;

ref2 = constants = require('./constants.coffee'), PLAYER_HEIGHT = ref2.PLAYER_HEIGHT, TILE_SIZE = ref2.TILE_SIZE;

assets = require('./assets.coffee');

Map = require('./map.coffee').Map;

Spectator = (function() {
  function Spectator(pos1) {
    this.pos = pos1;
    this.currentlyControlled = true;
  }

  Spectator.prototype.tick = function(state) {
    var vector;
    if (this.currentlyControlled) {
      vector = {
        x: 0,
        y: 0
      };
      if (state.keys[65]) {
        vector.x -= 1;
      }
      if (state.keys[68]) {
        vector.x += 1;
      }
      if (state.keys[87]) {
        vector.y -= 1;
      }
      if (state.keys[83]) {
        vector.y += 1;
      }
      vector = new Vector(vector.x, vector.y);
      if (vector.magnitude() > 0) {
        return this.pos = this.pos.plus(vector.normalize().times(4));
      }
    }
  };

  return Spectator;

})();

Game = (function() {
  function Game(canvas, initialPlayers) {
    var camera, ctx;
    ctx = canvas.getContext('2d');
    camera = new Vector(0, 0);
    this.renderContext = new RenderContext(canvas, ctx, camera);
    this.leader = this.spectator = new Spectator(new Vector(TILE_SIZE, TILE_SIZE));
    this.map = new Map(new Vector(50, 50));
    this.gameState = {
      players: initialPlayers,
      bullets: [],
      time: 0,
      mousepos: new Vector(0, 0),
      leftmouse: false,
      keys: {},
      createPlayer: (function(_this) {
        return function(player) {
          return _this.gameState.players.push(player);
        };
      })(this),
      createBullet: (function(_this) {
        return function(bullet) {
          return _this.gameState.bullets.push(bullet);
        };
      })(this)
    };
    this.actionBuffer = {
      keys: {},
      leftmouse: false
    };
    this.trueState = {
      leftmouse: false,
      mousepos: new Vector(0, 0),
      keys: {}
    };
    this.renderHooks = [];
    canvas.addEventListener('keydown', (function(_this) {
      return function(event) {
        _this.trueState.keys[event.which] = true;
        return _this.actionBuffer.keys[event.which] = true;
      };
    })(this));
    canvas.addEventListener('keyup', (function(_this) {
      return function(event) {
        return _this.trueState.keys[event.which] = false;
      };
    })(this));
    canvas.addEventListener('mousedown', (function(_this) {
      return function(event) {
        if (event.which === 1) {
          _this.trueState.leftmouse = true;
          return _this.actionBuffer.leftmouse = true;
        }
      };
    })(this));
    canvas.addEventListener('mouseup', (function(_this) {
      return function(event) {
        if (event.which === 1) {
          return _this.trueState.leftmouse = false;
        }
      };
    })(this));
    canvas.addEventListener('mousemove', (function(_this) {
      return function(event) {
        return _this.trueState.mousepos = new Vector(event.offsetX, event.offsetY);
      };
    })(this));
  }

  Game.prototype.addRenderHook = function(hook) {
    return this.renderHooks.push(hook);
  };

  Game.prototype.setLeader = function(newLeader) {
    this.leader.currentlyControlled = false;
    this.leader = newLeader;
    return this.leader.currentlyControlled = true;
  };

  Game.prototype.tick = function() {
    var base, key, ref3, ref4, renderList, val;
    ref3 = this.trueState.keys;
    for (key in ref3) {
      val = ref3[key];
      this.gameState.keys[key] = val;
    }
    ref4 = this.actionBuffer.keys;
    for (key in ref4) {
      val = ref4[key];
      (base = this.gameState.keys)[key] || (base[key] = val);
      this.actionBuffer.keys[key] = false;
    }
    this.gameState.leftmouse = this.trueState.leftmouse || this.actionBuffer.leftmouse;
    this.actionBuffer.leftmouse = false;
    this.gameState.mousepos = this.trueState.mousepos.plus(this.renderContext.camera).minus(this.renderContext.halfPoint);
    this.gameState.players.forEach((function(_this) {
      return function(player) {
        return player.tick(_this.gameState);
      };
    })(this));
    this.gameState.bullets.forEach((function(_this) {
      return function(bullet) {
        return bullet.tick(_this.gameState);
      };
    })(this));
    this.spectator.tick(this.gameState);
    this.gameState.players = this.gameState.players.filter(function(player) {
      return !player.downflag;
    });
    this.gameState.bullets = this.gameState.bullets.filter(function(bullet) {
      return !bullet.downflag;
    });
    this.gameState.players.forEach((function(_this) {
      return function(player) {
        var newx, newy, pos, v;
        pos = player.pos.minus(new Vector(TILE_SIZE / 2, TILE_SIZE / 2)).times(1 / TILE_SIZE);
        v = player.velocity.times(1 / TILE_SIZE);
        if (v.x > 0 && (_this.map.wallAt(Math.ceil(pos.x + v.x), Math.floor(pos.y)) || _this.map.wallAt(Math.ceil(pos.x + v.x), Math.ceil(pos.y)))) {
          newx = Math.ceil(pos.x);
        } else if (v.x < 0 && (_this.map.wallAt(Math.floor(pos.x + v.x), Math.floor(pos.y)) || _this.map.wallAt(Math.floor(pos.x + v.x), Math.ceil(pos.y)))) {
          newx = Math.floor(pos.x);
        } else {
          newx = pos.x + v.x;
        }
        if (v.y > 0 && (_this.map.wallAt(Math.floor(pos.x), Math.ceil(pos.y + v.y)) || _this.map.wallAt(Math.ceil(pos.x), Math.ceil(pos.y + v.y)))) {
          newy = Math.ceil(pos.y);
        } else if (v.y < 0 && (_this.map.wallAt(Math.floor(pos.x), Math.floor(pos.y + v.y)) || _this.map.wallAt(Math.ceil(pos.x), Math.floor(pos.y + v.y)))) {
          newy = Math.floor(pos.y);
        } else {
          newy = pos.y + v.y;
        }
        return player.pos = new Vector(newx * TILE_SIZE + TILE_SIZE / 2, newy * TILE_SIZE + TILE_SIZE / 2);
      };
    })(this));
    this.gameState.time += 1;
    this.renderContext.ctx.clearRect(0, 0, this.renderContext.canvas.width, this.renderContext.canvas.height);
    renderList = this.gameState.players.concat(this.gameState.bullets.concat(this.map.wallSprites));
    renderList.sort(function(a, b) {
      return a.pos.y - b.pos.y;
    });
    this.renderContext.camera = this.leader.pos;
    this.map.renderGround(this.renderContext);
    renderList.forEach((function(_this) {
      return function(sprite) {
        return sprite.render(_this.renderContext);
      };
    })(this));
    return this.renderHooks.forEach((function(_this) {
      return function(fn) {
        return fn(_this);
      };
    })(this));
  };

  return Game;

})();

loadCode = function(name) {
  var ref3;
  return (ref3 = localStorage[name + "-code"]) != null ? ref3 : "//" + name;
};

saveCode = function(name, code) {
  return localStorage[name + "-code"] = code;
};

playGame = function() {
  var canvas, controllables, enemies, fn1, game, healthbars, key, lastLeaderElement, mapCorner, minimap, minimapCanvas, player, tick;
  controllables = {
    'rogue': new Rogue('USER', new Vector(TILE_SIZE / 2, TILE_SIZE / 2)),
    'archer': new Archer('USER', new Vector(TILE_SIZE / 2, TILE_SIZE + TILE_SIZE / 2)),
    'mage': new Mage('USER', new Vector(TILE_SIZE + TILE_SIZE / 2, TILE_SIZE / 2)),
    'knight': new Knight('USER', new Vector(TILE_SIZE + TILE_SIZE / 2, TILE_SIZE + TILE_SIZE / 2))
  };
  for (key in controllables) {
    player = controllables[key];
    player.installCode(localStorage[key + "-code"]);
  }
  mapCorner = new Vector(51 * TILE_SIZE, 51 * TILE_SIZE);
  enemies = {
    'rogue': new Rogue('ENEMY', mapCorner.minus(new Vector(TILE_SIZE / 2, TILE_SIZE / 2))),
    'archer': new Archer('ENEMY', mapCorner.minus(new Vector(TILE_SIZE / 2, TILE_SIZE + TILE_SIZE / 2))),
    'mage': new Mage('ENEMY', mapCorner.minus(new Vector(TILE_SIZE + TILE_SIZE / 2, TILE_SIZE / 2))),
    'knight': new Knight('ENEMY', mapCorner.minus(new Vector(TILE_SIZE + TILE_SIZE / 2, TILE_SIZE + TILE_SIZE / 2)))
  };
  for (key in enemies) {
    player = enemies[key];
    player.installCode(localStorage[key + "-code"]);
  }
  canvas = document.getElementById('viewport');
  game = new Game(canvas, [controllables.rogue, controllables.knight, controllables.archer, controllables.mage, enemies.rogue, enemies.knight, enemies.archer, enemies.mage]);
  healthbars = {};
  minimapCanvas = document.getElementById('minimap');
  minimap = minimapCanvas.getContext('2d');
  for (key in controllables) {
    if (key !== 'spectator') {
      healthbars[key] = document.getElementById(key + "-health");
    }
  }
  game.addRenderHook(function() {
    var i, j, k, len, ref3, ref4, ref5, ref6, ref7, x, y;
    for (key in controllables) {
      player = controllables[key];
      if (key !== 'spectator') {
        healthbars[key].style.right = 50 * (1 - player.health / player.maxHealth);
      }
    }
    minimap.clearRect(0, 0, minimapCanvas.width, minimapCanvas.height);
    minimap.fillStyle = '#000';
    for (x = i = 0, ref3 = game.map.size.x; 0 <= ref3 ? i < ref3 : i > ref3; x = 0 <= ref3 ? ++i : --i) {
      for (y = j = 0, ref4 = game.map.size.y; 0 <= ref4 ? j < ref4 : j > ref4; y = 0 <= ref4 ? ++j : --j) {
        if (game.map.walls[x][y]) {
          minimap.fillRect(x * minimapCanvas.width / game.map.size.x, y * minimapCanvas.height / game.map.size.y, minimapCanvas.width / game.map.size.x, minimapCanvas.height / game.map.size.y);
        }
      }
    }
    ref5 = game.gameState.players;
    for (k = 0, len = ref5.length; k < len; k++) {
      player = ref5[k];
      if (player.allegiance === 'USER') {
        minimap.fillStyle = '#0F0';
      } else {
        minimap.fillStyle = '#F00';
      }
      ref6 = player.pos.times(1 / TILE_SIZE), x = ref6.x, y = ref6.y;
      minimap.fillRect(x * minimapCanvas.width / game.map.size.x, y * minimapCanvas.height / game.map.size.y, minimapCanvas.width / game.map.size.x, minimapCanvas.height / game.map.size.y);
    }
    minimap.fillStyle = '#00F';
    ref7 = controllables.spectator.pos.times(1 / TILE_SIZE), x = ref7.x, y = ref7.y;
    return minimap.fillRect(x * minimapCanvas.width / game.map.size.x, y * minimapCanvas.height / game.map.size.y, minimapCanvas.width / game.map.size.x, minimapCanvas.height / game.map.size.y);
  });
  controllables.spectator = game.spectator;
  window.game = game;
  lastLeaderElement = document.getElementById('spectator-face');
  fn1 = function(key, player) {
    var element;
    element = document.getElementById(key + "-face");
    return element.onclick = function() {
      lastLeaderElement.className = 'hero-face';
      element.className = 'hero-face hero-face-selected';
      lastLeaderElement = element;
      game.setLeader(player);
      return canvas.focus();
    };
  };
  for (key in controllables) {
    player = controllables[key];
    fn1(key, player);
  }
  tick = function() {
    if (game.gameState.players.filter(function(x) {
      return x.allegiance === 'USER';
    }).length === 0) {
      lose();
    } else if (game.gameState.players.filter(function(x) {
      return x.allegiance === 'ENEMY';
    }).length === 0) {
      win();
    } else {
      setTimeout(tick, 1000 / 60);
    }
    return game.tick();
  };
  tick();
  return canvas.focus();
};

menus = document.getElementById('menu-elements');

game = document.getElementById('game-elements');

edit = document.getElementById('edit-elements');

lose = function() {
  menus.style.display = 'block';
  return game.style.display = 'none';
};

win = function() {
  menus.style.display = 'block';
  return game.style.display = 'none';
};

main = function() {
  var aceEditor, editables, fn1, key, lastEditTabElement, session, setTab;
  aceEditor = ace.edit(document.getElementById('editor'));
  aceEditor.session.setMode('ace/mode/javascript');
  aceEditor.setTheme('ace/theme/chrome');
  document.getElementById('play').addEventListener('click', function() {
    menus.style.display = 'none';
    game.style.display = 'block';
    return playGame();
  });
  document.getElementById('edit').addEventListener('click', function() {
    menus.style.display = 'none';
    return edit.style.display = 'block';
  });
  document.getElementById('exit').addEventListener('click', function() {
    var key, results, session;
    edit.style.display = 'none';
    menus.style.display = 'block';
    results = [];
    for (key in editables) {
      session = editables[key];
      results.push(saveCode(key, session.getValue()));
    }
    return results;
  });
  editables = {
    'knight': ace.createEditSession(loadCode('knight'), 'ace/mode/javascript'),
    'rogue': ace.createEditSession(loadCode('rogue'), 'ace/mode/javascript'),
    'archer': ace.createEditSession(loadCode('archer'), 'ace/mode/javascript'),
    'mage': ace.createEditSession(loadCode('mage'), 'ace/mode/javascript')
  };
  lastEditTabElement = document.getElementById('knight-edit');
  setTab = function(name) {
    var element;
    element = document.getElementById(name + "-edit");
    lastEditTabElement.className = 'hero-face';
    element.className = 'hero-face hero-face-selected';
    lastEditTabElement = element;
    return aceEditor.setSession(editables[name]);
  };
  fn1 = function(key) {
    var element;
    element = document.getElementById(key + "-edit");
    return element.addEventListener('click', function() {
      return setTab(key);
    });
  };
  for (key in editables) {
    session = editables[key];
    fn1(key);
  }
  return setTab('knight');
};

assets.loadAssets(main);

},{"./assets.coffee":2,"./classes.coffee":3,"./constants.coffee":4,"./geometry.coffee":5,"./map.coffee":7,"./render.coffee":9}],7:[function(require,module,exports){
var Box, DIRTS, Direction, Map, Sprite, TILE_SIZE, Vector, Wall, assets, constants, ref,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

Sprite = require('./render.coffee').Sprite;

ref = require('./geometry.coffee'), Vector = ref.Vector, Direction = ref.Direction, Box = ref.Box;

TILE_SIZE = (constants = require('./constants.coffee')).TILE_SIZE;

assets = require('./assets.coffee');

DIRTS = ['dirt-1', 'dirt-2', 'dirt-3', 'grass'];

Wall = (function(superClass) {
  extend(Wall, superClass);

  function Wall(pos) {
    this.pos = pos;
    Wall.__super__.constructor.call(this, this.pos, 'wall-front');
  }

  Wall.prototype.renderbox = function() {
    return new Box(new Vector(this.pos.x, this.pos.y - TILE_SIZE * 2), new Vector(TILE_SIZE, 3 * TILE_SIZE));
  };

  return Wall;

})(Sprite);

exports.Map = Map = (function() {
  function Map(size) {
    var col, dugProportion, examine, i, j, k, len, len1, len2, possibilities, possibility, queue, ref1, w, x, y;
    this.size = size;
    this.ground = (function() {
      var i, ref1, results;
      results = [];
      for (i = 0, ref1 = this.size.x; 0 <= ref1 ? i < ref1 : i > ref1; 0 <= ref1 ? i++ : i--) {
        results.push((function() {
          var j, ref2, results1;
          results1 = [];
          for (j = 0, ref2 = this.size.y; 0 <= ref2 ? j < ref2 : j > ref2; 0 <= ref2 ? j++ : j--) {
            results1.push(DIRTS[Math.floor(Math.random() * DIRTS.length)]);
          }
          return results1;
        }).call(this));
      }
      return results;
    }).call(this);

    /*
    @walls = ((true for [0...@size.x]) for [0...@size.y])
    
    queue = [
      new Vector(Math.floor(@size.x / 2), Math.floor(@size.y / 2))
    ]
    
    dugProportion = 0
    
    until queue.length is 0
      examine = queue.shift()
    
      @walls[examine.x][examine.y] =
        @walls[@size.x - examine.x][@size.y - examine.y] =
        @walls[@size.x - examine.x][examine.y] =
        @walls[examine.x][@size.y - examine.y] = false
    
      possibilities = [
        examine.plus(new Vector 0, 1),
        examine.plus(new Vector 0, -1),
        examine.plus(new Vector 1, 0),
        examine.plus(new Vector -1, 0)
      ].filter (v) => 0 <= v.x <= @size.x / 2 and 0 < v.y <= @size.y / 2 and @walls[v.x][v.y]
    
      for possibility in possibilities
        if Math.random() < 0.8 ** dugProportion
          queue.push possibility
          dugProportion += 1 / (@size.x * @size.y)
     */
    this.walls = (function() {
      var i, ref1, results;
      results = [];
      for (i = 0, ref1 = this.size.y; 0 <= ref1 ? i < ref1 : i > ref1; 0 <= ref1 ? i++ : i--) {
        results.push((function() {
          var j, ref2, results1;
          results1 = [];
          for (j = 0, ref2 = this.size.x; 0 <= ref2 ? j < ref2 : j > ref2; 0 <= ref2 ? j++ : j--) {
            results1.push(false);
          }
          return results1;
        }).call(this));
      }
      return results;
    }).call(this);
    queue = [new Vector(Math.floor(this.size.x / 4), Math.floor(this.size.y / 4))];
    dugProportion = 0;
    while (queue.length !== 0) {
      examine = queue.shift();
      this.walls[examine.x][examine.y] = this.walls[this.size.x - examine.x - 1][this.size.y - examine.y - 1] = this.walls[this.size.x - examine.x - 1][examine.y] = this.walls[examine.x][this.size.y - examine.y - 1] = true;
      possibilities = [examine.plus(new Vector(0, 1)), examine.plus(new Vector(0, -1)), examine.plus(new Vector(1, 0)), examine.plus(new Vector(-1, 0))].filter((function(_this) {
        return function(v) {
          var ref1, ref2;
          return (0 <= (ref1 = v.x) && ref1 <= _this.size.x / 2) && (0 <= (ref2 = v.y) && ref2 <= _this.size.y / 2) && !_this.walls[v.x][v.y];
        };
      })(this));
      for (i = 0, len = possibilities.length; i < len; i++) {
        possibility = possibilities[i];
        if (Math.random() < Math.pow(0.02, dugProportion)) {
          queue.push(possibility);
          dugProportion += 1 / (this.size.x * this.size.y);
        }
      }
    }

    /*
     * Random room placement cave-digging. Digs 4-7 rooms.
    @walls = ((true for [0...@size.x]) for [0...@size.y])
    for [0...Math.ceil(Math.random() * 3) + 4]
      size = new Vector Math.floor(Math.random() * 6 + 6), Math.floor(Math.random() * 6 + 6)
      corner = new Vector Math.floor(Math.random() * (@size.x - size.x)), Math.floor(Math.random() * (@size.y - size.y))
    
      for x in [corner.x...corner.x + size.x]
        for y in [corner.y...corner.y + size.y]
          @walls[x][y] = false
    
     * Then dig tunnels between the rooms
     */
    this.wallSprites = [];
    ref1 = this.walls;
    for (x = j = 0, len1 = ref1.length; j < len1; x = ++j) {
      col = ref1[x];
      for (y = k = 0, len2 = col.length; k < len2; y = ++k) {
        w = col[y];
        if (w) {
          this.wallSprites.push(new Wall(new Vector(x * TILE_SIZE, y * TILE_SIZE)));
        }
      }
    }
  }

  Map.prototype.wallAt = function(x, y) {
    if ((0 <= x && x < this.size.x) && (0 <= y && y < this.size.y)) {
      return this.walls[x][y];
    } else {
      return true;
    }
  };

  Map.prototype.renderGround = function(renderContext) {
    var camera, canvas, ctx, i, j, ref1, ref2, ref3, ref4, tilesToRender, x, y;
    tilesToRender = renderContext.viewport().toTiles();
    canvas = renderContext.canvas, ctx = renderContext.ctx, camera = renderContext.camera;
    ctx.save();
    ctx.translate(-camera.x + renderContext.halfPoint.x, -camera.y + renderContext.halfPoint.y);
    for (x = i = ref1 = Math.max(0, tilesToRender.corner.x - 1), ref2 = Math.min(this.size.x, tilesToRender.corner.x + tilesToRender.size.x + 1); ref1 <= ref2 ? i < ref2 : i > ref2; x = ref1 <= ref2 ? ++i : --i) {
      for (y = j = ref3 = Math.max(0, tilesToRender.corner.y - 1), ref4 = Math.min(this.size.y, tilesToRender.corner.y + tilesToRender.size.y + 1); ref3 <= ref4 ? j < ref4 : j > ref4; y = ref3 <= ref4 ? ++j : --j) {
        if (!this.walls[x][y]) {
          ctx.drawImage(assets.getAsset(this.ground[x][y]), x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        }
      }
    }
    return ctx.restore();
  };

  return Map;

})();

},{"./assets.coffee":2,"./constants.coffee":4,"./geometry.coffee":5,"./render.coffee":9}],8:[function(require,module,exports){
var Box, Bullet, CharacterTexturePack, Direction, INITIALIZATION_CODE, Interpreter, PLAYER_HEIGHT, PlayerCharacter, Sprite, TILE_SIZE, Vector, assets, constants, ref, ref1,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

ref = require('./geometry.coffee'), Vector = ref.Vector, Box = ref.Box, Direction = ref.Direction;

Sprite = require('./render.coffee').Sprite;

ref1 = constants = require('./constants.coffee'), PLAYER_HEIGHT = ref1.PLAYER_HEIGHT, TILE_SIZE = ref1.TILE_SIZE;

assets = require('./assets.coffee');

Interpreter = require('js-interpreter');

exports.CharacterTexturePack = CharacterTexturePack = (function() {
  function CharacterTexturePack(passiveLeft, passiveRight, activeLeft, activeRight) {
    this.passiveLeft = passiveLeft;
    this.passiveRight = passiveRight;
    this.activeLeft = activeLeft;
    this.activeRight = activeRight;
  }

  return CharacterTexturePack;

})();

exports.PlayerCharacter = PlayerCharacter = (function(superClass) {
  extend(PlayerCharacter, superClass);

  function PlayerCharacter(pos, textures, allegiance) {
    var texture;
    this.pos = pos;
    this.textures = textures;
    this.allegiance = allegiance;
    this.texture = this.textures.passiveRight;
    texture = assets.getAsset(this.texture);
    this.size = new Vector(texture.width / texture.height * PLAYER_HEIGHT, PLAYER_HEIGHT);
    this.currentlyControlled = false;
    this.type = 'BLANK';
    this.health = this.maxHealth = 100;
    this.speed = 4;
    this.active = false;
    this.attackDirection = new Direction(0);
    this.motionDirection = new Direction(0);
    this.moving = false;
    this.specialSetupCode = '';
    this.persistentState = {};
    this.lastKnownGameState = {};
    this.installCode('', false);
  }

  PlayerCharacter.prototype.installCode = function(code, persistState) {
    if (persistState) {
      interpreter.appendCode('_savePersistentState(JSON.stringify(state));');
      interpreter.run();
    } else {
      this.persistenState = {};
    }
    return this.interpreter = new Interpreter(INITIALIZATION_CODE + (this.specialSetupCode + "\n\nfunction tick() {\n  " + code + "\n}"), (function(_this) {
      return function(interpreter, scope) {
        interpreter.setProperty(scope, '_getPersistentState', interpreter.createNativeFunction(function() {
          return JSON.stringify(_this.persistentState);
        }));
        interpreter.setProperty(scope, '_savePersistentState', interpreter.createNativeFunction(function(string) {
          return _this.persistentState = JSON.parse(string);
        }));
        interpreter.setProperty(scope, '_update', interpreter.createNativeFunction(function() {
          return interpreter.createPrimitive(JSON.stringify({
            players: _this.lastKnownGameState.players.map(function(x) {
              return x.serialize();
            }),
            bullets: _this.lastKnownGameState.bullets.map(function(x) {
              return x.serialize();
            }),
            self: _this.serialize(),
            time: _this.lastKnownGameState.time
          }));
        }));
        interpreter.setProperty(scope, '_setMotionDirection', interpreter.createNativeFunction(function(angle) {
          _this.motionDirection = new Direction(angle.toNumber());
        }));
        interpreter.setProperty(scope, '_setAttackDirection', interpreter.createNativeFunction(function(angle) {
          _this.attackDirection = new Direction(angle.toNumber());
        }));
        interpreter.setProperty(scope, 'setMoving', interpreter.createNativeFunction(function(value) {
          _this.moving = value.toBoolean();
        }));
        return _this.specialSetupHook(interpreter, scope);
      };
    })(this));
  };

  PlayerCharacter.prototype.specialSetupHook = function() {};

  PlayerCharacter.prototype.render = function(renderContext) {
    var camera, canvas, ctx;
    canvas = renderContext.canvas, ctx = renderContext.ctx, camera = renderContext.camera;
    if (this.allegiance === 'USER') {
      ctx.strokeStyle = '#0F0';
    } else {
      ctx.strokeStyle = '#F00';
    }
    ctx.strokeRect(this.pos.x - TILE_SIZE / 2 - camera.x + renderContext.halfPoint.x, this.pos.y - TILE_SIZE / 2 - camera.y + renderContext.halfPoint.y, TILE_SIZE, TILE_SIZE);
    return PlayerCharacter.__super__.render.apply(this, arguments);
  };

  PlayerCharacter.prototype.renderbox = function() {
    return new Box(this.pos.minus(new Vector(this.size.x / 2, this.size.y)), this.size);
  };

  PlayerCharacter.prototype.hitbox = function() {
    return new Box(this.pos.minus(new Vector(PLAYER_HEIGHT / 4, PLAYER_HEIGHT)), new Vector(PLAYER_HEIGHT / 2, PLAYER_HEIGHT));
  };

  PlayerCharacter.prototype.serialize = function() {
    return {
      type: this.type,
      pos: this.pos.serialize(),
      health: this.health,
      attackDirection: this.attackDirection.angle,
      motionDirection: this.motionDirection.angle
    };
  };

  PlayerCharacter.prototype.damage = function(x) {
    return this.health -= x;
  };

  PlayerCharacter.prototype.tick = function(state, callback) {
    var tidyUp, vector;
    this.lastKnownGameState = state;
    tidyUp = (function(_this) {
      return function() {
        if (_this.moving) {
          _this.velocity = _this.motionDirection.vector().times(_this.speed);
        } else {
          _this.velocity = new Vector(0, 0);
        }
        if (Math.abs(_this.attackDirection.angle) < Math.PI / 2) {
          if (_this.active) {
            _this.texture = _this.textures.activeRight;
          } else {
            _this.texture = _this.textures.passiveRight;
          }
        } else {
          if (_this.active) {
            _this.texture = _this.textures.activeLeft;
          } else {
            _this.texture = _this.textures.passiveLeft;
          }
        }
        if (_this.health <= 0) {
          return _this.downflag = true;
        }
      };
    })(this);
    if (this.currentlyControlled) {
      vector = {
        x: 0,
        y: 0
      };
      if (state.keys[65]) {
        vector.x -= 1;
      }
      if (state.keys[68]) {
        vector.x += 1;
      }
      if (state.keys[87]) {
        vector.y -= 1;
      }
      if (state.keys[83]) {
        vector.y += 1;
      }
      vector = new Vector(vector.x, vector.y);
      this.motionDirection = vector.direction();
      this.moving = vector.magnitude() !== 0;
      this.attackDirection = state.mousepos.minus(this.pos).direction();
      tidyUp();
    } else if (state.time % 12 === 0) {
      this.interpreter.appendCode('update(); tick();');
      this.interpreter.run();
      tidyUp();
    }
    return PlayerCharacter.__super__.tick.apply(this, arguments);
  };

  return PlayerCharacter;

})(Sprite);

exports.Bullet = Bullet = (function(superClass) {
  extend(Bullet, superClass);

  function Bullet(texture1, pos, size, velocity, deathday, damage, allegiance) {
    this.texture = texture1;
    this.pos = pos;
    this.size = size;
    this.velocity = velocity;
    this.deathday = deathday;
    this.damage = damage;
    this.allegiance = allegiance;
  }

  Bullet.prototype.serialize = function() {
    return {
      pos: this.pos.serialize(),
      velocity: this.velocity.serialize(),
      allegiance: this.allegiance
    };
  };

  Bullet.prototype.render = function(renderContext) {
    var camera, canvas, ctx;
    canvas = renderContext.canvas, ctx = renderContext.ctx, camera = renderContext.camera;
    ctx.save();
    ctx.translate(-camera.x + canvas.width / 2, -camera.y + canvas.height / 2);
    ctx.translate(this.pos.x, this.pos.y);
    ctx.rotate(this.velocity.direction().angle);
    ctx.translate(-this.size.x / 2, -this.size.y / 2);
    ctx.drawImage(assets.getAsset(this.texture), 0, 0, this.size.x, this.size.y);
    return ctx.restore();
  };

  Bullet.prototype.tick = function(state) {
    this.pos = this.pos.plus(this.velocity);
    if (state.time >= this.deathday) {
      this.downflag = true;
    }
    return state.players.forEach((function(_this) {
      return function(player) {
        if (player.allegiance !== _this.allegiance && player.hitbox().contains(_this.pos)) {
          player.damage(_this.damage);
          return _this.downflag = true;
        }
      };
    })(this));
  };

  return Bullet;

})(Sprite);

INITIALIZATION_CODE = 'var Box, Direction, Vector,\n  modulo = function(a, b) { return (+a % (b = +b) + b) % b; };\n\nVector = (function() {\n  function Vector(x, y) {\n    Object.defineProperty(this, \'x\', {\n      writable: false,\n      value: x\n    });\n    Object.defineProperty(this, \'y\', {\n      writable: false,\n      value: y\n    });\n  }\n\n  Vector.prototype.plus = function(other) {\n    return new Vector(this.x + other.x, this.y + other.y);\n  };\n\n  Vector.prototype.minus = function(other) {\n    return new Vector(this.x - other.x, this.y - other.y);\n  };\n\n  Vector.prototype.magnitude = function() {\n    return Math.sqrt(this.x * this.x + this.y * this.y);\n  };\n\n  Vector.prototype.times = function(s) {\n    return new Vector(this.x * s, this.y * s);\n  };\n\n  Vector.prototype.normalize = function() {\n    return this.times(1 / this.magnitude());\n  };\n\n  Vector.prototype.direction = function() {\n    if (this.x === 0 && this.y === 0) {\n      return new Direction(0);\n    } else {\n      return new Direction(Math.atan2(this.y, this.x));\n    }\n  };\n\n  return Vector;\n\n})();\n\nDirection = (function() {\n  function Direction(angle) {\n    angle = modulo(angle, 2 * Math.PI);\n    if (angle > Math.PI) {\n      angle -= 2 * Math.PI;\n    }\n    Object.defineProperty(this, \'angle\', {\n      writable: false,\n      value: angle\n    });\n  }\n\n  Direction.prototype.vector = function() {\n    return new Vector(Math.cos(this.angle), Math.sin(this.angle));\n  };\n\n  Direction.prototype.plus = function(other) {\n    return new Direction(this.angle + other.angle);\n  };\n\n  Direction.prototype.minus = function(other) {\n    return new Direction(this.angle - other.angle);\n  };\n\n  Direction.prototype.times = function(s) {\n    return new Direction(this.angle * s);\n  };\n\n  return Direction;\n\n})();\n\nBox = (function() {\n  function Box(corner, size) {\n    Object.defineProperty(this, \'corner\', {\n      writable: false,\n      value: corner\n    });\n    Object.defineProperty(this, \'size\', {\n      writable: false,\n      value: size\n    });\n  }\n\n  Box.prototype.center = function() {\n    return this.corner.plus(this.size.times(0.5));\n  };\n\n  Box.prototype.contains = function(point) {\n    var ref, ref1;\n    return (this.corner.x < (ref = point.x) && ref < this.corner.x + this.size.x) && (this.corner.y < (ref1 = point.y) && ref1 < this.corner.y + this.size.y);\n  };\n\n  Box.prototype.intersects = function(box) {\n    return !(box.corner.x + box.corner.size.x < this.corner.x || this.corner.x + this.corner.size.x < box.corner.x || boy.corner.y + boy.corner.size.y < this.corner.y || this.corner.y + this.corner.size.y < boy.corner.y);\n  };\n\n  return Box;\n\n}());\n\nvar players = [], bullets = [], self = {}, time = 0;\n\nfunction update() {\n  var data = JSON.parse(_update());\n\n  players = data.players.map(function(player) {\n    player.pos = new Vector(player.pos.x, player.pos.y);\n    player.motionDirection = new Direction(player.motionDirection);\n    player.attackDirection = new Direction(player.attackDirection);\n    return player;\n  });\n\n  bullets = data.bullets.map(function(bullet) {\n    bullet.pos = new Vector(bullet.pos.x, bullet.pos.y);\n    bullet.velocity = new Vector(bullet.velocity.x, bullet.velocity.y);\n    return bullet;\n  });\n\n  self = data.self;\n  self.pos = new Vector(self.pos.x, self.pos.y);\n  self.attackDirection = new Vector(self.pos.x, self.pos.y);\n}\n\nvar state = JSON.parse(_getPersistentState());\n\nfunction getPersistentState() {\n  return JSON.stringify(state);\n}\n\nfunction setMotionDirection(dir) {\n  _setMotionDirection(dir.angle);\n}\n\nfunction setAttackDirection(dir) {\n  _setAttackDirection(dir.angle);\n}';

},{"./assets.coffee":2,"./constants.coffee":4,"./geometry.coffee":5,"./render.coffee":9,"js-interpreter":1}],9:[function(require,module,exports){
var Box, Direction, RenderContext, Sprite, Vector, assets, ref;

ref = require('./geometry.coffee'), Vector = ref.Vector, Direction = ref.Direction, Box = ref.Box;

assets = require('./assets.coffee');

exports.RenderContext = RenderContext = (function() {
  function RenderContext(canvas1, ctx1, camera) {
    this.canvas = canvas1;
    this.ctx = ctx1;
    this.camera = camera;
    this.halfPoint = new Vector(this.canvas.width / 2, this.canvas.height / 2);
  }

  RenderContext.prototype.viewport = function() {
    return new Box(this.camera.minus(this.halfPoint), new Vector(this.canvas.width, this.canvas.height));
  };

  return RenderContext;

})();

exports.Sprite = Sprite = (function() {
  function Sprite(pos, texture) {
    this.pos = pos;
    this.texture = texture;
    this.velocity = new Vector(0, 0);
    this.downflag = false;
  }

  Sprite.prototype.hitbox = function() {};

  Sprite.prototype.renderbox = function() {};

  Sprite.prototype.render = function(renderContext) {
    var canvas, ctx, renderbox, trueRenderbox;
    ctx = renderContext.ctx;
    canvas = renderContext.canvas;
    renderbox = this.renderbox();
    if (renderbox.intersects(renderContext.viewport())) {
      trueRenderbox = new Box(renderbox.corner.minus(renderContext.camera).plus(renderContext.halfPoint), renderbox.size);
      return ctx.drawImage(assets.getAsset(this.texture), trueRenderbox.corner.x, trueRenderbox.corner.y, trueRenderbox.size.x, trueRenderbox.size.y);
    }
  };

  Sprite.prototype.tick = function() {};

  return Sprite;

})();

},{"./assets.coffee":2,"./geometry.coffee":5}]},{},[6]);
