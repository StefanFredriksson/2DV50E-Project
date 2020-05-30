#pragma once

// FibMFCPropPage.h : Declaration of the CFibMFCPropPage property page class.


// CFibMFCPropPage : See FibMFCPropPage.cpp for implementation.

class CFibMFCPropPage : public COlePropertyPage
{
	DECLARE_DYNCREATE(CFibMFCPropPage)
	DECLARE_OLECREATE_EX(CFibMFCPropPage)

// Constructor
public:
	CFibMFCPropPage();

// Dialog Data
	enum { IDD = IDD_PROPPAGE_FIBMFC };

// Implementation
protected:
	virtual void DoDataExchange(CDataExchange* pDX);    // DDX/DDV support

// Message maps
protected:
	DECLARE_MESSAGE_MAP()
};

