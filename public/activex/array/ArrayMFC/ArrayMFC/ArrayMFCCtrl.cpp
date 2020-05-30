// ArrayMFCCtrl.cpp : Implementation of the CArrayMFCCtrl ActiveX Control class.

#include "pch.h"
#include "framework.h"
#include "ArrayMFC.h"
#include "ArrayMFCCtrl.h"
#include "ArrayMFCPropPage.h"
#include "afxdialogex.h"
#include <time.h>
#include <chrono>
#include <curl/curl.h>
#include <string>

using namespace std;
using namespace std::chrono;

#ifdef _DEBUG
#define new DEBUG_NEW
#endif

IMPLEMENT_DYNCREATE(CArrayMFCCtrl, COleControl)

// Message map

BEGIN_MESSAGE_MAP(CArrayMFCCtrl, COleControl)
	ON_OLEVERB(AFX_IDS_VERB_PROPERTIES, OnProperties)
END_MESSAGE_MAP()

// Dispatch map

BEGIN_DISPATCH_MAP(CArrayMFCCtrl, COleControl)
END_DISPATCH_MAP()

// Event map

BEGIN_EVENT_MAP(CArrayMFCCtrl, COleControl)
END_EVENT_MAP()

// Property pages

// TODO: Add more property pages as needed.  Remember to increase the count!
BEGIN_PROPPAGEIDS(CArrayMFCCtrl, 1)
	PROPPAGEID(CArrayMFCPropPage::guid)
END_PROPPAGEIDS(CArrayMFCCtrl)

// Initialize class factory and guid

IMPLEMENT_OLECREATE_EX(CArrayMFCCtrl, "MFCACTIVEXCONTRO.ArrayMFCCtrl.1",
	0xb8d52eb1,0xbb12,0x40f4,0xab,0xaa,0x31,0x39,0x62,0x9f,0xdd,0x52)

// Type library ID and version

IMPLEMENT_OLETYPELIB(CArrayMFCCtrl, _tlid, _wVerMajor, _wVerMinor)

// Interface IDs

const IID IID_DArrayMFC = {0xdc3ec1eb,0xecbd,0x4d69,{0xa0,0x7c,0x59,0xf3,0xa4,0x1d,0x3e,0xcc}};
const IID IID_DArrayMFCEvents = {0xb1739b13,0x016e,0x47f1,{0x98,0xcf,0x83,0x61,0x2d,0x1c,0x6a,0xdd}};

// Control type information

static const DWORD _dwArrayMFCOleMisc =
	OLEMISC_ACTIVATEWHENVISIBLE |
	OLEMISC_SETCLIENTSITEFIRST |
	OLEMISC_INSIDEOUT |
	OLEMISC_CANTLINKINSIDE |
	OLEMISC_RECOMPOSEONRESIZE;

IMPLEMENT_OLECTLTYPE(CArrayMFCCtrl, IDS_ARRAYMFC, _dwArrayMFCOleMisc)

// CArrayMFCCtrl::CArrayMFCCtrlFactory::UpdateRegistry -
// Adds or removes system registry entries for CArrayMFCCtrl

BOOL CArrayMFCCtrl::CArrayMFCCtrlFactory::UpdateRegistry(BOOL bRegister)
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
			IDS_ARRAYMFC,
			IDB_ARRAYMFC,
			afxRegApartmentThreading,
			_dwArrayMFCOleMisc,
			_tlid,
			_wVerMajor,
			_wVerMinor);
	else
		return AfxOleUnregisterClass(m_clsid, m_lpszProgID);
}


// CArrayMFCCtrl::CArrayMFCCtrl - Constructor

CArrayMFCCtrl::CArrayMFCCtrl()
{
	InitializeIIDs(&IID_DArrayMFC, &IID_DArrayMFCEvents);
	start();
}

// CArrayMFCCtrl::~CArrayMFCCtrl - Destructor

CArrayMFCCtrl::~CArrayMFCCtrl()
{
	// TODO: Cleanup your control's instance data here.
}

void CArrayMFCCtrl::start() {
	high_resolution_clock::time_point startTime = high_resolution_clock::now();

	run();

	high_resolution_clock::time_point endTime = high_resolution_clock::now();
	int execTime = duration_cast<milliseconds>(endTime - startTime).count();
	long long time = duration_cast<milliseconds>(system_clock::now().time_since_epoch()).count();
	string sUrl = "http://localhost:4000/timer/end?tech=activex&app=array&time=" + to_string(time) + "&execTime=" + to_string(execTime);
	const char* url = sUrl.c_str();
	CURL *c;

	c = curl_easy_init();
	curl_easy_setopt(c, CURLOPT_URL, url);
	curl_easy_perform(c);
	curl_easy_cleanup(c);
}

void CArrayMFCCtrl::run()
{
	const int SIZE = 30000000;
	int *arr = new int[SIZE];
	srand(time(NULL));

	for (int i = 0; i < SIZE; i++)
	{
		int val = rand() % 10 + 1;
		arr[i] = val;
	}

	for (int i = 0; i < SIZE; i++)
	{
		int val1 = rand() % SIZE;
		int val2 = rand() % SIZE;
		int temp = arr[val1];
		arr[val1] = arr[val2];
		arr[val2] = temp;
	}

	delete[] arr;
}

// CArrayMFCCtrl::OnDraw - Drawing function

void CArrayMFCCtrl::OnDraw(
			CDC* pdc, const CRect& rcBounds, const CRect& /* rcInvalid */)
{
	if (!pdc)
		return;

	// TODO: Replace the following code with your own drawing code.
	pdc->FillRect(rcBounds, CBrush::FromHandle((HBRUSH)GetStockObject(WHITE_BRUSH)));
	pdc->Ellipse(rcBounds);
}

// CArrayMFCCtrl::DoPropExchange - Persistence support

void CArrayMFCCtrl::DoPropExchange(CPropExchange* pPX)
{
	ExchangeVersion(pPX, MAKELONG(_wVerMinor, _wVerMajor));
	COleControl::DoPropExchange(pPX);

	// TODO: Call PX_ functions for each persistent custom property.
}


// CArrayMFCCtrl::OnResetState - Reset control to default state

void CArrayMFCCtrl::OnResetState()
{
	COleControl::OnResetState();  // Resets defaults found in DoPropExchange

	// TODO: Reset any other control state here.
}


// CArrayMFCCtrl message handlers
