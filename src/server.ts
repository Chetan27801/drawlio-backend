import dotenv from "dotenv";
// import { appConfig } from "./config/app.config";
import redisService from "./services/RedisService";
import { logger } from "./utils/Logger";
import { RoomData } from "./types/room";

//load environment variables
dotenv.config();

/**
 * Test Redis connection and basic operations
 */
async function testRedis() {
	try {
		logger.info("=== Testing Redis Connection ===");

		// Connect to Redis
		await redisService.connect();
		logger.info("✓ Redis connected");

		// Test basic operations
		logger.info("Testing basic operations...");

		// Set a value
		await redisService.setWithExpiry("test:key", "Hello Redis!", 60);
		logger.info("✓ Set test key");

		// Get the value
		const value = await redisService.get("test:key");
		logger.info(`✓ Get test key: ${value}`);

		// Check existence
		const exists = await redisService.exists("test:key");
		logger.info(`✓ Key exists: ${exists}`);

		// Test room operations
		logger.info("Testing room operations...");

		const testRoom = {
			id: "room-123",
			code: "ABC123",
			hostId: "user-123",
			players: [
				{
					id: "user-123",
					name: "John Doe",
					score: 0,
				},
			],
			state: "WAITING",
			currentRound: 0,
			totalRounds: 3,
			playerCount: 1,
			maxPlayers: 4,
		};

		await redisService.saveRoom("room-123", testRoom as RoomData);
		logger.info("✓ Room saved");

		const retrievedRoom = await redisService.getRoom("room-123");
		logger.info("✓ Room retrieved:", retrievedRoom);

		await redisService.saveRoomCode("ABC123", "room-123");
		logger.info("✓ Room code saved");

		const roomId = await redisService.getRoomIdByCode("ABC123");
		logger.info(`✓ Room ID by code: ${roomId}`);

		// Cleanup
		await redisService.delete("test:key");
		await redisService.deleteRoom("room-123");
		await redisService.deleteRoomCode("ABC123");
		logger.info("✓ Cleanup completed");

		logger.info("=== All Redis tests passed! ===");
	} catch (error) {
		logger.error("Redis test failed:", error);
		process.exit(1);
	} finally {
		await redisService.disconnect();
		process.exit(0);
	}
}

// Run tests
testRedis();
