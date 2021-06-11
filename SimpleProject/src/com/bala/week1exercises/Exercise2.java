package com.bala.week1exercises;

public class Exercise2 {

	public static void main(String[] args) {

		String input = "NewyorkE";

		int countOfVowels = 0;

		if (input.contains("a") || input.contains("A")) {
			countOfVowels++;
		}
		if (input.contains("e") || input.contains("E")) {
			countOfVowels++;
		}
		if (input.contains("i") || input.contains("I")) {
			countOfVowels++;
		}
		if (input.contains("o") || input.contains("O")) {
			countOfVowels++;
		}
		if (input.contains("u") || input.contains("U")) {
			countOfVowels++;
		}

		System.out.println("Total number of vowels in '" + input + "' is :" + countOfVowels);

	}

}
