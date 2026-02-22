import Redis from "ioredis";
import { redisConfig } from "@config/redis.config";
import { logger } from "@utils/Logger";
import { RoomData } from "../types/room";

/**
 * Redis Service for data persistence and caching
 */

class RedisService {
	private client: Redis;
	private isConnected: boolean = false;

	constructor() {
		this.client = new Redis({
			host: redisConfig.host,
			port: redisConfig.port,
			password: redisConfig.password,
			db: redisConfig.db,
			retryStrategy: redisConfig.retryStrategy,
			maxRetriesPerRequest: redisConfig.maxRetriesPerRequest,
			enableReadyCheck: redisConfig.enableReadyCheck,
		});

		this.setupEventHandlers();
	}

	/**
	 * Setup Redis Event Handlers
	 */

	private setupEventHandlers(): void {
		this.client.on("connect", () => {
			logger.info("Connected to Redis");
		});

		this.client.on("ready", () => {
			this.isConnected = true;
			logger.info("Redis is ready");
		});

		this.client.on("error", (error) => {
			logger.error("Redis connection error", error);
			this.isConnected = false;
		});

		this.client.on("reconnecting", () => {
			logger.warn("Redis is reconnecting...");
		});

		this.client.on("close", () => {
			logger.info("Redis connection closed");
			this.isConnected = false;
		});
	}

	/**
	 * Connect to Redis
	 */

	async connect(): Promise<void> {
		try {
			await this.client.ping();
			this.isConnected = true;
			logger.info("Successfully connected to Redis");
		} catch (error) {
			logger.error("Failed to connect to Redis", error);
			throw error;
		}
	}

	/**
	 * Disconnect from Redis
	 */

	async disconnect(): Promise<void> {
		try {
			await this.client.quit();
			this.isConnected = false;
			logger.info("Successfully disconnected from Redis");
		} catch (error) {
			logger.error("Failed to disconnect from Redis", error);
			throw error;
		}
	}

	/**
	 * Check if Redis is healthy
	 */

	isHealthy(): boolean {
		return this.isConnected;
	}

	/**
	 * Get redis client instance (for advanced operations
	 */

	getClient(): Redis {
		return this.client;
	}

	// ======================== Room Operations ========================

	/**
	 * Save room data
	 */

	async saveRoom(roomId: string, roomData: RoomData): Promise<void> {
		try {
			const key = `${redisConfig.keyPrefix.room}${roomId}`;
			await this.client.setex(
				key,
				redisConfig.ttl.room,
				JSON.stringify(roomData),
			);

			logger.debug(`Room saved: ${roomId}`);
		} catch (error) {
			logger.error("Failed to save room data", error);
			throw error;
		}
	}

	/**
	 * Get room data
	 */

	async getRoom(roomId: string): Promise<RoomData | null> {
		try {
			const key = `${redisConfig.keyPrefix.room}${roomId}`;
			const data = await this.client.get(key);
			if (!data) {
				return null;
			}

			return JSON.parse(data) as RoomData;
		} catch (error) {
			logger.error("Failed to get room data", error);
			throw error;
		}
	}

	/**
	 * Delete room data
	 */

	async deleteRoom(roomId: string): Promise<void> {
		try {
			const key = `${redisConfig.keyPrefix.room}${roomId}`;
			await this.client.del(key);
			logger.debug(`Room deleted: ${roomId}`);
		} catch (error) {
			logger.error("Failed to delete room data", error);
			throw error;
		}
	}

	/**
	 * Get all room IDs
	 */

	async getAllRoom(): Promise<any[]> {
		try {
			const pattern = `${redisConfig.keyPrefix.room}*`;
			const keys = await this.client.keys(pattern);
			return keys.map((key) => key.replace(redisConfig.keyPrefix.room, ""));
		} catch (error) {
			logger.error("Failed to get all room IDs", error);
			throw error;
		}
	}

	// ======================== Room Code Operations========================

