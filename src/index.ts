import { Client, ClientOptions, Events, GatewayIntentBits, Message, PartialMessage, Partials } from "discord.js";
import { readFileSync } from "fs";
import { parse } from "yaml";
import { Config, ObjectAny, QueueEntry } from "./types";

class DiscordClient extends Client {
	get defaultReactionEmoji() {
		return this.config.emojis[this.config.defaultReaction];
	}

	config: Config;
	secrets: ObjectAny<string>;

	queueInterval: ReturnType<typeof setInterval>;;
	reactionQueue: QueueEntry[] = [];

	stopped = true;

	constructor(options: ClientOptions) {
		super(options);

		this.config = parse(readFileSync("./config.yaml", "utf-8"));
		this.secrets = parse(readFileSync("./secrets.yaml", "utf-8"));
	}


	// queue stuff

	start() {
		this.queueInterval = setInterval(async () => {
			if (this.reactionQueue.length === 0) {
				return;
			}

			const entry = this.reactionQueue.shift();
			entry!.message.react(this.config.emojis[entry!.emoji]);
		}, this.config.interval);

		if (!this.isReady()) {
			this.login(this.secrets.BOT_TOKEN);
			this.makeEvents();
		}

		return this.stopped = false;
	}

	// I dont know why you'd need this but why not ig
	stop() {
		clearInterval(this.queueInterval);
		return this.stopped = true;
	}

	addToQueue(message: Message | PartialMessage, emoji: string) {
		return this.reactionQueue.push({ message, emoji });
	}

	makeEvents() {
		this
			.on(Events.MessageCreate, message => {
				if (Object.keys(this.config.targets).includes(message.author.id)) {
					this.addToQueue(message, this.config.targets[message.author.id]);
				}

				if (/(?<=(^|\s|\n))(ga(y|e)|queer|fag(got)*(?=($|\s|\n)))/i.test(message.content)) {
					this.addToQueue(message, this.config.defaultReaction);
				}
			})
			.on(Events.MessageUpdate, (_, newMessage) => {
				if (/(?<=(^|\s|\n))(ga(y|e)|queer|fag(got)*(?=($|\s|\n)))/i.test(newMessage.content || "")) {
					return this.addToQueue(newMessage, this.config.defaultReaction);
				}
				
				const reaction = newMessage.reactions.resolve(this.defaultReactionEmoji);
				if (reaction?.me) {
					reaction.users.remove(this.user?.id);
				}
			})
			.on(Events.InteractionCreate, async interaction => {
				if (!interaction.isChatInputCommand()) {
					return;
				}

				if (interaction.commandName === "ping") {
					const n = Date.now();
					await interaction.reply({ content: "Calculating ping..." });
					await interaction.editReply({ content: `Pong! My ping is ${(await interaction.fetchReply()).createdTimestamp - n}ms.` });
				}
			});
	}
}

const client = new DiscordClient({
	intents: [
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.Guilds,
		GatewayIntentBits.MessageContent,
	],
	partials: [Partials.Message]
});

client.start();