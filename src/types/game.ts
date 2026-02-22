import { RoomState } from "@constants/game";
import { PlayerData } from "./player";

/**
 *
 * Game-related type definitions
 */

export interface DrawStroke {
	x: number;
	y: number;
	prevX: number;
	prevY: number;
	color: string;
	width: number;
	timestamp: number;
}

export interface GameState {
	roomId: string;
	code: string;
	state: RoomState;
	currentRound: number;
	totalRounds: number;
	currentDrawerId: string | null;
	currentWord: string | null;
	timeRemaining: number;
	players: PlayerData[];
}

export interface GuessResult {
	isCorrect: boolean;
	points?: number;
	message: string;
}

export interface RoundResult {
	word: string;
	scores: { playerId: string; points: number }[];
	drawerId: string;
}
