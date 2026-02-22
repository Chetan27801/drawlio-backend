import dotenv from "dotenv";

//load environment variables
dotenv.config();

/**
 * Redis configuration
 */

export const redisConfig = {
	host: process.env.REDIS_HOST || "localhost",
	port: parseInt(process.env.REDIS_PORT || "6379", 10),
	password: process.env.REDIS_PASSWORD || undefined,
	db: parseInt(process.env.REDIS_DB || "0", 10),

	//Connection options
	retryStrategy: (times: number) => {
		const delay = Math.min(times * 50, 2000);
		return delay;
	},

	maxRetriesPerRequest: 3,
	enableReadyCheck: true,

	//key prefixes
	keyPrefix: {
		room: "room:",
		roomCode: "room_code:",
		playerSession: "player_session:",
	},

	//TTL settings (in seconds)
	ttl: {
		room: 3600 * 24, //24 hours
		playerSession: parseInt(process.env.SESSION_TIMEOUT || "3600", 10), //1 hour
		roomCode: 3600 * 24, //24 hours
	},
};
