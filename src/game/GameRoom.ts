import { v4 as uuidv4 } from "uuid";
import { RoomState } from "@constants/game";
import { GameSettings, RoomData } from "../types/room";
import { gameConfig } from "@config/game.config";
import { logger } from "@utils/Logger";
import Player from "./Player";
import GameEngine from "./GameEngine";
import DrawingBoard from "./DrawingBoard";
import ConnectionManager from "@core/ConnectionManager";
import redisService from "@services/RedisService";

/**
 * Game Room
 * Represents a single game room instance
 */

class GameRoom {
	readonly id: string;
	readonly code: string;
	readonly hostId: string;
	private players: Map<string, Player> = new Map();
	private gameEngine: GameEngine;
	private drawingBoard: DrawingBoard;
	private connectionManager: ConnectionManager;
	private state: RoomState = RoomState.WAITING;
	private settings: GameSettings;
	private maxPlayers: number;
	private createdAt: Date;

	constructor(
		hostId: string,
		hostName: string,
		code: string,
		connectionManager: ConnectionManager,
		settings?: Partial<GameSettings>,
	) {
		this.id = uuidv4();
		this.code = code;
		this.hostId = hostId;
		this.connectionManager = connectionManager;
		this.createdAt = new Date();

		// Apply settings
		this.settings = {
			...gameConfig.defaultSettings,
			...settings,
		};
		this.maxPlayers = this.settings.maxPlayers;

		// Initialize game components
		this.drawingBoard = new DrawingBoard(gameConfig.canvas.width, gameConfig.canvas.height);
		this.gameEngine = new GameEngine(this, this.drawingBoard);

		// Add host as first player
		const hostSocket = this.connectionManager.getSocket(hostId);
		const hostPlayer = new Player(hostId, hostSocket?.id || "", hostName);
		this.players.set(hostId, hostPlayer);

		// Join socket to room
		if (hostSocket) {
			this.connectionManager.joinRoom(hostSocket.id, this.id);
		}

		logger.info(`GameRoom created: ${this.code} (${this.id}) by ${hostName}`);
	}

	// ==================== Player Management ====================

	/**
	 * Add player to room
	 */
	addPlayer(player: Player): boolean {
		// Check if room is full
		if (this.players.size >= this.maxPlayers) {
			logger.warn(`Cannot add player: Room ${this.code} is full`);
			return false;
		}

		// Check if game already started
		if (this.state !== RoomState.WAITING) {
			logger.warn(
				`Cannot add player: Game in room ${this.code} already started`,
			);
			return false;
		}

		// Check if player already in room
		if (this.players.has(player.id)) {
			logger.warn(`Player ${player.id} already in room ${this.code}`);
			return false;
		}

		// Add player
		this.players.set(player.id, player);

		// Join socket to room
		const socket = this.connectionManager.getSocket(player.id);
		if (socket) {
			this.connectionManager.joinRoom(socket.id, this.id);
		}

		logger.info(
			`Player ${player.name} joined room ${this.code}. Players: ${this.players.size}/${this.maxPlayers}`,
		);

		// Broadcast to room
		this.broadcast("player_joined", player.toPlayerData(false));

		// Save to Redis
		this.saveToRedis();

		return true;
	}

	/**
	 * Remove player from room
	 */
	removePlayer(playerId: string): void {
		const player = this.players.get(playerId);
		if (!player) {
			logger.warn(`Cannot remove player: ${playerId} not in room ${this.code}`);
			return;
		}

		// Remove from players
		this.players.delete(playerId);

		// Leave socket from room
		const socket = this.connectionManager.getSocket(playerId);
		if (socket) {
			this.connectionManager.leaveRoom(socket.id, this.id);
		}

		logger.info(
			`Player ${player.name} left room ${this.code}. Remaining: ${this.players.size}`,
		);

		// Broadcast to room
		this.broadcast("player_left", { playerId, playerName: player.name });

		// If game is playing and player was drawer, end turn
		if (this.state === RoomState.PLAYING) {
			this.gameEngine.handlePlayerLeft(playerId);
		}

		// Save to Redis
		this.saveToRedis();
	}

	/**
	 * Get player by ID
	 */
	getPlayer(playerId: string): Player | undefined {
		return this.players.get(playerId);
	}

	/**
	 * Get all players
	 */
	getPlayers(): Player[] {
		return Array.from(this.players.values());
	}

	/**
	 * Get player count
	 */
	getPlayerCount(): number {
		return this.players.size;
	}

	/**
	 * Check if player is host
	 */
	isHost(playerId: string): boolean {
		return this.hostId === playerId;
	}

	// ==================== Game Control ====================

