import dotenv from "dotenv";

//load environment variables
dotenv.config();

/**
 * Application configuration
 */

export const appConfig = {
	env: process.env.NODE_ENV || "development",
	port: parseInt(process.env.PORT || "3000", 10),
	host: process.env.HOST || "localhost",

	cors: {
		origin: process.env.CORS_ORIGIN || "http://localhost:5173",
		credentials: true,
	},

	isDevelopment: process.env.NODE_ENV === "development",
	isProduction: process.env.NODE_ENV === "production",
};
