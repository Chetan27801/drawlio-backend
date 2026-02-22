/**
 * Error messages
 */

export const ErrorMessages = {
	// Room errors
	ROOM_NOT_FOUND: "Room not found",
	ROOM_FULL: "Room is full",
	ROOM_ALREADY_STARTED: "Game has already started",
	INVALID_ROOM_CODE: "Invalid room code",

	// Player errors
	PLAYER_NOT_FOUND: "Player not found",
	PLAYER_ALREADY_IN_ROOM: "Player is already in a room",
	PLAYER_NOT_IN_ROOM: "Player is not in this room",
	NOT_HOST: "Only the host can perform this action",

	// Game errors
	GAME_NOT_STARTED: "Game has not started",
	NOT_ENOUGH_PLAYERS: "Not enough players to start game",
	INVALID_WORD_SELECTION: "Invalid word selection",
	NOT_YOUR_TURN: "It is not your turn to draw",
	ALREADY_GUESSED: "You have already guessed correctly",

	// Drawing errors
	INVALID_DRAW_DATA: "Invalid drawing data",
	NOT_DRAWER: "Only the current drawer can draw",

	// Connection errors
	CONNECTION_ERROR: "Connection error",
	REDIS_ERROR: "Redis connection error",

	// Validation errors
	INVALID_INPUT: "Invalid input data",
	INVALID_PLAYER_NAME: "Invalid player name",
};
