# PNaCl

### Building cpp file

When changes are made to the cpp file the command console need to include some nacl sdk variables before it can build it.
If you just open the command prompt the variable won't be there. Navigate to your cpp and makefile and run the following commands.

```
set NACL_SDK_ROOT=<path to the Pepper folder inside the nacl_sdk folder>

set TOOLCHAIN=pnacl
```

Next run the following command to compile into a .pexe.

```
make
```
