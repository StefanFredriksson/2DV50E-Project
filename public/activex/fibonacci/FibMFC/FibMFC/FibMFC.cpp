// FibMFC.cpp : Implementation of CFibMFCApp and DLL registration.

#include "pch.h"
#include "framework.h"
#include "FibMFC.h"

#ifdef _DEBUG
#define new DEBUG_NEW
#endif


CFibMFCApp theApp;

const GUID CDECL _tlid = {0xbff2d06b,0x899d,0x4dc5,{0xa1,0x3d,0x69,0xed,0x67,0x5d,0x7c,0x45}};
const WORD _wVerMajor = 1;
const WORD _wVerMinor = 0;



// CFibMFCApp::InitInstance - DLL initialization

BOOL CFibMFCApp::InitInstance()
{
	BOOL bInit = COleControlModule::InitInstance();

	if (bInit)
	{
		// TODO: Add your own module initialization code here.
	}

	return bInit;
}



// CFibMFCApp::ExitInstance - DLL termination

int CFibMFCApp::ExitInstance()
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
