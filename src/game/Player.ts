import { IPlayer, PlayerData } from "../types/player";
import { logger } from "@utils/Logger";

/**
 * Player entity
 * Represents a single player in the game
 */

class Player implements IPlayer {
	readonly id: string;
	socketId: string;
	name: string;
	score: number;
	hasGuessed: boolean;
	isDrawing: boolean;
	isConnected: boolean;
	joinedAt: Date;

	constructor(id: string, socketId: string, name: string) {
		this.id = id;
		this.socketId = socketId;
		this.name = name;
		this.score = 0;
		this.hasGuessed = false;
		this.isDrawing = false;
		this.isConnected = true;
		this.joinedAt = new Date();

		logger.debug(`Player created: ${this.id} (${this.name})`);
	}

	/**
	 * Add points to player's score
	 */

	addPoints(points: number): void {
		if (points < 0) {
			logger.warn(`Attempted to add negative points to player ${this.id}`);
			return;
		}

		const oldScore = this.score;
		this.score += points;
		logger.debug(
			`Player ${this.id} gained ${points} points. New score: ${this.score} (was ${oldScore})`,
		);
	}

	/**
	 * Reset round-specific state
	 */

	resetRoundState(): void {
		this.hasGuessed = false;
		this.isDrawing = false;
		logger.debug(`Player ${this.id} round state reset`);
	}

	/**
	 * Set drawing state
	 */

	setDrawing(isDrawing: boolean): void {
		this.isDrawing = isDrawing;
		if (isDrawing) {
			logger.debug(`Player ${this.id} is now drawing`);
		}
	}

	/**
	 * Set guessed state
	 */

	setGuessed(hasGuessed: boolean): void {
		this.hasGuessed = hasGuessed;
		if (hasGuessed) {
			logger.debug(`Player ${this.id} has guessed the word`);
		}
	}

	/**
	 * Mark player as disconnected
	 */

	markDisconnected(): void {
		this.isConnected = false;
		logger.debug(`Player ${this.id} marked as disconnected`);
	}

	/**
	 * Get player data for client
	 */

	toPlayerData(isHost: boolean): PlayerData {
		return {
			id: this.id,
			name: this.name,
			score: this.score,
			hasGuessed: this.hasGuessed,
			isDrawing: this.isDrawing,
			isHost,
		};
	}

	/**
	 * Serialize player to JSON
	 */

	toJSON(): object {
		return {
			id: this.id,
			socketId: this.socketId,
			name: this.name,
			score: this.score,
			hasGuessed: this.hasGuessed,
			isDrawing: this.isDrawing,
			isConnected: this.isConnected,
			joinedAt: this.joinedAt.toISOString(),
		};
	}
}

export default Player;
