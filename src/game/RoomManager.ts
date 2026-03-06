import { generateRoomCode } from "@utils/helpers";
import { gameConfig } from "@config/game.config";
import { logger } from "@utils/Logger";
import GameRoom from "./GameRoom";
import ConnectionManager from "@core/ConnectionManager";
import redisService from "@services/RedisService";
import { RoomState } from "@constants/game";

/**
 * Room Manager (Singleton)
 * Manages all active game rooms
 */

class RoomManager {
	private static instance: RoomManager;
	private rooms: Map<string, GameRoom> = new Map();
	private roomCodes: Map<string, string> = new Map(); // code → roomId
	private connectionManager: ConnectionManager;

	private constructor(connectionManager: ConnectionManager) {
		this.connectionManager = connectionManager;
		logger.info("RoomManager initialized");
	}

	/**
	 * Get singleton instance
	 */
	static getInstance(connectionManager?: ConnectionManager): RoomManager {
		if (!RoomManager.instance) {
			if (!connectionManager) {
				throw new Error(
					"ConnectionManager required for RoomManager initialization",
				);
			}
			RoomManager.instance = new RoomManager(connectionManager);
		}
		return RoomManager.instance;
	}

	/**
	 * Create a new room
	 */
	createRoom(hostPlayerId: string, hostName: string, settings?: any): GameRoom {
		// Generate unique room code
		const code = this.generateUniqueCode();

		// Create room
		const room = new GameRoom(
			hostPlayerId,
			hostName,
			code,
			this.connectionManager,
			settings,
		);

		// Store room
		this.rooms.set(room.id, room);
		this.roomCodes.set(code, room.id);

		// Save room code mapping to Redis
		redisService.saveRoomCode(code, room.id);

		logger.info(
			`Room created: ${code} (${room.id}) by ${hostName}. Total rooms: ${this.rooms.size}`,
		);

		return room;
	}

	/**
	 * Get room by ID
	 */
	getRoom(roomId: string): GameRoom | undefined {
		return this.rooms.get(roomId);
	}

	/**
	 * Get room by code
	 */
	getRoomByCode(code: string): GameRoom | undefined {
		const roomId = this.roomCodes.get(code.toUpperCase());
		if (!roomId) return undefined;
		return this.rooms.get(roomId);
	}

	/**
	 * Delete a room
	 */
	async deleteRoom(roomId: string): Promise<void> {
		const room = this.rooms.get(roomId);
		if (!room) {
			logger.warn(`Cannot delete room: ${roomId} not found`);
			return;
		}

		// Remove from maps
		this.rooms.delete(roomId);
		this.roomCodes.delete(room.code);

		// Delete from Redis
		try {
			await redisService.deleteRoom(roomId);
			await redisService.deleteRoomCode(room.code);
		} catch (error) {
			logger.error(`Failed to delete room ${roomId} from Redis:`, error);
		}

		logger.info(
			`Room deleted: ${room.code} (${roomId}). Remaining rooms: ${this.rooms.size}`,
		);
	}

	/**
	 * Generate unique room code
	 */
	private generateUniqueCode(): string {
		let code: string;
		let attempts = 0;
		const maxAttempts = 100;

		do {
			code = generateRoomCode(gameConfig.room.codeLength);
			attempts++;

			if (attempts >= maxAttempts) {
				logger.error("Failed to generate unique room code after 100 attempts");
				throw new Error("Could not generate unique room code");
			}
		} while (this.roomCodes.has(code));

		return code;
	}

	/**
	 * Get room count
	 */
	getRoomCount(): number {
		return this.rooms.size;
	}

	/**
	 * Get all rooms
	 */
	getAllRooms(): GameRoom[] {
		return Array.from(this.rooms.values());
	}

	/**
	 * Get all room codes
	 */
	getAllRoomCodes(): string[] {
		return Array.from(this.roomCodes.keys());
	}

	/**
	 * Find player's current room
	 */
	findPlayerRoom(playerId: string): GameRoom | undefined {
		for (const room of this.rooms.values()) {
			if (room.getPlayer(playerId)) {
				return room;
			}
		}
		return undefined;
	}

	/**
	 * Clean up empty rooms
	 */
	async cleanupEmptyRooms(): Promise<void> {
		const emptyRooms: string[] = [];

		for (const [roomId, room] of this.rooms.entries()) {
			if (room.getPlayerCount() === 0) {
				emptyRooms.push(roomId);
			}
		}

		// Delete empty rooms
		for (const roomId of emptyRooms) {
			await this.deleteRoom(roomId);
		}

		if (emptyRooms.length > 0) {
			logger.info(`Cleaned up ${emptyRooms.length} empty room(s)`);
		}
	}

	/**
	 * Get stats
	 */
	getStats(): {
		totalRooms: number;
		waitingRooms: number;
		playingRooms: number;
		totalPlayers: number;
	} {
		let waitingRooms = 0;
		let playingRooms = 0;
		let totalPlayers = 0;

		for (const room of this.rooms.values()) {
			const state = room.getState();
			if (state === RoomState.WAITING) waitingRooms++;
			if (state === RoomState.PLAYING) playingRooms++;
			totalPlayers += room.getPlayerCount();
		}

		return {
			totalRooms: this.rooms.size,
			waitingRooms,
			playingRooms,
			totalPlayers,
		};
	}
}

export default RoomManager;
