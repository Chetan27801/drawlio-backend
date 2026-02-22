/**
 * Player-related type definitions
 */

export interface IPlayer {
	id: string;
	socketId: string;
	name: string;
	score: number;
	hasGuessed: boolean;
	isDrawing: boolean;
	isConnected: boolean;
	joinedAt: Date;
}

export interface PlayerData {
	id: string;
	name: string;
	score: number;
	hasGuessed: boolean;
	isDrawing: boolean;
	isHost: boolean;
}
