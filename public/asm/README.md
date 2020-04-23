# ASM.js

### Building cpp file

When changes are made to the cpp file the command console need to include some emscripten variables before it can build it.
If you just open the command prompt the variable won't be there. Navigate to your emscripten folder and run the following commands.

```
emsdk install latest

emsdk activate latest

emsdk_env.bat
```

Next navigate to the folder containing the cpp file and run the following command to compile into asm code.

```
emcc -O3 <name of file>.cpp -s WASM=0 -o <name of file>.js -s "EXPORTED_FUNCTIONS=['_<name of function>','_main']" -s "EXTRA_EXPORTED_RUNTIME_METHODS=['cwrap']" -s ALLOW_MEMORY_GROWTH=1
```
