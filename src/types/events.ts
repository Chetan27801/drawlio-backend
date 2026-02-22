import { Difficulty } from "@constants/game";

/**
 * Event-payload types definitions
 */

export interface CreateRoomPayload {
	playerName: string;
	settings?: {
		maxPlayers?: number;
		roundsPerGame?: number;
		drawTime?: number;
		difficulty?: Difficulty;
	};
}

export interface JoinRoomPayload {
	code: string;
	playerName: string;
}

export interface DrawPayload {
	x: number;
	y: number;
	prevX: number;
	prevY: number;
	color: string;
	width: number;
}

export interface MessagePayload {
	message: string;
}

export interface ErrorPayload {
	message: string;
	code?: string;
}
