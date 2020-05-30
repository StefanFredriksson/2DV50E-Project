// FibMFCCtrl.cpp : Implementation of the CFibMFCCtrl ActiveX Control class.

#include "pch.h"
#include "framework.h"
#include "FibMFC.h"
#include "FibMFCCtrl.h"
#include "FibMFCPropPage.h"
#include "afxdialogex.h"

#include <string>
#include <curl/curl.h>
#include <chrono>

using namespace std;
using namespace std::chrono;

#ifdef _DEBUG
#define new DEBUG_NEW
#endif

IMPLEMENT_DYNCREATE(CFibMFCCtrl, COleControl)

// Message map

BEGIN_MESSAGE_MAP(CFibMFCCtrl, COleControl)
	ON_OLEVERB(AFX_IDS_VERB_PROPERTIES, OnProperties)
END_MESSAGE_MAP()

// Dispatch map

BEGIN_DISPATCH_MAP(CFibMFCCtrl, COleControl)
END_DISPATCH_MAP()

// Event map

BEGIN_EVENT_MAP(CFibMFCCtrl, COleControl)
END_EVENT_MAP()

// Property pages

// TODO: Add more property pages as needed.  Remember to increase the count!
BEGIN_PROPPAGEIDS(CFibMFCCtrl, 1)
	PROPPAGEID(CFibMFCPropPage::guid)
END_PROPPAGEIDS(CFibMFCCtrl)

// Initialize class factory and guid

IMPLEMENT_OLECREATE_EX(CFibMFCCtrl, "MFCACTIVEXCONTRO.FibMFCCtrl.1",
	0x7fa6ff4c,0x21fa,0x4545,0x9a,0x76,0xa2,0x11,0xa9,0xd4,0x49,0x8f)

// Type library ID and version

IMPLEMENT_OLETYPELIB(CFibMFCCtrl, _tlid, _wVerMajor, _wVerMinor)

// Interface IDs

const IID IID_DFibMFC = {0x708118d8,0x6940,0x4bce,{0x8c,0x16,0x01,0x3b,0x03,0x13,0x6f,0x0e}};
const IID IID_DFibMFCEvents = {0x6f2efa9c,0x4d40,0x4a52,{0x90,0x15,0xfa,0x2d,0xaf,0x84,0xaf,0x94}};

// Control type information

static const DWORD _dwFibMFCOleMisc =
	OLEMISC_ACTIVATEWHENVISIBLE |
	OLEMISC_SETCLIENTSITEFIRST |
	OLEMISC_INSIDEOUT |
	OLEMISC_CANTLINKINSIDE |
	OLEMISC_RECOMPOSEONRESIZE;

IMPLEMENT_OLECTLTYPE(CFibMFCCtrl, IDS_FIBMFC, _dwFibMFCOleMisc)

// CFibMFCCtrl::CFibMFCCtrlFactory::UpdateRegistry -
// Adds or removes system registry entries for CFibMFCCtrl

BOOL CFibMFCCtrl::CFibMFCCtrlFactory::UpdateRegistry(BOOL bRegister)
{
	// TODO: Verify that your control follows apartment-model threading rules.
	// Refer to MFC TechNote 64 for more information.
	// If your control does not conform to the apartment-model rules, then
	// you must modify the code below, changing the 6th parameter from
	// afxRegApartmentThreading to 0.

	if (bRegister)
		return AfxOleRegisterControlClass(
			AfxGetInstanceHandle(),
			m_clsid,
			m_lpszProgID,
			IDS_FIBMFC,
			IDB_FIBMFC,
			afxRegApartmentThreading,
			_dwFibMFCOleMisc,
			_tlid,
			_wVerMajor,
			_wVerMinor);
	else
		return AfxOleUnregisterClass(m_clsid, m_lpszProgID);
}


// CFibMFCCtrl::CFibMFCCtrl - Constructor

CFibMFCCtrl::CFibMFCCtrl()
{
	InitializeIIDs(&IID_DFibMFC, &IID_DFibMFCEvents);
	runFibonacci();
}

// CFibMFCCtrl::~CFibMFCCtrl - Destructor

CFibMFCCtrl::~CFibMFCCtrl()
{
	// TODO: Cleanup your control's instance data here.
}

void CFibMFCCtrl::runFibonacci() {
	const int SIZE = 43;
	high_resolution_clock::time_point startTime = high_resolution_clock::now();

	for (int i = 1; i <= SIZE; i++) {
		nthFibonacci(i);
	}

	high_resolution_clock::time_point endTime = high_resolution_clock::now();
	int execTime = duration_cast<milliseconds>(endTime - startTime).count();
	long long time = duration_cast<milliseconds>(system_clock::now().time_since_epoch()).count();
	string sUrl = "http://localhost:4000/timer/end?tech=activex&app=fibonacci&time=" + to_string(time) + "&execTime=" + to_string(execTime);
	const char* url = sUrl.c_str();
	CURL *c;

	c = curl_easy_init();
	curl_easy_setopt(c, CURLOPT_URL, url);
	curl_easy_perform(c);
	curl_easy_cleanup(c);
}

int CFibMFCCtrl::nthFibonacci(int n) {
	if (n <= 0) {
		throw "The value passed to the method must be positive.";
	}

	if (n == 1) {
		return 0;
	}
	else if (n == 2) {
		return 1;
	}

	int sum = nthFibonacci(n - 1) + nthFibonacci(n - 2);

	return sum;
}

// CFibMFCCtrl::OnDraw - Drawing function

void CFibMFCCtrl::OnDraw(
			CDC* pdc, const CRect& rcBounds, const CRect& /* rcInvalid */)
{
	if (!pdc)
		return;

	// TODO: Replace the following code with your own drawing code.
	pdc->FillRect(rcBounds, CBrush::FromHandle((HBRUSH)GetStockObject(WHITE_BRUSH)));
	pdc->Ellipse(rcBounds);
}

// CFibMFCCtrl::DoPropExchange - Persistence support

void CFibMFCCtrl::DoPropExchange(CPropExchange* pPX)
{
	ExchangeVersion(pPX, MAKELONG(_wVerMinor, _wVerMajor));
	COleControl::DoPropExchange(pPX);

	// TODO: Call PX_ functions for each persistent custom property.
}


// CFibMFCCtrl::OnResetState - Reset control to default state

void CFibMFCCtrl::OnResetState()
{
	COleControl::OnResetState();  // Resets defaults found in DoPropExchange

	// TODO: Reset any other control state here.
}


// CFibMFCCtrl message handlers
