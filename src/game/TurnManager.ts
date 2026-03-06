import { logger } from "@utils/Logger";

/**
 * Turn manager
 * Handles turn rotation among players
 */

class TurnManager {
	private playerIds: string[] = [];
	private currentIndex: number = -1;
	private hasStarted: boolean = false;
	private completedTurns: number = 0;

	constructor() {
		logger.debug("TurnManager initialized");
	}

	/**
	 * Initialize with player IDs
	 */

	initializePlayers(playerIds: string[]): void {
		if (playerIds.length === 0) {
			logger.warn("Attempted to initialize TurnManager with empty player list");
			return;
		}

		this.playerIds = [...playerIds];
		this.currentIndex = -1;
		this.hasStarted = false;
		this.completedTurns = 0;

		logger.info(
			`TurnManager initialized with ${this.playerIds.length} players`,
		);
	}

	/**
	 * Start and get first drawer
	 */

	start(): string | null {
		if (this.playerIds.length === 0) {
			logger.warn("Cannot start: No players in TurnManager");
			return null;
		}

		this.currentIndex = 0;
		this.hasStarted = true;
		this.completedTurns = 0;

		const firstDrawer = this.playerIds[0];
		logger.info(`TurnManager started: First drawer: ${firstDrawer}`);

		return firstDrawer;
	}

	/**
	 * Get a current drawer
	 */

	getCurrentDrawer(): string | null {
		if (
			!this.hasStarted ||
			this.currentIndex < 0 ||
			this.currentIndex >= this.playerIds.length
		) {
			return null;
		}

		return this.playerIds[this.currentIndex];
	}

	/**
	 * Move to next turn
	 */

	nextTurn(): string | null {
		if (!this.hasStarted) {
			logger.warn("Cannot advance turn: TurnManager not started");
			return null;
		}

		if (this.playerIds.length === 0) {
			logger.warn("Cannot advance turn: No players");
			return null;
		}

		//Move to next player

		this.currentIndex = (this.currentIndex + 1) % this.playerIds.length;
		this.completedTurns++;

		const nextDrawer = this.playerIds[this.currentIndex];

		logger.info(`TurnManager advanced: New drawer: ${nextDrawer}`);
		return nextDrawer;
	}

	/**
	 * Check if all players have had a turn
	 */

	hasCompletedRound(): boolean {
		//round completes after the last players turn finishes
		//this happens when currentIndex wraps back to 0 after completing all turns
		if (!this.hasStarted || this.playerIds.length === 0) return false;

		//if we're at the start of the round, return false
		return this.completedTurns >= this.playerIds.length;
	}

	/**
	 * Check if there are more turns remaining in the round
	 */

	hasTurnsRemaining(): boolean {
		if (!this.hasStarted) return false;

		return this.completedTurns < this.playerIds.length;
	}

	/**
	 * Get number of completed turns
	 */

	getCompletedTurns(): number {
		return this.completedTurns;
	}

	/**
	 * Get total number of turns (players)
	 */

	getTotalTurns(): number {
		return this.playerIds.length;
	}

	/**
	 * Remove a player from turn rotation
	 */

	removePlayer(playerId: string): void {
		const index = this.playerIds.indexOf(playerId);

		if (index === -1) {
			logger.warn(`Cannot remove player: ${playerId} not in turn rotation`);
			return;
		}

		//if removing current or previous player, adjust index
		if (index <= this.currentIndex && this.currentIndex > 0) {
			this.currentIndex--;
		}

		this.playerIds.splice(index, 1);

		logger.info(`Player ${playerId} removed from turn rotation`);

		//if no players left, reset
		if (this.playerIds.length === 0) {
			this.reset();
		}
	}

	/**
	 * Add a player to turn rotation
	 */

	addPlayer(playerId: string): void {
		if (this.playerIds.includes(playerId)) {
			logger.warn(`Player ${playerId} already in turn rotation`);
			return;
		}

		this.playerIds.push(playerId);
		logger.info(`Player ${playerId} added to turn rotation`);
	}

	/**
	 * Reset turn manager
	 */

	reset(): void {
		this.currentIndex = -1;
		this.hasStarted = false;
		this.completedTurns = 0;
		logger.debug("TurnManager reset");
	}

	/**
	 * Get player count
	 */

	getPlayerCount(): number {
		return this.playerIds.length;
	}

	/**
	 * Check if turn manager has started
	 */

	isStarted(): boolean {
		return this.hasStarted;
	}

	/**
	 * Serialize to JSON
	 */

	toJSON(): object {
		return {
			playerIds: this.playerIds,
			currentIndex: this.currentIndex,
			hasStarted: this.hasStarted,
			completedTurns: this.completedTurns,
			currentDrawer: this.getCurrentDrawer(),
		};
	}
}

export default TurnManager;