	/**
	 * Check if game can start
	 */
	canStartGame(): boolean {
		return (
			this.state === RoomState.WAITING &&
			this.players.size >= gameConfig.room.minPlayers
		);
	}

	/**
	 * Start game
	 */
	startGame(): boolean {
		if (!this.canStartGame()) {
			logger.warn(`Cannot start game in room ${this.code}: Not ready`);
			return false;
		}

		this.state = RoomState.PLAYING;
		logger.info(`Game started in room ${this.code}`);

		// Start game engine
		this.gameEngine.startGame();

		// Save to Redis
		this.saveToRedis();

		return true;
	}

	/**
	 * End game
	 */
	endGame(): void {
		this.state = RoomState.ENDED;
		logger.info(`Game ended in room ${this.code}`);

		// Broadcast final results
		const finalScores = this.getPlayers()
			.map((p) => ({ id: p.id, name: p.name, score: p.score }))
			.sort((a, b) => b.score - a.score);

		this.broadcast("game_ended", {
			finalScores,
			winner: finalScores[0],
		});

		// Reset to waiting state after a delay
		setTimeout(() => {
			this.resetGame();
		}, 5000);
	}

	/**
	 * Reset game for new round
	 */
	resetGame(): void {
		this.state = RoomState.WAITING;

		// Reset all players
		this.players.forEach((player) => {
			player.score = 0;
			player.resetRoundState();
		});

		// Reset game components
		this.drawingBoard.reset();
		this.gameEngine.reset();

		logger.info(`Game reset in room ${this.code}`);

		// Broadcast reset
		this.broadcast("game_reset", {});

		// Save to Redis
		this.saveToRedis();
	}

	// ==================== Communication ====================

	/**
	 * Broadcast event to all players in room
	 */
	broadcast(event: string, data: any): void {
		this.connectionManager.broadcastToRoom(this.id, event, data);
		logger.debug(`Broadcast to room ${this.code}: ${event}`);
	}

	/**
	 * Broadcast to all except one player
	 */
	broadcastExcept(excludePlayerId: string, event: string, data: any): void {
		const excludeSocket = this.connectionManager.getSocket(excludePlayerId);
		if (excludeSocket) {
			this.connectionManager.broadcastToRoomExcept(
				this.id,
				event,
				data,
				excludeSocket.id,
			);
			logger.debug(
				`Broadcast to room ${this.code} (except ${excludePlayerId}): ${event}`,
			);
		}
	}

	/**
	 * Emit to specific player
	 */
	emitToPlayer(playerId: string, event: string, data: any): void {
		this.connectionManager.emitToPlayer(playerId, event, data);
	}

	// ==================== State Management ====================

	/**
	 * Get room state
	 */
	getState(): RoomState {
		return this.state;
	}

	/**
	 * Set room state
	 */
	setState(state: RoomState): void {
		this.state = state;
		logger.debug(`Room ${this.code} state changed to ${state}`);
		this.saveToRedis();
	}

	/**
	 * Get game engine
	 */
	getGameEngine(): GameEngine {
		return this.gameEngine;
	}

	/**
	 * Get drawing board
	 */
	getDrawingBoard(): DrawingBoard {
		return this.drawingBoard;
	}

	/**
	 * Get room settings
	 */
	getSettings(): GameSettings {
		return { ...this.settings };
	}

	/**
	 * Get room data for client
	 */
	getRoomData(): RoomData {
		const gameState = this.gameEngine.getGameState();

		return {
			id: this.id,
			code: this.code,
			hostId: this.hostId,
			players: this.getPlayers().map((p) =>
				p.toPlayerData(p.id === this.hostId),
			),
			state: this.state,
			settings: this.settings,
			currentRound: gameState.currentRound,
			totalRounds: this.settings.roundsPerGame,
			playerCount: this.players.size,
			maxPlayers: this.maxPlayers,
		};
	}

	// ==================== Persistence ====================

	/**
	 * Save room to Redis
	 */
	private async saveToRedis(): Promise<void> {
		try {
			const roomData = this.toJSON();
			await redisService.saveRoom(this.id, roomData as RoomData);
		} catch (error) {
			logger.error(`Failed to save room ${this.id} to Redis:`, error);
		}
	}

	/**
	 * Serialize to JSON
	 */
	toJSON(): object {
		return {
			id: this.id,
			code: this.code,
			hostId: this.hostId,
			players: Array.from(this.players.values()).map((p) => p.toJSON()),
			state: this.state,
			settings: this.settings,
			maxPlayers: this.maxPlayers,
			createdAt: this.createdAt.toISOString(),
			gameState: this.gameEngine.getGameState(),
		};
	}
}

export default GameRoom;
