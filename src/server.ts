import dotenv from "dotenv";
import http from "http";
import { appConfig } from "@config/app.config";
import WebSocketServer from "@core/WebSocketServer";
import redisService from "@services/RedisService";
import { logger } from "@utils/Logger";
import app from "./app";

//load environment variables
dotenv.config();

/**
 * Main server application
 */

class Server {
	private httpServer: http.Server;
	private webSocketServer: WebSocketServer;
	private isShuttingDown: boolean = false;

	constructor() {
		//create http server
		this.httpServer = http.createServer(app.getApp());

		//create web socket server
		this.webSocketServer = new WebSocketServer(this.httpServer);
	}

	/**
	 * Initialize and start server
	 */

	async start(): Promise<void> {
		try {
			logger.info("Starting Scribble Backend Server...");

			//Connect to Redis
			await this.connectToRedis();

			//Start HTTP server
			await this.startHttpServer();

			//Initialize WebSocket server (after HTTP is ready)
			this.webSocketServer.initialize();

			//Setup graceful shutdown
			this.setupGracefulShutdown();

			logger.info("Server started successfully");
			this.logServerInfo();
		} catch (error) {
			logger.error("Failed to start server", error);
			process.exit(1);
		}
	}

	/**
	 * Connect to Redis
	 */

	private async connectToRedis(): Promise<void> {
		try {
			await redisService.connect();
		} catch (error) {
			logger.error("Failed to connect to Redis", error);
			throw error;
		}
	}

	/**
	 * Start HTTP server
	 */

	private async startHttpServer(): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			try {
				this.httpServer.listen(appConfig.port, appConfig.host, () => {
					logger.info(
						`✓ HTTP server listening on ${appConfig.host}:${appConfig.port}`,
					);
					resolve();
				});

				this.httpServer.on("error", (error: any) => {
					if (error.code === "EADDRINUSE") {
						logger.error(`Port ${appConfig.port} is already in use`);
						reject(new Error(`Port ${appConfig.port} is already in use`));
					} else {
						logger.error("Failed to start HTTP server", error);
						reject(error);
					}
				});
			} catch (error) {
				reject(error);
			}
		});
	}

	/**
	 * Setup graceful shutdown handlers
	 */

	private setupGracefulShutdown(): void {
		const shutdown = async (signal: string): Promise<void> => {
			if (this.isShuttingDown) return;
			this.isShuttingDown = true;

			logger.info(`${signal} received, initiating graceful shutdown...`);

			try {
				//stop accepting new connections
				this.httpServer.close(() => {
					logger.info("HTTP server closed");
				});

				//shutdown WebSocket server
				await this.webSocketServer.shutdown();

				//disconnect from Redis
				await redisService.disconnect();

				logger.info("Graceful shutdown complete");
				process.exit(0);
			} catch (error) {
				logger.error("Failed to shutdown server", error);
				process.exit(1);
			}
		};

		//handle different shudown signals

		process.on("SIGINT", () => shutdown("SIGINT"));
		process.on("SIGTERM", () => shutdown("SIGTERM"));

		//Handle uncaught errors

		process.on("uncaughtException", (error) => {
			logger.error("Uncaught exception", error);
			shutdown("UNCAUGHT_EXCEPTION");
		});

		//Handle unhandled promise rejections

		process.on("unhandledRejection", (reason: any, promise: any) => {
			logger.error("Unhandled promise rejection", { promise, reason });
			shutdown("UNHANDLED_PROMISE_REJECTION");
		});
	}

	/**
	 * Log server information
	 */

	private logServerInfo(): void {
		logger.info("=".repeat(60));
		logger.info("Server Information:");
		logger.info(`  Environment: ${appConfig.env}`);
		logger.info(`  HTTP Server: http://${appConfig.host}:${appConfig.port}`);
		logger.info(`  WebSocket: ws://${appConfig.host}:${appConfig.port}`);
		logger.info(
			`  Health Check: http://${appConfig.host}:${appConfig.port}/health`,
		);
		logger.info(`  API Info: http://${appConfig.host}:${appConfig.port}/api`);
		logger.info("=".repeat(60));
	}
}

const server = new Server();
server.start();
