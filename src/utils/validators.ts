import {
	CreateRoomPayload,
	JoinRoomPayload,
	DrawPayload,
	MessagePayload,
} from "../types/events";
import { isValidRoomCode } from "@utils/helpers";

/**
 * Input validation functions
 */

export function validatePlayerName(name: string): boolean {
	if (!name || typeof name !== "string") return false;
	const trimmed = name.trim();
	return trimmed.length >= 2 && trimmed.length <= 20;
}

export function validateCreateRoomData(data: any): data is CreateRoomPayload {
	if (!data || typeof data !== "object") return false;
	if (!validatePlayerName(data.playerName)) return false;

	//validate settings if provided
	if (data.settings) {
		if (data.settings.maxPlayers !== undefined) {
			if (
				typeof data.settings.maxPlayers !== "number" ||
				data.settings.maxPlayers < 2 ||
				data.settings.maxPlayers > 10
			)
				return false;
		}

		if (data.settings.roundsPerGame !== undefined) {
			if (
				typeof data.settings.roundsPerGame !== "number" ||
				data.settings.roundsPerGame < 1 ||
				data.settings.roundsPerGame > 10
			)
				return false;
		}
	}

	return true;
}

export function validateJoinRoomData(data: any): data is JoinRoomPayload {
	if (!data || typeof data !== "object") return false;
	if (!validatePlayerName(data.playerName)) return false;
	if (!data.code || !isValidRoomCode(data.code)) return false;
	return true;
}

export function validateDrawData(data: any): data is DrawPayload {
	if (!data || typeof data !== "object") return false;

	const requiredFields = ["x", "y", "prevX", "prevY", "color", "width"];
	for (const x of requiredFields) {
		if (data[x] === undefined) {
			return false;
		}
	}
	//validate coordinates
	if (typeof data.x !== "number" || typeof data.y !== "number") return false;

	if (typeof data.prevX !== "number" || typeof data.prevY !== "number")
		return false;
	//validate color(hex format)
	if (typeof data.color !== "string" || !/^#[0-9A-F]{6}$/i.test(data.color))
		return false;

	//validate width
	if (typeof data.width !== "number" || data.width < 1 || data.width > 10)
		return false;
	return true;
}

export function validateMessage(message: MessagePayload): message is MessagePayload {
	if (!message.message || typeof message.message !== "string") return false;
	const trimmed = message.message.trim();
	return trimmed.length >= 1 && trimmed.length <= 200;
}
