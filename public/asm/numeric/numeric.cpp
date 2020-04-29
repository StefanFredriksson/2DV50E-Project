// Numerics.cpp : This file contains the 'main' function. Program execution begins and ends there.
//

#include <iostream>
#include <stdlib.h>
#include <time.h>
#include <chrono>

using namespace std;
using namespace std::chrono;

void doNumericComputations();
int execTime = 0;

int main()
{
	high_resolution_clock::time_point startTime = high_resolution_clock::now();
	doNumericComputations();
	high_resolution_clock::time_point endTime = high_resolution_clock::now();
	execTime = duration_cast<milliseconds>(endTime - startTime).count();
	cout << execTime << endl;
}

void doNumericComputations() {
	srand(time(NULL));
	const int SIZE = 100000000;

	for (int i = 0; i < SIZE; i++) {
		int num1 = rand() % 10 + 1;
		int num2 = rand() % 10 + 1;

		if (num1 < num2) {
			num1 = 1;
		}

		if (num2 < num1) {
			num2 = 1;
		}

		if (num1 == num2) {
			num1 = 1;
			num2 = 1;
		}
	}
}

extern "C"
{
	int getExecTime()
	{
		return execTime;
	}
}
