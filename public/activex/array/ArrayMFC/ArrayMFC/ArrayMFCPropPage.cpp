// ArrayMFCPropPage.cpp : Implementation of the CArrayMFCPropPage property page class.

#include "pch.h"
#include "framework.h"
#include "ArrayMFC.h"
#include "ArrayMFCPropPage.h"

#ifdef _DEBUG
#define new DEBUG_NEW
#endif

IMPLEMENT_DYNCREATE(CArrayMFCPropPage, COlePropertyPage)

// Message map

BEGIN_MESSAGE_MAP(CArrayMFCPropPage, COlePropertyPage)
END_MESSAGE_MAP()

// Initialize class factory and guid

IMPLEMENT_OLECREATE_EX(CArrayMFCPropPage, "MFCACTIVEXCONT.ArrayMFCPropPage.1",
	0x21f6d47d,0x58cf,0x44fb,0xaf,0xa1,0xdd,0xa6,0x03,0xca,0x51,0xf2)

// CArrayMFCPropPage::CArrayMFCPropPageFactory::UpdateRegistry -
// Adds or removes system registry entries for CArrayMFCPropPage

BOOL CArrayMFCPropPage::CArrayMFCPropPageFactory::UpdateRegistry(BOOL bRegister)
{
	if (bRegister)
		return AfxOleRegisterPropertyPageClass(AfxGetInstanceHandle(),
			m_clsid, IDS_ARRAYMFC_PPG);
	else
		return AfxOleUnregisterClass(m_clsid, nullptr);
}

// CArrayMFCPropPage::CArrayMFCPropPage - Constructor

CArrayMFCPropPage::CArrayMFCPropPage() :
	COlePropertyPage(IDD, IDS_ARRAYMFC_PPG_CAPTION)
{
}

// CArrayMFCPropPage::DoDataExchange - Moves data between page and properties

void CArrayMFCPropPage::DoDataExchange(CDataExchange* pDX)
{
	DDP_PostProcessing(pDX);
}

// CArrayMFCPropPage message handlers
