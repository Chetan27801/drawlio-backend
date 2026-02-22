import { Socket, Server } from "socket.io";
import { logger } from "@utils/Logger";

/**
 * Manages all websocket connections
 * - Tracks socket connections
 * - Maps players to sockets
 * - Handles broadcasting
 */
class ConnectionManager {
	private io: Server; // Added to handle native server-wide broadcasting
	private connections: Map<string, Socket>; // socketId -> socket
	private playerSockets: Map<string, string>; // playerId -> socketId
	private socketPlayers: Map<string, string>; // socketId -> playerId

	// Pass your main io instance in when you create the manager
	constructor(io: Server) {
		this.io = io; 
		this.connections = new Map();
		this.playerSockets = new Map();
		this.socketPlayers = new Map();
	}

	/**
	 * Add a new connection
	 */
	addConnection(socket: Socket, playerId: string): void {
		const socketId = socket.id;

		// Store socket
		this.connections.set(socketId, socket);

		// Create bidirectional mappings
		this.playerSockets.set(playerId, socketId);
		this.socketPlayers.set(socketId, playerId);

		logger.info(
			`New connection: Player ${playerId} connected via socket ${socketId}`,
		);

		logger.debug(`Total connections: ${this.connections.size}`);
	}

	/**
	 * Remove a connection
	 */
	removeConnection(socketId: string): void {
		const playerId = this.socketPlayers.get(socketId);

		if (playerId) {
			this.playerSockets.delete(playerId);
			this.socketPlayers.delete(socketId);

			logger.info(
				`Connection removed: Player ${playerId} disconnected via socket ${socketId}`,
			);
		}

		this.connections.delete(socketId);
		logger.debug(`Total connections: ${this.connections.size}`);
	}

	/**
	 * Get socket for a player Id
	 */
	getSocket(playerId: string): Socket | undefined {
		const socketId = this.playerSockets.get(playerId);

		if (!socketId) {
			return undefined;
		}

		return this.connections.get(socketId);
	}

	/**
	 * Get player Id by socket Id
	 */
	getPlayerId(socketId: string): string | undefined {
		const playerId = this.socketPlayers.get(socketId);
		if (!playerId) {
			return undefined;
		}

		return playerId;
	}

	/**
	 * Get socket by Socket Id
	 */
	getSocketById(socketId: string): Socket | undefined {
		const socket = this.connections.get(socketId);
		if (!socket) {
			return undefined;
		}

		return socket;
	}

	/**
	 * Check if player is connected
	 */
	isPlayerConnected(playerId: string): boolean {
		return this.playerSockets.has(playerId);
	}

	/**
	 * Broadcast to all sockets in a room
	 */
	broadcastToRoom(roomId: string, event: string, data: any): void {
		logger.debug(`Broadcasting to room ${roomId}: ${event}`);

		// Native Socket.io method: Efficiently reaches everyone in the room
		this.io.to(roomId).emit(event, data);
	}

	/**
	 * Broadcast to all sockets in a room except one
	 */
	broadcastToRoomExcept(
		roomId: string,
		event: string,
		data: any,
		excludeSocketId: string,
	): void {
		const socket = this.connections.get(excludeSocketId);

		if (!socket) {
			logger.warn(`Cannot broadcast: Socket ${excludeSocketId} not found`);
			return;
		}

		logger.debug(
			`Broadcasting to room ${roomId} except ${excludeSocketId}: ${event}`,
		);

		// Native Socket.io method: Calling .to() on a specific socket
		// automatically broadcasts to the room WHILE excluding that socket
		socket.to(roomId).emit(event, data);
	}

	/**
	 * Emit to a specific player
	 */
	emitToPlayer(playerId: string, event: string, data: any): boolean {
		const socketId = this.playerSockets.get(playerId);

		if (!socketId) {
			logger.warn(`Player ${playerId} not found`, { playerId });
			return false;
		}

		const socket = this.connections.get(socketId);

		if (!socket) {
			logger.warn(`Socket ${socketId} not found`, { socketId });
			return false;
		}

		socket.emit(event, data);
		logger.debug(`Emitted to player ${playerId}: ${event}`);
		return true;
	}

	/**
	 * join a socket to a room
	 */
	joinRoom(socketId: string, roomId: string): void {
		const socket = this.getSocketById(socketId);
		if (!socket) {
			logger.warn(`Socket ${socketId} not found`);
			return;
		}

		socket.join(roomId);
		logger.debug(`Socket ${socketId} joined room ${roomId}`);
	}

	/**
	 * leave a socket from a room
	 */
	leaveRoom(socketId: string, roomId: string): void {
		const socket = this.getSocketById(socketId);

		if (!socket) {
			logger.warn(`Socket ${socketId} not found`);
			return;
		}

		socket.leave(roomId);
		logger.debug(`Socket ${socketId} left room ${roomId}`);
	}

	/**
	 * Get all rooms a socket is in
	 */
	getSocketRooms(socketId: string): string[] {
		const socket = this.connections.get(socketId);
		if (!socket) {
			logger.warn(`Socket ${socketId} not found`);
			return [];
		}

		return Array.from(socket.rooms);
	}

	/**
	 * get connection count
	 */
	getConnectionCount(): number {
		return this.connections.size;
	}

	/**
	 * get all connected players
	 */
	getAllPlayerIds(): string[] {
		return Array.from(this.playerSockets.keys());
	}

	/**
	 * Clear all connections
	 */
	clearAll(): void {
		this.connections.clear();
		this.playerSockets.clear();
		this.socketPlayers.clear();
		logger.info(`Cleared all connections`);
	}
}

export default ConnectionManager;
