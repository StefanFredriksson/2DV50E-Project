// FibMFCPropPage.cpp : Implementation of the CFibMFCPropPage property page class.

#include "pch.h"
#include "framework.h"
#include "FibMFC.h"
#include "FibMFCPropPage.h"

#ifdef _DEBUG
#define new DEBUG_NEW
#endif

IMPLEMENT_DYNCREATE(CFibMFCPropPage, COlePropertyPage)

// Message map

BEGIN_MESSAGE_MAP(CFibMFCPropPage, COlePropertyPage)
END_MESSAGE_MAP()

// Initialize class factory and guid

IMPLEMENT_OLECREATE_EX(CFibMFCPropPage, "MFCACTIVEXCONT.FibMFCPropPage.1",
	0x23309ccc,0x8b43,0x4ff6,0x97,0x32,0x7a,0xca,0xae,0xb3,0x72,0x3b)

// CFibMFCPropPage::CFibMFCPropPageFactory::UpdateRegistry -
// Adds or removes system registry entries for CFibMFCPropPage

BOOL CFibMFCPropPage::CFibMFCPropPageFactory::UpdateRegistry(BOOL bRegister)
{
	if (bRegister)
		return AfxOleRegisterPropertyPageClass(AfxGetInstanceHandle(),
			m_clsid, IDS_FIBMFC_PPG);
	else
		return AfxOleUnregisterClass(m_clsid, nullptr);
}

// CFibMFCPropPage::CFibMFCPropPage - Constructor

CFibMFCPropPage::CFibMFCPropPage() :
	COlePropertyPage(IDD, IDS_FIBMFC_PPG_CAPTION)
{
}

// CFibMFCPropPage::DoDataExchange - Moves data between page and properties

void CFibMFCPropPage::DoDataExchange(CDataExchange* pDX)
{
	DDP_PostProcessing(pDX);
}

// CFibMFCPropPage message handlers
