// NumericMFCPropPage.cpp : Implementation of the CNumericMFCPropPage property page class.

#include "pch.h"
#include "framework.h"
#include "NumericMFC.h"
#include "NumericMFCPropPage.h"

#ifdef _DEBUG
#define new DEBUG_NEW
#endif

IMPLEMENT_DYNCREATE(CNumericMFCPropPage, COlePropertyPage)

// Message map

BEGIN_MESSAGE_MAP(CNumericMFCPropPage, COlePropertyPage)
END_MESSAGE_MAP()

// Initialize class factory and guid

IMPLEMENT_OLECREATE_EX(CNumericMFCPropPage, "MFCACTIVEXCONT.NumericMFCPropPage.1",
	0x08051787,0xb409,0x463c,0xad,0x05,0x73,0xa3,0x49,0xc2,0xc1,0x50)

// CNumericMFCPropPage::CNumericMFCPropPageFactory::UpdateRegistry -
// Adds or removes system registry entries for CNumericMFCPropPage

BOOL CNumericMFCPropPage::CNumericMFCPropPageFactory::UpdateRegistry(BOOL bRegister)
{
	if (bRegister)
		return AfxOleRegisterPropertyPageClass(AfxGetInstanceHandle(),
			m_clsid, IDS_NUMERICMFC_PPG);
	else
		return AfxOleUnregisterClass(m_clsid, nullptr);
}

// CNumericMFCPropPage::CNumericMFCPropPage - Constructor

CNumericMFCPropPage::CNumericMFCPropPage() :
	COlePropertyPage(IDD, IDS_NUMERICMFC_PPG_CAPTION)
{
}

// CNumericMFCPropPage::DoDataExchange - Moves data between page and properties

void CNumericMFCPropPage::DoDataExchange(CDataExchange* pDX)
{
	DDP_PostProcessing(pDX);
}

// CNumericMFCPropPage message handlers
