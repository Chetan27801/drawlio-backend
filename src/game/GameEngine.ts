import { GameState, GuessResult } from "../types/game";
import { Difficulty, GAME_CONSTANTS } from "@constants/game";
import { gameConfig } from "@config/game.config";
import { logger } from "@utils/Logger";
import GameRoom from "./GameRoom";
import DrawingBoard from "./DrawingBoard";
import TurnManager from "./TurnManager";
import ScoringSystem from "./ScoringSystem";
import WordBank from "./WordBank";
import Timer from "@utils/Timer";

/**
 * Game Engine
 * Controls game flow and state machine
 */

class GameEngine {
	private room: GameRoom;
	private turnManager: TurnManager;
	private scoringSystem: ScoringSystem;
	private wordBank: WordBank;
	private drawingBoard: DrawingBoard;

	private currentRound: number = 0;
	private totalRounds: number;
	private currentWord: string | null = null;
	private wordOptions: string[] = [];
	private roundTimer: Timer | null = null;
	private wordSelectionTimer: Timer | null = null;
	private roundStartTime: number = 0;
	private difficulty: Difficulty;
	private turnGuesserPoints: number = 0;

	constructor(room: GameRoom, drawingBoard: DrawingBoard) {
		this.room = room;
		this.drawingBoard = drawingBoard;
		this.turnManager = new TurnManager();
		this.scoringSystem = new ScoringSystem();
		this.wordBank = new WordBank();

		// Get settings
		const settings = room.getSettings();
		this.totalRounds = settings.roundsPerGame;
		this.difficulty = settings.difficulty;

		// Load word bank
		this.wordBank.loadWords().catch((error) => {
			logger.error("Failed to load word bank:", error);
		});

		logger.debug(`GameEngine initialized for room ${room.code}`);
	}

	// ==================== Game Lifecycle ====================

	/**
	 * Start the game
	 */
	startGame(): void {
		logger.info(`Starting game in room ${this.room.code}`);

		// Initialize turn manager with player IDs
		const playerIds = this.room.getPlayers().map((p) => p.id);
		this.turnManager.initializePlayers(playerIds);

		// Reset state
		this.currentRound = 0;
		this.currentWord = null;

		// Broadcast game started
		this.room.broadcast("game_started", {
			totalRounds: this.totalRounds,
			players: this.room
				.getPlayers()
				.map((p) => p.toPlayerData(p.id === this.room.hostId)),
		});

		// Start first round
		setTimeout(() => this.startRound(), 2000);
	}

	/**
	 * Start a new round
	 */
	private startRound(): void {
		this.currentRound++;
		logger.info(
			`Starting round ${this.currentRound}/${this.totalRounds} in room ${this.room.code}`,
		);

		// Reset all players for new round
		this.room.getPlayers().forEach((p) => p.resetRoundState());

		// Reset drawing board
		this.drawingBoard.reset();

		this.turnManager.start();

		// Broadcast round started
		this.room.broadcast("round_started", {
			round: this.currentRound,
			totalRounds: this.totalRounds,
		});

		// Start first turn
		setTimeout(() => this.startTurn(), 1500);
	}

	/**
	 * Start a new turn
	 */
	private startTurn(): void {
		const drawerId = this.turnManager.getCurrentDrawer();
		if (!drawerId) {
			logger.error("No current drawer - cannot start turn");
			return;
		}

		const drawer = this.room.getPlayer(drawerId);
		if (!drawer) {
			logger.error(`Drawer ${drawerId} not found`);
			return;
		}

		// Set drawer
		drawer.setDrawing(true);
		this.drawingBoard.setDrawer(drawerId);

		logger.info(`Turn started: ${drawer.name} is drawing`);

		// Clear previous word
		this.currentWord = null;

		// Broadcast turn started (without word - drawer will select)
		this.room.broadcast("turn_started", {
			drawerId,
			drawerName: drawer.name,
		});

		// Offer word choices to drawer
		this.offerWordChoices(drawerId);
	}

	/**
	 * Offer word choices to drawer
	 */
	private offerWordChoices(drawerId: string): void {
		// Get random words
		this.wordOptions = this.wordBank.getRandomWords(
			GAME_CONSTANTS.WORD_CHOICE_COUNT,
			this.difficulty,
		);

		logger.debug(
			`Word options for ${drawerId}: ${this.wordOptions.join(", ")}`,
		);

		// Send word options to drawer only
		this.room.emitToPlayer(drawerId, "word_options", {
			words: this.wordOptions,
			timeLimit: GAME_CONSTANTS.WORD_SELECTION_TIME,
		});

		// Start word selection timer
		this.wordSelectionTimer = new Timer(GAME_CONSTANTS.WORD_SELECTION_TIME);
		this.wordSelectionTimer.start(
			() => {
				// Tick - could send updates if needed
			},
			() => {
				// Auto-select random word if drawer doesn't choose
				if (!this.currentWord) {
					const randomWord =
						this.wordOptions[
							Math.floor(Math.random() * this.wordOptions.length)
						];
					logger.warn(
						`Drawer ${drawerId} didn't select word. Auto-selecting: ${randomWord}`,
					);
					this.selectWord(randomWord, drawerId);
				}
			},
		);
	}

