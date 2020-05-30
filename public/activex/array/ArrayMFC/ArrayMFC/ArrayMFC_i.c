

/* this ALWAYS GENERATED file contains the IIDs and CLSIDs */

/* link this file in with the server and any clients */


 /* File created by MIDL compiler version 8.01.0622 */
/* at Tue Jan 19 04:14:07 2038
 */
/* Compiler settings for ArrayMFC.idl:
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

MIDL_DEFINE_GUID(IID, LIBID_ArrayMFCLib,0x7412c5c9,0x747d,0x47ce,0xbf,0x98,0x51,0xe9,0x18,0xa4,0x77,0x79);


MIDL_DEFINE_GUID(IID, DIID__DArrayMFC,0xdc3ec1eb,0xecbd,0x4d69,0xa0,0x7c,0x59,0xf3,0xa4,0x1d,0x3e,0xcc);


MIDL_DEFINE_GUID(IID, DIID__DArrayMFCEvents,0xb1739b13,0x016e,0x47f1,0x98,0xcf,0x83,0x61,0x2d,0x1c,0x6a,0xdd);


MIDL_DEFINE_GUID(CLSID, CLSID_ArrayMFC,0xb8d52eb1,0xbb12,0x40f4,0xab,0xaa,0x31,0x39,0x62,0x9f,0xdd,0x52);

#undef MIDL_DEFINE_GUID

#ifdef __cplusplus
}
#endif



