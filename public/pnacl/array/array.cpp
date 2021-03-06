#include "ppapi/cpp/instance.h"
#include "ppapi/cpp/module.h"
#include "ppapi/cpp/var.h"
#include <stdlib.h>
#include <time.h>
#include <chrono>

using namespace std;
using namespace std::chrono;

class ArrayInstance : public pp::Instance
{
public:
  explicit ArrayInstance(PP_Instance instance) : pp::Instance(instance) {}
  virtual ~ArrayInstance() {}
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
};

class ArrayModule : public pp::Module
{
public:
  ArrayModule() : pp::Module() {}
  virtual ~ArrayModule() {}

  virtual pp::Instance *CreateInstance(PP_Instance instance)
  {
    return new ArrayInstance(instance);
  }
};

namespace pp
{
Module *CreateModule()
{
  return new ArrayModule();
}
} // namespace pp
