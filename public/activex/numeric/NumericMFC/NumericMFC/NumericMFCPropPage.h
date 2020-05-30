#pragma once

// NumericMFCPropPage.h : Declaration of the CNumericMFCPropPage property page class.


// CNumericMFCPropPage : See NumericMFCPropPage.cpp for implementation.

class CNumericMFCPropPage : public COlePropertyPage
{
	DECLARE_DYNCREATE(CNumericMFCPropPage)
	DECLARE_OLECREATE_EX(CNumericMFCPropPage)

// Constructor
public:
	CNumericMFCPropPage();

// Dialog Data
	enum { IDD = IDD_PROPPAGE_NUMERICMFC };

// Implementation
protected:
	virtual void DoDataExchange(CDataExchange* pDX);    // DDX/DDV support

// Message maps
protected:
	DECLARE_MESSAGE_MAP()
};

