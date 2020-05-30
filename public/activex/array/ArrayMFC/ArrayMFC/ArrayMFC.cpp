// ArrayMFC.cpp : Implementation of CArrayMFCApp and DLL registration.

#include "pch.h"
#include "framework.h"
#include "ArrayMFC.h"

#ifdef _DEBUG
#define new DEBUG_NEW
#endif


CArrayMFCApp theApp;

const GUID CDECL _tlid = {0x7412c5c9,0x747d,0x47ce,{0xbf,0x98,0x51,0xe9,0x18,0xa4,0x77,0x79}};
const WORD _wVerMajor = 1;
const WORD _wVerMinor = 0;



// CArrayMFCApp::InitInstance - DLL initialization

BOOL CArrayMFCApp::InitInstance()
{
	BOOL bInit = COleControlModule::InitInstance();

	if (bInit)
	{
		// TODO: Add your own module initialization code here.
	}

	return bInit;
}



// CArrayMFCApp::ExitInstance - DLL termination

int CArrayMFCApp::ExitInstance()
{
	// TODO: Add your own module termination code here.

	return COleControlModule::ExitInstance();
}



// DllRegisterServer - Adds entries to the system registry

STDAPI DllRegisterServer(void)
{
	AFX_MANAGE_STATE(_afxModuleAddrThis);

	if (!AfxOleRegisterTypeLib(AfxGetInstanceHandle(), _tlid))
		return ResultFromScode(SELFREG_E_TYPELIB);

	if (!COleObjectFactoryEx::UpdateRegistryAll(TRUE))
		return ResultFromScode(SELFREG_E_CLASS);

	return NOERROR;
}



// DllUnregisterServer - Removes entries from the system registry

STDAPI DllUnregisterServer(void)
{
	AFX_MANAGE_STATE(_afxModuleAddrThis);

	if (!AfxOleUnregisterTypeLib(_tlid, _wVerMajor, _wVerMinor))
		return ResultFromScode(SELFREG_E_TYPELIB);

	if (!COleObjectFactoryEx::UpdateRegistryAll(FALSE))
		return ResultFromScode(SELFREG_E_CLASS);

	return NOERROR;
}
