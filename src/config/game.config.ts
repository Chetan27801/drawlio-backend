import dotenv from "dotenv";
import { GAME_CONSTANTS, DEFAULT_GAME_SETTINGS } from "@constants/game";

dotenv.config();

/**
 * Game configuration
 */

export const gameConfig = {
	room: {
		maxPlayers: parseInt(
			process.env.MAX_PLAYERS_PER_ROOM || String(GAME_CONSTANTS.MAX_PLAYERS),
			10,
		),
		minPlayers: GAME_CONSTANTS.MIN_PLAYERS,
		codeLength: parseInt(
			process.env.ROOM_CODE_LENGTH || String(GAME_CONSTANTS.ROOM_CODE_LENGTH),
			10,
		),
	},

	game: {
		defaultRounds: parseInt(
			process.env.DEFAULT_ROUNDS || String(GAME_CONSTANTS.DEFAULT_ROUNDS),
			10,
		),
		defaultDrawTime: parseInt(
			process.env.DEFAULT_DRAW_TIME || String(GAME_CONSTANTS.DEFAULT_DRAW_TIME),
			10,
		),
		wordChoiceCount: GAME_CONSTANTS.WORD_CHOICE_COUNT,
		wordSelectionTime: GAME_CONSTANTS.WORD_SELECTION_TIME,
	},

	scoring: {
		basePoints: GAME_CONSTANTS.BASE_POINTS,
		decayPerSecond: GAME_CONSTANTS.POINTS_DECAY_PER_SECOND,
		minPoints: GAME_CONSTANTS.MIN_POINTS,
		drawerBonusPercent: GAME_CONSTANTS.DRAWER_BONUS_PERCENT,
	},

	canvas: {
		width: GAME_CONSTANTS.CANVAS_WIDTH,
		height: GAME_CONSTANTS.CANVAS_HEIGHT,
	},

	defaultSettings: DEFAULT_GAME_SETTINGS,
};
