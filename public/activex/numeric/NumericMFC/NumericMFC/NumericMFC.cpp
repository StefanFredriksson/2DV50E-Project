// NumericMFC.cpp : Implementation of CNumericMFCApp and DLL registration.

#include "pch.h"
#include "framework.h"
#include "NumericMFC.h"

#ifdef _DEBUG
#define new DEBUG_NEW
#endif


CNumericMFCApp theApp;

const GUID CDECL _tlid = {0x93e04360,0xfeb5,0x4167,{0x8e,0xfc,0x5b,0xee,0x2b,0x58,0x3c,0xdc}};
const WORD _wVerMajor = 1;
const WORD _wVerMinor = 0;



// CNumericMFCApp::InitInstance - DLL initialization

BOOL CNumericMFCApp::InitInstance()
{
	BOOL bInit = COleControlModule::InitInstance();

	if (bInit)
	{
		// TODO: Add your own module initialization code here.
	}

	return bInit;
}



// CNumericMFCApp::ExitInstance - DLL termination

int CNumericMFCApp::ExitInstance()
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
