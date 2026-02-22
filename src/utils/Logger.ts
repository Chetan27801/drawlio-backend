import winston from "winston";
import { appConfig } from "@config/app.config";

/**
 * Logger utility using Winston
 */

class Logger {
	private logger: winston.Logger;

	constructor() {
		this.logger = winston.createLogger({
			level: process.env.LOG_LEVEL || "info",
			format: winston.format.combine(
				winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
				winston.format.errors({ stack: true }),
				winston.format.errors({ stack: true }),
				winston.format.splat(),
				winston.format.json(),
			),
			defaultMeta: { service: "scribble-backend" },
			transports: [
				// Console transport
				new winston.transports.Console({
					format: winston.format.combine(
						winston.format.colorize(),
						winston.format.printf(({ timestamp, level, message, ...meta }) => {
							let metaStr = "";
							if (Object.keys(meta).length > 0) {
								metaStr = `\n${JSON.stringify(meta, null, 2)}`;
							}
							return `${timestamp} [${level}]: ${message}${metaStr}`;
						}),
					),
				}),
			],
		});

		//Add file transports in production
		if (appConfig.isProduction) {
			this.logger.add(
				new winston.transports.File({
					filename: "logs/error.log",
					level: "error",
				}),
			);
			this.logger.add(
				new winston.transports.File({
					filename: "logs/combined.log",
				}),
			);
		}
	}

	info(message: string, meta?: any): void {
		this.logger.info(message, meta);
	}

	error(message: string, error?: Error | any): void {
		if (error instanceof Error) {
			this.logger.error(message, {
				error: error.message,
				stack: error.stack,
			});
		} else {
			this.logger.error(message, error);
		}
	}

	warn(message: string, meta?: any): void {
		this.logger.warn(message, meta);
	}

	debug(message: string, meta?: any): void {
		this.logger.debug(message, meta);
	}

	http(message: string, meta?: any): void {
		this.logger.http(message, meta);
	}
}

// Export singleton instance
export const logger = new Logger();