	/**
	 * Handle word selection by drawer
	 */
	selectWord(word: string, playerId: string): void {
		// Validate it's the drawer
		const currentDrawer = this.turnManager.getCurrentDrawer();
		if (playerId !== currentDrawer) {
			logger.warn(`Player ${playerId} tried to select word but is not drawer`);
			return;
		}

		// Validate word is in options
		if (!this.wordOptions.includes(word)) {
			logger.warn(`Invalid word selection: ${word}`);
			return;
		}

		// Stop word selection timer
		if (this.wordSelectionTimer) {
			this.wordSelectionTimer.stop();
			this.wordSelectionTimer = null;
		}

		this.currentWord = word;
		this.wordBank.markWordAsUsed(word);
		this.roundStartTime = Date.now();
		this.turnGuesserPoints = 0;

		logger.info(`Word selected: ${word} by ${playerId}`);

		// Send word to drawer
		this.room.emitToPlayer(playerId, "word_selected", { word });

		// Send hint to guessers (underscores)
		const hint = this.createHint(word, 0);
		this.room.broadcastExcept(playerId, "word_hint", {
			hint,
			length: word.length,
		});

		// Start round timer
		const drawTime = this.room.getSettings().drawTime;
		this.roundTimer = new Timer(drawTime);

		this.roundTimer.start(
			(remaining) => {
				this.onTimerTick(remaining);
			},
			() => {
				this.onTimerExpire();
			},
		);

		// Broadcast drawing started
		this.room.broadcast("drawing_started", {
			drawerId: playerId,
			timeLimit: drawTime,
		});
	}

	/**
	 * Handle timer tick
	 */
	private onTimerTick(remaining: number): void {
		// Broadcast timer update
		this.room.broadcast("timer_update", { remaining });

		// Reveal hints at specific intervals
		const elapsed = this.room.getSettings().drawTime - remaining;

		if (this.currentWord && GAME_CONSTANTS.HINT_INTERVALS.includes(elapsed)) {
			const hintLevel = GAME_CONSTANTS.HINT_INTERVALS.indexOf(elapsed) + 1;
			const hint = this.createHint(this.currentWord, hintLevel);

			const drawerId = this.turnManager.getCurrentDrawer();
			if (drawerId) {
				this.room.broadcastExcept(drawerId, "hint_revealed", { hint });
			}
		}
	}

	/**
	 * Handle timer expiration
	 */
	private onTimerExpire(): void {
		logger.info("Turn timer expired");
		this.endTurn();
	}

	/**
	 * Create hint (partially revealed word)
	 */
	private createHint(word: string, level: number): string {
		if (level === 0) {
			// All underscores
			return word
				.split("")
				.map(() => "_")
				.join(" ");
		}

		// Reveal some letters based on level
		const revealCount = Math.min(level, Math.floor(word.length / 2));
		const revealed = new Set<number>();

		while (revealed.size < revealCount) {
			const index = Math.floor(Math.random() * word.length);
			revealed.add(index);
		}

		return word
			.split("")
			.map((char, i) => (revealed.has(i) ? char : "_"))
			.join(" ");
	}

	/**
	 * Handle player guess
	 */
	handleGuess(playerId: string, message: string): GuessResult {
		const player = this.room.getPlayer(playerId);
		if (!player) {
			return { isCorrect: false, message: "Player not found" };
		}

		// Can't guess if you're the drawer
		if (player.isDrawing) {
			return { isCorrect: false, message: "Drawer cannot guess" };
		}

		// Can't guess if already guessed
		if (player.hasGuessed) {
			return { isCorrect: false, message: "Already guessed correctly" };
		}

		// Check if guess is correct
		if (!this.currentWord) {
			return { isCorrect: false, message: "No active word" };
		}

		const guess = message.trim().toLowerCase();
		const word = this.currentWord.toLowerCase();

		if (guess === word) {
			// Correct guess!
			const elapsedSeconds = Math.floor(
				(Date.now() - this.roundStartTime) / 1000,
			);
			const points = this.scoringSystem.awardGuesserPoints(
				player,
				elapsedSeconds,
			);

			player.setGuessed(true);
			this.turnGuesserPoints += points;

			logger.info(`${player.name} guessed correctly! +${points} points`);

			// Broadcast correct guess
			this.room.broadcast("correct_guess", {
				playerId: player.id,
				playerName: player.name,
				points,
			});

			// Check if all players guessed
			const allGuessed = this.room
				.getPlayers()
				.filter((p) => !p.isDrawing)
				.every((p) => p.hasGuessed);

			if (allGuessed) {
				logger.info("All players guessed correctly - ending turn early");
				setTimeout(() => this.endTurn(), 2000);
			}

			return { isCorrect: true, points, message: "Correct!" };
		}

		// Broadcast regular message (wrong guess)
		this.room.broadcast("message", {
			playerId: player.id,
			playerName: player.name,
			message,
		});

		return { isCorrect: false, message: "Incorrect guess" };
	}

