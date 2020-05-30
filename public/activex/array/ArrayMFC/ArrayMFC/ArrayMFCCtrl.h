#pragma once

// ArrayMFCCtrl.h : Declaration of the CArrayMFCCtrl ActiveX Control class.


// CArrayMFCCtrl : See ArrayMFCCtrl.cpp for implementation.

class CArrayMFCCtrl : public COleControl
{
	DECLARE_DYNCREATE(CArrayMFCCtrl)

// Constructor
public:
	CArrayMFCCtrl();
	void start();
	void run();

// Overrides
public:
	virtual void OnDraw(CDC* pdc, const CRect& rcBounds, const CRect& rcInvalid);
	virtual void DoPropExchange(CPropExchange* pPX);
	virtual void OnResetState();

// Implementation
protected:
	~CArrayMFCCtrl();

	DECLARE_OLECREATE_EX(CArrayMFCCtrl)    // Class factory and guid
	DECLARE_OLETYPELIB(CArrayMFCCtrl)      // GetTypeInfo
	DECLARE_PROPPAGEIDS(CArrayMFCCtrl)     // Property page IDs
	DECLARE_OLECTLTYPE(CArrayMFCCtrl)		// Type name and misc status

// Message maps
	DECLARE_MESSAGE_MAP()

// Dispatch maps
	DECLARE_DISPATCH_MAP()

// Event maps
	DECLARE_EVENT_MAP()

// Dispatch and event IDs
public:
	enum {
	};
};

