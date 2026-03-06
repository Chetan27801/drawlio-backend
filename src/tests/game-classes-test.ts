import Player from "@game/Player";
import DrawingBoard from "@game/DrawingBoard";
import WordBank from "@game/WordBank";
import ScoringSystem from "@game/ScoringSystem";
import TurnManager from "@game/TurnManager";
import Timer from "@utils/Timer";
import { Difficulty } from "@constants/game";

/**
 * Test suite for game classes
 * Run with: ts-node src/tests/game-classes-test.ts
 */

async function testPlayer() {
	console.log("\n=== Testing Player Class ===");

	const player = new Player("player-1", "socket-123", "Alice");

	// Test initial state
	console.assert(player.id === "player-1", "Player ID should match");
	console.assert(player.name === "Alice", "Player name should match");
	console.assert(player.score === 0, "Initial score should be 0");
	console.assert(player.isConnected === true, "Player should be connected");

	// Test scoring
	player.addPoints(100);
	console.assert(
		player.score === 100,
		"Score should be 100 after adding points",
	);

	// Test round state
	player.setGuessed(true);
	player.setDrawing(true);
	console.assert(player.hasGuessed === true, "Player should have guessed");
	console.assert(player.isDrawing === true, "Player should be drawing");

	player.resetRoundState();
	console.assert(player.hasGuessed === false, "Round state should reset");
	console.assert(player.isDrawing === false, "Drawing state should reset");

	// Test disconnect/reconnect
	player.markDisconnected();
	console.assert(player.isConnected === false, "Player should be disconnected");

	console.log("✓ Player class tests passed");
}

async function testDrawingBoard() {
	console.log("\n=== Testing DrawingBoard Class ===");

	const board = new DrawingBoard(1000, 1000);
	const drawerId = "player-1";

	// Set drawer
	board.setDrawer(drawerId);
	console.assert(board.getCurrentDrawer() === drawerId, "Drawer should be set");

	// Test adding strokes
	const stroke = {
		x: 100,
		y: 100,
		prevX: 95,
		prevY: 95,
		color: "#FF0000",
		width: 5,
		timestamp: Date.now(),
	};

	const added = board.addStroke(stroke, drawerId);
	console.assert(added === true, "Stroke should be added");
	console.assert(board.getStrokeCount() === 1, "Stroke count should be 1");

	// Test invalid drawer
	const invalidAdded = board.addStroke(stroke, "wrong-player");
	console.assert(invalidAdded === false, "Invalid drawer should fail");

	// Test clear
	board.reset();
	console.assert(board.getStrokeCount() === 0, "Strokes should be cleared");

	// Test reset
	board.reset();
	console.assert(board.getCurrentDrawer() === null, "Drawer should be cleared");

	console.log("✓ DrawingBoard class tests passed");
}

async function testWordBank() {
	console.log("\n=== Testing WordBank Class ===");

	const wordBank = new WordBank();

	// Load words
	await wordBank.loadWords();
	console.assert(
		wordBank.isWordBankLoaded() === true,
		"WordBank should be loaded",
	);

	const totalWords = wordBank.getTotalWordCount();
	console.assert(totalWords > 0, "Should have words loaded");

	// Test getting random words
	const words = wordBank.getRandomWords(3, Difficulty.EASY);
	console.assert(words.length === 3, "Should return 3 words");

	// Test marking words as used
	words.forEach((word) => wordBank.markWordAsUsed(word));
	console.assert(
		wordBank.getUsedWordCount() === 3,
		"Should have 3 used words",
	);

	// Test validation
	const isValid = wordBank.validateWord(words[0], Difficulty.EASY);
	console.assert(isValid === true, "Word should be valid");

	const isInvalid = wordBank.validateWord("zzzzzzz");
	console.assert(isInvalid === false, "Non-existent word should be invalid");

	// Test reset
	wordBank.resetUsedWords();
	console.assert(
        wordBank.getUsedWordCount() === 0,
		"Used words should be reset",
	);

	console.log("✓ WordBank class tests passed");
}

