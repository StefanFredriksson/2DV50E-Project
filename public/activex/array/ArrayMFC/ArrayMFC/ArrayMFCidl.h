

/* this ALWAYS GENERATED file contains the definitions for the interfaces */


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



/* verify that the <rpcndr.h> version is high enough to compile this file*/
#ifndef __REQUIRED_RPCNDR_H_VERSION__
#define __REQUIRED_RPCNDR_H_VERSION__ 500
#endif

#include "rpc.h"
#include "rpcndr.h"

#ifndef __RPCNDR_H_VERSION__
#error this stub requires an updated version of <rpcndr.h>
#endif /* __RPCNDR_H_VERSION__ */


#ifndef __ArrayMFCidl_h__
#define __ArrayMFCidl_h__

#if defined(_MSC_VER) && (_MSC_VER >= 1020)
#pragma once
#endif

/* Forward Declarations */ 

#ifndef ___DArrayMFC_FWD_DEFINED__
#define ___DArrayMFC_FWD_DEFINED__
typedef interface _DArrayMFC _DArrayMFC;

#endif 	/* ___DArrayMFC_FWD_DEFINED__ */


#ifndef ___DArrayMFCEvents_FWD_DEFINED__
#define ___DArrayMFCEvents_FWD_DEFINED__
typedef interface _DArrayMFCEvents _DArrayMFCEvents;

#endif 	/* ___DArrayMFCEvents_FWD_DEFINED__ */


#ifndef __ArrayMFC_FWD_DEFINED__
#define __ArrayMFC_FWD_DEFINED__

#ifdef __cplusplus
typedef class ArrayMFC ArrayMFC;
#else
typedef struct ArrayMFC ArrayMFC;
#endif /* __cplusplus */

#endif 	/* __ArrayMFC_FWD_DEFINED__ */


