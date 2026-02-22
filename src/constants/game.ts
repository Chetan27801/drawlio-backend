/**
 * Game-related constants
 */

export enum RoomState {
	WAITING = "waiting",
	PLAYING = "playing",
	ENDED = "ended",
}

export enum Difficulty {
	EASY = "easy",
	MEDIUM = "medium",
	HARD = "hard",
}

export const GAME_CONSTANTS = {
	//Room settings
	MIN_PLAYERS: 2,
	MAX_PLAYERS: 8,
	ROOM_CODE_LENGTH: 6,

	//Game settings
	DEFAULT_ROUNDS: 3,
	DEFAULT_DRAW_TIME: 60,
	WORD_CHOICE_COUNT: 3,

	//Scoring
	BASE_POINTS: 100,
	POINTS_DECAY_PER_SECOND: 5,
	MIN_POINTS: 50,
	DRAWER_BONUS_PERCENT: 0.25,

	//Timers
	WORD_SELECTION_TIME: 15,
	ROUND_TRANSITION_TIME: 5,
	TURN_TRANSITION_TIME: 3,

	// Drawing
	CANVAS_WIDTH: 800,
	CANVAS_HEIGHT: 600,

	//Hints
	HINT_INTERVALS: [20, 40], //seconds
};

export const DEFAULT_GAME_SETTINGS = {
	maxPlayers: GAME_CONSTANTS.MAX_PLAYERS,
	roundsPerGame: GAME_CONSTANTS.DEFAULT_ROUNDS,
	drawTime: GAME_CONSTANTS.DEFAULT_DRAW_TIME,
	difficulty: Difficulty.EASY,
};
