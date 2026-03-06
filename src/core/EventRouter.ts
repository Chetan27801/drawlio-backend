import { Socket } from "socket.io";
import { ClientEvents, ServerEvents } from "@constants/events";
import { ErrorMessages } from "@constants/errors";
import { logger } from "@utils/Logger";
import ConnectionManager from "./ConnectionManager";

import {
	validateCreateRoomData,
	validateJoinRoomData,
	validateDrawData,
	validateMessage,
} from "@utils/validators";
import {
	CreateRoomPayload,
	JoinRoomPayload,
	DrawPayload,
	MessagePayload,
	SelectWordPayload,
} from "../types/events";
import RoomManager from "@game/RoomManager";
import Player from "@game/Player";

/**
 * Routes incoming websocket events
 */

class EventRouter {
	private connectionManager: ConnectionManager;
	private roomManager: RoomManager;

	constructor(connectionManager: ConnectionManager) {
		this.connectionManager = connectionManager;
		this.roomManager = RoomManager.getInstance(connectionManager);
	}

	/**
	 * Setup all event handlers for a socket
	 */

	setupEventHandlers(socket: Socket): void {
		logger.debug(`Setting up event handlers for socket ${socket.id}`);

		//Room events
		socket.on(ClientEvents.CREATE_ROOM, (payload: CreateRoomPayload) =>
			this.handleCreateRoom(socket, payload),
		);
		socket.on(ClientEvents.JOIN_ROOM, (payload: JoinRoomPayload) =>
			this.handleJoinRoom(socket, payload),
		);
		socket.on(ClientEvents.LEAVE_ROOM, () => this.handleLeaveRoom(socket));

		//Game events
		socket.on(ClientEvents.START_GAME, () => this.handleStartGame(socket));
		socket.on(ClientEvents.SELECT_WORD, (payload: SelectWordPayload) =>
			this.handleSelectWord(socket, payload),
		);

		//Drawing events
		socket.on(ClientEvents.DRAW, (payload: DrawPayload) =>
			this.handleDraw(socket, payload),
		);
		socket.on(ClientEvents.CLEAR_CANVAS, () => this.handleClearCanvas(socket));

		//Chat events
		socket.on(ClientEvents.SEND_MESSAGE, (payload: MessagePayload) =>
			this.handleSendMessage(socket, payload),
		);

		//Disconnect event
		socket.on(ClientEvents.DISCONNECT, () => this.handleDisconnect(socket));
	}

	/**
	 * Handle room creation
	 */

	private handleCreateRoom(socket: Socket, payload: CreateRoomPayload): void {
		try {
			logger.info(`[CREATE_ROOM] Socket: ${socket.id}`, payload);

			//validate input

			if (!validateCreateRoomData(payload)) {
				this.sendError(socket, ErrorMessages.INVALID_INPUT);
				return;
			}

			const data = payload as CreateRoomPayload;
			const playerId = this.connectionManager.getPlayerId(socket.id);

			if (!playerId) {
				this.sendError(socket, ErrorMessages.PLAYER_NOT_FOUND);
				return;
			}

			//check if player is already in a room
			const existingRoom = this.roomManager.findPlayerRoom(playerId);

			if (existingRoom) {
				this.sendError(socket, ErrorMessages.PLAYER_ALREADY_IN_ROOM);
				return;
			}

			//create room
			const room = this.roomManager.createRoom(
				playerId,
				data.playerName,
				data.settings,
			);

			//send response
			socket.emit(ServerEvents.ROOM_CREATED, room.getRoomData());

			logger.info(`[CREATE_ROOM] Room created successfully`);
		} catch (error) {
			logger.error("Error handling CREATE_ROOM event", error);
			this.sendError(socket, ErrorMessages.CONNECTION_ERROR);
		}
	}

	/**
	 * Handle room join
	 */

