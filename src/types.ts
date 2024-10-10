import { Message, PartialMessage } from "discord.js";

export interface ObjectAny<type> {
	[key: string]: type;
}

export interface Config {
	targets: ObjectAny<string>;
	emojis: ObjectAny<string>;
	defaultReaction: string;
	interval: number;

	[key: string]: any;
}

export interface QueueEntry {
	message: Message | PartialMessage;
	emoji: string;
}