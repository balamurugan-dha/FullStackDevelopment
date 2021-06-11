package com.bala.week1exercises;

public class Exercise3 {

	public static void main(String[] args) {
		int[] input = { 8, 3, 9, 17, 11, 90, 1 };
		int temp;

		for (int index = 0; index < input.length - 1; index++) {
			for (int j = 0; j < input.length - 1; j++) {
				if (input[j] > input[j + 1]) {
					temp = input[j];
					input[j] = input[j + 1];
					input[j + 1] = temp;
				}
			}
		}

		System.out.println("Lowest number: " + input[0]);
		System.out.println("Highest number: " + input[input.length-1]);

	}

}
