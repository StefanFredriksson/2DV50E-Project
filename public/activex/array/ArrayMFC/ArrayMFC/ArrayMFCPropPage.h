#pragma once

// ArrayMFCPropPage.h : Declaration of the CArrayMFCPropPage property page class.


// CArrayMFCPropPage : See ArrayMFCPropPage.cpp for implementation.

class CArrayMFCPropPage : public COlePropertyPage
{
	DECLARE_DYNCREATE(CArrayMFCPropPage)
	DECLARE_OLECREATE_EX(CArrayMFCPropPage)

// Constructor
public:
	CArrayMFCPropPage();

// Dialog Data
	enum { IDD = IDD_PROPPAGE_ARRAYMFC };

// Implementation
protected:
	virtual void DoDataExchange(CDataExchange* pDX);    // DDX/DDV support

// Message maps
protected:
	DECLARE_MESSAGE_MAP()
};

