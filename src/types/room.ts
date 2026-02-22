
import { RoomState, Difficulty } from "@constants/game";
import { PlayerData } from "./player";

/**
 * Room-related type definitions
 */

export interface GameSettings {
	maxPlayers: number;
	roundsPerGame: number;
	drawTime: number;
	difficulty: Difficulty;
}

export interface RoomData {
	id: string;
	code: string;
	hostId: string;
	players: PlayerData[];
	state: RoomState;
	settings: GameSettings;
	currentRound: number;
	totalRounds: number;
	playerCount: number;
	maxPlayers: number;
}

export interface CreateRoomData {
	playerName: string;
	settings?: Partial<GameSettings>;
}

export interface JoinRoomData {
	code: string;
	playerName: string;
}
