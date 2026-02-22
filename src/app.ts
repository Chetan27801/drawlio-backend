import express, { Application, Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import { appConfig } from "@config/app.config";
import { logger } from "@utils/Logger";

/**
 * Express application setup
 */

class App {
	public app: Application;

	constructor() {
		this.app = express();
		this.setupMiddleware();
		this.setupRoutes();
	}

	/**
	 * Setup Express milddleware
	 */

	private setupMiddleware(): void {
		//security headers

		this.app.use(helmet());

		//Enable CORS
		this.app.use(
			cors({
				origin: appConfig.cors.origin,
				credentials: appConfig.cors.credentials,
			}),
		);

		//Compression
		this.app.use(compression());

		//Parse JSON bodies
		this.app.use(express.json());
		this.app.use(express.urlencoded({ extended: true }));

		//Request logging
		this.app.use((req: Request, _res: Response, next: NextFunction) => {
			logger.http(`${req.method} ${req.path}`, {
				ip: req.ip,
				userAgent: req.get("user-agent"),
			});
			next();
		});
	}

	/**
	 * Setup Express routes
	 */

	private setupRoutes(): void {
		//Health check endpoint
		this.app.get("/health", (_req: Request, res: Response) => {
			res.json({
				status: "ok",
				timestamp: new Date().toISOString(),
				uptime: process.uptime(),
			});
		});

		//API info endpoint
		this.app.get("/api", (_req: Request, res: Response) => {
			res.json({
				name: "Scribble Backend API",
				version: "1.0.0",
				description: "Real-time multiplayer drawing game",
				endpoints: {
					health: "/health",
					websocket: "ws://localhost:3000",
				},
			});
		});

		//404 handler
		this.app.use((req: Request, res: Response) => {
			res.status(404).json({
				error: "Not Found",
				message: `Cannot ${req.method} ${req.path}`,
			});
		});

		//Error handler
		this.app.use(
			(err: Error, _req: Request, res: Response, _next: NextFunction) => {
				logger.error("Express error:", err);
				res.status(500).json({
					error: "Internal Server Error",
					message: appConfig.isDevelopment
						? err.message
						: "Something went wrong",
				});
			},
		);
	}

	/**
	 * Get Express application instance
	 *
	 */
	public getApp(): Application {
		return this.app;
	}
}

export default new App();
