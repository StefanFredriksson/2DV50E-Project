// Copyright 2010 The Emscripten Authors.  All rights reserved.
// Emscripten is available under two separate licenses, the MIT license and the
// University of Illinois/NCSA Open Source License.  Both these licenses can be
// found in the LICENSE file.

// The Module object: Our interface to the outside world. We import
// and export values on it. There are various ways Module can be used:
// 1. Not defined. We create it here
// 2. A function parameter, function(Module) { ..generated code.. }
// 3. pre-run appended it, var Module = {}; ..generated code..
// 4. External script tag defines var Module.
// We need to check if Module already exists (e.g. case 3 above).
// Substitution will be replaced with actual code on later stage of the build,
// this way Closure Compiler will not mangle it (e.g. case 4. above).
// Note that if you want to run closure, and also to use Module
// after the generated code, you will need to define   var Module = {};
// before the code. Then that object will be used in the code, and you
// can continue to use Module afterwards as well.
var Module = typeof Module !== 'undefined' ? Module : {};

// --pre-jses are emitted after the Module integration code, so that they can
// refer to Module (if they choose; they can also define Module)
// {{PRE_JSES}}

// Sometimes an existing Module object exists with properties
// meant to overwrite the default module functionality. Here
// we collect those properties and reapply _after_ we configure
// the current environment's defaults to avoid having to be so
// defensive during initialization.
var moduleOverrides = {};
var key;
for (key in Module) {
  if (Module.hasOwnProperty(key)) {
    moduleOverrides[key] = Module[key];
  }
}

var arguments_ = [];
var thisProgram = './this.program';
var quit_ = function(status, toThrow) {
  throw toThrow;
};

// Determine the runtime environment we are in. You can customize this by
// setting the ENVIRONMENT setting at compile time (see settings.js).

var ENVIRONMENT_IS_WEB = false;
var ENVIRONMENT_IS_WORKER = false;
var ENVIRONMENT_IS_NODE = false;
var ENVIRONMENT_HAS_NODE = false;
var ENVIRONMENT_IS_SHELL = false;
ENVIRONMENT_IS_WEB = typeof window === 'object';
ENVIRONMENT_IS_WORKER = typeof importScripts === 'function';
// A web environment like Electron.js can have Node enabled, so we must
// distinguish between Node-enabled environments and Node environments per se.
// This will allow the former to do things like mount NODEFS.
// Extended check using process.versions fixes issue #8816.
// (Also makes redundant the original check that 'require' is a function.)
ENVIRONMENT_HAS_NODE = typeof process === 'object' && typeof process.versions === 'object' && typeof process.versions.node === 'string';
ENVIRONMENT_IS_NODE = ENVIRONMENT_HAS_NODE && !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_WORKER;
ENVIRONMENT_IS_SHELL = !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_WORKER;

if (Module['ENVIRONMENT']) {
  throw new Error('Module.ENVIRONMENT has been deprecated. To force the environment, use the ENVIRONMENT compile-time option (for example, -s ENVIRONMENT=web or -s ENVIRONMENT=node)');
}



// `/` should be present at the end if `scriptDirectory` is not empty
var scriptDirectory = '';
function locateFile(path) {
  if (Module['locateFile']) {
    return Module['locateFile'](path, scriptDirectory);
  }
  return scriptDirectory + path;
}

// Hooks that are implemented differently in different runtime environments.
var read_,
    readAsync,
    readBinary,
    setWindowTitle;

var nodeFS;
var nodePath;

if (ENVIRONMENT_IS_NODE) {
  scriptDirectory = __dirname + '/';


  read_ = function shell_read(filename, binary) {
    var ret = tryParseAsDataURI(filename);
    if (ret) {
      return binary ? ret : ret.toString();
    }
    if (!nodeFS) nodeFS = require('fs');
    if (!nodePath) nodePath = require('path');
    filename = nodePath['normalize'](filename);
    return nodeFS['readFileSync'](filename, binary ? null : 'utf8');
  };

  readBinary = function readBinary(filename) {
    var ret = read_(filename, true);
    if (!ret.buffer) {
      ret = new Uint8Array(ret);
    }
    assert(ret.buffer);
    return ret;
  };




  if (process['argv'].length > 1) {
    thisProgram = process['argv'][1].replace(/\\/g, '/');
  }

  arguments_ = process['argv'].slice(2);

  if (typeof module !== 'undefined') {
    module['exports'] = Module;
  }

  process['on']('uncaughtException', function(ex) {
    // suppress ExitStatus exceptions from showing an error
    if (!(ex instanceof ExitStatus)) {
      throw ex;
    }
  });

  process['on']('unhandledRejection', abort);

  quit_ = function(status) {
    process['exit'](status);
  };

  Module['inspect'] = function () { return '[Emscripten Module object]'; };


} else
if (ENVIRONMENT_IS_SHELL) {


  if (typeof read != 'undefined') {
    read_ = function shell_read(f) {
      var data = tryParseAsDataURI(f);
      if (data) {
        return intArrayToString(data);
      }
      return read(f);
    };
  }

  readBinary = function readBinary(f) {
    var data;
    data = tryParseAsDataURI(f);
    if (data) {
      return data;
    }
    if (typeof readbuffer === 'function') {
      return new Uint8Array(readbuffer(f));
    }
    data = read(f, 'binary');
    assert(typeof data === 'object');
    return data;
  };

  if (typeof scriptArgs != 'undefined') {
    arguments_ = scriptArgs;
  } else if (typeof arguments != 'undefined') {
    arguments_ = arguments;
  }

  if (typeof quit === 'function') {
    quit_ = function(status) {
      quit(status);
    };
  }

  if (typeof print !== 'undefined') {
    // Prefer to use print/printErr where they exist, as they usually work better.
    if (typeof console === 'undefined') console = {};
    console.log = print;
    console.warn = console.error = typeof printErr !== 'undefined' ? printErr : print;
  }
} else

// Note that this includes Node.js workers when relevant (pthreads is enabled).
// Node.js workers are detected as a combination of ENVIRONMENT_IS_WORKER and
// ENVIRONMENT_HAS_NODE.
if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
  if (ENVIRONMENT_IS_WORKER) { // Check worker, not web, since window could be polyfilled
    scriptDirectory = self.location.href;
  } else if (document.currentScript) { // web
    scriptDirectory = document.currentScript.src;
  }
  // blob urls look like blob:http://site.com/etc/etc and we cannot infer anything from them.
  // otherwise, slice off the final part of the url to find the script directory.
  // if scriptDirectory does not contain a slash, lastIndexOf will return -1,
  // and scriptDirectory will correctly be replaced with an empty string.
  if (scriptDirectory.indexOf('blob:') !== 0) {
    scriptDirectory = scriptDirectory.substr(0, scriptDirectory.lastIndexOf('/')+1);
  } else {
    scriptDirectory = '';
  }


  // Differentiate the Web Worker from the Node Worker case, as reading must
  // be done differently.
  {


  read_ = function shell_read(url) {
    try {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', url, false);
      xhr.send(null);
      return xhr.responseText;
    } catch (err) {
      var data = tryParseAsDataURI(url);
      if (data) {
        return intArrayToString(data);
      }
      throw err;
    }
  };

  if (ENVIRONMENT_IS_WORKER) {
    readBinary = function readBinary(url) {
      try {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, false);
        xhr.responseType = 'arraybuffer';
        xhr.send(null);
        return new Uint8Array(xhr.response);
      } catch (err) {
        var data = tryParseAsDataURI(url);
        if (data) {
          return data;
        }
        throw err;
      }
    };
  }

  readAsync = function readAsync(url, onload, onerror) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = 'arraybuffer';
    xhr.onload = function xhr_onload() {
      if (xhr.status == 200 || (xhr.status == 0 && xhr.response)) { // file URLs can return 0
        onload(xhr.response);
        return;
      }
      var data = tryParseAsDataURI(url);
      if (data) {
        onload(data.buffer);
        return;
      }
      onerror();
    };
    xhr.onerror = onerror;
    xhr.send(null);
  };




  }

  setWindowTitle = function(title) { document.title = title };
} else
{
  throw new Error('environment detection error');
}


// Set up the out() and err() hooks, which are how we can print to stdout or
// stderr, respectively.
var out = Module['print'] || console.log.bind(console);
var err = Module['printErr'] || console.warn.bind(console);

// Merge back in the overrides
for (key in moduleOverrides) {
  if (moduleOverrides.hasOwnProperty(key)) {
    Module[key] = moduleOverrides[key];
  }
}
// Free the object hierarchy contained in the overrides, this lets the GC
// reclaim data used e.g. in memoryInitializerRequest, which is a large typed array.
moduleOverrides = null;

// Emit code to handle expected values on the Module object. This applies Module.x
// to the proper local x. This has two benefits: first, we only emit it if it is
// expected to arrive, and second, by using a local everywhere else that can be
// minified.
if (Module['arguments']) arguments_ = Module['arguments'];if (!Object.getOwnPropertyDescriptor(Module, 'arguments')) Object.defineProperty(Module, 'arguments', { configurable: true, get: function() { abort('Module.arguments has been replaced with plain arguments_') } });
if (Module['thisProgram']) thisProgram = Module['thisProgram'];if (!Object.getOwnPropertyDescriptor(Module, 'thisProgram')) Object.defineProperty(Module, 'thisProgram', { configurable: true, get: function() { abort('Module.thisProgram has been replaced with plain thisProgram') } });
if (Module['quit']) quit_ = Module['quit'];if (!Object.getOwnPropertyDescriptor(Module, 'quit')) Object.defineProperty(Module, 'quit', { configurable: true, get: function() { abort('Module.quit has been replaced with plain quit_') } });

// perform assertions in shell.js after we set up out() and err(), as otherwise if an assertion fails it cannot print the message
// Assertions on removed incoming Module JS APIs.
assert(typeof Module['memoryInitializerPrefixURL'] === 'undefined', 'Module.memoryInitializerPrefixURL option was removed, use Module.locateFile instead');
assert(typeof Module['pthreadMainPrefixURL'] === 'undefined', 'Module.pthreadMainPrefixURL option was removed, use Module.locateFile instead');
assert(typeof Module['cdInitializerPrefixURL'] === 'undefined', 'Module.cdInitializerPrefixURL option was removed, use Module.locateFile instead');
assert(typeof Module['filePackagePrefixURL'] === 'undefined', 'Module.filePackagePrefixURL option was removed, use Module.locateFile instead');
assert(typeof Module['read'] === 'undefined', 'Module.read option was removed (modify read_ in JS)');
assert(typeof Module['readAsync'] === 'undefined', 'Module.readAsync option was removed (modify readAsync in JS)');
assert(typeof Module['readBinary'] === 'undefined', 'Module.readBinary option was removed (modify readBinary in JS)');
assert(typeof Module['setWindowTitle'] === 'undefined', 'Module.setWindowTitle option was removed (modify setWindowTitle in JS)');
if (!Object.getOwnPropertyDescriptor(Module, 'read')) Object.defineProperty(Module, 'read', { configurable: true, get: function() { abort('Module.read has been replaced with plain read_') } });
if (!Object.getOwnPropertyDescriptor(Module, 'readAsync')) Object.defineProperty(Module, 'readAsync', { configurable: true, get: function() { abort('Module.readAsync has been replaced with plain readAsync') } });
if (!Object.getOwnPropertyDescriptor(Module, 'readBinary')) Object.defineProperty(Module, 'readBinary', { configurable: true, get: function() { abort('Module.readBinary has been replaced with plain readBinary') } });
// TODO: add when SDL2 is fixed if (!Object.getOwnPropertyDescriptor(Module, 'setWindowTitle')) Object.defineProperty(Module, 'setWindowTitle', { configurable: true, get: function() { abort('Module.setWindowTitle has been replaced with plain setWindowTitle') } });
var IDBFS = 'IDBFS is no longer included by default; build with -lidbfs.js';
var PROXYFS = 'PROXYFS is no longer included by default; build with -lproxyfs.js';
var WORKERFS = 'WORKERFS is no longer included by default; build with -lworkerfs.js';
var NODEFS = 'NODEFS is no longer included by default; build with -lnodefs.js';


// TODO remove when SDL2 is fixed (also see above)



// Copyright 2017 The Emscripten Authors.  All rights reserved.
// Emscripten is available under two separate licenses, the MIT license and the
// University of Illinois/NCSA Open Source License.  Both these licenses can be
// found in the LICENSE file.

// {{PREAMBLE_ADDITIONS}}

var STACK_ALIGN = 16;

// stack management, and other functionality that is provided by the compiled code,
// should not be used before it is ready
stackSave = stackRestore = stackAlloc = function() {
  abort('cannot use the stack before compiled code is ready to run, and has provided stack access');
};

function staticAlloc(size) {
  abort('staticAlloc is no longer available at runtime; instead, perform static allocations at compile time (using makeStaticAlloc)');
}

function dynamicAlloc(size) {
  assert(DYNAMICTOP_PTR);
  var ret = HEAP32[DYNAMICTOP_PTR>>2];
  var end = (ret + size + 15) & -16;
  if (end > _emscripten_get_heap_size()) {
    abort('failure to dynamicAlloc - memory growth etc. is not supported there, call malloc/sbrk directly');
  }
  HEAP32[DYNAMICTOP_PTR>>2] = end;
  return ret;
}

function alignMemory(size, factor) {
  if (!factor) factor = STACK_ALIGN; // stack alignment (16-byte) by default
  return Math.ceil(size / factor) * factor;
}

function getNativeTypeSize(type) {
  switch (type) {
    case 'i1': case 'i8': return 1;
    case 'i16': return 2;
    case 'i32': return 4;
    case 'i64': return 8;
    case 'float': return 4;
    case 'double': return 8;
    default: {
      if (type[type.length-1] === '*') {
        return 4; // A pointer
      } else if (type[0] === 'i') {
        var bits = parseInt(type.substr(1));
        assert(bits % 8 === 0, 'getNativeTypeSize invalid bits ' + bits + ', type ' + type);
        return bits / 8;
      } else {
        return 0;
      }
    }
  }
}

function warnOnce(text) {
  if (!warnOnce.shown) warnOnce.shown = {};
  if (!warnOnce.shown[text]) {
    warnOnce.shown[text] = 1;
    err(text);
  }
}





// Wraps a JS function as a wasm function with a given signature.
function convertJsFunctionToWasm(func, sig) {
  return func;
}

// Add a wasm function to the table.
function addFunctionWasm(func, sig) {
  var table = wasmTable;
  var ret = table.length;

  // Grow the table
  try {
    table.grow(1);
  } catch (err) {
    if (!(err instanceof RangeError)) {
      throw err;
    }
    throw 'Unable to grow wasm table. Use a higher value for RESERVED_FUNCTION_POINTERS or set ALLOW_TABLE_GROWTH.';
  }

  // Insert new element
  try {
    // Attempting to call this with JS function will cause of table.set() to fail
    table.set(ret, func);
  } catch (err) {
    if (!(err instanceof TypeError)) {
      throw err;
    }
    assert(typeof sig !== 'undefined', 'Missing signature argument to addFunction');
    var wrapped = convertJsFunctionToWasm(func, sig);
    table.set(ret, wrapped);
  }

  return ret;
}

function removeFunctionWasm(index) {
  // TODO(sbc): Look into implementing this to allow re-using of table slots
}

// 'sig' parameter is required for the llvm backend but only when func is not
// already a WebAssembly function.
function addFunction(func, sig) {
  assert(typeof func !== 'undefined');

  return addFunctionWasm(func, sig);
}

function removeFunction(index) {
  removeFunctionWasm(index);
}

var funcWrappers = {};

function getFuncWrapper(func, sig) {
  if (!func) return; // on null pointer, return undefined
  assert(sig);
  if (!funcWrappers[sig]) {
    funcWrappers[sig] = {};
  }
  var sigCache = funcWrappers[sig];
  if (!sigCache[func]) {
    // optimize away arguments usage in common cases
    if (sig.length === 1) {
      sigCache[func] = function dynCall_wrapper() {
        return dynCall(sig, func);
      };
    } else if (sig.length === 2) {
      sigCache[func] = function dynCall_wrapper(arg) {
        return dynCall(sig, func, [arg]);
      };
    } else {
      // general case
      sigCache[func] = function dynCall_wrapper() {
        return dynCall(sig, func, Array.prototype.slice.call(arguments));
      };
    }
  }
  return sigCache[func];
}


function makeBigInt(low, high, unsigned) {
  return unsigned ? ((+((low>>>0)))+((+((high>>>0)))*4294967296.0)) : ((+((low>>>0)))+((+((high|0)))*4294967296.0));
}

function dynCall(sig, ptr, args) {
  if (args && args.length) {
    assert(args.length == sig.length-1);
    assert(('dynCall_' + sig) in Module, 'bad function pointer type - no table for sig \'' + sig + '\'');
    return Module['dynCall_' + sig].apply(null, [ptr].concat(args));
  } else {
    assert(sig.length == 1);
    assert(('dynCall_' + sig) in Module, 'bad function pointer type - no table for sig \'' + sig + '\'');
    return Module['dynCall_' + sig].call(null, ptr);
  }
}

var tempRet0 = 0;

var setTempRet0 = function(value) {
  tempRet0 = value;
};

var getTempRet0 = function() {
  return tempRet0;
};

function getCompilerSetting(name) {
  throw 'You must build with -s RETAIN_COMPILER_SETTINGS=1 for getCompilerSetting or emscripten_get_compiler_setting to work';
}

var Runtime = {
  // helpful errors
  getTempRet0: function() { abort('getTempRet0() is now a top-level function, after removing the Runtime object. Remove "Runtime."') },
  staticAlloc: function() { abort('staticAlloc() is now a top-level function, after removing the Runtime object. Remove "Runtime."') },
  stackAlloc: function() { abort('stackAlloc() is now a top-level function, after removing the Runtime object. Remove "Runtime."') },
};

// The address globals begin at. Very low in memory, for code size and optimization opportunities.
// Above 0 is static memory, starting with globals.
// Then the stack.
// Then 'dynamic' memory for sbrk.
var GLOBAL_BASE = 1024;




// === Preamble library stuff ===

// Documentation for the public APIs defined in this file must be updated in:
//    site/source/docs/api_reference/preamble.js.rst
// A prebuilt local version of the documentation is available at:
//    site/build/text/docs/api_reference/preamble.js.txt
// You can also build docs locally as HTML or other formats in site/
// An online HTML version (which may be of a different version of Emscripten)
//    is up at http://kripken.github.io/emscripten-site/docs/api_reference/preamble.js.html


var wasmBinary;if (Module['wasmBinary']) wasmBinary = Module['wasmBinary'];if (!Object.getOwnPropertyDescriptor(Module, 'wasmBinary')) Object.defineProperty(Module, 'wasmBinary', { configurable: true, get: function() { abort('Module.wasmBinary has been replaced with plain wasmBinary') } });
var noExitRuntime;if (Module['noExitRuntime']) noExitRuntime = Module['noExitRuntime'];if (!Object.getOwnPropertyDescriptor(Module, 'noExitRuntime')) Object.defineProperty(Module, 'noExitRuntime', { configurable: true, get: function() { abort('Module.noExitRuntime has been replaced with plain noExitRuntime') } });


// wasm2js.js - enough of a polyfill for the WebAssembly object so that we can load
// wasm2js code that way.


// Emit "var WebAssembly" if definitely using wasm2js. Otherwise, in MAYBE_WASM2JS
// mode, we can't use a "var" since it would prevent normal wasm from working.
var
WebAssembly = {
  Memory: function(opts) {
    return {
      buffer: new ArrayBuffer(opts['initial'] * 65536),
      grow: function(amount) {
        var oldBuffer = this.buffer;
        var ret = __growWasmMemory(amount);
        assert(this.buffer !== oldBuffer); // the call should have updated us
        return ret;
      }
    };
  },

  Table: function(opts) {
    var ret = new Array(opts['initial']);
    ret.grow = function(by) {
      if (ret.length >= 22 + 0) {
        abort('Unable to grow wasm table. Use a higher value for RESERVED_FUNCTION_POINTERS or set ALLOW_TABLE_GROWTH.')
      }
      ret.push(null);
    };
    ret.set = function(i, func) {
      ret[i] = func;
    };
    ret.get = function(i) {
      return ret[i];
    };
    return ret;
  },

  Module: function(binary) {
    // TODO: use the binary and info somehow - right now the wasm2js output is embedded in
    // the main JS
    return {};
  },

  Instance: function(module, info) {
    // TODO: use the module and info somehow - right now the wasm2js output is embedded in
    // the main JS
    // XXX hack to get an atob implementation

// Copied from https://github.com/strophe/strophejs/blob/e06d027/src/polyfills.js#L149

// This code was written by Tyler Akins and has been placed in the
// public domain.  It would be nice if you left this header intact.
// Base64 code from Tyler Akins -- http://rumkin.com

/**
 * Decodes a base64 string.
 * @param {String} input The string to decode.
 */
var decodeBase64 = typeof atob === 'function' ? atob : function (input) {
  var keyStr = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

  var output = '';
  var chr1, chr2, chr3;
  var enc1, enc2, enc3, enc4;
  var i = 0;
  // remove all characters that are not A-Z, a-z, 0-9, +, /, or =
  input = input.replace(/[^A-Za-z0-9\+\/\=]/g, '');
  do {
    enc1 = keyStr.indexOf(input.charAt(i++));
    enc2 = keyStr.indexOf(input.charAt(i++));
    enc3 = keyStr.indexOf(input.charAt(i++));
    enc4 = keyStr.indexOf(input.charAt(i++));

    chr1 = (enc1 << 2) | (enc2 >> 4);
    chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
    chr3 = ((enc3 & 3) << 6) | enc4;

    output = output + String.fromCharCode(chr1);

    if (enc3 !== 64) {
      output = output + String.fromCharCode(chr2);
    }
    if (enc4 !== 64) {
      output = output + String.fromCharCode(chr3);
    }
  } while (i < input.length);
  return output;
};

// Converts a string of base64 into a byte array.
// Throws error on invalid input.
function intArrayFromBase64(s) {
  if (typeof ENVIRONMENT_IS_NODE === 'boolean' && ENVIRONMENT_IS_NODE) {
    var buf;
    try {
      buf = Buffer.from(s, 'base64');
    } catch (_) {
      buf = new Buffer(s, 'base64');
    }
    return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
  }

  try {
    var decoded = decodeBase64(s);
    var bytes = new Uint8Array(decoded.length);
    for (var i = 0 ; i < decoded.length ; ++i) {
      bytes[i] = decoded.charCodeAt(i);
    }
    return bytes;
  } catch (_) {
    throw new Error('Converting base64 string to bytes failed.');
  }
}

// If filename is a base64 data URI, parses and returns data (Buffer on node,
// Uint8Array otherwise). If filename is not a base64 data URI, returns undefined.
function tryParseAsDataURI(filename) {
  if (!isDataURI(filename)) {
    return;
  }

  return intArrayFromBase64(filename.slice(dataURIPrefix.length));
}


    var atob = decodeBase64;
    // This will be replaced by the actual wasm2js code.
    var exports = (
function instantiate(asmLibraryArg, wasmMemory, wasmTable) {


  var scratchBuffer = new ArrayBuffer(8);
  var i32ScratchView = new Int32Array(scratchBuffer);
  var f32ScratchView = new Float32Array(scratchBuffer);
  var f64ScratchView = new Float64Array(scratchBuffer);
  
  function wasm2js_scratch_load_i32(index) {
    return i32ScratchView[index];
  }
      
  function wasm2js_scratch_store_i32(index, value) {
    i32ScratchView[index] = value;
  }
      
  function wasm2js_scratch_load_f64() {
    return f64ScratchView[0];
  }
      
  function wasm2js_scratch_store_f64(value) {
    f64ScratchView[0] = value;
  }
      
  function legalimport$wasm2js_scratch_store_i64(low, high) {
    i32ScratchView[0] = low;
    i32ScratchView[1] = high;
  }
      
function asmFunc(global, env, buffer) {
 var memory = env.memory;
 var FUNCTION_TABLE = wasmTable;
 var HEAP8 = new global.Int8Array(buffer);
 var HEAP16 = new global.Int16Array(buffer);
 var HEAP32 = new global.Int32Array(buffer);
 var HEAPU8 = new global.Uint8Array(buffer);
 var HEAPU16 = new global.Uint16Array(buffer);
 var HEAPU32 = new global.Uint32Array(buffer);
 var HEAPF32 = new global.Float32Array(buffer);
 var HEAPF64 = new global.Float64Array(buffer);
 var Math_imul = global.Math.imul;
 var Math_fround = global.Math.fround;
 var Math_abs = global.Math.abs;
 var Math_clz32 = global.Math.clz32;
 var Math_min = global.Math.min;
 var Math_max = global.Math.max;
 var Math_floor = global.Math.floor;
 var Math_ceil = global.Math.ceil;
 var Math_sqrt = global.Math.sqrt;
 var abort = env.abort;
 var nan = global.NaN;
 var infinity = global.Infinity;
 var fimport$0 = env.__cxa_allocate_exception;
 var fimport$1 = env.__cxa_throw;
 var fimport$2 = env.fd_write;
 var fimport$3 = env.__lock;
 var fimport$4 = env.__unlock;
 var fimport$5 = env.emscripten_resize_heap;
 var fimport$6 = env.emscripten_memcpy_big;
 var fimport$7 = env.__handle_stack_overflow;
 var fimport$8 = env.setTempRet0;
 var global$0 = 5247152;
 var global$1 = 4272;
 var global$2 = 0;
 var i64toi32_i32$HIGH_BITS = 0;
 // EMSCRIPTEN_START_FUNCS;
 function $0() {
  return 4272 | 0;
 }
 
 function $1() {
  
 }
 
 function $2() {
  var $2_1 = 0, $24_1 = 0, $23_1 = 0, $13_1 = 0, $20_1 = 0;
  $2_1 = global$0 - 32 | 0;
  label$1 : {
   $23_1 = $2_1;
   if ($2_1 >>> 0 < global$2 >>> 0) {
    fimport$7()
   }
   global$0 = $23_1;
  }
  HEAP32[($2_1 + 28 | 0) >> 2] = 0;
  HEAP32[($2_1 + 24 | 0) >> 2] = 40;
  HEAP32[($2_1 + 20 | 0) >> 2] = 1;
  label$3 : {
   label$4 : while (1) {
    if (!((HEAP32[($2_1 + 20 | 0) >> 2] | 0 | 0) <= (40 | 0) & 1 | 0)) {
     break label$3
    }
    $13_1 = HEAP32[($2_1 + 20 | 0) >> 2] | 0;
    HEAP32[($2_1 + 4 | 0) >> 2] = $3(HEAP32[($2_1 + 20 | 0) >> 2] | 0 | 0) | 0;
    HEAP32[$2_1 >> 2] = $13_1;
    $5(1024 | 0, $2_1 | 0) | 0;
    HEAP32[($2_1 + 20 | 0) >> 2] = (HEAP32[($2_1 + 20 | 0) >> 2] | 0) + 1 | 0;
    continue label$4;
   };
  }
  $20_1 = HEAP32[($2_1 + 28 | 0) >> 2] | 0;
  label$5 : {
   $24_1 = $2_1 + 32 | 0;
   if ($24_1 >>> 0 < global$2 >>> 0) {
    fimport$7()
   }
   global$0 = $24_1;
  }
  return $20_1 | 0;
 }
 
 function $3($0_1) {
  $0_1 = $0_1 | 0;
  var $3_1 = 0, $16_1 = 0, $47_1 = 0, $46_1 = 0, $43_1 = 0;
  $3_1 = global$0 - 16 | 0;
  label$1 : {
   $46_1 = $3_1;
   if ($3_1 >>> 0 < global$2 >>> 0) {
    fimport$7()
   }
   global$0 = $46_1;
  }
  HEAP32[($3_1 + 8 | 0) >> 2] = $0_1;
  label$3 : {
   if (!((HEAP32[($3_1 + 8 | 0) >> 2] | 0 | 0) <= (0 | 0) & 1 | 0)) {
    break label$3
   }
   $16_1 = fimport$0(4 | 0) | 0;
   HEAP32[$16_1 >> 2] = 1032;
   fimport$1($16_1 | 0, 2084 | 0, 0 | 0);
   abort();
  }
  label$4 : {
   label$5 : {
    if (!((HEAP32[($3_1 + 8 | 0) >> 2] | 0 | 0) == (1 | 0) & 1 | 0)) {
     break label$5
    }
    HEAP32[($3_1 + 12 | 0) >> 2] = 0;
    break label$4;
   }
   label$6 : {
    if (!((HEAP32[($3_1 + 8 | 0) >> 2] | 0 | 0) == (2 | 0) & 1 | 0)) {
     break label$6
    }
    HEAP32[($3_1 + 12 | 0) >> 2] = 1;
    break label$4;
   }
   HEAP32[($3_1 + 4 | 0) >> 2] = ($3((HEAP32[($3_1 + 8 | 0) >> 2] | 0) - 1 | 0 | 0) | 0) + ($3((HEAP32[($3_1 + 8 | 0) >> 2] | 0) - 2 | 0 | 0) | 0) | 0;
   HEAP32[($3_1 + 12 | 0) >> 2] = HEAP32[($3_1 + 4 | 0) >> 2] | 0;
  }
  $43_1 = HEAP32[($3_1 + 12 | 0) >> 2] | 0;
  label$7 : {
   $47_1 = $3_1 + 16 | 0;
   if ($47_1 >>> 0 < global$2 >>> 0) {
    fimport$7()
   }
   global$0 = $47_1;
  }
  return $43_1 | 0;
 }
 
 function $4($0_1, $1_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  return $2() | 0 | 0;
 }
 
 function $5($0_1, $1_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  var $2_1 = 0, $4_1 = 0, $3_1 = 0;
  label$1 : {
   $2_1 = global$0 - 16 | 0;
   $3_1 = $2_1;
   if ($2_1 >>> 0 < global$2 >>> 0) {
    fimport$7()
   }
   global$0 = $3_1;
  }
  HEAP32[($2_1 + 12 | 0) >> 2] = $1_1;
  $1_1 = $25(HEAP32[(0 + 1084 | 0) >> 2] | 0 | 0, $0_1 | 0, $1_1 | 0) | 0;
  label$3 : {
   $4_1 = $2_1 + 16 | 0;
   if ($4_1 >>> 0 < global$2 >>> 0) {
    fimport$7()
   }
   global$0 = $4_1;
  }
  return $1_1 | 0;
 }
 
 function $6($0_1) {
  $0_1 = $0_1 | 0;
  return 0 | 0;
 }
 
 function $7($0_1, $1_1, $1$hi, $2_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  $1$hi = $1$hi | 0;
  $2_1 = $2_1 | 0;
  i64toi32_i32$HIGH_BITS = 0;
  return 0 | 0;
 }
 
 function $8() {
  return 3688 | 0;
 }
 
 function $9($0_1) {
  $0_1 = $0_1 | 0;
  return ($0_1 + -48 | 0) >>> 0 < 10 >>> 0 | 0;
 }
 
 function $10() {
  return 2412 | 0;
 }
 
 function $11($0_1, $1_1, $2_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  $2_1 = $2_1 | 0;
  var $3_1 = 0;
  $3_1 = 1;
  label$1 : {
   label$2 : {
    if (!$0_1) {
     break label$2
    }
    if ($1_1 >>> 0 <= 127 >>> 0) {
     break label$1
    }
    label$3 : {
     label$4 : {
      if (HEAP32[(HEAP32[(($12() | 0) + 176 | 0) >> 2] | 0) >> 2] | 0) {
       break label$4
      }
      if (($1_1 & -128 | 0 | 0) == (57216 | 0)) {
       break label$1
      }
      HEAP32[($8() | 0) >> 2] = 25;
      break label$3;
     }
     label$5 : {
      if ($1_1 >>> 0 > 2047 >>> 0) {
       break label$5
      }
      HEAP8[($0_1 + 1 | 0) >> 0] = $1_1 & 63 | 0 | 128 | 0;
      HEAP8[$0_1 >> 0] = $1_1 >>> 6 | 0 | 192 | 0;
      return 2 | 0;
     }
     label$6 : {
      label$7 : {
       if ($1_1 >>> 0 < 55296 >>> 0) {
        break label$7
       }
       if (($1_1 & -8192 | 0 | 0) != (57344 | 0)) {
        break label$6
       }
      }
      HEAP8[($0_1 + 2 | 0) >> 0] = $1_1 & 63 | 0 | 128 | 0;
      HEAP8[$0_1 >> 0] = $1_1 >>> 12 | 0 | 224 | 0;
      HEAP8[($0_1 + 1 | 0) >> 0] = ($1_1 >>> 6 | 0) & 63 | 0 | 128 | 0;
      return 3 | 0;
     }
     label$8 : {
      if (($1_1 + -65536 | 0) >>> 0 > 1048575 >>> 0) {
       break label$8
      }
      HEAP8[($0_1 + 3 | 0) >> 0] = $1_1 & 63 | 0 | 128 | 0;
      HEAP8[$0_1 >> 0] = $1_1 >>> 18 | 0 | 240 | 0;
      HEAP8[($0_1 + 2 | 0) >> 0] = ($1_1 >>> 6 | 0) & 63 | 0 | 128 | 0;
      HEAP8[($0_1 + 1 | 0) >> 0] = ($1_1 >>> 12 | 0) & 63 | 0 | 128 | 0;
      return 4 | 0;
     }
     HEAP32[($8() | 0) >> 2] = 25;
    }
    $3_1 = -1;
   }
   return $3_1 | 0;
  }
  HEAP8[$0_1 >> 0] = $1_1;
  return 1 | 0;
 }
 
 function $12() {
  return $10() | 0 | 0;
 }
 
 function $13($0_1, $1_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  label$1 : {
   if ($0_1) {
    break label$1
   }
   return 0 | 0;
  }
  return $11($0_1 | 0, $1_1 | 0, 0 | 0) | 0 | 0;
 }
 
 function $14($0_1, $1_1) {
  $0_1 = +$0_1;
  $1_1 = $1_1 | 0;
  var i64toi32_i32$0 = 0, i64toi32_i32$1 = 0, i64toi32_i32$3 = 0, $2_1 = 0, i64toi32_i32$2 = 0, i64toi32_i32$4 = 0, $3_1 = 0, $10_1 = 0, $3$hi = 0;
  label$1 : {
   wasm2js_scratch_store_f64(+$0_1);
   i64toi32_i32$0 = wasm2js_scratch_load_i32(1 | 0) | 0;
   $3_1 = wasm2js_scratch_load_i32(0 | 0) | 0;
   $3$hi = i64toi32_i32$0;
   i64toi32_i32$2 = $3_1;
   i64toi32_i32$1 = 0;
   i64toi32_i32$3 = 52;
   i64toi32_i32$4 = i64toi32_i32$3 & 31 | 0;
   if (32 >>> 0 <= (i64toi32_i32$3 & 63 | 0) >>> 0) {
    i64toi32_i32$1 = 0;
    $10_1 = i64toi32_i32$0 >>> i64toi32_i32$4 | 0;
   } else {
    i64toi32_i32$1 = i64toi32_i32$0 >>> i64toi32_i32$4 | 0;
    $10_1 = (((1 << i64toi32_i32$4 | 0) - 1 | 0) & i64toi32_i32$0 | 0) << (32 - i64toi32_i32$4 | 0) | 0 | (i64toi32_i32$2 >>> i64toi32_i32$4 | 0) | 0;
   }
   $2_1 = $10_1 & 2047 | 0;
   if (($2_1 | 0) == (2047 | 0)) {
    break label$1
   }
   label$2 : {
    if ($2_1) {
     break label$2
    }
    label$3 : {
     label$4 : {
      if ($0_1 != 0.0) {
       break label$4
      }
      $2_1 = 0;
      break label$3;
     }
     $0_1 = +$14(+($0_1 * 18446744073709551615.0), $1_1 | 0);
     $2_1 = (HEAP32[$1_1 >> 2] | 0) + -64 | 0;
    }
    HEAP32[$1_1 >> 2] = $2_1;
    return +$0_1;
   }
   HEAP32[$1_1 >> 2] = $2_1 + -1022 | 0;
   i64toi32_i32$1 = $3$hi;
   i64toi32_i32$0 = $3_1;
   i64toi32_i32$2 = -2146435073;
   i64toi32_i32$3 = -1;
   i64toi32_i32$2 = i64toi32_i32$1 & i64toi32_i32$2 | 0;
   i64toi32_i32$1 = i64toi32_i32$0 & i64toi32_i32$3 | 0;
   i64toi32_i32$0 = 1071644672;
   i64toi32_i32$3 = 0;
   i64toi32_i32$0 = i64toi32_i32$2 | i64toi32_i32$0 | 0;
   wasm2js_scratch_store_i32(0 | 0, i64toi32_i32$1 | i64toi32_i32$3 | 0 | 0);
   wasm2js_scratch_store_i32(1 | 0, i64toi32_i32$0 | 0);
   $0_1 = +wasm2js_scratch_load_f64();
  }
  return +$0_1;
 }
 
 function $15($0_1, $1_1, $2_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  $2_1 = $2_1 | 0;
  var $3_1 = 0, $4_1 = 0, $5_1 = 0, $6_1 = 0;
  label$1 : {
   label$2 : {
    $3_1 = HEAP32[($2_1 + 16 | 0) >> 2] | 0;
    if ($3_1) {
     break label$2
    }
    $4_1 = 0;
    if ($34($2_1 | 0) | 0) {
     break label$1
    }
    $3_1 = HEAP32[($2_1 + 16 | 0) >> 2] | 0;
   }
   label$3 : {
    $5_1 = HEAP32[($2_1 + 20 | 0) >> 2] | 0;
    if (($3_1 - $5_1 | 0) >>> 0 >= $1_1 >>> 0) {
     break label$3
    }
    return FUNCTION_TABLE[HEAP32[($2_1 + 36 | 0) >> 2] | 0]($2_1, $0_1, $1_1) | 0 | 0;
   }
   $6_1 = 0;
   label$4 : {
    if ((HEAP8[($2_1 + 75 | 0) >> 0] | 0 | 0) < (0 | 0)) {
     break label$4
    }
    $4_1 = $1_1;
    label$5 : while (1) {
     $3_1 = $4_1;
     if (!$3_1) {
      break label$4
     }
     $4_1 = $3_1 + -1 | 0;
     if ((HEAPU8[($0_1 + $4_1 | 0) >> 0] | 0 | 0) != (10 | 0)) {
      continue label$5
     }
     break label$5;
    };
    $4_1 = FUNCTION_TABLE[HEAP32[($2_1 + 36 | 0) >> 2] | 0]($2_1, $0_1, $3_1) | 0;
    if ($4_1 >>> 0 < $3_1 >>> 0) {
     break label$1
    }
    $1_1 = $1_1 - $3_1 | 0;
    $0_1 = $0_1 + $3_1 | 0;
    $5_1 = HEAP32[($2_1 + 20 | 0) >> 2] | 0;
    $6_1 = $3_1;
   }
   $71($5_1 | 0, $0_1 | 0, $1_1 | 0) | 0;
   HEAP32[($2_1 + 20 | 0) >> 2] = (HEAP32[($2_1 + 20 | 0) >> 2] | 0) + $1_1 | 0;
   $4_1 = $6_1 + $1_1 | 0;
  }
  return $4_1 | 0;
 }
 
 function $16($0_1, $1_1, $2_1, $3_1, $4_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  $2_1 = $2_1 | 0;
  $3_1 = $3_1 | 0;
  $4_1 = $4_1 | 0;
  var $5_1 = 0, $6_1 = 0, $7_1 = 0, $9_1 = 0, $8_1 = 0;
  label$1 : {
   $5_1 = global$0 - 208 | 0;
   $8_1 = $5_1;
   if ($5_1 >>> 0 < global$2 >>> 0) {
    fimport$7()
   }
   global$0 = $8_1;
  }
  HEAP32[($5_1 + 204 | 0) >> 2] = $2_1;
  $2_1 = 0;
  $72($5_1 + 160 | 0 | 0, 0 | 0, 40 | 0) | 0;
  HEAP32[($5_1 + 200 | 0) >> 2] = HEAP32[($5_1 + 204 | 0) >> 2] | 0;
  label$3 : {
   label$4 : {
    if (($17(0 | 0, $1_1 | 0, $5_1 + 200 | 0 | 0, $5_1 + 80 | 0 | 0, $5_1 + 160 | 0 | 0, $3_1 | 0, $4_1 | 0) | 0 | 0) >= (0 | 0)) {
     break label$4
    }
    $1_1 = -1;
    break label$3;
   }
   label$5 : {
    if ((HEAP32[($0_1 + 76 | 0) >> 2] | 0 | 0) < (0 | 0)) {
     break label$5
    }
    $2_1 = $29($0_1 | 0) | 0;
   }
   $6_1 = HEAP32[$0_1 >> 2] | 0;
   label$6 : {
    if ((HEAP8[($0_1 + 74 | 0) >> 0] | 0 | 0) > (0 | 0)) {
     break label$6
    }
    HEAP32[$0_1 >> 2] = $6_1 & -33 | 0;
   }
   $6_1 = $6_1 & 32 | 0;
   label$7 : {
    label$8 : {
     if (!(HEAP32[($0_1 + 48 | 0) >> 2] | 0)) {
      break label$8
     }
     $1_1 = $17($0_1 | 0, $1_1 | 0, $5_1 + 200 | 0 | 0, $5_1 + 80 | 0 | 0, $5_1 + 160 | 0 | 0, $3_1 | 0, $4_1 | 0) | 0;
     break label$7;
    }
    HEAP32[($0_1 + 48 | 0) >> 2] = 80;
    HEAP32[($0_1 + 16 | 0) >> 2] = $5_1 + 80 | 0;
    HEAP32[($0_1 + 28 | 0) >> 2] = $5_1;
    HEAP32[($0_1 + 20 | 0) >> 2] = $5_1;
    $7_1 = HEAP32[($0_1 + 44 | 0) >> 2] | 0;
    HEAP32[($0_1 + 44 | 0) >> 2] = $5_1;
    $1_1 = $17($0_1 | 0, $1_1 | 0, $5_1 + 200 | 0 | 0, $5_1 + 80 | 0 | 0, $5_1 + 160 | 0 | 0, $3_1 | 0, $4_1 | 0) | 0;
    if (!$7_1) {
     break label$7
    }
    FUNCTION_TABLE[HEAP32[($0_1 + 36 | 0) >> 2] | 0]($0_1, 0, 0) | 0;
    HEAP32[($0_1 + 48 | 0) >> 2] = 0;
    HEAP32[($0_1 + 44 | 0) >> 2] = $7_1;
    HEAP32[($0_1 + 28 | 0) >> 2] = 0;
    HEAP32[($0_1 + 16 | 0) >> 2] = 0;
    $3_1 = HEAP32[($0_1 + 20 | 0) >> 2] | 0;
    HEAP32[($0_1 + 20 | 0) >> 2] = 0;
    $1_1 = $3_1 ? $1_1 : -1;
   }
   $3_1 = HEAP32[$0_1 >> 2] | 0;
   HEAP32[$0_1 >> 2] = $3_1 | $6_1 | 0;
   $1_1 = $3_1 & 32 | 0 ? -1 : $1_1;
   if (!$2_1) {
    break label$3
   }
   $30($0_1 | 0);
  }
  label$9 : {
   $9_1 = $5_1 + 208 | 0;
   if ($9_1 >>> 0 < global$2 >>> 0) {
    fimport$7()
   }
   global$0 = $9_1;
  }
  return $1_1 | 0;
 }
 
 function $17($0_1, $1_1, $2_1, $3_1, $4_1, $5_1, $6_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  $2_1 = $2_1 | 0;
  $3_1 = $3_1 | 0;
  $4_1 = $4_1 | 0;
  $5_1 = $5_1 | 0;
  $6_1 = $6_1 | 0;
  var $7_1 = 0, $13_1 = 0, $14_1 = 0, $15_1 = 0, $19_1 = 0, i64toi32_i32$5 = 0, $12_1 = 0, i64toi32_i32$3 = 0, $20_1 = 0, $11_1 = 0, $17_1 = 0, $18_1 = 0, i64toi32_i32$2 = 0, $16_1 = 0, i64toi32_i32$1 = 0, i64toi32_i32$0 = 0, $9_1 = 0, $24_1 = 0, $24$hi = 0, $10_1 = 0, $21_1 = 0, $32_1 = 0, $33_1 = 0, $34_1 = 0, $23_1 = 0, $22_1 = 0, $8_1 = 0, $282 = 0;
  label$1 : {
   $7_1 = global$0 - 80 | 0;
   $22_1 = $7_1;
   if ($7_1 >>> 0 < global$2 >>> 0) {
    fimport$7()
   }
   global$0 = $22_1;
  }
  HEAP32[($7_1 + 76 | 0) >> 2] = $1_1;
  $8_1 = $7_1 + 55 | 0;
  $9_1 = $7_1 + 56 | 0;
  $10_1 = 0;
  $11_1 = 0;
  $1_1 = 0;
  label$3 : {
   label$4 : while (1) {
    label$5 : {
     if (($11_1 | 0) < (0 | 0)) {
      break label$5
     }
     label$6 : {
      if (($1_1 | 0) <= (2147483647 - $11_1 | 0 | 0)) {
       break label$6
      }
      HEAP32[($8() | 0) >> 2] = 61;
      $11_1 = -1;
      break label$5;
     }
     $11_1 = $1_1 + $11_1 | 0;
    }
    $12_1 = HEAP32[($7_1 + 76 | 0) >> 2] | 0;
    $1_1 = $12_1;
    label$7 : {
     label$8 : {
      label$9 : {
       label$10 : {
        label$11 : {
         label$12 : {
          label$13 : {
           label$14 : {
            label$15 : {
             label$16 : {
              label$17 : {
               label$18 : {
                label$19 : {
                 label$20 : {
                  label$21 : {
                   $13_1 = HEAPU8[$1_1 >> 0] | 0;
                   if (!$13_1) {
                    break label$21
                   }
                   label$22 : {
                    label$23 : while (1) {
                     label$24 : {
                      label$25 : {
                       label$26 : {
                        $13_1 = $13_1 & 255 | 0;
                        if ($13_1) {
                         break label$26
                        }
                        $13_1 = $1_1;
                        break label$25;
                       }
                       if (($13_1 | 0) != (37 | 0)) {
                        break label$24
                       }
                       $13_1 = $1_1;
                       label$27 : while (1) {
                        if ((HEAPU8[($1_1 + 1 | 0) >> 0] | 0 | 0) != (37 | 0)) {
                         break label$25
                        }
                        $14_1 = $1_1 + 2 | 0;
                        HEAP32[($7_1 + 76 | 0) >> 2] = $14_1;
                        $13_1 = $13_1 + 1 | 0;
                        $15_1 = HEAPU8[($1_1 + 2 | 0) >> 0] | 0;
                        $1_1 = $14_1;
                        if (($15_1 | 0) == (37 | 0)) {
                         continue label$27
                        }
                        break label$27;
                       };
                      }
                      $1_1 = $13_1 - $12_1 | 0;
                      label$28 : {
                       if (!$0_1) {
                        break label$28
                       }
                       $18($0_1 | 0, $12_1 | 0, $1_1 | 0);
                      }
                      if ($1_1) {
                       continue label$4
                      }
                      $14_1 = $9(HEAP8[((HEAP32[($7_1 + 76 | 0) >> 2] | 0) + 1 | 0) >> 0] | 0 | 0) | 0;
                      $16_1 = -1;
                      $13_1 = 1;
                      $1_1 = HEAP32[($7_1 + 76 | 0) >> 2] | 0;
                      label$29 : {
                       if (!$14_1) {
                        break label$29
                       }
                       if ((HEAPU8[($1_1 + 2 | 0) >> 0] | 0 | 0) != (36 | 0)) {
                        break label$29
                       }
                       $16_1 = (HEAP8[($1_1 + 1 | 0) >> 0] | 0) + -48 | 0;
                       $10_1 = 1;
                       $13_1 = 3;
                      }
                      $1_1 = $1_1 + $13_1 | 0;
                      HEAP32[($7_1 + 76 | 0) >> 2] = $1_1;
                      $13_1 = 0;
                      label$30 : {
                       label$31 : {
                        $17_1 = HEAP8[$1_1 >> 0] | 0;
                        $15_1 = $17_1 + -32 | 0;
                        if ($15_1 >>> 0 <= 31 >>> 0) {
                         break label$31
                        }
                        $14_1 = $1_1;
                        break label$30;
                       }
                       $14_1 = $1_1;
                       $15_1 = 1 << $15_1 | 0;
                       if (!($15_1 & 75913 | 0)) {
                        break label$30
                       }
                       label$32 : while (1) {
                        $14_1 = $1_1 + 1 | 0;
                        HEAP32[($7_1 + 76 | 0) >> 2] = $14_1;
                        $13_1 = $15_1 | $13_1 | 0;
                        $17_1 = HEAP8[($1_1 + 1 | 0) >> 0] | 0;
                        $15_1 = $17_1 + -32 | 0;
                        if ($15_1 >>> 0 > 31 >>> 0) {
                         break label$30
                        }
                        $1_1 = $14_1;
                        $15_1 = 1 << $15_1 | 0;
                        if ($15_1 & 75913 | 0) {
                         continue label$32
                        }
                        break label$32;
                       };
                      }
                      label$33 : {
                       label$34 : {
                        if (($17_1 | 0) != (42 | 0)) {
                         break label$34
                        }
                        label$35 : {
                         label$36 : {
                          if (!($9(HEAP8[($14_1 + 1 | 0) >> 0] | 0 | 0) | 0)) {
                           break label$36
                          }
                          $14_1 = HEAP32[($7_1 + 76 | 0) >> 2] | 0;
                          if ((HEAPU8[($14_1 + 2 | 0) >> 0] | 0 | 0) != (36 | 0)) {
                           break label$36
                          }
                          HEAP32[((((HEAP8[($14_1 + 1 | 0) >> 0] | 0) << 2 | 0) + $4_1 | 0) + -192 | 0) >> 2] = 10;
                          $1_1 = $14_1 + 3 | 0;
                          $18_1 = HEAP32[((((HEAP8[($14_1 + 1 | 0) >> 0] | 0) << 3 | 0) + $3_1 | 0) + -384 | 0) >> 2] | 0;
                          $10_1 = 1;
                          break label$35;
                         }
                         if ($10_1) {
                          break label$20
                         }
                         $10_1 = 0;
                         $18_1 = 0;
                         label$37 : {
                          if (!$0_1) {
                           break label$37
                          }
                          $1_1 = HEAP32[$2_1 >> 2] | 0;
                          HEAP32[$2_1 >> 2] = $1_1 + 4 | 0;
                          $18_1 = HEAP32[$1_1 >> 2] | 0;
                         }
                         $1_1 = (HEAP32[($7_1 + 76 | 0) >> 2] | 0) + 1 | 0;
                        }
                        HEAP32[($7_1 + 76 | 0) >> 2] = $1_1;
                        if (($18_1 | 0) > (-1 | 0)) {
                         break label$33
                        }
                        $18_1 = 0 - $18_1 | 0;
                        $13_1 = $13_1 | 8192 | 0;
                        break label$33;
                       }
                       $18_1 = $19($7_1 + 76 | 0 | 0) | 0;
                       if (($18_1 | 0) < (0 | 0)) {
                        break label$20
                       }
                       $1_1 = HEAP32[($7_1 + 76 | 0) >> 2] | 0;
                      }
                      $19_1 = -1;
                      label$38 : {
                       if ((HEAPU8[$1_1 >> 0] | 0 | 0) != (46 | 0)) {
                        break label$38
                       }
                       label$39 : {
                        if ((HEAPU8[($1_1 + 1 | 0) >> 0] | 0 | 0) != (42 | 0)) {
                         break label$39
                        }
                        label$40 : {
                         if (!($9(HEAP8[($1_1 + 2 | 0) >> 0] | 0 | 0) | 0)) {
                          break label$40
                         }
                         $1_1 = HEAP32[($7_1 + 76 | 0) >> 2] | 0;
                         if ((HEAPU8[($1_1 + 3 | 0) >> 0] | 0 | 0) != (36 | 0)) {
                          break label$40
                         }
                         HEAP32[((((HEAP8[($1_1 + 2 | 0) >> 0] | 0) << 2 | 0) + $4_1 | 0) + -192 | 0) >> 2] = 10;
                         $19_1 = HEAP32[((((HEAP8[($1_1 + 2 | 0) >> 0] | 0) << 3 | 0) + $3_1 | 0) + -384 | 0) >> 2] | 0;
                         $1_1 = $1_1 + 4 | 0;
                         HEAP32[($7_1 + 76 | 0) >> 2] = $1_1;
                         break label$38;
                        }
                        if ($10_1) {
                         break label$20
                        }
                        label$41 : {
                         label$42 : {
                          if ($0_1) {
                           break label$42
                          }
                          $19_1 = 0;
                          break label$41;
                         }
                         $1_1 = HEAP32[$2_1 >> 2] | 0;
                         HEAP32[$2_1 >> 2] = $1_1 + 4 | 0;
                         $19_1 = HEAP32[$1_1 >> 2] | 0;
                        }
                        $1_1 = (HEAP32[($7_1 + 76 | 0) >> 2] | 0) + 2 | 0;
                        HEAP32[($7_1 + 76 | 0) >> 2] = $1_1;
                        break label$38;
                       }
                       HEAP32[($7_1 + 76 | 0) >> 2] = $1_1 + 1 | 0;
                       $19_1 = $19($7_1 + 76 | 0 | 0) | 0;
                       $1_1 = HEAP32[($7_1 + 76 | 0) >> 2] | 0;
                      }
                      $14_1 = 0;
                      label$43 : while (1) {
                       $15_1 = $14_1;
                       $20_1 = -1;
                       if (((HEAP8[$1_1 >> 0] | 0) + -65 | 0) >>> 0 > 57 >>> 0) {
                        break label$3
                       }
                       $17_1 = $1_1 + 1 | 0;
                       HEAP32[($7_1 + 76 | 0) >> 2] = $17_1;
                       $14_1 = HEAP8[$1_1 >> 0] | 0;
                       $1_1 = $17_1;
                       $14_1 = HEAPU8[(($14_1 + Math_imul($15_1, 58) | 0) + 1055 | 0) >> 0] | 0;
                       if (($14_1 + -1 | 0) >>> 0 < 8 >>> 0) {
                        continue label$43
                       }
                       break label$43;
                      };
                      if (!$14_1) {
                       break label$3
                      }
                      label$44 : {
                       label$45 : {
                        label$46 : {
                         label$47 : {
                          if (($14_1 | 0) != (19 | 0)) {
                           break label$47
                          }
                          $20_1 = -1;
                          if (($16_1 | 0) <= (-1 | 0)) {
                           break label$46
                          }
                          break label$3;
                         }
                         if (($16_1 | 0) < (0 | 0)) {
                          break label$45
                         }
                         HEAP32[($4_1 + ($16_1 << 2 | 0) | 0) >> 2] = $14_1;
                         i64toi32_i32$2 = $3_1 + ($16_1 << 3 | 0) | 0;
                         i64toi32_i32$0 = HEAP32[i64toi32_i32$2 >> 2] | 0;
                         i64toi32_i32$1 = HEAP32[(i64toi32_i32$2 + 4 | 0) >> 2] | 0;
                         $282 = i64toi32_i32$0;
                         i64toi32_i32$0 = $7_1;
                         HEAP32[($7_1 + 64 | 0) >> 2] = $282;
                         HEAP32[($7_1 + 68 | 0) >> 2] = i64toi32_i32$1;
                        }
                        $1_1 = 0;
                        if (!$0_1) {
                         continue label$4
                        }
                        break label$44;
                       }
                       if (!$0_1) {
                        break label$7
                       }
                       $20($7_1 + 64 | 0 | 0, $14_1 | 0, $2_1 | 0, $6_1 | 0);
                       $17_1 = HEAP32[($7_1 + 76 | 0) >> 2] | 0;
                      }
                      $21_1 = $13_1 & -65537 | 0;
                      $13_1 = $13_1 & 8192 | 0 ? $21_1 : $13_1;
                      $20_1 = 0;
                      $16_1 = 1088;
                      $14_1 = $9_1;
                      $1_1 = HEAP8[($17_1 + -1 | 0) >> 0] | 0;
                      $1_1 = $15_1 ? (($1_1 & 15 | 0 | 0) == (3 | 0) ? $1_1 & -33 | 0 : $1_1) : $1_1;
                      $17_1 = $1_1 + -88 | 0;
                      if ($17_1 >>> 0 <= 32 >>> 0) {
                       break label$22
                      }
                      label$48 : {
                       label$49 : {
                        label$50 : {
                         label$51 : {
                          label$52 : {
                           $15_1 = $1_1 + -65 | 0;
                           if ($15_1 >>> 0 <= 6 >>> 0) {
                            break label$52
                           }
                           if (($1_1 | 0) != (83 | 0)) {
                            break label$8
                           }
                           if (!$19_1) {
                            break label$51
                           }
                           $14_1 = HEAP32[($7_1 + 64 | 0) >> 2] | 0;
                           break label$49;
                          }
                          switch ($15_1 | 0) {
                          case 2:
                           break label$50;
                          case 1:
                          case 3:
                           break label$8;
                          default:
                           break label$19;
                          };
                         }
                         $1_1 = 0;
                         $21($0_1 | 0, 32 | 0, $18_1 | 0, 0 | 0, $13_1 | 0);
                         break label$48;
                        }
                        HEAP32[($7_1 + 12 | 0) >> 2] = 0;
                        i64toi32_i32$2 = $7_1;
                        i64toi32_i32$1 = HEAP32[($7_1 + 64 | 0) >> 2] | 0;
                        i64toi32_i32$0 = HEAP32[($7_1 + 68 | 0) >> 2] | 0;
                        HEAP32[($7_1 + 8 | 0) >> 2] = i64toi32_i32$1;
                        HEAP32[($7_1 + 64 | 0) >> 2] = $7_1 + 8 | 0;
                        $19_1 = -1;
                        $14_1 = $7_1 + 8 | 0;
                       }
                       $1_1 = 0;
                       label$53 : {
                        label$54 : while (1) {
                         $15_1 = HEAP32[$14_1 >> 2] | 0;
                         if (!$15_1) {
                          break label$53
                         }
                         label$55 : {
                          $15_1 = $13($7_1 + 4 | 0 | 0, $15_1 | 0) | 0;
                          $12_1 = ($15_1 | 0) < (0 | 0);
                          if ($12_1) {
                           break label$55
                          }
                          if ($15_1 >>> 0 > ($19_1 - $1_1 | 0) >>> 0) {
                           break label$55
                          }
                          $14_1 = $14_1 + 4 | 0;
                          $1_1 = $15_1 + $1_1 | 0;
                          if ($19_1 >>> 0 > $1_1 >>> 0) {
                           continue label$54
                          }
                          break label$53;
                         }
                         break label$54;
                        };
                        $20_1 = -1;
                        if ($12_1) {
                         break label$3
                        }
                       }
                       $21($0_1 | 0, 32 | 0, $18_1 | 0, $1_1 | 0, $13_1 | 0);
                       label$56 : {
                        if ($1_1) {
                         break label$56
                        }
                        $1_1 = 0;
                        break label$48;
                       }
                       $15_1 = 0;
                       $14_1 = HEAP32[($7_1 + 64 | 0) >> 2] | 0;
                       label$57 : while (1) {
                        $12_1 = HEAP32[$14_1 >> 2] | 0;
                        if (!$12_1) {
                         break label$48
                        }
                        $12_1 = $13($7_1 + 4 | 0 | 0, $12_1 | 0) | 0;
                        $15_1 = $12_1 + $15_1 | 0;
                        if (($15_1 | 0) > ($1_1 | 0)) {
                         break label$48
                        }
                        $18($0_1 | 0, $7_1 + 4 | 0 | 0, $12_1 | 0);
                        $14_1 = $14_1 + 4 | 0;
                        if ($15_1 >>> 0 < $1_1 >>> 0) {
                         continue label$57
                        }
                        break label$57;
                       };
                      }
                      $21($0_1 | 0, 32 | 0, $18_1 | 0, $1_1 | 0, $13_1 ^ 8192 | 0 | 0);
                      $1_1 = ($18_1 | 0) > ($1_1 | 0) ? $18_1 : $1_1;
                      continue label$4;
                     }
                     $14_1 = $1_1 + 1 | 0;
                     HEAP32[($7_1 + 76 | 0) >> 2] = $14_1;
                     $13_1 = HEAPU8[($1_1 + 1 | 0) >> 0] | 0;
                     $1_1 = $14_1;
                     continue label$23;
                    };
                   }
                   switch ($17_1 | 0) {
                   case 29:
                    break label$11;
                   case 22:
                    break label$12;
                   case 24:
                    break label$14;
                   case 23:
                    break label$15;
                   case 12:
                   case 17:
                    break label$16;
                   case 11:
                    break label$17;
                   case 27:
                    break label$18;
                   case 9:
                   case 13:
                   case 14:
                   case 15:
                    break label$19;
                   case 1:
                   case 2:
                   case 3:
                   case 4:
                   case 5:
                   case 6:
                   case 7:
                   case 8:
                   case 10:
                   case 16:
                   case 18:
                   case 19:
                   case 20:
                   case 21:
                   case 25:
                   case 26:
                   case 28:
                   case 30:
                   case 31:
                    break label$8;
                   default:
                    break label$13;
                   };
                  }
                  $20_1 = $11_1;
                  if ($0_1) {
                   break label$3
                  }
                  if (!$10_1) {
                   break label$7
                  }
                  $1_1 = 1;
                  label$58 : {
                   label$59 : while (1) {
                    $13_1 = HEAP32[($4_1 + ($1_1 << 2 | 0) | 0) >> 2] | 0;
                    if (!$13_1) {
                     break label$58
                    }
                    $20($3_1 + ($1_1 << 3 | 0) | 0 | 0, $13_1 | 0, $2_1 | 0, $6_1 | 0);
                    $20_1 = 1;
                    $1_1 = $1_1 + 1 | 0;
                    if (($1_1 | 0) != (10 | 0)) {
                     continue label$59
                    }
                    break label$3;
                   };
                  }
                  $20_1 = 1;
                  if ($1_1 >>> 0 >= 10 >>> 0) {
                   break label$3
                  }
                  label$60 : while (1) {
                   if (HEAP32[($4_1 + ($1_1 << 2 | 0) | 0) >> 2] | 0) {
                    break label$20
                   }
                   $20_1 = 1;
                   $13_1 = $1_1 >>> 0 > 8 >>> 0;
                   $1_1 = $1_1 + 1 | 0;
                   if ($13_1) {
                    break label$3
                   }
                   continue label$60;
                  };
                 }
                 $20_1 = -1;
                 break label$3;
                }
                $1_1 = FUNCTION_TABLE[$5_1]($0_1, +HEAPF64[($7_1 + 64 | 0) >> 3], $18_1, $19_1, $13_1, $1_1) | 0;
                continue label$4;
               }
               $20_1 = 0;
               $1_1 = HEAP32[($7_1 + 64 | 0) >> 2] | 0;
               $12_1 = $1_1 ? $1_1 : 1098;
               $1_1 = $35($12_1 | 0, 0 | 0, $19_1 | 0) | 0;
               $14_1 = $1_1 ? $1_1 : $12_1 + $19_1 | 0;
               $13_1 = $21_1;
               $19_1 = $1_1 ? $1_1 - $12_1 | 0 : $19_1;
               break label$8;
              }
              i64toi32_i32$2 = $7_1;
              i64toi32_i32$0 = HEAP32[($7_1 + 64 | 0) >> 2] | 0;
              i64toi32_i32$1 = HEAP32[($7_1 + 68 | 0) >> 2] | 0;
              HEAP8[($7_1 + 55 | 0) >> 0] = i64toi32_i32$0;
              $19_1 = 1;
              $12_1 = $8_1;
              $14_1 = $9_1;
              $13_1 = $21_1;
              break label$8;
             }
             label$61 : {
              i64toi32_i32$2 = $7_1;
              i64toi32_i32$1 = HEAP32[($7_1 + 64 | 0) >> 2] | 0;
              i64toi32_i32$0 = HEAP32[($7_1 + 68 | 0) >> 2] | 0;
              $24_1 = i64toi32_i32$1;
              $24$hi = i64toi32_i32$0;
              i64toi32_i32$2 = i64toi32_i32$1;
              i64toi32_i32$1 = -1;
              i64toi32_i32$3 = -1;
              if ((i64toi32_i32$0 | 0) > (i64toi32_i32$1 | 0)) {
               $32_1 = 1
              } else {
               if ((i64toi32_i32$0 | 0) >= (i64toi32_i32$1 | 0)) {
                if (i64toi32_i32$2 >>> 0 <= i64toi32_i32$3 >>> 0) {
                 $33_1 = 0
                } else {
                 $33_1 = 1
                }
                $34_1 = $33_1;
               } else {
                $34_1 = 0
               }
               $32_1 = $34_1;
              }
              if ($32_1) {
               break label$61
              }
              i64toi32_i32$2 = $24$hi;
              i64toi32_i32$2 = 0;
              i64toi32_i32$3 = 0;
              i64toi32_i32$0 = $24$hi;
              i64toi32_i32$1 = $24_1;
              i64toi32_i32$5 = (i64toi32_i32$3 >>> 0 < i64toi32_i32$1 >>> 0) + i64toi32_i32$0 | 0;
              i64toi32_i32$5 = i64toi32_i32$2 - i64toi32_i32$5 | 0;
              $24_1 = i64toi32_i32$3 - i64toi32_i32$1 | 0;
              $24$hi = i64toi32_i32$5;
              i64toi32_i32$3 = $7_1;
              HEAP32[($7_1 + 64 | 0) >> 2] = $24_1;
              HEAP32[($7_1 + 68 | 0) >> 2] = i64toi32_i32$5;
              $20_1 = 1;
              $16_1 = 1088;
              break label$10;
             }
             label$62 : {
              if (!($13_1 & 2048 | 0)) {
               break label$62
              }
              $20_1 = 1;
              $16_1 = 1089;
              break label$10;
             }
             $20_1 = $13_1 & 1 | 0;
             $16_1 = $20_1 ? 1090 : 1088;
             break label$10;
            }
            i64toi32_i32$2 = $7_1;
            i64toi32_i32$5 = HEAP32[($7_1 + 64 | 0) >> 2] | 0;
            i64toi32_i32$3 = HEAP32[($7_1 + 68 | 0) >> 2] | 0;
            $12_1 = $22(i64toi32_i32$5 | 0, i64toi32_i32$3 | 0, $9_1 | 0) | 0;
            $20_1 = 0;
            $16_1 = 1088;
            if (!($13_1 & 8 | 0)) {
             break label$9
            }
            $1_1 = $9_1 - $12_1 | 0;
            $19_1 = ($19_1 | 0) > ($1_1 | 0) ? $19_1 : $1_1 + 1 | 0;
            break label$9;
           }
           $19_1 = $19_1 >>> 0 > 8 >>> 0 ? $19_1 : 8;
           $13_1 = $13_1 | 8 | 0;
           $1_1 = 120;
          }
          i64toi32_i32$2 = $7_1;
          i64toi32_i32$3 = HEAP32[($7_1 + 64 | 0) >> 2] | 0;
          i64toi32_i32$5 = HEAP32[($7_1 + 68 | 0) >> 2] | 0;
          $12_1 = $23(i64toi32_i32$3 | 0, i64toi32_i32$5 | 0, $9_1 | 0, $1_1 & 32 | 0 | 0) | 0;
          $20_1 = 0;
          $16_1 = 1088;
          if (!($13_1 & 8 | 0)) {
           break label$9
          }
          i64toi32_i32$2 = $7_1;
          i64toi32_i32$5 = HEAP32[($7_1 + 64 | 0) >> 2] | 0;
          i64toi32_i32$3 = HEAP32[($7_1 + 68 | 0) >> 2] | 0;
          if (!(i64toi32_i32$5 | i64toi32_i32$3 | 0)) {
           break label$9
          }
          $16_1 = ($1_1 >>> 4 | 0) + 1088 | 0;
          $20_1 = 2;
          break label$9;
         }
         $1_1 = 0;
         $13_1 = $15_1 & 255 | 0;
         if ($13_1 >>> 0 > 7 >>> 0) {
          continue label$4
         }
         label$63 : {
          switch ($13_1 | 0) {
          default:
           HEAP32[(HEAP32[($7_1 + 64 | 0) >> 2] | 0) >> 2] = $11_1;
           continue label$4;
          case 1:
           HEAP32[(HEAP32[($7_1 + 64 | 0) >> 2] | 0) >> 2] = $11_1;
           continue label$4;
          case 2:
           i64toi32_i32$5 = $11_1;
           i64toi32_i32$3 = i64toi32_i32$5 >> 31 | 0;
           i64toi32_i32$5 = HEAP32[($7_1 + 64 | 0) >> 2] | 0;
           HEAP32[i64toi32_i32$5 >> 2] = $11_1;
           HEAP32[(i64toi32_i32$5 + 4 | 0) >> 2] = i64toi32_i32$3;
           continue label$4;
          case 3:
           HEAP16[(HEAP32[($7_1 + 64 | 0) >> 2] | 0) >> 1] = $11_1;
           continue label$4;
          case 4:
           HEAP8[(HEAP32[($7_1 + 64 | 0) >> 2] | 0) >> 0] = $11_1;
           continue label$4;
          case 6:
           HEAP32[(HEAP32[($7_1 + 64 | 0) >> 2] | 0) >> 2] = $11_1;
           continue label$4;
          case 5:
           continue label$4;
          case 7:
           break label$63;
          };
         }
         i64toi32_i32$5 = $11_1;
         i64toi32_i32$3 = i64toi32_i32$5 >> 31 | 0;
         i64toi32_i32$5 = HEAP32[($7_1 + 64 | 0) >> 2] | 0;
         HEAP32[i64toi32_i32$5 >> 2] = $11_1;
         HEAP32[(i64toi32_i32$5 + 4 | 0) >> 2] = i64toi32_i32$3;
         continue label$4;
        }
        $20_1 = 0;
        $16_1 = 1088;
        i64toi32_i32$2 = $7_1;
        i64toi32_i32$3 = HEAP32[($7_1 + 64 | 0) >> 2] | 0;
        i64toi32_i32$5 = HEAP32[($7_1 + 68 | 0) >> 2] | 0;
        $24_1 = i64toi32_i32$3;
        $24$hi = i64toi32_i32$5;
       }
       i64toi32_i32$5 = $24$hi;
       $12_1 = $24($24_1 | 0, i64toi32_i32$5 | 0, $9_1 | 0) | 0;
      }
      $13_1 = ($19_1 | 0) > (-1 | 0) ? $13_1 & -65537 | 0 : $13_1;
      i64toi32_i32$2 = $7_1;
      i64toi32_i32$5 = HEAP32[($7_1 + 64 | 0) >> 2] | 0;
      i64toi32_i32$3 = HEAP32[($7_1 + 68 | 0) >> 2] | 0;
      $24_1 = i64toi32_i32$5;
      $24$hi = i64toi32_i32$3;
      label$70 : {
       label$71 : {
        if ($19_1) {
         break label$71
        }
        i64toi32_i32$3 = $24$hi;
        if (!!($24_1 | i64toi32_i32$3 | 0)) {
         break label$71
        }
        $19_1 = 0;
        $12_1 = $9_1;
        break label$70;
       }
       i64toi32_i32$3 = $24$hi;
       $1_1 = ($9_1 - $12_1 | 0) + !($24_1 | i64toi32_i32$3 | 0) | 0;
       $19_1 = ($19_1 | 0) > ($1_1 | 0) ? $19_1 : $1_1;
      }
      $14_1 = $9_1;
     }
     $15_1 = $14_1 - $12_1 | 0;
     $17_1 = ($19_1 | 0) < ($15_1 | 0) ? $15_1 : $19_1;
     $14_1 = $20_1 + $17_1 | 0;
     $1_1 = ($18_1 | 0) < ($14_1 | 0) ? $14_1 : $18_1;
     $21($0_1 | 0, 32 | 0, $1_1 | 0, $14_1 | 0, $13_1 | 0);
     $18($0_1 | 0, $16_1 | 0, $20_1 | 0);
     $21($0_1 | 0, 48 | 0, $1_1 | 0, $14_1 | 0, $13_1 ^ 65536 | 0 | 0);
     $21($0_1 | 0, 48 | 0, $17_1 | 0, $15_1 | 0, 0 | 0);
     $18($0_1 | 0, $12_1 | 0, $15_1 | 0);
     $21($0_1 | 0, 32 | 0, $1_1 | 0, $14_1 | 0, $13_1 ^ 8192 | 0 | 0);
     continue label$4;
    }
    break label$4;
   };
   $20_1 = 0;
  }
  label$72 : {
   $23_1 = $7_1 + 80 | 0;
   if ($23_1 >>> 0 < global$2 >>> 0) {
    fimport$7()
   }
   global$0 = $23_1;
  }
  return $20_1 | 0;
 }
 
 function $18($0_1, $1_1, $2_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  $2_1 = $2_1 | 0;
  label$1 : {
   if ((HEAPU8[$0_1 >> 0] | 0) & 32 | 0) {
    break label$1
   }
   $15($1_1 | 0, $2_1 | 0, $0_1 | 0) | 0;
  }
 }
 
 function $19($0_1) {
  $0_1 = $0_1 | 0;
  var $1_1 = 0, $2_1 = 0, $3_1 = 0;
  $1_1 = 0;
  label$1 : {
   if (!($9(HEAP8[(HEAP32[$0_1 >> 2] | 0) >> 0] | 0 | 0) | 0)) {
    break label$1
   }
   label$2 : while (1) {
    $2_1 = HEAP32[$0_1 >> 2] | 0;
    $3_1 = HEAP8[$2_1 >> 0] | 0;
    HEAP32[$0_1 >> 2] = $2_1 + 1 | 0;
    $1_1 = ($3_1 + Math_imul($1_1, 10) | 0) + -48 | 0;
    if ($9(HEAP8[($2_1 + 1 | 0) >> 0] | 0 | 0) | 0) {
     continue label$2
    }
    break label$2;
   };
  }
  return $1_1 | 0;
 }
 
 function $20($0_1, $1_1, $2_1, $3_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  $2_1 = $2_1 | 0;
  $3_1 = $3_1 | 0;
  var i64toi32_i32$1 = 0, i64toi32_i32$0 = 0, $26_1 = 0, $34_1 = 0, $44_1 = 0, $52_1 = 0, $60_1 = 0, $68_1 = 0, $76_1 = 0, $86_1 = 0;
  label$1 : {
   if ($1_1 >>> 0 > 20 >>> 0) {
    break label$1
   }
   $1_1 = $1_1 + -9 | 0;
   if ($1_1 >>> 0 > 9 >>> 0) {
    break label$1
   }
   label$2 : {
    switch ($1_1 | 0) {
    default:
     $1_1 = HEAP32[$2_1 >> 2] | 0;
     HEAP32[$2_1 >> 2] = $1_1 + 4 | 0;
     HEAP32[$0_1 >> 2] = HEAP32[$1_1 >> 2] | 0;
     return;
    case 1:
     $1_1 = HEAP32[$2_1 >> 2] | 0;
     HEAP32[$2_1 >> 2] = $1_1 + 4 | 0;
     i64toi32_i32$0 = HEAP32[$1_1 >> 2] | 0;
     i64toi32_i32$1 = i64toi32_i32$0 >> 31 | 0;
     $26_1 = i64toi32_i32$0;
     i64toi32_i32$0 = $0_1;
     HEAP32[i64toi32_i32$0 >> 2] = $26_1;
     HEAP32[(i64toi32_i32$0 + 4 | 0) >> 2] = i64toi32_i32$1;
     return;
    case 2:
     $1_1 = HEAP32[$2_1 >> 2] | 0;
     HEAP32[$2_1 >> 2] = $1_1 + 4 | 0;
     i64toi32_i32$1 = HEAP32[$1_1 >> 2] | 0;
     i64toi32_i32$0 = 0;
     $34_1 = i64toi32_i32$1;
     i64toi32_i32$1 = $0_1;
     HEAP32[i64toi32_i32$1 >> 2] = $34_1;
     HEAP32[(i64toi32_i32$1 + 4 | 0) >> 2] = i64toi32_i32$0;
     return;
    case 3:
     $1_1 = ((HEAP32[$2_1 >> 2] | 0) + 7 | 0) & -8 | 0;
     HEAP32[$2_1 >> 2] = $1_1 + 8 | 0;
     i64toi32_i32$0 = HEAP32[$1_1 >> 2] | 0;
     i64toi32_i32$1 = HEAP32[($1_1 + 4 | 0) >> 2] | 0;
     $44_1 = i64toi32_i32$0;
     i64toi32_i32$0 = $0_1;
     HEAP32[i64toi32_i32$0 >> 2] = $44_1;
     HEAP32[(i64toi32_i32$0 + 4 | 0) >> 2] = i64toi32_i32$1;
     return;
    case 4:
     $1_1 = HEAP32[$2_1 >> 2] | 0;
     HEAP32[$2_1 >> 2] = $1_1 + 4 | 0;
     i64toi32_i32$1 = HEAP16[$1_1 >> 1] | 0;
     i64toi32_i32$0 = i64toi32_i32$1 >> 31 | 0;
     $52_1 = i64toi32_i32$1;
     i64toi32_i32$1 = $0_1;
     HEAP32[i64toi32_i32$1 >> 2] = $52_1;
     HEAP32[(i64toi32_i32$1 + 4 | 0) >> 2] = i64toi32_i32$0;
     return;
    case 5:
     $1_1 = HEAP32[$2_1 >> 2] | 0;
     HEAP32[$2_1 >> 2] = $1_1 + 4 | 0;
     i64toi32_i32$0 = HEAPU16[$1_1 >> 1] | 0;
     i64toi32_i32$1 = 0;
     $60_1 = i64toi32_i32$0;
     i64toi32_i32$0 = $0_1;
     HEAP32[i64toi32_i32$0 >> 2] = $60_1;
     HEAP32[(i64toi32_i32$0 + 4 | 0) >> 2] = i64toi32_i32$1;
     return;
    case 6:
     $1_1 = HEAP32[$2_1 >> 2] | 0;
     HEAP32[$2_1 >> 2] = $1_1 + 4 | 0;
     i64toi32_i32$1 = HEAP8[$1_1 >> 0] | 0;
     i64toi32_i32$0 = i64toi32_i32$1 >> 31 | 0;
     $68_1 = i64toi32_i32$1;
     i64toi32_i32$1 = $0_1;
     HEAP32[i64toi32_i32$1 >> 2] = $68_1;
     HEAP32[(i64toi32_i32$1 + 4 | 0) >> 2] = i64toi32_i32$0;
     return;
    case 7:
     $1_1 = HEAP32[$2_1 >> 2] | 0;
     HEAP32[$2_1 >> 2] = $1_1 + 4 | 0;
     i64toi32_i32$0 = HEAPU8[$1_1 >> 0] | 0;
     i64toi32_i32$1 = 0;
     $76_1 = i64toi32_i32$0;
     i64toi32_i32$0 = $0_1;
     HEAP32[i64toi32_i32$0 >> 2] = $76_1;
     HEAP32[(i64toi32_i32$0 + 4 | 0) >> 2] = i64toi32_i32$1;
     return;
    case 8:
     $1_1 = ((HEAP32[$2_1 >> 2] | 0) + 7 | 0) & -8 | 0;
     HEAP32[$2_1 >> 2] = $1_1 + 8 | 0;
     i64toi32_i32$1 = HEAP32[$1_1 >> 2] | 0;
     i64toi32_i32$0 = HEAP32[($1_1 + 4 | 0) >> 2] | 0;
     $86_1 = i64toi32_i32$1;
     i64toi32_i32$1 = $0_1;
     HEAP32[i64toi32_i32$1 >> 2] = $86_1;
     HEAP32[(i64toi32_i32$1 + 4 | 0) >> 2] = i64toi32_i32$0;
     return;
    case 9:
     break label$2;
    };
   }
   FUNCTION_TABLE[$3_1]($0_1, $2_1);
  }
 }
 
 function $21($0_1, $1_1, $2_1, $3_1, $4_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  $2_1 = $2_1 | 0;
  $3_1 = $3_1 | 0;
  $4_1 = $4_1 | 0;
  var $5_1 = 0, $6_1 = 0, $8_1 = 0, $7_1 = 0;
  label$1 : {
   $5_1 = global$0 - 256 | 0;
   $7_1 = $5_1;
   if ($5_1 >>> 0 < global$2 >>> 0) {
    fimport$7()
   }
   global$0 = $7_1;
  }
  label$3 : {
   if (($2_1 | 0) <= ($3_1 | 0)) {
    break label$3
   }
   if ($4_1 & 73728 | 0) {
    break label$3
   }
   $4_1 = $2_1 - $3_1 | 0;
   $6_1 = $4_1 >>> 0 < 256 >>> 0;
   $72($5_1 | 0, $1_1 | 0, ($6_1 ? $4_1 : 256) | 0) | 0;
   label$4 : {
    if ($6_1) {
     break label$4
    }
    $2_1 = $2_1 - $3_1 | 0;
    label$5 : while (1) {
     $18($0_1 | 0, $5_1 | 0, 256 | 0);
     $4_1 = $4_1 + -256 | 0;
     if ($4_1 >>> 0 > 255 >>> 0) {
      continue label$5
     }
     break label$5;
    };
    $4_1 = $2_1 & 255 | 0;
   }
   $18($0_1 | 0, $5_1 | 0, $4_1 | 0);
  }
  label$6 : {
   $8_1 = $5_1 + 256 | 0;
   if ($8_1 >>> 0 < global$2 >>> 0) {
    fimport$7()
   }
   global$0 = $8_1;
  }
 }
 
 function $22($0_1, $0$hi, $1_1) {
  $0_1 = $0_1 | 0;
  $0$hi = $0$hi | 0;
  $1_1 = $1_1 | 0;
  var i64toi32_i32$0 = 0, i64toi32_i32$4 = 0, i64toi32_i32$1 = 0, i64toi32_i32$3 = 0, i64toi32_i32$2 = 0, $8_1 = 0;
  label$1 : {
   i64toi32_i32$0 = $0$hi;
   if (!($0_1 | i64toi32_i32$0 | 0)) {
    break label$1
   }
   label$2 : while (1) {
    $1_1 = $1_1 + -1 | 0;
    i64toi32_i32$0 = $0$hi;
    HEAP8[$1_1 >> 0] = $0_1 & 7 | 0 | 48 | 0;
    i64toi32_i32$2 = $0_1;
    i64toi32_i32$1 = 0;
    i64toi32_i32$3 = 3;
    i64toi32_i32$4 = i64toi32_i32$3 & 31 | 0;
    if (32 >>> 0 <= (i64toi32_i32$3 & 63 | 0) >>> 0) {
     i64toi32_i32$1 = 0;
     $8_1 = i64toi32_i32$0 >>> i64toi32_i32$4 | 0;
    } else {
     i64toi32_i32$1 = i64toi32_i32$0 >>> i64toi32_i32$4 | 0;
     $8_1 = (((1 << i64toi32_i32$4 | 0) - 1 | 0) & i64toi32_i32$0 | 0) << (32 - i64toi32_i32$4 | 0) | 0 | (i64toi32_i32$2 >>> i64toi32_i32$4 | 0) | 0;
    }
    $0_1 = $8_1;
    $0$hi = i64toi32_i32$1;
    i64toi32_i32$0 = $0_1;
    i64toi32_i32$2 = 0;
    i64toi32_i32$3 = 0;
    if ((i64toi32_i32$0 | 0) != (i64toi32_i32$3 | 0) | (i64toi32_i32$1 | 0) != (i64toi32_i32$2 | 0) | 0) {
     continue label$2
    }
    break label$2;
   };
  }
  return $1_1 | 0;
 }
 
 function $23($0_1, $0$hi, $1_1, $2_1) {
  $0_1 = $0_1 | 0;
  $0$hi = $0$hi | 0;
  $1_1 = $1_1 | 0;
  $2_1 = $2_1 | 0;
  var i64toi32_i32$0 = 0, i64toi32_i32$4 = 0, i64toi32_i32$1 = 0, i64toi32_i32$3 = 0, i64toi32_i32$2 = 0, $9_1 = 0;
  label$1 : {
   i64toi32_i32$0 = $0$hi;
   if (!($0_1 | i64toi32_i32$0 | 0)) {
    break label$1
   }
   label$2 : while (1) {
    $1_1 = $1_1 + -1 | 0;
    i64toi32_i32$0 = $0$hi;
    HEAP8[$1_1 >> 0] = HEAPU8[(($0_1 & 15 | 0) + 1584 | 0) >> 0] | 0 | $2_1 | 0;
    i64toi32_i32$2 = $0_1;
    i64toi32_i32$1 = 0;
    i64toi32_i32$3 = 4;
    i64toi32_i32$4 = i64toi32_i32$3 & 31 | 0;
    if (32 >>> 0 <= (i64toi32_i32$3 & 63 | 0) >>> 0) {
     i64toi32_i32$1 = 0;
     $9_1 = i64toi32_i32$0 >>> i64toi32_i32$4 | 0;
    } else {
     i64toi32_i32$1 = i64toi32_i32$0 >>> i64toi32_i32$4 | 0;
     $9_1 = (((1 << i64toi32_i32$4 | 0) - 1 | 0) & i64toi32_i32$0 | 0) << (32 - i64toi32_i32$4 | 0) | 0 | (i64toi32_i32$2 >>> i64toi32_i32$4 | 0) | 0;
    }
    $0_1 = $9_1;
    $0$hi = i64toi32_i32$1;
    i64toi32_i32$0 = $0_1;
    i64toi32_i32$2 = 0;
    i64toi32_i32$3 = 0;
    if ((i64toi32_i32$0 | 0) != (i64toi32_i32$3 | 0) | (i64toi32_i32$1 | 0) != (i64toi32_i32$2 | 0) | 0) {
     continue label$2
    }
    break label$2;
   };
  }
  return $1_1 | 0;
 }
 
 function $24($0_1, $0$hi, $1_1) {
  $0_1 = $0_1 | 0;
  $0$hi = $0$hi | 0;
  $1_1 = $1_1 | 0;
  var i64toi32_i32$2 = 0, i64toi32_i32$0 = 0, i64toi32_i32$1 = 0, $2_1 = 0, i64toi32_i32$3 = 0, $5_1 = 0, i64toi32_i32$5 = 0, $5$hi = 0, $3_1 = 0, $16_1 = 0, $16$hi = 0, $4_1 = 0;
  label$1 : {
   label$2 : {
    i64toi32_i32$0 = $0$hi;
    i64toi32_i32$2 = $0_1;
    i64toi32_i32$1 = 1;
    i64toi32_i32$3 = 0;
    if (i64toi32_i32$0 >>> 0 > i64toi32_i32$1 >>> 0 | ((i64toi32_i32$0 | 0) == (i64toi32_i32$1 | 0) & i64toi32_i32$2 >>> 0 >= i64toi32_i32$3 >>> 0 | 0) | 0) {
     break label$2
    }
    i64toi32_i32$2 = $0$hi;
    $5_1 = $0_1;
    $5$hi = i64toi32_i32$2;
    break label$1;
   }
   label$3 : while (1) {
    $1_1 = $1_1 + -1 | 0;
    i64toi32_i32$2 = $0$hi;
    i64toi32_i32$0 = 0;
    i64toi32_i32$0 = __wasm_i64_udiv($0_1 | 0, i64toi32_i32$2 | 0, 10 | 0, i64toi32_i32$0 | 0) | 0;
    i64toi32_i32$2 = i64toi32_i32$HIGH_BITS;
    $5_1 = i64toi32_i32$0;
    $5$hi = i64toi32_i32$2;
    i64toi32_i32$0 = 0;
    i64toi32_i32$0 = __wasm_i64_mul($5_1 | 0, i64toi32_i32$2 | 0, 10 | 0, i64toi32_i32$0 | 0) | 0;
    i64toi32_i32$2 = i64toi32_i32$HIGH_BITS;
    $16_1 = i64toi32_i32$0;
    $16$hi = i64toi32_i32$2;
    i64toi32_i32$2 = $0$hi;
    i64toi32_i32$3 = $0_1;
    i64toi32_i32$0 = $16$hi;
    i64toi32_i32$1 = $16_1;
    i64toi32_i32$5 = ($0_1 >>> 0 < i64toi32_i32$1 >>> 0) + i64toi32_i32$0 | 0;
    i64toi32_i32$5 = i64toi32_i32$2 - i64toi32_i32$5 | 0;
    HEAP8[$1_1 >> 0] = $0_1 - i64toi32_i32$1 | 0 | 48 | 0;
    i64toi32_i32$5 = i64toi32_i32$2;
    i64toi32_i32$5 = i64toi32_i32$2;
    i64toi32_i32$2 = $0_1;
    i64toi32_i32$3 = 9;
    i64toi32_i32$1 = -1;
    $2_1 = $0$hi >>> 0 > i64toi32_i32$3 >>> 0 | (($0$hi | 0) == (i64toi32_i32$3 | 0) & i64toi32_i32$2 >>> 0 > i64toi32_i32$1 >>> 0 | 0) | 0;
    i64toi32_i32$2 = $5$hi;
    $0_1 = $5_1;
    $0$hi = i64toi32_i32$2;
    if ($2_1) {
     continue label$3
    }
    break label$3;
   };
  }
  label$4 : {
   i64toi32_i32$2 = $5$hi;
   $2_1 = $5_1;
   if (!$2_1) {
    break label$4
   }
   label$5 : while (1) {
    $1_1 = $1_1 + -1 | 0;
    $3_1 = ($2_1 >>> 0) / (10 >>> 0) | 0;
    HEAP8[$1_1 >> 0] = $2_1 - Math_imul($3_1, 10) | 0 | 48 | 0;
    $4_1 = $2_1 >>> 0 > 9 >>> 0;
    $2_1 = $3_1;
    if ($4_1) {
     continue label$5
    }
    break label$5;
   };
  }
  return $1_1 | 0;
 }
 
 function $25($0_1, $1_1, $2_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  $2_1 = $2_1 | 0;
  return $16($0_1 | 0, $1_1 | 0, $2_1 | 0, 4 | 0, 5 | 0) | 0 | 0;
 }
 
 function $26($0_1, $1_1, $2_1, $3_1, $4_1, $5_1) {
  $0_1 = $0_1 | 0;
  $1_1 = +$1_1;
  $2_1 = $2_1 | 0;
  $3_1 = $3_1 | 0;
  $4_1 = $4_1 | 0;
  $5_1 = $5_1 | 0;
  var $10_1 = 0, $18_1 = 0, $16_1 = 0, $13_1 = 0, $6_1 = 0, i64toi32_i32$1 = 0, $14_1 = 0, $9_1 = 0, i64toi32_i32$0 = 0, $17_1 = 0, i64toi32_i32$4 = 0, i64toi32_i32$2 = 0, i64toi32_i32$3 = 0, i64toi32_i32$5 = 0, $15_1 = 0, $19_1 = 0, $11_1 = 0, $26_1 = 0.0, $20_1 = 0, $7_1 = 0, $24_1 = 0, $12_1 = 0, $21_1 = 0, $24$hi = 0, $8_1 = 0, $44_1 = 0, $45_1 = 0, $46_1 = 0, $25$hi = 0, $47_1 = 0, $23_1 = 0, $22_1 = 0, $134 = 0, $25_1 = 0, $325 = 0, $327$hi = 0, $329$hi = 0, $331 = 0, $331$hi = 0, $333$hi = 0, $337 = 0, $337$hi = 0;
  label$1 : {
   $6_1 = global$0 - 560 | 0;
   $22_1 = $6_1;
   if ($6_1 >>> 0 < global$2 >>> 0) {
    fimport$7()
   }
   global$0 = $22_1;
  }
  HEAP32[($6_1 + 44 | 0) >> 2] = 0;
  label$3 : {
   label$4 : {
    i64toi32_i32$0 = $28(+$1_1) | 0;
    i64toi32_i32$1 = i64toi32_i32$HIGH_BITS;
    $24_1 = i64toi32_i32$0;
    $24$hi = i64toi32_i32$1;
    i64toi32_i32$2 = i64toi32_i32$0;
    i64toi32_i32$0 = -1;
    i64toi32_i32$3 = -1;
    if ((i64toi32_i32$1 | 0) > (i64toi32_i32$0 | 0)) {
     $44_1 = 1
    } else {
     if ((i64toi32_i32$1 | 0) >= (i64toi32_i32$0 | 0)) {
      if (i64toi32_i32$2 >>> 0 <= i64toi32_i32$3 >>> 0) {
       $45_1 = 0
      } else {
       $45_1 = 1
      }
      $46_1 = $45_1;
     } else {
      $46_1 = 0
     }
     $44_1 = $46_1;
    }
    if ($44_1) {
     break label$4
    }
    $1_1 = -$1_1;
    i64toi32_i32$2 = $28(+$1_1) | 0;
    i64toi32_i32$1 = i64toi32_i32$HIGH_BITS;
    $24_1 = i64toi32_i32$2;
    $24$hi = i64toi32_i32$1;
    $7_1 = 1;
    $8_1 = 1600;
    break label$3;
   }
   label$5 : {
    if (!($4_1 & 2048 | 0)) {
     break label$5
    }
    $7_1 = 1;
    $8_1 = 1603;
    break label$3;
   }
   $7_1 = $4_1 & 1 | 0;
   $8_1 = $7_1 ? 1606 : 1601;
  }
  label$6 : {
   label$7 : {
    i64toi32_i32$1 = $24$hi;
    i64toi32_i32$3 = $24_1;
    i64toi32_i32$2 = 2146435072;
    i64toi32_i32$0 = 0;
    i64toi32_i32$2 = i64toi32_i32$1 & i64toi32_i32$2 | 0;
    i64toi32_i32$1 = i64toi32_i32$3 & i64toi32_i32$0 | 0;
    i64toi32_i32$3 = 2146435072;
    i64toi32_i32$0 = 0;
    if ((i64toi32_i32$1 | 0) != (i64toi32_i32$0 | 0) | (i64toi32_i32$2 | 0) != (i64toi32_i32$3 | 0) | 0) {
     break label$7
    }
    $9_1 = $7_1 + 3 | 0;
    $21($0_1 | 0, 32 | 0, $2_1 | 0, $9_1 | 0, $4_1 & -65537 | 0 | 0);
    $18($0_1 | 0, $8_1 | 0, $7_1 | 0);
    $10_1 = ($5_1 >>> 5 | 0) & 1 | 0;
    $18($0_1 | 0, ($1_1 != $1_1 ? ($10_1 ? 1627 : 1631) : $10_1 ? 1619 : 1623) | 0, 3 | 0);
    $21($0_1 | 0, 32 | 0, $2_1 | 0, $9_1 | 0, $4_1 ^ 8192 | 0 | 0);
    break label$6;
   }
   label$8 : {
    $1_1 = +$14(+$1_1, $6_1 + 44 | 0 | 0);
    $1_1 = $1_1 + $1_1;
    if ($1_1 == 0.0) {
     break label$8
    }
    HEAP32[($6_1 + 44 | 0) >> 2] = (HEAP32[($6_1 + 44 | 0) >> 2] | 0) + -1 | 0;
   }
   $11_1 = $6_1 + 16 | 0;
   label$9 : {
    $12_1 = $5_1 | 32 | 0;
    if (($12_1 | 0) != (97 | 0)) {
     break label$9
    }
    $13_1 = $5_1 & 32 | 0;
    $14_1 = $13_1 ? $8_1 + 9 | 0 : $8_1;
    label$10 : {
     if ($3_1 >>> 0 > 11 >>> 0) {
      break label$10
     }
     $10_1 = 12 - $3_1 | 0;
     if (!$10_1) {
      break label$10
     }
     $26_1 = 8.0;
     label$11 : while (1) {
      $26_1 = $26_1 * 16.0;
      $10_1 = $10_1 + -1 | 0;
      if ($10_1) {
       continue label$11
      }
      break label$11;
     };
     label$12 : {
      if ((HEAPU8[$14_1 >> 0] | 0 | 0) != (45 | 0)) {
       break label$12
      }
      $1_1 = -($26_1 + (-$1_1 - $26_1));
      break label$10;
     }
     $1_1 = $1_1 + $26_1 - $26_1;
    }
    label$13 : {
     $10_1 = HEAP32[($6_1 + 44 | 0) >> 2] | 0;
     $134 = $10_1;
     $10_1 = $10_1 >> 31 | 0;
     i64toi32_i32$1 = 0;
     $10_1 = $24(($134 + $10_1 | 0) ^ $10_1 | 0 | 0, i64toi32_i32$1 | 0, $11_1 | 0) | 0;
     if (($10_1 | 0) != ($11_1 | 0)) {
      break label$13
     }
     HEAP8[($6_1 + 15 | 0) >> 0] = 48;
     $10_1 = $6_1 + 15 | 0;
    }
    $15_1 = $7_1 | 2 | 0;
    $16_1 = HEAP32[($6_1 + 44 | 0) >> 2] | 0;
    $17_1 = $10_1 + -2 | 0;
    HEAP8[$17_1 >> 0] = $5_1 + 15 | 0;
    HEAP8[($10_1 + -1 | 0) >> 0] = ($16_1 | 0) < (0 | 0) ? 45 : 43;
    $18_1 = $4_1 & 8 | 0;
    $16_1 = $6_1 + 16 | 0;
    label$14 : while (1) {
     $10_1 = $16_1;
     label$15 : {
      label$16 : {
       if (!(Math_abs($1_1) < 2147483648.0)) {
        break label$16
       }
       $16_1 = ~~$1_1;
       break label$15;
      }
      $16_1 = -2147483648;
     }
     HEAP8[$10_1 >> 0] = HEAPU8[($16_1 + 1584 | 0) >> 0] | 0 | $13_1 | 0;
     $1_1 = ($1_1 - +($16_1 | 0)) * 16.0;
     label$17 : {
      $16_1 = $10_1 + 1 | 0;
      if (($16_1 - ($6_1 + 16 | 0) | 0 | 0) != (1 | 0)) {
       break label$17
      }
      label$18 : {
       if ($18_1) {
        break label$18
       }
       if (($3_1 | 0) > (0 | 0)) {
        break label$18
       }
       if ($1_1 == 0.0) {
        break label$17
       }
      }
      HEAP8[($10_1 + 1 | 0) >> 0] = 46;
      $16_1 = $10_1 + 2 | 0;
     }
     if ($1_1 != 0.0) {
      continue label$14
     }
     break label$14;
    };
    label$19 : {
     label$20 : {
      if (!$3_1) {
       break label$20
      }
      if ((($16_1 - ($6_1 + 16 | 0) | 0) + -2 | 0 | 0) >= ($3_1 | 0)) {
       break label$20
      }
      $10_1 = (($3_1 + $11_1 | 0) - $17_1 | 0) + 2 | 0;
      break label$19;
     }
     $10_1 = (($11_1 - ($6_1 + 16 | 0) | 0) - $17_1 | 0) + $16_1 | 0;
    }
    $9_1 = $10_1 + $15_1 | 0;
    $21($0_1 | 0, 32 | 0, $2_1 | 0, $9_1 | 0, $4_1 | 0);
    $18($0_1 | 0, $14_1 | 0, $15_1 | 0);
    $21($0_1 | 0, 48 | 0, $2_1 | 0, $9_1 | 0, $4_1 ^ 65536 | 0 | 0);
    $16_1 = $16_1 - ($6_1 + 16 | 0) | 0;
    $18($0_1 | 0, $6_1 + 16 | 0 | 0, $16_1 | 0);
    $13_1 = $11_1 - $17_1 | 0;
    $21($0_1 | 0, 48 | 0, $10_1 - ($16_1 + $13_1 | 0) | 0 | 0, 0 | 0, 0 | 0);
    $18($0_1 | 0, $17_1 | 0, $13_1 | 0);
    $21($0_1 | 0, 32 | 0, $2_1 | 0, $9_1 | 0, $4_1 ^ 8192 | 0 | 0);
    break label$6;
   }
   $10_1 = ($3_1 | 0) < (0 | 0);
   label$21 : {
    label$22 : {
     if ($1_1 != 0.0) {
      break label$22
     }
     $18_1 = HEAP32[($6_1 + 44 | 0) >> 2] | 0;
     break label$21;
    }
    $18_1 = (HEAP32[($6_1 + 44 | 0) >> 2] | 0) + -28 | 0;
    HEAP32[($6_1 + 44 | 0) >> 2] = $18_1;
    $1_1 = $1_1 * 268435456.0;
   }
   $14_1 = $10_1 ? 6 : $3_1;
   $19_1 = ($18_1 | 0) < (0 | 0) ? $6_1 + 48 | 0 : $6_1 + 336 | 0;
   $13_1 = $19_1;
   label$23 : while (1) {
    label$24 : {
     label$25 : {
      if (!($1_1 < 4294967296.0 & $1_1 >= 0.0 | 0)) {
       break label$25
      }
      $10_1 = ~~$1_1 >>> 0;
      break label$24;
     }
     $10_1 = 0;
    }
    HEAP32[$13_1 >> 2] = $10_1;
    $13_1 = $13_1 + 4 | 0;
    $1_1 = ($1_1 - +($10_1 >>> 0)) * 1.0e9;
    if ($1_1 != 0.0) {
     continue label$23
    }
    break label$23;
   };
   label$26 : {
    label$27 : {
     if (($18_1 | 0) >= (1 | 0)) {
      break label$27
     }
     $10_1 = $13_1;
     $16_1 = $19_1;
     break label$26;
    }
    $16_1 = $19_1;
    label$28 : while (1) {
     $18_1 = ($18_1 | 0) < (29 | 0) ? $18_1 : 29;
     label$29 : {
      $10_1 = $13_1 + -4 | 0;
      if ($10_1 >>> 0 < $16_1 >>> 0) {
       break label$29
      }
      i64toi32_i32$1 = 0;
      $25_1 = $18_1;
      $25$hi = i64toi32_i32$1;
      i64toi32_i32$1 = 0;
      $24_1 = 0;
      $24$hi = i64toi32_i32$1;
      label$30 : while (1) {
       $325 = $10_1;
       i64toi32_i32$0 = $10_1;
       i64toi32_i32$1 = HEAP32[$10_1 >> 2] | 0;
       i64toi32_i32$2 = 0;
       $327$hi = i64toi32_i32$2;
       i64toi32_i32$2 = $25$hi;
       i64toi32_i32$2 = $327$hi;
       i64toi32_i32$0 = i64toi32_i32$1;
       i64toi32_i32$1 = $25$hi;
       i64toi32_i32$3 = $25_1;
       i64toi32_i32$4 = i64toi32_i32$3 & 31 | 0;
       if (32 >>> 0 <= (i64toi32_i32$3 & 63 | 0) >>> 0) {
        i64toi32_i32$1 = i64toi32_i32$0 << i64toi32_i32$4 | 0;
        $47_1 = 0;
       } else {
        i64toi32_i32$1 = ((1 << i64toi32_i32$4 | 0) - 1 | 0) & (i64toi32_i32$0 >>> (32 - i64toi32_i32$4 | 0) | 0) | 0 | (i64toi32_i32$2 << i64toi32_i32$4 | 0) | 0;
        $47_1 = i64toi32_i32$0 << i64toi32_i32$4 | 0;
       }
       $329$hi = i64toi32_i32$1;
       i64toi32_i32$1 = $24$hi;
       i64toi32_i32$2 = $24_1;
       i64toi32_i32$0 = 0;
       i64toi32_i32$3 = -1;
       i64toi32_i32$0 = i64toi32_i32$1 & i64toi32_i32$0 | 0;
       $331 = i64toi32_i32$2 & i64toi32_i32$3 | 0;
       $331$hi = i64toi32_i32$0;
       i64toi32_i32$0 = $329$hi;
       i64toi32_i32$1 = $47_1;
       i64toi32_i32$2 = $331$hi;
       i64toi32_i32$3 = $331;
       i64toi32_i32$4 = i64toi32_i32$1 + i64toi32_i32$3 | 0;
       i64toi32_i32$5 = i64toi32_i32$0 + i64toi32_i32$2 | 0;
       if (i64toi32_i32$4 >>> 0 < i64toi32_i32$3 >>> 0) {
        i64toi32_i32$5 = i64toi32_i32$5 + 1 | 0
       }
       $24_1 = i64toi32_i32$4;
       $24$hi = i64toi32_i32$5;
       $333$hi = i64toi32_i32$5;
       i64toi32_i32$1 = 0;
       i64toi32_i32$1 = __wasm_i64_udiv(i64toi32_i32$4 | 0, i64toi32_i32$5 | 0, 1e9 | 0, i64toi32_i32$1 | 0) | 0;
       i64toi32_i32$5 = i64toi32_i32$HIGH_BITS;
       $24_1 = i64toi32_i32$1;
       $24$hi = i64toi32_i32$5;
       i64toi32_i32$1 = 0;
       i64toi32_i32$1 = __wasm_i64_mul($24_1 | 0, i64toi32_i32$5 | 0, 1e9 | 0, i64toi32_i32$1 | 0) | 0;
       i64toi32_i32$5 = i64toi32_i32$HIGH_BITS;
       $337 = i64toi32_i32$1;
       $337$hi = i64toi32_i32$5;
       i64toi32_i32$5 = $333$hi;
       i64toi32_i32$0 = i64toi32_i32$4;
       i64toi32_i32$1 = $337$hi;
       i64toi32_i32$3 = $337;
       i64toi32_i32$2 = i64toi32_i32$4 - i64toi32_i32$3 | 0;
       i64toi32_i32$4 = (i64toi32_i32$4 >>> 0 < i64toi32_i32$3 >>> 0) + i64toi32_i32$1 | 0;
       i64toi32_i32$4 = i64toi32_i32$5 - i64toi32_i32$4 | 0;
       HEAP32[$325 >> 2] = i64toi32_i32$2;
       $10_1 = $10_1 + -4 | 0;
       if ($10_1 >>> 0 >= $16_1 >>> 0) {
        continue label$30
       }
       break label$30;
      };
      i64toi32_i32$4 = $24$hi;
      $10_1 = $24_1;
      if (!$10_1) {
       break label$29
      }
      $16_1 = $16_1 + -4 | 0;
      HEAP32[$16_1 >> 2] = $10_1;
     }
     label$31 : {
      label$32 : while (1) {
       $10_1 = $13_1;
       if ($10_1 >>> 0 <= $16_1 >>> 0) {
        break label$31
       }
       $13_1 = $10_1 + -4 | 0;
       if (!(HEAP32[$13_1 >> 2] | 0)) {
        continue label$32
       }
       break label$32;
      };
     }
     $18_1 = (HEAP32[($6_1 + 44 | 0) >> 2] | 0) - $18_1 | 0;
     HEAP32[($6_1 + 44 | 0) >> 2] = $18_1;
     $13_1 = $10_1;
     if (($18_1 | 0) > (0 | 0)) {
      continue label$28
     }
     break label$28;
    };
   }
   label$33 : {
    if (($18_1 | 0) > (-1 | 0)) {
     break label$33
    }
    $20_1 = (($14_1 + 25 | 0 | 0) / (9 | 0) | 0) + 1 | 0;
    $21_1 = ($12_1 | 0) == (102 | 0);
    label$34 : while (1) {
     $9_1 = ($18_1 | 0) < (-9 | 0) ? 9 : 0 - $18_1 | 0;
     label$35 : {
      label$36 : {
       if ($16_1 >>> 0 < $10_1 >>> 0) {
        break label$36
       }
       $16_1 = HEAP32[$16_1 >> 2] | 0 ? $16_1 : $16_1 + 4 | 0;
       break label$35;
      }
      $17_1 = 1e9 >>> $9_1 | 0;
      $15_1 = (-1 << $9_1 | 0) ^ -1 | 0;
      $18_1 = 0;
      $13_1 = $16_1;
      label$37 : while (1) {
       $3_1 = HEAP32[$13_1 >> 2] | 0;
       HEAP32[$13_1 >> 2] = ($3_1 >>> $9_1 | 0) + $18_1 | 0;
       $18_1 = Math_imul($3_1 & $15_1 | 0, $17_1);
       $13_1 = $13_1 + 4 | 0;
       if ($13_1 >>> 0 < $10_1 >>> 0) {
        continue label$37
       }
       break label$37;
      };
      $16_1 = HEAP32[$16_1 >> 2] | 0 ? $16_1 : $16_1 + 4 | 0;
      if (!$18_1) {
       break label$35
      }
      HEAP32[$10_1 >> 2] = $18_1;
      $10_1 = $10_1 + 4 | 0;
     }
     $18_1 = (HEAP32[($6_1 + 44 | 0) >> 2] | 0) + $9_1 | 0;
     HEAP32[($6_1 + 44 | 0) >> 2] = $18_1;
     $13_1 = $21_1 ? $19_1 : $16_1;
     $10_1 = (($10_1 - $13_1 | 0) >> 2 | 0 | 0) > ($20_1 | 0) ? $13_1 + ($20_1 << 2 | 0) | 0 : $10_1;
     if (($18_1 | 0) < (0 | 0)) {
      continue label$34
     }
     break label$34;
    };
   }
   $13_1 = 0;
   label$38 : {
    if ($16_1 >>> 0 >= $10_1 >>> 0) {
     break label$38
    }
    $13_1 = Math_imul(($19_1 - $16_1 | 0) >> 2 | 0, 9);
    $18_1 = 10;
    $3_1 = HEAP32[$16_1 >> 2] | 0;
    if ($3_1 >>> 0 < 10 >>> 0) {
     break label$38
    }
    label$39 : while (1) {
     $13_1 = $13_1 + 1 | 0;
     $18_1 = Math_imul($18_1, 10);
     if ($3_1 >>> 0 >= $18_1 >>> 0) {
      continue label$39
     }
     break label$39;
    };
   }
   label$40 : {
    $18_1 = ($14_1 - (($12_1 | 0) == (102 | 0) ? 0 : $13_1) | 0) - (($14_1 | 0) != (0 | 0) & ($12_1 | 0) == (103 | 0) | 0) | 0;
    if (($18_1 | 0) >= (Math_imul(($10_1 - $19_1 | 0) >> 2 | 0, 9) + -9 | 0 | 0)) {
     break label$40
    }
    $18_1 = $18_1 + 9216 | 0;
    $9_1 = ($18_1 | 0) / (9 | 0) | 0;
    $17_1 = (($9_1 << 2 | 0) + $19_1 | 0) + -4092 | 0;
    $3_1 = 10;
    label$41 : {
     $18_1 = $18_1 - Math_imul($9_1, 9) | 0;
     if (($18_1 | 0) > (7 | 0)) {
      break label$41
     }
     label$42 : while (1) {
      $3_1 = Math_imul($3_1, 10);
      $9_1 = ($18_1 | 0) < (7 | 0);
      $18_1 = $18_1 + 1 | 0;
      if ($9_1) {
       continue label$42
      }
      break label$42;
     };
    }
    $9_1 = HEAP32[$17_1 >> 2] | 0;
    $15_1 = ($9_1 >>> 0) / ($3_1 >>> 0) | 0;
    $18_1 = $9_1 - Math_imul($15_1, $3_1) | 0;
    label$43 : {
     label$44 : {
      $20_1 = $17_1 + 4 | 0;
      if (($20_1 | 0) != ($10_1 | 0)) {
       break label$44
      }
      if (!$18_1) {
       break label$43
      }
     }
     $21_1 = $3_1 >>> 1 | 0;
     $26_1 = $18_1 >>> 0 < $21_1 >>> 0 ? .5 : ($20_1 | 0) == ($10_1 | 0) ? (($18_1 | 0) == ($21_1 | 0) ? 1.0 : 1.5) : 1.5;
     $1_1 = $15_1 & 1 | 0 ? 9007199254740994.0 : 9007199254740992.0;
     label$45 : {
      if (!$7_1) {
       break label$45
      }
      if ((HEAPU8[$8_1 >> 0] | 0 | 0) != (45 | 0)) {
       break label$45
      }
      $26_1 = -$26_1;
      $1_1 = -$1_1;
     }
     $18_1 = $9_1 - $18_1 | 0;
     HEAP32[$17_1 >> 2] = $18_1;
     if ($1_1 + $26_1 == $1_1) {
      break label$43
     }
     $13_1 = $18_1 + $3_1 | 0;
     HEAP32[$17_1 >> 2] = $13_1;
     label$46 : {
      if ($13_1 >>> 0 < 1e9 >>> 0) {
       break label$46
      }
      label$47 : while (1) {
       HEAP32[$17_1 >> 2] = 0;
       label$48 : {
        $17_1 = $17_1 + -4 | 0;
        if ($17_1 >>> 0 >= $16_1 >>> 0) {
         break label$48
        }
        $16_1 = $16_1 + -4 | 0;
        HEAP32[$16_1 >> 2] = 0;
       }
       $13_1 = (HEAP32[$17_1 >> 2] | 0) + 1 | 0;
       HEAP32[$17_1 >> 2] = $13_1;
       if ($13_1 >>> 0 > 999999999 >>> 0) {
        continue label$47
       }
       break label$47;
      };
     }
     $13_1 = Math_imul(($19_1 - $16_1 | 0) >> 2 | 0, 9);
     $18_1 = 10;
     $3_1 = HEAP32[$16_1 >> 2] | 0;
     if ($3_1 >>> 0 < 10 >>> 0) {
      break label$43
     }
     label$49 : while (1) {
      $13_1 = $13_1 + 1 | 0;
      $18_1 = Math_imul($18_1, 10);
      if ($3_1 >>> 0 >= $18_1 >>> 0) {
       continue label$49
      }
      break label$49;
     };
    }
    $18_1 = $17_1 + 4 | 0;
    $10_1 = $10_1 >>> 0 > $18_1 >>> 0 ? $18_1 : $10_1;
   }
   label$50 : {
    label$51 : while (1) {
     label$52 : {
      $18_1 = $10_1;
      if ($10_1 >>> 0 > $16_1 >>> 0) {
       break label$52
      }
      $21_1 = 0;
      break label$50;
     }
     $10_1 = $18_1 + -4 | 0;
     if (!(HEAP32[$10_1 >> 2] | 0)) {
      continue label$51
     }
     break label$51;
    };
    $21_1 = 1;
   }
   label$53 : {
    label$54 : {
     if (($12_1 | 0) == (103 | 0)) {
      break label$54
     }
     $15_1 = $4_1 & 8 | 0;
     break label$53;
    }
    $10_1 = $14_1 ? $14_1 : 1;
    $3_1 = ($10_1 | 0) > ($13_1 | 0) & ($13_1 | 0) > (-5 | 0) | 0;
    $14_1 = ($3_1 ? $13_1 ^ -1 | 0 : -1) + $10_1 | 0;
    $5_1 = ($3_1 ? -1 : -2) + $5_1 | 0;
    $15_1 = $4_1 & 8 | 0;
    if ($15_1) {
     break label$53
    }
    $10_1 = 9;
    label$55 : {
     if (!$21_1) {
      break label$55
     }
     $10_1 = 9;
     $9_1 = HEAP32[($18_1 + -4 | 0) >> 2] | 0;
     if (!$9_1) {
      break label$55
     }
     $3_1 = 10;
     $10_1 = 0;
     if (($9_1 >>> 0) % (10 >>> 0) | 0) {
      break label$55
     }
     label$56 : while (1) {
      $10_1 = $10_1 + 1 | 0;
      $3_1 = Math_imul($3_1, 10);
      if (!(($9_1 >>> 0) % ($3_1 >>> 0) | 0)) {
       continue label$56
      }
      break label$56;
     };
    }
    $3_1 = Math_imul(($18_1 - $19_1 | 0) >> 2 | 0, 9) + -9 | 0;
    label$57 : {
     if (($5_1 | 32 | 0 | 0) != (102 | 0)) {
      break label$57
     }
     $15_1 = 0;
     $10_1 = $3_1 - $10_1 | 0;
     $10_1 = ($10_1 | 0) > (0 | 0) ? $10_1 : 0;
     $14_1 = ($14_1 | 0) < ($10_1 | 0) ? $14_1 : $10_1;
     break label$53;
    }
    $15_1 = 0;
    $10_1 = ($3_1 + $13_1 | 0) - $10_1 | 0;
    $10_1 = ($10_1 | 0) > (0 | 0) ? $10_1 : 0;
    $14_1 = ($14_1 | 0) < ($10_1 | 0) ? $14_1 : $10_1;
   }
   $12_1 = $14_1 | $15_1 | 0;
   $3_1 = ($12_1 | 0) != (0 | 0);
   label$58 : {
    label$59 : {
     $17_1 = $5_1 | 32 | 0;
     if (($17_1 | 0) != (102 | 0)) {
      break label$59
     }
     $10_1 = ($13_1 | 0) > (0 | 0) ? $13_1 : 0;
     break label$58;
    }
    label$60 : {
     $10_1 = $13_1 >> 31 | 0;
     i64toi32_i32$4 = 0;
     $10_1 = $24(($13_1 + $10_1 | 0) ^ $10_1 | 0 | 0, i64toi32_i32$4 | 0, $11_1 | 0) | 0;
     if (($11_1 - $10_1 | 0 | 0) > (1 | 0)) {
      break label$60
     }
     label$61 : while (1) {
      $10_1 = $10_1 + -1 | 0;
      HEAP8[$10_1 >> 0] = 48;
      if (($11_1 - $10_1 | 0 | 0) < (2 | 0)) {
       continue label$61
      }
      break label$61;
     };
    }
    $20_1 = $10_1 + -2 | 0;
    HEAP8[$20_1 >> 0] = $5_1;
    HEAP8[($10_1 + -1 | 0) >> 0] = ($13_1 | 0) < (0 | 0) ? 45 : 43;
    $10_1 = $11_1 - $20_1 | 0;
   }
   $9_1 = ((($7_1 + $14_1 | 0) + $3_1 | 0) + $10_1 | 0) + 1 | 0;
   $21($0_1 | 0, 32 | 0, $2_1 | 0, $9_1 | 0, $4_1 | 0);
   $18($0_1 | 0, $8_1 | 0, $7_1 | 0);
   $21($0_1 | 0, 48 | 0, $2_1 | 0, $9_1 | 0, $4_1 ^ 65536 | 0 | 0);
   label$62 : {
    label$63 : {
     label$64 : {
      label$65 : {
       if (($17_1 | 0) != (102 | 0)) {
        break label$65
       }
       $17_1 = $6_1 + 16 | 0 | 8 | 0;
       $13_1 = $6_1 + 16 | 0 | 9 | 0;
       $3_1 = $16_1 >>> 0 > $19_1 >>> 0 ? $19_1 : $16_1;
       $16_1 = $3_1;
       label$66 : while (1) {
        i64toi32_i32$5 = $16_1;
        i64toi32_i32$4 = HEAP32[$16_1 >> 2] | 0;
        i64toi32_i32$0 = 0;
        $10_1 = $24(i64toi32_i32$4 | 0, i64toi32_i32$0 | 0, $13_1 | 0) | 0;
        label$67 : {
         label$68 : {
          if (($16_1 | 0) == ($3_1 | 0)) {
           break label$68
          }
          if ($10_1 >>> 0 <= ($6_1 + 16 | 0) >>> 0) {
           break label$67
          }
          label$69 : while (1) {
           $10_1 = $10_1 + -1 | 0;
           HEAP8[$10_1 >> 0] = 48;
           if ($10_1 >>> 0 > ($6_1 + 16 | 0) >>> 0) {
            continue label$69
           }
           break label$67;
          };
         }
         if (($10_1 | 0) != ($13_1 | 0)) {
          break label$67
         }
         HEAP8[($6_1 + 24 | 0) >> 0] = 48;
         $10_1 = $17_1;
        }
        $18($0_1 | 0, $10_1 | 0, $13_1 - $10_1 | 0 | 0);
        $16_1 = $16_1 + 4 | 0;
        if ($16_1 >>> 0 <= $19_1 >>> 0) {
         continue label$66
        }
        break label$66;
       };
       label$70 : {
        if (!$12_1) {
         break label$70
        }
        $18($0_1 | 0, 1635 | 0, 1 | 0);
       }
       if ($16_1 >>> 0 >= $18_1 >>> 0) {
        break label$64
       }
       if (($14_1 | 0) < (1 | 0)) {
        break label$64
       }
       label$71 : while (1) {
        label$72 : {
         i64toi32_i32$5 = $16_1;
         i64toi32_i32$0 = HEAP32[$16_1 >> 2] | 0;
         i64toi32_i32$4 = 0;
         $10_1 = $24(i64toi32_i32$0 | 0, i64toi32_i32$4 | 0, $13_1 | 0) | 0;
         if ($10_1 >>> 0 <= ($6_1 + 16 | 0) >>> 0) {
          break label$72
         }
         label$73 : while (1) {
          $10_1 = $10_1 + -1 | 0;
          HEAP8[$10_1 >> 0] = 48;
          if ($10_1 >>> 0 > ($6_1 + 16 | 0) >>> 0) {
           continue label$73
          }
          break label$73;
         };
        }
        $18($0_1 | 0, $10_1 | 0, (($14_1 | 0) < (9 | 0) ? $14_1 : 9) | 0);
        $10_1 = $14_1 + -9 | 0;
        $16_1 = $16_1 + 4 | 0;
        if ($16_1 >>> 0 >= $18_1 >>> 0) {
         break label$63
        }
        $3_1 = ($14_1 | 0) > (9 | 0);
        $14_1 = $10_1;
        if ($3_1) {
         continue label$71
        }
        break label$63;
       };
      }
      label$74 : {
       if (($14_1 | 0) < (0 | 0)) {
        break label$74
       }
       $17_1 = $21_1 ? $18_1 : $16_1 + 4 | 0;
       $19_1 = $6_1 + 16 | 0 | 8 | 0;
       $18_1 = $6_1 + 16 | 0 | 9 | 0;
       $13_1 = $16_1;
       label$75 : while (1) {
        label$76 : {
         i64toi32_i32$5 = $13_1;
         i64toi32_i32$4 = HEAP32[$13_1 >> 2] | 0;
         i64toi32_i32$0 = 0;
         $10_1 = $24(i64toi32_i32$4 | 0, i64toi32_i32$0 | 0, $18_1 | 0) | 0;
         if (($10_1 | 0) != ($18_1 | 0)) {
          break label$76
         }
         HEAP8[($6_1 + 24 | 0) >> 0] = 48;
         $10_1 = $19_1;
        }
        label$77 : {
         label$78 : {
          if (($13_1 | 0) == ($16_1 | 0)) {
           break label$78
          }
          if ($10_1 >>> 0 <= ($6_1 + 16 | 0) >>> 0) {
           break label$77
          }
          label$79 : while (1) {
           $10_1 = $10_1 + -1 | 0;
           HEAP8[$10_1 >> 0] = 48;
           if ($10_1 >>> 0 > ($6_1 + 16 | 0) >>> 0) {
            continue label$79
           }
           break label$77;
          };
         }
         $18($0_1 | 0, $10_1 | 0, 1 | 0);
         $10_1 = $10_1 + 1 | 0;
         label$80 : {
          if ($15_1) {
           break label$80
          }
          if (($14_1 | 0) < (1 | 0)) {
           break label$77
          }
         }
         $18($0_1 | 0, 1635 | 0, 1 | 0);
        }
        $3_1 = $18_1 - $10_1 | 0;
        $18($0_1 | 0, $10_1 | 0, (($14_1 | 0) > ($3_1 | 0) ? $3_1 : $14_1) | 0);
        $14_1 = $14_1 - $3_1 | 0;
        $13_1 = $13_1 + 4 | 0;
        if ($13_1 >>> 0 >= $17_1 >>> 0) {
         break label$74
        }
        if (($14_1 | 0) > (-1 | 0)) {
         continue label$75
        }
        break label$75;
       };
      }
      $21($0_1 | 0, 48 | 0, $14_1 + 18 | 0 | 0, 18 | 0, 0 | 0);
      $18($0_1 | 0, $20_1 | 0, $11_1 - $20_1 | 0 | 0);
      break label$62;
     }
     $10_1 = $14_1;
    }
    $21($0_1 | 0, 48 | 0, $10_1 + 9 | 0 | 0, 9 | 0, 0 | 0);
   }
   $21($0_1 | 0, 32 | 0, $2_1 | 0, $9_1 | 0, $4_1 ^ 8192 | 0 | 0);
  }
  label$81 : {
   $23_1 = $6_1 + 560 | 0;
   if ($23_1 >>> 0 < global$2 >>> 0) {
    fimport$7()
   }
   global$0 = $23_1;
  }
  return (($9_1 | 0) < ($2_1 | 0) ? $2_1 : $9_1) | 0;
 }
 
 function $27($0_1, $1_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  var i64toi32_i32$0 = 0, i64toi32_i32$1 = 0, i64toi32_i32$2 = 0, $2_1 = 0, $12_1 = 0, $12$hi = 0, $14_1 = 0, $14$hi = 0;
  $2_1 = ((HEAP32[$1_1 >> 2] | 0) + 15 | 0) & -16 | 0;
  HEAP32[$1_1 >> 2] = $2_1 + 16 | 0;
  i64toi32_i32$2 = $2_1;
  i64toi32_i32$0 = HEAP32[i64toi32_i32$2 >> 2] | 0;
  i64toi32_i32$1 = HEAP32[(i64toi32_i32$2 + 4 | 0) >> 2] | 0;
  $12_1 = i64toi32_i32$0;
  $12$hi = i64toi32_i32$1;
  i64toi32_i32$1 = HEAP32[(i64toi32_i32$2 + 8 | 0) >> 2] | 0;
  i64toi32_i32$0 = HEAP32[(i64toi32_i32$2 + 12 | 0) >> 2] | 0;
  $14_1 = i64toi32_i32$1;
  $14$hi = i64toi32_i32$0;
  i64toi32_i32$0 = $12$hi;
  i64toi32_i32$1 = $14$hi;
  HEAPF64[$0_1 >> 3] = +$39($12_1 | 0, i64toi32_i32$0 | 0, $14_1 | 0, i64toi32_i32$1 | 0);
 }
 
 function $28($0_1) {
  $0_1 = +$0_1;
  var i64toi32_i32$0 = 0, i64toi32_i32$1 = 0;
  wasm2js_scratch_store_f64(+$0_1);
  i64toi32_i32$0 = wasm2js_scratch_load_i32(1 | 0) | 0;
  i64toi32_i32$1 = wasm2js_scratch_load_i32(0 | 0) | 0;
  i64toi32_i32$HIGH_BITS = i64toi32_i32$0;
  return i64toi32_i32$1 | 0;
 }
 
 function $29($0_1) {
  $0_1 = $0_1 | 0;
  return 1 | 0;
 }
 
 function $30($0_1) {
  $0_1 = $0_1 | 0;
 }
 
 function $31($0_1, $1_1, $2_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  $2_1 = $2_1 | 0;
  var $4_1 = 0, $3_1 = 0, $5_1 = 0, $7_1 = 0, $6_1 = 0, $8_1 = 0, $10_1 = 0, $9_1 = 0;
  label$1 : {
   $3_1 = global$0 - 32 | 0;
   $9_1 = $3_1;
   if ($3_1 >>> 0 < global$2 >>> 0) {
    fimport$7()
   }
   global$0 = $9_1;
  }
  $4_1 = HEAP32[($0_1 + 28 | 0) >> 2] | 0;
  HEAP32[($3_1 + 16 | 0) >> 2] = $4_1;
  $5_1 = HEAP32[($0_1 + 20 | 0) >> 2] | 0;
  HEAP32[($3_1 + 28 | 0) >> 2] = $2_1;
  HEAP32[($3_1 + 24 | 0) >> 2] = $1_1;
  $1_1 = $5_1 - $4_1 | 0;
  HEAP32[($3_1 + 20 | 0) >> 2] = $1_1;
  $6_1 = $1_1 + $2_1 | 0;
  $5_1 = 2;
  $1_1 = $3_1 + 16 | 0;
  label$3 : while (1) {
   label$4 : {
    label$5 : {
     if (!($36(fimport$2(HEAP32[($0_1 + 60 | 0) >> 2] | 0 | 0, $1_1 | 0, $5_1 | 0, $3_1 + 12 | 0 | 0) | 0 | 0) | 0)) {
      break label$5
     }
     $4_1 = -1;
     HEAP32[($3_1 + 12 | 0) >> 2] = -1;
     break label$4;
    }
    $4_1 = HEAP32[($3_1 + 12 | 0) >> 2] | 0;
   }
   label$6 : {
    label$7 : {
     label$8 : {
      if (($6_1 | 0) != ($4_1 | 0)) {
       break label$8
      }
      $1_1 = HEAP32[($0_1 + 44 | 0) >> 2] | 0;
      HEAP32[($0_1 + 28 | 0) >> 2] = $1_1;
      HEAP32[($0_1 + 20 | 0) >> 2] = $1_1;
      HEAP32[($0_1 + 16 | 0) >> 2] = $1_1 + (HEAP32[($0_1 + 48 | 0) >> 2] | 0) | 0;
      $4_1 = $2_1;
      break label$7;
     }
     if (($4_1 | 0) > (-1 | 0)) {
      break label$6
     }
     $4_1 = 0;
     HEAP32[($0_1 + 28 | 0) >> 2] = 0;
     HEAP32[($0_1 + 16 | 0) >> 2] = 0;
     HEAP32[($0_1 + 20 | 0) >> 2] = 0;
     HEAP32[$0_1 >> 2] = HEAP32[$0_1 >> 2] | 0 | 32 | 0;
     if (($5_1 | 0) == (2 | 0)) {
      break label$7
     }
     $4_1 = $2_1 - (HEAP32[($1_1 + 4 | 0) >> 2] | 0) | 0;
    }
    label$9 : {
     $10_1 = $3_1 + 32 | 0;
     if ($10_1 >>> 0 < global$2 >>> 0) {
      fimport$7()
     }
     global$0 = $10_1;
    }
    return $4_1 | 0;
   }
   $7_1 = HEAP32[($1_1 + 4 | 0) >> 2] | 0;
   $8_1 = $4_1 >>> 0 > $7_1 >>> 0;
   $1_1 = $8_1 ? $1_1 + 8 | 0 : $1_1;
   $7_1 = $4_1 - ($8_1 ? $7_1 : 0) | 0;
   HEAP32[$1_1 >> 2] = (HEAP32[$1_1 >> 2] | 0) + $7_1 | 0;
   HEAP32[($1_1 + 4 | 0) >> 2] = (HEAP32[($1_1 + 4 | 0) >> 2] | 0) - $7_1 | 0;
   $6_1 = $6_1 - $4_1 | 0;
   $5_1 = $5_1 - $8_1 | 0;
   continue label$3;
  };
 }
 
 function $32() {
  fimport$3(3756 | 0);
  return 3764 | 0;
 }
 
 function $33() {
  fimport$4(3756 | 0);
 }
 
 function $34($0_1) {
  $0_1 = $0_1 | 0;
  var $1_1 = 0;
  $1_1 = HEAPU8[($0_1 + 74 | 0) >> 0] | 0;
  HEAP8[($0_1 + 74 | 0) >> 0] = $1_1 + -1 | 0 | $1_1 | 0;
  label$1 : {
   $1_1 = HEAP32[$0_1 >> 2] | 0;
   if (!($1_1 & 8 | 0)) {
    break label$1
   }
   HEAP32[$0_1 >> 2] = $1_1 | 32 | 0;
   return -1 | 0;
  }
  HEAP32[($0_1 + 4 | 0) >> 2] = 0;
  HEAP32[($0_1 + 8 | 0) >> 2] = 0;
  $1_1 = HEAP32[($0_1 + 44 | 0) >> 2] | 0;
  HEAP32[($0_1 + 28 | 0) >> 2] = $1_1;
  HEAP32[($0_1 + 20 | 0) >> 2] = $1_1;
  HEAP32[($0_1 + 16 | 0) >> 2] = $1_1 + (HEAP32[($0_1 + 48 | 0) >> 2] | 0) | 0;
  return 0 | 0;
 }
 
 function $35($0_1, $1_1, $2_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  $2_1 = $2_1 | 0;
  var $3_1 = 0, $4_1 = 0, $5_1 = 0, $6_1 = 0;
  $3_1 = ($2_1 | 0) != (0 | 0);
  label$1 : {
   label$2 : {
    label$3 : {
     label$4 : {
      if (!$2_1) {
       break label$4
      }
      if (!($0_1 & 3 | 0)) {
       break label$4
      }
      $4_1 = $1_1 & 255 | 0;
      label$5 : while (1) {
       if ((HEAPU8[$0_1 >> 0] | 0 | 0) == ($4_1 | 0)) {
        break label$3
       }
       $0_1 = $0_1 + 1 | 0;
       $2_1 = $2_1 + -1 | 0;
       $3_1 = ($2_1 | 0) != (0 | 0);
       if (!$2_1) {
        break label$4
       }
       if ($0_1 & 3 | 0) {
        continue label$5
       }
       break label$5;
      };
     }
     if (!$3_1) {
      break label$2
     }
    }
    if ((HEAPU8[$0_1 >> 0] | 0 | 0) == ($1_1 & 255 | 0 | 0)) {
     break label$1
    }
    label$6 : {
     label$7 : {
      if ($2_1 >>> 0 < 4 >>> 0) {
       break label$7
      }
      $4_1 = Math_imul($1_1 & 255 | 0, 16843009);
      $3_1 = $2_1 + -4 | 0;
      $5_1 = $3_1 & 3 | 0;
      $6_1 = (($3_1 & -4 | 0) + $0_1 | 0) + 4 | 0;
      label$8 : while (1) {
       $3_1 = (HEAP32[$0_1 >> 2] | 0) ^ $4_1 | 0;
       if ((($3_1 ^ -1 | 0) & ($3_1 + -16843009 | 0) | 0) & -2139062144 | 0) {
        break label$6
       }
       $0_1 = $0_1 + 4 | 0;
       $2_1 = $2_1 + -4 | 0;
       if ($2_1 >>> 0 > 3 >>> 0) {
        continue label$8
       }
       break label$8;
      };
      $2_1 = $5_1;
      $0_1 = $6_1;
     }
     if (!$2_1) {
      break label$2
     }
    }
    $3_1 = $1_1 & 255 | 0;
    label$9 : while (1) {
     if ((HEAPU8[$0_1 >> 0] | 0 | 0) == ($3_1 | 0)) {
      break label$1
     }
     $0_1 = $0_1 + 1 | 0;
     $2_1 = $2_1 + -1 | 0;
     if ($2_1) {
      continue label$9
     }
     break label$9;
    };
   }
   return 0 | 0;
  }
  return $0_1 | 0;
 }
 
 function $36($0_1) {
  $0_1 = $0_1 | 0;
  label$1 : {
   if ($0_1) {
    break label$1
   }
   return 0 | 0;
  }
  HEAP32[($8() | 0) >> 2] = $0_1;
  return -1 | 0;
 }
 
 function $37($0_1, $1_1, $1$hi, $2_1, $2$hi, $3_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  $1$hi = $1$hi | 0;
  $2_1 = $2_1 | 0;
  $2$hi = $2$hi | 0;
  $3_1 = $3_1 | 0;
  var i64toi32_i32$1 = 0, i64toi32_i32$0 = 0, i64toi32_i32$2 = 0, i64toi32_i32$4 = 0, i64toi32_i32$3 = 0, $4$hi = 0, $4_1 = 0, $18_1 = 0, $20_1 = 0, $21_1 = 0, $22_1 = 0, $11$hi = 0, $18$hi = 0, $19_1 = 0, $19$hi = 0, $24$hi = 0;
  label$1 : {
   label$2 : {
    label$3 : {
     if (!($3_1 & 64 | 0)) {
      break label$3
     }
     i64toi32_i32$0 = $2$hi;
     i64toi32_i32$0 = 0;
     $11$hi = i64toi32_i32$0;
     i64toi32_i32$0 = $2$hi;
     i64toi32_i32$2 = $2_1;
     i64toi32_i32$1 = $11$hi;
     i64toi32_i32$3 = $3_1 + -64 | 0;
     i64toi32_i32$4 = i64toi32_i32$3 & 31 | 0;
     if (32 >>> 0 <= (i64toi32_i32$3 & 63 | 0) >>> 0) {
      i64toi32_i32$1 = 0;
      $18_1 = i64toi32_i32$0 >>> i64toi32_i32$4 | 0;
     } else {
      i64toi32_i32$1 = i64toi32_i32$0 >>> i64toi32_i32$4 | 0;
      $18_1 = (((1 << i64toi32_i32$4 | 0) - 1 | 0) & i64toi32_i32$0 | 0) << (32 - i64toi32_i32$4 | 0) | 0 | (i64toi32_i32$2 >>> i64toi32_i32$4 | 0) | 0;
     }
     $1_1 = $18_1;
     $1$hi = i64toi32_i32$1;
     i64toi32_i32$1 = 0;
     $4_1 = 0;
     $4$hi = i64toi32_i32$1;
     i64toi32_i32$1 = 0;
     $2_1 = 0;
     $2$hi = i64toi32_i32$1;
     break label$2;
    }
    if (!$3_1) {
     break label$1
    }
    i64toi32_i32$1 = $2$hi;
    i64toi32_i32$1 = 0;
    $18$hi = i64toi32_i32$1;
    i64toi32_i32$1 = $2$hi;
    i64toi32_i32$0 = $2_1;
    i64toi32_i32$2 = $18$hi;
    i64toi32_i32$3 = 64 - $3_1 | 0;
    i64toi32_i32$4 = i64toi32_i32$3 & 31 | 0;
    if (32 >>> 0 <= (i64toi32_i32$3 & 63 | 0) >>> 0) {
     i64toi32_i32$2 = i64toi32_i32$0 << i64toi32_i32$4 | 0;
     $20_1 = 0;
    } else {
     i64toi32_i32$2 = ((1 << i64toi32_i32$4 | 0) - 1 | 0) & (i64toi32_i32$0 >>> (32 - i64toi32_i32$4 | 0) | 0) | 0 | (i64toi32_i32$1 << i64toi32_i32$4 | 0) | 0;
     $20_1 = i64toi32_i32$0 << i64toi32_i32$4 | 0;
    }
    $19_1 = $20_1;
    $19$hi = i64toi32_i32$2;
    i64toi32_i32$2 = $1$hi;
    i64toi32_i32$2 = 0;
    $4_1 = $3_1;
    $4$hi = i64toi32_i32$2;
    i64toi32_i32$2 = $1$hi;
    i64toi32_i32$1 = $1_1;
    i64toi32_i32$0 = $4$hi;
    i64toi32_i32$3 = $3_1;
    i64toi32_i32$4 = i64toi32_i32$3 & 31 | 0;
    if (32 >>> 0 <= (i64toi32_i32$3 & 63 | 0) >>> 0) {
     i64toi32_i32$0 = 0;
     $21_1 = i64toi32_i32$2 >>> i64toi32_i32$4 | 0;
    } else {
     i64toi32_i32$0 = i64toi32_i32$2 >>> i64toi32_i32$4 | 0;
     $21_1 = (((1 << i64toi32_i32$4 | 0) - 1 | 0) & i64toi32_i32$2 | 0) << (32 - i64toi32_i32$4 | 0) | 0 | (i64toi32_i32$1 >>> i64toi32_i32$4 | 0) | 0;
    }
    $24$hi = i64toi32_i32$0;
    i64toi32_i32$0 = $19$hi;
    i64toi32_i32$2 = $19_1;
    i64toi32_i32$1 = $24$hi;
    i64toi32_i32$3 = $21_1;
    i64toi32_i32$1 = i64toi32_i32$0 | i64toi32_i32$1 | 0;
    $1_1 = i64toi32_i32$2 | i64toi32_i32$3 | 0;
    $1$hi = i64toi32_i32$1;
    i64toi32_i32$1 = $2$hi;
    i64toi32_i32$1 = $4$hi;
    i64toi32_i32$1 = $2$hi;
    i64toi32_i32$0 = $2_1;
    i64toi32_i32$2 = $4$hi;
    i64toi32_i32$3 = $4_1;
    i64toi32_i32$4 = i64toi32_i32$3 & 31 | 0;
    if (32 >>> 0 <= (i64toi32_i32$3 & 63 | 0) >>> 0) {
     i64toi32_i32$2 = 0;
     $22_1 = i64toi32_i32$1 >>> i64toi32_i32$4 | 0;
    } else {
     i64toi32_i32$2 = i64toi32_i32$1 >>> i64toi32_i32$4 | 0;
     $22_1 = (((1 << i64toi32_i32$4 | 0) - 1 | 0) & i64toi32_i32$1 | 0) << (32 - i64toi32_i32$4 | 0) | 0 | (i64toi32_i32$0 >>> i64toi32_i32$4 | 0) | 0;
    }
    $2_1 = $22_1;
    $2$hi = i64toi32_i32$2;
    i64toi32_i32$2 = 0;
    $4_1 = 0;
    $4$hi = i64toi32_i32$2;
   }
   i64toi32_i32$2 = $4$hi;
   i64toi32_i32$2 = $1$hi;
   i64toi32_i32$2 = $4$hi;
   i64toi32_i32$1 = $4_1;
   i64toi32_i32$0 = $1$hi;
   i64toi32_i32$3 = $1_1;
   i64toi32_i32$0 = i64toi32_i32$2 | i64toi32_i32$0 | 0;
   $1_1 = i64toi32_i32$1 | i64toi32_i32$3 | 0;
   $1$hi = i64toi32_i32$0;
  }
  i64toi32_i32$0 = $1$hi;
  i64toi32_i32$1 = $0_1;
  HEAP32[i64toi32_i32$1 >> 2] = $1_1;
  HEAP32[(i64toi32_i32$1 + 4 | 0) >> 2] = i64toi32_i32$0;
  i64toi32_i32$0 = $2$hi;
  HEAP32[(i64toi32_i32$1 + 8 | 0) >> 2] = $2_1;
  HEAP32[(i64toi32_i32$1 + 12 | 0) >> 2] = i64toi32_i32$0;
 }
 
 function $38($0_1, $1_1, $1$hi, $2_1, $2$hi, $3_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  $1$hi = $1$hi | 0;
  $2_1 = $2_1 | 0;
  $2$hi = $2$hi | 0;
  $3_1 = $3_1 | 0;
  var i64toi32_i32$1 = 0, i64toi32_i32$0 = 0, i64toi32_i32$4 = 0, i64toi32_i32$2 = 0, i64toi32_i32$3 = 0, $4$hi = 0, $18_1 = 0, $20_1 = 0, $21_1 = 0, $22_1 = 0, $11$hi = 0, $18$hi = 0, $19_1 = 0, $19$hi = 0, $4_1 = 0, $24$hi = 0;
  label$1 : {
   label$2 : {
    label$3 : {
     if (!($3_1 & 64 | 0)) {
      break label$3
     }
     i64toi32_i32$0 = $1$hi;
     i64toi32_i32$0 = 0;
     $11$hi = i64toi32_i32$0;
     i64toi32_i32$0 = $1$hi;
     i64toi32_i32$2 = $1_1;
     i64toi32_i32$1 = $11$hi;
     i64toi32_i32$3 = $3_1 + -64 | 0;
     i64toi32_i32$4 = i64toi32_i32$3 & 31 | 0;
     if (32 >>> 0 <= (i64toi32_i32$3 & 63 | 0) >>> 0) {
      i64toi32_i32$1 = i64toi32_i32$2 << i64toi32_i32$4 | 0;
      $18_1 = 0;
     } else {
      i64toi32_i32$1 = ((1 << i64toi32_i32$4 | 0) - 1 | 0) & (i64toi32_i32$2 >>> (32 - i64toi32_i32$4 | 0) | 0) | 0 | (i64toi32_i32$0 << i64toi32_i32$4 | 0) | 0;
      $18_1 = i64toi32_i32$2 << i64toi32_i32$4 | 0;
     }
     $2_1 = $18_1;
     $2$hi = i64toi32_i32$1;
     i64toi32_i32$1 = 0;
     $1_1 = 0;
     $1$hi = i64toi32_i32$1;
     break label$2;
    }
    if (!$3_1) {
     break label$1
    }
    i64toi32_i32$1 = $1$hi;
    i64toi32_i32$1 = 0;
    $18$hi = i64toi32_i32$1;
    i64toi32_i32$1 = $1$hi;
    i64toi32_i32$0 = $1_1;
    i64toi32_i32$2 = $18$hi;
    i64toi32_i32$3 = 64 - $3_1 | 0;
    i64toi32_i32$4 = i64toi32_i32$3 & 31 | 0;
    if (32 >>> 0 <= (i64toi32_i32$3 & 63 | 0) >>> 0) {
     i64toi32_i32$2 = 0;
     $20_1 = i64toi32_i32$1 >>> i64toi32_i32$4 | 0;
    } else {
     i64toi32_i32$2 = i64toi32_i32$1 >>> i64toi32_i32$4 | 0;
     $20_1 = (((1 << i64toi32_i32$4 | 0) - 1 | 0) & i64toi32_i32$1 | 0) << (32 - i64toi32_i32$4 | 0) | 0 | (i64toi32_i32$0 >>> i64toi32_i32$4 | 0) | 0;
    }
    $19_1 = $20_1;
    $19$hi = i64toi32_i32$2;
    i64toi32_i32$2 = $2$hi;
    i64toi32_i32$2 = 0;
    $4_1 = $3_1;
    $4$hi = i64toi32_i32$2;
    i64toi32_i32$2 = $2$hi;
    i64toi32_i32$1 = $2_1;
    i64toi32_i32$0 = $4$hi;
    i64toi32_i32$3 = $3_1;
    i64toi32_i32$4 = i64toi32_i32$3 & 31 | 0;
    if (32 >>> 0 <= (i64toi32_i32$3 & 63 | 0) >>> 0) {
     i64toi32_i32$0 = i64toi32_i32$1 << i64toi32_i32$4 | 0;
     $21_1 = 0;
    } else {
     i64toi32_i32$0 = ((1 << i64toi32_i32$4 | 0) - 1 | 0) & (i64toi32_i32$1 >>> (32 - i64toi32_i32$4 | 0) | 0) | 0 | (i64toi32_i32$2 << i64toi32_i32$4 | 0) | 0;
     $21_1 = i64toi32_i32$1 << i64toi32_i32$4 | 0;
    }
    $24$hi = i64toi32_i32$0;
    i64toi32_i32$0 = $19$hi;
    i64toi32_i32$2 = $19_1;
    i64toi32_i32$1 = $24$hi;
    i64toi32_i32$3 = $21_1;
    i64toi32_i32$1 = i64toi32_i32$0 | i64toi32_i32$1 | 0;
    $2_1 = i64toi32_i32$2 | i64toi32_i32$3 | 0;
    $2$hi = i64toi32_i32$1;
    i64toi32_i32$1 = $1$hi;
    i64toi32_i32$1 = $4$hi;
    i64toi32_i32$1 = $1$hi;
    i64toi32_i32$0 = $1_1;
    i64toi32_i32$2 = $4$hi;
    i64toi32_i32$3 = $4_1;
    i64toi32_i32$4 = i64toi32_i32$3 & 31 | 0;
    if (32 >>> 0 <= (i64toi32_i32$3 & 63 | 0) >>> 0) {
     i64toi32_i32$2 = i64toi32_i32$0 << i64toi32_i32$4 | 0;
     $22_1 = 0;
    } else {
     i64toi32_i32$2 = ((1 << i64toi32_i32$4 | 0) - 1 | 0) & (i64toi32_i32$0 >>> (32 - i64toi32_i32$4 | 0) | 0) | 0 | (i64toi32_i32$1 << i64toi32_i32$4 | 0) | 0;
     $22_1 = i64toi32_i32$0 << i64toi32_i32$4 | 0;
    }
    $1_1 = $22_1;
    $1$hi = i64toi32_i32$2;
   }
   i64toi32_i32$2 = $2$hi;
   i64toi32_i32$1 = $2_1;
   i64toi32_i32$0 = 0;
   i64toi32_i32$3 = 0;
   i64toi32_i32$0 = i64toi32_i32$2 | i64toi32_i32$0 | 0;
   $2_1 = i64toi32_i32$1 | i64toi32_i32$3 | 0;
   $2$hi = i64toi32_i32$0;
  }
  i64toi32_i32$0 = $1$hi;
  i64toi32_i32$1 = $0_1;
  HEAP32[i64toi32_i32$1 >> 2] = $1_1;
  HEAP32[(i64toi32_i32$1 + 4 | 0) >> 2] = i64toi32_i32$0;
  i64toi32_i32$0 = $2$hi;
  HEAP32[(i64toi32_i32$1 + 8 | 0) >> 2] = $2_1;
  HEAP32[(i64toi32_i32$1 + 12 | 0) >> 2] = i64toi32_i32$0;
 }
 
 function $39($0_1, $0$hi, $1_1, $1$hi) {
  $0_1 = $0_1 | 0;
  $0$hi = $0$hi | 0;
  $1_1 = $1_1 | 0;
  $1$hi = $1$hi | 0;
  var i64toi32_i32$0 = 0, i64toi32_i32$5 = 0, i64toi32_i32$4 = 0, i64toi32_i32$2 = 0, i64toi32_i32$3 = 0, i64toi32_i32$1 = 0, $6_1 = 0, $6$hi = 0, $7$hi = 0, $7_1 = 0, $2_1 = 0, $3_1 = 0, $44_1 = 0, $46_1 = 0, $47_1 = 0, $48_1 = 0, $49_1 = 0, $51_1 = 0, $52_1 = 0, $5_1 = 0, $4_1 = 0, $18_1 = 0, $18$hi = 0, $20$hi = 0, $23_1 = 0, $23$hi = 0, $25$hi = 0, $39$hi = 0, $43_1 = 0, $45_1 = 0, $50_1 = 0, $50$hi = 0, $52$hi = 0, $80_1 = 0, $80$hi = 0, $84$hi = 0, $87_1 = 0, $87$hi = 0, $89_1 = 0, $89$hi = 0, $93 = 0, $93$hi = 0, $95 = 0, $96$hi = 0, $106$hi = 0, $117 = 0, $117$hi = 0;
  label$1 : {
   $2_1 = global$0 - 32 | 0;
   $4_1 = $2_1;
   if ($2_1 >>> 0 < global$2 >>> 0) {
    fimport$7()
   }
   global$0 = $4_1;
  }
  label$3 : {
   label$4 : {
    i64toi32_i32$0 = $1$hi;
    i64toi32_i32$2 = $1_1;
    i64toi32_i32$1 = 2147483647;
    i64toi32_i32$3 = -1;
    i64toi32_i32$1 = i64toi32_i32$0 & i64toi32_i32$1 | 0;
    $6_1 = i64toi32_i32$2 & i64toi32_i32$3 | 0;
    $6$hi = i64toi32_i32$1;
    i64toi32_i32$0 = $6_1;
    i64toi32_i32$2 = -1006698496;
    i64toi32_i32$3 = 0;
    i64toi32_i32$4 = i64toi32_i32$0 + i64toi32_i32$3 | 0;
    i64toi32_i32$5 = i64toi32_i32$1 + i64toi32_i32$2 | 0;
    if (i64toi32_i32$4 >>> 0 < i64toi32_i32$3 >>> 0) {
     i64toi32_i32$5 = i64toi32_i32$5 + 1 | 0
    }
    $18_1 = i64toi32_i32$4;
    $18$hi = i64toi32_i32$5;
    i64toi32_i32$5 = $6$hi;
    i64toi32_i32$1 = $6_1;
    i64toi32_i32$0 = -1140785152;
    i64toi32_i32$3 = 0;
    i64toi32_i32$2 = i64toi32_i32$1 + i64toi32_i32$3 | 0;
    i64toi32_i32$4 = i64toi32_i32$5 + i64toi32_i32$0 | 0;
    if (i64toi32_i32$2 >>> 0 < i64toi32_i32$3 >>> 0) {
     i64toi32_i32$4 = i64toi32_i32$4 + 1 | 0
    }
    $20$hi = i64toi32_i32$4;
    i64toi32_i32$4 = $18$hi;
    i64toi32_i32$5 = $18_1;
    i64toi32_i32$1 = $20$hi;
    i64toi32_i32$3 = i64toi32_i32$2;
    if (i64toi32_i32$4 >>> 0 > i64toi32_i32$1 >>> 0 | ((i64toi32_i32$4 | 0) == (i64toi32_i32$1 | 0) & i64toi32_i32$5 >>> 0 >= i64toi32_i32$3 >>> 0 | 0) | 0) {
     break label$4
    }
    i64toi32_i32$5 = $0$hi;
    i64toi32_i32$3 = $0_1;
    i64toi32_i32$4 = 0;
    i64toi32_i32$1 = 60;
    i64toi32_i32$0 = i64toi32_i32$1 & 31 | 0;
    if (32 >>> 0 <= (i64toi32_i32$1 & 63 | 0) >>> 0) {
     i64toi32_i32$4 = 0;
     $44_1 = i64toi32_i32$5 >>> i64toi32_i32$0 | 0;
    } else {
     i64toi32_i32$4 = i64toi32_i32$5 >>> i64toi32_i32$0 | 0;
     $44_1 = (((1 << i64toi32_i32$0 | 0) - 1 | 0) & i64toi32_i32$5 | 0) << (32 - i64toi32_i32$0 | 0) | 0 | (i64toi32_i32$3 >>> i64toi32_i32$0 | 0) | 0;
    }
    $23_1 = $44_1;
    $23$hi = i64toi32_i32$4;
    i64toi32_i32$4 = $1$hi;
    i64toi32_i32$5 = $1_1;
    i64toi32_i32$3 = 0;
    i64toi32_i32$1 = 4;
    i64toi32_i32$0 = i64toi32_i32$1 & 31 | 0;
    if (32 >>> 0 <= (i64toi32_i32$1 & 63 | 0) >>> 0) {
     i64toi32_i32$3 = i64toi32_i32$5 << i64toi32_i32$0 | 0;
     $46_1 = 0;
    } else {
     i64toi32_i32$3 = ((1 << i64toi32_i32$0 | 0) - 1 | 0) & (i64toi32_i32$5 >>> (32 - i64toi32_i32$0 | 0) | 0) | 0 | (i64toi32_i32$4 << i64toi32_i32$0 | 0) | 0;
     $46_1 = i64toi32_i32$5 << i64toi32_i32$0 | 0;
    }
    $25$hi = i64toi32_i32$3;
    i64toi32_i32$3 = $23$hi;
    i64toi32_i32$4 = $23_1;
    i64toi32_i32$5 = $25$hi;
    i64toi32_i32$1 = $46_1;
    i64toi32_i32$5 = i64toi32_i32$3 | i64toi32_i32$5 | 0;
    $6_1 = i64toi32_i32$4 | i64toi32_i32$1 | 0;
    $6$hi = i64toi32_i32$5;
    label$5 : {
     i64toi32_i32$5 = $0$hi;
     i64toi32_i32$3 = $0_1;
     i64toi32_i32$4 = 268435455;
     i64toi32_i32$1 = -1;
     i64toi32_i32$4 = i64toi32_i32$5 & i64toi32_i32$4 | 0;
     $0_1 = i64toi32_i32$3 & i64toi32_i32$1 | 0;
     $0$hi = i64toi32_i32$4;
     i64toi32_i32$5 = $0_1;
     i64toi32_i32$3 = 134217728;
     i64toi32_i32$1 = 1;
     if (i64toi32_i32$4 >>> 0 < i64toi32_i32$3 >>> 0 | ((i64toi32_i32$4 | 0) == (i64toi32_i32$3 | 0) & i64toi32_i32$5 >>> 0 < i64toi32_i32$1 >>> 0 | 0) | 0) {
      break label$5
     }
     i64toi32_i32$5 = $6$hi;
     i64toi32_i32$1 = $6_1;
     i64toi32_i32$4 = 1073741824;
     i64toi32_i32$3 = 1;
     i64toi32_i32$0 = i64toi32_i32$1 + i64toi32_i32$3 | 0;
     i64toi32_i32$2 = i64toi32_i32$5 + i64toi32_i32$4 | 0;
     if (i64toi32_i32$0 >>> 0 < i64toi32_i32$3 >>> 0) {
      i64toi32_i32$2 = i64toi32_i32$2 + 1 | 0
     }
     $7_1 = i64toi32_i32$0;
     $7$hi = i64toi32_i32$2;
     break label$3;
    }
    i64toi32_i32$2 = $6$hi;
    i64toi32_i32$5 = $6_1;
    i64toi32_i32$1 = 1073741824;
    i64toi32_i32$3 = 0;
    i64toi32_i32$4 = i64toi32_i32$5 + i64toi32_i32$3 | 0;
    i64toi32_i32$0 = i64toi32_i32$2 + i64toi32_i32$1 | 0;
    if (i64toi32_i32$4 >>> 0 < i64toi32_i32$3 >>> 0) {
     i64toi32_i32$0 = i64toi32_i32$0 + 1 | 0
    }
    $7_1 = i64toi32_i32$4;
    $7$hi = i64toi32_i32$0;
    i64toi32_i32$0 = $0$hi;
    i64toi32_i32$2 = $0_1;
    i64toi32_i32$5 = 134217728;
    i64toi32_i32$3 = 0;
    i64toi32_i32$5 = i64toi32_i32$0 ^ i64toi32_i32$5 | 0;
    i64toi32_i32$0 = i64toi32_i32$2 ^ i64toi32_i32$3 | 0;
    i64toi32_i32$2 = 0;
    i64toi32_i32$3 = 0;
    if ((i64toi32_i32$0 | 0) != (i64toi32_i32$3 | 0) | (i64toi32_i32$5 | 0) != (i64toi32_i32$2 | 0) | 0) {
     break label$3
    }
    i64toi32_i32$0 = $7$hi;
    i64toi32_i32$3 = $7_1;
    i64toi32_i32$5 = 0;
    i64toi32_i32$2 = 1;
    i64toi32_i32$5 = i64toi32_i32$0 & i64toi32_i32$5 | 0;
    $39$hi = i64toi32_i32$5;
    i64toi32_i32$5 = i64toi32_i32$0;
    i64toi32_i32$5 = $39$hi;
    i64toi32_i32$0 = i64toi32_i32$3 & i64toi32_i32$2 | 0;
    i64toi32_i32$3 = $7$hi;
    i64toi32_i32$2 = $7_1;
    i64toi32_i32$1 = i64toi32_i32$0 + i64toi32_i32$2 | 0;
    i64toi32_i32$4 = i64toi32_i32$5 + i64toi32_i32$3 | 0;
    if (i64toi32_i32$1 >>> 0 < i64toi32_i32$2 >>> 0) {
     i64toi32_i32$4 = i64toi32_i32$4 + 1 | 0
    }
    $7_1 = i64toi32_i32$1;
    $7$hi = i64toi32_i32$4;
    break label$3;
   }
   label$6 : {
    i64toi32_i32$4 = $0$hi;
    $43_1 = !($0_1 | i64toi32_i32$4 | 0);
    i64toi32_i32$4 = $6$hi;
    i64toi32_i32$5 = $6_1;
    i64toi32_i32$0 = 2147418112;
    i64toi32_i32$2 = 0;
    $45_1 = i64toi32_i32$4 >>> 0 < i64toi32_i32$0 >>> 0 | ((i64toi32_i32$4 | 0) == (i64toi32_i32$0 | 0) & i64toi32_i32$5 >>> 0 < i64toi32_i32$2 >>> 0 | 0) | 0;
    i64toi32_i32$5 = i64toi32_i32$4;
    i64toi32_i32$2 = $6_1;
    i64toi32_i32$4 = 2147418112;
    i64toi32_i32$0 = 0;
    if ((i64toi32_i32$2 | 0) == (i64toi32_i32$0 | 0) & (i64toi32_i32$5 | 0) == (i64toi32_i32$4 | 0) | 0 ? $43_1 : $45_1) {
     break label$6
    }
    i64toi32_i32$2 = $0$hi;
    i64toi32_i32$0 = $0_1;
    i64toi32_i32$5 = 0;
    i64toi32_i32$4 = 60;
    i64toi32_i32$3 = i64toi32_i32$4 & 31 | 0;
    if (32 >>> 0 <= (i64toi32_i32$4 & 63 | 0) >>> 0) {
     i64toi32_i32$5 = 0;
     $47_1 = i64toi32_i32$2 >>> i64toi32_i32$3 | 0;
    } else {
     i64toi32_i32$5 = i64toi32_i32$2 >>> i64toi32_i32$3 | 0;
     $47_1 = (((1 << i64toi32_i32$3 | 0) - 1 | 0) & i64toi32_i32$2 | 0) << (32 - i64toi32_i32$3 | 0) | 0 | (i64toi32_i32$0 >>> i64toi32_i32$3 | 0) | 0;
    }
    $50_1 = $47_1;
    $50$hi = i64toi32_i32$5;
    i64toi32_i32$5 = $1$hi;
    i64toi32_i32$2 = $1_1;
    i64toi32_i32$0 = 0;
    i64toi32_i32$4 = 4;
    i64toi32_i32$3 = i64toi32_i32$4 & 31 | 0;
    if (32 >>> 0 <= (i64toi32_i32$4 & 63 | 0) >>> 0) {
     i64toi32_i32$0 = i64toi32_i32$2 << i64toi32_i32$3 | 0;
     $48_1 = 0;
    } else {
     i64toi32_i32$0 = ((1 << i64toi32_i32$3 | 0) - 1 | 0) & (i64toi32_i32$2 >>> (32 - i64toi32_i32$3 | 0) | 0) | 0 | (i64toi32_i32$5 << i64toi32_i32$3 | 0) | 0;
     $48_1 = i64toi32_i32$2 << i64toi32_i32$3 | 0;
    }
    $52$hi = i64toi32_i32$0;
    i64toi32_i32$0 = $50$hi;
    i64toi32_i32$5 = $50_1;
    i64toi32_i32$2 = $52$hi;
    i64toi32_i32$4 = $48_1;
    i64toi32_i32$2 = i64toi32_i32$0 | i64toi32_i32$2 | 0;
    i64toi32_i32$0 = i64toi32_i32$5 | i64toi32_i32$4 | 0;
    i64toi32_i32$5 = 524287;
    i64toi32_i32$4 = -1;
    i64toi32_i32$5 = i64toi32_i32$2 & i64toi32_i32$5 | 0;
    i64toi32_i32$2 = i64toi32_i32$0 & i64toi32_i32$4 | 0;
    i64toi32_i32$0 = 2146959360;
    i64toi32_i32$4 = 0;
    i64toi32_i32$0 = i64toi32_i32$5 | i64toi32_i32$0 | 0;
    $7_1 = i64toi32_i32$2 | i64toi32_i32$4 | 0;
    $7$hi = i64toi32_i32$0;
    break label$3;
   }
   i64toi32_i32$0 = 2146435072;
   $7_1 = 0;
   $7$hi = i64toi32_i32$0;
   i64toi32_i32$0 = $6$hi;
   i64toi32_i32$5 = $6_1;
   i64toi32_i32$2 = 1140785151;
   i64toi32_i32$4 = -1;
   if (i64toi32_i32$0 >>> 0 > i64toi32_i32$2 >>> 0 | ((i64toi32_i32$0 | 0) == (i64toi32_i32$2 | 0) & i64toi32_i32$5 >>> 0 > i64toi32_i32$4 >>> 0 | 0) | 0) {
    break label$3
   }
   i64toi32_i32$5 = 0;
   $7_1 = 0;
   $7$hi = i64toi32_i32$5;
   i64toi32_i32$5 = $6$hi;
   i64toi32_i32$4 = $6_1;
   i64toi32_i32$0 = 0;
   i64toi32_i32$2 = 48;
   i64toi32_i32$3 = i64toi32_i32$2 & 31 | 0;
   if (32 >>> 0 <= (i64toi32_i32$2 & 63 | 0) >>> 0) {
    i64toi32_i32$0 = 0;
    $49_1 = i64toi32_i32$5 >>> i64toi32_i32$3 | 0;
   } else {
    i64toi32_i32$0 = i64toi32_i32$5 >>> i64toi32_i32$3 | 0;
    $49_1 = (((1 << i64toi32_i32$3 | 0) - 1 | 0) & i64toi32_i32$5 | 0) << (32 - i64toi32_i32$3 | 0) | 0 | (i64toi32_i32$4 >>> i64toi32_i32$3 | 0) | 0;
   }
   $3_1 = $49_1;
   if ($3_1 >>> 0 < 15249 >>> 0) {
    break label$3
   }
   i64toi32_i32$0 = $0$hi;
   i64toi32_i32$0 = $1$hi;
   i64toi32_i32$5 = $1_1;
   i64toi32_i32$4 = 65535;
   i64toi32_i32$2 = -1;
   i64toi32_i32$4 = i64toi32_i32$0 & i64toi32_i32$4 | 0;
   i64toi32_i32$0 = i64toi32_i32$5 & i64toi32_i32$2 | 0;
   i64toi32_i32$5 = 65536;
   i64toi32_i32$2 = 0;
   i64toi32_i32$5 = i64toi32_i32$4 | i64toi32_i32$5 | 0;
   $6_1 = i64toi32_i32$0 | i64toi32_i32$2 | 0;
   $6$hi = i64toi32_i32$5;
   i64toi32_i32$5 = $0$hi;
   i64toi32_i32$0 = $6$hi;
   $37($2_1 | 0, $0_1 | 0, i64toi32_i32$5 | 0, $6_1 | 0, i64toi32_i32$0 | 0, 15361 - $3_1 | 0 | 0);
   i64toi32_i32$0 = i64toi32_i32$5;
   i64toi32_i32$0 = $6$hi;
   i64toi32_i32$0 = i64toi32_i32$5;
   i64toi32_i32$5 = $6$hi;
   $38($2_1 + 16 | 0 | 0, $0_1 | 0, i64toi32_i32$0 | 0, $6_1 | 0, i64toi32_i32$5 | 0, $3_1 + -15233 | 0 | 0);
   i64toi32_i32$4 = $2_1;
   i64toi32_i32$5 = HEAP32[i64toi32_i32$4 >> 2] | 0;
   i64toi32_i32$0 = HEAP32[(i64toi32_i32$4 + 4 | 0) >> 2] | 0;
   $6_1 = i64toi32_i32$5;
   $6$hi = i64toi32_i32$0;
   i64toi32_i32$4 = i64toi32_i32$5;
   i64toi32_i32$5 = 0;
   i64toi32_i32$2 = 60;
   i64toi32_i32$3 = i64toi32_i32$2 & 31 | 0;
   if (32 >>> 0 <= (i64toi32_i32$2 & 63 | 0) >>> 0) {
    i64toi32_i32$5 = 0;
    $51_1 = i64toi32_i32$0 >>> i64toi32_i32$3 | 0;
   } else {
    i64toi32_i32$5 = i64toi32_i32$0 >>> i64toi32_i32$3 | 0;
    $51_1 = (((1 << i64toi32_i32$3 | 0) - 1 | 0) & i64toi32_i32$0 | 0) << (32 - i64toi32_i32$3 | 0) | 0 | (i64toi32_i32$4 >>> i64toi32_i32$3 | 0) | 0;
   }
   $80_1 = $51_1;
   $80$hi = i64toi32_i32$5;
   i64toi32_i32$0 = $2_1 + 8 | 0;
   i64toi32_i32$5 = HEAP32[i64toi32_i32$0 >> 2] | 0;
   i64toi32_i32$4 = HEAP32[(i64toi32_i32$0 + 4 | 0) >> 2] | 0;
   i64toi32_i32$0 = i64toi32_i32$5;
   i64toi32_i32$5 = 0;
   i64toi32_i32$2 = 4;
   i64toi32_i32$3 = i64toi32_i32$2 & 31 | 0;
   if (32 >>> 0 <= (i64toi32_i32$2 & 63 | 0) >>> 0) {
    i64toi32_i32$5 = i64toi32_i32$0 << i64toi32_i32$3 | 0;
    $52_1 = 0;
   } else {
    i64toi32_i32$5 = ((1 << i64toi32_i32$3 | 0) - 1 | 0) & (i64toi32_i32$0 >>> (32 - i64toi32_i32$3 | 0) | 0) | 0 | (i64toi32_i32$4 << i64toi32_i32$3 | 0) | 0;
    $52_1 = i64toi32_i32$0 << i64toi32_i32$3 | 0;
   }
   $84$hi = i64toi32_i32$5;
   i64toi32_i32$5 = $80$hi;
   i64toi32_i32$4 = $80_1;
   i64toi32_i32$0 = $84$hi;
   i64toi32_i32$2 = $52_1;
   i64toi32_i32$0 = i64toi32_i32$5 | i64toi32_i32$0 | 0;
   $7_1 = i64toi32_i32$4 | i64toi32_i32$2 | 0;
   $7$hi = i64toi32_i32$0;
   label$7 : {
    i64toi32_i32$0 = $6$hi;
    i64toi32_i32$5 = $6_1;
    i64toi32_i32$4 = 268435455;
    i64toi32_i32$2 = -1;
    i64toi32_i32$4 = i64toi32_i32$0 & i64toi32_i32$4 | 0;
    $87_1 = i64toi32_i32$5 & i64toi32_i32$2 | 0;
    $87$hi = i64toi32_i32$4;
    i64toi32_i32$0 = $2_1;
    i64toi32_i32$4 = HEAP32[(i64toi32_i32$0 + 16 | 0) >> 2] | 0;
    i64toi32_i32$5 = HEAP32[(i64toi32_i32$0 + 20 | 0) >> 2] | 0;
    $89_1 = i64toi32_i32$4;
    $89$hi = i64toi32_i32$5;
    i64toi32_i32$0 = (i64toi32_i32$0 + 16 | 0) + 8 | 0;
    i64toi32_i32$5 = HEAP32[i64toi32_i32$0 >> 2] | 0;
    i64toi32_i32$4 = HEAP32[(i64toi32_i32$0 + 4 | 0) >> 2] | 0;
    $93 = i64toi32_i32$5;
    $93$hi = i64toi32_i32$4;
    i64toi32_i32$4 = $89$hi;
    i64toi32_i32$0 = $89_1;
    i64toi32_i32$5 = $93$hi;
    i64toi32_i32$2 = $93;
    i64toi32_i32$5 = i64toi32_i32$4 | i64toi32_i32$5 | 0;
    i64toi32_i32$4 = i64toi32_i32$0 | i64toi32_i32$2 | 0;
    i64toi32_i32$0 = 0;
    i64toi32_i32$2 = 0;
    $95 = (i64toi32_i32$4 | 0) != (i64toi32_i32$2 | 0) | (i64toi32_i32$5 | 0) != (i64toi32_i32$0 | 0) | 0;
    i64toi32_i32$4 = 0;
    $96$hi = i64toi32_i32$4;
    i64toi32_i32$4 = $87$hi;
    i64toi32_i32$2 = $87_1;
    i64toi32_i32$5 = $96$hi;
    i64toi32_i32$0 = $95;
    i64toi32_i32$5 = i64toi32_i32$4 | i64toi32_i32$5 | 0;
    $6_1 = i64toi32_i32$2 | i64toi32_i32$0 | 0;
    $6$hi = i64toi32_i32$5;
    i64toi32_i32$4 = $6_1;
    i64toi32_i32$2 = 134217728;
    i64toi32_i32$0 = 1;
    if (i64toi32_i32$5 >>> 0 < i64toi32_i32$2 >>> 0 | ((i64toi32_i32$5 | 0) == (i64toi32_i32$2 | 0) & i64toi32_i32$4 >>> 0 < i64toi32_i32$0 >>> 0 | 0) | 0) {
     break label$7
    }
    i64toi32_i32$4 = $7$hi;
    i64toi32_i32$0 = $7_1;
    i64toi32_i32$5 = 0;
    i64toi32_i32$2 = 1;
    i64toi32_i32$3 = i64toi32_i32$0 + i64toi32_i32$2 | 0;
    i64toi32_i32$1 = i64toi32_i32$4 + i64toi32_i32$5 | 0;
    if (i64toi32_i32$3 >>> 0 < i64toi32_i32$2 >>> 0) {
     i64toi32_i32$1 = i64toi32_i32$1 + 1 | 0
    }
    $7_1 = i64toi32_i32$3;
    $7$hi = i64toi32_i32$1;
    break label$3;
   }
   i64toi32_i32$1 = $6$hi;
   i64toi32_i32$4 = $6_1;
   i64toi32_i32$0 = 134217728;
   i64toi32_i32$2 = 0;
   i64toi32_i32$0 = i64toi32_i32$1 ^ i64toi32_i32$0 | 0;
   i64toi32_i32$1 = i64toi32_i32$4 ^ i64toi32_i32$2 | 0;
   i64toi32_i32$4 = 0;
   i64toi32_i32$2 = 0;
   if ((i64toi32_i32$1 | 0) != (i64toi32_i32$2 | 0) | (i64toi32_i32$0 | 0) != (i64toi32_i32$4 | 0) | 0) {
    break label$3
   }
   i64toi32_i32$1 = $7$hi;
   i64toi32_i32$2 = $7_1;
   i64toi32_i32$0 = 0;
   i64toi32_i32$4 = 1;
   i64toi32_i32$0 = i64toi32_i32$1 & i64toi32_i32$0 | 0;
   $106$hi = i64toi32_i32$0;
   i64toi32_i32$0 = i64toi32_i32$1;
   i64toi32_i32$0 = $106$hi;
   i64toi32_i32$1 = i64toi32_i32$2 & i64toi32_i32$4 | 0;
   i64toi32_i32$2 = $7$hi;
   i64toi32_i32$4 = $7_1;
   i64toi32_i32$5 = i64toi32_i32$1 + i64toi32_i32$4 | 0;
   i64toi32_i32$3 = i64toi32_i32$0 + i64toi32_i32$2 | 0;
   if (i64toi32_i32$5 >>> 0 < i64toi32_i32$4 >>> 0) {
    i64toi32_i32$3 = i64toi32_i32$3 + 1 | 0
   }
   $7_1 = i64toi32_i32$5;
   $7$hi = i64toi32_i32$3;
  }
  label$8 : {
   $5_1 = $2_1 + 32 | 0;
   if ($5_1 >>> 0 < global$2 >>> 0) {
    fimport$7()
   }
   global$0 = $5_1;
  }
  i64toi32_i32$3 = $7$hi;
  i64toi32_i32$3 = $1$hi;
  i64toi32_i32$0 = $1_1;
  i64toi32_i32$1 = -2147483648;
  i64toi32_i32$4 = 0;
  i64toi32_i32$1 = i64toi32_i32$3 & i64toi32_i32$1 | 0;
  $117 = i64toi32_i32$0 & i64toi32_i32$4 | 0;
  $117$hi = i64toi32_i32$1;
  i64toi32_i32$1 = $7$hi;
  i64toi32_i32$3 = $7_1;
  i64toi32_i32$0 = $117$hi;
  i64toi32_i32$4 = $117;
  i64toi32_i32$0 = i64toi32_i32$1 | i64toi32_i32$0 | 0;
  wasm2js_scratch_store_i32(0 | 0, i64toi32_i32$3 | i64toi32_i32$4 | 0 | 0);
  wasm2js_scratch_store_i32(1 | 0, i64toi32_i32$0 | 0);
  return +(+wasm2js_scratch_load_f64());
 }
 
 function $40($0_1) {
  $0_1 = $0_1 | 0;
  $69($0_1 | 0);
 }
 
 function $41($0_1) {
  $0_1 = $0_1 | 0;
  return $0_1 | 0;
 }
 
 function $42($0_1, $1_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  var $3_1 = 0, $2_1 = 0;
  $2_1 = HEAPU8[$1_1 >> 0] | 0;
  label$1 : {
   $3_1 = HEAPU8[$0_1 >> 0] | 0;
   if (!$3_1) {
    break label$1
   }
   if (($3_1 | 0) != ($2_1 & 255 | 0 | 0)) {
    break label$1
   }
   label$2 : while (1) {
    $2_1 = HEAPU8[($1_1 + 1 | 0) >> 0] | 0;
    $3_1 = HEAPU8[($0_1 + 1 | 0) >> 0] | 0;
    if (!$3_1) {
     break label$1
    }
    $1_1 = $1_1 + 1 | 0;
    $0_1 = $0_1 + 1 | 0;
    if (($3_1 | 0) == ($2_1 & 255 | 0 | 0)) {
     continue label$2
    }
    break label$2;
   };
  }
  return $3_1 - ($2_1 & 255 | 0) | 0 | 0;
 }
 
 function $43($0_1) {
  $0_1 = $0_1 | 0;
  $41($0_1 | 0) | 0;
  return $0_1 | 0;
 }
 
 function $44($0_1) {
  $0_1 = $0_1 | 0;
 }
 
 function $45($0_1) {
  $0_1 = $0_1 | 0;
 }
 
 function $46($0_1) {
  $0_1 = $0_1 | 0;
  $43($0_1 | 0) | 0;
  $40($0_1 | 0);
 }
 
 function $47($0_1) {
  $0_1 = $0_1 | 0;
  $43($0_1 | 0) | 0;
  $40($0_1 | 0);
 }
 
 function $48($0_1) {
  $0_1 = $0_1 | 0;
  $43($0_1 | 0) | 0;
  $40($0_1 | 0);
 }
 
 function $49($0_1) {
  $0_1 = $0_1 | 0;
  $43($0_1 | 0) | 0;
  $40($0_1 | 0);
 }
 
 function $50($0_1, $1_1, $2_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  $2_1 = $2_1 | 0;
  return $51($0_1 | 0, $1_1 | 0, 0 | 0) | 0 | 0;
 }
 
 function $51($0_1, $1_1, $2_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  $2_1 = $2_1 | 0;
  label$1 : {
   if ($2_1) {
    break label$1
   }
   return ($0_1 | 0) == ($1_1 | 0) | 0;
  }
  return !($42($52($0_1 | 0) | 0 | 0, $52($1_1 | 0) | 0 | 0) | 0) | 0;
 }
 
 function $52($0_1) {
  $0_1 = $0_1 | 0;
  return HEAP32[($0_1 + 4 | 0) >> 2] | 0 | 0;
 }
 
 function $53($0_1, $1_1, $2_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  $2_1 = $2_1 | 0;
  var $3_1 = 0, $4_1 = 0, $6_1 = 0, $5_1 = 0;
  label$1 : {
   $3_1 = global$0 - 64 | 0;
   $5_1 = $3_1;
   if ($3_1 >>> 0 < global$2 >>> 0) {
    fimport$7()
   }
   global$0 = $5_1;
  }
  $4_1 = 1;
  label$3 : {
   if ($51($0_1 | 0, $1_1 | 0, 0 | 0) | 0) {
    break label$3
   }
   $4_1 = 0;
   if (!$1_1) {
    break label$3
   }
   $4_1 = 0;
   $1_1 = $54($1_1 | 0, 1696 | 0, 1744 | 0, 0 | 0) | 0;
   if (!$1_1) {
    break label$3
   }
   HEAP32[($3_1 + 20 | 0) >> 2] = -1;
   HEAP32[($3_1 + 16 | 0) >> 2] = $0_1;
   $4_1 = 0;
   HEAP32[($3_1 + 12 | 0) >> 2] = 0;
   HEAP32[($3_1 + 8 | 0) >> 2] = $1_1;
   $72($3_1 + 24 | 0 | 0, 0 | 0, 39 | 0) | 0;
   HEAP32[($3_1 + 56 | 0) >> 2] = 1;
   FUNCTION_TABLE[HEAP32[((HEAP32[$1_1 >> 2] | 0) + 28 | 0) >> 2] | 0]($1_1, $3_1 + 8 | 0, HEAP32[$2_1 >> 2] | 0, 1);
   if ((HEAP32[($3_1 + 32 | 0) >> 2] | 0 | 0) != (1 | 0)) {
    break label$3
   }
   HEAP32[$2_1 >> 2] = HEAP32[($3_1 + 24 | 0) >> 2] | 0;
   $4_1 = 1;
  }
  label$4 : {
   $6_1 = $3_1 + 64 | 0;
   if ($6_1 >>> 0 < global$2 >>> 0) {
    fimport$7()
   }
   global$0 = $6_1;
  }
  return $4_1 | 0;
 }
 
 function $54($0_1, $1_1, $2_1, $3_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  $2_1 = $2_1 | 0;
  $3_1 = $3_1 | 0;
  var $4_1 = 0, $5_1 = 0, $8_1 = 0, $7_1 = 0, $6_1 = 0, wasm2js_i32$0 = 0, wasm2js_i32$1 = 0, wasm2js_i32$2 = 0, wasm2js_i32$3 = 0, wasm2js_i32$4 = 0, wasm2js_i32$5 = 0, wasm2js_i32$6 = 0, wasm2js_i32$7 = 0, wasm2js_i32$8 = 0;
  label$1 : {
   $4_1 = global$0 - 64 | 0;
   $7_1 = $4_1;
   if ($4_1 >>> 0 < global$2 >>> 0) {
    fimport$7()
   }
   global$0 = $7_1;
  }
  $5_1 = HEAP32[$0_1 >> 2] | 0;
  $6_1 = HEAP32[($5_1 + -8 | 0) >> 2] | 0;
  $5_1 = HEAP32[($5_1 + -4 | 0) >> 2] | 0;
  HEAP32[($4_1 + 20 | 0) >> 2] = $3_1;
  HEAP32[($4_1 + 16 | 0) >> 2] = $1_1;
  HEAP32[($4_1 + 12 | 0) >> 2] = $0_1;
  HEAP32[($4_1 + 8 | 0) >> 2] = $2_1;
  $1_1 = 0;
  $72($4_1 + 24 | 0 | 0, 0 | 0, 39 | 0) | 0;
  $0_1 = $0_1 + $6_1 | 0;
  label$3 : {
   label$4 : {
    if (!($51($5_1 | 0, $2_1 | 0, 0 | 0) | 0)) {
     break label$4
    }
    HEAP32[($4_1 + 56 | 0) >> 2] = 1;
    FUNCTION_TABLE[HEAP32[((HEAP32[$5_1 >> 2] | 0) + 20 | 0) >> 2] | 0]($5_1, $4_1 + 8 | 0, $0_1, $0_1, 1, 0);
    $1_1 = (HEAP32[($4_1 + 32 | 0) >> 2] | 0 | 0) == (1 | 0) ? $0_1 : 0;
    break label$3;
   }
   FUNCTION_TABLE[HEAP32[((HEAP32[$5_1 >> 2] | 0) + 24 | 0) >> 2] | 0]($5_1, $4_1 + 8 | 0, $0_1, 1, 0);
   $0_1 = HEAP32[($4_1 + 44 | 0) >> 2] | 0;
   if ($0_1 >>> 0 > 1 >>> 0) {
    break label$3
   }
   label$5 : {
    switch ($0_1 | 0) {
    default:
     $1_1 = (wasm2js_i32$0 = (wasm2js_i32$3 = (wasm2js_i32$6 = HEAP32[($4_1 + 28 | 0) >> 2] | 0, wasm2js_i32$7 = 0, wasm2js_i32$8 = (HEAP32[($4_1 + 40 | 0) >> 2] | 0 | 0) == (1 | 0), wasm2js_i32$8 ? wasm2js_i32$6 : wasm2js_i32$7), wasm2js_i32$4 = 0, wasm2js_i32$5 = (HEAP32[($4_1 + 36 | 0) >> 2] | 0 | 0) == (1 | 0), wasm2js_i32$5 ? wasm2js_i32$3 : wasm2js_i32$4), wasm2js_i32$1 = 0, wasm2js_i32$2 = (HEAP32[($4_1 + 48 | 0) >> 2] | 0 | 0) == (1 | 0), wasm2js_i32$2 ? wasm2js_i32$0 : wasm2js_i32$1);
     break label$3;
    case 1:
     break label$5;
    };
   }
   label$7 : {
    if ((HEAP32[($4_1 + 32 | 0) >> 2] | 0 | 0) == (1 | 0)) {
     break label$7
    }
    if (HEAP32[($4_1 + 48 | 0) >> 2] | 0) {
     break label$3
    }
    if ((HEAP32[($4_1 + 36 | 0) >> 2] | 0 | 0) != (1 | 0)) {
     break label$3
    }
    if ((HEAP32[($4_1 + 40 | 0) >> 2] | 0 | 0) != (1 | 0)) {
     break label$3
    }
   }
   $1_1 = HEAP32[($4_1 + 24 | 0) >> 2] | 0;
  }
  label$8 : {
   $8_1 = $4_1 + 64 | 0;
   if ($8_1 >>> 0 < global$2 >>> 0) {
    fimport$7()
   }
   global$0 = $8_1;
  }
  return $1_1 | 0;
 }
 
 function $55($0_1, $1_1, $2_1, $3_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  $2_1 = $2_1 | 0;
  $3_1 = $3_1 | 0;
  var $4_1 = 0;
  label$1 : {
   $4_1 = HEAP32[($1_1 + 16 | 0) >> 2] | 0;
   if ($4_1) {
    break label$1
   }
   HEAP32[($1_1 + 36 | 0) >> 2] = 1;
   HEAP32[($1_1 + 24 | 0) >> 2] = $3_1;
   HEAP32[($1_1 + 16 | 0) >> 2] = $2_1;
   return;
  }
  label$2 : {
   label$3 : {
    if (($4_1 | 0) != ($2_1 | 0)) {
     break label$3
    }
    if ((HEAP32[($1_1 + 24 | 0) >> 2] | 0 | 0) != (2 | 0)) {
     break label$2
    }
    HEAP32[($1_1 + 24 | 0) >> 2] = $3_1;
    return;
   }
   HEAP8[($1_1 + 54 | 0) >> 0] = 1;
   HEAP32[($1_1 + 24 | 0) >> 2] = 2;
   HEAP32[($1_1 + 36 | 0) >> 2] = (HEAP32[($1_1 + 36 | 0) >> 2] | 0) + 1 | 0;
  }
 }
 
 function $56($0_1, $1_1, $2_1, $3_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  $2_1 = $2_1 | 0;
  $3_1 = $3_1 | 0;
  label$1 : {
   if (!($51($0_1 | 0, HEAP32[($1_1 + 8 | 0) >> 2] | 0 | 0, 0 | 0) | 0)) {
    break label$1
   }
   $55($1_1 | 0, $1_1 | 0, $2_1 | 0, $3_1 | 0);
  }
 }
 
 function $57($0_1, $1_1, $2_1, $3_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  $2_1 = $2_1 | 0;
  $3_1 = $3_1 | 0;
  label$1 : {
   if (!($51($0_1 | 0, HEAP32[($1_1 + 8 | 0) >> 2] | 0 | 0, 0 | 0) | 0)) {
    break label$1
   }
   $55($1_1 | 0, $1_1 | 0, $2_1 | 0, $3_1 | 0);
   return;
  }
  $0_1 = HEAP32[($0_1 + 8 | 0) >> 2] | 0;
  FUNCTION_TABLE[HEAP32[((HEAP32[$0_1 >> 2] | 0) + 28 | 0) >> 2] | 0]($0_1, $1_1, $2_1, $3_1);
 }
 
 function $58($0_1, $1_1, $2_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  $2_1 = $2_1 | 0;
  var $3_1 = 0, $4_1 = 0;
  $3_1 = 1;
  label$1 : {
   label$2 : {
    if ((HEAPU8[($0_1 + 8 | 0) >> 0] | 0) & 24 | 0) {
     break label$2
    }
    $3_1 = 0;
    if (!$1_1) {
     break label$1
    }
    $4_1 = $54($1_1 | 0, 1696 | 0, 1792 | 0, 0 | 0) | 0;
    if (!$4_1) {
     break label$1
    }
    $3_1 = ((HEAPU8[($4_1 + 8 | 0) >> 0] | 0) & 24 | 0 | 0) != (0 | 0);
   }
   $3_1 = $51($0_1 | 0, $1_1 | 0, $3_1 | 0) | 0;
  }
  return $3_1 | 0;
 }
 
 function $59($0_1, $1_1, $2_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  $2_1 = $2_1 | 0;
  var $5_1 = 0, $4_1 = 0, $3_1 = 0, $6_1 = 0, $8_1 = 0, $7_1 = 0;
  label$1 : {
   $3_1 = global$0 - 64 | 0;
   $7_1 = $3_1;
   if ($3_1 >>> 0 < global$2 >>> 0) {
    fimport$7()
   }
   global$0 = $7_1;
  }
  label$3 : {
   label$4 : {
    label$5 : {
     label$6 : {
      if (!($51($1_1 | 0, 2060 | 0, 0 | 0) | 0)) {
       break label$6
      }
      HEAP32[$2_1 >> 2] = 0;
      break label$5;
     }
     label$7 : {
      if (!($58($0_1 | 0, $1_1 | 0, $1_1 | 0) | 0)) {
       break label$7
      }
      $4_1 = 1;
      $1_1 = HEAP32[$2_1 >> 2] | 0;
      if (!$1_1) {
       break label$3
      }
      HEAP32[$2_1 >> 2] = HEAP32[$1_1 >> 2] | 0;
      break label$3;
     }
     if (!$1_1) {
      break label$4
     }
     $4_1 = 0;
     $1_1 = $54($1_1 | 0, 1696 | 0, 1840 | 0, 0 | 0) | 0;
     if (!$1_1) {
      break label$3
     }
     label$8 : {
      $5_1 = HEAP32[$2_1 >> 2] | 0;
      if (!$5_1) {
       break label$8
      }
      HEAP32[$2_1 >> 2] = HEAP32[$5_1 >> 2] | 0;
     }
     $5_1 = HEAP32[($1_1 + 8 | 0) >> 2] | 0;
     $6_1 = HEAP32[($0_1 + 8 | 0) >> 2] | 0;
     if (($5_1 & ($6_1 ^ -1 | 0) | 0) & 7 | 0) {
      break label$3
     }
     if ((($5_1 ^ -1 | 0) & $6_1 | 0) & 96 | 0) {
      break label$3
     }
     $4_1 = 1;
     if ($51(HEAP32[($0_1 + 12 | 0) >> 2] | 0 | 0, HEAP32[($1_1 + 12 | 0) >> 2] | 0 | 0, 0 | 0) | 0) {
      break label$3
     }
     label$9 : {
      if (!($51(HEAP32[($0_1 + 12 | 0) >> 2] | 0 | 0, 2048 | 0, 0 | 0) | 0)) {
       break label$9
      }
      $1_1 = HEAP32[($1_1 + 12 | 0) >> 2] | 0;
      if (!$1_1) {
       break label$3
      }
      $4_1 = !($54($1_1 | 0, 1696 | 0, 1892 | 0, 0 | 0) | 0);
      break label$3;
     }
     $5_1 = HEAP32[($0_1 + 12 | 0) >> 2] | 0;
     if (!$5_1) {
      break label$4
     }
     $4_1 = 0;
     label$10 : {
      $5_1 = $54($5_1 | 0, 1696 | 0, 1840 | 0, 0 | 0) | 0;
      if (!$5_1) {
       break label$10
      }
      if (!((HEAPU8[($0_1 + 8 | 0) >> 0] | 0) & 1 | 0)) {
       break label$3
      }
      $4_1 = $60($5_1 | 0, HEAP32[($1_1 + 12 | 0) >> 2] | 0 | 0) | 0;
      break label$3;
     }
     $5_1 = HEAP32[($0_1 + 12 | 0) >> 2] | 0;
     if (!$5_1) {
      break label$3
     }
     $4_1 = 0;
     label$11 : {
      $5_1 = $54($5_1 | 0, 1696 | 0, 1952 | 0, 0 | 0) | 0;
      if (!$5_1) {
       break label$11
      }
      if (!((HEAPU8[($0_1 + 8 | 0) >> 0] | 0) & 1 | 0)) {
       break label$3
      }
      $4_1 = $61($5_1 | 0, HEAP32[($1_1 + 12 | 0) >> 2] | 0 | 0) | 0;
      break label$3;
     }
     $0_1 = HEAP32[($0_1 + 12 | 0) >> 2] | 0;
     if (!$0_1) {
      break label$3
     }
     $4_1 = 0;
     $0_1 = $54($0_1 | 0, 1696 | 0, 1744 | 0, 0 | 0) | 0;
     if (!$0_1) {
      break label$3
     }
     $1_1 = HEAP32[($1_1 + 12 | 0) >> 2] | 0;
     if (!$1_1) {
      break label$3
     }
     $4_1 = 0;
     $1_1 = $54($1_1 | 0, 1696 | 0, 1744 | 0, 0 | 0) | 0;
     if (!$1_1) {
      break label$3
     }
     HEAP32[($3_1 + 20 | 0) >> 2] = -1;
     HEAP32[($3_1 + 16 | 0) >> 2] = $0_1;
     $4_1 = 0;
     HEAP32[($3_1 + 12 | 0) >> 2] = 0;
     HEAP32[($3_1 + 8 | 0) >> 2] = $1_1;
     $72($3_1 + 24 | 0 | 0, 0 | 0, 39 | 0) | 0;
     HEAP32[($3_1 + 56 | 0) >> 2] = 1;
     FUNCTION_TABLE[HEAP32[((HEAP32[$1_1 >> 2] | 0) + 28 | 0) >> 2] | 0]($1_1, $3_1 + 8 | 0, HEAP32[$2_1 >> 2] | 0, 1);
     if ((HEAP32[($3_1 + 32 | 0) >> 2] | 0 | 0) != (1 | 0)) {
      break label$3
     }
     if (!(HEAP32[$2_1 >> 2] | 0)) {
      break label$5
     }
     HEAP32[$2_1 >> 2] = HEAP32[($3_1 + 24 | 0) >> 2] | 0;
    }
    $4_1 = 1;
    break label$3;
   }
   $4_1 = 0;
  }
  label$12 : {
   $8_1 = $3_1 + 64 | 0;
   if ($8_1 >>> 0 < global$2 >>> 0) {
    fimport$7()
   }
   global$0 = $8_1;
  }
  return $4_1 | 0;
 }
 
 function $60($0_1, $1_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  var $3_1 = 0, $2_1 = 0;
  label$1 : {
   label$2 : while (1) {
    label$3 : {
     if ($1_1) {
      break label$3
     }
     return 0 | 0;
    }
    $2_1 = 0;
    $1_1 = $54($1_1 | 0, 1696 | 0, 1840 | 0, 0 | 0) | 0;
    if (!$1_1) {
     break label$1
    }
    if ((HEAP32[($1_1 + 8 | 0) >> 2] | 0) & ((HEAP32[($0_1 + 8 | 0) >> 2] | 0) ^ -1 | 0) | 0) {
     break label$1
    }
    label$4 : {
     if (!($51(HEAP32[($0_1 + 12 | 0) >> 2] | 0 | 0, HEAP32[($1_1 + 12 | 0) >> 2] | 0 | 0, 0 | 0) | 0)) {
      break label$4
     }
     return 1 | 0;
    }
    if (!((HEAPU8[($0_1 + 8 | 0) >> 0] | 0) & 1 | 0)) {
     break label$1
    }
    $3_1 = HEAP32[($0_1 + 12 | 0) >> 2] | 0;
    if (!$3_1) {
     break label$1
    }
    label$5 : {
     $3_1 = $54($3_1 | 0, 1696 | 0, 1840 | 0, 0 | 0) | 0;
     if (!$3_1) {
      break label$5
     }
     $1_1 = HEAP32[($1_1 + 12 | 0) >> 2] | 0;
     $0_1 = $3_1;
     continue label$2;
    }
    break label$2;
   };
   $0_1 = HEAP32[($0_1 + 12 | 0) >> 2] | 0;
   if (!$0_1) {
    break label$1
   }
   $2_1 = 0;
   $0_1 = $54($0_1 | 0, 1696 | 0, 1952 | 0, 0 | 0) | 0;
   if (!$0_1) {
    break label$1
   }
   $2_1 = $61($0_1 | 0, HEAP32[($1_1 + 12 | 0) >> 2] | 0 | 0) | 0;
  }
  return $2_1 | 0;
 }
 
 function $61($0_1, $1_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  var $2_1 = 0;
  $2_1 = 0;
  label$1 : {
   if (!$1_1) {
    break label$1
   }
   $1_1 = $54($1_1 | 0, 1696 | 0, 1952 | 0, 0 | 0) | 0;
   if (!$1_1) {
    break label$1
   }
   if ((HEAP32[($1_1 + 8 | 0) >> 2] | 0) & ((HEAP32[($0_1 + 8 | 0) >> 2] | 0) ^ -1 | 0) | 0) {
    break label$1
   }
   $2_1 = 0;
   if (!($51(HEAP32[($0_1 + 12 | 0) >> 2] | 0 | 0, HEAP32[($1_1 + 12 | 0) >> 2] | 0 | 0, 0 | 0) | 0)) {
    break label$1
   }
   $2_1 = $51(HEAP32[($0_1 + 16 | 0) >> 2] | 0 | 0, HEAP32[($1_1 + 16 | 0) >> 2] | 0 | 0, 0 | 0) | 0;
  }
  return $2_1 | 0;
 }
 
 function $62($0_1, $1_1, $2_1, $3_1, $4_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  $2_1 = $2_1 | 0;
  $3_1 = $3_1 | 0;
  $4_1 = $4_1 | 0;
  HEAP8[($1_1 + 53 | 0) >> 0] = 1;
  label$1 : {
   if ((HEAP32[($1_1 + 4 | 0) >> 2] | 0 | 0) != ($3_1 | 0)) {
    break label$1
   }
   HEAP8[($1_1 + 52 | 0) >> 0] = 1;
   label$2 : {
    $3_1 = HEAP32[($1_1 + 16 | 0) >> 2] | 0;
    if ($3_1) {
     break label$2
    }
    HEAP32[($1_1 + 36 | 0) >> 2] = 1;
    HEAP32[($1_1 + 24 | 0) >> 2] = $4_1;
    HEAP32[($1_1 + 16 | 0) >> 2] = $2_1;
    if (($4_1 | 0) != (1 | 0)) {
     break label$1
    }
    if ((HEAP32[($1_1 + 48 | 0) >> 2] | 0 | 0) != (1 | 0)) {
     break label$1
    }
    HEAP8[($1_1 + 54 | 0) >> 0] = 1;
    return;
   }
   label$3 : {
    if (($3_1 | 0) != ($2_1 | 0)) {
     break label$3
    }
    label$4 : {
     $3_1 = HEAP32[($1_1 + 24 | 0) >> 2] | 0;
     if (($3_1 | 0) != (2 | 0)) {
      break label$4
     }
     HEAP32[($1_1 + 24 | 0) >> 2] = $4_1;
     $3_1 = $4_1;
    }
    if ((HEAP32[($1_1 + 48 | 0) >> 2] | 0 | 0) != (1 | 0)) {
     break label$1
    }
    if (($3_1 | 0) != (1 | 0)) {
     break label$1
    }
    HEAP8[($1_1 + 54 | 0) >> 0] = 1;
    return;
   }
   HEAP8[($1_1 + 54 | 0) >> 0] = 1;
   HEAP32[($1_1 + 36 | 0) >> 2] = (HEAP32[($1_1 + 36 | 0) >> 2] | 0) + 1 | 0;
  }
 }
 
 function $63($0_1, $1_1, $2_1, $3_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  $2_1 = $2_1 | 0;
  $3_1 = $3_1 | 0;
  label$1 : {
   if ((HEAP32[($1_1 + 4 | 0) >> 2] | 0 | 0) != ($2_1 | 0)) {
    break label$1
   }
   if ((HEAP32[($1_1 + 28 | 0) >> 2] | 0 | 0) == (1 | 0)) {
    break label$1
   }
   HEAP32[($1_1 + 28 | 0) >> 2] = $3_1;
  }
 }
 
 function $64($0_1, $1_1, $2_1, $3_1, $4_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  $2_1 = $2_1 | 0;
  $3_1 = $3_1 | 0;
  $4_1 = $4_1 | 0;
  label$1 : {
   if (!($51($0_1 | 0, HEAP32[($1_1 + 8 | 0) >> 2] | 0 | 0, $4_1 | 0) | 0)) {
    break label$1
   }
   $63($1_1 | 0, $1_1 | 0, $2_1 | 0, $3_1 | 0);
   return;
  }
  label$2 : {
   label$3 : {
    if (!($51($0_1 | 0, HEAP32[$1_1 >> 2] | 0 | 0, $4_1 | 0) | 0)) {
     break label$3
    }
    label$4 : {
     label$5 : {
      if ((HEAP32[($1_1 + 16 | 0) >> 2] | 0 | 0) == ($2_1 | 0)) {
       break label$5
      }
      if ((HEAP32[($1_1 + 20 | 0) >> 2] | 0 | 0) != ($2_1 | 0)) {
       break label$4
      }
     }
     if (($3_1 | 0) != (1 | 0)) {
      break label$2
     }
     HEAP32[($1_1 + 32 | 0) >> 2] = 1;
     return;
    }
    HEAP32[($1_1 + 32 | 0) >> 2] = $3_1;
    label$6 : {
     if ((HEAP32[($1_1 + 44 | 0) >> 2] | 0 | 0) == (4 | 0)) {
      break label$6
     }
     HEAP16[($1_1 + 52 | 0) >> 1] = 0;
     $0_1 = HEAP32[($0_1 + 8 | 0) >> 2] | 0;
     FUNCTION_TABLE[HEAP32[((HEAP32[$0_1 >> 2] | 0) + 20 | 0) >> 2] | 0]($0_1, $1_1, $2_1, $2_1, 1, $4_1);
     label$7 : {
      if (!(HEAPU8[($1_1 + 53 | 0) >> 0] | 0)) {
       break label$7
      }
      HEAP32[($1_1 + 44 | 0) >> 2] = 3;
      if (!(HEAPU8[($1_1 + 52 | 0) >> 0] | 0)) {
       break label$6
      }
      break label$2;
     }
     HEAP32[($1_1 + 44 | 0) >> 2] = 4;
    }
    HEAP32[($1_1 + 20 | 0) >> 2] = $2_1;
    HEAP32[($1_1 + 40 | 0) >> 2] = (HEAP32[($1_1 + 40 | 0) >> 2] | 0) + 1 | 0;
    if ((HEAP32[($1_1 + 36 | 0) >> 2] | 0 | 0) != (1 | 0)) {
     break label$2
    }
    if ((HEAP32[($1_1 + 24 | 0) >> 2] | 0 | 0) != (2 | 0)) {
     break label$2
    }
    HEAP8[($1_1 + 54 | 0) >> 0] = 1;
    return;
   }
   $0_1 = HEAP32[($0_1 + 8 | 0) >> 2] | 0;
   FUNCTION_TABLE[HEAP32[((HEAP32[$0_1 >> 2] | 0) + 24 | 0) >> 2] | 0]($0_1, $1_1, $2_1, $3_1, $4_1);
  }
 }
 
 function $65($0_1, $1_1, $2_1, $3_1, $4_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  $2_1 = $2_1 | 0;
  $3_1 = $3_1 | 0;
  $4_1 = $4_1 | 0;
  label$1 : {
   if (!($51($0_1 | 0, HEAP32[($1_1 + 8 | 0) >> 2] | 0 | 0, $4_1 | 0) | 0)) {
    break label$1
   }
   $63($1_1 | 0, $1_1 | 0, $2_1 | 0, $3_1 | 0);
   return;
  }
  label$2 : {
   if (!($51($0_1 | 0, HEAP32[$1_1 >> 2] | 0 | 0, $4_1 | 0) | 0)) {
    break label$2
   }
   label$3 : {
    label$4 : {
     if ((HEAP32[($1_1 + 16 | 0) >> 2] | 0 | 0) == ($2_1 | 0)) {
      break label$4
     }
     if ((HEAP32[($1_1 + 20 | 0) >> 2] | 0 | 0) != ($2_1 | 0)) {
      break label$3
     }
    }
    if (($3_1 | 0) != (1 | 0)) {
     break label$2
    }
    HEAP32[($1_1 + 32 | 0) >> 2] = 1;
    return;
   }
   HEAP32[($1_1 + 20 | 0) >> 2] = $2_1;
   HEAP32[($1_1 + 32 | 0) >> 2] = $3_1;
   HEAP32[($1_1 + 40 | 0) >> 2] = (HEAP32[($1_1 + 40 | 0) >> 2] | 0) + 1 | 0;
   label$5 : {
    if ((HEAP32[($1_1 + 36 | 0) >> 2] | 0 | 0) != (1 | 0)) {
     break label$5
    }
    if ((HEAP32[($1_1 + 24 | 0) >> 2] | 0 | 0) != (2 | 0)) {
     break label$5
    }
    HEAP8[($1_1 + 54 | 0) >> 0] = 1;
   }
   HEAP32[($1_1 + 44 | 0) >> 2] = 4;
  }
 }
 
 function $66($0_1, $1_1, $2_1, $3_1, $4_1, $5_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  $2_1 = $2_1 | 0;
  $3_1 = $3_1 | 0;
  $4_1 = $4_1 | 0;
  $5_1 = $5_1 | 0;
  label$1 : {
   if (!($51($0_1 | 0, HEAP32[($1_1 + 8 | 0) >> 2] | 0 | 0, $5_1 | 0) | 0)) {
    break label$1
   }
   $62($1_1 | 0, $1_1 | 0, $2_1 | 0, $3_1 | 0, $4_1 | 0);
   return;
  }
  $0_1 = HEAP32[($0_1 + 8 | 0) >> 2] | 0;
  FUNCTION_TABLE[HEAP32[((HEAP32[$0_1 >> 2] | 0) + 20 | 0) >> 2] | 0]($0_1, $1_1, $2_1, $3_1, $4_1, $5_1);
 }
 
 function $67($0_1, $1_1, $2_1, $3_1, $4_1, $5_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  $2_1 = $2_1 | 0;
  $3_1 = $3_1 | 0;
  $4_1 = $4_1 | 0;
  $5_1 = $5_1 | 0;
  label$1 : {
   if (!($51($0_1 | 0, HEAP32[($1_1 + 8 | 0) >> 2] | 0 | 0, $5_1 | 0) | 0)) {
    break label$1
   }
   $62($1_1 | 0, $1_1 | 0, $2_1 | 0, $3_1 | 0, $4_1 | 0);
  }
 }
 
 function $68($0_1) {
  $0_1 = $0_1 | 0;
  var $4_1 = 0, $5_1 = 0, $6_1 = 0, $8_1 = 0, $3_1 = 0, $2_1 = 0, $11_1 = 0, $7_1 = 0, i64toi32_i32$0 = 0, $9_1 = 0, i64toi32_i32$1 = 0, i64toi32_i32$2 = 0, $1_1 = 0, $10_1 = 0, $13_1 = 0, $12_1 = 0, $88_1 = 0, $101 = 0, $112 = 0, $120 = 0, $128 = 0, $222 = 0, $233 = 0, $241 = 0, $249 = 0, $284 = 0, $362 = 0, $369 = 0, $462 = 0, $473 = 0, $481 = 0, $489 = 0, $1200 = 0, $1207 = 0, $1329 = 0, $1331 = 0, $1401 = 0, $1408 = 0, $1652 = 0, $1659 = 0;
  label$1 : {
   $1_1 = global$0 - 16 | 0;
   $12_1 = $1_1;
   if ($1_1 >>> 0 < global$2 >>> 0) {
    fimport$7()
   }
   global$0 = $12_1;
  }
  label$3 : {
   label$4 : {
    label$5 : {
     label$6 : {
      label$7 : {
       label$8 : {
        label$9 : {
         label$10 : {
          label$11 : {
           label$12 : {
            label$13 : {
             label$14 : {
              if ($0_1 >>> 0 > 244 >>> 0) {
               break label$14
              }
              label$15 : {
               $2_1 = HEAP32[(0 + 3768 | 0) >> 2] | 0;
               $3_1 = $0_1 >>> 0 < 11 >>> 0 ? 16 : ($0_1 + 11 | 0) & -8 | 0;
               $4_1 = $3_1 >>> 3 | 0;
               $0_1 = $2_1 >>> $4_1 | 0;
               if (!($0_1 & 3 | 0)) {
                break label$15
               }
               $3_1 = (($0_1 ^ -1 | 0) & 1 | 0) + $4_1 | 0;
               $5_1 = $3_1 << 3 | 0;
               $4_1 = HEAP32[($5_1 + 3816 | 0) >> 2] | 0;
               $0_1 = $4_1 + 8 | 0;
               label$16 : {
                label$17 : {
                 $6_1 = HEAP32[($4_1 + 8 | 0) >> 2] | 0;
                 $5_1 = $5_1 + 3808 | 0;
                 if (($6_1 | 0) != ($5_1 | 0)) {
                  break label$17
                 }
                 HEAP32[(0 + 3768 | 0) >> 2] = $2_1 & (__wasm_rotl_i32(-2 | 0, $3_1 | 0) | 0) | 0;
                 break label$16;
                }
                HEAP32[(0 + 3784 | 0) >> 2] | 0;
                HEAP32[($6_1 + 12 | 0) >> 2] = $5_1;
                HEAP32[($5_1 + 8 | 0) >> 2] = $6_1;
               }
               $6_1 = $3_1 << 3 | 0;
               HEAP32[($4_1 + 4 | 0) >> 2] = $6_1 | 3 | 0;
               $4_1 = $4_1 + $6_1 | 0;
               HEAP32[($4_1 + 4 | 0) >> 2] = HEAP32[($4_1 + 4 | 0) >> 2] | 0 | 1 | 0;
               break label$3;
              }
              $7_1 = HEAP32[(0 + 3776 | 0) >> 2] | 0;
              if ($3_1 >>> 0 <= $7_1 >>> 0) {
               break label$13
              }
              label$18 : {
               if (!$0_1) {
                break label$18
               }
               label$19 : {
                label$20 : {
                 $88_1 = $0_1 << $4_1 | 0;
                 $0_1 = 2 << $4_1 | 0;
                 $0_1 = $88_1 & ($0_1 | (0 - $0_1 | 0) | 0) | 0;
                 $0_1 = ($0_1 & (0 - $0_1 | 0) | 0) + -1 | 0;
                 $101 = $0_1;
                 $0_1 = ($0_1 >>> 12 | 0) & 16 | 0;
                 $4_1 = $101 >>> $0_1 | 0;
                 $6_1 = ($4_1 >>> 5 | 0) & 8 | 0;
                 $112 = $6_1 | $0_1 | 0;
                 $0_1 = $4_1 >>> $6_1 | 0;
                 $4_1 = ($0_1 >>> 2 | 0) & 4 | 0;
                 $120 = $112 | $4_1 | 0;
                 $0_1 = $0_1 >>> $4_1 | 0;
                 $4_1 = ($0_1 >>> 1 | 0) & 2 | 0;
                 $128 = $120 | $4_1 | 0;
                 $0_1 = $0_1 >>> $4_1 | 0;
                 $4_1 = ($0_1 >>> 1 | 0) & 1 | 0;
                 $6_1 = ($128 | $4_1 | 0) + ($0_1 >>> $4_1 | 0) | 0;
                 $5_1 = $6_1 << 3 | 0;
                 $4_1 = HEAP32[($5_1 + 3816 | 0) >> 2] | 0;
                 $0_1 = HEAP32[($4_1 + 8 | 0) >> 2] | 0;
                 $5_1 = $5_1 + 3808 | 0;
                 if (($0_1 | 0) != ($5_1 | 0)) {
                  break label$20
                 }
                 $2_1 = $2_1 & (__wasm_rotl_i32(-2 | 0, $6_1 | 0) | 0) | 0;
                 HEAP32[(0 + 3768 | 0) >> 2] = $2_1;
                 break label$19;
                }
                HEAP32[(0 + 3784 | 0) >> 2] | 0;
                HEAP32[($0_1 + 12 | 0) >> 2] = $5_1;
                HEAP32[($5_1 + 8 | 0) >> 2] = $0_1;
               }
               $0_1 = $4_1 + 8 | 0;
               HEAP32[($4_1 + 4 | 0) >> 2] = $3_1 | 3 | 0;
               $5_1 = $4_1 + $3_1 | 0;
               $8_1 = $6_1 << 3 | 0;
               $6_1 = $8_1 - $3_1 | 0;
               HEAP32[($5_1 + 4 | 0) >> 2] = $6_1 | 1 | 0;
               HEAP32[($4_1 + $8_1 | 0) >> 2] = $6_1;
               label$21 : {
                if (!$7_1) {
                 break label$21
                }
                $8_1 = $7_1 >>> 3 | 0;
                $3_1 = ($8_1 << 3 | 0) + 3808 | 0;
                $4_1 = HEAP32[(0 + 3788 | 0) >> 2] | 0;
                label$22 : {
                 label$23 : {
                  $8_1 = 1 << $8_1 | 0;
                  if ($2_1 & $8_1 | 0) {
                   break label$23
                  }
                  HEAP32[(0 + 3768 | 0) >> 2] = $2_1 | $8_1 | 0;
                  $8_1 = $3_1;
                  break label$22;
                 }
                 $8_1 = HEAP32[($3_1 + 8 | 0) >> 2] | 0;
                }
                HEAP32[($3_1 + 8 | 0) >> 2] = $4_1;
                HEAP32[($8_1 + 12 | 0) >> 2] = $4_1;
                HEAP32[($4_1 + 12 | 0) >> 2] = $3_1;
                HEAP32[($4_1 + 8 | 0) >> 2] = $8_1;
               }
               HEAP32[(0 + 3788 | 0) >> 2] = $5_1;
               HEAP32[(0 + 3776 | 0) >> 2] = $6_1;
               break label$3;
              }
              $9_1 = HEAP32[(0 + 3772 | 0) >> 2] | 0;
              if (!$9_1) {
               break label$13
              }
              $0_1 = ($9_1 & (0 - $9_1 | 0) | 0) + -1 | 0;
              $222 = $0_1;
              $0_1 = ($0_1 >>> 12 | 0) & 16 | 0;
              $4_1 = $222 >>> $0_1 | 0;
              $6_1 = ($4_1 >>> 5 | 0) & 8 | 0;
              $233 = $6_1 | $0_1 | 0;
              $0_1 = $4_1 >>> $6_1 | 0;
              $4_1 = ($0_1 >>> 2 | 0) & 4 | 0;
              $241 = $233 | $4_1 | 0;
              $0_1 = $0_1 >>> $4_1 | 0;
              $4_1 = ($0_1 >>> 1 | 0) & 2 | 0;
              $249 = $241 | $4_1 | 0;
              $0_1 = $0_1 >>> $4_1 | 0;
              $4_1 = ($0_1 >>> 1 | 0) & 1 | 0;
              $5_1 = HEAP32[(((($249 | $4_1 | 0) + ($0_1 >>> $4_1 | 0) | 0) << 2 | 0) + 4072 | 0) >> 2] | 0;
              $4_1 = ((HEAP32[($5_1 + 4 | 0) >> 2] | 0) & -8 | 0) - $3_1 | 0;
              $6_1 = $5_1;
              label$24 : {
               label$25 : while (1) {
                label$26 : {
                 $0_1 = HEAP32[($6_1 + 16 | 0) >> 2] | 0;
                 if ($0_1) {
                  break label$26
                 }
                 $0_1 = HEAP32[($6_1 + 20 | 0) >> 2] | 0;
                 if (!$0_1) {
                  break label$24
                 }
                }
                $6_1 = ((HEAP32[($0_1 + 4 | 0) >> 2] | 0) & -8 | 0) - $3_1 | 0;
                $284 = $6_1;
                $6_1 = $6_1 >>> 0 < $4_1 >>> 0;
                $4_1 = $6_1 ? $284 : $4_1;
                $5_1 = $6_1 ? $0_1 : $5_1;
                $6_1 = $0_1;
                continue label$25;
               };
              }
              $10_1 = HEAP32[($5_1 + 24 | 0) >> 2] | 0;
              label$27 : {
               $8_1 = HEAP32[($5_1 + 12 | 0) >> 2] | 0;
               if (($8_1 | 0) == ($5_1 | 0)) {
                break label$27
               }
               label$28 : {
                $0_1 = HEAP32[($5_1 + 8 | 0) >> 2] | 0;
                if ((HEAP32[(0 + 3784 | 0) >> 2] | 0) >>> 0 > $0_1 >>> 0) {
                 break label$28
                }
                HEAP32[($0_1 + 12 | 0) >> 2] | 0;
               }
               HEAP32[($0_1 + 12 | 0) >> 2] = $8_1;
               HEAP32[($8_1 + 8 | 0) >> 2] = $0_1;
               break label$4;
              }
              label$29 : {
               $6_1 = $5_1 + 20 | 0;
               $0_1 = HEAP32[$6_1 >> 2] | 0;
               if ($0_1) {
                break label$29
               }
               $0_1 = HEAP32[($5_1 + 16 | 0) >> 2] | 0;
               if (!$0_1) {
                break label$12
               }
               $6_1 = $5_1 + 16 | 0;
              }
              label$30 : while (1) {
               $11_1 = $6_1;
               $8_1 = $0_1;
               $6_1 = $0_1 + 20 | 0;
               $0_1 = HEAP32[$6_1 >> 2] | 0;
               if ($0_1) {
                continue label$30
               }
               $6_1 = $8_1 + 16 | 0;
               $0_1 = HEAP32[($8_1 + 16 | 0) >> 2] | 0;
               if ($0_1) {
                continue label$30
               }
               break label$30;
              };
              HEAP32[$11_1 >> 2] = 0;
              break label$4;
             }
             $3_1 = -1;
             if ($0_1 >>> 0 > -65 >>> 0) {
              break label$13
             }
             $0_1 = $0_1 + 11 | 0;
             $3_1 = $0_1 & -8 | 0;
             $7_1 = HEAP32[(0 + 3772 | 0) >> 2] | 0;
             if (!$7_1) {
              break label$13
             }
             $11_1 = 0;
             label$31 : {
              $0_1 = $0_1 >>> 8 | 0;
              if (!$0_1) {
               break label$31
              }
              $11_1 = 31;
              if ($3_1 >>> 0 > 16777215 >>> 0) {
               break label$31
              }
              $4_1 = (($0_1 + 1048320 | 0) >>> 16 | 0) & 8 | 0;
              $0_1 = $0_1 << $4_1 | 0;
              $362 = $0_1;
              $0_1 = (($0_1 + 520192 | 0) >>> 16 | 0) & 4 | 0;
              $6_1 = $362 << $0_1 | 0;
              $369 = $6_1;
              $6_1 = (($6_1 + 245760 | 0) >>> 16 | 0) & 2 | 0;
              $0_1 = (($369 << $6_1 | 0) >>> 15 | 0) - ($0_1 | $4_1 | 0 | $6_1 | 0) | 0;
              $11_1 = ($0_1 << 1 | 0 | (($3_1 >>> ($0_1 + 21 | 0) | 0) & 1 | 0) | 0) + 28 | 0;
             }
             $6_1 = 0 - $3_1 | 0;
             label$32 : {
              label$33 : {
               label$34 : {
                label$35 : {
                 $4_1 = HEAP32[(($11_1 << 2 | 0) + 4072 | 0) >> 2] | 0;
                 if ($4_1) {
                  break label$35
                 }
                 $0_1 = 0;
                 $8_1 = 0;
                 break label$34;
                }
                $5_1 = $3_1 << (($11_1 | 0) == (31 | 0) ? 0 : 25 - ($11_1 >>> 1 | 0) | 0) | 0;
                $0_1 = 0;
                $8_1 = 0;
                label$36 : while (1) {
                 label$37 : {
                  $2_1 = ((HEAP32[($4_1 + 4 | 0) >> 2] | 0) & -8 | 0) - $3_1 | 0;
                  if ($2_1 >>> 0 >= $6_1 >>> 0) {
                   break label$37
                  }
                  $6_1 = $2_1;
                  $8_1 = $4_1;
                  if ($6_1) {
                   break label$37
                  }
                  $6_1 = 0;
                  $8_1 = $4_1;
                  $0_1 = $4_1;
                  break label$33;
                 }
                 $2_1 = HEAP32[($4_1 + 20 | 0) >> 2] | 0;
                 $4_1 = HEAP32[(($4_1 + (($5_1 >>> 29 | 0) & 4 | 0) | 0) + 16 | 0) >> 2] | 0;
                 $0_1 = $2_1 ? (($2_1 | 0) == ($4_1 | 0) ? $0_1 : $2_1) : $0_1;
                 $5_1 = $5_1 << (($4_1 | 0) != (0 | 0)) | 0;
                 if ($4_1) {
                  continue label$36
                 }
                 break label$36;
                };
               }
               label$38 : {
                if ($0_1 | $8_1 | 0) {
                 break label$38
                }
                $0_1 = 2 << $11_1 | 0;
                $0_1 = ($0_1 | (0 - $0_1 | 0) | 0) & $7_1 | 0;
                if (!$0_1) {
                 break label$13
                }
                $0_1 = ($0_1 & (0 - $0_1 | 0) | 0) + -1 | 0;
                $462 = $0_1;
                $0_1 = ($0_1 >>> 12 | 0) & 16 | 0;
                $4_1 = $462 >>> $0_1 | 0;
                $5_1 = ($4_1 >>> 5 | 0) & 8 | 0;
                $473 = $5_1 | $0_1 | 0;
                $0_1 = $4_1 >>> $5_1 | 0;
                $4_1 = ($0_1 >>> 2 | 0) & 4 | 0;
                $481 = $473 | $4_1 | 0;
                $0_1 = $0_1 >>> $4_1 | 0;
                $4_1 = ($0_1 >>> 1 | 0) & 2 | 0;
                $489 = $481 | $4_1 | 0;
                $0_1 = $0_1 >>> $4_1 | 0;
                $4_1 = ($0_1 >>> 1 | 0) & 1 | 0;
                $0_1 = HEAP32[(((($489 | $4_1 | 0) + ($0_1 >>> $4_1 | 0) | 0) << 2 | 0) + 4072 | 0) >> 2] | 0;
               }
               if (!$0_1) {
                break label$32
               }
              }
              label$39 : while (1) {
               $2_1 = ((HEAP32[($0_1 + 4 | 0) >> 2] | 0) & -8 | 0) - $3_1 | 0;
               $5_1 = $2_1 >>> 0 < $6_1 >>> 0;
               label$40 : {
                $4_1 = HEAP32[($0_1 + 16 | 0) >> 2] | 0;
                if ($4_1) {
                 break label$40
                }
                $4_1 = HEAP32[($0_1 + 20 | 0) >> 2] | 0;
               }
               $6_1 = $5_1 ? $2_1 : $6_1;
               $8_1 = $5_1 ? $0_1 : $8_1;
               $0_1 = $4_1;
               if ($0_1) {
                continue label$39
               }
               break label$39;
              };
             }
             if (!$8_1) {
              break label$13
             }
             if ($6_1 >>> 0 >= ((HEAP32[(0 + 3776 | 0) >> 2] | 0) - $3_1 | 0) >>> 0) {
              break label$13
             }
             $11_1 = HEAP32[($8_1 + 24 | 0) >> 2] | 0;
             label$41 : {
              $5_1 = HEAP32[($8_1 + 12 | 0) >> 2] | 0;
              if (($5_1 | 0) == ($8_1 | 0)) {
               break label$41
              }
              label$42 : {
               $0_1 = HEAP32[($8_1 + 8 | 0) >> 2] | 0;
               if ((HEAP32[(0 + 3784 | 0) >> 2] | 0) >>> 0 > $0_1 >>> 0) {
                break label$42
               }
               HEAP32[($0_1 + 12 | 0) >> 2] | 0;
              }
              HEAP32[($0_1 + 12 | 0) >> 2] = $5_1;
              HEAP32[($5_1 + 8 | 0) >> 2] = $0_1;
              break label$5;
             }
             label$43 : {
              $4_1 = $8_1 + 20 | 0;
              $0_1 = HEAP32[$4_1 >> 2] | 0;
              if ($0_1) {
               break label$43
              }
              $0_1 = HEAP32[($8_1 + 16 | 0) >> 2] | 0;
              if (!$0_1) {
               break label$11
              }
              $4_1 = $8_1 + 16 | 0;
             }
             label$44 : while (1) {
              $2_1 = $4_1;
              $5_1 = $0_1;
              $4_1 = $0_1 + 20 | 0;
              $0_1 = HEAP32[$4_1 >> 2] | 0;
              if ($0_1) {
               continue label$44
              }
              $4_1 = $5_1 + 16 | 0;
              $0_1 = HEAP32[($5_1 + 16 | 0) >> 2] | 0;
              if ($0_1) {
               continue label$44
              }
              break label$44;
             };
             HEAP32[$2_1 >> 2] = 0;
             break label$5;
            }
            label$45 : {
             $0_1 = HEAP32[(0 + 3776 | 0) >> 2] | 0;
             if ($0_1 >>> 0 < $3_1 >>> 0) {
              break label$45
             }
             $4_1 = HEAP32[(0 + 3788 | 0) >> 2] | 0;
             label$46 : {
              label$47 : {
               $6_1 = $0_1 - $3_1 | 0;
               if ($6_1 >>> 0 < 16 >>> 0) {
                break label$47
               }
               HEAP32[(0 + 3776 | 0) >> 2] = $6_1;
               $5_1 = $4_1 + $3_1 | 0;
               HEAP32[(0 + 3788 | 0) >> 2] = $5_1;
               HEAP32[($5_1 + 4 | 0) >> 2] = $6_1 | 1 | 0;
               HEAP32[($4_1 + $0_1 | 0) >> 2] = $6_1;
               HEAP32[($4_1 + 4 | 0) >> 2] = $3_1 | 3 | 0;
               break label$46;
              }
              HEAP32[(0 + 3788 | 0) >> 2] = 0;
              HEAP32[(0 + 3776 | 0) >> 2] = 0;
              HEAP32[($4_1 + 4 | 0) >> 2] = $0_1 | 3 | 0;
              $0_1 = $4_1 + $0_1 | 0;
              HEAP32[($0_1 + 4 | 0) >> 2] = HEAP32[($0_1 + 4 | 0) >> 2] | 0 | 1 | 0;
             }
             $0_1 = $4_1 + 8 | 0;
             break label$3;
            }
            label$48 : {
             $5_1 = HEAP32[(0 + 3780 | 0) >> 2] | 0;
             if ($5_1 >>> 0 <= $3_1 >>> 0) {
              break label$48
             }
             $4_1 = $5_1 - $3_1 | 0;
             HEAP32[(0 + 3780 | 0) >> 2] = $4_1;
             $0_1 = HEAP32[(0 + 3792 | 0) >> 2] | 0;
             $6_1 = $0_1 + $3_1 | 0;
             HEAP32[(0 + 3792 | 0) >> 2] = $6_1;
             HEAP32[($6_1 + 4 | 0) >> 2] = $4_1 | 1 | 0;
             HEAP32[($0_1 + 4 | 0) >> 2] = $3_1 | 3 | 0;
             $0_1 = $0_1 + 8 | 0;
             break label$3;
            }
            label$49 : {
             label$50 : {
              if (!(HEAP32[(0 + 4240 | 0) >> 2] | 0)) {
               break label$50
              }
              $4_1 = HEAP32[(0 + 4248 | 0) >> 2] | 0;
              break label$49;
             }
             i64toi32_i32$1 = 0;
             i64toi32_i32$0 = -1;
             HEAP32[(i64toi32_i32$1 + 4252 | 0) >> 2] = -1;
             HEAP32[(i64toi32_i32$1 + 4256 | 0) >> 2] = i64toi32_i32$0;
             i64toi32_i32$1 = 0;
             i64toi32_i32$0 = 4096;
             HEAP32[(i64toi32_i32$1 + 4244 | 0) >> 2] = 4096;
             HEAP32[(i64toi32_i32$1 + 4248 | 0) >> 2] = i64toi32_i32$0;
             HEAP32[(0 + 4240 | 0) >> 2] = (($1_1 + 12 | 0) & -16 | 0) ^ 1431655768 | 0;
             HEAP32[(0 + 4260 | 0) >> 2] = 0;
             HEAP32[(0 + 4212 | 0) >> 2] = 0;
             $4_1 = 4096;
            }
            $0_1 = 0;
            $7_1 = $3_1 + 47 | 0;
            $2_1 = $4_1 + $7_1 | 0;
            $11_1 = 0 - $4_1 | 0;
            $8_1 = $2_1 & $11_1 | 0;
            if ($8_1 >>> 0 <= $3_1 >>> 0) {
             break label$3
            }
            $0_1 = 0;
            label$51 : {
             $4_1 = HEAP32[(0 + 4208 | 0) >> 2] | 0;
             if (!$4_1) {
              break label$51
             }
             $6_1 = HEAP32[(0 + 4200 | 0) >> 2] | 0;
             $9_1 = $6_1 + $8_1 | 0;
             if ($9_1 >>> 0 <= $6_1 >>> 0) {
              break label$3
             }
             if ($9_1 >>> 0 > $4_1 >>> 0) {
              break label$3
             }
            }
            if ((HEAPU8[(0 + 4212 | 0) >> 0] | 0) & 4 | 0) {
             break label$8
            }
            label$52 : {
             label$53 : {
              label$54 : {
               $4_1 = HEAP32[(0 + 3792 | 0) >> 2] | 0;
               if (!$4_1) {
                break label$54
               }
               $0_1 = 4216;
               label$55 : while (1) {
                label$56 : {
                 $6_1 = HEAP32[$0_1 >> 2] | 0;
                 if ($6_1 >>> 0 > $4_1 >>> 0) {
                  break label$56
                 }
                 if (($6_1 + (HEAP32[($0_1 + 4 | 0) >> 2] | 0) | 0) >>> 0 > $4_1 >>> 0) {
                  break label$53
                 }
                }
                $0_1 = HEAP32[($0_1 + 8 | 0) >> 2] | 0;
                if ($0_1) {
                 continue label$55
                }
                break label$55;
               };
              }
              $5_1 = $70(0 | 0) | 0;
              if (($5_1 | 0) == (-1 | 0)) {
               break label$9
              }
              $2_1 = $8_1;
              label$57 : {
               $0_1 = HEAP32[(0 + 4244 | 0) >> 2] | 0;
               $4_1 = $0_1 + -1 | 0;
               if (!($4_1 & $5_1 | 0)) {
                break label$57
               }
               $2_1 = ($8_1 - $5_1 | 0) + (($4_1 + $5_1 | 0) & (0 - $0_1 | 0) | 0) | 0;
              }
              if ($2_1 >>> 0 <= $3_1 >>> 0) {
               break label$9
              }
              if ($2_1 >>> 0 > 2147483646 >>> 0) {
               break label$9
              }
              label$58 : {
               $0_1 = HEAP32[(0 + 4208 | 0) >> 2] | 0;
               if (!$0_1) {
                break label$58
               }
               $4_1 = HEAP32[(0 + 4200 | 0) >> 2] | 0;
               $6_1 = $4_1 + $2_1 | 0;
               if ($6_1 >>> 0 <= $4_1 >>> 0) {
                break label$9
               }
               if ($6_1 >>> 0 > $0_1 >>> 0) {
                break label$9
               }
              }
              $0_1 = $70($2_1 | 0) | 0;
              if (($0_1 | 0) != ($5_1 | 0)) {
               break label$52
              }
              break label$7;
             }
             $2_1 = ($2_1 - $5_1 | 0) & $11_1 | 0;
             if ($2_1 >>> 0 > 2147483646 >>> 0) {
              break label$9
             }
             $5_1 = $70($2_1 | 0) | 0;
             if (($5_1 | 0) == ((HEAP32[$0_1 >> 2] | 0) + (HEAP32[($0_1 + 4 | 0) >> 2] | 0) | 0 | 0)) {
              break label$10
             }
             $0_1 = $5_1;
            }
            $5_1 = $0_1;
            label$59 : {
             if (($3_1 + 48 | 0) >>> 0 <= $2_1 >>> 0) {
              break label$59
             }
             if ($2_1 >>> 0 > 2147483646 >>> 0) {
              break label$59
             }
             if (($5_1 | 0) == (-1 | 0)) {
              break label$59
             }
             $0_1 = HEAP32[(0 + 4248 | 0) >> 2] | 0;
             $0_1 = (($7_1 - $2_1 | 0) + $0_1 | 0) & (0 - $0_1 | 0) | 0;
             if ($0_1 >>> 0 > 2147483646 >>> 0) {
              break label$7
             }
             label$60 : {
              if (($70($0_1 | 0) | 0 | 0) == (-1 | 0)) {
               break label$60
              }
              $2_1 = $0_1 + $2_1 | 0;
              break label$7;
             }
             $70(0 - $2_1 | 0 | 0) | 0;
             break label$9;
            }
            if (($5_1 | 0) != (-1 | 0)) {
             break label$7
            }
            break label$9;
           }
           $8_1 = 0;
           break label$4;
          }
          $5_1 = 0;
          break label$5;
         }
         if (($5_1 | 0) != (-1 | 0)) {
          break label$7
         }
        }
        HEAP32[(0 + 4212 | 0) >> 2] = HEAP32[(0 + 4212 | 0) >> 2] | 0 | 4 | 0;
       }
       if ($8_1 >>> 0 > 2147483646 >>> 0) {
        break label$6
       }
       $5_1 = $70($8_1 | 0) | 0;
       $0_1 = $70(0 | 0) | 0;
       if ($5_1 >>> 0 >= $0_1 >>> 0) {
        break label$6
       }
       if (($5_1 | 0) == (-1 | 0)) {
        break label$6
       }
       if (($0_1 | 0) == (-1 | 0)) {
        break label$6
       }
       $2_1 = $0_1 - $5_1 | 0;
       if ($2_1 >>> 0 <= ($3_1 + 40 | 0) >>> 0) {
        break label$6
       }
      }
      $0_1 = (HEAP32[(0 + 4200 | 0) >> 2] | 0) + $2_1 | 0;
      HEAP32[(0 + 4200 | 0) >> 2] = $0_1;
      label$61 : {
       if ($0_1 >>> 0 <= (HEAP32[(0 + 4204 | 0) >> 2] | 0) >>> 0) {
        break label$61
       }
       HEAP32[(0 + 4204 | 0) >> 2] = $0_1;
      }
      label$62 : {
       label$63 : {
        label$64 : {
         label$65 : {
          $4_1 = HEAP32[(0 + 3792 | 0) >> 2] | 0;
          if (!$4_1) {
           break label$65
          }
          $0_1 = 4216;
          label$66 : while (1) {
           $6_1 = HEAP32[$0_1 >> 2] | 0;
           $8_1 = HEAP32[($0_1 + 4 | 0) >> 2] | 0;
           if (($5_1 | 0) == ($6_1 + $8_1 | 0 | 0)) {
            break label$64
           }
           $0_1 = HEAP32[($0_1 + 8 | 0) >> 2] | 0;
           if ($0_1) {
            continue label$66
           }
           break label$63;
          };
         }
         label$67 : {
          label$68 : {
           $0_1 = HEAP32[(0 + 3784 | 0) >> 2] | 0;
           if (!$0_1) {
            break label$68
           }
           if ($5_1 >>> 0 >= $0_1 >>> 0) {
            break label$67
           }
          }
          HEAP32[(0 + 3784 | 0) >> 2] = $5_1;
         }
         $0_1 = 0;
         HEAP32[(0 + 4220 | 0) >> 2] = $2_1;
         HEAP32[(0 + 4216 | 0) >> 2] = $5_1;
         HEAP32[(0 + 3800 | 0) >> 2] = -1;
         HEAP32[(0 + 3804 | 0) >> 2] = HEAP32[(0 + 4240 | 0) >> 2] | 0;
         HEAP32[(0 + 4228 | 0) >> 2] = 0;
         label$69 : while (1) {
          $4_1 = $0_1 << 3 | 0;
          $6_1 = $4_1 + 3808 | 0;
          HEAP32[($4_1 + 3816 | 0) >> 2] = $6_1;
          HEAP32[($4_1 + 3820 | 0) >> 2] = $6_1;
          $0_1 = $0_1 + 1 | 0;
          if (($0_1 | 0) != (32 | 0)) {
           continue label$69
          }
          break label$69;
         };
         $0_1 = $2_1 + -40 | 0;
         $4_1 = ($5_1 + 8 | 0) & 7 | 0 ? (-8 - $5_1 | 0) & 7 | 0 : 0;
         $6_1 = $0_1 - $4_1 | 0;
         HEAP32[(0 + 3780 | 0) >> 2] = $6_1;
         $4_1 = $5_1 + $4_1 | 0;
         HEAP32[(0 + 3792 | 0) >> 2] = $4_1;
         HEAP32[($4_1 + 4 | 0) >> 2] = $6_1 | 1 | 0;
         HEAP32[(($5_1 + $0_1 | 0) + 4 | 0) >> 2] = 40;
         HEAP32[(0 + 3796 | 0) >> 2] = HEAP32[(0 + 4256 | 0) >> 2] | 0;
         break label$62;
        }
        if ((HEAPU8[($0_1 + 12 | 0) >> 0] | 0) & 8 | 0) {
         break label$63
        }
        if ($5_1 >>> 0 <= $4_1 >>> 0) {
         break label$63
        }
        if ($6_1 >>> 0 > $4_1 >>> 0) {
         break label$63
        }
        HEAP32[($0_1 + 4 | 0) >> 2] = $8_1 + $2_1 | 0;
        $0_1 = ($4_1 + 8 | 0) & 7 | 0 ? (-8 - $4_1 | 0) & 7 | 0 : 0;
        $6_1 = $4_1 + $0_1 | 0;
        HEAP32[(0 + 3792 | 0) >> 2] = $6_1;
        $5_1 = (HEAP32[(0 + 3780 | 0) >> 2] | 0) + $2_1 | 0;
        $0_1 = $5_1 - $0_1 | 0;
        HEAP32[(0 + 3780 | 0) >> 2] = $0_1;
        HEAP32[($6_1 + 4 | 0) >> 2] = $0_1 | 1 | 0;
        HEAP32[(($4_1 + $5_1 | 0) + 4 | 0) >> 2] = 40;
        HEAP32[(0 + 3796 | 0) >> 2] = HEAP32[(0 + 4256 | 0) >> 2] | 0;
        break label$62;
       }
       label$70 : {
        $8_1 = HEAP32[(0 + 3784 | 0) >> 2] | 0;
        if ($5_1 >>> 0 >= $8_1 >>> 0) {
         break label$70
        }
        HEAP32[(0 + 3784 | 0) >> 2] = $5_1;
        $8_1 = $5_1;
       }
       $6_1 = $5_1 + $2_1 | 0;
       $0_1 = 4216;
       label$71 : {
        label$72 : {
         label$73 : {
          label$74 : {
           label$75 : {
            label$76 : {
             label$77 : {
              label$78 : while (1) {
               if ((HEAP32[$0_1 >> 2] | 0 | 0) == ($6_1 | 0)) {
                break label$77
               }
               $0_1 = HEAP32[($0_1 + 8 | 0) >> 2] | 0;
               if ($0_1) {
                continue label$78
               }
               break label$76;
              };
             }
             if (!((HEAPU8[($0_1 + 12 | 0) >> 0] | 0) & 8 | 0)) {
              break label$75
             }
            }
            $0_1 = 4216;
            label$79 : while (1) {
             label$80 : {
              $6_1 = HEAP32[$0_1 >> 2] | 0;
              if ($6_1 >>> 0 > $4_1 >>> 0) {
               break label$80
              }
              $6_1 = $6_1 + (HEAP32[($0_1 + 4 | 0) >> 2] | 0) | 0;
              if ($6_1 >>> 0 > $4_1 >>> 0) {
               break label$74
              }
             }
             $0_1 = HEAP32[($0_1 + 8 | 0) >> 2] | 0;
             continue label$79;
            };
           }
           HEAP32[$0_1 >> 2] = $5_1;
           HEAP32[($0_1 + 4 | 0) >> 2] = (HEAP32[($0_1 + 4 | 0) >> 2] | 0) + $2_1 | 0;
           $11_1 = $5_1 + (($5_1 + 8 | 0) & 7 | 0 ? (-8 - $5_1 | 0) & 7 | 0 : 0) | 0;
           HEAP32[($11_1 + 4 | 0) >> 2] = $3_1 | 3 | 0;
           $5_1 = $6_1 + (($6_1 + 8 | 0) & 7 | 0 ? (-8 - $6_1 | 0) & 7 | 0 : 0) | 0;
           $0_1 = ($5_1 - $11_1 | 0) - $3_1 | 0;
           $6_1 = $11_1 + $3_1 | 0;
           label$81 : {
            if (($4_1 | 0) != ($5_1 | 0)) {
             break label$81
            }
            HEAP32[(0 + 3792 | 0) >> 2] = $6_1;
            $0_1 = (HEAP32[(0 + 3780 | 0) >> 2] | 0) + $0_1 | 0;
            HEAP32[(0 + 3780 | 0) >> 2] = $0_1;
            HEAP32[($6_1 + 4 | 0) >> 2] = $0_1 | 1 | 0;
            break label$72;
           }
           label$82 : {
            if ((HEAP32[(0 + 3788 | 0) >> 2] | 0 | 0) != ($5_1 | 0)) {
             break label$82
            }
            HEAP32[(0 + 3788 | 0) >> 2] = $6_1;
            $0_1 = (HEAP32[(0 + 3776 | 0) >> 2] | 0) + $0_1 | 0;
            HEAP32[(0 + 3776 | 0) >> 2] = $0_1;
            HEAP32[($6_1 + 4 | 0) >> 2] = $0_1 | 1 | 0;
            HEAP32[($6_1 + $0_1 | 0) >> 2] = $0_1;
            break label$72;
           }
           label$83 : {
            $4_1 = HEAP32[($5_1 + 4 | 0) >> 2] | 0;
            if (($4_1 & 3 | 0 | 0) != (1 | 0)) {
             break label$83
            }
            $7_1 = $4_1 & -8 | 0;
            label$84 : {
             label$85 : {
              if ($4_1 >>> 0 > 255 >>> 0) {
               break label$85
              }
              $3_1 = HEAP32[($5_1 + 12 | 0) >> 2] | 0;
              label$86 : {
               $2_1 = HEAP32[($5_1 + 8 | 0) >> 2] | 0;
               $9_1 = $4_1 >>> 3 | 0;
               $4_1 = ($9_1 << 3 | 0) + 3808 | 0;
               if (($2_1 | 0) == ($4_1 | 0)) {
                break label$86
               }
              }
              label$87 : {
               if (($3_1 | 0) != ($2_1 | 0)) {
                break label$87
               }
               HEAP32[(0 + 3768 | 0) >> 2] = (HEAP32[(0 + 3768 | 0) >> 2] | 0) & (__wasm_rotl_i32(-2 | 0, $9_1 | 0) | 0) | 0;
               break label$84;
              }
              label$88 : {
               if (($3_1 | 0) == ($4_1 | 0)) {
                break label$88
               }
              }
              HEAP32[($2_1 + 12 | 0) >> 2] = $3_1;
              HEAP32[($3_1 + 8 | 0) >> 2] = $2_1;
              break label$84;
             }
             $9_1 = HEAP32[($5_1 + 24 | 0) >> 2] | 0;
             label$89 : {
              label$90 : {
               $2_1 = HEAP32[($5_1 + 12 | 0) >> 2] | 0;
               if (($2_1 | 0) == ($5_1 | 0)) {
                break label$90
               }
               label$91 : {
                $4_1 = HEAP32[($5_1 + 8 | 0) >> 2] | 0;
                if ($8_1 >>> 0 > $4_1 >>> 0) {
                 break label$91
                }
                HEAP32[($4_1 + 12 | 0) >> 2] | 0;
               }
               HEAP32[($4_1 + 12 | 0) >> 2] = $2_1;
               HEAP32[($2_1 + 8 | 0) >> 2] = $4_1;
               break label$89;
              }
              label$92 : {
               $4_1 = $5_1 + 20 | 0;
               $3_1 = HEAP32[$4_1 >> 2] | 0;
               if ($3_1) {
                break label$92
               }
               $4_1 = $5_1 + 16 | 0;
               $3_1 = HEAP32[$4_1 >> 2] | 0;
               if ($3_1) {
                break label$92
               }
               $2_1 = 0;
               break label$89;
              }
              label$93 : while (1) {
               $8_1 = $4_1;
               $2_1 = $3_1;
               $4_1 = $3_1 + 20 | 0;
               $3_1 = HEAP32[$4_1 >> 2] | 0;
               if ($3_1) {
                continue label$93
               }
               $4_1 = $2_1 + 16 | 0;
               $3_1 = HEAP32[($2_1 + 16 | 0) >> 2] | 0;
               if ($3_1) {
                continue label$93
               }
               break label$93;
              };
              HEAP32[$8_1 >> 2] = 0;
             }
             if (!$9_1) {
              break label$84
             }
             label$94 : {
              label$95 : {
               $3_1 = HEAP32[($5_1 + 28 | 0) >> 2] | 0;
               $4_1 = ($3_1 << 2 | 0) + 4072 | 0;
               if ((HEAP32[$4_1 >> 2] | 0 | 0) != ($5_1 | 0)) {
                break label$95
               }
               HEAP32[$4_1 >> 2] = $2_1;
               if ($2_1) {
                break label$94
               }
               HEAP32[(0 + 3772 | 0) >> 2] = (HEAP32[(0 + 3772 | 0) >> 2] | 0) & (__wasm_rotl_i32(-2 | 0, $3_1 | 0) | 0) | 0;
               break label$84;
              }
              HEAP32[($9_1 + ((HEAP32[($9_1 + 16 | 0) >> 2] | 0 | 0) == ($5_1 | 0) ? 16 : 20) | 0) >> 2] = $2_1;
              if (!$2_1) {
               break label$84
              }
             }
             HEAP32[($2_1 + 24 | 0) >> 2] = $9_1;
             label$96 : {
              $4_1 = HEAP32[($5_1 + 16 | 0) >> 2] | 0;
              if (!$4_1) {
               break label$96
              }
              HEAP32[($2_1 + 16 | 0) >> 2] = $4_1;
              HEAP32[($4_1 + 24 | 0) >> 2] = $2_1;
             }
             $4_1 = HEAP32[($5_1 + 20 | 0) >> 2] | 0;
             if (!$4_1) {
              break label$84
             }
             HEAP32[($2_1 + 20 | 0) >> 2] = $4_1;
             HEAP32[($4_1 + 24 | 0) >> 2] = $2_1;
            }
            $0_1 = $7_1 + $0_1 | 0;
            $5_1 = $5_1 + $7_1 | 0;
           }
           HEAP32[($5_1 + 4 | 0) >> 2] = (HEAP32[($5_1 + 4 | 0) >> 2] | 0) & -2 | 0;
           HEAP32[($6_1 + 4 | 0) >> 2] = $0_1 | 1 | 0;
           HEAP32[($6_1 + $0_1 | 0) >> 2] = $0_1;
           label$97 : {
            if ($0_1 >>> 0 > 255 >>> 0) {
             break label$97
            }
            $4_1 = $0_1 >>> 3 | 0;
            $0_1 = ($4_1 << 3 | 0) + 3808 | 0;
            label$98 : {
             label$99 : {
              $3_1 = HEAP32[(0 + 3768 | 0) >> 2] | 0;
              $4_1 = 1 << $4_1 | 0;
              if ($3_1 & $4_1 | 0) {
               break label$99
              }
              HEAP32[(0 + 3768 | 0) >> 2] = $3_1 | $4_1 | 0;
              $4_1 = $0_1;
              break label$98;
             }
             $4_1 = HEAP32[($0_1 + 8 | 0) >> 2] | 0;
            }
            HEAP32[($0_1 + 8 | 0) >> 2] = $6_1;
            HEAP32[($4_1 + 12 | 0) >> 2] = $6_1;
            HEAP32[($6_1 + 12 | 0) >> 2] = $0_1;
            HEAP32[($6_1 + 8 | 0) >> 2] = $4_1;
            break label$72;
           }
           $4_1 = 0;
           label$100 : {
            $3_1 = $0_1 >>> 8 | 0;
            if (!$3_1) {
             break label$100
            }
            $4_1 = 31;
            if ($0_1 >>> 0 > 16777215 >>> 0) {
             break label$100
            }
            $4_1 = (($3_1 + 1048320 | 0) >>> 16 | 0) & 8 | 0;
            $3_1 = $3_1 << $4_1 | 0;
            $1200 = $3_1;
            $3_1 = (($3_1 + 520192 | 0) >>> 16 | 0) & 4 | 0;
            $5_1 = $1200 << $3_1 | 0;
            $1207 = $5_1;
            $5_1 = (($5_1 + 245760 | 0) >>> 16 | 0) & 2 | 0;
            $4_1 = (($1207 << $5_1 | 0) >>> 15 | 0) - ($3_1 | $4_1 | 0 | $5_1 | 0) | 0;
            $4_1 = ($4_1 << 1 | 0 | (($0_1 >>> ($4_1 + 21 | 0) | 0) & 1 | 0) | 0) + 28 | 0;
           }
           HEAP32[($6_1 + 28 | 0) >> 2] = $4_1;
           i64toi32_i32$1 = $6_1;
           i64toi32_i32$0 = 0;
           HEAP32[($6_1 + 16 | 0) >> 2] = 0;
           HEAP32[($6_1 + 20 | 0) >> 2] = i64toi32_i32$0;
           $3_1 = ($4_1 << 2 | 0) + 4072 | 0;
           label$101 : {
            label$102 : {
             $5_1 = HEAP32[(0 + 3772 | 0) >> 2] | 0;
             $8_1 = 1 << $4_1 | 0;
             if ($5_1 & $8_1 | 0) {
              break label$102
             }
             HEAP32[(0 + 3772 | 0) >> 2] = $5_1 | $8_1 | 0;
             HEAP32[$3_1 >> 2] = $6_1;
             HEAP32[($6_1 + 24 | 0) >> 2] = $3_1;
             break label$101;
            }
            $4_1 = $0_1 << (($4_1 | 0) == (31 | 0) ? 0 : 25 - ($4_1 >>> 1 | 0) | 0) | 0;
            $5_1 = HEAP32[$3_1 >> 2] | 0;
            label$103 : while (1) {
             $3_1 = $5_1;
             if (((HEAP32[($5_1 + 4 | 0) >> 2] | 0) & -8 | 0 | 0) == ($0_1 | 0)) {
              break label$73
             }
             $5_1 = $4_1 >>> 29 | 0;
             $4_1 = $4_1 << 1 | 0;
             $8_1 = ($3_1 + ($5_1 & 4 | 0) | 0) + 16 | 0;
             $5_1 = HEAP32[$8_1 >> 2] | 0;
             if ($5_1) {
              continue label$103
             }
             break label$103;
            };
            HEAP32[$8_1 >> 2] = $6_1;
            HEAP32[($6_1 + 24 | 0) >> 2] = $3_1;
           }
           HEAP32[($6_1 + 12 | 0) >> 2] = $6_1;
           HEAP32[($6_1 + 8 | 0) >> 2] = $6_1;
           break label$72;
          }
          $0_1 = $2_1 + -40 | 0;
          $8_1 = ($5_1 + 8 | 0) & 7 | 0 ? (-8 - $5_1 | 0) & 7 | 0 : 0;
          $11_1 = $0_1 - $8_1 | 0;
          HEAP32[(0 + 3780 | 0) >> 2] = $11_1;
          $8_1 = $5_1 + $8_1 | 0;
          HEAP32[(0 + 3792 | 0) >> 2] = $8_1;
          HEAP32[($8_1 + 4 | 0) >> 2] = $11_1 | 1 | 0;
          HEAP32[(($5_1 + $0_1 | 0) + 4 | 0) >> 2] = 40;
          HEAP32[(0 + 3796 | 0) >> 2] = HEAP32[(0 + 4256 | 0) >> 2] | 0;
          $0_1 = ($6_1 + (($6_1 + -39 | 0) & 7 | 0 ? (39 - $6_1 | 0) & 7 | 0 : 0) | 0) + -47 | 0;
          $8_1 = $0_1 >>> 0 < ($4_1 + 16 | 0) >>> 0 ? $4_1 : $0_1;
          HEAP32[($8_1 + 4 | 0) >> 2] = 27;
          i64toi32_i32$2 = 0;
          i64toi32_i32$0 = HEAP32[(i64toi32_i32$2 + 4224 | 0) >> 2] | 0;
          i64toi32_i32$1 = HEAP32[(i64toi32_i32$2 + 4228 | 0) >> 2] | 0;
          $1329 = i64toi32_i32$0;
          i64toi32_i32$0 = $8_1 + 16 | 0;
          HEAP32[i64toi32_i32$0 >> 2] = $1329;
          HEAP32[(i64toi32_i32$0 + 4 | 0) >> 2] = i64toi32_i32$1;
          i64toi32_i32$2 = 0;
          i64toi32_i32$1 = HEAP32[(i64toi32_i32$2 + 4216 | 0) >> 2] | 0;
          i64toi32_i32$0 = HEAP32[(i64toi32_i32$2 + 4220 | 0) >> 2] | 0;
          $1331 = i64toi32_i32$1;
          i64toi32_i32$1 = $8_1;
          HEAP32[($8_1 + 8 | 0) >> 2] = $1331;
          HEAP32[($8_1 + 12 | 0) >> 2] = i64toi32_i32$0;
          HEAP32[(0 + 4224 | 0) >> 2] = $8_1 + 8 | 0;
          HEAP32[(0 + 4220 | 0) >> 2] = $2_1;
          HEAP32[(0 + 4216 | 0) >> 2] = $5_1;
          HEAP32[(0 + 4228 | 0) >> 2] = 0;
          $0_1 = $8_1 + 24 | 0;
          label$104 : while (1) {
           HEAP32[($0_1 + 4 | 0) >> 2] = 7;
           $5_1 = $0_1 + 8 | 0;
           $0_1 = $0_1 + 4 | 0;
           if ($6_1 >>> 0 > $5_1 >>> 0) {
            continue label$104
           }
           break label$104;
          };
          if (($8_1 | 0) == ($4_1 | 0)) {
           break label$62
          }
          HEAP32[($8_1 + 4 | 0) >> 2] = (HEAP32[($8_1 + 4 | 0) >> 2] | 0) & -2 | 0;
          $2_1 = $8_1 - $4_1 | 0;
          HEAP32[($4_1 + 4 | 0) >> 2] = $2_1 | 1 | 0;
          HEAP32[$8_1 >> 2] = $2_1;
          label$105 : {
           if ($2_1 >>> 0 > 255 >>> 0) {
            break label$105
           }
           $6_1 = $2_1 >>> 3 | 0;
           $0_1 = ($6_1 << 3 | 0) + 3808 | 0;
           label$106 : {
            label$107 : {
             $5_1 = HEAP32[(0 + 3768 | 0) >> 2] | 0;
             $6_1 = 1 << $6_1 | 0;
             if ($5_1 & $6_1 | 0) {
              break label$107
             }
             HEAP32[(0 + 3768 | 0) >> 2] = $5_1 | $6_1 | 0;
             $6_1 = $0_1;
             break label$106;
            }
            $6_1 = HEAP32[($0_1 + 8 | 0) >> 2] | 0;
           }
           HEAP32[($0_1 + 8 | 0) >> 2] = $4_1;
           HEAP32[($6_1 + 12 | 0) >> 2] = $4_1;
           HEAP32[($4_1 + 12 | 0) >> 2] = $0_1;
           HEAP32[($4_1 + 8 | 0) >> 2] = $6_1;
           break label$62;
          }
          $0_1 = 0;
          label$108 : {
           $6_1 = $2_1 >>> 8 | 0;
           if (!$6_1) {
            break label$108
           }
           $0_1 = 31;
           if ($2_1 >>> 0 > 16777215 >>> 0) {
            break label$108
           }
           $0_1 = (($6_1 + 1048320 | 0) >>> 16 | 0) & 8 | 0;
           $6_1 = $6_1 << $0_1 | 0;
           $1401 = $6_1;
           $6_1 = (($6_1 + 520192 | 0) >>> 16 | 0) & 4 | 0;
           $5_1 = $1401 << $6_1 | 0;
           $1408 = $5_1;
           $5_1 = (($5_1 + 245760 | 0) >>> 16 | 0) & 2 | 0;
           $0_1 = (($1408 << $5_1 | 0) >>> 15 | 0) - ($6_1 | $0_1 | 0 | $5_1 | 0) | 0;
           $0_1 = ($0_1 << 1 | 0 | (($2_1 >>> ($0_1 + 21 | 0) | 0) & 1 | 0) | 0) + 28 | 0;
          }
          i64toi32_i32$1 = $4_1;
          i64toi32_i32$0 = 0;
          HEAP32[($4_1 + 16 | 0) >> 2] = 0;
          HEAP32[($4_1 + 20 | 0) >> 2] = i64toi32_i32$0;
          HEAP32[($4_1 + 28 | 0) >> 2] = $0_1;
          $6_1 = ($0_1 << 2 | 0) + 4072 | 0;
          label$109 : {
           label$110 : {
            $5_1 = HEAP32[(0 + 3772 | 0) >> 2] | 0;
            $8_1 = 1 << $0_1 | 0;
            if ($5_1 & $8_1 | 0) {
             break label$110
            }
            HEAP32[(0 + 3772 | 0) >> 2] = $5_1 | $8_1 | 0;
            HEAP32[$6_1 >> 2] = $4_1;
            HEAP32[($4_1 + 24 | 0) >> 2] = $6_1;
            break label$109;
           }
           $0_1 = $2_1 << (($0_1 | 0) == (31 | 0) ? 0 : 25 - ($0_1 >>> 1 | 0) | 0) | 0;
           $5_1 = HEAP32[$6_1 >> 2] | 0;
           label$111 : while (1) {
            $6_1 = $5_1;
            if (((HEAP32[($5_1 + 4 | 0) >> 2] | 0) & -8 | 0 | 0) == ($2_1 | 0)) {
             break label$71
            }
            $5_1 = $0_1 >>> 29 | 0;
            $0_1 = $0_1 << 1 | 0;
            $8_1 = ($6_1 + ($5_1 & 4 | 0) | 0) + 16 | 0;
            $5_1 = HEAP32[$8_1 >> 2] | 0;
            if ($5_1) {
             continue label$111
            }
            break label$111;
           };
           HEAP32[$8_1 >> 2] = $4_1;
           HEAP32[($4_1 + 24 | 0) >> 2] = $6_1;
          }
          HEAP32[($4_1 + 12 | 0) >> 2] = $4_1;
          HEAP32[($4_1 + 8 | 0) >> 2] = $4_1;
          break label$62;
         }
         $0_1 = HEAP32[($3_1 + 8 | 0) >> 2] | 0;
         HEAP32[($0_1 + 12 | 0) >> 2] = $6_1;
         HEAP32[($3_1 + 8 | 0) >> 2] = $6_1;
         HEAP32[($6_1 + 24 | 0) >> 2] = 0;
         HEAP32[($6_1 + 12 | 0) >> 2] = $3_1;
         HEAP32[($6_1 + 8 | 0) >> 2] = $0_1;
        }
        $0_1 = $11_1 + 8 | 0;
        break label$3;
       }
       $0_1 = HEAP32[($6_1 + 8 | 0) >> 2] | 0;
       HEAP32[($0_1 + 12 | 0) >> 2] = $4_1;
       HEAP32[($6_1 + 8 | 0) >> 2] = $4_1;
       HEAP32[($4_1 + 24 | 0) >> 2] = 0;
       HEAP32[($4_1 + 12 | 0) >> 2] = $6_1;
       HEAP32[($4_1 + 8 | 0) >> 2] = $0_1;
      }
      $0_1 = HEAP32[(0 + 3780 | 0) >> 2] | 0;
      if ($0_1 >>> 0 <= $3_1 >>> 0) {
       break label$6
      }
      $4_1 = $0_1 - $3_1 | 0;
      HEAP32[(0 + 3780 | 0) >> 2] = $4_1;
      $0_1 = HEAP32[(0 + 3792 | 0) >> 2] | 0;
      $6_1 = $0_1 + $3_1 | 0;
      HEAP32[(0 + 3792 | 0) >> 2] = $6_1;
      HEAP32[($6_1 + 4 | 0) >> 2] = $4_1 | 1 | 0;
      HEAP32[($0_1 + 4 | 0) >> 2] = $3_1 | 3 | 0;
      $0_1 = $0_1 + 8 | 0;
      break label$3;
     }
     HEAP32[($8() | 0) >> 2] = 48;
     $0_1 = 0;
     break label$3;
    }
    label$112 : {
     if (!$11_1) {
      break label$112
     }
     label$113 : {
      label$114 : {
       $4_1 = HEAP32[($8_1 + 28 | 0) >> 2] | 0;
       $0_1 = ($4_1 << 2 | 0) + 4072 | 0;
       if (($8_1 | 0) != (HEAP32[$0_1 >> 2] | 0 | 0)) {
        break label$114
       }
       HEAP32[$0_1 >> 2] = $5_1;
       if ($5_1) {
        break label$113
       }
       $7_1 = $7_1 & (__wasm_rotl_i32(-2 | 0, $4_1 | 0) | 0) | 0;
       HEAP32[(0 + 3772 | 0) >> 2] = $7_1;
       break label$112;
      }
      HEAP32[($11_1 + ((HEAP32[($11_1 + 16 | 0) >> 2] | 0 | 0) == ($8_1 | 0) ? 16 : 20) | 0) >> 2] = $5_1;
      if (!$5_1) {
       break label$112
      }
     }
     HEAP32[($5_1 + 24 | 0) >> 2] = $11_1;
     label$115 : {
      $0_1 = HEAP32[($8_1 + 16 | 0) >> 2] | 0;
      if (!$0_1) {
       break label$115
      }
      HEAP32[($5_1 + 16 | 0) >> 2] = $0_1;
      HEAP32[($0_1 + 24 | 0) >> 2] = $5_1;
     }
     $0_1 = HEAP32[($8_1 + 20 | 0) >> 2] | 0;
     if (!$0_1) {
      break label$112
     }
     HEAP32[($5_1 + 20 | 0) >> 2] = $0_1;
     HEAP32[($0_1 + 24 | 0) >> 2] = $5_1;
    }
    label$116 : {
     label$117 : {
      if ($6_1 >>> 0 > 15 >>> 0) {
       break label$117
      }
      $0_1 = $6_1 + $3_1 | 0;
      HEAP32[($8_1 + 4 | 0) >> 2] = $0_1 | 3 | 0;
      $0_1 = $8_1 + $0_1 | 0;
      HEAP32[($0_1 + 4 | 0) >> 2] = HEAP32[($0_1 + 4 | 0) >> 2] | 0 | 1 | 0;
      break label$116;
     }
     HEAP32[($8_1 + 4 | 0) >> 2] = $3_1 | 3 | 0;
     $5_1 = $8_1 + $3_1 | 0;
     HEAP32[($5_1 + 4 | 0) >> 2] = $6_1 | 1 | 0;
     HEAP32[($5_1 + $6_1 | 0) >> 2] = $6_1;
     label$118 : {
      if ($6_1 >>> 0 > 255 >>> 0) {
       break label$118
      }
      $4_1 = $6_1 >>> 3 | 0;
      $0_1 = ($4_1 << 3 | 0) + 3808 | 0;
      label$119 : {
       label$120 : {
        $6_1 = HEAP32[(0 + 3768 | 0) >> 2] | 0;
        $4_1 = 1 << $4_1 | 0;
        if ($6_1 & $4_1 | 0) {
         break label$120
        }
        HEAP32[(0 + 3768 | 0) >> 2] = $6_1 | $4_1 | 0;
        $4_1 = $0_1;
        break label$119;
       }
       $4_1 = HEAP32[($0_1 + 8 | 0) >> 2] | 0;
      }
      HEAP32[($0_1 + 8 | 0) >> 2] = $5_1;
      HEAP32[($4_1 + 12 | 0) >> 2] = $5_1;
      HEAP32[($5_1 + 12 | 0) >> 2] = $0_1;
      HEAP32[($5_1 + 8 | 0) >> 2] = $4_1;
      break label$116;
     }
     label$121 : {
      label$122 : {
       $4_1 = $6_1 >>> 8 | 0;
       if ($4_1) {
        break label$122
       }
       $0_1 = 0;
       break label$121;
      }
      $0_1 = 31;
      if ($6_1 >>> 0 > 16777215 >>> 0) {
       break label$121
      }
      $0_1 = (($4_1 + 1048320 | 0) >>> 16 | 0) & 8 | 0;
      $4_1 = $4_1 << $0_1 | 0;
      $1652 = $4_1;
      $4_1 = (($4_1 + 520192 | 0) >>> 16 | 0) & 4 | 0;
      $3_1 = $1652 << $4_1 | 0;
      $1659 = $3_1;
      $3_1 = (($3_1 + 245760 | 0) >>> 16 | 0) & 2 | 0;
      $0_1 = (($1659 << $3_1 | 0) >>> 15 | 0) - ($4_1 | $0_1 | 0 | $3_1 | 0) | 0;
      $0_1 = ($0_1 << 1 | 0 | (($6_1 >>> ($0_1 + 21 | 0) | 0) & 1 | 0) | 0) + 28 | 0;
     }
     HEAP32[($5_1 + 28 | 0) >> 2] = $0_1;
     i64toi32_i32$1 = $5_1;
     i64toi32_i32$0 = 0;
     HEAP32[($5_1 + 16 | 0) >> 2] = 0;
     HEAP32[($5_1 + 20 | 0) >> 2] = i64toi32_i32$0;
     $4_1 = ($0_1 << 2 | 0) + 4072 | 0;
     label$123 : {
      label$124 : {
       label$125 : {
        $3_1 = 1 << $0_1 | 0;
        if ($7_1 & $3_1 | 0) {
         break label$125
        }
        HEAP32[(0 + 3772 | 0) >> 2] = $7_1 | $3_1 | 0;
        HEAP32[$4_1 >> 2] = $5_1;
        HEAP32[($5_1 + 24 | 0) >> 2] = $4_1;
        break label$124;
       }
       $0_1 = $6_1 << (($0_1 | 0) == (31 | 0) ? 0 : 25 - ($0_1 >>> 1 | 0) | 0) | 0;
       $3_1 = HEAP32[$4_1 >> 2] | 0;
       label$126 : while (1) {
        $4_1 = $3_1;
        if (((HEAP32[($4_1 + 4 | 0) >> 2] | 0) & -8 | 0 | 0) == ($6_1 | 0)) {
         break label$123
        }
        $3_1 = $0_1 >>> 29 | 0;
        $0_1 = $0_1 << 1 | 0;
        $2_1 = ($4_1 + ($3_1 & 4 | 0) | 0) + 16 | 0;
        $3_1 = HEAP32[$2_1 >> 2] | 0;
        if ($3_1) {
         continue label$126
        }
        break label$126;
       };
       HEAP32[$2_1 >> 2] = $5_1;
       HEAP32[($5_1 + 24 | 0) >> 2] = $4_1;
      }
      HEAP32[($5_1 + 12 | 0) >> 2] = $5_1;
      HEAP32[($5_1 + 8 | 0) >> 2] = $5_1;
      break label$116;
     }
     $0_1 = HEAP32[($4_1 + 8 | 0) >> 2] | 0;
     HEAP32[($0_1 + 12 | 0) >> 2] = $5_1;
     HEAP32[($4_1 + 8 | 0) >> 2] = $5_1;
     HEAP32[($5_1 + 24 | 0) >> 2] = 0;
     HEAP32[($5_1 + 12 | 0) >> 2] = $4_1;
     HEAP32[($5_1 + 8 | 0) >> 2] = $0_1;
    }
    $0_1 = $8_1 + 8 | 0;
    break label$3;
   }
   label$127 : {
    if (!$10_1) {
     break label$127
    }
    label$128 : {
     label$129 : {
      $6_1 = HEAP32[($5_1 + 28 | 0) >> 2] | 0;
      $0_1 = ($6_1 << 2 | 0) + 4072 | 0;
      if (($5_1 | 0) != (HEAP32[$0_1 >> 2] | 0 | 0)) {
       break label$129
      }
      HEAP32[$0_1 >> 2] = $8_1;
      if ($8_1) {
       break label$128
      }
      HEAP32[(0 + 3772 | 0) >> 2] = $9_1 & (__wasm_rotl_i32(-2 | 0, $6_1 | 0) | 0) | 0;
      break label$127;
     }
     HEAP32[($10_1 + ((HEAP32[($10_1 + 16 | 0) >> 2] | 0 | 0) == ($5_1 | 0) ? 16 : 20) | 0) >> 2] = $8_1;
     if (!$8_1) {
      break label$127
     }
    }
    HEAP32[($8_1 + 24 | 0) >> 2] = $10_1;
    label$130 : {
     $0_1 = HEAP32[($5_1 + 16 | 0) >> 2] | 0;
     if (!$0_1) {
      break label$130
     }
     HEAP32[($8_1 + 16 | 0) >> 2] = $0_1;
     HEAP32[($0_1 + 24 | 0) >> 2] = $8_1;
    }
    $0_1 = HEAP32[($5_1 + 20 | 0) >> 2] | 0;
    if (!$0_1) {
     break label$127
    }
    HEAP32[($8_1 + 20 | 0) >> 2] = $0_1;
    HEAP32[($0_1 + 24 | 0) >> 2] = $8_1;
   }
   label$131 : {
    label$132 : {
     if ($4_1 >>> 0 > 15 >>> 0) {
      break label$132
     }
     $0_1 = $4_1 + $3_1 | 0;
     HEAP32[($5_1 + 4 | 0) >> 2] = $0_1 | 3 | 0;
     $0_1 = $5_1 + $0_1 | 0;
     HEAP32[($0_1 + 4 | 0) >> 2] = HEAP32[($0_1 + 4 | 0) >> 2] | 0 | 1 | 0;
     break label$131;
    }
    HEAP32[($5_1 + 4 | 0) >> 2] = $3_1 | 3 | 0;
    $6_1 = $5_1 + $3_1 | 0;
    HEAP32[($6_1 + 4 | 0) >> 2] = $4_1 | 1 | 0;
    HEAP32[($6_1 + $4_1 | 0) >> 2] = $4_1;
    label$133 : {
     if (!$7_1) {
      break label$133
     }
     $8_1 = $7_1 >>> 3 | 0;
     $3_1 = ($8_1 << 3 | 0) + 3808 | 0;
     $0_1 = HEAP32[(0 + 3788 | 0) >> 2] | 0;
     label$134 : {
      label$135 : {
       $8_1 = 1 << $8_1 | 0;
       if ($8_1 & $2_1 | 0) {
        break label$135
       }
       HEAP32[(0 + 3768 | 0) >> 2] = $8_1 | $2_1 | 0;
       $8_1 = $3_1;
       break label$134;
      }
      $8_1 = HEAP32[($3_1 + 8 | 0) >> 2] | 0;
     }
     HEAP32[($3_1 + 8 | 0) >> 2] = $0_1;
     HEAP32[($8_1 + 12 | 0) >> 2] = $0_1;
     HEAP32[($0_1 + 12 | 0) >> 2] = $3_1;
     HEAP32[($0_1 + 8 | 0) >> 2] = $8_1;
    }
    HEAP32[(0 + 3788 | 0) >> 2] = $6_1;
    HEAP32[(0 + 3776 | 0) >> 2] = $4_1;
   }
   $0_1 = $5_1 + 8 | 0;
  }
  label$136 : {
   $13_1 = $1_1 + 16 | 0;
   if ($13_1 >>> 0 < global$2 >>> 0) {
    fimport$7()
   }
   global$0 = $13_1;
  }
  return $0_1 | 0;
 }
 
 function $69($0_1) {
  $0_1 = $0_1 | 0;
  var $2_1 = 0, $5_1 = 0, $1_1 = 0, $4_1 = 0, $3_1 = 0, $7_1 = 0, $6_1 = 0, $408 = 0, $415 = 0;
  label$1 : {
   if (!$0_1) {
    break label$1
   }
   $1_1 = $0_1 + -8 | 0;
   $2_1 = HEAP32[($0_1 + -4 | 0) >> 2] | 0;
   $0_1 = $2_1 & -8 | 0;
   $3_1 = $1_1 + $0_1 | 0;
   label$2 : {
    if ($2_1 & 1 | 0) {
     break label$2
    }
    if (!($2_1 & 3 | 0)) {
     break label$1
    }
    $2_1 = HEAP32[$1_1 >> 2] | 0;
    $1_1 = $1_1 - $2_1 | 0;
    $4_1 = HEAP32[(0 + 3784 | 0) >> 2] | 0;
    if ($1_1 >>> 0 < $4_1 >>> 0) {
     break label$1
    }
    $0_1 = $2_1 + $0_1 | 0;
    label$3 : {
     if ((HEAP32[(0 + 3788 | 0) >> 2] | 0 | 0) == ($1_1 | 0)) {
      break label$3
     }
     label$4 : {
      if ($2_1 >>> 0 > 255 >>> 0) {
       break label$4
      }
      $5_1 = HEAP32[($1_1 + 12 | 0) >> 2] | 0;
      label$5 : {
       $6_1 = HEAP32[($1_1 + 8 | 0) >> 2] | 0;
       $7_1 = $2_1 >>> 3 | 0;
       $2_1 = ($7_1 << 3 | 0) + 3808 | 0;
       if (($6_1 | 0) == ($2_1 | 0)) {
        break label$5
       }
      }
      label$6 : {
       if (($5_1 | 0) != ($6_1 | 0)) {
        break label$6
       }
       HEAP32[(0 + 3768 | 0) >> 2] = (HEAP32[(0 + 3768 | 0) >> 2] | 0) & (__wasm_rotl_i32(-2 | 0, $7_1 | 0) | 0) | 0;
       break label$2;
      }
      label$7 : {
       if (($5_1 | 0) == ($2_1 | 0)) {
        break label$7
       }
      }
      HEAP32[($6_1 + 12 | 0) >> 2] = $5_1;
      HEAP32[($5_1 + 8 | 0) >> 2] = $6_1;
      break label$2;
     }
     $7_1 = HEAP32[($1_1 + 24 | 0) >> 2] | 0;
     label$8 : {
      label$9 : {
       $5_1 = HEAP32[($1_1 + 12 | 0) >> 2] | 0;
       if (($5_1 | 0) == ($1_1 | 0)) {
        break label$9
       }
       label$10 : {
        $2_1 = HEAP32[($1_1 + 8 | 0) >> 2] | 0;
        if ($4_1 >>> 0 > $2_1 >>> 0) {
         break label$10
        }
        HEAP32[($2_1 + 12 | 0) >> 2] | 0;
       }
       HEAP32[($2_1 + 12 | 0) >> 2] = $5_1;
       HEAP32[($5_1 + 8 | 0) >> 2] = $2_1;
       break label$8;
      }
      label$11 : {
       $2_1 = $1_1 + 20 | 0;
       $4_1 = HEAP32[$2_1 >> 2] | 0;
       if ($4_1) {
        break label$11
       }
       $2_1 = $1_1 + 16 | 0;
       $4_1 = HEAP32[$2_1 >> 2] | 0;
       if ($4_1) {
        break label$11
       }
       $5_1 = 0;
       break label$8;
      }
      label$12 : while (1) {
       $6_1 = $2_1;
       $5_1 = $4_1;
       $2_1 = $5_1 + 20 | 0;
       $4_1 = HEAP32[$2_1 >> 2] | 0;
       if ($4_1) {
        continue label$12
       }
       $2_1 = $5_1 + 16 | 0;
       $4_1 = HEAP32[($5_1 + 16 | 0) >> 2] | 0;
       if ($4_1) {
        continue label$12
       }
       break label$12;
      };
      HEAP32[$6_1 >> 2] = 0;
     }
     if (!$7_1) {
      break label$2
     }
     label$13 : {
      label$14 : {
       $4_1 = HEAP32[($1_1 + 28 | 0) >> 2] | 0;
       $2_1 = ($4_1 << 2 | 0) + 4072 | 0;
       if ((HEAP32[$2_1 >> 2] | 0 | 0) != ($1_1 | 0)) {
        break label$14
       }
       HEAP32[$2_1 >> 2] = $5_1;
       if ($5_1) {
        break label$13
       }
       HEAP32[(0 + 3772 | 0) >> 2] = (HEAP32[(0 + 3772 | 0) >> 2] | 0) & (__wasm_rotl_i32(-2 | 0, $4_1 | 0) | 0) | 0;
       break label$2;
      }
      HEAP32[($7_1 + ((HEAP32[($7_1 + 16 | 0) >> 2] | 0 | 0) == ($1_1 | 0) ? 16 : 20) | 0) >> 2] = $5_1;
      if (!$5_1) {
       break label$2
      }
     }
     HEAP32[($5_1 + 24 | 0) >> 2] = $7_1;
     label$15 : {
      $2_1 = HEAP32[($1_1 + 16 | 0) >> 2] | 0;
      if (!$2_1) {
       break label$15
      }
      HEAP32[($5_1 + 16 | 0) >> 2] = $2_1;
      HEAP32[($2_1 + 24 | 0) >> 2] = $5_1;
     }
     $2_1 = HEAP32[($1_1 + 20 | 0) >> 2] | 0;
     if (!$2_1) {
      break label$2
     }
     HEAP32[($5_1 + 20 | 0) >> 2] = $2_1;
     HEAP32[($2_1 + 24 | 0) >> 2] = $5_1;
     break label$2;
    }
    $2_1 = HEAP32[($3_1 + 4 | 0) >> 2] | 0;
    if (($2_1 & 3 | 0 | 0) != (3 | 0)) {
     break label$2
    }
    HEAP32[(0 + 3776 | 0) >> 2] = $0_1;
    HEAP32[($3_1 + 4 | 0) >> 2] = $2_1 & -2 | 0;
    HEAP32[($1_1 + 4 | 0) >> 2] = $0_1 | 1 | 0;
    HEAP32[($1_1 + $0_1 | 0) >> 2] = $0_1;
    return;
   }
   if ($3_1 >>> 0 <= $1_1 >>> 0) {
    break label$1
   }
   $2_1 = HEAP32[($3_1 + 4 | 0) >> 2] | 0;
   if (!($2_1 & 1 | 0)) {
    break label$1
   }
   label$16 : {
    label$17 : {
     if ($2_1 & 2 | 0) {
      break label$17
     }
     label$18 : {
      if ((HEAP32[(0 + 3792 | 0) >> 2] | 0 | 0) != ($3_1 | 0)) {
       break label$18
      }
      HEAP32[(0 + 3792 | 0) >> 2] = $1_1;
      $0_1 = (HEAP32[(0 + 3780 | 0) >> 2] | 0) + $0_1 | 0;
      HEAP32[(0 + 3780 | 0) >> 2] = $0_1;
      HEAP32[($1_1 + 4 | 0) >> 2] = $0_1 | 1 | 0;
      if (($1_1 | 0) != (HEAP32[(0 + 3788 | 0) >> 2] | 0 | 0)) {
       break label$1
      }
      HEAP32[(0 + 3776 | 0) >> 2] = 0;
      HEAP32[(0 + 3788 | 0) >> 2] = 0;
      return;
     }
     label$19 : {
      if ((HEAP32[(0 + 3788 | 0) >> 2] | 0 | 0) != ($3_1 | 0)) {
       break label$19
      }
      HEAP32[(0 + 3788 | 0) >> 2] = $1_1;
      $0_1 = (HEAP32[(0 + 3776 | 0) >> 2] | 0) + $0_1 | 0;
      HEAP32[(0 + 3776 | 0) >> 2] = $0_1;
      HEAP32[($1_1 + 4 | 0) >> 2] = $0_1 | 1 | 0;
      HEAP32[($1_1 + $0_1 | 0) >> 2] = $0_1;
      return;
     }
     $0_1 = ($2_1 & -8 | 0) + $0_1 | 0;
     label$20 : {
      label$21 : {
       if ($2_1 >>> 0 > 255 >>> 0) {
        break label$21
       }
       $4_1 = HEAP32[($3_1 + 12 | 0) >> 2] | 0;
       label$22 : {
        $5_1 = HEAP32[($3_1 + 8 | 0) >> 2] | 0;
        $3_1 = $2_1 >>> 3 | 0;
        $2_1 = ($3_1 << 3 | 0) + 3808 | 0;
        if (($5_1 | 0) == ($2_1 | 0)) {
         break label$22
        }
        HEAP32[(0 + 3784 | 0) >> 2] | 0;
       }
       label$23 : {
        if (($4_1 | 0) != ($5_1 | 0)) {
         break label$23
        }
        HEAP32[(0 + 3768 | 0) >> 2] = (HEAP32[(0 + 3768 | 0) >> 2] | 0) & (__wasm_rotl_i32(-2 | 0, $3_1 | 0) | 0) | 0;
        break label$20;
       }
       label$24 : {
        if (($4_1 | 0) == ($2_1 | 0)) {
         break label$24
        }
        HEAP32[(0 + 3784 | 0) >> 2] | 0;
       }
       HEAP32[($5_1 + 12 | 0) >> 2] = $4_1;
       HEAP32[($4_1 + 8 | 0) >> 2] = $5_1;
       break label$20;
      }
      $7_1 = HEAP32[($3_1 + 24 | 0) >> 2] | 0;
      label$25 : {
       label$26 : {
        $5_1 = HEAP32[($3_1 + 12 | 0) >> 2] | 0;
        if (($5_1 | 0) == ($3_1 | 0)) {
         break label$26
        }
        label$27 : {
         $2_1 = HEAP32[($3_1 + 8 | 0) >> 2] | 0;
         if ((HEAP32[(0 + 3784 | 0) >> 2] | 0) >>> 0 > $2_1 >>> 0) {
          break label$27
         }
         HEAP32[($2_1 + 12 | 0) >> 2] | 0;
        }
        HEAP32[($2_1 + 12 | 0) >> 2] = $5_1;
        HEAP32[($5_1 + 8 | 0) >> 2] = $2_1;
        break label$25;
       }
       label$28 : {
        $2_1 = $3_1 + 20 | 0;
        $4_1 = HEAP32[$2_1 >> 2] | 0;
        if ($4_1) {
         break label$28
        }
        $2_1 = $3_1 + 16 | 0;
        $4_1 = HEAP32[$2_1 >> 2] | 0;
        if ($4_1) {
         break label$28
        }
        $5_1 = 0;
        break label$25;
       }
       label$29 : while (1) {
        $6_1 = $2_1;
        $5_1 = $4_1;
        $2_1 = $5_1 + 20 | 0;
        $4_1 = HEAP32[$2_1 >> 2] | 0;
        if ($4_1) {
         continue label$29
        }
        $2_1 = $5_1 + 16 | 0;
        $4_1 = HEAP32[($5_1 + 16 | 0) >> 2] | 0;
        if ($4_1) {
         continue label$29
        }
        break label$29;
       };
       HEAP32[$6_1 >> 2] = 0;
      }
      if (!$7_1) {
       break label$20
      }
      label$30 : {
       label$31 : {
        $4_1 = HEAP32[($3_1 + 28 | 0) >> 2] | 0;
        $2_1 = ($4_1 << 2 | 0) + 4072 | 0;
        if ((HEAP32[$2_1 >> 2] | 0 | 0) != ($3_1 | 0)) {
         break label$31
        }
        HEAP32[$2_1 >> 2] = $5_1;
        if ($5_1) {
         break label$30
        }
        HEAP32[(0 + 3772 | 0) >> 2] = (HEAP32[(0 + 3772 | 0) >> 2] | 0) & (__wasm_rotl_i32(-2 | 0, $4_1 | 0) | 0) | 0;
        break label$20;
       }
       HEAP32[($7_1 + ((HEAP32[($7_1 + 16 | 0) >> 2] | 0 | 0) == ($3_1 | 0) ? 16 : 20) | 0) >> 2] = $5_1;
       if (!$5_1) {
        break label$20
       }
      }
      HEAP32[($5_1 + 24 | 0) >> 2] = $7_1;
      label$32 : {
       $2_1 = HEAP32[($3_1 + 16 | 0) >> 2] | 0;
       if (!$2_1) {
        break label$32
       }
       HEAP32[($5_1 + 16 | 0) >> 2] = $2_1;
       HEAP32[($2_1 + 24 | 0) >> 2] = $5_1;
      }
      $2_1 = HEAP32[($3_1 + 20 | 0) >> 2] | 0;
      if (!$2_1) {
       break label$20
      }
      HEAP32[($5_1 + 20 | 0) >> 2] = $2_1;
      HEAP32[($2_1 + 24 | 0) >> 2] = $5_1;
     }
     HEAP32[($1_1 + 4 | 0) >> 2] = $0_1 | 1 | 0;
     HEAP32[($1_1 + $0_1 | 0) >> 2] = $0_1;
     if (($1_1 | 0) != (HEAP32[(0 + 3788 | 0) >> 2] | 0 | 0)) {
      break label$16
     }
     HEAP32[(0 + 3776 | 0) >> 2] = $0_1;
     return;
    }
    HEAP32[($3_1 + 4 | 0) >> 2] = $2_1 & -2 | 0;
    HEAP32[($1_1 + 4 | 0) >> 2] = $0_1 | 1 | 0;
    HEAP32[($1_1 + $0_1 | 0) >> 2] = $0_1;
   }
   label$33 : {
    if ($0_1 >>> 0 > 255 >>> 0) {
     break label$33
    }
    $2_1 = $0_1 >>> 3 | 0;
    $0_1 = ($2_1 << 3 | 0) + 3808 | 0;
    label$34 : {
     label$35 : {
      $4_1 = HEAP32[(0 + 3768 | 0) >> 2] | 0;
      $2_1 = 1 << $2_1 | 0;
      if ($4_1 & $2_1 | 0) {
       break label$35
      }
      HEAP32[(0 + 3768 | 0) >> 2] = $4_1 | $2_1 | 0;
      $2_1 = $0_1;
      break label$34;
     }
     $2_1 = HEAP32[($0_1 + 8 | 0) >> 2] | 0;
    }
    HEAP32[($0_1 + 8 | 0) >> 2] = $1_1;
    HEAP32[($2_1 + 12 | 0) >> 2] = $1_1;
    HEAP32[($1_1 + 12 | 0) >> 2] = $0_1;
    HEAP32[($1_1 + 8 | 0) >> 2] = $2_1;
    return;
   }
   $2_1 = 0;
   label$36 : {
    $4_1 = $0_1 >>> 8 | 0;
    if (!$4_1) {
     break label$36
    }
    $2_1 = 31;
    if ($0_1 >>> 0 > 16777215 >>> 0) {
     break label$36
    }
    $2_1 = (($4_1 + 1048320 | 0) >>> 16 | 0) & 8 | 0;
    $4_1 = $4_1 << $2_1 | 0;
    $408 = $4_1;
    $4_1 = (($4_1 + 520192 | 0) >>> 16 | 0) & 4 | 0;
    $5_1 = $408 << $4_1 | 0;
    $415 = $5_1;
    $5_1 = (($5_1 + 245760 | 0) >>> 16 | 0) & 2 | 0;
    $2_1 = (($415 << $5_1 | 0) >>> 15 | 0) - ($4_1 | $2_1 | 0 | $5_1 | 0) | 0;
    $2_1 = ($2_1 << 1 | 0 | (($0_1 >>> ($2_1 + 21 | 0) | 0) & 1 | 0) | 0) + 28 | 0;
   }
   HEAP32[($1_1 + 16 | 0) >> 2] = 0;
   HEAP32[($1_1 + 20 | 0) >> 2] = 0;
   HEAP32[($1_1 + 28 | 0) >> 2] = $2_1;
   $4_1 = ($2_1 << 2 | 0) + 4072 | 0;
   label$37 : {
    label$38 : {
     label$39 : {
      label$40 : {
       $5_1 = HEAP32[(0 + 3772 | 0) >> 2] | 0;
       $3_1 = 1 << $2_1 | 0;
       if ($5_1 & $3_1 | 0) {
        break label$40
       }
       HEAP32[(0 + 3772 | 0) >> 2] = $5_1 | $3_1 | 0;
       HEAP32[$4_1 >> 2] = $1_1;
       HEAP32[($1_1 + 24 | 0) >> 2] = $4_1;
       break label$39;
      }
      $2_1 = $0_1 << (($2_1 | 0) == (31 | 0) ? 0 : 25 - ($2_1 >>> 1 | 0) | 0) | 0;
      $5_1 = HEAP32[$4_1 >> 2] | 0;
      label$41 : while (1) {
       $4_1 = $5_1;
       if (((HEAP32[($5_1 + 4 | 0) >> 2] | 0) & -8 | 0 | 0) == ($0_1 | 0)) {
        break label$38
       }
       $5_1 = $2_1 >>> 29 | 0;
       $2_1 = $2_1 << 1 | 0;
       $3_1 = ($4_1 + ($5_1 & 4 | 0) | 0) + 16 | 0;
       $5_1 = HEAP32[$3_1 >> 2] | 0;
       if ($5_1) {
        continue label$41
       }
       break label$41;
      };
      HEAP32[$3_1 >> 2] = $1_1;
      HEAP32[($1_1 + 24 | 0) >> 2] = $4_1;
     }
     HEAP32[($1_1 + 12 | 0) >> 2] = $1_1;
     HEAP32[($1_1 + 8 | 0) >> 2] = $1_1;
     break label$37;
    }
    $0_1 = HEAP32[($4_1 + 8 | 0) >> 2] | 0;
    HEAP32[($0_1 + 12 | 0) >> 2] = $1_1;
    HEAP32[($4_1 + 8 | 0) >> 2] = $1_1;
    HEAP32[($1_1 + 24 | 0) >> 2] = 0;
    HEAP32[($1_1 + 12 | 0) >> 2] = $4_1;
    HEAP32[($1_1 + 8 | 0) >> 2] = $0_1;
   }
   $1_1 = (HEAP32[(0 + 3800 | 0) >> 2] | 0) + -1 | 0;
   HEAP32[(0 + 3800 | 0) >> 2] = $1_1;
   if ($1_1) {
    break label$1
   }
   $1_1 = 4224;
   label$42 : while (1) {
    $0_1 = HEAP32[$1_1 >> 2] | 0;
    $1_1 = $0_1 + 8 | 0;
    if ($0_1) {
     continue label$42
    }
    break label$42;
   };
   HEAP32[(0 + 3800 | 0) >> 2] = -1;
  }
 }
 
 function $70($0_1) {
  $0_1 = $0_1 | 0;
  var $1_1 = 0, $2_1 = 0;
  label$1 : {
   $1_1 = $0() | 0;
   $2_1 = HEAP32[$1_1 >> 2] | 0;
   $0_1 = $2_1 + (($0_1 + 3 | 0) & -4 | 0) | 0;
   if (($0_1 | 0) > (-1 | 0)) {
    break label$1
   }
   HEAP32[($8() | 0) >> 2] = 48;
   return -1 | 0;
  }
  label$2 : {
   if ($0_1 >>> 0 <= (__wasm_memory_size() << 16 | 0) >>> 0) {
    break label$2
   }
   if (fimport$5($0_1 | 0) | 0) {
    break label$2
   }
   HEAP32[($8() | 0) >> 2] = 48;
   return -1 | 0;
  }
  HEAP32[$1_1 >> 2] = $0_1;
  return $2_1 | 0;
 }
 
 function $71($0_1, $1_1, $2_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  $2_1 = $2_1 | 0;
  var $4_1 = 0, $3_1 = 0, $5_1 = 0;
  label$1 : {
   if ($2_1 >>> 0 < 8192 >>> 0) {
    break label$1
   }
   fimport$6($0_1 | 0, $1_1 | 0, $2_1 | 0) | 0;
   return $0_1 | 0;
  }
  $3_1 = $0_1 + $2_1 | 0;
  label$2 : {
   label$3 : {
    if (($1_1 ^ $0_1 | 0) & 3 | 0) {
     break label$3
    }
    label$4 : {
     label$5 : {
      if (($2_1 | 0) >= (1 | 0)) {
       break label$5
      }
      $2_1 = $0_1;
      break label$4;
     }
     label$6 : {
      if ($0_1 & 3 | 0) {
       break label$6
      }
      $2_1 = $0_1;
      break label$4;
     }
     $2_1 = $0_1;
     label$7 : while (1) {
      HEAP8[$2_1 >> 0] = HEAPU8[$1_1 >> 0] | 0;
      $1_1 = $1_1 + 1 | 0;
      $2_1 = $2_1 + 1 | 0;
      if ($2_1 >>> 0 >= $3_1 >>> 0) {
       break label$4
      }
      if ($2_1 & 3 | 0) {
       continue label$7
      }
      break label$7;
     };
    }
    label$8 : {
     $4_1 = $3_1 & -4 | 0;
     if ($4_1 >>> 0 < 64 >>> 0) {
      break label$8
     }
     $5_1 = $4_1 + -64 | 0;
     if ($2_1 >>> 0 > $5_1 >>> 0) {
      break label$8
     }
     label$9 : while (1) {
      HEAP32[$2_1 >> 2] = HEAP32[$1_1 >> 2] | 0;
      HEAP32[($2_1 + 4 | 0) >> 2] = HEAP32[($1_1 + 4 | 0) >> 2] | 0;
      HEAP32[($2_1 + 8 | 0) >> 2] = HEAP32[($1_1 + 8 | 0) >> 2] | 0;
      HEAP32[($2_1 + 12 | 0) >> 2] = HEAP32[($1_1 + 12 | 0) >> 2] | 0;
      HEAP32[($2_1 + 16 | 0) >> 2] = HEAP32[($1_1 + 16 | 0) >> 2] | 0;
      HEAP32[($2_1 + 20 | 0) >> 2] = HEAP32[($1_1 + 20 | 0) >> 2] | 0;
      HEAP32[($2_1 + 24 | 0) >> 2] = HEAP32[($1_1 + 24 | 0) >> 2] | 0;
      HEAP32[($2_1 + 28 | 0) >> 2] = HEAP32[($1_1 + 28 | 0) >> 2] | 0;
      HEAP32[($2_1 + 32 | 0) >> 2] = HEAP32[($1_1 + 32 | 0) >> 2] | 0;
      HEAP32[($2_1 + 36 | 0) >> 2] = HEAP32[($1_1 + 36 | 0) >> 2] | 0;
      HEAP32[($2_1 + 40 | 0) >> 2] = HEAP32[($1_1 + 40 | 0) >> 2] | 0;
      HEAP32[($2_1 + 44 | 0) >> 2] = HEAP32[($1_1 + 44 | 0) >> 2] | 0;
      HEAP32[($2_1 + 48 | 0) >> 2] = HEAP32[($1_1 + 48 | 0) >> 2] | 0;
      HEAP32[($2_1 + 52 | 0) >> 2] = HEAP32[($1_1 + 52 | 0) >> 2] | 0;
      HEAP32[($2_1 + 56 | 0) >> 2] = HEAP32[($1_1 + 56 | 0) >> 2] | 0;
      HEAP32[($2_1 + 60 | 0) >> 2] = HEAP32[($1_1 + 60 | 0) >> 2] | 0;
      $1_1 = $1_1 + 64 | 0;
      $2_1 = $2_1 + 64 | 0;
      if ($2_1 >>> 0 <= $5_1 >>> 0) {
       continue label$9
      }
      break label$9;
     };
    }
    if ($2_1 >>> 0 >= $4_1 >>> 0) {
     break label$2
    }
    label$10 : while (1) {
     HEAP32[$2_1 >> 2] = HEAP32[$1_1 >> 2] | 0;
     $1_1 = $1_1 + 4 | 0;
     $2_1 = $2_1 + 4 | 0;
     if ($2_1 >>> 0 < $4_1 >>> 0) {
      continue label$10
     }
     break label$2;
    };
   }
   label$11 : {
    if ($3_1 >>> 0 >= 4 >>> 0) {
     break label$11
    }
    $2_1 = $0_1;
    break label$2;
   }
   label$12 : {
    $4_1 = $3_1 + -4 | 0;
    if ($4_1 >>> 0 >= $0_1 >>> 0) {
     break label$12
    }
    $2_1 = $0_1;
    break label$2;
   }
   $2_1 = $0_1;
   label$13 : while (1) {
    HEAP8[$2_1 >> 0] = HEAPU8[$1_1 >> 0] | 0;
    HEAP8[($2_1 + 1 | 0) >> 0] = HEAPU8[($1_1 + 1 | 0) >> 0] | 0;
    HEAP8[($2_1 + 2 | 0) >> 0] = HEAPU8[($1_1 + 2 | 0) >> 0] | 0;
    HEAP8[($2_1 + 3 | 0) >> 0] = HEAPU8[($1_1 + 3 | 0) >> 0] | 0;
    $1_1 = $1_1 + 4 | 0;
    $2_1 = $2_1 + 4 | 0;
    if ($2_1 >>> 0 <= $4_1 >>> 0) {
     continue label$13
    }
    break label$13;
   };
  }
  label$14 : {
   if ($2_1 >>> 0 >= $3_1 >>> 0) {
    break label$14
   }
   label$15 : while (1) {
    HEAP8[$2_1 >> 0] = HEAPU8[$1_1 >> 0] | 0;
    $1_1 = $1_1 + 1 | 0;
    $2_1 = $2_1 + 1 | 0;
    if (($2_1 | 0) != ($3_1 | 0)) {
     continue label$15
    }
    break label$15;
   };
  }
  return $0_1 | 0;
 }
 
 function $72($0_1, $1_1, $2_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  $2_1 = $2_1 | 0;
  var $3_1 = 0, i64toi32_i32$2 = 0, i64toi32_i32$0 = 0, $4_1 = 0, $6_1 = 0, i64toi32_i32$1 = 0, i64toi32_i32$4 = 0, $6$hi = 0, i64toi32_i32$3 = 0, $5_1 = 0, $14_1 = 0, $104$hi = 0;
  label$1 : {
   if (!$2_1) {
    break label$1
   }
   $3_1 = $2_1 + $0_1 | 0;
   HEAP8[($3_1 + -1 | 0) >> 0] = $1_1;
   HEAP8[$0_1 >> 0] = $1_1;
   if ($2_1 >>> 0 < 3 >>> 0) {
    break label$1
   }
   HEAP8[($3_1 + -2 | 0) >> 0] = $1_1;
   HEAP8[($0_1 + 1 | 0) >> 0] = $1_1;
   HEAP8[($3_1 + -3 | 0) >> 0] = $1_1;
   HEAP8[($0_1 + 2 | 0) >> 0] = $1_1;
   if ($2_1 >>> 0 < 7 >>> 0) {
    break label$1
   }
   HEAP8[($3_1 + -4 | 0) >> 0] = $1_1;
   HEAP8[($0_1 + 3 | 0) >> 0] = $1_1;
   if ($2_1 >>> 0 < 9 >>> 0) {
    break label$1
   }
   $4_1 = (0 - $0_1 | 0) & 3 | 0;
   $3_1 = $0_1 + $4_1 | 0;
   $1_1 = Math_imul($1_1 & 255 | 0, 16843009);
   HEAP32[$3_1 >> 2] = $1_1;
   $4_1 = ($2_1 - $4_1 | 0) & -4 | 0;
   $2_1 = $3_1 + $4_1 | 0;
   HEAP32[($2_1 + -4 | 0) >> 2] = $1_1;
   if ($4_1 >>> 0 < 9 >>> 0) {
    break label$1
   }
   HEAP32[($3_1 + 8 | 0) >> 2] = $1_1;
   HEAP32[($3_1 + 4 | 0) >> 2] = $1_1;
   HEAP32[($2_1 + -8 | 0) >> 2] = $1_1;
   HEAP32[($2_1 + -12 | 0) >> 2] = $1_1;
   if ($4_1 >>> 0 < 25 >>> 0) {
    break label$1
   }
   HEAP32[($3_1 + 24 | 0) >> 2] = $1_1;
   HEAP32[($3_1 + 20 | 0) >> 2] = $1_1;
   HEAP32[($3_1 + 16 | 0) >> 2] = $1_1;
   HEAP32[($3_1 + 12 | 0) >> 2] = $1_1;
   HEAP32[($2_1 + -16 | 0) >> 2] = $1_1;
   HEAP32[($2_1 + -20 | 0) >> 2] = $1_1;
   HEAP32[($2_1 + -24 | 0) >> 2] = $1_1;
   HEAP32[($2_1 + -28 | 0) >> 2] = $1_1;
   $5_1 = $3_1 & 4 | 0 | 24 | 0;
   $2_1 = $4_1 - $5_1 | 0;
   if ($2_1 >>> 0 < 32 >>> 0) {
    break label$1
   }
   i64toi32_i32$0 = 0;
   $6_1 = $1_1;
   $6$hi = i64toi32_i32$0;
   i64toi32_i32$2 = $1_1;
   i64toi32_i32$1 = 0;
   i64toi32_i32$3 = 32;
   i64toi32_i32$4 = i64toi32_i32$3 & 31 | 0;
   if (32 >>> 0 <= (i64toi32_i32$3 & 63 | 0) >>> 0) {
    i64toi32_i32$1 = i64toi32_i32$2 << i64toi32_i32$4 | 0;
    $14_1 = 0;
   } else {
    i64toi32_i32$1 = ((1 << i64toi32_i32$4 | 0) - 1 | 0) & (i64toi32_i32$2 >>> (32 - i64toi32_i32$4 | 0) | 0) | 0 | (i64toi32_i32$0 << i64toi32_i32$4 | 0) | 0;
    $14_1 = i64toi32_i32$2 << i64toi32_i32$4 | 0;
   }
   $104$hi = i64toi32_i32$1;
   i64toi32_i32$1 = $6$hi;
   i64toi32_i32$1 = $104$hi;
   i64toi32_i32$0 = $14_1;
   i64toi32_i32$2 = $6$hi;
   i64toi32_i32$3 = $6_1;
   i64toi32_i32$2 = i64toi32_i32$1 | i64toi32_i32$2 | 0;
   $6_1 = i64toi32_i32$0 | $6_1 | 0;
   $6$hi = i64toi32_i32$2;
   $1_1 = $3_1 + $5_1 | 0;
   label$2 : while (1) {
    i64toi32_i32$2 = $6$hi;
    i64toi32_i32$0 = $1_1;
    HEAP32[($1_1 + 24 | 0) >> 2] = $6_1;
    HEAP32[($1_1 + 28 | 0) >> 2] = i64toi32_i32$2;
    i64toi32_i32$0 = $1_1;
    HEAP32[($1_1 + 16 | 0) >> 2] = $6_1;
    HEAP32[($1_1 + 20 | 0) >> 2] = i64toi32_i32$2;
    i64toi32_i32$0 = $1_1;
    HEAP32[($1_1 + 8 | 0) >> 2] = $6_1;
    HEAP32[($1_1 + 12 | 0) >> 2] = i64toi32_i32$2;
    i64toi32_i32$0 = $1_1;
    HEAP32[$1_1 >> 2] = $6_1;
    HEAP32[($1_1 + 4 | 0) >> 2] = i64toi32_i32$2;
    $1_1 = $1_1 + 32 | 0;
    $2_1 = $2_1 + -32 | 0;
    if ($2_1 >>> 0 > 31 >>> 0) {
     continue label$2
    }
    break label$2;
   };
  }
  return $0_1 | 0;
 }
 
 function $73($0_1, $1_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  label$1 : {
   if (HEAP32[(0 + 4264 | 0) >> 2] | 0) {
    break label$1
   }
   HEAP32[(0 + 4268 | 0) >> 2] = $1_1;
   HEAP32[(0 + 4264 | 0) >> 2] = $0_1;
  }
 }
 
 function $74($0_1) {
  $0_1 = $0_1 | 0;
  var $2_1 = 0, $1_1 = 0;
  label$1 : {
   label$2 : {
    if (!$0_1) {
     break label$2
    }
    label$3 : {
     if ((HEAP32[($0_1 + 76 | 0) >> 2] | 0 | 0) > (-1 | 0)) {
      break label$3
     }
     return $75($0_1 | 0) | 0 | 0;
    }
    $1_1 = $29($0_1 | 0) | 0;
    $2_1 = $75($0_1 | 0) | 0;
    if (!$1_1) {
     break label$1
    }
    $30($0_1 | 0);
    return $2_1 | 0;
   }
   $2_1 = 0;
   label$4 : {
    if (!(HEAP32[(0 + 2408 | 0) >> 2] | 0)) {
     break label$4
    }
    $2_1 = $74(HEAP32[(0 + 2408 | 0) >> 2] | 0 | 0) | 0;
   }
   label$5 : {
    $0_1 = HEAP32[($32() | 0) >> 2] | 0;
    if (!$0_1) {
     break label$5
    }
    label$6 : while (1) {
     $1_1 = 0;
     label$7 : {
      if ((HEAP32[($0_1 + 76 | 0) >> 2] | 0 | 0) < (0 | 0)) {
       break label$7
      }
      $1_1 = $29($0_1 | 0) | 0;
     }
     label$8 : {
      if ((HEAP32[($0_1 + 20 | 0) >> 2] | 0) >>> 0 <= (HEAP32[($0_1 + 28 | 0) >> 2] | 0) >>> 0) {
       break label$8
      }
      $2_1 = $75($0_1 | 0) | 0 | $2_1 | 0;
     }
     label$9 : {
      if (!$1_1) {
       break label$9
      }
      $30($0_1 | 0);
     }
     $0_1 = HEAP32[($0_1 + 56 | 0) >> 2] | 0;
     if ($0_1) {
      continue label$6
     }
     break label$6;
    };
   }
   $33();
  }
  return $2_1 | 0;
 }
 
 function $75($0_1) {
  $0_1 = $0_1 | 0;
  var i64toi32_i32$1 = 0, i64toi32_i32$0 = 0, $1_1 = 0, $2_1 = 0;
  label$1 : {
   if ((HEAP32[($0_1 + 20 | 0) >> 2] | 0) >>> 0 <= (HEAP32[($0_1 + 28 | 0) >> 2] | 0) >>> 0) {
    break label$1
   }
   FUNCTION_TABLE[HEAP32[($0_1 + 36 | 0) >> 2] | 0]($0_1, 0, 0) | 0;
   if (HEAP32[($0_1 + 20 | 0) >> 2] | 0) {
    break label$1
   }
   return -1 | 0;
  }
  label$2 : {
   $1_1 = HEAP32[($0_1 + 4 | 0) >> 2] | 0;
   $2_1 = HEAP32[($0_1 + 8 | 0) >> 2] | 0;
   if ($1_1 >>> 0 >= $2_1 >>> 0) {
    break label$2
   }
   i64toi32_i32$1 = $1_1 - $2_1 | 0;
   i64toi32_i32$0 = i64toi32_i32$1 >> 31 | 0;
   i64toi32_i32$0 = FUNCTION_TABLE[HEAP32[($0_1 + 40 | 0) >> 2] | 0]($0_1, i64toi32_i32$1, i64toi32_i32$0, 1) | 0;
   i64toi32_i32$1 = i64toi32_i32$HIGH_BITS;
  }
  HEAP32[($0_1 + 28 | 0) >> 2] = 0;
  i64toi32_i32$0 = $0_1;
  i64toi32_i32$1 = 0;
  HEAP32[($0_1 + 16 | 0) >> 2] = 0;
  HEAP32[($0_1 + 20 | 0) >> 2] = i64toi32_i32$1;
  i64toi32_i32$0 = $0_1;
  i64toi32_i32$1 = 0;
  HEAP32[($0_1 + 4 | 0) >> 2] = 0;
  HEAP32[($0_1 + 8 | 0) >> 2] = i64toi32_i32$1;
  return 0 | 0;
 }
 
 function $76($0_1) {
  $0_1 = $0_1 | 0;
  global$2 = $0_1;
 }
 
 function $77() {
  return global$0 | 0;
 }
 
 function $78($0_1) {
  $0_1 = $0_1 | 0;
  var $1_1 = 0, $2_1 = 0;
  label$1 : {
   $1_1 = (global$0 - $0_1 | 0) & -16 | 0;
   $2_1 = $1_1;
   if ($1_1 >>> 0 < global$2 >>> 0) {
    fimport$7()
   }
   global$0 = $2_1;
  }
  return $1_1 | 0;
 }
 
 function $79($0_1) {
  $0_1 = $0_1 | 0;
  var $1_1 = 0;
  $1_1 = $0_1;
  if ($1_1 >>> 0 < global$2 >>> 0) {
   fimport$7()
  }
  global$0 = $1_1;
 }
 
 function $80($0_1) {
  $0_1 = $0_1 | 0;
  return abort() | 0;
 }
 
 function $81($0_1, $1_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  return FUNCTION_TABLE[$0_1]($1_1) | 0 | 0;
 }
 
 function $82($0_1, $1_1, $2_1, $3_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  $2_1 = $2_1 | 0;
  $3_1 = $3_1 | 0;
  return FUNCTION_TABLE[$0_1]($1_1, $2_1, $3_1) | 0 | 0;
 }
 
 function $83($0_1, $1_1, $2_1, $2$hi, $3_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  $2_1 = $2_1 | 0;
  $2$hi = $2$hi | 0;
  $3_1 = $3_1 | 0;
  var i64toi32_i32$0 = 0, i64toi32_i32$1 = 0;
  i64toi32_i32$0 = $2$hi;
  i64toi32_i32$0 = FUNCTION_TABLE[$0_1]($1_1, $2_1, i64toi32_i32$0, $3_1) | 0;
  i64toi32_i32$1 = i64toi32_i32$HIGH_BITS;
  i64toi32_i32$HIGH_BITS = i64toi32_i32$1;
  return i64toi32_i32$0 | 0;
 }
 
 function $84($0_1, $1_1, $2_1, $3_1, $4_1, $5_1, $6_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  $2_1 = +$2_1;
  $3_1 = $3_1 | 0;
  $4_1 = $4_1 | 0;
  $5_1 = $5_1 | 0;
  $6_1 = $6_1 | 0;
  return FUNCTION_TABLE[$0_1]($1_1, $2_1, $3_1, $4_1, $5_1, $6_1) | 0 | 0;
 }
 
 function $85($0_1, $1_1, $2_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  $2_1 = $2_1 | 0;
  FUNCTION_TABLE[$0_1]($1_1, $2_1);
 }
 
 function $86($0_1, $1_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  FUNCTION_TABLE[$0_1]($1_1);
 }
 
 function $87($0_1, $1_1, $2_1, $3_1, $4_1, $5_1, $6_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  $2_1 = $2_1 | 0;
  $3_1 = $3_1 | 0;
  $4_1 = $4_1 | 0;
  $5_1 = $5_1 | 0;
  $6_1 = $6_1 | 0;
  FUNCTION_TABLE[$0_1]($1_1, $2_1, $3_1, $4_1, $5_1, $6_1);
 }
 
 function $88($0_1, $1_1, $2_1, $3_1, $4_1, $5_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  $2_1 = $2_1 | 0;
  $3_1 = $3_1 | 0;
  $4_1 = $4_1 | 0;
  $5_1 = $5_1 | 0;
  FUNCTION_TABLE[$0_1]($1_1, $2_1, $3_1, $4_1, $5_1);
 }
 
 function $89($0_1, $1_1, $2_1, $3_1, $4_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  $2_1 = $2_1 | 0;
  $3_1 = $3_1 | 0;
  $4_1 = $4_1 | 0;
  FUNCTION_TABLE[$0_1]($1_1, $2_1, $3_1, $4_1);
 }
 
 function $90($0_1, $1_1, $2_1, $3_1, $4_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  $2_1 = $2_1 | 0;
  $3_1 = $3_1 | 0;
  $4_1 = $4_1 | 0;
  var i64toi32_i32$2 = 0, i64toi32_i32$4 = 0, i64toi32_i32$0 = 0, i64toi32_i32$1 = 0, i64toi32_i32$3 = 0, $17_1 = 0, $18_1 = 0, $6_1 = 0, $7_1 = 0, $9_1 = 0, $9$hi = 0, $12$hi = 0, $5_1 = 0, $5$hi = 0;
  $6_1 = $0_1;
  $7_1 = $1_1;
  i64toi32_i32$0 = 0;
  $9_1 = $2_1;
  $9$hi = i64toi32_i32$0;
  i64toi32_i32$0 = 0;
  i64toi32_i32$2 = $3_1;
  i64toi32_i32$1 = 0;
  i64toi32_i32$3 = 32;
  i64toi32_i32$4 = i64toi32_i32$3 & 31 | 0;
  if (32 >>> 0 <= (i64toi32_i32$3 & 63 | 0) >>> 0) {
   i64toi32_i32$1 = i64toi32_i32$2 << i64toi32_i32$4 | 0;
   $17_1 = 0;
  } else {
   i64toi32_i32$1 = ((1 << i64toi32_i32$4 | 0) - 1 | 0) & (i64toi32_i32$2 >>> (32 - i64toi32_i32$4 | 0) | 0) | 0 | (i64toi32_i32$0 << i64toi32_i32$4 | 0) | 0;
   $17_1 = i64toi32_i32$2 << i64toi32_i32$4 | 0;
  }
  $12$hi = i64toi32_i32$1;
  i64toi32_i32$1 = $9$hi;
  i64toi32_i32$0 = $9_1;
  i64toi32_i32$2 = $12$hi;
  i64toi32_i32$3 = $17_1;
  i64toi32_i32$2 = i64toi32_i32$1 | i64toi32_i32$2 | 0;
  i64toi32_i32$2 = $83($6_1 | 0, $7_1 | 0, i64toi32_i32$0 | i64toi32_i32$3 | 0 | 0, i64toi32_i32$2 | 0, $4_1 | 0) | 0;
  i64toi32_i32$0 = i64toi32_i32$HIGH_BITS;
  $5_1 = i64toi32_i32$2;
  $5$hi = i64toi32_i32$0;
  i64toi32_i32$1 = i64toi32_i32$2;
  i64toi32_i32$2 = 0;
  i64toi32_i32$3 = 32;
  i64toi32_i32$4 = i64toi32_i32$3 & 31 | 0;
  if (32 >>> 0 <= (i64toi32_i32$3 & 63 | 0) >>> 0) {
   i64toi32_i32$2 = 0;
   $18_1 = i64toi32_i32$0 >>> i64toi32_i32$4 | 0;
  } else {
   i64toi32_i32$2 = i64toi32_i32$0 >>> i64toi32_i32$4 | 0;
   $18_1 = (((1 << i64toi32_i32$4 | 0) - 1 | 0) & i64toi32_i32$0 | 0) << (32 - i64toi32_i32$4 | 0) | 0 | (i64toi32_i32$1 >>> i64toi32_i32$4 | 0) | 0;
  }
  fimport$8($18_1 | 0);
  i64toi32_i32$2 = $5$hi;
  return $5_1 | 0;
 }
 
 function legalfunc$wasm2js_scratch_store_i64($0_1, $0$hi) {
  $0_1 = $0_1 | 0;
  $0$hi = $0$hi | 0;
  var i64toi32_i32$4 = 0, i64toi32_i32$0 = 0, i64toi32_i32$1 = 0, i64toi32_i32$3 = 0, $8_1 = 0, $2_1 = 0, i64toi32_i32$2 = 0;
  i64toi32_i32$0 = $0$hi;
  $2_1 = $0_1;
  i64toi32_i32$2 = $0_1;
  i64toi32_i32$1 = 0;
  i64toi32_i32$3 = 32;
  i64toi32_i32$4 = i64toi32_i32$3 & 31 | 0;
  if (32 >>> 0 <= (i64toi32_i32$3 & 63 | 0) >>> 0) {
   i64toi32_i32$1 = 0;
   $8_1 = i64toi32_i32$0 >>> i64toi32_i32$4 | 0;
  } else {
   i64toi32_i32$1 = i64toi32_i32$0 >>> i64toi32_i32$4 | 0;
   $8_1 = (((1 << i64toi32_i32$4 | 0) - 1 | 0) & i64toi32_i32$0 | 0) << (32 - i64toi32_i32$4 | 0) | 0 | (i64toi32_i32$2 >>> i64toi32_i32$4 | 0) | 0;
  }
  legalimport$wasm2js_scratch_store_i64($2_1 | 0, $8_1 | 0);
 }
 
 function _ZN17compiler_builtins3int3mul3Mul3mul17h070e9a1c69faec5bE(var$0, var$0$hi, var$1, var$1$hi) {
  var$0 = var$0 | 0;
  var$0$hi = var$0$hi | 0;
  var$1 = var$1 | 0;
  var$1$hi = var$1$hi | 0;
  var i64toi32_i32$4 = 0, i64toi32_i32$0 = 0, i64toi32_i32$1 = 0, var$2 = 0, i64toi32_i32$2 = 0, i64toi32_i32$3 = 0, var$3 = 0, var$4 = 0, var$5 = 0, $21_1 = 0, $22_1 = 0, var$6 = 0, $24_1 = 0, $17_1 = 0, $18_1 = 0, $23_1 = 0, $29_1 = 0, $45_1 = 0, $56$hi = 0, $62$hi = 0;
  i64toi32_i32$0 = var$1$hi;
  var$2 = var$1;
  var$4 = var$2 >>> 16 | 0;
  i64toi32_i32$0 = var$0$hi;
  var$3 = var$0;
  var$5 = var$3 >>> 16 | 0;
  $17_1 = Math_imul(var$4, var$5);
  $18_1 = var$2;
  i64toi32_i32$2 = var$3;
  i64toi32_i32$1 = 0;
  i64toi32_i32$3 = 32;
  i64toi32_i32$4 = i64toi32_i32$3 & 31 | 0;
  if (32 >>> 0 <= (i64toi32_i32$3 & 63 | 0) >>> 0) {
   i64toi32_i32$1 = 0;
   $21_1 = i64toi32_i32$0 >>> i64toi32_i32$4 | 0;
  } else {
   i64toi32_i32$1 = i64toi32_i32$0 >>> i64toi32_i32$4 | 0;
   $21_1 = (((1 << i64toi32_i32$4 | 0) - 1 | 0) & i64toi32_i32$0 | 0) << (32 - i64toi32_i32$4 | 0) | 0 | (i64toi32_i32$2 >>> i64toi32_i32$4 | 0) | 0;
  }
  $23_1 = $17_1 + Math_imul($18_1, $21_1) | 0;
  i64toi32_i32$1 = var$1$hi;
  i64toi32_i32$0 = var$1;
  i64toi32_i32$2 = 0;
  i64toi32_i32$3 = 32;
  i64toi32_i32$4 = i64toi32_i32$3 & 31 | 0;
  if (32 >>> 0 <= (i64toi32_i32$3 & 63 | 0) >>> 0) {
   i64toi32_i32$2 = 0;
   $22_1 = i64toi32_i32$1 >>> i64toi32_i32$4 | 0;
  } else {
   i64toi32_i32$2 = i64toi32_i32$1 >>> i64toi32_i32$4 | 0;
   $22_1 = (((1 << i64toi32_i32$4 | 0) - 1 | 0) & i64toi32_i32$1 | 0) << (32 - i64toi32_i32$4 | 0) | 0 | (i64toi32_i32$0 >>> i64toi32_i32$4 | 0) | 0;
  }
  $29_1 = $23_1 + Math_imul($22_1, var$3) | 0;
  var$2 = var$2 & 65535 | 0;
  var$3 = var$3 & 65535 | 0;
  var$6 = Math_imul(var$2, var$3);
  var$2 = (var$6 >>> 16 | 0) + Math_imul(var$2, var$5) | 0;
  $45_1 = $29_1 + (var$2 >>> 16 | 0) | 0;
  var$2 = (var$2 & 65535 | 0) + Math_imul(var$4, var$3) | 0;
  i64toi32_i32$2 = 0;
  i64toi32_i32$1 = $45_1 + (var$2 >>> 16 | 0) | 0;
  i64toi32_i32$0 = 0;
  i64toi32_i32$3 = 32;
  i64toi32_i32$4 = i64toi32_i32$3 & 31 | 0;
  if (32 >>> 0 <= (i64toi32_i32$3 & 63 | 0) >>> 0) {
   i64toi32_i32$0 = i64toi32_i32$1 << i64toi32_i32$4 | 0;
   $24_1 = 0;
  } else {
   i64toi32_i32$0 = ((1 << i64toi32_i32$4 | 0) - 1 | 0) & (i64toi32_i32$1 >>> (32 - i64toi32_i32$4 | 0) | 0) | 0 | (i64toi32_i32$2 << i64toi32_i32$4 | 0) | 0;
   $24_1 = i64toi32_i32$1 << i64toi32_i32$4 | 0;
  }
  $56$hi = i64toi32_i32$0;
  i64toi32_i32$0 = 0;
  $62$hi = i64toi32_i32$0;
  i64toi32_i32$0 = $56$hi;
  i64toi32_i32$2 = $24_1;
  i64toi32_i32$1 = $62$hi;
  i64toi32_i32$3 = var$2 << 16 | 0 | (var$6 & 65535 | 0) | 0;
  i64toi32_i32$1 = i64toi32_i32$0 | i64toi32_i32$1 | 0;
  i64toi32_i32$2 = i64toi32_i32$2 | i64toi32_i32$3 | 0;
  i64toi32_i32$HIGH_BITS = i64toi32_i32$1;
  return i64toi32_i32$2 | 0;
 }
 
 function _ZN17compiler_builtins3int4udiv10divmod_u6417h6026910b5ed08e40E(var$0, var$0$hi, var$1, var$1$hi) {
  var$0 = var$0 | 0;
  var$0$hi = var$0$hi | 0;
  var$1 = var$1 | 0;
  var$1$hi = var$1$hi | 0;
  var i64toi32_i32$2 = 0, i64toi32_i32$3 = 0, i64toi32_i32$4 = 0, i64toi32_i32$1 = 0, i64toi32_i32$0 = 0, i64toi32_i32$5 = 0, var$2 = 0, var$3 = 0, var$4 = 0, var$5 = 0, var$5$hi = 0, var$6 = 0, var$6$hi = 0, i64toi32_i32$6 = 0, $37_1 = 0, $38_1 = 0, $39_1 = 0, $40_1 = 0, $41_1 = 0, $42_1 = 0, $43_1 = 0, $44_1 = 0, var$8$hi = 0, $45_1 = 0, $46_1 = 0, $47_1 = 0, $48_1 = 0, var$7$hi = 0, $49_1 = 0, $63$hi = 0, $65_1 = 0, $65$hi = 0, $120$hi = 0, $129$hi = 0, $134$hi = 0, var$8 = 0, $140 = 0, $140$hi = 0, $142$hi = 0, $144 = 0, $144$hi = 0, $151 = 0, $151$hi = 0, $154$hi = 0, var$7 = 0, $165$hi = 0;
  label$1 : {
   label$2 : {
    label$3 : {
     label$4 : {
      label$5 : {
       label$6 : {
        label$7 : {
         label$8 : {
          label$9 : {
           label$10 : {
            label$11 : {
             i64toi32_i32$0 = var$0$hi;
             i64toi32_i32$2 = var$0;
             i64toi32_i32$1 = 0;
             i64toi32_i32$3 = 32;
             i64toi32_i32$4 = i64toi32_i32$3 & 31 | 0;
             if (32 >>> 0 <= (i64toi32_i32$3 & 63 | 0) >>> 0) {
              i64toi32_i32$1 = 0;
              $37_1 = i64toi32_i32$0 >>> i64toi32_i32$4 | 0;
             } else {
              i64toi32_i32$1 = i64toi32_i32$0 >>> i64toi32_i32$4 | 0;
              $37_1 = (((1 << i64toi32_i32$4 | 0) - 1 | 0) & i64toi32_i32$0 | 0) << (32 - i64toi32_i32$4 | 0) | 0 | (i64toi32_i32$2 >>> i64toi32_i32$4 | 0) | 0;
             }
             var$2 = $37_1;
             if (var$2) {
              block : {
               i64toi32_i32$1 = var$1$hi;
               var$3 = var$1;
               if (!var$3) {
                break label$11
               }
               i64toi32_i32$1 = var$1$hi;
               i64toi32_i32$0 = var$1;
               i64toi32_i32$2 = 0;
               i64toi32_i32$3 = 32;
               i64toi32_i32$4 = i64toi32_i32$3 & 31 | 0;
               if (32 >>> 0 <= (i64toi32_i32$3 & 63 | 0) >>> 0) {
                i64toi32_i32$2 = 0;
                $38_1 = i64toi32_i32$1 >>> i64toi32_i32$4 | 0;
               } else {
                i64toi32_i32$2 = i64toi32_i32$1 >>> i64toi32_i32$4 | 0;
                $38_1 = (((1 << i64toi32_i32$4 | 0) - 1 | 0) & i64toi32_i32$1 | 0) << (32 - i64toi32_i32$4 | 0) | 0 | (i64toi32_i32$0 >>> i64toi32_i32$4 | 0) | 0;
               }
               var$4 = $38_1;
               if (!var$4) {
                break label$9
               }
               var$2 = Math_clz32(var$4) - Math_clz32(var$2) | 0;
               if (var$2 >>> 0 <= 31 >>> 0) {
                break label$8
               }
               break label$2;
              }
             }
             i64toi32_i32$2 = var$1$hi;
             i64toi32_i32$1 = var$1;
             i64toi32_i32$0 = 1;
             i64toi32_i32$3 = 0;
             if (i64toi32_i32$2 >>> 0 > i64toi32_i32$0 >>> 0 | ((i64toi32_i32$2 | 0) == (i64toi32_i32$0 | 0) & i64toi32_i32$1 >>> 0 >= i64toi32_i32$3 >>> 0 | 0) | 0) {
              break label$2
             }
             i64toi32_i32$1 = var$0$hi;
             var$2 = var$0;
             i64toi32_i32$1 = var$1$hi;
             var$3 = var$1;
             var$2 = (var$2 >>> 0) / (var$3 >>> 0) | 0;
             i64toi32_i32$1 = 0;
             legalfunc$wasm2js_scratch_store_i64(var$0 - Math_imul(var$2, var$3) | 0 | 0, i64toi32_i32$1 | 0);
             i64toi32_i32$1 = 0;
             i64toi32_i32$2 = var$2;
             i64toi32_i32$HIGH_BITS = i64toi32_i32$1;
             return i64toi32_i32$2 | 0;
            }
            i64toi32_i32$2 = var$1$hi;
            i64toi32_i32$3 = var$1;
            i64toi32_i32$1 = 0;
            i64toi32_i32$0 = 32;
            i64toi32_i32$4 = i64toi32_i32$0 & 31 | 0;
            if (32 >>> 0 <= (i64toi32_i32$0 & 63 | 0) >>> 0) {
             i64toi32_i32$1 = 0;
             $39_1 = i64toi32_i32$2 >>> i64toi32_i32$4 | 0;
            } else {
             i64toi32_i32$1 = i64toi32_i32$2 >>> i64toi32_i32$4 | 0;
             $39_1 = (((1 << i64toi32_i32$4 | 0) - 1 | 0) & i64toi32_i32$2 | 0) << (32 - i64toi32_i32$4 | 0) | 0 | (i64toi32_i32$3 >>> i64toi32_i32$4 | 0) | 0;
            }
            var$3 = $39_1;
            i64toi32_i32$1 = var$0$hi;
            if (!var$0) {
             break label$7
            }
            if (!var$3) {
             break label$6
            }
            var$4 = var$3 + -1 | 0;
            if (var$4 & var$3 | 0) {
             break label$6
            }
            i64toi32_i32$1 = 0;
            i64toi32_i32$2 = var$4 & var$2 | 0;
            i64toi32_i32$3 = 0;
            i64toi32_i32$0 = 32;
            i64toi32_i32$4 = i64toi32_i32$0 & 31 | 0;
            if (32 >>> 0 <= (i64toi32_i32$0 & 63 | 0) >>> 0) {
             i64toi32_i32$3 = i64toi32_i32$2 << i64toi32_i32$4 | 0;
             $40_1 = 0;
            } else {
             i64toi32_i32$3 = ((1 << i64toi32_i32$4 | 0) - 1 | 0) & (i64toi32_i32$2 >>> (32 - i64toi32_i32$4 | 0) | 0) | 0 | (i64toi32_i32$1 << i64toi32_i32$4 | 0) | 0;
             $40_1 = i64toi32_i32$2 << i64toi32_i32$4 | 0;
            }
            $63$hi = i64toi32_i32$3;
            i64toi32_i32$3 = var$0$hi;
            i64toi32_i32$1 = var$0;
            i64toi32_i32$2 = 0;
            i64toi32_i32$0 = -1;
            i64toi32_i32$2 = i64toi32_i32$3 & i64toi32_i32$2 | 0;
            $65_1 = i64toi32_i32$1 & i64toi32_i32$0 | 0;
            $65$hi = i64toi32_i32$2;
            i64toi32_i32$2 = $63$hi;
            i64toi32_i32$3 = $40_1;
            i64toi32_i32$1 = $65$hi;
            i64toi32_i32$0 = $65_1;
            i64toi32_i32$1 = i64toi32_i32$2 | i64toi32_i32$1 | 0;
            legalfunc$wasm2js_scratch_store_i64(i64toi32_i32$3 | i64toi32_i32$0 | 0 | 0, i64toi32_i32$1 | 0);
            i64toi32_i32$1 = 0;
            i64toi32_i32$3 = var$2 >>> ((__wasm_ctz_i32(var$3 | 0) | 0) & 31 | 0) | 0;
            i64toi32_i32$HIGH_BITS = i64toi32_i32$1;
            return i64toi32_i32$3 | 0;
           }
          }
          var$4 = var$3 + -1 | 0;
          if (!(var$4 & var$3 | 0)) {
           break label$5
          }
          var$2 = (Math_clz32(var$3) + 33 | 0) - Math_clz32(var$2) | 0;
          var$3 = 0 - var$2 | 0;
          break label$3;
         }
         var$3 = 63 - var$2 | 0;
         var$2 = var$2 + 1 | 0;
         break label$3;
        }
        var$4 = (var$2 >>> 0) / (var$3 >>> 0) | 0;
        i64toi32_i32$3 = 0;
        i64toi32_i32$2 = var$2 - Math_imul(var$4, var$3) | 0;
        i64toi32_i32$1 = 0;
        i64toi32_i32$0 = 32;
        i64toi32_i32$4 = i64toi32_i32$0 & 31 | 0;
        if (32 >>> 0 <= (i64toi32_i32$0 & 63 | 0) >>> 0) {
         i64toi32_i32$1 = i64toi32_i32$2 << i64toi32_i32$4 | 0;
         $41_1 = 0;
        } else {
         i64toi32_i32$1 = ((1 << i64toi32_i32$4 | 0) - 1 | 0) & (i64toi32_i32$2 >>> (32 - i64toi32_i32$4 | 0) | 0) | 0 | (i64toi32_i32$3 << i64toi32_i32$4 | 0) | 0;
         $41_1 = i64toi32_i32$2 << i64toi32_i32$4 | 0;
        }
        legalfunc$wasm2js_scratch_store_i64($41_1 | 0, i64toi32_i32$1 | 0);
        i64toi32_i32$1 = 0;
        i64toi32_i32$2 = var$4;
        i64toi32_i32$HIGH_BITS = i64toi32_i32$1;
        return i64toi32_i32$2 | 0;
       }
       var$2 = Math_clz32(var$3) - Math_clz32(var$2) | 0;
       if (var$2 >>> 0 < 31 >>> 0) {
        break label$4
       }
       break label$2;
      }
      i64toi32_i32$2 = var$0$hi;
      i64toi32_i32$2 = 0;
      legalfunc$wasm2js_scratch_store_i64(var$4 & var$0 | 0 | 0, i64toi32_i32$2 | 0);
      if ((var$3 | 0) == (1 | 0)) {
       break label$1
      }
      i64toi32_i32$2 = var$0$hi;
      i64toi32_i32$2 = 0;
      $120$hi = i64toi32_i32$2;
      i64toi32_i32$2 = var$0$hi;
      i64toi32_i32$3 = var$0;
      i64toi32_i32$1 = $120$hi;
      i64toi32_i32$0 = __wasm_ctz_i32(var$3 | 0) | 0;
      i64toi32_i32$4 = i64toi32_i32$0 & 31 | 0;
      if (32 >>> 0 <= (i64toi32_i32$0 & 63 | 0) >>> 0) {
       i64toi32_i32$1 = 0;
       $42_1 = i64toi32_i32$2 >>> i64toi32_i32$4 | 0;
      } else {
       i64toi32_i32$1 = i64toi32_i32$2 >>> i64toi32_i32$4 | 0;
       $42_1 = (((1 << i64toi32_i32$4 | 0) - 1 | 0) & i64toi32_i32$2 | 0) << (32 - i64toi32_i32$4 | 0) | 0 | (i64toi32_i32$3 >>> i64toi32_i32$4 | 0) | 0;
      }
      i64toi32_i32$3 = $42_1;
      i64toi32_i32$HIGH_BITS = i64toi32_i32$1;
      return i64toi32_i32$3 | 0;
     }
     var$3 = 63 - var$2 | 0;
     var$2 = var$2 + 1 | 0;
    }
    i64toi32_i32$3 = var$0$hi;
    i64toi32_i32$3 = 0;
    $129$hi = i64toi32_i32$3;
    i64toi32_i32$3 = var$0$hi;
    i64toi32_i32$2 = var$0;
    i64toi32_i32$1 = $129$hi;
    i64toi32_i32$0 = var$2 & 63 | 0;
    i64toi32_i32$4 = i64toi32_i32$0 & 31 | 0;
    if (32 >>> 0 <= (i64toi32_i32$0 & 63 | 0) >>> 0) {
     i64toi32_i32$1 = 0;
     $43_1 = i64toi32_i32$3 >>> i64toi32_i32$4 | 0;
    } else {
     i64toi32_i32$1 = i64toi32_i32$3 >>> i64toi32_i32$4 | 0;
     $43_1 = (((1 << i64toi32_i32$4 | 0) - 1 | 0) & i64toi32_i32$3 | 0) << (32 - i64toi32_i32$4 | 0) | 0 | (i64toi32_i32$2 >>> i64toi32_i32$4 | 0) | 0;
    }
    var$5 = $43_1;
    var$5$hi = i64toi32_i32$1;
    i64toi32_i32$1 = var$0$hi;
    i64toi32_i32$1 = 0;
    $134$hi = i64toi32_i32$1;
    i64toi32_i32$1 = var$0$hi;
    i64toi32_i32$3 = var$0;
    i64toi32_i32$2 = $134$hi;
    i64toi32_i32$0 = var$3 & 63 | 0;
    i64toi32_i32$4 = i64toi32_i32$0 & 31 | 0;
    if (32 >>> 0 <= (i64toi32_i32$0 & 63 | 0) >>> 0) {
     i64toi32_i32$2 = i64toi32_i32$3 << i64toi32_i32$4 | 0;
     $44_1 = 0;
    } else {
     i64toi32_i32$2 = ((1 << i64toi32_i32$4 | 0) - 1 | 0) & (i64toi32_i32$3 >>> (32 - i64toi32_i32$4 | 0) | 0) | 0 | (i64toi32_i32$1 << i64toi32_i32$4 | 0) | 0;
     $44_1 = i64toi32_i32$3 << i64toi32_i32$4 | 0;
    }
    var$0 = $44_1;
    var$0$hi = i64toi32_i32$2;
    label$13 : {
     if (var$2) {
      block3 : {
       i64toi32_i32$2 = var$1$hi;
       i64toi32_i32$1 = var$1;
       i64toi32_i32$3 = -1;
       i64toi32_i32$0 = -1;
       i64toi32_i32$4 = i64toi32_i32$1 + i64toi32_i32$0 | 0;
       i64toi32_i32$5 = i64toi32_i32$2 + i64toi32_i32$3 | 0;
       if (i64toi32_i32$4 >>> 0 < i64toi32_i32$0 >>> 0) {
        i64toi32_i32$5 = i64toi32_i32$5 + 1 | 0
       }
       var$8 = i64toi32_i32$4;
       var$8$hi = i64toi32_i32$5;
       label$15 : while (1) {
        i64toi32_i32$5 = var$5$hi;
        i64toi32_i32$2 = var$5;
        i64toi32_i32$1 = 0;
        i64toi32_i32$0 = 1;
        i64toi32_i32$3 = i64toi32_i32$0 & 31 | 0;
        if (32 >>> 0 <= (i64toi32_i32$0 & 63 | 0) >>> 0) {
         i64toi32_i32$1 = i64toi32_i32$2 << i64toi32_i32$3 | 0;
         $45_1 = 0;
        } else {
         i64toi32_i32$1 = ((1 << i64toi32_i32$3 | 0) - 1 | 0) & (i64toi32_i32$2 >>> (32 - i64toi32_i32$3 | 0) | 0) | 0 | (i64toi32_i32$5 << i64toi32_i32$3 | 0) | 0;
         $45_1 = i64toi32_i32$2 << i64toi32_i32$3 | 0;
        }
        $140 = $45_1;
        $140$hi = i64toi32_i32$1;
        i64toi32_i32$1 = var$0$hi;
        i64toi32_i32$5 = var$0;
        i64toi32_i32$2 = 0;
        i64toi32_i32$0 = 63;
        i64toi32_i32$3 = i64toi32_i32$0 & 31 | 0;
        if (32 >>> 0 <= (i64toi32_i32$0 & 63 | 0) >>> 0) {
         i64toi32_i32$2 = 0;
         $46_1 = i64toi32_i32$1 >>> i64toi32_i32$3 | 0;
        } else {
         i64toi32_i32$2 = i64toi32_i32$1 >>> i64toi32_i32$3 | 0;
         $46_1 = (((1 << i64toi32_i32$3 | 0) - 1 | 0) & i64toi32_i32$1 | 0) << (32 - i64toi32_i32$3 | 0) | 0 | (i64toi32_i32$5 >>> i64toi32_i32$3 | 0) | 0;
        }
        $142$hi = i64toi32_i32$2;
        i64toi32_i32$2 = $140$hi;
        i64toi32_i32$1 = $140;
        i64toi32_i32$5 = $142$hi;
        i64toi32_i32$0 = $46_1;
        i64toi32_i32$5 = i64toi32_i32$2 | i64toi32_i32$5 | 0;
        var$5 = i64toi32_i32$1 | i64toi32_i32$0 | 0;
        var$5$hi = i64toi32_i32$5;
        $144 = var$5;
        $144$hi = i64toi32_i32$5;
        i64toi32_i32$5 = var$8$hi;
        i64toi32_i32$5 = var$5$hi;
        i64toi32_i32$5 = var$8$hi;
        i64toi32_i32$2 = var$8;
        i64toi32_i32$1 = var$5$hi;
        i64toi32_i32$0 = var$5;
        i64toi32_i32$3 = i64toi32_i32$2 - i64toi32_i32$0 | 0;
        i64toi32_i32$6 = i64toi32_i32$2 >>> 0 < i64toi32_i32$0 >>> 0;
        i64toi32_i32$4 = i64toi32_i32$6 + i64toi32_i32$1 | 0;
        i64toi32_i32$4 = i64toi32_i32$5 - i64toi32_i32$4 | 0;
        i64toi32_i32$5 = i64toi32_i32$3;
        i64toi32_i32$2 = 0;
        i64toi32_i32$0 = 63;
        i64toi32_i32$1 = i64toi32_i32$0 & 31 | 0;
        if (32 >>> 0 <= (i64toi32_i32$0 & 63 | 0) >>> 0) {
         i64toi32_i32$2 = i64toi32_i32$4 >> 31 | 0;
         $47_1 = i64toi32_i32$4 >> i64toi32_i32$1 | 0;
        } else {
         i64toi32_i32$2 = i64toi32_i32$4 >> i64toi32_i32$1 | 0;
         $47_1 = (((1 << i64toi32_i32$1 | 0) - 1 | 0) & i64toi32_i32$4 | 0) << (32 - i64toi32_i32$1 | 0) | 0 | (i64toi32_i32$5 >>> i64toi32_i32$1 | 0) | 0;
        }
        var$6 = $47_1;
        var$6$hi = i64toi32_i32$2;
        i64toi32_i32$2 = var$1$hi;
        i64toi32_i32$2 = var$6$hi;
        i64toi32_i32$4 = var$6;
        i64toi32_i32$5 = var$1$hi;
        i64toi32_i32$0 = var$1;
        i64toi32_i32$5 = i64toi32_i32$2 & i64toi32_i32$5 | 0;
        $151 = i64toi32_i32$4 & i64toi32_i32$0 | 0;
        $151$hi = i64toi32_i32$5;
        i64toi32_i32$5 = $144$hi;
        i64toi32_i32$2 = $144;
        i64toi32_i32$4 = $151$hi;
        i64toi32_i32$0 = $151;
        i64toi32_i32$1 = i64toi32_i32$2 - i64toi32_i32$0 | 0;
        i64toi32_i32$6 = i64toi32_i32$2 >>> 0 < i64toi32_i32$0 >>> 0;
        i64toi32_i32$3 = i64toi32_i32$6 + i64toi32_i32$4 | 0;
        i64toi32_i32$3 = i64toi32_i32$5 - i64toi32_i32$3 | 0;
        var$5 = i64toi32_i32$1;
        var$5$hi = i64toi32_i32$3;
        i64toi32_i32$3 = var$0$hi;
        i64toi32_i32$5 = var$0;
        i64toi32_i32$2 = 0;
        i64toi32_i32$0 = 1;
        i64toi32_i32$4 = i64toi32_i32$0 & 31 | 0;
        if (32 >>> 0 <= (i64toi32_i32$0 & 63 | 0) >>> 0) {
         i64toi32_i32$2 = i64toi32_i32$5 << i64toi32_i32$4 | 0;
         $48_1 = 0;
        } else {
         i64toi32_i32$2 = ((1 << i64toi32_i32$4 | 0) - 1 | 0) & (i64toi32_i32$5 >>> (32 - i64toi32_i32$4 | 0) | 0) | 0 | (i64toi32_i32$3 << i64toi32_i32$4 | 0) | 0;
         $48_1 = i64toi32_i32$5 << i64toi32_i32$4 | 0;
        }
        $154$hi = i64toi32_i32$2;
        i64toi32_i32$2 = var$7$hi;
        i64toi32_i32$2 = $154$hi;
        i64toi32_i32$3 = $48_1;
        i64toi32_i32$5 = var$7$hi;
        i64toi32_i32$0 = var$7;
        i64toi32_i32$5 = i64toi32_i32$2 | i64toi32_i32$5 | 0;
        var$0 = i64toi32_i32$3 | i64toi32_i32$0 | 0;
        var$0$hi = i64toi32_i32$5;
        i64toi32_i32$5 = var$6$hi;
        i64toi32_i32$2 = var$6;
        i64toi32_i32$3 = 0;
        i64toi32_i32$0 = 1;
        i64toi32_i32$3 = i64toi32_i32$5 & i64toi32_i32$3 | 0;
        var$6 = i64toi32_i32$2 & i64toi32_i32$0 | 0;
        var$6$hi = i64toi32_i32$3;
        var$7 = var$6;
        var$7$hi = i64toi32_i32$3;
        var$2 = var$2 + -1 | 0;
        if (var$2) {
         continue label$15
        }
        break label$15;
       };
       break label$13;
      }
     }
    }
    i64toi32_i32$3 = var$5$hi;
    legalfunc$wasm2js_scratch_store_i64(var$5 | 0, i64toi32_i32$3 | 0);
    i64toi32_i32$3 = var$0$hi;
    i64toi32_i32$5 = var$0;
    i64toi32_i32$2 = 0;
    i64toi32_i32$0 = 1;
    i64toi32_i32$4 = i64toi32_i32$0 & 31 | 0;
    if (32 >>> 0 <= (i64toi32_i32$0 & 63 | 0) >>> 0) {
     i64toi32_i32$2 = i64toi32_i32$5 << i64toi32_i32$4 | 0;
     $49_1 = 0;
    } else {
     i64toi32_i32$2 = ((1 << i64toi32_i32$4 | 0) - 1 | 0) & (i64toi32_i32$5 >>> (32 - i64toi32_i32$4 | 0) | 0) | 0 | (i64toi32_i32$3 << i64toi32_i32$4 | 0) | 0;
     $49_1 = i64toi32_i32$5 << i64toi32_i32$4 | 0;
    }
    $165$hi = i64toi32_i32$2;
    i64toi32_i32$2 = var$6$hi;
    i64toi32_i32$2 = $165$hi;
    i64toi32_i32$3 = $49_1;
    i64toi32_i32$5 = var$6$hi;
    i64toi32_i32$0 = var$6;
    i64toi32_i32$5 = i64toi32_i32$2 | i64toi32_i32$5 | 0;
    i64toi32_i32$3 = i64toi32_i32$3 | i64toi32_i32$0 | 0;
    i64toi32_i32$HIGH_BITS = i64toi32_i32$5;
    return i64toi32_i32$3 | 0;
   }
   i64toi32_i32$3 = var$0$hi;
   legalfunc$wasm2js_scratch_store_i64(var$0 | 0, i64toi32_i32$3 | 0);
   i64toi32_i32$3 = 0;
   var$0 = 0;
   var$0$hi = i64toi32_i32$3;
  }
  i64toi32_i32$3 = var$0$hi;
  i64toi32_i32$5 = var$0;
  i64toi32_i32$HIGH_BITS = i64toi32_i32$3;
  return i64toi32_i32$5 | 0;
 }
 
 function __wasm_i64_mul(var$0, var$0$hi, var$1, var$1$hi) {
  var$0 = var$0 | 0;
  var$0$hi = var$0$hi | 0;
  var$1 = var$1 | 0;
  var$1$hi = var$1$hi | 0;
  var i64toi32_i32$0 = 0, i64toi32_i32$1 = 0;
  i64toi32_i32$0 = var$0$hi;
  i64toi32_i32$0 = var$1$hi;
  i64toi32_i32$0 = var$0$hi;
  i64toi32_i32$1 = var$1$hi;
  i64toi32_i32$1 = _ZN17compiler_builtins3int3mul3Mul3mul17h070e9a1c69faec5bE(var$0 | 0, i64toi32_i32$0 | 0, var$1 | 0, i64toi32_i32$1 | 0) | 0;
  i64toi32_i32$0 = i64toi32_i32$HIGH_BITS;
  i64toi32_i32$HIGH_BITS = i64toi32_i32$0;
  return i64toi32_i32$1 | 0;
 }
 
 function __wasm_i64_udiv(var$0, var$0$hi, var$1, var$1$hi) {
  var$0 = var$0 | 0;
  var$0$hi = var$0$hi | 0;
  var$1 = var$1 | 0;
  var$1$hi = var$1$hi | 0;
  var i64toi32_i32$0 = 0, i64toi32_i32$1 = 0;
  i64toi32_i32$0 = var$0$hi;
  i64toi32_i32$0 = var$1$hi;
  i64toi32_i32$0 = var$0$hi;
  i64toi32_i32$1 = var$1$hi;
  i64toi32_i32$1 = _ZN17compiler_builtins3int4udiv10divmod_u6417h6026910b5ed08e40E(var$0 | 0, i64toi32_i32$0 | 0, var$1 | 0, i64toi32_i32$1 | 0) | 0;
  i64toi32_i32$0 = i64toi32_i32$HIGH_BITS;
  i64toi32_i32$HIGH_BITS = i64toi32_i32$0;
  return i64toi32_i32$1 | 0;
 }
 
 function __wasm_rotl_i32(var$0, var$1) {
  var$0 = var$0 | 0;
  var$1 = var$1 | 0;
  var var$2 = 0;
  var$2 = var$1 & 31 | 0;
  var$1 = (0 - var$1 | 0) & 31 | 0;
  return ((-1 >>> var$2 | 0) & var$0 | 0) << var$2 | 0 | (((-1 << var$1 | 0) & var$0 | 0) >>> var$1 | 0) | 0 | 0;
 }
 
 function __wasm_ctz_i32(var$0) {
  var$0 = var$0 | 0;
  if (var$0) {
   return 31 - Math_clz32((var$0 + -1 | 0) ^ var$0 | 0) | 0 | 0
  }
  return 32 | 0;
 }
 
 // EMSCRIPTEN_END_FUNCS;
 FUNCTION_TABLE[1] = $6;
 FUNCTION_TABLE[2] = $31;
 FUNCTION_TABLE[3] = $7;
 FUNCTION_TABLE[4] = $26;
 FUNCTION_TABLE[5] = $27;
 FUNCTION_TABLE[6] = $43;
 FUNCTION_TABLE[7] = $46;
 FUNCTION_TABLE[8] = $44;
 FUNCTION_TABLE[9] = $45;
 FUNCTION_TABLE[10] = $50;
 FUNCTION_TABLE[11] = $47;
 FUNCTION_TABLE[12] = $53;
 FUNCTION_TABLE[13] = $67;
 FUNCTION_TABLE[14] = $65;
 FUNCTION_TABLE[15] = $56;
 FUNCTION_TABLE[16] = $48;
 FUNCTION_TABLE[17] = $66;
 FUNCTION_TABLE[18] = $64;
 FUNCTION_TABLE[19] = $57;
 FUNCTION_TABLE[20] = $49;
 FUNCTION_TABLE[21] = $59;
 function __wasm_memory_size() {
  return buffer.byteLength / 65536 | 0;
 }
 
 return {
  "__wasm_call_ctors": $1, 
  "main": $4, 
  "__errno_location": $8, 
  "fflush": $74, 
  "setThrew": $73, 
  "malloc": $68, 
  "free": $69, 
  "__set_stack_limit": $76, 
  "stackSave": $77, 
  "stackAlloc": $78, 
  "stackRestore": $79, 
  "__growWasmMemory": $80, 
  "dynCall_ii": $81, 
  "dynCall_iiii": $82, 
  "dynCall_jiji": $90, 
  "dynCall_iidiiii": $84, 
  "dynCall_vii": $85, 
  "dynCall_vi": $86, 
  "dynCall_viiiiii": $87, 
  "dynCall_viiiii": $88, 
  "dynCall_viiii": $89
 };
}

var writeSegment = (
    function(mem) {
      var _mem = new Uint8Array(mem);
      return function(offset, s) {
        var bytes, i;
        if (typeof Buffer === 'undefined') {
          bytes = atob(s);
          for (i = 0; i < bytes.length; i++)
            _mem[offset + i] = bytes.charCodeAt(i);
        } else {
          bytes = Buffer.from(s, 'base64');
          for (i = 0; i < bytes.length; i++)
            _mem[offset + i] = bytes[i];
        }
      }
    }
  )(wasmMemory.buffer);
writeSegment(1024, "JWQ6ICVkCgBUaGUgdmFsdWUgcGFzc2VkIHRvIHRoZSBtZXRob2QgbXVzdCBiZSBwb3NpdGl2ZS4AAAAA2AgAAC0rICAgMFgweAAobnVsbCkAAAAAAAAAAAAAAAAAAAAAEQAKABEREQAAAAAFAAAAAAAACQAAAAALAAAAAAAAAAARAA8KERERAwoHAAETCQsLAAAJBgsAAAsABhEAAAAREREAAAAAAAAAAAAAAAAAAAAACwAAAAAAAAAAEQAKChEREQAKAAACAAkLAAAACQALAAALAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwAAAAAAAAAAAAAAAwAAAAADAAAAAAJDAAAAAAADAAADAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAOAAAAAAAAAAAAAAANAAAABA0AAAAACQ4AAAAAAA4AAA4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAADwAAAAAPAAAAAAkQAAAAAAAQAAAQAAASAAAAEhISAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABIAAAASEhIAAAAAAAAJAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAALAAAAAAAAAAAAAAAKAAAAAAoAAAAACQsAAAAAAAsAAAsAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADAAAAAAAAAAAAAAADAAAAAAMAAAAAAkMAAAAAAAMAAAMAAAwMTIzNDU2Nzg5QUJDREVGLTBYKzBYIDBYLTB4KzB4IDB4AGluZgBJTkYAbmFuAE5BTgAuAFN0OXR5cGVfaW5mbwAAADwIAABlBgAATjEwX19jeHhhYml2MTE2X19zaGltX3R5cGVfaW5mb0UAAAAAZAgAAHwGAAB0BgAATjEwX19jeHhhYml2MTE3X19jbGFzc190eXBlX2luZm9FAAAAZAgAAKwGAACgBgAATjEwX19jeHhhYml2MTE3X19wYmFzZV90eXBlX2luZm9FAAAAZAgAANwGAACgBgAATjEwX19jeHhhYml2MTE5X19wb2ludGVyX3R5cGVfaW5mb0UAZAgAAAwHAAAABwAATjEwX19jeHhhYml2MTIwX19mdW5jdGlvbl90eXBlX2luZm9FAAAAAGQIAAA8BwAAoAYAAE4xMF9fY3h4YWJpdjEyOV9fcG9pbnRlcl90b19tZW1iZXJfdHlwZV9pbmZvRQAAAGQIAABwBwAAAAcAAAAAAADwBwAABgAAAAcAAAAIAAAACQAAAAoAAABOMTBfX2N4eGFiaXYxMjNfX2Z1bmRhbWVudGFsX3R5cGVfaW5mb0UAZAgAAMgHAACgBgAAdgAAALQHAAD8BwAARG4AALQHAAAICAAAYwAAALQHAAAUCAAAUEtjAMAIAAAgCAAAAQAAABgIAAAAAAAA0AYAAAYAAAALAAAACAAAAAkAAAAMAAAADQAAAA4AAAAPAAAAAAAAAKwIAAAGAAAAEAAAAAgAAAAJAAAADAAAABEAAAASAAAAEwAAAE4xMF9fY3h4YWJpdjEyMF9fc2lfY2xhc3NfdHlwZV9pbmZvRQAAAABkCAAAhAgAANAGAAAAAAAAMAcAAAYAAAAUAAAACAAAAAkAAAAVAAAA");
writeSegment(2264, "BQAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAAMAAABoCgAAAAQAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAACv////8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA2AgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlA4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=");
writeSegment(2656, "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=");
return asmFunc({
    'Int8Array': Int8Array,
    'Int16Array': Int16Array,
    'Int32Array': Int32Array,
    'Uint8Array': Uint8Array,
    'Uint16Array': Uint16Array,
    'Uint32Array': Uint32Array,
    'Float32Array': Float32Array,
    'Float64Array': Float64Array,
    'NaN': NaN,
    'Infinity': Infinity,
    'Math': Math
  },
  asmLibraryArg,
  wasmMemory.buffer
)

}
)(asmLibraryArg, wasmMemory, wasmTable);
    return {
      'exports': exports
    };
  },

  instantiate: function(binary, info) {
    return {
      then: function(ok, err) {
        ok({
          'instance': new WebAssembly.Instance(new WebAssembly.Module(binary, info))
        });
      }
    };
  },

  RuntimeError: Error
};

// We don't need to actually download a wasm binary, mark it as present but empty.
wasmBinary = [];




if (typeof WebAssembly !== 'object') {
  abort('No WebAssembly support found. Build with -s WASM=0 to target JavaScript instead.');
}


// In MINIMAL_RUNTIME, setValue() and getValue() are only available when building with safe heap enabled, for heap safety checking.
// In traditional runtime, setValue() and getValue() are always available (although their use is highly discouraged due to perf penalties)

/** @type {function(number, number, string, boolean=)} */
function setValue(ptr, value, type, noSafe) {
  type = type || 'i8';
  if (type.charAt(type.length-1) === '*') type = 'i32'; // pointers are 32-bit
    switch(type) {
      case 'i1': HEAP8[((ptr)>>0)]=value; break;
      case 'i8': HEAP8[((ptr)>>0)]=value; break;
      case 'i16': HEAP16[((ptr)>>1)]=value; break;
      case 'i32': HEAP32[((ptr)>>2)]=value; break;
      case 'i64': (tempI64 = [value>>>0,(tempDouble=value,(+(Math_abs(tempDouble))) >= 1.0 ? (tempDouble > 0.0 ? ((Math_min((+(Math_floor((tempDouble)/4294967296.0))), 4294967295.0))|0)>>>0 : (~~((+(Math_ceil((tempDouble - +(((~~(tempDouble)))>>>0))/4294967296.0)))))>>>0) : 0)],HEAP32[((ptr)>>2)]=tempI64[0],HEAP32[(((ptr)+(4))>>2)]=tempI64[1]); break;
      case 'float': HEAPF32[((ptr)>>2)]=value; break;
      case 'double': HEAPF64[((ptr)>>3)]=value; break;
      default: abort('invalid type for setValue: ' + type);
    }
}

/** @type {function(number, string, boolean=)} */
function getValue(ptr, type, noSafe) {
  type = type || 'i8';
  if (type.charAt(type.length-1) === '*') type = 'i32'; // pointers are 32-bit
    switch(type) {
      case 'i1': return HEAP8[((ptr)>>0)];
      case 'i8': return HEAP8[((ptr)>>0)];
      case 'i16': return HEAP16[((ptr)>>1)];
      case 'i32': return HEAP32[((ptr)>>2)];
      case 'i64': return HEAP32[((ptr)>>2)];
      case 'float': return HEAPF32[((ptr)>>2)];
      case 'double': return HEAPF64[((ptr)>>3)];
      default: abort('invalid type for getValue: ' + type);
    }
  return null;
}





// Wasm globals

var wasmMemory;

// In fastcomp asm.js, we don't need a wasm Table at all.
// In the wasm backend, we polyfill the WebAssembly object,
// so this creates a (non-native-wasm) table for us.
var wasmTable = new WebAssembly.Table({
  'initial': 22,
  'maximum': 22 + 0,
  'element': 'anyfunc'
});


//========================================
// Runtime essentials
//========================================

// whether we are quitting the application. no code should run after this.
// set in exit() and abort()
var ABORT = false;

// set by exit() and abort().  Passed to 'onExit' handler.
// NOTE: This is also used as the process return code code in shell environments
// but only when noExitRuntime is false.
var EXITSTATUS = 0;

/** @type {function(*, string=)} */
function assert(condition, text) {
  if (!condition) {
    abort('Assertion failed: ' + text);
  }
}

// Returns the C function with a specified identifier (for C++, you need to do manual name mangling)
function getCFunc(ident) {
  var func = Module['_' + ident]; // closure exported function
  assert(func, 'Cannot call unknown function ' + ident + ', make sure it is exported');
  return func;
}

// C calling interface.
function ccall(ident, returnType, argTypes, args, opts) {
  // For fast lookup of conversion functions
  var toC = {
    'string': function(str) {
      var ret = 0;
      if (str !== null && str !== undefined && str !== 0) { // null string
        // at most 4 bytes per UTF-8 code point, +1 for the trailing '\0'
        var len = (str.length << 2) + 1;
        ret = stackAlloc(len);
        stringToUTF8(str, ret, len);
      }
      return ret;
    },
    'array': function(arr) {
      var ret = stackAlloc(arr.length);
      writeArrayToMemory(arr, ret);
      return ret;
    }
  };

  function convertReturnValue(ret) {
    if (returnType === 'string') return UTF8ToString(ret);
    if (returnType === 'boolean') return Boolean(ret);
    return ret;
  }

  var func = getCFunc(ident);
  var cArgs = [];
  var stack = 0;
  assert(returnType !== 'array', 'Return type should not be "array".');
  if (args) {
    for (var i = 0; i < args.length; i++) {
      var converter = toC[argTypes[i]];
      if (converter) {
        if (stack === 0) stack = stackSave();
        cArgs[i] = converter(args[i]);
      } else {
        cArgs[i] = args[i];
      }
    }
  }
  var ret = func.apply(null, cArgs);

  ret = convertReturnValue(ret);
  if (stack !== 0) stackRestore(stack);
  return ret;
}

function cwrap(ident, returnType, argTypes, opts) {
  return function() {
    return ccall(ident, returnType, argTypes, arguments, opts);
  }
}

var ALLOC_NORMAL = 0; // Tries to use _malloc()
var ALLOC_STACK = 1; // Lives for the duration of the current function call
var ALLOC_DYNAMIC = 2; // Cannot be freed except through sbrk
var ALLOC_NONE = 3; // Do not allocate

// allocate(): This is for internal use. You can use it yourself as well, but the interface
//             is a little tricky (see docs right below). The reason is that it is optimized
//             for multiple syntaxes to save space in generated code. So you should
//             normally not use allocate(), and instead allocate memory using _malloc(),
//             initialize it with setValue(), and so forth.
// @slab: An array of data, or a number. If a number, then the size of the block to allocate,
//        in *bytes* (note that this is sometimes confusing: the next parameter does not
//        affect this!)
// @types: Either an array of types, one for each byte (or 0 if no type at that position),
//         or a single type which is used for the entire block. This only matters if there
//         is initial data - if @slab is a number, then this does not matter at all and is
//         ignored.
// @allocator: How to allocate memory, see ALLOC_*
/** @type {function((TypedArray|Array<number>|number), string, number, number=)} */
function allocate(slab, types, allocator, ptr) {
  var zeroinit, size;
  if (typeof slab === 'number') {
    zeroinit = true;
    size = slab;
  } else {
    zeroinit = false;
    size = slab.length;
  }

  var singleType = typeof types === 'string' ? types : null;

  var ret;
  if (allocator == ALLOC_NONE) {
    ret = ptr;
  } else {
    ret = [_malloc,
    stackAlloc,
    dynamicAlloc][allocator](Math.max(size, singleType ? 1 : types.length));
  }

  if (zeroinit) {
    var stop;
    ptr = ret;
    assert((ret & 3) == 0);
    stop = ret + (size & ~3);
    for (; ptr < stop; ptr += 4) {
      HEAP32[((ptr)>>2)]=0;
    }
    stop = ret + size;
    while (ptr < stop) {
      HEAP8[((ptr++)>>0)]=0;
    }
    return ret;
  }

  if (singleType === 'i8') {
    if (slab.subarray || slab.slice) {
      HEAPU8.set(/** @type {!Uint8Array} */ (slab), ret);
    } else {
      HEAPU8.set(new Uint8Array(slab), ret);
    }
    return ret;
  }

  var i = 0, type, typeSize, previousType;
  while (i < size) {
    var curr = slab[i];

    type = singleType || types[i];
    if (type === 0) {
      i++;
      continue;
    }
    assert(type, 'Must know what type to store in allocate!');

    if (type == 'i64') type = 'i32'; // special case: we have one i32 here, and one i32 later

    setValue(ret+i, curr, type);

    // no need to look up size unless type changes, so cache it
    if (previousType !== type) {
      typeSize = getNativeTypeSize(type);
      previousType = type;
    }
    i += typeSize;
  }

  return ret;
}

// Allocate memory during any stage of startup - static memory early on, dynamic memory later, malloc when ready
function getMemory(size) {
  if (!runtimeInitialized) return dynamicAlloc(size);
  return _malloc(size);
}




// Given a pointer 'ptr' to a null-terminated ASCII-encoded string in the emscripten HEAP, returns
// a copy of that string as a Javascript String object.

function AsciiToString(ptr) {
  var str = '';
  while (1) {
    var ch = HEAPU8[((ptr++)>>0)];
    if (!ch) return str;
    str += String.fromCharCode(ch);
  }
}

// Copies the given Javascript String object 'str' to the emscripten HEAP at address 'outPtr',
// null-terminated and encoded in ASCII form. The copy will require at most str.length+1 bytes of space in the HEAP.

function stringToAscii(str, outPtr) {
  return writeAsciiToMemory(str, outPtr, false);
}


// Given a pointer 'ptr' to a null-terminated UTF8-encoded string in the given array that contains uint8 values, returns
// a copy of that string as a Javascript String object.

var UTF8Decoder = typeof TextDecoder !== 'undefined' ? new TextDecoder('utf8') : undefined;

/**
 * @param {number} idx
 * @param {number=} maxBytesToRead
 * @return {string}
 */
function UTF8ArrayToString(u8Array, idx, maxBytesToRead) {
  var endIdx = idx + maxBytesToRead;
  var endPtr = idx;
  // TextDecoder needs to know the byte length in advance, it doesn't stop on null terminator by itself.
  // Also, use the length info to avoid running tiny strings through TextDecoder, since .subarray() allocates garbage.
  // (As a tiny code save trick, compare endPtr against endIdx using a negation, so that undefined means Infinity)
  while (u8Array[endPtr] && !(endPtr >= endIdx)) ++endPtr;

  if (endPtr - idx > 16 && u8Array.subarray && UTF8Decoder) {
    return UTF8Decoder.decode(u8Array.subarray(idx, endPtr));
  } else {
    var str = '';
    // If building with TextDecoder, we have already computed the string length above, so test loop end condition against that
    while (idx < endPtr) {
      // For UTF8 byte structure, see:
      // http://en.wikipedia.org/wiki/UTF-8#Description
      // https://www.ietf.org/rfc/rfc2279.txt
      // https://tools.ietf.org/html/rfc3629
      var u0 = u8Array[idx++];
      if (!(u0 & 0x80)) { str += String.fromCharCode(u0); continue; }
      var u1 = u8Array[idx++] & 63;
      if ((u0 & 0xE0) == 0xC0) { str += String.fromCharCode(((u0 & 31) << 6) | u1); continue; }
      var u2 = u8Array[idx++] & 63;
      if ((u0 & 0xF0) == 0xE0) {
        u0 = ((u0 & 15) << 12) | (u1 << 6) | u2;
      } else {
        if ((u0 & 0xF8) != 0xF0) warnOnce('Invalid UTF-8 leading byte 0x' + u0.toString(16) + ' encountered when deserializing a UTF-8 string on the asm.js/wasm heap to a JS string!');
        u0 = ((u0 & 7) << 18) | (u1 << 12) | (u2 << 6) | (u8Array[idx++] & 63);
      }

      if (u0 < 0x10000) {
        str += String.fromCharCode(u0);
      } else {
        var ch = u0 - 0x10000;
        str += String.fromCharCode(0xD800 | (ch >> 10), 0xDC00 | (ch & 0x3FF));
      }
    }
  }
  return str;
}

// Given a pointer 'ptr' to a null-terminated UTF8-encoded string in the emscripten HEAP, returns a
// copy of that string as a Javascript String object.
// maxBytesToRead: an optional length that specifies the maximum number of bytes to read. You can omit
//                 this parameter to scan the string until the first \0 byte. If maxBytesToRead is
//                 passed, and the string at [ptr, ptr+maxBytesToReadr[ contains a null byte in the
//                 middle, then the string will cut short at that byte index (i.e. maxBytesToRead will
//                 not produce a string of exact length [ptr, ptr+maxBytesToRead[)
//                 N.B. mixing frequent uses of UTF8ToString() with and without maxBytesToRead may
//                 throw JS JIT optimizations off, so it is worth to consider consistently using one
//                 style or the other.
/**
 * @param {number} ptr
 * @param {number=} maxBytesToRead
 * @return {string}
 */
function UTF8ToString(ptr, maxBytesToRead) {
  return ptr ? UTF8ArrayToString(HEAPU8, ptr, maxBytesToRead) : '';
}

// Copies the given Javascript String object 'str' to the given byte array at address 'outIdx',
// encoded in UTF8 form and null-terminated. The copy will require at most str.length*4+1 bytes of space in the HEAP.
// Use the function lengthBytesUTF8 to compute the exact number of bytes (excluding null terminator) that this function will write.
// Parameters:
//   str: the Javascript string to copy.
//   outU8Array: the array to copy to. Each index in this array is assumed to be one 8-byte element.
//   outIdx: The starting offset in the array to begin the copying.
//   maxBytesToWrite: The maximum number of bytes this function can write to the array.
//                    This count should include the null terminator,
//                    i.e. if maxBytesToWrite=1, only the null terminator will be written and nothing else.
//                    maxBytesToWrite=0 does not write any bytes to the output, not even the null terminator.
// Returns the number of bytes written, EXCLUDING the null terminator.

function stringToUTF8Array(str, outU8Array, outIdx, maxBytesToWrite) {
  if (!(maxBytesToWrite > 0)) // Parameter maxBytesToWrite is not optional. Negative values, 0, null, undefined and false each don't write out any bytes.
    return 0;

  var startIdx = outIdx;
  var endIdx = outIdx + maxBytesToWrite - 1; // -1 for string null terminator.
  for (var i = 0; i < str.length; ++i) {
    // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code unit, not a Unicode code point of the character! So decode UTF16->UTF32->UTF8.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    // For UTF8 byte structure, see http://en.wikipedia.org/wiki/UTF-8#Description and https://www.ietf.org/rfc/rfc2279.txt and https://tools.ietf.org/html/rfc3629
    var u = str.charCodeAt(i); // possibly a lead surrogate
    if (u >= 0xD800 && u <= 0xDFFF) {
      var u1 = str.charCodeAt(++i);
      u = 0x10000 + ((u & 0x3FF) << 10) | (u1 & 0x3FF);
    }
    if (u <= 0x7F) {
      if (outIdx >= endIdx) break;
      outU8Array[outIdx++] = u;
    } else if (u <= 0x7FF) {
      if (outIdx + 1 >= endIdx) break;
      outU8Array[outIdx++] = 0xC0 | (u >> 6);
      outU8Array[outIdx++] = 0x80 | (u & 63);
    } else if (u <= 0xFFFF) {
      if (outIdx + 2 >= endIdx) break;
      outU8Array[outIdx++] = 0xE0 | (u >> 12);
      outU8Array[outIdx++] = 0x80 | ((u >> 6) & 63);
      outU8Array[outIdx++] = 0x80 | (u & 63);
    } else {
      if (outIdx + 3 >= endIdx) break;
      if (u >= 0x200000) warnOnce('Invalid Unicode code point 0x' + u.toString(16) + ' encountered when serializing a JS string to an UTF-8 string on the asm.js/wasm heap! (Valid unicode code points should be in range 0-0x1FFFFF).');
      outU8Array[outIdx++] = 0xF0 | (u >> 18);
      outU8Array[outIdx++] = 0x80 | ((u >> 12) & 63);
      outU8Array[outIdx++] = 0x80 | ((u >> 6) & 63);
      outU8Array[outIdx++] = 0x80 | (u & 63);
    }
  }
  // Null-terminate the pointer to the buffer.
  outU8Array[outIdx] = 0;
  return outIdx - startIdx;
}

// Copies the given Javascript String object 'str' to the emscripten HEAP at address 'outPtr',
// null-terminated and encoded in UTF8 form. The copy will require at most str.length*4+1 bytes of space in the HEAP.
// Use the function lengthBytesUTF8 to compute the exact number of bytes (excluding null terminator) that this function will write.
// Returns the number of bytes written, EXCLUDING the null terminator.

function stringToUTF8(str, outPtr, maxBytesToWrite) {
  assert(typeof maxBytesToWrite == 'number', 'stringToUTF8(str, outPtr, maxBytesToWrite) is missing the third parameter that specifies the length of the output buffer!');
  return stringToUTF8Array(str, HEAPU8,outPtr, maxBytesToWrite);
}

// Returns the number of bytes the given Javascript string takes if encoded as a UTF8 byte array, EXCLUDING the null terminator byte.
function lengthBytesUTF8(str) {
  var len = 0;
  for (var i = 0; i < str.length; ++i) {
    // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code unit, not a Unicode code point of the character! So decode UTF16->UTF32->UTF8.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    var u = str.charCodeAt(i); // possibly a lead surrogate
    if (u >= 0xD800 && u <= 0xDFFF) u = 0x10000 + ((u & 0x3FF) << 10) | (str.charCodeAt(++i) & 0x3FF);
    if (u <= 0x7F) ++len;
    else if (u <= 0x7FF) len += 2;
    else if (u <= 0xFFFF) len += 3;
    else len += 4;
  }
  return len;
}


// Given a pointer 'ptr' to a null-terminated UTF16LE-encoded string in the emscripten HEAP, returns
// a copy of that string as a Javascript String object.

var UTF16Decoder = typeof TextDecoder !== 'undefined' ? new TextDecoder('utf-16le') : undefined;
function UTF16ToString(ptr) {
  assert(ptr % 2 == 0, 'Pointer passed to UTF16ToString must be aligned to two bytes!');
  var endPtr = ptr;
  // TextDecoder needs to know the byte length in advance, it doesn't stop on null terminator by itself.
  // Also, use the length info to avoid running tiny strings through TextDecoder, since .subarray() allocates garbage.
  var idx = endPtr >> 1;
  while (HEAP16[idx]) ++idx;
  endPtr = idx << 1;

  if (endPtr - ptr > 32 && UTF16Decoder) {
    return UTF16Decoder.decode(HEAPU8.subarray(ptr, endPtr));
  } else {
    var i = 0;

    var str = '';
    while (1) {
      var codeUnit = HEAP16[(((ptr)+(i*2))>>1)];
      if (codeUnit == 0) return str;
      ++i;
      // fromCharCode constructs a character from a UTF-16 code unit, so we can pass the UTF16 string right through.
      str += String.fromCharCode(codeUnit);
    }
  }
}

// Copies the given Javascript String object 'str' to the emscripten HEAP at address 'outPtr',
// null-terminated and encoded in UTF16 form. The copy will require at most str.length*4+2 bytes of space in the HEAP.
// Use the function lengthBytesUTF16() to compute the exact number of bytes (excluding null terminator) that this function will write.
// Parameters:
//   str: the Javascript string to copy.
//   outPtr: Byte address in Emscripten HEAP where to write the string to.
//   maxBytesToWrite: The maximum number of bytes this function can write to the array. This count should include the null
//                    terminator, i.e. if maxBytesToWrite=2, only the null terminator will be written and nothing else.
//                    maxBytesToWrite<2 does not write any bytes to the output, not even the null terminator.
// Returns the number of bytes written, EXCLUDING the null terminator.

function stringToUTF16(str, outPtr, maxBytesToWrite) {
  assert(outPtr % 2 == 0, 'Pointer passed to stringToUTF16 must be aligned to two bytes!');
  assert(typeof maxBytesToWrite == 'number', 'stringToUTF16(str, outPtr, maxBytesToWrite) is missing the third parameter that specifies the length of the output buffer!');
  // Backwards compatibility: if max bytes is not specified, assume unsafe unbounded write is allowed.
  if (maxBytesToWrite === undefined) {
    maxBytesToWrite = 0x7FFFFFFF;
  }
  if (maxBytesToWrite < 2) return 0;
  maxBytesToWrite -= 2; // Null terminator.
  var startPtr = outPtr;
  var numCharsToWrite = (maxBytesToWrite < str.length*2) ? (maxBytesToWrite / 2) : str.length;
  for (var i = 0; i < numCharsToWrite; ++i) {
    // charCodeAt returns a UTF-16 encoded code unit, so it can be directly written to the HEAP.
    var codeUnit = str.charCodeAt(i); // possibly a lead surrogate
    HEAP16[((outPtr)>>1)]=codeUnit;
    outPtr += 2;
  }
  // Null-terminate the pointer to the HEAP.
  HEAP16[((outPtr)>>1)]=0;
  return outPtr - startPtr;
}

// Returns the number of bytes the given Javascript string takes if encoded as a UTF16 byte array, EXCLUDING the null terminator byte.

function lengthBytesUTF16(str) {
  return str.length*2;
}

function UTF32ToString(ptr) {
  assert(ptr % 4 == 0, 'Pointer passed to UTF32ToString must be aligned to four bytes!');
  var i = 0;

  var str = '';
  while (1) {
    var utf32 = HEAP32[(((ptr)+(i*4))>>2)];
    if (utf32 == 0)
      return str;
    ++i;
    // Gotcha: fromCharCode constructs a character from a UTF-16 encoded code (pair), not from a Unicode code point! So encode the code point to UTF-16 for constructing.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    if (utf32 >= 0x10000) {
      var ch = utf32 - 0x10000;
      str += String.fromCharCode(0xD800 | (ch >> 10), 0xDC00 | (ch & 0x3FF));
    } else {
      str += String.fromCharCode(utf32);
    }
  }
}

// Copies the given Javascript String object 'str' to the emscripten HEAP at address 'outPtr',
// null-terminated and encoded in UTF32 form. The copy will require at most str.length*4+4 bytes of space in the HEAP.
// Use the function lengthBytesUTF32() to compute the exact number of bytes (excluding null terminator) that this function will write.
// Parameters:
//   str: the Javascript string to copy.
//   outPtr: Byte address in Emscripten HEAP where to write the string to.
//   maxBytesToWrite: The maximum number of bytes this function can write to the array. This count should include the null
//                    terminator, i.e. if maxBytesToWrite=4, only the null terminator will be written and nothing else.
//                    maxBytesToWrite<4 does not write any bytes to the output, not even the null terminator.
// Returns the number of bytes written, EXCLUDING the null terminator.

function stringToUTF32(str, outPtr, maxBytesToWrite) {
  assert(outPtr % 4 == 0, 'Pointer passed to stringToUTF32 must be aligned to four bytes!');
  assert(typeof maxBytesToWrite == 'number', 'stringToUTF32(str, outPtr, maxBytesToWrite) is missing the third parameter that specifies the length of the output buffer!');
  // Backwards compatibility: if max bytes is not specified, assume unsafe unbounded write is allowed.
  if (maxBytesToWrite === undefined) {
    maxBytesToWrite = 0x7FFFFFFF;
  }
  if (maxBytesToWrite < 4) return 0;
  var startPtr = outPtr;
  var endPtr = startPtr + maxBytesToWrite - 4;
  for (var i = 0; i < str.length; ++i) {
    // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code unit, not a Unicode code point of the character! We must decode the string to UTF-32 to the heap.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    var codeUnit = str.charCodeAt(i); // possibly a lead surrogate
    if (codeUnit >= 0xD800 && codeUnit <= 0xDFFF) {
      var trailSurrogate = str.charCodeAt(++i);
      codeUnit = 0x10000 + ((codeUnit & 0x3FF) << 10) | (trailSurrogate & 0x3FF);
    }
    HEAP32[((outPtr)>>2)]=codeUnit;
    outPtr += 4;
    if (outPtr + 4 > endPtr) break;
  }
  // Null-terminate the pointer to the HEAP.
  HEAP32[((outPtr)>>2)]=0;
  return outPtr - startPtr;
}

// Returns the number of bytes the given Javascript string takes if encoded as a UTF16 byte array, EXCLUDING the null terminator byte.

function lengthBytesUTF32(str) {
  var len = 0;
  for (var i = 0; i < str.length; ++i) {
    // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code unit, not a Unicode code point of the character! We must decode the string to UTF-32 to the heap.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    var codeUnit = str.charCodeAt(i);
    if (codeUnit >= 0xD800 && codeUnit <= 0xDFFF) ++i; // possibly a lead surrogate, so skip over the tail surrogate.
    len += 4;
  }

  return len;
}

// Allocate heap space for a JS string, and write it there.
// It is the responsibility of the caller to free() that memory.
function allocateUTF8(str) {
  var size = lengthBytesUTF8(str) + 1;
  var ret = _malloc(size);
  if (ret) stringToUTF8Array(str, HEAP8, ret, size);
  return ret;
}

// Allocate stack space for a JS string, and write it there.
function allocateUTF8OnStack(str) {
  var size = lengthBytesUTF8(str) + 1;
  var ret = stackAlloc(size);
  stringToUTF8Array(str, HEAP8, ret, size);
  return ret;
}

// Deprecated: This function should not be called because it is unsafe and does not provide
// a maximum length limit of how many bytes it is allowed to write. Prefer calling the
// function stringToUTF8Array() instead, which takes in a maximum length that can be used
// to be secure from out of bounds writes.
/** @deprecated */
function writeStringToMemory(string, buffer, dontAddNull) {
  warnOnce('writeStringToMemory is deprecated and should not be called! Use stringToUTF8() instead!');

  var /** @type {number} */ lastChar, /** @type {number} */ end;
  if (dontAddNull) {
    // stringToUTF8Array always appends null. If we don't want to do that, remember the
    // character that existed at the location where the null will be placed, and restore
    // that after the write (below).
    end = buffer + lengthBytesUTF8(string);
    lastChar = HEAP8[end];
  }
  stringToUTF8(string, buffer, Infinity);
  if (dontAddNull) HEAP8[end] = lastChar; // Restore the value under the null character.
}

function writeArrayToMemory(array, buffer) {
  assert(array.length >= 0, 'writeArrayToMemory array must have a length (should be an array or typed array)')
  HEAP8.set(array, buffer);
}

function writeAsciiToMemory(str, buffer, dontAddNull) {
  for (var i = 0; i < str.length; ++i) {
    assert(str.charCodeAt(i) === str.charCodeAt(i)&0xff);
    HEAP8[((buffer++)>>0)]=str.charCodeAt(i);
  }
  // Null-terminate the pointer to the HEAP.
  if (!dontAddNull) HEAP8[((buffer)>>0)]=0;
}




// Memory management

var PAGE_SIZE = 16384;
var WASM_PAGE_SIZE = 65536;
var ASMJS_PAGE_SIZE = 16777216;

function alignUp(x, multiple) {
  if (x % multiple > 0) {
    x += multiple - (x % multiple);
  }
  return x;
}

var HEAP,
/** @type {ArrayBuffer} */
  buffer,
/** @type {Int8Array} */
  HEAP8,
/** @type {Uint8Array} */
  HEAPU8,
/** @type {Int16Array} */
  HEAP16,
/** @type {Uint16Array} */
  HEAPU16,
/** @type {Int32Array} */
  HEAP32,
/** @type {Uint32Array} */
  HEAPU32,
/** @type {Float32Array} */
  HEAPF32,
/** @type {Float64Array} */
  HEAPF64;

function updateGlobalBufferAndViews(buf) {
  buffer = buf;
  Module['HEAP8'] = HEAP8 = new Int8Array(buf);
  Module['HEAP16'] = HEAP16 = new Int16Array(buf);
  Module['HEAP32'] = HEAP32 = new Int32Array(buf);
  Module['HEAPU8'] = HEAPU8 = new Uint8Array(buf);
  Module['HEAPU16'] = HEAPU16 = new Uint16Array(buf);
  Module['HEAPU32'] = HEAPU32 = new Uint32Array(buf);
  Module['HEAPF32'] = HEAPF32 = new Float32Array(buf);
  Module['HEAPF64'] = HEAPF64 = new Float64Array(buf);
}

var STATIC_BASE = 1024,
    STACK_BASE = 5247312,
    STACKTOP = STACK_BASE,
    STACK_MAX = 4432,
    DYNAMIC_BASE = 5247312,
    DYNAMICTOP_PTR = 4272;

assert(STACK_BASE % 16 === 0, 'stack must start aligned');
assert(DYNAMIC_BASE % 16 === 0, 'heap must start aligned');



var TOTAL_STACK = 5242880;
if (Module['TOTAL_STACK']) assert(TOTAL_STACK === Module['TOTAL_STACK'], 'the stack size can no longer be determined at runtime')

var INITIAL_TOTAL_MEMORY = Module['TOTAL_MEMORY'] || 16777216;if (!Object.getOwnPropertyDescriptor(Module, 'TOTAL_MEMORY')) Object.defineProperty(Module, 'TOTAL_MEMORY', { configurable: true, get: function() { abort('Module.TOTAL_MEMORY has been replaced with plain INITIAL_TOTAL_MEMORY') } });

assert(INITIAL_TOTAL_MEMORY >= TOTAL_STACK, 'TOTAL_MEMORY should be larger than TOTAL_STACK, was ' + INITIAL_TOTAL_MEMORY + '! (TOTAL_STACK=' + TOTAL_STACK + ')');

// check for full engine support (use string 'subarray' to avoid closure compiler confusion)
assert(typeof Int32Array !== 'undefined' && typeof Float64Array !== 'undefined' && Int32Array.prototype.subarray !== undefined && Int32Array.prototype.set !== undefined,
       'JS engine does not provide full typed array support');






// In standalone mode, the wasm creates the memory, and the user can't provide it.
// In non-standalone/normal mode, we create the memory here.

// Create the main memory. (Note: this isn't used in STANDALONE_WASM mode since the wasm
// memory is created in the wasm, not in JS.)

  if (Module['wasmMemory']) {
    wasmMemory = Module['wasmMemory'];
  } else
  {
    wasmMemory = new WebAssembly.Memory({
      'initial': INITIAL_TOTAL_MEMORY / WASM_PAGE_SIZE
      ,
      'maximum': INITIAL_TOTAL_MEMORY / WASM_PAGE_SIZE
    });
  }


if (wasmMemory) {
  buffer = wasmMemory.buffer;
}

// If the user provides an incorrect length, just use that length instead rather than providing the user to
// specifically provide the memory length with Module['TOTAL_MEMORY'].
INITIAL_TOTAL_MEMORY = buffer.byteLength;
assert(INITIAL_TOTAL_MEMORY % WASM_PAGE_SIZE === 0);
updateGlobalBufferAndViews(buffer);

HEAP32[DYNAMICTOP_PTR>>2] = DYNAMIC_BASE;




// Initializes the stack cookie. Called at the startup of main and at the startup of each thread in pthreads mode.
function writeStackCookie() {
  assert((STACK_MAX & 3) == 0);
  // The stack grows downwards
  HEAPU32[(STACK_MAX >> 2)+1] = 0x2135467;
  HEAPU32[(STACK_MAX >> 2)+2] = 0x89BACDFE;
  // Also test the global address 0 for integrity.
  // We don't do this with ASan because ASan does its own checks for this.
  HEAP32[0] = 0x63736d65; /* 'emsc' */
}

function checkStackCookie() {
  var cookie1 = HEAPU32[(STACK_MAX >> 2)+1];
  var cookie2 = HEAPU32[(STACK_MAX >> 2)+2];
  if (cookie1 != 0x2135467 || cookie2 != 0x89BACDFE) {
    abort('Stack overflow! Stack cookie has been overwritten, expected hex dwords 0x89BACDFE and 0x2135467, but received 0x' + cookie2.toString(16) + ' ' + cookie1.toString(16));
  }
  // Also test the global address 0 for integrity.
  // We don't do this with ASan because ASan does its own checks for this.
  if (HEAP32[0] !== 0x63736d65 /* 'emsc' */) abort('Runtime error: The application has corrupted its heap memory area (address zero)!');
}

function abortStackOverflow(allocSize) {
  abort('Stack overflow! Attempted to allocate ' + allocSize + ' bytes on the stack, but stack has only ' + (STACK_MAX - stackSave() + allocSize) + ' bytes available!');
}




// Endianness check (note: assumes compiler arch was little-endian)
(function() {
  var h16 = new Int16Array(1);
  var h8 = new Int8Array(h16.buffer);
  h16[0] = 0x6373;
  if (h8[0] !== 0x73 || h8[1] !== 0x63) throw 'Runtime error: expected the system to be little-endian!';
})();

function abortFnPtrError(ptr, sig) {
	abort("Invalid function pointer " + ptr + " called with signature '" + sig + "'. Perhaps this is an invalid value (e.g. caused by calling a virtual method on a NULL pointer)? Or calling a function with an incorrect type, which will fail? (it is worth building your source files with -Werror (warnings are errors), as warnings can indicate undefined behavior which can cause this). Build with ASSERTIONS=2 for more info.");
}



function callRuntimeCallbacks(callbacks) {
  while(callbacks.length > 0) {
    var callback = callbacks.shift();
    if (typeof callback == 'function') {
      callback();
      continue;
    }
    var func = callback.func;
    if (typeof func === 'number') {
      if (callback.arg === undefined) {
        Module['dynCall_v'](func);
      } else {
        Module['dynCall_vi'](func, callback.arg);
      }
    } else {
      func(callback.arg === undefined ? null : callback.arg);
    }
  }
}

var __ATPRERUN__  = []; // functions called before the runtime is initialized
var __ATINIT__    = []; // functions called during startup
var __ATMAIN__    = []; // functions called when main() is to be run
var __ATEXIT__    = []; // functions called during shutdown
var __ATPOSTRUN__ = []; // functions called after the main() is called

var runtimeInitialized = false;
var runtimeExited = false;


function preRun() {

  if (Module['preRun']) {
    if (typeof Module['preRun'] == 'function') Module['preRun'] = [Module['preRun']];
    while (Module['preRun'].length) {
      addOnPreRun(Module['preRun'].shift());
    }
  }

  callRuntimeCallbacks(__ATPRERUN__);
}

function initRuntime() {
  checkStackCookie();
  assert(!runtimeInitialized);
  runtimeInitialized = true;
  
  callRuntimeCallbacks(__ATINIT__);
}

function preMain() {
  checkStackCookie();
  
  callRuntimeCallbacks(__ATMAIN__);
}

function exitRuntime() {
  checkStackCookie();
  runtimeExited = true;
}

function postRun() {
  checkStackCookie();

  if (Module['postRun']) {
    if (typeof Module['postRun'] == 'function') Module['postRun'] = [Module['postRun']];
    while (Module['postRun'].length) {
      addOnPostRun(Module['postRun'].shift());
    }
  }

  callRuntimeCallbacks(__ATPOSTRUN__);
}

function addOnPreRun(cb) {
  __ATPRERUN__.unshift(cb);
}

function addOnInit(cb) {
  __ATINIT__.unshift(cb);
}

function addOnPreMain(cb) {
  __ATMAIN__.unshift(cb);
}

function addOnExit(cb) {
}

function addOnPostRun(cb) {
  __ATPOSTRUN__.unshift(cb);
}

function unSign(value, bits, ignore) {
  if (value >= 0) {
    return value;
  }
  return bits <= 32 ? 2*Math.abs(1 << (bits-1)) + value // Need some trickery, since if bits == 32, we are right at the limit of the bits JS uses in bitshifts
                    : Math.pow(2, bits)         + value;
}
function reSign(value, bits, ignore) {
  if (value <= 0) {
    return value;
  }
  var half = bits <= 32 ? Math.abs(1 << (bits-1)) // abs is needed if bits == 32
                        : Math.pow(2, bits-1);
  if (value >= half && (bits <= 32 || value > half)) { // for huge values, we can hit the precision limit and always get true here. so don't do that
                                                       // but, in general there is no perfect solution here. With 64-bit ints, we get rounding and errors
                                                       // TODO: In i64 mode 1, resign the two parts separately and safely
    value = -2*half + value; // Cannot bitshift half, as it may be at the limit of the bits JS uses in bitshifts
  }
  return value;
}


assert(Math.imul, 'This browser does not support Math.imul(), build with LEGACY_VM_SUPPORT or POLYFILL_OLD_MATH_FUNCTIONS to add in a polyfill');
assert(Math.fround, 'This browser does not support Math.fround(), build with LEGACY_VM_SUPPORT or POLYFILL_OLD_MATH_FUNCTIONS to add in a polyfill');
assert(Math.clz32, 'This browser does not support Math.clz32(), build with LEGACY_VM_SUPPORT or POLYFILL_OLD_MATH_FUNCTIONS to add in a polyfill');
assert(Math.trunc, 'This browser does not support Math.trunc(), build with LEGACY_VM_SUPPORT or POLYFILL_OLD_MATH_FUNCTIONS to add in a polyfill');

var Math_abs = Math.abs;
var Math_cos = Math.cos;
var Math_sin = Math.sin;
var Math_tan = Math.tan;
var Math_acos = Math.acos;
var Math_asin = Math.asin;
var Math_atan = Math.atan;
var Math_atan2 = Math.atan2;
var Math_exp = Math.exp;
var Math_log = Math.log;
var Math_sqrt = Math.sqrt;
var Math_ceil = Math.ceil;
var Math_floor = Math.floor;
var Math_pow = Math.pow;
var Math_imul = Math.imul;
var Math_fround = Math.fround;
var Math_round = Math.round;
var Math_min = Math.min;
var Math_max = Math.max;
var Math_clz32 = Math.clz32;
var Math_trunc = Math.trunc;



// A counter of dependencies for calling run(). If we need to
// do asynchronous work before running, increment this and
// decrement it. Incrementing must happen in a place like
// Module.preRun (used by emcc to add file preloading).
// Note that you can add dependencies in preRun, even though
// it happens right before run - run will be postponed until
// the dependencies are met.
var runDependencies = 0;
var runDependencyWatcher = null;
var dependenciesFulfilled = null; // overridden to take different actions when all run dependencies are fulfilled
var runDependencyTracking = {};

function getUniqueRunDependency(id) {
  var orig = id;
  while (1) {
    if (!runDependencyTracking[id]) return id;
    id = orig + Math.random();
  }
  return id;
}

function addRunDependency(id) {
  runDependencies++;

  if (Module['monitorRunDependencies']) {
    Module['monitorRunDependencies'](runDependencies);
  }

  if (id) {
    assert(!runDependencyTracking[id]);
    runDependencyTracking[id] = 1;
    if (runDependencyWatcher === null && typeof setInterval !== 'undefined') {
      // Check for missing dependencies every few seconds
      runDependencyWatcher = setInterval(function() {
        if (ABORT) {
          clearInterval(runDependencyWatcher);
          runDependencyWatcher = null;
          return;
        }
        var shown = false;
        for (var dep in runDependencyTracking) {
          if (!shown) {
            shown = true;
            err('still waiting on run dependencies:');
          }
          err('dependency: ' + dep);
        }
        if (shown) {
          err('(end of list)');
        }
      }, 10000);
    }
  } else {
    err('warning: run dependency added without ID');
  }
}

function removeRunDependency(id) {
  runDependencies--;

  if (Module['monitorRunDependencies']) {
    Module['monitorRunDependencies'](runDependencies);
  }

  if (id) {
    assert(runDependencyTracking[id]);
    delete runDependencyTracking[id];
  } else {
    err('warning: run dependency removed without ID');
  }
  if (runDependencies == 0) {
    if (runDependencyWatcher !== null) {
      clearInterval(runDependencyWatcher);
      runDependencyWatcher = null;
    }
    if (dependenciesFulfilled) {
      var callback = dependenciesFulfilled;
      dependenciesFulfilled = null;
      callback(); // can add another dependenciesFulfilled
    }
  }
}

Module["preloadedImages"] = {}; // maps url to image data
Module["preloadedAudios"] = {}; // maps url to audio data


function abort(what) {
  if (Module['onAbort']) {
    Module['onAbort'](what);
  }

  what += '';
  out(what);
  err(what);

  ABORT = true;
  EXITSTATUS = 1;

  var output = 'abort(' + what + ') at ' + stackTrace();
  what = output;

  // Throw a wasm runtime error, because a JS error might be seen as a foreign
  // exception, which means we'd run destructors on it. We need the error to
  // simply make the program stop.
  throw new WebAssembly.RuntimeError(what);
}


var memoryInitializer = null;



// show errors on likely calls to FS when it was not included
var FS = {
  error: function() {
    abort('Filesystem support (FS) was not included. The problem is that you are using files from JS, but files were not used from C/C++, so filesystem support was not auto-included. You can force-include filesystem support with  -s FORCE_FILESYSTEM=1');
  },
  init: function() { FS.error() },
  createDataFile: function() { FS.error() },
  createPreloadedFile: function() { FS.error() },
  createLazyFile: function() { FS.error() },
  open: function() { FS.error() },
  mkdev: function() { FS.error() },
  registerDevice: function() { FS.error() },
  analyzePath: function() { FS.error() },
  loadFilesFromDB: function() { FS.error() },

  ErrnoError: function ErrnoError() { FS.error() },
};
Module['FS_createDataFile'] = FS.createDataFile;
Module['FS_createPreloadedFile'] = FS.createPreloadedFile;



// Copyright 2017 The Emscripten Authors.  All rights reserved.
// Emscripten is available under two separate licenses, the MIT license and the
// University of Illinois/NCSA Open Source License.  Both these licenses can be
// found in the LICENSE file.

// Prefix of data URIs emitted by SINGLE_FILE and related options.
var dataURIPrefix = 'data:application/octet-stream;base64,';

// Indicates whether filename is a base64 data URI.
function isDataURI(filename) {
  return String.prototype.startsWith ?
      filename.startsWith(dataURIPrefix) :
      filename.indexOf(dataURIPrefix) === 0;
}




var wasmBinaryFile = 'fibonacci.wasm';
if (!isDataURI(wasmBinaryFile)) {
  wasmBinaryFile = locateFile(wasmBinaryFile);
}

function getBinary() {
  try {
    if (wasmBinary) {
      return new Uint8Array(wasmBinary);
    }

    var binary = tryParseAsDataURI(wasmBinaryFile);
    if (binary) {
      return binary;
    }
    if (readBinary) {
      return readBinary(wasmBinaryFile);
    } else {
      throw "both async and sync fetching of the wasm failed";
    }
  }
  catch (err) {
    abort(err);
  }
}

function getBinaryPromise() {
  // if we don't have the binary yet, and have the Fetch api, use that
  // in some environments, like Electron's render process, Fetch api may be present, but have a different context than expected, let's only use it on the Web
  if (!wasmBinary && (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) && typeof fetch === 'function') {
    return fetch(wasmBinaryFile, { credentials: 'same-origin' }).then(function(response) {
      if (!response['ok']) {
        throw "failed to load wasm binary file at '" + wasmBinaryFile + "'";
      }
      return response['arrayBuffer']();
    }).catch(function () {
      return getBinary();
    });
  }
  // Otherwise, getBinary should be able to get it synchronously
  return new Promise(function(resolve, reject) {
    resolve(getBinary());
  });
}



// Create the wasm instance.
// Receives the wasm imports, returns the exports.
function createWasm() {
  // prepare imports
  var info = {
    'env': asmLibraryArg,
    'wasi_snapshot_preview1': asmLibraryArg
  };
  // Load the wasm module and create an instance of using native support in the JS engine.
  // handle a generated wasm instance, receiving its exports and
  // performing other necessary setup
  function receiveInstance(instance, module) {
    var exports = instance.exports;
    Module['asm'] = exports;
    removeRunDependency('wasm-instantiate');
  }
   // we can't run yet (except in a pthread, where we have a custom sync instantiator)
  addRunDependency('wasm-instantiate');


  // Async compilation can be confusing when an error on the page overwrites Module
  // (for example, if the order of elements is wrong, and the one defining Module is
  // later), so we save Module and check it later.
  var trueModule = Module;
  function receiveInstantiatedSource(output) {
    // 'output' is a WebAssemblyInstantiatedSource object which has both the module and instance.
    // receiveInstance() will swap in the exports (to Module.asm) so they can be called
    assert(Module === trueModule, 'the Module object should not be replaced during async compilation - perhaps the order of HTML elements is wrong?');
    trueModule = null;
      // TODO: Due to Closure regression https://github.com/google/closure-compiler/issues/3193, the above line no longer optimizes out down to the following line.
      // When the regression is fixed, can restore the above USE_PTHREADS-enabled path.
    receiveInstance(output['instance']);
  }


  function instantiateArrayBuffer(receiver) {
    return getBinaryPromise().then(function(binary) {
      return WebAssembly.instantiate(binary, info);
    }).then(receiver, function(reason) {
      err('failed to asynchronously prepare wasm: ' + reason);
      abort(reason);
    });
  }

  // Prefer streaming instantiation if available.
  function instantiateAsync() {
    if (!wasmBinary &&
        typeof WebAssembly.instantiateStreaming === 'function' &&
        !isDataURI(wasmBinaryFile) &&
        typeof fetch === 'function') {
      fetch(wasmBinaryFile, { credentials: 'same-origin' }).then(function (response) {
        var result = WebAssembly.instantiateStreaming(response, info);
        return result.then(receiveInstantiatedSource, function(reason) {
            // We expect the most common failure cause to be a bad MIME type for the binary,
            // in which case falling back to ArrayBuffer instantiation should work.
            err('wasm streaming compile failed: ' + reason);
            err('falling back to ArrayBuffer instantiation');
            instantiateArrayBuffer(receiveInstantiatedSource);
          });
      });
    } else {
      return instantiateArrayBuffer(receiveInstantiatedSource);
    }
  }
  // User shell pages can write their own Module.instantiateWasm = function(imports, successCallback) callback
  // to manually instantiate the Wasm module themselves. This allows pages to run the instantiation parallel
  // to any other async startup actions they are performing.
  if (Module['instantiateWasm']) {
    try {
      var exports = Module['instantiateWasm'](info, receiveInstance);
      return exports;
    } catch(e) {
      err('Module.instantiateWasm callback failed with error: ' + e);
      return false;
    }
  }

  instantiateAsync();
  return {}; // no exports yet; we'll fill them in later
}


// Globals used by JS i64 conversions
var tempDouble;
var tempI64;

// === Body ===

var ASM_CONSTS = {
  
};




// STATICTOP = STATIC_BASE + 3408;
/* global initializers */  __ATINIT__.push({ func: function() { ___wasm_call_ctors() } });




/* no memory initializer */
// {{PRE_LIBRARY}}


  function demangle(func) {
      warnOnce('warning: build with  -s DEMANGLE_SUPPORT=1  to link in libcxxabi demangling');
      return func;
    }

  function demangleAll(text) {
      var regex =
        /\b_Z[\w\d_]+/g;
      return text.replace(regex,
        function(x) {
          var y = demangle(x);
          return x === y ? x : (y + ' [' + x + ']');
        });
    }

  function jsStackTrace() {
      var err = new Error();
      if (!err.stack) {
        // IE10+ special cases: It does have callstack info, but it is only populated if an Error object is thrown,
        // so try that as a special-case.
        try {
          throw new Error(0);
        } catch(e) {
          err = e;
        }
        if (!err.stack) {
          return '(no stack trace available)';
        }
      }
      return err.stack.toString();
    }

  function stackTrace() {
      var js = jsStackTrace();
      if (Module['extraStackTrace']) js += '\n' + Module['extraStackTrace']();
      return demangleAll(js);
    }

  function ___cxa_allocate_exception(size) {
      return _malloc(size);
    }

  
  var ___exception_infos={};
  
  var ___exception_last=0;
  
  function __ZSt18uncaught_exceptionv() { // std::uncaught_exception()
      return __ZSt18uncaught_exceptionv.uncaught_exceptions > 0;
    }function ___cxa_throw(ptr, type, destructor) {
      ___exception_infos[ptr] = {
        ptr: ptr,
        adjusted: [ptr],
        type: type,
        destructor: destructor,
        refcount: 0,
        caught: false,
        rethrown: false
      };
      ___exception_last = ptr;
      if (!("uncaught_exception" in __ZSt18uncaught_exceptionv)) {
        __ZSt18uncaught_exceptionv.uncaught_exceptions = 1;
      } else {
        __ZSt18uncaught_exceptionv.uncaught_exceptions++;
      }
      throw ptr + " - Exception catching is disabled, this exception cannot be caught. Compile with -s DISABLE_EXCEPTION_CATCHING=0 or DISABLE_EXCEPTION_CATCHING=2 to catch.";
    }

  function ___handle_stack_overflow() {
      abort('stack overflow')
    }

  function ___lock() {}

  function ___unlock() {}

  function _emscripten_get_heap_size() {
      return HEAP8.length;
    }

  function _emscripten_get_sbrk_ptr() {
      return 4272;
    }

  function _emscripten_memcpy_big(dest, src, num) {
      HEAPU8.set(HEAPU8.subarray(src, src+num), dest);
    }

  
  function abortOnCannotGrowMemory(requestedSize) {
      abort('Cannot enlarge memory arrays to size ' + requestedSize + ' bytes (OOM). Either (1) compile with  -s TOTAL_MEMORY=X  with X higher than the current value ' + HEAP8.length + ', (2) compile with  -s ALLOW_MEMORY_GROWTH=1  which allows increasing the size at runtime, or (3) if you want malloc to return NULL (0) instead of this abort, compile with  -s ABORTING_MALLOC=0 ');
    }function _emscripten_resize_heap(requestedSize) {
      abortOnCannotGrowMemory(requestedSize);
    }

  
  function flush_NO_FILESYSTEM() {
      // flush anything remaining in the buffers during shutdown
      var fflush = Module["_fflush"];
      if (fflush) fflush(0);
      var buffers = SYSCALLS.buffers;
      if (buffers[1].length) SYSCALLS.printChar(1, 10);
      if (buffers[2].length) SYSCALLS.printChar(2, 10);
    }
  
  
  var PATH={splitPath:function(filename) {
        var splitPathRe = /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
        return splitPathRe.exec(filename).slice(1);
      },normalizeArray:function(parts, allowAboveRoot) {
        // if the path tries to go above the root, `up` ends up > 0
        var up = 0;
        for (var i = parts.length - 1; i >= 0; i--) {
          var last = parts[i];
          if (last === '.') {
            parts.splice(i, 1);
          } else if (last === '..') {
            parts.splice(i, 1);
            up++;
          } else if (up) {
            parts.splice(i, 1);
            up--;
          }
        }
        // if the path is allowed to go above the root, restore leading ..s
        if (allowAboveRoot) {
          for (; up; up--) {
            parts.unshift('..');
          }
        }
        return parts;
      },normalize:function(path) {
        var isAbsolute = path.charAt(0) === '/',
            trailingSlash = path.substr(-1) === '/';
        // Normalize the path
        path = PATH.normalizeArray(path.split('/').filter(function(p) {
          return !!p;
        }), !isAbsolute).join('/');
        if (!path && !isAbsolute) {
          path = '.';
        }
        if (path && trailingSlash) {
          path += '/';
        }
        return (isAbsolute ? '/' : '') + path;
      },dirname:function(path) {
        var result = PATH.splitPath(path),
            root = result[0],
            dir = result[1];
        if (!root && !dir) {
          // No dirname whatsoever
          return '.';
        }
        if (dir) {
          // It has a dirname, strip trailing slash
          dir = dir.substr(0, dir.length - 1);
        }
        return root + dir;
      },basename:function(path) {
        // EMSCRIPTEN return '/'' for '/', not an empty string
        if (path === '/') return '/';
        var lastSlash = path.lastIndexOf('/');
        if (lastSlash === -1) return path;
        return path.substr(lastSlash+1);
      },extname:function(path) {
        return PATH.splitPath(path)[3];
      },join:function() {
        var paths = Array.prototype.slice.call(arguments, 0);
        return PATH.normalize(paths.join('/'));
      },join2:function(l, r) {
        return PATH.normalize(l + '/' + r);
      }};var SYSCALLS={buffers:[null,[],[]],printChar:function(stream, curr) {
        var buffer = SYSCALLS.buffers[stream];
        assert(buffer);
        if (curr === 0 || curr === 10) {
          (stream === 1 ? out : err)(UTF8ArrayToString(buffer, 0));
          buffer.length = 0;
        } else {
          buffer.push(curr);
        }
      },varargs:0,get:function(varargs) {
        SYSCALLS.varargs += 4;
        var ret = HEAP32[(((SYSCALLS.varargs)-(4))>>2)];
        return ret;
      },getStr:function() {
        var ret = UTF8ToString(SYSCALLS.get());
        return ret;
      },get64:function() {
        var low = SYSCALLS.get(), high = SYSCALLS.get();
        if (low >= 0) assert(high === 0);
        else assert(high === -1);
        return low;
      },getZero:function() {
        assert(SYSCALLS.get() === 0);
      }};function _fd_write(fd, iov, iovcnt, pnum) {try {
  
      // hack to support printf in SYSCALLS_REQUIRE_FILESYSTEM=0
      var num = 0;
      for (var i = 0; i < iovcnt; i++) {
        var ptr = HEAP32[(((iov)+(i*8))>>2)];
        var len = HEAP32[(((iov)+(i*8 + 4))>>2)];
        for (var j = 0; j < len; j++) {
          SYSCALLS.printChar(fd, HEAPU8[ptr+j]);
        }
        num += len;
      }
      HEAP32[((pnum)>>2)]=num
      return 0;
    } catch (e) {
    if (typeof FS === 'undefined' || !(e instanceof FS.ErrnoError)) abort(e);
    return e.errno;
  }
  }

  
  function _memcpy(dest, src, num) {
      dest = dest|0; src = src|0; num = num|0;
      var ret = 0;
      var aligned_dest_end = 0;
      var block_aligned_dest_end = 0;
      var dest_end = 0;
      // Test against a benchmarked cutoff limit for when HEAPU8.set() becomes faster to use.
      if ((num|0) >= 8192) {
        _emscripten_memcpy_big(dest|0, src|0, num|0)|0;
        return dest|0;
      }
  
      ret = dest|0;
      dest_end = (dest + num)|0;
      if ((dest&3) == (src&3)) {
        // The initial unaligned < 4-byte front.
        while (dest & 3) {
          if ((num|0) == 0) return ret|0;
          HEAP8[((dest)>>0)]=((HEAP8[((src)>>0)])|0);
          dest = (dest+1)|0;
          src = (src+1)|0;
          num = (num-1)|0;
        }
        aligned_dest_end = (dest_end & -4)|0;
        block_aligned_dest_end = (aligned_dest_end - 64)|0;
        while ((dest|0) <= (block_aligned_dest_end|0) ) {
          HEAP32[((dest)>>2)]=((HEAP32[((src)>>2)])|0);
          HEAP32[(((dest)+(4))>>2)]=((HEAP32[(((src)+(4))>>2)])|0);
          HEAP32[(((dest)+(8))>>2)]=((HEAP32[(((src)+(8))>>2)])|0);
          HEAP32[(((dest)+(12))>>2)]=((HEAP32[(((src)+(12))>>2)])|0);
          HEAP32[(((dest)+(16))>>2)]=((HEAP32[(((src)+(16))>>2)])|0);
          HEAP32[(((dest)+(20))>>2)]=((HEAP32[(((src)+(20))>>2)])|0);
          HEAP32[(((dest)+(24))>>2)]=((HEAP32[(((src)+(24))>>2)])|0);
          HEAP32[(((dest)+(28))>>2)]=((HEAP32[(((src)+(28))>>2)])|0);
          HEAP32[(((dest)+(32))>>2)]=((HEAP32[(((src)+(32))>>2)])|0);
          HEAP32[(((dest)+(36))>>2)]=((HEAP32[(((src)+(36))>>2)])|0);
          HEAP32[(((dest)+(40))>>2)]=((HEAP32[(((src)+(40))>>2)])|0);
          HEAP32[(((dest)+(44))>>2)]=((HEAP32[(((src)+(44))>>2)])|0);
          HEAP32[(((dest)+(48))>>2)]=((HEAP32[(((src)+(48))>>2)])|0);
          HEAP32[(((dest)+(52))>>2)]=((HEAP32[(((src)+(52))>>2)])|0);
          HEAP32[(((dest)+(56))>>2)]=((HEAP32[(((src)+(56))>>2)])|0);
          HEAP32[(((dest)+(60))>>2)]=((HEAP32[(((src)+(60))>>2)])|0);
          dest = (dest+64)|0;
          src = (src+64)|0;
        }
        while ((dest|0) < (aligned_dest_end|0) ) {
          HEAP32[((dest)>>2)]=((HEAP32[((src)>>2)])|0);
          dest = (dest+4)|0;
          src = (src+4)|0;
        }
      } else {
        // In the unaligned copy case, unroll a bit as well.
        aligned_dest_end = (dest_end - 4)|0;
        while ((dest|0) < (aligned_dest_end|0) ) {
          HEAP8[((dest)>>0)]=((HEAP8[((src)>>0)])|0);
          HEAP8[(((dest)+(1))>>0)]=((HEAP8[(((src)+(1))>>0)])|0);
          HEAP8[(((dest)+(2))>>0)]=((HEAP8[(((src)+(2))>>0)])|0);
          HEAP8[(((dest)+(3))>>0)]=((HEAP8[(((src)+(3))>>0)])|0);
          dest = (dest+4)|0;
          src = (src+4)|0;
        }
      }
      // The remaining unaligned < 4 byte tail.
      while ((dest|0) < (dest_end|0)) {
        HEAP8[((dest)>>0)]=((HEAP8[((src)>>0)])|0);
        dest = (dest+1)|0;
        src = (src+1)|0;
      }
      return ret|0;
    }

  function _memset(ptr, value, num) {
      ptr = ptr|0; value = value|0; num = num|0;
      var end = 0, aligned_end = 0, block_aligned_end = 0, value4 = 0;
      end = (ptr + num)|0;
  
      value = value & 0xff;
      if ((num|0) >= 67 /* 64 bytes for an unrolled loop + 3 bytes for unaligned head*/) {
        while ((ptr&3) != 0) {
          HEAP8[((ptr)>>0)]=value;
          ptr = (ptr+1)|0;
        }
  
        aligned_end = (end & -4)|0;
        value4 = value | (value << 8) | (value << 16) | (value << 24);
  
        block_aligned_end = (aligned_end - 64)|0;
  
        while((ptr|0) <= (block_aligned_end|0)) {
          HEAP32[((ptr)>>2)]=value4;
          HEAP32[(((ptr)+(4))>>2)]=value4;
          HEAP32[(((ptr)+(8))>>2)]=value4;
          HEAP32[(((ptr)+(12))>>2)]=value4;
          HEAP32[(((ptr)+(16))>>2)]=value4;
          HEAP32[(((ptr)+(20))>>2)]=value4;
          HEAP32[(((ptr)+(24))>>2)]=value4;
          HEAP32[(((ptr)+(28))>>2)]=value4;
          HEAP32[(((ptr)+(32))>>2)]=value4;
          HEAP32[(((ptr)+(36))>>2)]=value4;
          HEAP32[(((ptr)+(40))>>2)]=value4;
          HEAP32[(((ptr)+(44))>>2)]=value4;
          HEAP32[(((ptr)+(48))>>2)]=value4;
          HEAP32[(((ptr)+(52))>>2)]=value4;
          HEAP32[(((ptr)+(56))>>2)]=value4;
          HEAP32[(((ptr)+(60))>>2)]=value4;
          ptr = (ptr + 64)|0;
        }
  
        while ((ptr|0) < (aligned_end|0) ) {
          HEAP32[((ptr)>>2)]=value4;
          ptr = (ptr+4)|0;
        }
      }
      // The remaining bytes.
      while ((ptr|0) < (end|0)) {
        HEAP8[((ptr)>>0)]=value;
        ptr = (ptr+1)|0;
      }
      return (end-num)|0;
    }

  function _setTempRet0($i) {
      setTempRet0(($i) | 0);
    }
var ASSERTIONS = true;

// Copyright 2017 The Emscripten Authors.  All rights reserved.
// Emscripten is available under two separate licenses, the MIT license and the
// University of Illinois/NCSA Open Source License.  Both these licenses can be
// found in the LICENSE file.

/** @type {function(string, boolean=, number=)} */
function intArrayFromString(stringy, dontAddNull, length) {
  var len = length > 0 ? length : lengthBytesUTF8(stringy)+1;
  var u8array = new Array(len);
  var numBytesWritten = stringToUTF8Array(stringy, u8array, 0, u8array.length);
  if (dontAddNull) u8array.length = numBytesWritten;
  return u8array;
}

function intArrayToString(array) {
  var ret = [];
  for (var i = 0; i < array.length; i++) {
    var chr = array[i];
    if (chr > 0xFF) {
      if (ASSERTIONS) {
        assert(false, 'Character code ' + chr + ' (' + String.fromCharCode(chr) + ')  at offset ' + i + ' not in 0x00-0xFF.');
      }
      chr &= 0xFF;
    }
    ret.push(String.fromCharCode(chr));
  }
  return ret.join('');
}


// Copied from https://github.com/strophe/strophejs/blob/e06d027/src/polyfills.js#L149

// This code was written by Tyler Akins and has been placed in the
// public domain.  It would be nice if you left this header intact.
// Base64 code from Tyler Akins -- http://rumkin.com

/**
 * Decodes a base64 string.
 * @param {String} input The string to decode.
 */
var decodeBase64 = typeof atob === 'function' ? atob : function (input) {
  var keyStr = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

  var output = '';
  var chr1, chr2, chr3;
  var enc1, enc2, enc3, enc4;
  var i = 0;
  // remove all characters that are not A-Z, a-z, 0-9, +, /, or =
  input = input.replace(/[^A-Za-z0-9\+\/\=]/g, '');
  do {
    enc1 = keyStr.indexOf(input.charAt(i++));
    enc2 = keyStr.indexOf(input.charAt(i++));
    enc3 = keyStr.indexOf(input.charAt(i++));
    enc4 = keyStr.indexOf(input.charAt(i++));

    chr1 = (enc1 << 2) | (enc2 >> 4);
    chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
    chr3 = ((enc3 & 3) << 6) | enc4;

    output = output + String.fromCharCode(chr1);

    if (enc3 !== 64) {
      output = output + String.fromCharCode(chr2);
    }
    if (enc4 !== 64) {
      output = output + String.fromCharCode(chr3);
    }
  } while (i < input.length);
  return output;
};

// Converts a string of base64 into a byte array.
// Throws error on invalid input.
function intArrayFromBase64(s) {
  if (typeof ENVIRONMENT_IS_NODE === 'boolean' && ENVIRONMENT_IS_NODE) {
    var buf;
    try {
      buf = Buffer.from(s, 'base64');
    } catch (_) {
      buf = new Buffer(s, 'base64');
    }
    return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
  }

  try {
    var decoded = decodeBase64(s);
    var bytes = new Uint8Array(decoded.length);
    for (var i = 0 ; i < decoded.length ; ++i) {
      bytes[i] = decoded.charCodeAt(i);
    }
    return bytes;
  } catch (_) {
    throw new Error('Converting base64 string to bytes failed.');
  }
}

// If filename is a base64 data URI, parses and returns data (Buffer on node,
// Uint8Array otherwise). If filename is not a base64 data URI, returns undefined.
function tryParseAsDataURI(filename) {
  if (!isDataURI(filename)) {
    return;
  }

  return intArrayFromBase64(filename.slice(dataURIPrefix.length));
}


// ASM_LIBRARY EXTERN PRIMITIVES: Int8Array,Int32Array

var asmGlobalArg = {};
var asmLibraryArg = { "__cxa_allocate_exception": ___cxa_allocate_exception, "__cxa_throw": ___cxa_throw, "__handle_stack_overflow": ___handle_stack_overflow, "__lock": ___lock, "__unlock": ___unlock, "emscripten_get_sbrk_ptr": _emscripten_get_sbrk_ptr, "emscripten_memcpy_big": _emscripten_memcpy_big, "emscripten_resize_heap": _emscripten_resize_heap, "fd_write": _fd_write, "getTempRet0": getTempRet0, "memory": wasmMemory, "setTempRet0": setTempRet0, "table": wasmTable };
var asm = createWasm();
var real____wasm_call_ctors = asm["__wasm_call_ctors"];
asm["__wasm_call_ctors"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real____wasm_call_ctors.apply(null, arguments);
};

var real__main = asm["main"];
asm["main"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real__main.apply(null, arguments);
};

var real____errno_location = asm["__errno_location"];
asm["__errno_location"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real____errno_location.apply(null, arguments);
};

var real__fflush = asm["fflush"];
asm["fflush"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real__fflush.apply(null, arguments);
};

var real__setThrew = asm["setThrew"];
asm["setThrew"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real__setThrew.apply(null, arguments);
};

var real__malloc = asm["malloc"];
asm["malloc"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real__malloc.apply(null, arguments);
};

var real__free = asm["free"];
asm["free"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real__free.apply(null, arguments);
};

var real____set_stack_limit = asm["__set_stack_limit"];
asm["__set_stack_limit"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real____set_stack_limit.apply(null, arguments);
};

var real_stackSave = asm["stackSave"];
asm["stackSave"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real_stackSave.apply(null, arguments);
};

var real_stackAlloc = asm["stackAlloc"];
asm["stackAlloc"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real_stackAlloc.apply(null, arguments);
};

var real_stackRestore = asm["stackRestore"];
asm["stackRestore"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real_stackRestore.apply(null, arguments);
};

var real___growWasmMemory = asm["__growWasmMemory"];
asm["__growWasmMemory"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real___growWasmMemory.apply(null, arguments);
};

var real_dynCall_ii = asm["dynCall_ii"];
asm["dynCall_ii"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real_dynCall_ii.apply(null, arguments);
};

var real_dynCall_iiii = asm["dynCall_iiii"];
asm["dynCall_iiii"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real_dynCall_iiii.apply(null, arguments);
};

var real_dynCall_jiji = asm["dynCall_jiji"];
asm["dynCall_jiji"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real_dynCall_jiji.apply(null, arguments);
};

var real_dynCall_iidiiii = asm["dynCall_iidiiii"];
asm["dynCall_iidiiii"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real_dynCall_iidiiii.apply(null, arguments);
};

var real_dynCall_vii = asm["dynCall_vii"];
asm["dynCall_vii"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real_dynCall_vii.apply(null, arguments);
};

var real_dynCall_vi = asm["dynCall_vi"];
asm["dynCall_vi"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real_dynCall_vi.apply(null, arguments);
};

var real_dynCall_viiiiii = asm["dynCall_viiiiii"];
asm["dynCall_viiiiii"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real_dynCall_viiiiii.apply(null, arguments);
};

var real_dynCall_viiiii = asm["dynCall_viiiii"];
asm["dynCall_viiiii"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real_dynCall_viiiii.apply(null, arguments);
};

var real_dynCall_viiii = asm["dynCall_viiii"];
asm["dynCall_viiii"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real_dynCall_viiii.apply(null, arguments);
};

Module["asm"] = asm;
var ___wasm_call_ctors = Module["___wasm_call_ctors"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["__wasm_call_ctors"].apply(null, arguments)
};

var _main = Module["_main"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["main"].apply(null, arguments)
};

var ___errno_location = Module["___errno_location"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["__errno_location"].apply(null, arguments)
};

var _fflush = Module["_fflush"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["fflush"].apply(null, arguments)
};

var _setThrew = Module["_setThrew"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["setThrew"].apply(null, arguments)
};

var _malloc = Module["_malloc"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["malloc"].apply(null, arguments)
};

var _free = Module["_free"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["free"].apply(null, arguments)
};

var ___set_stack_limit = Module["___set_stack_limit"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["__set_stack_limit"].apply(null, arguments)
};

var stackSave = Module["stackSave"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["stackSave"].apply(null, arguments)
};

var stackAlloc = Module["stackAlloc"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["stackAlloc"].apply(null, arguments)
};

var stackRestore = Module["stackRestore"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["stackRestore"].apply(null, arguments)
};

var __growWasmMemory = Module["__growWasmMemory"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["__growWasmMemory"].apply(null, arguments)
};

var dynCall_ii = Module["dynCall_ii"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["dynCall_ii"].apply(null, arguments)
};

var dynCall_iiii = Module["dynCall_iiii"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["dynCall_iiii"].apply(null, arguments)
};

var dynCall_jiji = Module["dynCall_jiji"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["dynCall_jiji"].apply(null, arguments)
};

var dynCall_iidiiii = Module["dynCall_iidiiii"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["dynCall_iidiiii"].apply(null, arguments)
};

var dynCall_vii = Module["dynCall_vii"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["dynCall_vii"].apply(null, arguments)
};

var dynCall_vi = Module["dynCall_vi"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["dynCall_vi"].apply(null, arguments)
};

var dynCall_viiiiii = Module["dynCall_viiiiii"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["dynCall_viiiiii"].apply(null, arguments)
};

var dynCall_viiiii = Module["dynCall_viiiii"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["dynCall_viiiii"].apply(null, arguments)
};

var dynCall_viiii = Module["dynCall_viiii"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["dynCall_viiii"].apply(null, arguments)
};




// === Auto-generated postamble setup entry stuff ===

Module['asm'] = asm;

if (!Object.getOwnPropertyDescriptor(Module, "intArrayFromString")) Module["intArrayFromString"] = function() { abort("'intArrayFromString' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Object.getOwnPropertyDescriptor(Module, "intArrayToString")) Module["intArrayToString"] = function() { abort("'intArrayToString' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Object.getOwnPropertyDescriptor(Module, "ccall")) Module["ccall"] = function() { abort("'ccall' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Object.getOwnPropertyDescriptor(Module, "cwrap")) Module["cwrap"] = function() { abort("'cwrap' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Object.getOwnPropertyDescriptor(Module, "setValue")) Module["setValue"] = function() { abort("'setValue' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Object.getOwnPropertyDescriptor(Module, "getValue")) Module["getValue"] = function() { abort("'getValue' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Object.getOwnPropertyDescriptor(Module, "allocate")) Module["allocate"] = function() { abort("'allocate' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Object.getOwnPropertyDescriptor(Module, "getMemory")) Module["getMemory"] = function() { abort("'getMemory' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ). Alternatively, forcing filesystem support (-s FORCE_FILESYSTEM=1) can export this for you") };
if (!Object.getOwnPropertyDescriptor(Module, "AsciiToString")) Module["AsciiToString"] = function() { abort("'AsciiToString' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Object.getOwnPropertyDescriptor(Module, "stringToAscii")) Module["stringToAscii"] = function() { abort("'stringToAscii' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Object.getOwnPropertyDescriptor(Module, "UTF8ArrayToString")) Module["UTF8ArrayToString"] = function() { abort("'UTF8ArrayToString' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Object.getOwnPropertyDescriptor(Module, "UTF8ToString")) Module["UTF8ToString"] = function() { abort("'UTF8ToString' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Object.getOwnPropertyDescriptor(Module, "stringToUTF8Array")) Module["stringToUTF8Array"] = function() { abort("'stringToUTF8Array' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Object.getOwnPropertyDescriptor(Module, "stringToUTF8")) Module["stringToUTF8"] = function() { abort("'stringToUTF8' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Object.getOwnPropertyDescriptor(Module, "lengthBytesUTF8")) Module["lengthBytesUTF8"] = function() { abort("'lengthBytesUTF8' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Object.getOwnPropertyDescriptor(Module, "UTF16ToString")) Module["UTF16ToString"] = function() { abort("'UTF16ToString' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Object.getOwnPropertyDescriptor(Module, "stringToUTF16")) Module["stringToUTF16"] = function() { abort("'stringToUTF16' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Object.getOwnPropertyDescriptor(Module, "lengthBytesUTF16")) Module["lengthBytesUTF16"] = function() { abort("'lengthBytesUTF16' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Object.getOwnPropertyDescriptor(Module, "UTF32ToString")) Module["UTF32ToString"] = function() { abort("'UTF32ToString' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Object.getOwnPropertyDescriptor(Module, "stringToUTF32")) Module["stringToUTF32"] = function() { abort("'stringToUTF32' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Object.getOwnPropertyDescriptor(Module, "lengthBytesUTF32")) Module["lengthBytesUTF32"] = function() { abort("'lengthBytesUTF32' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Object.getOwnPropertyDescriptor(Module, "allocateUTF8")) Module["allocateUTF8"] = function() { abort("'allocateUTF8' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Object.getOwnPropertyDescriptor(Module, "stackTrace")) Module["stackTrace"] = function() { abort("'stackTrace' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Object.getOwnPropertyDescriptor(Module, "addOnPreRun")) Module["addOnPreRun"] = function() { abort("'addOnPreRun' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Object.getOwnPropertyDescriptor(Module, "addOnInit")) Module["addOnInit"] = function() { abort("'addOnInit' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Object.getOwnPropertyDescriptor(Module, "addOnPreMain")) Module["addOnPreMain"] = function() { abort("'addOnPreMain' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Object.getOwnPropertyDescriptor(Module, "addOnExit")) Module["addOnExit"] = function() { abort("'addOnExit' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Object.getOwnPropertyDescriptor(Module, "addOnPostRun")) Module["addOnPostRun"] = function() { abort("'addOnPostRun' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Object.getOwnPropertyDescriptor(Module, "writeStringToMemory")) Module["writeStringToMemory"] = function() { abort("'writeStringToMemory' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Object.getOwnPropertyDescriptor(Module, "writeArrayToMemory")) Module["writeArrayToMemory"] = function() { abort("'writeArrayToMemory' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Object.getOwnPropertyDescriptor(Module, "writeAsciiToMemory")) Module["writeAsciiToMemory"] = function() { abort("'writeAsciiToMemory' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Object.getOwnPropertyDescriptor(Module, "addRunDependency")) Module["addRunDependency"] = function() { abort("'addRunDependency' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ). Alternatively, forcing filesystem support (-s FORCE_FILESYSTEM=1) can export this for you") };
if (!Object.getOwnPropertyDescriptor(Module, "removeRunDependency")) Module["removeRunDependency"] = function() { abort("'removeRunDependency' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ). Alternatively, forcing filesystem support (-s FORCE_FILESYSTEM=1) can export this for you") };
if (!Object.getOwnPropertyDescriptor(Module, "ENV")) Module["ENV"] = function() { abort("'ENV' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Object.getOwnPropertyDescriptor(Module, "FS")) Module["FS"] = function() { abort("'FS' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Object.getOwnPropertyDescriptor(Module, "FS_createFolder")) Module["FS_createFolder"] = function() { abort("'FS_createFolder' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ). Alternatively, forcing filesystem support (-s FORCE_FILESYSTEM=1) can export this for you") };
if (!Object.getOwnPropertyDescriptor(Module, "FS_createPath")) Module["FS_createPath"] = function() { abort("'FS_createPath' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ). Alternatively, forcing filesystem support (-s FORCE_FILESYSTEM=1) can export this for you") };
if (!Object.getOwnPropertyDescriptor(Module, "FS_createDataFile")) Module["FS_createDataFile"] = function() { abort("'FS_createDataFile' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ). Alternatively, forcing filesystem support (-s FORCE_FILESYSTEM=1) can export this for you") };
if (!Object.getOwnPropertyDescriptor(Module, "FS_createPreloadedFile")) Module["FS_createPreloadedFile"] = function() { abort("'FS_createPreloadedFile' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ). Alternatively, forcing filesystem support (-s FORCE_FILESYSTEM=1) can export this for you") };
if (!Object.getOwnPropertyDescriptor(Module, "FS_createLazyFile")) Module["FS_createLazyFile"] = function() { abort("'FS_createLazyFile' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ). Alternatively, forcing filesystem support (-s FORCE_FILESYSTEM=1) can export this for you") };
if (!Object.getOwnPropertyDescriptor(Module, "FS_createLink")) Module["FS_createLink"] = function() { abort("'FS_createLink' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ). Alternatively, forcing filesystem support (-s FORCE_FILESYSTEM=1) can export this for you") };
if (!Object.getOwnPropertyDescriptor(Module, "FS_createDevice")) Module["FS_createDevice"] = function() { abort("'FS_createDevice' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ). Alternatively, forcing filesystem support (-s FORCE_FILESYSTEM=1) can export this for you") };
if (!Object.getOwnPropertyDescriptor(Module, "FS_unlink")) Module["FS_unlink"] = function() { abort("'FS_unlink' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ). Alternatively, forcing filesystem support (-s FORCE_FILESYSTEM=1) can export this for you") };
if (!Object.getOwnPropertyDescriptor(Module, "GL")) Module["GL"] = function() { abort("'GL' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Object.getOwnPropertyDescriptor(Module, "dynamicAlloc")) Module["dynamicAlloc"] = function() { abort("'dynamicAlloc' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Object.getOwnPropertyDescriptor(Module, "loadDynamicLibrary")) Module["loadDynamicLibrary"] = function() { abort("'loadDynamicLibrary' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Object.getOwnPropertyDescriptor(Module, "loadWebAssemblyModule")) Module["loadWebAssemblyModule"] = function() { abort("'loadWebAssemblyModule' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Object.getOwnPropertyDescriptor(Module, "getLEB")) Module["getLEB"] = function() { abort("'getLEB' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Object.getOwnPropertyDescriptor(Module, "getFunctionTables")) Module["getFunctionTables"] = function() { abort("'getFunctionTables' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Object.getOwnPropertyDescriptor(Module, "alignFunctionTables")) Module["alignFunctionTables"] = function() { abort("'alignFunctionTables' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Object.getOwnPropertyDescriptor(Module, "registerFunctions")) Module["registerFunctions"] = function() { abort("'registerFunctions' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Object.getOwnPropertyDescriptor(Module, "addFunction")) Module["addFunction"] = function() { abort("'addFunction' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Object.getOwnPropertyDescriptor(Module, "removeFunction")) Module["removeFunction"] = function() { abort("'removeFunction' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Object.getOwnPropertyDescriptor(Module, "getFuncWrapper")) Module["getFuncWrapper"] = function() { abort("'getFuncWrapper' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Object.getOwnPropertyDescriptor(Module, "prettyPrint")) Module["prettyPrint"] = function() { abort("'prettyPrint' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Object.getOwnPropertyDescriptor(Module, "makeBigInt")) Module["makeBigInt"] = function() { abort("'makeBigInt' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Object.getOwnPropertyDescriptor(Module, "dynCall")) Module["dynCall"] = function() { abort("'dynCall' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Object.getOwnPropertyDescriptor(Module, "getCompilerSetting")) Module["getCompilerSetting"] = function() { abort("'getCompilerSetting' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Object.getOwnPropertyDescriptor(Module, "print")) Module["print"] = function() { abort("'print' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Object.getOwnPropertyDescriptor(Module, "printErr")) Module["printErr"] = function() { abort("'printErr' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Object.getOwnPropertyDescriptor(Module, "getTempRet0")) Module["getTempRet0"] = function() { abort("'getTempRet0' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Object.getOwnPropertyDescriptor(Module, "setTempRet0")) Module["setTempRet0"] = function() { abort("'setTempRet0' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Object.getOwnPropertyDescriptor(Module, "callMain")) Module["callMain"] = function() { abort("'callMain' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Object.getOwnPropertyDescriptor(Module, "abort")) Module["abort"] = function() { abort("'abort' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Object.getOwnPropertyDescriptor(Module, "warnOnce")) Module["warnOnce"] = function() { abort("'warnOnce' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Object.getOwnPropertyDescriptor(Module, "stackSave")) Module["stackSave"] = function() { abort("'stackSave' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Object.getOwnPropertyDescriptor(Module, "stackRestore")) Module["stackRestore"] = function() { abort("'stackRestore' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Object.getOwnPropertyDescriptor(Module, "stackAlloc")) Module["stackAlloc"] = function() { abort("'stackAlloc' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
Module["writeStackCookie"] = writeStackCookie;
Module["checkStackCookie"] = checkStackCookie;
Module["abortStackOverflow"] = abortStackOverflow;
if (!Object.getOwnPropertyDescriptor(Module, "intArrayFromBase64")) Module["intArrayFromBase64"] = function() { abort("'intArrayFromBase64' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Object.getOwnPropertyDescriptor(Module, "tryParseAsDataURI")) Module["tryParseAsDataURI"] = function() { abort("'tryParseAsDataURI' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };if (!Object.getOwnPropertyDescriptor(Module, "ALLOC_NORMAL")) Object.defineProperty(Module, "ALLOC_NORMAL", { configurable: true, get: function() { abort("'ALLOC_NORMAL' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") } });
if (!Object.getOwnPropertyDescriptor(Module, "ALLOC_STACK")) Object.defineProperty(Module, "ALLOC_STACK", { configurable: true, get: function() { abort("'ALLOC_STACK' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") } });
if (!Object.getOwnPropertyDescriptor(Module, "ALLOC_DYNAMIC")) Object.defineProperty(Module, "ALLOC_DYNAMIC", { configurable: true, get: function() { abort("'ALLOC_DYNAMIC' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") } });
if (!Object.getOwnPropertyDescriptor(Module, "ALLOC_NONE")) Object.defineProperty(Module, "ALLOC_NONE", { configurable: true, get: function() { abort("'ALLOC_NONE' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") } });
if (!Object.getOwnPropertyDescriptor(Module, "calledRun")) Object.defineProperty(Module, "calledRun", { configurable: true, get: function() { abort("'calledRun' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ). Alternatively, forcing filesystem support (-s FORCE_FILESYSTEM=1) can export this for you") } });



var calledRun;


/**
 * @constructor
 * @this {ExitStatus}
 */
function ExitStatus(status) {
  this.name = "ExitStatus";
  this.message = "Program terminated with exit(" + status + ")";
  this.status = status;
}

var calledMain = false;


dependenciesFulfilled = function runCaller() {
  // If run has never been called, and we should call run (INVOKE_RUN is true, and Module.noInitialRun is not false)
  if (!calledRun) run();
  if (!calledRun) dependenciesFulfilled = runCaller; // try this again later, after new deps are fulfilled
};

function callMain(args) {
  assert(runDependencies == 0, 'cannot call main when async dependencies remain! (listen on Module["onRuntimeInitialized"])');
  assert(__ATPRERUN__.length == 0, 'cannot call main when preRun functions remain to be called');

  var entryFunction = Module['_main'];


  args = args || [];

  var argc = args.length+1;
  var argv = stackAlloc((argc + 1) * 4);
  HEAP32[argv >> 2] = allocateUTF8OnStack(thisProgram);
  for (var i = 1; i < argc; i++) {
    HEAP32[(argv >> 2) + i] = allocateUTF8OnStack(args[i - 1]);
  }
  HEAP32[(argv >> 2) + argc] = 0;


  try {

    Module['___set_stack_limit'](STACK_MAX);

    var ret = entryFunction(argc, argv);


    // In PROXY_TO_PTHREAD builds, we should never exit the runtime below, as execution is asynchronously handed
    // off to a pthread.
    // if we're not running an evented main loop, it's time to exit
      exit(ret, /* implicit = */ true);
  }
  catch(e) {
    if (e instanceof ExitStatus) {
      // exit() throws this once it's done to make sure execution
      // has been stopped completely
      return;
    } else if (e == 'unwind') {
      // running an evented main loop, don't immediately exit
      noExitRuntime = true;
      return;
    } else {
      var toLog = e;
      if (e && typeof e === 'object' && e.stack) {
        toLog = [e, e.stack];
      }
      err('exception thrown: ' + toLog);
      quit_(1, e);
    }
  } finally {
    calledMain = true;
  }
}




/** @type {function(Array=)} */
function run(args) {
  args = args || arguments_;

  if (runDependencies > 0) {
    return;
  }

  writeStackCookie();

  preRun();

  if (runDependencies > 0) return; // a preRun added a dependency, run will be called later

  function doRun() {
    // run may have just been called through dependencies being fulfilled just in this very frame,
    // or while the async setStatus time below was happening
    if (calledRun) return;
    calledRun = true;

    if (ABORT) return;

    initRuntime();

    preMain();

    if (Module['onRuntimeInitialized']) Module['onRuntimeInitialized']();

    if (shouldRunNow) callMain(args);

    postRun();
  }

  if (Module['setStatus']) {
    Module['setStatus']('Running...');
    setTimeout(function() {
      setTimeout(function() {
        Module['setStatus']('');
      }, 1);
      doRun();
    }, 1);
  } else
  {
    doRun();
  }
  checkStackCookie();
}
Module['run'] = run;

function checkUnflushedContent() {
  // Compiler settings do not allow exiting the runtime, so flushing
  // the streams is not possible. but in ASSERTIONS mode we check
  // if there was something to flush, and if so tell the user they
  // should request that the runtime be exitable.
  // Normally we would not even include flush() at all, but in ASSERTIONS
  // builds we do so just for this check, and here we see if there is any
  // content to flush, that is, we check if there would have been
  // something a non-ASSERTIONS build would have not seen.
  // How we flush the streams depends on whether we are in SYSCALLS_REQUIRE_FILESYSTEM=0
  // mode (which has its own special function for this; otherwise, all
  // the code is inside libc)
  var print = out;
  var printErr = err;
  var has = false;
  out = err = function(x) {
    has = true;
  }
  try { // it doesn't matter if it fails
    var flush = flush_NO_FILESYSTEM;
    if (flush) flush(0);
  } catch(e) {}
  out = print;
  err = printErr;
  if (has) {
    warnOnce('stdio streams had content in them that was not flushed. you should set EXIT_RUNTIME to 1 (see the FAQ), or make sure to emit a newline when you printf etc.');
    warnOnce('(this may also be due to not including full filesystem support - try building with -s FORCE_FILESYSTEM=1)');
  }
}

function exit(status, implicit) {
  checkUnflushedContent();

  // if this is just main exit-ing implicitly, and the status is 0, then we
  // don't need to do anything here and can just leave. if the status is
  // non-zero, though, then we need to report it.
  // (we may have warned about this earlier, if a situation justifies doing so)
  if (implicit && noExitRuntime && status === 0) {
    return;
  }

  if (noExitRuntime) {
    // if exit() was called, we may warn the user if the runtime isn't actually being shut down
    if (!implicit) {
      err('program exited (with status: ' + status + '), but EXIT_RUNTIME is not set, so halting execution but not exiting the runtime or preventing further async execution (build with EXIT_RUNTIME=1, if you want a true shutdown)');
    }
  } else {

    ABORT = true;
    EXITSTATUS = status;

    exitRuntime();

    if (Module['onExit']) Module['onExit'](status);
  }

  quit_(status, new ExitStatus(status));
}

if (Module['preInit']) {
  if (typeof Module['preInit'] == 'function') Module['preInit'] = [Module['preInit']];
  while (Module['preInit'].length > 0) {
    Module['preInit'].pop()();
  }
}

// shouldRunNow refers to calling main(), not run().
var shouldRunNow = true;

if (Module['noInitialRun']) shouldRunNow = false;


  noExitRuntime = true;

run();





// {{MODULE_ADDITIONS}}



