#include "ppapi/cpp/instance.h"
#include "ppapi/cpp/module.h"
#include "ppapi/cpp/var.h"
#include <stdlib.h>
#include <time.h>
#include <chrono>

using namespace std;
using namespace std::chrono;

class NumericInstance : public pp::Instance
{
public:
  explicit NumericInstance(PP_Instance instance) : pp::Instance(instance) {}
  virtual ~NumericInstance() {}
  virtual void HandleMessage(const pp::Var &var_message)
  {
    high_resolution_clock::time_point startTime = high_resolution_clock::now();

    doNumericComputations();

    high_resolution_clock::time_point endTime = high_resolution_clock::now();
    int execTime = duration_cast<milliseconds>(endTime - startTime).count();

    PostMessage(pp::Var(execTime));
  }

private:
  void doNumericComputations()
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
};

class NumericModule : public pp::Module
{
public:
  NumericModule() : pp::Module() {}
  virtual ~NumericModule() {}

  virtual pp::Instance *CreateInstance(PP_Instance instance)
  {
    return new NumericInstance(instance);
  }
};

namespace pp
{
Module *CreateModule()
{
  return new NumericModule();
}
} // namespace pp