	private handleJoinRoom(socket: Socket, payload: JoinRoomPayload): void {
		try {
			logger.info(`[JOIN_ROOM] Socket: ${socket.id}`, payload);

			//validate input

			if (!validateJoinRoomData(payload)) {
				this.sendError(socket, ErrorMessages.INVALID_INPUT);
				return;
			}

			const data = payload as JoinRoomPayload;

			const playerId = this.connectionManager.getPlayerId(socket.id);

			if (!playerId) {
				this.sendError(socket, ErrorMessages.PLAYER_NOT_FOUND);
				return;
			}

			//find room

			const room = this.roomManager.getRoomByCode(data.code);
			if (!room) {
				this.sendError(socket, ErrorMessages.ROOM_NOT_FOUND);
				return;
			}

			//create player
			const player = new Player(playerId, socket.id, data.playerName);

			//add to room
			const added = room.addPlayer(player);

			if (!added) {
				this.sendError(socket, ErrorMessages.ROOM_FULL);
				return;
			}

			//send response
			socket.emit(ServerEvents.ROOM_JOINED, room.getRoomData());

			logger.info(`[JOIN_ROOM] Player ${playerId} joined room ${room.code}`);
		} catch (error) {
			logger.error("Error handling JOIN_ROOM event", error);
			this.sendError(socket, ErrorMessages.CONNECTION_ERROR);
		}
	}

	/**
	 * Handle room leave
	 */

	private handleLeaveRoom(socket: Socket): void {
		try {
			logger.info(`[LEAVE_ROOM] Socket: ${socket.id}`);

			const playerId = this.connectionManager.getPlayerId(socket.id);

			if (!playerId) {
				this.sendError(socket, ErrorMessages.PLAYER_NOT_FOUND);
				return;
			}

			const room = this.roomManager.findPlayerRoom(playerId);
			if (!room) {
				this.sendError(socket, ErrorMessages.PLAYER_NOT_IN_ROOM);
				return;
			}

			//remove from room
			room.removePlayer(playerId);

			logger.info(`[LEAVE_ROOM] Player ${playerId} left room ${room.code}`);
			this.roomManager.cleanupEmptyRooms();
		} catch (error) {
			logger.error("Error handling LEAVE_ROOM event", error);
			this.sendError(socket, ErrorMessages.CONNECTION_ERROR);
		}
	}

	/**
	 * Handle game start
	 */

	private handleStartGame(socket: Socket): void {
		try {
			logger.info(`[START_GAME] Socket: ${socket.id}`);

			const playerId = this.connectionManager.getPlayerId(socket.id);

			if (!playerId) {
				this.sendError(socket, ErrorMessages.PLAYER_NOT_FOUND);
				return;
			}

			const room = this.roomManager.findPlayerRoom(playerId);

			if (!room) {
				this.sendError(socket, ErrorMessages.PLAYER_NOT_IN_ROOM);
				return;
			}

			//check if player is host
			if (!room.isHost(playerId)) {
				this.sendError(socket, ErrorMessages.NOT_HOST);
				return;
			}

			//check if game can start
			if (!room.canStartGame()) {
				this.sendError(socket, ErrorMessages.NOT_ENOUGH_PLAYERS);
				return;
			}

			//start game
			room.startGame();

			logger.info(`[START_GAME] Game started for player ${playerId}`);
		} catch (error) {
			logger.error("Error handling START_GAME event", error);
			this.sendError(socket, ErrorMessages.CONNECTION_ERROR);
		}
	}

	/**
	 * Handle word selection
	 */

	private handleSelectWord(socket: Socket, payload: SelectWordPayload): void {
		try {
			logger.info(`[SELECT_WORD] Socket: ${socket.id}`, payload);

			const playerId = this.connectionManager.getPlayerId(socket.id);
			if (!playerId) {
				this.sendError(socket, ErrorMessages.PLAYER_NOT_FOUND);
				return;
			}

			const room = this.roomManager.findPlayerRoom(playerId);
			if (!room) {
				this.sendError(socket, ErrorMessages.PLAYER_NOT_IN_ROOM);
				return;
			}

			const data = payload as SelectWordPayload;
			const gameEngine = room.getGameEngine();

			//let game engine handle word selection
			gameEngine.selectWord(data.word, playerId);

			logger.info(`[SELECT_WORD] Word selected by player ${playerId}`);
		} catch (error) {
			logger.error("Error handling SELECT_WORD event", error);
			this.sendError(socket, ErrorMessages.CONNECTION_ERROR);
		}
	}

