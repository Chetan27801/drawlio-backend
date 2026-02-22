/**
 * Helper functions
 */

import { GAME_CONSTANTS } from "@constants/game";

/**
 * Generate a random room code
 */

export function generateRoomCode(length: number = 6): string {
	const char = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
	let code = "";
	for (let i = 0; i < length; i++) {
		code += char.charAt(Math.floor(Math.random() * char.length));
	}
	return code;
}

/**
 * Generate unique ID
 */

export function generateId(): string {
	return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Shuffle array (Fisher-Yates algorithm)
 */

export function shuffleArray<T>(array: T[]): T[] {
	const shuffled = [...array];
	for (let i = shuffled.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
	}
	return shuffled;
}

/**
 * Delay execution
 */

export function delay(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Sanitize player name
 */

export function sanitizePlayerName(name: string): string {
	return name.trim().slice(0, 20); //max 20 characters
}

/**
 * Format time (seconds to MM:SS)
 */

export function formatTime(seconds: number): string {
	const minutes = Math.floor(seconds / 60);
	const secs = seconds % 60;
	return `${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Get Random elements from array
 */

export function getRandomElements<T>(array: T[], count: number): T[] {
	const shuffled = shuffleArray(array);
	return shuffled.slice(0, Math.min(count, array.length));
}

/**
 * Sleep for a given duration
 */

export const sleep = (ms: number): Promise<void> => {
	return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * Validate room code
 */

export function isValidRoomCode(code: string): boolean {
	return (
		code.length === GAME_CONSTANTS.ROOM_CODE_LENGTH &&
		/^[A-Z0-9]+$/.test(code) &&
		code.toUpperCase() === code
	);
}
