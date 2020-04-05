// Fibonacci.cpp : This file contains the 'main' function. Program execution begins and ends there.
//

#include <iostream>

int nthFibonacci(int n);

int main()
{
	const int size = 45;

	for (int i = 1; i <= size; i++) {
		printf("%d: %d\n", i, nthFibonacci(i));
	}
}

int nthFibonacci(int n) {
	if (n <= 0) {
		throw "The value passed to the method must be positive.";
	}

	if (n == 1) {
		return 0;
	}
	else if (n == 2) {
		return 1;
	}

	int sum = nthFibonacci(n - 1) + nthFibonacci(n - 2);

	return sum;
}
