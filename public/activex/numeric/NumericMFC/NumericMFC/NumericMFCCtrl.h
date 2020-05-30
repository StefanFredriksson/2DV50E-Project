#pragma once

// NumericMFCCtrl.h : Declaration of the CNumericMFCCtrl ActiveX Control class.


// CNumericMFCCtrl : See NumericMFCCtrl.cpp for implementation.

class CNumericMFCCtrl : public COleControl
{
	DECLARE_DYNCREATE(CNumericMFCCtrl)

// Constructor
public:
	CNumericMFCCtrl();
	void startComps();
	void doNumericComputations();

// Overrides
public:
	virtual void OnDraw(CDC* pdc, const CRect& rcBounds, const CRect& rcInvalid);
	virtual void DoPropExchange(CPropExchange* pPX);
	virtual void OnResetState();

// Implementation
protected:
	~CNumericMFCCtrl();

	DECLARE_OLECREATE_EX(CNumericMFCCtrl)    // Class factory and guid
	DECLARE_OLETYPELIB(CNumericMFCCtrl)      // GetTypeInfo
	DECLARE_PROPPAGEIDS(CNumericMFCCtrl)     // Property page IDs
	DECLARE_OLECTLTYPE(CNumericMFCCtrl)		// Type name and misc status

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

