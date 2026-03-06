import { DrawStroke } from "../types/game";
import { gameConfig } from "@config/game.config";
import { logger } from "@utils/Logger";

/**
 * Drawing board / canvas state manager
 * Handdles stroke storage and validation
 */

class DrawingBoard {
	private strokes: DrawStroke[] = [];
	private currentDrawerId: string | null = null;
	private readonly width: number;
	private readonly height: number;
	private strokeCount: number = 0;

	constructor(width: number, height: number) {
		this.width = width || gameConfig.canvas.width;
		this.height = height || gameConfig.canvas.height;
		logger.debug(`Drawing board created: ${this.width}x${this.height}`);
	}

	/**
	 * Add a new stroke to the canvas
	 */

	addStroke(stroke: DrawStroke, drawerId: string): boolean {
		//validate drawer

		if (!this.isDrawer(drawerId)) {
			logger.warn(
				`Player ${drawerId} attempted to draw without being the current drawer`,
			);
			return false;
		}

		//validate coordinates
		if (!this.validateCoordinates(stroke)) {
			logger.warn(`Invalid stroke coordinates from player ${drawerId}`);
			return false;
		}

		//Add timestamp if not present
		const strokeWithTimestamp: DrawStroke = {
			...stroke,
			timestamp: stroke.timestamp || Date.now(),
		};

		this.strokes.push(strokeWithTimestamp);
		this.strokeCount++;

		logger.debug(
			`Stroke added by ${drawerId}. Total strokes: ${this.strokeCount}`,
		);
		return true;
	}

	/**
	 * Validate stroke coordinates
	 */

	private validateCoordinates(stroke: DrawStroke): boolean {
		const { x, y, prevX, prevY } = stroke;

		if (x < 0 || x > this.width || y < 0 || y > this.height) return false;
		if (prevX < 0 || prevX > this.width || prevY < 0 || prevY > this.height)
			return false;

		//check if coordinates are valid numbers
		if (
			!Number.isFinite(x) ||
			!Number.isFinite(y) ||
			!Number.isFinite(prevX) ||
			!Number.isFinite(prevY)
		)
			return false;

		return true;
	}

	/**
	 * Clear all strokes
	 */

	clearStrokes(): void {
		const previousCount = this.strokeCount;
		this.strokes = [];
		this.strokeCount = 0;
		logger.debug(`Cleared ${previousCount} strokes from the canvas`);
	}

	/**
	 * Get all strokes
	 */

	getStrokes(): DrawStroke[] {
		return [...this.strokes]; //return a copy of the strokes array
	}

	/**
	 * Get stroke count
	 */

	getStrokeCount(): number {
		return this.strokeCount;
	}

	/**
	 * Set current drawer
	 */

	setDrawer(playerId: string): void {
		this.currentDrawerId = playerId;
		logger.debug(`Drawer set to ${playerId}`);
	}

	/**
	 * Clear current drawer
	 */

	clearDrawer(): void {
		this.currentDrawerId = null;
		logger.debug(`Drawer cleared`);
	}

	/**
	 * Check if player is the current drawer
	 */

	isDrawer(playerId: string): boolean {
		return this.currentDrawerId === playerId;
	}

	/**
	 * Get current drawer ID
	 */

	getCurrentDrawer(): string | null {
		return this.currentDrawerId;
	}

	/**
	 * Reset board for new turn
	 */

	reset(): void {
		this.clearStrokes();
		this.clearDrawer();
		logger.debug(`Drawing board reset for new turn`);
	}

	/**
	 * Get canvas dimensions
	 */

	getDimensions(): { width: number; height: number } {
		return { width: this.width, height: this.height };
	}

	/**
	 * Serialize to JSON
	 */

	toJSON(): object {
		return {
			width: this.width,
			height: this.height,
			strokeCount: this.strokeCount,
			currentDrawer: this.currentDrawerId,
		};
	}
}

export default DrawingBoard;
