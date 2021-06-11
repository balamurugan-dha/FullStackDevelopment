package com.bala.week1exercises;

public class Execise1 {

	public static void main(String[] args) {
		int num1 = Integer.parseInt(args[0]);
		int num2 = Integer.parseInt(args[1]);
		System.out.println("Arithmetic operations of " + num1 + " and " + num2);
		System.out.println("Addition: " + add(num1, num2));
		System.out.println("Subtraction: " + subtract(num1, num2));
		System.out.println("Multiplication: " + multiply(num1, num2));
		System.out.println("Division: " + divide(num1, num2));

	}

	public static int add(int a, int b) {
		return a + b;
	}

	public static int subtract(int a, int b) {
		return a - b;
	}

	public static int multiply(int a, int b) {
		return a * b;
	}

	public static double divide(int a, int b) {
		return a / b;
	}

}
