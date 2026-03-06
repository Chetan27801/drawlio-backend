import fs from "fs";
import path from "path";
import { Difficulty } from "@constants/game";
import { getRandomElements } from "@utils/helpers";
import { logger } from "@utils/Logger";

/**
 * Word bank manager
 * Handles word selection and management
 */

interface WordData {
	easy: string[];
	medium: string[];
	hard: string[];
}

class WordBank {
	private words: Map<Difficulty, string[]> = new Map();
	private usedWords: Set<string> = new Set();
	private isLoaded: boolean = false;

	constructor() {
		this.words.set(Difficulty.EASY, []);
		this.words.set(Difficulty.MEDIUM, []);
		this.words.set(Difficulty.HARD, []);
	}

	/**
	 * Load words from JSON file
	 */

	async loadWords(): Promise<void> {
		try {
			const wordsPath = path.join(
				process.cwd(),
				"data",
				"wordData",
				"word.json",
			);
			const fileContent = fs.readFileSync(wordsPath, "utf-8");
			const wordData: WordData = JSON.parse(fileContent);

			//Load words by difficulty
			this.words.set(Difficulty.EASY, wordData.easy || []);
			this.words.set(Difficulty.MEDIUM, wordData.medium || []);
			this.words.set(Difficulty.HARD, wordData.hard || []);

			this.isLoaded = true;
			logger.info("Words loaded successfully", {
				easy: this.words.get(Difficulty.EASY)?.length,
				medium: this.words.get(Difficulty.MEDIUM)?.length,
				hard: this.words.get(Difficulty.HARD)?.length,
			});
		} catch (error) {
			logger.error("Failed to load words:", error);
			throw new Error("Failed to load words");
		}
	}

	/**
	 * Get random words for selection
	 */

	getRandomWords(
		count: number,
		difficulty: Difficulty = Difficulty.MEDIUM,
	): string[] {
		if (!this.isLoaded) {
			logger.warn("Words not loaded, loading words...");
			return [];
		}

		const wordList = this.words.get(difficulty) || [];

		if (wordList.length === 0) {
			logger.warn(`No words found for difficulty: ${difficulty}`);
			return [];
		}

		const availableWords = wordList.filter((word) => !this.usedWords.has(word.toLowerCase()));

		//if all words used, reset
		if (availableWords.length < count) {
			logger.warn(`Not enough words available for difficulty: ${difficulty}`);
			this.resetUsedWords();
			return getRandomElements(wordList, count);
		}

		const selectedWords = getRandomElements(availableWords, count);

		logger.debug(
			`Selected ${selectedWords.length} words for difficulty: ${difficulty}`,
		);
		return selectedWords;
	}

	/**
	 * Mark word as used
	 */

	markWordAsUsed(word: string): void {
		this.usedWords.add(word.toLowerCase());
		logger.debug(`Word ${word} marked as used`);
	}

	/**
	 * Reset used words
	 */

	resetUsedWords(): void {
		const previousCount = this.usedWords.size;
		this.usedWords.clear();
		logger.debug(`All ${previousCount} used words reset`);
	}

	/**
	 * validate if word exists in bank
	 */

	validateWord(word: string, difficulty?: Difficulty): boolean {
		const nomalizedWord = word.toLowerCase().trim();

		if (difficulty) {
			const wordList = this.words.get(difficulty) || [];
			return wordList.includes(nomalizedWord);
		}

		//check all difficulties
		for (const wordList of this.words.values()) {
			if (wordList.includes(nomalizedWord)) {
				return true;
			}
		}
		return false;
	}

	/**
	 * Get word count by difficulty
	 */

	getWordCount(difficulty: Difficulty): number {
		return this.words.get(difficulty)?.length || 0;
	}

	/**
	 * Get total word count
	 */
	getTotalWordCount(): number {
		let total = 0;
		for (const wordList of this.words.values()) {
			total += wordList.length;
		}
		return total;
	}

	/**
	 * Get used word count
	 */

	getUsedWordCount(): number {
		return this.usedWords.size;
	}

	/**
	 * Check if word bank is loaded
	 */

	isWordBankLoaded(): boolean {
		return this.isLoaded;
	}

	/**
	 * Get all words for a difficulty (for testing)
	 */

	getAllWords(difficulty: Difficulty): string[] {
		return [...(this.words.get(difficulty) || [])];
	}
}

export default WordBank;