	private handleDraw(socket: Socket, payload: DrawPayload): void {
		try {
			//validate input
			if (!validateDrawData(payload)) {
				this.sendError(socket, ErrorMessages.INVALID_INPUT);
				return;
			}

		const playerId = this.connectionManager.getPlayerId(socket.id);
		if (!playerId) {
			this.sendError(socket, ErrorMessages.PLAYER_NOT_FOUND);
			return;
		}

		const room = this.roomManager.findPlayerRoom(playerId!);
			if (!room) {
				this.sendError(socket, ErrorMessages.PLAYER_NOT_IN_ROOM);
				return;
			}

			const data = payload as DrawPayload;
			const drawingBoard = room.getDrawingBoard();

			//add stroke

			const stroke = {
				...data,
				timestamp: Date.now(),
			};

			const added = drawingBoard.addStroke(stroke, playerId!);

			if (added) {
				//broadcast to all except drawer
				room.broadcastExcept(playerId!, ServerEvents.DRAW_DATA, stroke);
			} else {
				this.sendError(socket, ErrorMessages.NOT_DRAWER);
			}
			logger.info(`[DRAW] Stroke added by ${playerId}`);
		} catch (error) {
			logger.error("Error handling DRAW event", error);
			this.sendError(socket, ErrorMessages.CONNECTION_ERROR);
		}
	}

	/**
	 * Handle clear canvas
	 */

	private handleClearCanvas(socket: Socket): void {
		try {
			logger.info(`[CLEAR_CANVAS] Socket: ${socket.id}`);

			const playerId = this.connectionManager.getPlayerId(socket.id);
			if (!playerId) {
				this.sendError(socket, ErrorMessages.PLAYER_NOT_FOUND);
				return;
			}

			const room = this.roomManager.findPlayerRoom(playerId!);
			if (!room) {
				this.sendError(socket, ErrorMessages.PLAYER_NOT_IN_ROOM);
				return;
			}

			const drawingBoard = room.getDrawingBoard();

			//check if player is drawer
			if (!drawingBoard.isDrawer(playerId!)) {
				this.sendError(socket, ErrorMessages.NOT_DRAWER);
				return;
			}

			drawingBoard.clearStrokes();

			//broadcast to all except drawer
			room.broadcast(ServerEvents.CANVAS_CLEARED, {});

			logger.info(`[CLEAR_CANVAS] Canvas cleared for player ${playerId}`);
		} catch (error) {
			logger.error("Error handling CLEAR_CANVAS event", error);
			this.sendError(socket, ErrorMessages.CONNECTION_ERROR);
		}
	}

	/**
	 * Handle chat message / guess
	 */

	private handleSendMessage(socket: Socket, payload: MessagePayload): void {
		try {
			logger.info(`[SEND_MESSAGE] Socket: ${socket.id}`, payload);

			const playerId = this.connectionManager.getPlayerId(socket.id);
			if (!playerId) {
				this.sendError(socket, ErrorMessages.PLAYER_NOT_FOUND);
				return;
			}

			const data = payload as MessagePayload;

			//validate input
			if (!validateMessage(data)) {
				this.sendError(socket, ErrorMessages.INVALID_INPUT);
				return;
			}

			const room = this.roomManager.findPlayerRoom(playerId!);
			if (!room) {
				this.sendError(socket, ErrorMessages.PLAYER_NOT_IN_ROOM);
				return;
			}

			const gameEngine = room.getGameEngine();
			gameEngine.handleGuess(playerId!, data.message);

			//if not correct, broadcast as chat message
			//correct guesses are handled by game engine
		} catch (error) {
			logger.error("Error handling SEND_MESSAGE event", error);
			this.sendError(socket, ErrorMessages.CONNECTION_ERROR);
		}
	}

	/**
	 * Handle disconnect
	 */

	private handleDisconnect(socket: Socket): void {
		try {
			logger.info(`[DISCONNECT] Socket: ${socket.id}`);

			const playerId = this.connectionManager.getPlayerId(socket.id);

			if (playerId) {
				const room = this.roomManager.findPlayerRoom(playerId!);
				if (room) {
					room.removePlayer(playerId!);
					this.roomManager.cleanupEmptyRooms();
					logger.info(
						`[DISCONNECT] Player ${playerId} removed from room ${room.code}`,
					);
				}
			}

			//remove from connection manager
			this.connectionManager.removeConnection(socket.id);
		} catch (error) {
			logger.error("Error handling DISCONNECT event", error);
		}
	}

	/**
	 * Send error response to client
	 */
	private sendError(socket: Socket, message: string, code?: string): void {
		socket.emit(ServerEvents.ERROR, {
			message,
			code,
			timestamp: new Date().toISOString(),
		});

		logger.error(`[ERROR] ${message} (Code: ${code})`);
	}
}

export default EventRouter;
