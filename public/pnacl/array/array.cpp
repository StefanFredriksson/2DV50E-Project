#include "ppapi/cpp/instance.h"
#include "ppapi/cpp/module.h"
#include "ppapi/cpp/var.h"
#include <stdlib.h>
#include <time.h>
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
    high_resolution_clock::time_point startTime = high_resolution_clock::now();

    run();

    high_resolution_clock::time_point endTime = high_resolution_clock::now();
    int execTime = duration_cast<milliseconds>(endTime - startTime).count();

    PostMessage(pp::Var(execTime));
  }

private:
  void run()
  {
    const int SIZE = 100000000;
    int *arr = new int[SIZE];
    srand(time(NULL));

    for (int i = 0; i < SIZE; i++)
    {
      int val = rand() % 10 + 1;
      arr[i] = val;
    }

    delete[] arr;
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
