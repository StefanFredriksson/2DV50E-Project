#pragma once

// FibMFCCtrl.h : Declaration of the CFibMFCCtrl ActiveX Control class.


// CFibMFCCtrl : See FibMFCCtrl.cpp for implementation.

class CFibMFCCtrl : public COleControl
{
	DECLARE_DYNCREATE(CFibMFCCtrl)

// Constructor
public:
	CFibMFCCtrl();
	void runFibonacci();
	int nthFibonacci(int n);

// Overrides
public:
	virtual void OnDraw(CDC* pdc, const CRect& rcBounds, const CRect& rcInvalid);
	virtual void DoPropExchange(CPropExchange* pPX);
	virtual void OnResetState();

// Implementation
protected:
	~CFibMFCCtrl();

	DECLARE_OLECREATE_EX(CFibMFCCtrl)    // Class factory and guid
	DECLARE_OLETYPELIB(CFibMFCCtrl)      // GetTypeInfo
	DECLARE_PROPPAGEIDS(CFibMFCCtrl)     // Property page IDs
	DECLARE_OLECTLTYPE(CFibMFCCtrl)		// Type name and misc status

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

