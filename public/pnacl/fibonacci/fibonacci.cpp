#include "ppapi/cpp/instance.h"
#include "ppapi/cpp/module.h"
#include "ppapi/cpp/var.h"
#include <string>

using namespace std;

class FibonacciInstance : public pp::Instance
{
public:
  explicit FibonacciInstance(PP_Instance instance) : pp::Instance(instance) {}
  virtual ~FibonacciInstance() {}
  virtual void HandleMessage(const pp::Var& var_message) {
	  const int SIZE = 40;
	  string message = "Done";

	  for (int i = 1; i <= SIZE; i++) {
		  nthFibonacci(i);
	  }

	  PostMessage(pp::Var(message));
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