async function testScoringSystem() {
	console.log("\n=== Testing ScoringSystem Class ===");

	const scoring = new ScoringSystem();
	const player = new Player("p1", "s1", "TestPlayer");

	// Test guesser points (fast guess)
	const fastPoints = scoring.calculateGuesserPoints(5);
	console.assert(fastPoints > 50, "Fast guess should get high points");

	// Test guesser points (slow guess)
	const slowPoints = scoring.calculateGuesserPoints(30);
	console.assert(slowPoints < fastPoints, "Slow guess should get fewer points");

	// Test minimum points
	const verySlowPoints = scoring.calculateGuesserPoints(100);
	const config = scoring.getConfig();
	console.assert(
		verySlowPoints === config.minPoints,
		"Should not go below minimum",
	);

	// Test drawer bonus
	const bonus = scoring.calculateDrawerBonus(300);
	console.assert(
		bonus === 75,
		"Drawer should get 25% of guesser points (300 * 0.25)",
	);

	// Test awarding points
	scoring.awardPoints(player, 100);
	console.assert(player.score === 100, "Player should receive points");

	console.log("✓ ScoringSystem class tests passed");
}

async function testTurnManager() {
	console.log("\n=== Testing TurnManager Class ===");

	const turnManager = new TurnManager();
	const playerIds = ["p1", "p2", "p3"];

	// Initialize
	turnManager.initializePlayers(playerIds);
	console.assert(turnManager.getPlayerCount() === 3, "Should have 3 players");

	// Start
	const firstDrawer = turnManager.start();
	console.assert(firstDrawer === "p1", "First drawer should be p1");
	console.assert(turnManager.isStarted() === true, "Should be started");

	// Next turn
	const secondDrawer = turnManager.nextTurn();
	console.assert(secondDrawer === "p2", "Second drawer should be p2");

	const thirdDrawer = turnManager.nextTurn();
	console.assert(thirdDrawer === "p3", "Third drawer should be p3");

	// Check round completion
	console.assert(
		turnManager.hasCompletedRound() === true,
		"Round should be complete",
	);

	// Wrap around
	const wrappedDrawer = turnManager.nextTurn();
	console.assert(wrappedDrawer === "p1", "Should wrap to first player");

	// Remove player
	turnManager.removePlayer("p2");
	console.assert(
		turnManager.getPlayerCount() === 2,
		"Should have 2 players after removal",
	);

    const currentDrawer = turnManager.getCurrentDrawer();
    console.log(`Current index before removal: ${currentDrawer}`);

    turnManager.removePlayer("p2");
    console.assert(turnManager.getCompletedTurns() === 2, "Should have 2 completed turns after removal");

	// Reset
	turnManager.reset();
	console.assert(turnManager.isStarted() === false, "Should be reset");

	console.log("✓ TurnManager class tests passed");
}

async function testTimer() {
	console.log("\n=== Testing Timer Class ===");

	return new Promise<void>((resolve) => {
		const timer = new Timer(3);
		let tickCount = 0;
		let expired = false;

		timer.start(
			(remaining) => {
				tickCount++;
				console.log(`  Timer tick: ${remaining}s remaining`);
				console.assert(remaining >= 0, "Remaining time should be non-negative");
			},
			() => {
				expired = true;
				console.log("  Timer expired");
				console.assert(tickCount === 4, "Should have 4 ticks (3, 2, 1, 0)");
				console.assert(expired === true, "Timer should expire");
				console.log("✓ Timer class tests passed");
				resolve();
			},
		);

		console.assert(timer.isTimerRunning() === true, "Timer should be running");
	});
}

/**
 * Run all tests
 */
async function runAllTests() {
	console.log("\n🧪 Starting Game Classes Test Suite\n");

	try {
		await testPlayer();
		await testDrawingBoard();
		await testWordBank();
		await testScoringSystem();
		await testTurnManager();
		await testTimer();

		console.log("\n✅ All tests passed!\n");
		process.exit(0);
	} catch (error) {
		console.error("\n❌ Test failed:", error);
		process.exit(1);
	}
}

// Run tests
runAllTests();