#ifdef __cplusplus
extern "C"{
#endif 


/* interface __MIDL_itf_ArrayMFC_0000_0000 */
/* [local] */ 

#pragma warning(push)
#pragma warning(disable:4001) 
#pragma once
#pragma warning(push)
#pragma warning(disable:4001) 
#pragma once
#pragma warning(pop)
#pragma warning(pop)
#pragma region Desktop Family
#pragma endregion


extern RPC_IF_HANDLE __MIDL_itf_ArrayMFC_0000_0000_v0_0_c_ifspec;
extern RPC_IF_HANDLE __MIDL_itf_ArrayMFC_0000_0000_v0_0_s_ifspec;


#ifndef __ArrayMFCLib_LIBRARY_DEFINED__
#define __ArrayMFCLib_LIBRARY_DEFINED__

/* library ArrayMFCLib */
/* [control][version][uuid] */ 


EXTERN_C const IID LIBID_ArrayMFCLib;

#ifndef ___DArrayMFC_DISPINTERFACE_DEFINED__
#define ___DArrayMFC_DISPINTERFACE_DEFINED__

/* dispinterface _DArrayMFC */
/* [uuid] */ 


EXTERN_C const IID DIID__DArrayMFC;

#if defined(__cplusplus) && !defined(CINTERFACE)

    MIDL_INTERFACE("dc3ec1eb-ecbd-4d69-a07c-59f3a41d3ecc")
    _DArrayMFC : public IDispatch
    {
    };
    
#else 	/* C style interface */

    typedef struct _DArrayMFCVtbl
    {
        BEGIN_INTERFACE
        
        HRESULT ( STDMETHODCALLTYPE *QueryInterface )( 
            _DArrayMFC * This,
            /* [in] */ REFIID riid,
            /* [annotation][iid_is][out] */ 
            _COM_Outptr_  void **ppvObject);
        
        ULONG ( STDMETHODCALLTYPE *AddRef )( 
            _DArrayMFC * This);
        
        ULONG ( STDMETHODCALLTYPE *Release )( 
            _DArrayMFC * This);
        
        HRESULT ( STDMETHODCALLTYPE *GetTypeInfoCount )( 
            _DArrayMFC * This,
            /* [out] */ UINT *pctinfo);
        
        HRESULT ( STDMETHODCALLTYPE *GetTypeInfo )( 
            _DArrayMFC * This,
            /* [in] */ UINT iTInfo,
            /* [in] */ LCID lcid,
            /* [out] */ ITypeInfo **ppTInfo);
        
        HRESULT ( STDMETHODCALLTYPE *GetIDsOfNames )( 
            _DArrayMFC * This,
            /* [in] */ REFIID riid,
            /* [size_is][in] */ LPOLESTR *rgszNames,
            /* [range][in] */ UINT cNames,
            /* [in] */ LCID lcid,
            /* [size_is][out] */ DISPID *rgDispId);
        
        /* [local] */ HRESULT ( STDMETHODCALLTYPE *Invoke )( 
            _DArrayMFC * This,
            /* [annotation][in] */ 
            _In_  DISPID dispIdMember,
            /* [annotation][in] */ 
            _In_  REFIID riid,
            /* [annotation][in] */ 
            _In_  LCID lcid,
            /* [annotation][in] */ 
            _In_  WORD wFlags,
            /* [annotation][out][in] */ 
            _In_  DISPPARAMS *pDispParams,
            /* [annotation][out] */ 
            _Out_opt_  VARIANT *pVarResult,
            /* [annotation][out] */ 
            _Out_opt_  EXCEPINFO *pExcepInfo,
            /* [annotation][out] */ 
            _Out_opt_  UINT *puArgErr);
        
        END_INTERFACE
    } _DArrayMFCVtbl;

    interface _DArrayMFC
    {
        CONST_VTBL struct _DArrayMFCVtbl *lpVtbl;
    };

    

#ifdef COBJMACROS


#define _DArrayMFC_QueryInterface(This,riid,ppvObject)	\
    ( (This)->lpVtbl -> QueryInterface(This,riid,ppvObject) ) 

#define _DArrayMFC_AddRef(This)	\
    ( (This)->lpVtbl -> AddRef(This) ) 

#define _DArrayMFC_Release(This)	\
    ( (This)->lpVtbl -> Release(This) ) 


#define _DArrayMFC_GetTypeInfoCount(This,pctinfo)	\
    ( (This)->lpVtbl -> GetTypeInfoCount(This,pctinfo) ) 

#define _DArrayMFC_GetTypeInfo(This,iTInfo,lcid,ppTInfo)	\
    ( (This)->lpVtbl -> GetTypeInfo(This,iTInfo,lcid,ppTInfo) ) 

#define _DArrayMFC_GetIDsOfNames(This,riid,rgszNames,cNames,lcid,rgDispId)	\
    ( (This)->lpVtbl -> GetIDsOfNames(This,riid,rgszNames,cNames,lcid,rgDispId) ) 

#define _DArrayMFC_Invoke(This,dispIdMember,riid,lcid,wFlags,pDispParams,pVarResult,pExcepInfo,puArgErr)	\
    ( (This)->lpVtbl -> Invoke(This,dispIdMember,riid,lcid,wFlags,pDispParams,pVarResult,pExcepInfo,puArgErr) ) 

#endif /* COBJMACROS */


#endif 	/* C style interface */


#endif 	/* ___DArrayMFC_DISPINTERFACE_DEFINED__ */


#ifndef ___DArrayMFCEvents_DISPINTERFACE_DEFINED__
#define ___DArrayMFCEvents_DISPINTERFACE_DEFINED__

/* dispinterface _DArrayMFCEvents */
/* [uuid] */ 


EXTERN_C const IID DIID__DArrayMFCEvents;

#if defined(__cplusplus) && !defined(CINTERFACE)

    MIDL_INTERFACE("b1739b13-016e-47f1-98cf-83612d1c6add")
    _DArrayMFCEvents : public IDispatch
    {
    };
    
#else 	/* C style interface */

    typedef struct _DArrayMFCEventsVtbl
    {
        BEGIN_INTERFACE
        
        HRESULT ( STDMETHODCALLTYPE *QueryInterface )( 
            _DArrayMFCEvents * This,
            /* [in] */ REFIID riid,
            /* [annotation][iid_is][out] */ 
            _COM_Outptr_  void **ppvObject);
        
        ULONG ( STDMETHODCALLTYPE *AddRef )( 
            _DArrayMFCEvents * This);
        
        ULONG ( STDMETHODCALLTYPE *Release )( 
            _DArrayMFCEvents * This);
        
        HRESULT ( STDMETHODCALLTYPE *GetTypeInfoCount )( 
            _DArrayMFCEvents * This,
            /* [out] */ UINT *pctinfo);
        
        HRESULT ( STDMETHODCALLTYPE *GetTypeInfo )( 
            _DArrayMFCEvents * This,
            /* [in] */ UINT iTInfo,
            /* [in] */ LCID lcid,
            /* [out] */ ITypeInfo **ppTInfo);
        
        HRESULT ( STDMETHODCALLTYPE *GetIDsOfNames )( 
            _DArrayMFCEvents * This,
            /* [in] */ REFIID riid,
            /* [size_is][in] */ LPOLESTR *rgszNames,
            /* [range][in] */ UINT cNames,
            /* [in] */ LCID lcid,
            /* [size_is][out] */ DISPID *rgDispId);
        
        /* [local] */ HRESULT ( STDMETHODCALLTYPE *Invoke )( 
            _DArrayMFCEvents * This,
            /* [annotation][in] */ 
            _In_  DISPID dispIdMember,
            /* [annotation][in] */ 
            _In_  REFIID riid,
            /* [annotation][in] */ 
            _In_  LCID lcid,
            /* [annotation][in] */ 
            _In_  WORD wFlags,
            /* [annotation][out][in] */ 
            _In_  DISPPARAMS *pDispParams,
            /* [annotation][out] */ 
            _Out_opt_  VARIANT *pVarResult,
            /* [annotation][out] */ 
            _Out_opt_  EXCEPINFO *pExcepInfo,
            /* [annotation][out] */ 
            _Out_opt_  UINT *puArgErr);
        
        END_INTERFACE
    } _DArrayMFCEventsVtbl;

    interface _DArrayMFCEvents
    {
        CONST_VTBL struct _DArrayMFCEventsVtbl *lpVtbl;
    };

    

#ifdef COBJMACROS


#define _DArrayMFCEvents_QueryInterface(This,riid,ppvObject)	\
    ( (This)->lpVtbl -> QueryInterface(This,riid,ppvObject) ) 

#define _DArrayMFCEvents_AddRef(This)	\
    ( (This)->lpVtbl -> AddRef(This) ) 

#define _DArrayMFCEvents_Release(This)	\
    ( (This)->lpVtbl -> Release(This) ) 


#define _DArrayMFCEvents_GetTypeInfoCount(This,pctinfo)	\
    ( (This)->lpVtbl -> GetTypeInfoCount(This,pctinfo) ) 

#define _DArrayMFCEvents_GetTypeInfo(This,iTInfo,lcid,ppTInfo)	\
    ( (This)->lpVtbl -> GetTypeInfo(This,iTInfo,lcid,ppTInfo) ) 

#define _DArrayMFCEvents_GetIDsOfNames(This,riid,rgszNames,cNames,lcid,rgDispId)	\
    ( (This)->lpVtbl -> GetIDsOfNames(This,riid,rgszNames,cNames,lcid,rgDispId) ) 

#define _DArrayMFCEvents_Invoke(This,dispIdMember,riid,lcid,wFlags,pDispParams,pVarResult,pExcepInfo,puArgErr)	\
    ( (This)->lpVtbl -> Invoke(This,dispIdMember,riid,lcid,wFlags,pDispParams,pVarResult,pExcepInfo,puArgErr) ) 

#endif /* COBJMACROS */


#endif 	/* C style interface */


#endif 	/* ___DArrayMFCEvents_DISPINTERFACE_DEFINED__ */


EXTERN_C const CLSID CLSID_ArrayMFC;

#ifdef __cplusplus

class DECLSPEC_UUID("b8d52eb1-bb12-40f4-abaa-3139629fdd52")
ArrayMFC;
#endif
#endif /* __ArrayMFCLib_LIBRARY_DEFINED__ */

/* Additional Prototypes for ALL interfaces */

/* end of Additional Prototypes */

#ifdef __cplusplus
}
#endif

#endif