	/**
	 * End current turn
	 */
	private endTurn(): void {
		// Stop timer
		if (this.roundTimer) {
			this.roundTimer.stop();
			this.roundTimer = null;
		}

		const drawerId = this.turnManager.getCurrentDrawer();
		if (!drawerId) return;

		const drawer = this.room.getPlayer(drawerId);
		if (!drawer) return;

		const guesserPoints = this.turnGuesserPoints;

		const drawerBonus = this.scoringSystem.awardDrawerBonus(
			drawer,
			guesserPoints,
		);

		// Reveal word
		this.room.broadcast("turn_ended", {
			word: this.currentWord,
			drawerId,
			drawerBonus,
			scores: this.room.getPlayers().map((p) => ({
				id: p.id,
				name: p.name,
				score: p.score,
			})),
		});

		logger.info(`Turn ended. Word was: ${this.currentWord}`);

		// Reset turn state
		drawer.setDrawing(false);
		this.drawingBoard.reset();

		this.turnManager.nextTurn();

		if (this.turnManager.hasCompletedRound()) {
			setTimeout(() => this.endRound(), 3000);
		} else {
			setTimeout(() => this.startTurn(), 3000);
		}
	}

	/**
	 * End current round
	 */
	private endRound(): void {
		logger.info(`Round ${this.currentRound} ended`);

		const scores = this.room
			.getPlayers()
			.map((p) => ({ id: p.id, name: p.name, score: p.score }))
			.sort((a, b) => b.score - a.score);

		this.room.broadcast("round_ended", {
			round: this.currentRound,
			scores,
			leader: scores[0],
		});

		// Check if game is complete
		if (this.currentRound >= this.totalRounds) {
			setTimeout(() => this.endGame(), 5000);
		} else {
			// Start next round
			this.turnManager.reset();
			setTimeout(() => this.startRound(), 5000);
		}
	}

	/**
	 * End game
	 */
	private endGame(): void {
		logger.info(`Game ended in room ${this.room.code}`);
		this.room.endGame();
	}

	/**
	 * Handle player leaving during game
	 */
	handlePlayerLeft(playerId: string): void {
		logger.info(`Player ${playerId} left during game`);

		const wasDrawer = playerId === this.turnManager.getCurrentDrawer();

		this.turnManager.removePlayer(playerId);

		if (wasDrawer) {
			logger.warn("Current drawer left - ending turn");
			this.endTurn();
		}

		// If too few players, end game
		if (this.room.getPlayerCount() < gameConfig.room.minPlayers) {
			logger.warn("Not enough players - ending game");
			this.endGame();
		}
	}

	/**
	 * Reset game engine
	 */
	reset(): void {
		// Stop timers
		if (this.roundTimer) {
			this.roundTimer.stop();
			this.roundTimer = null;
		}
		if (this.wordSelectionTimer) {
			this.wordSelectionTimer.stop();
			this.wordSelectionTimer = null;
		}

		// Reset state
		this.currentRound = 0;
		this.currentWord = null;
		this.wordOptions = [];
		this.turnManager.reset();
		this.wordBank.resetUsedWords();

		logger.debug("GameEngine reset");
	}

	/**
	 * Get current game state
	 */
	getGameState(): GameState {
		const drawerId = this.turnManager.getCurrentDrawer();

		return {
			roomId: this.room.id,
			code: this.room.code,
			state: this.room.getState(),
			currentRound: this.currentRound,
			totalRounds: this.totalRounds,
			currentDrawerId: drawerId,
			currentWord: this.currentWord,
			timeRemaining: this.roundTimer?.getRemaining() || 0,
			players: this.room
				.getPlayers()
				.map((p) => p.toPlayerData(p.id === this.room.hostId)),
		};
	}
}

export default GameEngine;
