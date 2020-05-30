

/* this ALWAYS GENERATED file contains the IIDs and CLSIDs */

/* link this file in with the server and any clients */


 /* File created by MIDL compiler version 8.01.0622 */
/* at Tue Jan 19 04:14:07 2038
 */
/* Compiler settings for NumericMFC.idl:
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

MIDL_DEFINE_GUID(IID, LIBID_NumericMFCLib,0x93e04360,0xfeb5,0x4167,0x8e,0xfc,0x5b,0xee,0x2b,0x58,0x3c,0xdc);


MIDL_DEFINE_GUID(IID, DIID__DNumericMFC,0xda81fade,0x9353,0x4b21,0xb3,0x51,0xc1,0x4d,0xd6,0x8f,0xe4,0x80);


MIDL_DEFINE_GUID(IID, DIID__DNumericMFCEvents,0x55265547,0x7b55,0x46bd,0xbc,0xff,0x07,0xe9,0xfb,0xed,0x43,0x2a);


MIDL_DEFINE_GUID(CLSID, CLSID_NumericMFC,0x963ff900,0x6d5f,0x4956,0x87,0xee,0x43,0x22,0xbf,0x91,0xeb,0x19);

#undef MIDL_DEFINE_GUID

#ifdef __cplusplus
}
#endif



