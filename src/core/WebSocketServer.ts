import http from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import { appConfig } from "@config/app.config";
import { logger } from "@utils/Logger";
import ConnectionManager from "./ConnectionManager";
import EventRouter from "@core/EventRouter";
import { v4 as uuidv4 } from "uuid";
import RoomManager from "@game/RoomManager";

/**
 * Main WebSocker server orchestrator
 */

class WebSocketServer {
	private io: SocketIOServer;
	private httpServer: http.Server;
	private connectionManager: ConnectionManager;
	private eventRouter: EventRouter;
	private roomManager: RoomManager;
	private cleanupInterval: NodeJS.Timeout | null = null;

	constructor(httpServer: http.Server) {
		this.httpServer = httpServer;

		//initialize io server
		this.io = new SocketIOServer(this.httpServer, {
			cors: {
				origin: appConfig.cors.origin,
				credentials: appConfig.cors.credentials,
				methods: ["GET", "POST"],
			},
			transports: ["websocket", "polling"],
		});
		this.connectionManager = new ConnectionManager(this.io);
		this.eventRouter = new EventRouter(this.connectionManager);
		this.roomManager = RoomManager.getInstance(this.connectionManager);
	}

	/**
	 * Initialize websocket server
	 */

	initialize(): void {
		logger.info("Initializing WebSocket server...");

		this.setupMiddleware();
		this.setupEventHandlers();
		this.startCleanupInterval();

		logger.info("WebSocket server initialized successfully");
	}

	/**
	 * Setup Socket.io middleware
	 */

	private setupMiddleware(): void {
		//Authentication middleware (placeholder for now)
		this.io.use((socket: Socket, next: any) => {
			logger.debug(`New connection attempt: ${socket.id}`);

			//TODO: Add authentication logic here if needed
			//For now , accept all connections
			next();
		});

		//Logging middleware
		this.io.use((socket: Socket, next: any) => {
			logger.debug(`Socket ${socket.id} connected`, {
				transport: socket.conn.transport.name,
				remoteAddress: socket.handshake.address,
			});

			next();
		});
	}

	/**
	 * Setup main connection event handlers
	 */

	private setupEventHandlers(): void {
		this.io.on("connection", (socket: Socket) => {
			this.handleConnection(socket);
		});
	}

	/**
	 * handle new socket connection
	 */

	private handleConnection(socket: Socket): void {
		logger.info(`New socket connection: ${socket.id}`);

		//generate unique player ID for this connection
		const playerId = uuidv4();

		//Add to connection manager
		this.connectionManager.addConnection(socket, playerId);

		//send connection success to client

		socket.emit("connected", {
			playerId,
			socketId: socket.id,
			timestamp: new Date().toISOString(),
		});

		//setup event routing for this socket
		this.eventRouter.setupEventHandlers(socket);

		logger.info(`Player ${playerId} connected (Socket: ${socket.id})`);
		logger.debug(
			`Total connections: ${this.connectionManager.getConnectionCount()}`,
		);
	}

	/**
	 * Start periodic cleanup interval
	 */

	private startCleanupInterval(): void {
		//run cleanup every 5 minutes

		this.cleanupInterval = setInterval(
			() => {
				logger.info("Running periodic cleanup...");
				this.roomManager.cleanupEmptyRooms();

				const stats = this.roomManager.getStats();
				logger.info(`Cleanup complete. Stats: ${JSON.stringify(stats)}`);
			},
			5 * 60 * 1000,
		); //5 minutes

		logger.info("Periodic cleanup started (every 5 minutes)");
	}

	/**
	 * Stop cleanup interval
	 */

	private stopCleanupInterval(): void {
		if (this.cleanupInterval) {
			clearInterval(this.cleanupInterval);
			this.cleanupInterval = null;
			logger.info("Periodic cleanup stopped");
		}
	}

	/**
	 * Get Socket.io server instance
	 */
	getIO(): SocketIOServer {
		return this.io;
	}

	/**
	 * Get connection manager instance
	 */
	getConnectionManager(): ConnectionManager {
		return this.connectionManager;
	}

	/**
	 * Get room manager instance
	 */

	getRoomManager(): RoomManager {
		return this.roomManager;
	}

	/**
	 * Broadcast to all connected clients
	 */

	broadcast(event: string, data: any): void {
		this.io.emit(event, data);
		logger.debug(`Broadcast to all clients: ${event}`);
	}

	/**
	 * Get connected socket count
	 */
	getSocketCount(): number {
		return this.io.sockets.sockets.size;
	}

	/**
	 * Get server stats
	 */

	getStats(): {
		connections: number;
		rooms: any;
	} {
		return {
			connections: this.getSocketCount(),
			rooms: this.roomManager.getStats(),
		};
	}

	/**
	 * Shutdown WebSocket server
	 */
	async shutdown(): Promise<void> {
		logger.info("Shutting down WebSocket server...");

		//stop cleanup interval
		this.stopCleanupInterval();

		//close all connections
		this.connectionManager.clearAll();

		try {
			await new Promise<void>((resolve, reject) => {
				this.io.close((error) => {
					if (error) {
						return reject(error); // Pass the error to the catch block
					}
					logger.info("WebSocket server closed");
					resolve();
				});
			});
			logger.info("WebSocket server shutdown complete");
		} catch (error) {
			logger.error("Failed to close WebSocket server", error);
		}
	}
}

export default WebSocketServer;
