

/* this ALWAYS GENERATED file contains the IIDs and CLSIDs */

/* link this file in with the server and any clients */


 /* File created by MIDL compiler version 8.01.0622 */
/* at Tue Jan 19 04:14:07 2038
 */
/* Compiler settings for FibMFC.idl:
    Oicf, W1, Zp8, env=Win32 (32b run), target_arch=X86 8.01.0622 
    protocol : dce , ms_ext, c_ext, robust
    error checks: allocation ref bounds_check enum stub_data 
    VC __declspec() decoration level: 
         __declspec(uuid()), __declspec(selectany), __declspec(novtable)
         DECLSPEC_UUID(), MIDL_INTERFACE()
*/
/* @@MIDL_FILE_HEADING(  ) */



#ifdef __cplusplus
extern "C"{
#endif 


#include <rpc.h>
#include <rpcndr.h>

#ifdef _MIDL_USE_GUIDDEF_

#ifndef INITGUID
#define INITGUID
#include <guiddef.h>
#undef INITGUID
#else
#include <guiddef.h>
#endif

#define MIDL_DEFINE_GUID(type,name,l,w1,w2,b1,b2,b3,b4,b5,b6,b7,b8) \
        DEFINE_GUID(name,l,w1,w2,b1,b2,b3,b4,b5,b6,b7,b8)

#else // !_MIDL_USE_GUIDDEF_

#ifndef __IID_DEFINED__
#define __IID_DEFINED__

typedef struct _IID
{
    unsigned long x;
    unsigned short s1;
    unsigned short s2;
    unsigned char  c[8];
} IID;

#endif // __IID_DEFINED__

#ifndef CLSID_DEFINED
#define CLSID_DEFINED
typedef IID CLSID;
#endif // CLSID_DEFINED

#define MIDL_DEFINE_GUID(type,name,l,w1,w2,b1,b2,b3,b4,b5,b6,b7,b8) \
        EXTERN_C __declspec(selectany) const type name = {l,w1,w2,{b1,b2,b3,b4,b5,b6,b7,b8}}

#endif // !_MIDL_USE_GUIDDEF_

MIDL_DEFINE_GUID(IID, LIBID_FibMFCLib,0xbff2d06b,0x899d,0x4dc5,0xa1,0x3d,0x69,0xed,0x67,0x5d,0x7c,0x45);


MIDL_DEFINE_GUID(IID, DIID__DFibMFC,0x708118d8,0x6940,0x4bce,0x8c,0x16,0x01,0x3b,0x03,0x13,0x6f,0x0e);


MIDL_DEFINE_GUID(IID, DIID__DFibMFCEvents,0x6f2efa9c,0x4d40,0x4a52,0x90,0x15,0xfa,0x2d,0xaf,0x84,0xaf,0x94);


MIDL_DEFINE_GUID(CLSID, CLSID_FibMFC,0x7fa6ff4c,0x21fa,0x4545,0x9a,0x76,0xa2,0x11,0xa9,0xd4,0x49,0x8f);

#undef MIDL_DEFINE_GUID

#ifdef __cplusplus
}
#endif



