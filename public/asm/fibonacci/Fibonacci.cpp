#include <iostream>
#include <chrono>

using namespace std;
using namespace std::chrono;

int nthFibonacci(int n);

int execTime = 0;

int main()
{
  const int size = 43;

  auto startTime = high_resolution_clock::now();

  for (int i = 1; i <= size; i++)
  {
    nthFibonacci(i);
  }

  auto endTime = high_resolution_clock::now();
  execTime = duration_cast<milliseconds>(endTime - startTime).count();
}

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

extern "C"
{
  int getCount(int num)
  {
    return num;
  }
}
