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

/**
 * Routes incoming websocket events
 */

class EventRouter {
	private connectionManager: ConnectionManager;

	constructor(connectionManager: ConnectionManager) {
		this.connectionManager = connectionManager;
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
		socket.on(ClientEvents.CLEAN_CANVAS, () => this.handleClearCanvas(socket));

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

			//TODO: Day 5 - Call RoomManager.createRoom()

			//For now, send mock response
			const mockRoomId = "mock_room_id";
			this.connectionManager.joinRoom(socket.id, mockRoomId);

			socket.emit(ServerEvents.ROOM_CREATED, {
				roomId: mockRoomId,
				code: "ABC123",
				hostId: socket.id,
				playersName: data.playerName,
			});

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

			//TODO: Day 5 - Call RoomManager.getRoomByCode()
			//For now, send mock response
			const mockRoomId = "mock_room_id";
			this.connectionManager.joinRoom(socket.id, mockRoomId);

			socket.emit(ServerEvents.ROOM_JOINED, {
				roomId: mockRoomId,
				code: data.code,
				playerName: data.playerName,
				players: [],
			});

			logger.info(`[JOIN_ROOM] Room joined successfully`);
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

			//TODO: Day 5 - Call RoomManager.removePlayer()
			//For now, send mock response
			logger.info(`[LEAVE_ROOM] Player ${playerId} left room`);
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

			//TODO: Day 5 - Call RoomManager.startGame()
			//For now, send mock response
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

			//TODO: Day 5 - Call RoomManager.selectWord()
			//For now, send mock response
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
			}

			const data = payload as DrawPayload;

			//TODO: Day 5 - Call RoomManager.addStroke()
			//forn now, broadcast to test

			const rooms = this.connectionManager.getSocketRooms(socket.id);
			rooms.forEach((roomId) => {
				if (roomId !== socket.id) {
					this.connectionManager.broadcastToRoomExcept(
						roomId,
						ServerEvents.DRAW_DATA,
						data,
						socket.id,
					);
				}
			});

			logger.debug(`[DRAW] data from ${playerId}`);
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

			//TODO: Day 5 - Call RoomManager.clearC()
			//For now, send mock response
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

			//TODO: Day 5 - Call RoomManager.sendMessage()
			//For now, send mock response
			const mockRoomId = "mock_room_id";
			this.connectionManager.broadcastToRoom(mockRoomId, ServerEvents.MESSAGE, data);
			logger.info(
				`[SEND_MESSAGE] Message sent by player ${playerId}: ${data.message}`,
			);
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
				//TODO: Day 5 - Handle player disconnect in game
			}

			logger.info(`[DISCONNECT] Player ${playerId} disconnected`);
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
