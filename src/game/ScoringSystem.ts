import { gameConfig } from "@config/game.config";
import { logger } from "@utils/Logger";
import Player from "./Player";

/**
 * Scoring system
 * Calculates points for guesser and drawer
 */

class ScoringSystem {
	private readonly basePoints: number;
	private readonly decayPerSecond: number;
	private readonly minPoints: number;
	private readonly drawerBonusPercent: number;

	constructor() {
		this.basePoints = gameConfig.scoring.basePoints;
		this.decayPerSecond = gameConfig.scoring.decayPerSecond;
		this.minPoints = gameConfig.scoring.minPoints;
		this.drawerBonusPercent = gameConfig.scoring.drawerBonusPercent;

		logger.debug("Scoring system initialized", {
			basePoints: this.basePoints,
			decayPerSecond: this.decayPerSecond,
			minPoints: this.minPoints,
			drawerBonusPercent: `${this.drawerBonusPercent * 100}%`,
		});
	}

	/**
	 * Calculate points for a guesser based on elapsed time
	 */

	calculateGuesserPoints(elapsedSeconds: number): number {
		//Points = basePoints - (decayPerSecond * elapsedSeconds)
		//Ensure minimum points are met

		const points = Math.max(
			this.minPoints,
			this.basePoints - this.decayPerSecond * elapsedSeconds,
		);

		const roundedPoints = Math.round(points);

		logger.debug("Guesser points calculated", {
			elapsedSeconds,
			points: roundedPoints,
		});

		return roundedPoints;
	}

	/**
	 * Calculate drawer bonus based on total guesser points
	 */

	calculateDrawerBonus(totalGuesserPoints: number): number {
		const bonus = Math.round(totalGuesserPoints * this.drawerBonusPercent);

		logger.debug("Drawer bonus calculated", {
			totalGuesserPoints,
			bonus,
		});

		return bonus;
	}

	/**
	 * Award points to a player
	 */

	awardPoints(player: Player, points: number): void {
		if (points <= 0) {
			logger.warn(`Attempted to award negative points to player ${player.id}`);
			return;
		}

		player.addPoints(points);

		logger.debug(`Points awarded to player ${player.id}: ${points}`);
	}

	/**
	 * Calculate and award points for correct guess
	 */

	awardGuesserPoints(player: Player, elapsedSeconds: number): number {
		const points = this.calculateGuesserPoints(elapsedSeconds);
		this.awardPoints(player, points);
		return points;
	}

	/**
	 * Calculate and award drawer bonus
	 */

	awardDrawerBonus(player: Player, totalGuesserPoints: number): number {
		const bonus = this.calculateDrawerBonus(totalGuesserPoints);
		this.awardPoints(player, bonus);
		return bonus;
	}

	/**
	 * Get scoring configuration
	 */

	getConfig(): {
		basePoints: number;
		decayPerSecond: number;
		minPoints: number;
		drawerBonusPercent: number;
	} {
		return {
			basePoints: this.basePoints,
			decayPerSecond: this.decayPerSecond,
			minPoints: this.minPoints,
			drawerBonusPercent: this.drawerBonusPercent,
		};
	}
}

export default ScoringSystem;