	/**
	 * Save room code mapping
	 */

	async saveRoomCode(code: string, roomId: string): Promise<void> {
		try {
			const key = `${redisConfig.keyPrefix.roomCode}${code}`;
			await this.client.setex(key, redisConfig.ttl.roomCode, roomId);
			logger.debug(`Room code saved: ${code} -> ${roomId}`);
		} catch (error) {
			logger.error("Failed to save room code mapping", error);
			throw error;
		}
	}

	/**
	 * get room ID by code
	 */

	async getRoomIdByCode(code: string): Promise<string | null> {
		try {
			const key = `${redisConfig.keyPrefix.roomCode}${code}`;
			return await this.client.get(key);
		} catch (error) {
			logger.error("Failed to get room ID by code", error);
			throw error;
		}
	}

	/**
	 * Delete room code mapping
	 */

	async deleteRoomCode(code: string): Promise<void> {
		try {
			const key = `${redisConfig.keyPrefix.roomCode}${code}`;
			await this.client.del(key);
			logger.debug(`Room code deleted: ${code}`);
		} catch (error) {
			logger.error("Failed to delete room code mapping", error);
			throw error;
		}
	}

	// ======================== Player Session Operations========================

	/*
	 * Save player session
	 */

	async savePlayerSession(sessionId: string, sessionData: any): Promise<void> {
		try {
			const key = `${redisConfig.keyPrefix.playerSession}${sessionId}`;
			await this.client.setex(
				key,
				redisConfig.ttl.playerSession,
				JSON.stringify(sessionData),
			);
			logger.debug(`Player session saved: ${sessionId}`);
		} catch (error) {
			logger.error("Failed to save player session", error);
			throw error;
		}
	}

	/**
	 * Get player session
	 */

	async getPlayerSession(sessionId: string): Promise<any | null> {
		try {
			const key = `${redisConfig.keyPrefix.playerSession}${sessionId}`;
			const data = await this.client.get(key);
			if (!data) return null;

			return JSON.parse(data);
		} catch (error) {
			logger.error("Failed to get player session", error);
			throw error;
		}
	}

	/**
	 * Delete player session
	 */

	async deletePlayerSession(sessionId: string): Promise<void> {
		try {
			const key = `${redisConfig.keyPrefix.playerSession}${sessionId}`;
			await this.client.del(key);
			logger.debug(`Player session deleted: ${sessionId}`);
		} catch (error) {
			logger.error("Failed to delete player session", error);
			throw error;
		}
	}

	// ======================== Genric Operations========================

	/**
	 * Set key with value and expiration time
	 */

	async setWithExpiry(
		key: string,
		value: string,
		seconds: number,
	): Promise<void> {
		try {
			await this.client.setex(key, seconds, value);
		} catch (error) {
			logger.error("Failed to set key with value and expiration time", error);
			throw error;
		}
	}

	/**
	 * Get value by key
	 */

	async get(key: string): Promise<string | null> {
		try {
			const data = await this.client.get(key);
			if (!data) return null;

			return data;
		} catch (error) {
			logger.error("Failed to get value by key", error);
			throw error;
		}
	}

	/**
	 * Delete key
	 */

	async delete(key: string): Promise<void> {
		try {
			await this.client.del(key);
			logger.debug(`Key deleted: ${key}`);
		} catch (error) {
			logger.error("Failed to delete key", error);
			throw error;
		}
	}

	/**
	 * Check if key exists
	 */

	async exists(key: string): Promise<boolean> {
		try {
			const result = await this.client.exists(key);
			return result === 1;
		} catch (error) {
			logger.error("Failed to check if key exists", error);
			throw error;
		}
	}

	/**
	 * Flush all data
	 */

	async flushAll(): Promise<void> {
		try {
			await this.client.flushall();
			logger.info("All data flushed from Redis");
		} catch (error) {
			logger.error("Failed to flush all data", error);
			throw error;
		}
	}
}

//Export singleton instance
export default new RedisService();
