// NumericMFCCtrl.cpp : Implementation of the CNumericMFCCtrl ActiveX Control class.

#include "pch.h"
#include "framework.h"
#include "NumericMFC.h"
#include "NumericMFCCtrl.h"
#include "NumericMFCPropPage.h"
#include "afxdialogex.h"
#include <string>
#include <curl/curl.h>
#include <chrono>

using namespace std;
using namespace std::chrono;

#ifdef _DEBUG
#define new DEBUG_NEW
#endif

IMPLEMENT_DYNCREATE(CNumericMFCCtrl, COleControl)

// Message map

BEGIN_MESSAGE_MAP(CNumericMFCCtrl, COleControl)
ON_OLEVERB(AFX_IDS_VERB_PROPERTIES, OnProperties)
END_MESSAGE_MAP()

// Dispatch map

BEGIN_DISPATCH_MAP(CNumericMFCCtrl, COleControl)
END_DISPATCH_MAP()

// Event map

BEGIN_EVENT_MAP(CNumericMFCCtrl, COleControl)
END_EVENT_MAP()

// Property pages

// TODO: Add more property pages as needed.  Remember to increase the count!
BEGIN_PROPPAGEIDS(CNumericMFCCtrl, 1)
PROPPAGEID(CNumericMFCPropPage::guid)
END_PROPPAGEIDS(CNumericMFCCtrl)

// Initialize class factory and guid

IMPLEMENT_OLECREATE_EX(CNumericMFCCtrl, "MFCACTIVEXCONTRO.NumericMFCCtrl.1",
                       0x963ff900, 0x6d5f, 0x4956, 0x87, 0xee, 0x43, 0x22, 0xbf, 0x91, 0xeb, 0x19)

// Type library ID and version

IMPLEMENT_OLETYPELIB(CNumericMFCCtrl, _tlid, _wVerMajor, _wVerMinor)

// Interface IDs

const IID IID_DNumericMFC = {0xda81fade, 0x9353, 0x4b21, {0xb3, 0x51, 0xc1, 0x4d, 0xd6, 0x8f, 0xe4, 0x80}};
const IID IID_DNumericMFCEvents = {0x55265547, 0x7b55, 0x46bd, {0xbc, 0xff, 0x07, 0xe9, 0xfb, 0xed, 0x43, 0x2a}};

// Control type information

static const DWORD _dwNumericMFCOleMisc =
    OLEMISC_ACTIVATEWHENVISIBLE |
    OLEMISC_SETCLIENTSITEFIRST |
    OLEMISC_INSIDEOUT |
    OLEMISC_CANTLINKINSIDE |
    OLEMISC_RECOMPOSEONRESIZE;

IMPLEMENT_OLECTLTYPE(CNumericMFCCtrl, IDS_NUMERICMFC, _dwNumericMFCOleMisc)

// CNumericMFCCtrl::CNumericMFCCtrlFactory::UpdateRegistry -
// Adds or removes system registry entries for CNumericMFCCtrl

BOOL CNumericMFCCtrl::CNumericMFCCtrlFactory::UpdateRegistry(BOOL bRegister)
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
        IDS_NUMERICMFC,
        IDB_NUMERICMFC,
        afxRegApartmentThreading,
        _dwNumericMFCOleMisc,
        _tlid,
        _wVerMajor,
        _wVerMinor);
  else
    return AfxOleUnregisterClass(m_clsid, m_lpszProgID);
}

// CNumericMFCCtrl::CNumericMFCCtrl - Constructor

CNumericMFCCtrl::CNumericMFCCtrl()
{
  InitializeIIDs(&IID_DNumericMFC, &IID_DNumericMFCEvents);
  startComps();
}

// CNumericMFCCtrl::~CNumericMFCCtrl - Destructor

CNumericMFCCtrl::~CNumericMFCCtrl()
{
  // TODO: Cleanup your control's instance data here.
}

void CNumericMFCCtrl::startComps()
{
  high_resolution_clock::time_point startTime = high_resolution_clock::now();

  doNumericComputations();

  high_resolution_clock::time_point endTime = high_resolution_clock::now();
  int execTime = duration_cast<milliseconds>(endTime - startTime).count();
  long long time = duration_cast<milliseconds>(system_clock::now().time_since_epoch()).count();
  string sUrl = "http://localhost:4000/timer/end?tech=activex&app=numeric&time=" + to_string(time) + "&execTime=" + to_string(execTime);
  const char *url = sUrl.c_str();
  CURL *c;

  c = curl_easy_init();
  curl_easy_setopt(c, CURLOPT_URL, url);
  curl_easy_perform(c);
  curl_easy_cleanup(c);
}

void CNumericMFCCtrl::doNumericComputations()
{
  srand(time(NULL));
  const int SIZE = 100000000;

  for (int i = 0; i < SIZE; i++)
  {
    int num1 = rand() % 10 + 1;
    int num2 = rand() % 10 + 1;

    if (num1 < num2)
    {
      num1 = 1;
    }

    if (num2 < num1)
    {
      num2 = 1;
    }

    if (num1 == num2)
    {
      num1 = 1;
      num2 = 1;
    }
  }
}

// CNumericMFCCtrl::OnDraw - Drawing function

void CNumericMFCCtrl::OnDraw(
    CDC *pdc, const CRect &rcBounds, const CRect & /* rcInvalid */)
{
  if (!pdc)
    return;

  // TODO: Replace the following code with your own drawing code.
  pdc->FillRect(rcBounds, CBrush::FromHandle((HBRUSH)GetStockObject(WHITE_BRUSH)));
  pdc->Ellipse(rcBounds);
}

// CNumericMFCCtrl::DoPropExchange - Persistence support

void CNumericMFCCtrl::DoPropExchange(CPropExchange *pPX)
{
  ExchangeVersion(pPX, MAKELONG(_wVerMinor, _wVerMajor));
  COleControl::DoPropExchange(pPX);

  // TODO: Call PX_ functions for each persistent custom property.
}

// CNumericMFCCtrl::OnResetState - Reset control to default state

void CNumericMFCCtrl::OnResetState()
{
  COleControl::OnResetState(); // Resets defaults found in DoPropExchange

  // TODO: Reset any other control state here.
}

// CNumericMFCCtrl message handlers
