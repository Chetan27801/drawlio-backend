/**
 * WebSocket event names
 * Client -> Server
 * Server -> Client
 */

//Client -> Server Events

export enum ClientEvents {
	CREATE_ROOM = "create_room",
	JOIN_ROOM = "join_room",
	LEAVE_ROOM = "leave_room",
	START_GAME = "start_game",
	SELECT_WORD = "select_word",
	DRAW = "draw",
	CLEAR_CANVAS = "clear_canvas",
	SEND_MESSAGE = "send_message",
	DISCONNECT = "disconnect",
}

//Server -> Client Events

export enum ServerEvents {
	ROOM_CREATED = "room_created",
	ROOM_JOINED = "room_joined",
	PLAYER_JOINED = "player_joined",
	PLAYER_LEFT = "player_left",
	GAME_STARTED = "game_started",
	ROUND_STARTED = "round_started",
	TURN_STARTED = "turn_started",
	WORD_OPTIONS = "word_options",
	DRAW_DATA = "draw_data",
	CANVAS_CLEARED = "canvas_cleared",
	MESSAGE = "message",
	CORRECT_GUESS = "correct_guess",
	TIMER_UPDATE = "timer_update",
	ROUND_ENDED = "round_ended",
	TURN_ENDED = "turn_ended",
	GAME_ENDED = "game_ended",
	SCORE_UPDATE = "score_update",
	ERROR = "error",
}
