

/* this ALWAYS GENERATED file contains the definitions for the interfaces */


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



/* verify that the <rpcndr.h> version is high enough to compile this file*/
#ifndef __REQUIRED_RPCNDR_H_VERSION__
#define __REQUIRED_RPCNDR_H_VERSION__ 500
#endif

#include "rpc.h"
#include "rpcndr.h"

#ifndef __RPCNDR_H_VERSION__
#error this stub requires an updated version of <rpcndr.h>
#endif /* __RPCNDR_H_VERSION__ */


#ifndef __NumericMFCidl_h__
#define __NumericMFCidl_h__

#if defined(_MSC_VER) && (_MSC_VER >= 1020)
#pragma once
#endif

/* Forward Declarations */ 

#ifndef ___DNumericMFC_FWD_DEFINED__
#define ___DNumericMFC_FWD_DEFINED__
typedef interface _DNumericMFC _DNumericMFC;

#endif 	/* ___DNumericMFC_FWD_DEFINED__ */


#ifndef ___DNumericMFCEvents_FWD_DEFINED__
#define ___DNumericMFCEvents_FWD_DEFINED__
typedef interface _DNumericMFCEvents _DNumericMFCEvents;

#endif 	/* ___DNumericMFCEvents_FWD_DEFINED__ */


#ifndef __NumericMFC_FWD_DEFINED__
#define __NumericMFC_FWD_DEFINED__

#ifdef __cplusplus
typedef class NumericMFC NumericMFC;
#else
typedef struct NumericMFC NumericMFC;
#endif /* __cplusplus */

#endif 	/* __NumericMFC_FWD_DEFINED__ */


