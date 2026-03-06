import { logger } from "./Logger";

/**
 * Countdown timer
 * Handles game timers (round timers, turn timers, etc)
 */

type TimeCallback = (remaining: number) => void;
type TimerExpireCallback = () => void;

class Timer {
	private duration: number;
	private remaining: number;
	private intervalId: NodeJS.Timeout | null = null;
	private isPaused: boolean = false;
	private isRunning: boolean = false;
	private onTickCallback: TimeCallback | null = null;
	private onExpireCallback: TimerExpireCallback | null = null;

	constructor(duration: number) {
		this.duration = duration;
		this.remaining = duration;
	}

	/**
	 * Start the timer
	 */

	start(onTick: TimeCallback, onExpire: TimerExpireCallback): void {
		if (this.isRunning) {
			logger.warn("Timer is already running");
			return;
		}

		this.onTickCallback = onTick;
		this.onExpireCallback = onExpire;
		this.isRunning = true;
		this.isPaused = false;

		logger.debug(`Timer started: ${this.duration}s`);

		//Emit initial tick
		if (this.onTickCallback) {
			this.onTickCallback(this.remaining);
		}

		//Strat interval (tick every second)

		this.intervalId = setInterval(() => {
			if (!this.isPaused) {
				this.remaining--;
			}

			//Emit tick
			if (this.onTickCallback) {
				this.onTickCallback(this.remaining);
			}

			//check if expired
			if (this.remaining <= 0) {
				this.expire();
			}
		}, 1000);
	}

	/**
	 * Stop the timer
	 */

	stop(): void {
		if (this.intervalId) {
			clearInterval(this.intervalId);
			this.intervalId = null;
		}

		this.isRunning = false;
		this.isPaused = false;
		logger.debug(`Timer stopped: ${this.duration}s`);
	}

	/**
	 * Pause the timer
	 */

	pause(): void {
		if (!this.isRunning) {
			logger.warn(`Cannot pause: Timer is not running`);
			return;
		}

		this.isPaused = true;
		logger.debug(`Timer paused`);
	}

	/**
	 * Resume the timer
	 */

	resume(): void {
		if (!this.isRunning) {
			logger.warn("Cannot resume: Timer is not running");
			return;
		}

		this.isPaused = false;
		logger.debug("Timer resumed");
	}

	/**
	 * Reset timer to original duration
	 */

	reset(newDuration: number): void {
		this.stop();
		if (newDuration !== undefined) {
			this.duration = newDuration;
		}

		this.remaining = this.duration;
		logger.debug(`Timer reset: ${this.duration}s`);
	}

	/**
	 * Get duration
	 */

	getDuration(): number {
		return this.duration;
	}

	getRemaining(): number {
		return this.remaining;
	}

	/**
	 * Check if timer is running
	 */

	isTimerRunning(): boolean {
		return this.isRunning;
	}

	/**
	 * Check if timer is paused
	 */

	isTimerPaused(): boolean {
		return this.isPaused;
	}

	/**
	 * Add time to timer
	 */

	addTimer(seconds: number): void {
		this.remaining += seconds;
		logger.debug(
			`Added ${seconds} seconds to timer. New remaining time: ${this.remaining}s`,
		);
	}

	/**
	 * Handle timer expiration
	 */

	private expire(): void {
		this.stop();
		logger.debug("Timer expired");

		if (this.onExpireCallback) {
			this.onExpireCallback();
		}
	}
}

export default Timer;
