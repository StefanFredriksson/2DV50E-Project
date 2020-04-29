#include "ppapi/cpp/instance.h"
#include "ppapi/cpp/module.h"
#include "ppapi/cpp/var.h"
#include <chrono>

using namespace std;
using namespace std::chrono;

class FibonacciInstance : public pp::Instance
{
public:
  explicit FibonacciInstance(PP_Instance instance) : pp::Instance(instance) {}
  virtual ~FibonacciInstance() {}
  virtual void HandleMessage(const pp::Var &var_message)
  {
    const int SIZE = 43;

    high_resolution_clock::time_point startTime = high_resolution_clock::now();

    try
    {
      for (int i = 1; i <= SIZE; i++)
      {
        nthFibonacci(i);
      }
    }
    catch (int e)
    {
    }

    high_resolution_clock::time_point endTime = high_resolution_clock::now();
    int execTime = duration_cast<milliseconds>(endTime - startTime).count();

    PostMessage(pp::Var(execTime));
  }

private:
  int nthFibonacci(int n)
  {
    if (n <= 0)
    {
      throw "The value passed to the method must be positive.";
    }

    if (n == 1)
    {
      return 0;
    }
    else if (n == 2)
    {
      return 1;
    }

    int sum = nthFibonacci(n - 1) + nthFibonacci(n - 2);

    return sum;
  }
};

class FibonacciModule : public pp::Module
{
public:
  FibonacciModule() : pp::Module() {}
  virtual ~FibonacciModule() {}

  virtual pp::Instance *CreateInstance(PP_Instance instance)
  {
    return new FibonacciInstance(instance);
  }
};

namespace pp
{
Module *CreateModule()
{
  return new FibonacciModule();
}
} // namespace pp