#ifdef __cplusplus
extern "C"{
#endif 


/* interface __MIDL_itf_NumericMFC_0000_0000 */
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


extern RPC_IF_HANDLE __MIDL_itf_NumericMFC_0000_0000_v0_0_c_ifspec;
extern RPC_IF_HANDLE __MIDL_itf_NumericMFC_0000_0000_v0_0_s_ifspec;


#ifndef __NumericMFCLib_LIBRARY_DEFINED__
#define __NumericMFCLib_LIBRARY_DEFINED__

/* library NumericMFCLib */
/* [control][version][uuid] */ 


EXTERN_C const IID LIBID_NumericMFCLib;

#ifndef ___DNumericMFC_DISPINTERFACE_DEFINED__
#define ___DNumericMFC_DISPINTERFACE_DEFINED__

/* dispinterface _DNumericMFC */
/* [uuid] */ 


EXTERN_C const IID DIID__DNumericMFC;

#if defined(__cplusplus) && !defined(CINTERFACE)

    MIDL_INTERFACE("da81fade-9353-4b21-b351-c14dd68fe480")
    _DNumericMFC : public IDispatch
    {
    };
    
#else 	/* C style interface */

    typedef struct _DNumericMFCVtbl
    {
        BEGIN_INTERFACE
        
        HRESULT ( STDMETHODCALLTYPE *QueryInterface )( 
            _DNumericMFC * This,
            /* [in] */ REFIID riid,
            /* [annotation][iid_is][out] */ 
            _COM_Outptr_  void **ppvObject);
        
        ULONG ( STDMETHODCALLTYPE *AddRef )( 
            _DNumericMFC * This);
        
        ULONG ( STDMETHODCALLTYPE *Release )( 
            _DNumericMFC * This);
        
        HRESULT ( STDMETHODCALLTYPE *GetTypeInfoCount )( 
            _DNumericMFC * This,
            /* [out] */ UINT *pctinfo);
        
        HRESULT ( STDMETHODCALLTYPE *GetTypeInfo )( 
            _DNumericMFC * This,
            /* [in] */ UINT iTInfo,
            /* [in] */ LCID lcid,
            /* [out] */ ITypeInfo **ppTInfo);
        
        HRESULT ( STDMETHODCALLTYPE *GetIDsOfNames )( 
            _DNumericMFC * This,
            /* [in] */ REFIID riid,
            /* [size_is][in] */ LPOLESTR *rgszNames,
            /* [range][in] */ UINT cNames,
            /* [in] */ LCID lcid,
            /* [size_is][out] */ DISPID *rgDispId);
        
        /* [local] */ HRESULT ( STDMETHODCALLTYPE *Invoke )( 
            _DNumericMFC * This,
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
    } _DNumericMFCVtbl;

    interface _DNumericMFC
    {
        CONST_VTBL struct _DNumericMFCVtbl *lpVtbl;
    };

    

#ifdef COBJMACROS


#define _DNumericMFC_QueryInterface(This,riid,ppvObject)	\
    ( (This)->lpVtbl -> QueryInterface(This,riid,ppvObject) ) 

#define _DNumericMFC_AddRef(This)	\
    ( (This)->lpVtbl -> AddRef(This) ) 

#define _DNumericMFC_Release(This)	\
    ( (This)->lpVtbl -> Release(This) ) 


#define _DNumericMFC_GetTypeInfoCount(This,pctinfo)	\
    ( (This)->lpVtbl -> GetTypeInfoCount(This,pctinfo) ) 

#define _DNumericMFC_GetTypeInfo(This,iTInfo,lcid,ppTInfo)	\
    ( (This)->lpVtbl -> GetTypeInfo(This,iTInfo,lcid,ppTInfo) ) 

#define _DNumericMFC_GetIDsOfNames(This,riid,rgszNames,cNames,lcid,rgDispId)	\
    ( (This)->lpVtbl -> GetIDsOfNames(This,riid,rgszNames,cNames,lcid,rgDispId) ) 

#define _DNumericMFC_Invoke(This,dispIdMember,riid,lcid,wFlags,pDispParams,pVarResult,pExcepInfo,puArgErr)	\
    ( (This)->lpVtbl -> Invoke(This,dispIdMember,riid,lcid,wFlags,pDispParams,pVarResult,pExcepInfo,puArgErr) ) 

#endif /* COBJMACROS */


#endif 	/* C style interface */


#endif 	/* ___DNumericMFC_DISPINTERFACE_DEFINED__ */


#ifndef ___DNumericMFCEvents_DISPINTERFACE_DEFINED__
#define ___DNumericMFCEvents_DISPINTERFACE_DEFINED__

/* dispinterface _DNumericMFCEvents */
/* [uuid] */ 


EXTERN_C const IID DIID__DNumericMFCEvents;

#if defined(__cplusplus) && !defined(CINTERFACE)

    MIDL_INTERFACE("55265547-7b55-46bd-bcff-07e9fbed432a")
    _DNumericMFCEvents : public IDispatch
    {
    };
    
#else 	/* C style interface */

    typedef struct _DNumericMFCEventsVtbl
    {
        BEGIN_INTERFACE
        
        HRESULT ( STDMETHODCALLTYPE *QueryInterface )( 
            _DNumericMFCEvents * This,
            /* [in] */ REFIID riid,
            /* [annotation][iid_is][out] */ 
            _COM_Outptr_  void **ppvObject);
        
        ULONG ( STDMETHODCALLTYPE *AddRef )( 
            _DNumericMFCEvents * This);
        
        ULONG ( STDMETHODCALLTYPE *Release )( 
            _DNumericMFCEvents * This);
        
        HRESULT ( STDMETHODCALLTYPE *GetTypeInfoCount )( 
            _DNumericMFCEvents * This,
            /* [out] */ UINT *pctinfo);
        
        HRESULT ( STDMETHODCALLTYPE *GetTypeInfo )( 
            _DNumericMFCEvents * This,
            /* [in] */ UINT iTInfo,
            /* [in] */ LCID lcid,
            /* [out] */ ITypeInfo **ppTInfo);
        
        HRESULT ( STDMETHODCALLTYPE *GetIDsOfNames )( 
            _DNumericMFCEvents * This,
            /* [in] */ REFIID riid,
            /* [size_is][in] */ LPOLESTR *rgszNames,
            /* [range][in] */ UINT cNames,
            /* [in] */ LCID lcid,
            /* [size_is][out] */ DISPID *rgDispId);
        
        /* [local] */ HRESULT ( STDMETHODCALLTYPE *Invoke )( 
            _DNumericMFCEvents * This,
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
    } _DNumericMFCEventsVtbl;

    interface _DNumericMFCEvents
    {
        CONST_VTBL struct _DNumericMFCEventsVtbl *lpVtbl;
    };

    

#ifdef COBJMACROS


#define _DNumericMFCEvents_QueryInterface(This,riid,ppvObject)	\
    ( (This)->lpVtbl -> QueryInterface(This,riid,ppvObject) ) 

#define _DNumericMFCEvents_AddRef(This)	\
    ( (This)->lpVtbl -> AddRef(This) ) 

#define _DNumericMFCEvents_Release(This)	\
    ( (This)->lpVtbl -> Release(This) ) 


#define _DNumericMFCEvents_GetTypeInfoCount(This,pctinfo)	\
    ( (This)->lpVtbl -> GetTypeInfoCount(This,pctinfo) ) 

#define _DNumericMFCEvents_GetTypeInfo(This,iTInfo,lcid,ppTInfo)	\
    ( (This)->lpVtbl -> GetTypeInfo(This,iTInfo,lcid,ppTInfo) ) 

#define _DNumericMFCEvents_GetIDsOfNames(This,riid,rgszNames,cNames,lcid,rgDispId)	\
    ( (This)->lpVtbl -> GetIDsOfNames(This,riid,rgszNames,cNames,lcid,rgDispId) ) 

#define _DNumericMFCEvents_Invoke(This,dispIdMember,riid,lcid,wFlags,pDispParams,pVarResult,pExcepInfo,puArgErr)	\
    ( (This)->lpVtbl -> Invoke(This,dispIdMember,riid,lcid,wFlags,pDispParams,pVarResult,pExcepInfo,puArgErr) ) 

#endif /* COBJMACROS */


#endif 	/* C style interface */


#endif 	/* ___DNumericMFCEvents_DISPINTERFACE_DEFINED__ */


EXTERN_C const CLSID CLSID_NumericMFC;

#ifdef __cplusplus

class DECLSPEC_UUID("963ff900-6d5f-4956-87ee-4322bf91eb19")
NumericMFC;
#endif
#endif /* __NumericMFCLib_LIBRARY_DEFINED__ */

/* Additional Prototypes for ALL interfaces */

/* end of Additional Prototypes */

#ifdef __cplusplus
}
#endif

#endif


