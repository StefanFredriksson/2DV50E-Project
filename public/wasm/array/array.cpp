// LargeArray.cpp : This file contains the 'main' function. Program execution begins and ends there.
//

#include <stdlib.h>
#include <time.h>
#include <chrono>

using namespace std;
using namespace std::chrono;

void run();
int execTime = 0;

int main()
{
  high_resolution_clock::time_point startTime = high_resolution_clock::now();
  run();
  high_resolution_clock::time_point endTime = high_resolution_clock::now();
  execTime = duration_cast<milliseconds>(endTime - startTime).count();
}

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

extern "C"
{
  int getExecTime()
  {
    return execTime;
  }
}
