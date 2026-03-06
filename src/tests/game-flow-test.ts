import Player from "@game/Player";
import DrawingBoard from "@game/DrawingBoard";
import WordBank from "@game/WordBank";
import ScoringSystem from "@game/ScoringSystem";
import TurnManager from "@game/TurnManager";
import { Difficulty } from "@constants/game";

/**
 * Test a complete game flow
 */

async function testGameFlow() {
	console.log("\n=== Testing Complete Game Flow ===\n");

	// Create players
	const player1 = new Player("p1", "s1", "Alice");
	const player2 = new Player("p2", "s2", "Bob");
	const player3 = new Player("p3", "s3", "Charlie");
	const players = [player1, player2, player3];

	console.log("✓ Created 3 players");

	// Initialize systems
	const wordBank = new WordBank();
	await wordBank.loadWords();
	console.log("✓ Loaded word bank");

	const drawingBoard = new DrawingBoard(1000, 1000);
	const scoringSystem = new ScoringSystem();
	const turnManager = new TurnManager();

	// Start game
	turnManager.initializePlayers(players.map((p) => p.id));
	const firstDrawer = turnManager.start();
	console.log(`✓ Game started, first drawer: ${firstDrawer}`);

	// Simulate Round 1
	console.log("\n--- Round 1 ---");

	// Get word for drawer
	const words = wordBank.getRandomWords(3, Difficulty.EASY);
	const selectedWord = words[0];
	wordBank.markWordAsUsed(selectedWord);
	console.log(`Word selected: ${selectedWord}`);

	// Set drawer
	drawingBoard.setDrawer(firstDrawer!);
	player1.setDrawing(true);

	// Simulate drawing
	for (let i = 0; i < 5; i++) {
		const stroke = {
			x: Math.random() * 800,
			y: Math.random() * 600,
			prevX: Math.random() * 800,
			prevY: Math.random() * 600,
			color: "#FF0000",
			width: 5,
			timestamp: Date.now(),
		};
		drawingBoard.addStroke(stroke, firstDrawer!);
	}
	console.log(`✓ Drawer made ${drawingBoard.getStrokeCount()} strokes`);

	// Simulate guesses
	// Bob guesses at 10 seconds
	const bobPoints = scoringSystem.calculateGuesserPoints(10);
	scoringSystem.awardPoints(player2, bobPoints);
	player2.setGuessed(true);
	console.log(`✓ Bob guessed correctly in 10s, earned ${bobPoints} points`);

	// Charlie guesses at 20 seconds
	const charliePoints = scoringSystem.calculateGuesserPoints(20);
	scoringSystem.awardPoints(player3, charliePoints);
	player3.setGuessed(true);
	console.log(
		`✓ Charlie guessed correctly in 20s, earned ${charliePoints} points`,
	);

	// Award drawer bonus
	const totalGuesserPoints = bobPoints + charliePoints;
	const drawerBonus = scoringSystem.awardDrawerBonus(
		player1,
		totalGuesserPoints,
	);
	console.log(`✓ Alice (drawer) earned bonus: ${drawerBonus} points`);

	// Show scores
	console.log("\nScores after Round 1:");
	players.forEach((p) => {
		console.log(`  ${p.name}: ${p.score}`);
	});

	// End turn
	players.forEach((p) => p.resetRoundState());
	drawingBoard.reset();
	console.log("✓ Round 1 complete, state reset");

	// Next turn
	const secondDrawer = turnManager.nextTurn();
	console.log(`\n--- Round 2 ---`);
	console.log(`Next drawer: ${secondDrawer}`);

	console.log("\n✅ Game flow test completed successfully!\n");
}

testGameFlow().catch(console.error);
