import { REST } from '@discordjs/rest';
import clc from 'cli-color';
import { GatewayIntentBits, Routes } from 'discord-api-types/v9';
import { AnyThreadChannel, channelMention, Client, Collection, Events, MessageFlags, TextChannel, ThreadChannel } from 'discord.js';
import fs from 'fs';
import { getLastCommitMessage } from 'libs/github';
import os from 'os';
import path from 'path';
import { envconfig, islocal } from '../config';
import { EXPRESS } from './express';
import { TRELLO } from './trello';
import { LocalStorage } from 'node-localstorage';

const fetchUrl = require("fetch").fetchUrl;

const folder = path.resolve(__dirname);
const cmdfolder = path.resolve(folder, '..', 'commands');

const localStorage = new LocalStorage(path.resolve(__dirname,'..','..','storage','ls'));

export const DiscoChannels = {
	MODONLY: "moderator-only",
	TWITCHCHAT: "chat-da-twitch",
	USERS_ONLINE: "1096276077212618752",
};

export const DiscoSymbols = {
	PENDING: '⬜',
	MORE: '🟪',
	DONE: '🟨',
	LIVE: '🟩',
	NOT: '🟫',
	MAYBE: '🟦',
}

export const DiscoLists = {
	// SUGESTÕES: {board: "FioTactics - Unity", list: "To Do", label: "Changes"}
	SUGESTOES: '1020091951086829668',
	// BUGS-E-ERROS: {board: "FioTactics - Unity", list: "Queued", label: "Bug"}
	BUGS: '1020091702368817253',
	// BUGS-OVERLAY
	BUGS_OVERLAY: '1166784782424879145',
	// TESTES
	TESTES: '1096604601354043434'
};

export const ForumToList = {
	// SUGESTÕES: {board: "FioTactics - Unity", list: "To Do", label: "Changes"}
	[DiscoLists.SUGESTOES]: { board: '6093e00f7ec1885cd4759058', list: '609742fabf8e0f586f0d30d7', label: '6190ab3a65bf7137462757d6' },
	// BUGS-E-ERROS: {board: "FioTactics - Unity", list: "Queued", label: "Bug"}
	[DiscoLists.BUGS]: { board: '6093e00f7ec1885cd4759058', list: '625c189b4310bd33c4e21ff2', label: '6190ab01f2328d6f86e64bf8' },
	// BUGS-OVERLAY
	[DiscoLists.BUGS_OVERLAY]: {board:'6164b91bcdea1a1d11609d83', list:'61a3dafd6516723613db5fbe', label:'6164b91bec7b9d8da4611bcf'},
	// TESTES
	[DiscoLists.TESTES]: { board: '', list: '', label: '' }
} as Record<string, IForumConfig>;


export interface IForumConfig {
	board: string;
	list: string;
	label: string;
}

export const DISCORD = () => {
	return Disco.instance;
}

export default class Disco {

	static instance: Disco;

	rest: REST;
	cready: boolean = false;
	client: Client<boolean>;
	commands = [] as DiscoCommand[];
	messageCache: Map<string, { content: string, timestamp: number }> = new Map(); // Cache to prevent duplicate messages

	static LSKEYS = {
		LASTBUGREPORT: 'disco-lastBugReport',
		REACTIONS_ADDED: 'disco-reactions-added',
	};

	// ===== CORE ===================================================

	constructor() {
		this.log('constructor()');
		Disco.instance = this;
		this.rest = new REST({ version: '9' }).setToken(envconfig.DISCORD_BOTTOKEN);
		this.client = new Client({
			intents: [
				GatewayIntentBits.Guilds,
				GatewayIntentBits.GuildMessages,
				GatewayIntentBits.GuildMessageReactions
			]
		});
		this.client.login(envconfig.DISCORD_BOTTOKEN);
	}

	async ready(): Promise<void> {
		this.log('ready()');
		return new Promise(resolve => {
			if (this.cready) {
				resolve();
				return;
			}
			this.log('waiting for client...');
			this.client.once('ready', () => {
				this.log('client ready!');
				this.cready = true;
				resolve();
			});
		});
	}

	async init() {
		this.log('init()');
		await this.ready();
		await this.purgeMessagesFromChannel(DiscoChannels.MODONLY, 'Hello');
		await this.addMissingReactions();
		await this.registerCommands();
		await this.addListeners();
		await this.addRoutes();
		await this.sayHello();
		await this.setupGaming();
	}

	async test() {
		this.log('test()');

		const threads = await this.getThreads(DiscoLists.BUGS, true, true, 1);

		let i = 0;
		for (const thread of threads) {
			i++;
			this.logbar();
			this.log(thread.id, thread.name);

			const cardId = await this.getThreadCardId(thread);
			const forum = this.getThreadForum(thread);
			if (!forum) continue;

			const card = await TRELLO().findCard(forum, cardId);

			const messages = await thread.messages.fetch({limit: 1, after: '0'});
			const message = messages.first();

			const content = message?.content;
			const images = message?.attachments.map(x => x.url);

			if (content != card?.data.desc) await card?.setDesc(content);
			if (images?.length && !card?.data.idAttachmentCover) await card?.setImageDiscord(images[0]);
		}


		/*
		const ch = this.getChannel(DiscoChannels.MODONLY);
		this.log('MODONLY', ch.guild.id);


		let deleted = 1;

		while (deleted) {
			const messages = await ch.messages.fetch({limit: 100});
			const total = messages.size;
			deleted = 0;

			const ps = [] as Promise<any>[];

			for (const msg of messages.values()) {
				this.log(msg.id);
				const p = msg.delete().then(() => {
					deleted++;
					this.log(deleted,'/',total);
				});
				ps.push(p);
			}

			await Promise.all(ps);
		}

		this.log('done deleting');

		const sugestoes = await this.getThreads(DiscoLists.SUGESTOES, true, true, 100);
		const totalsugs = sugestoes.length;

		let i = 0;
		for (const thread of sugestoes) {
			i++;
			this.log(`[SUG] ${i}/${totalsugs}`, thread.id, thread.name);
			const reactions = await this.getThreadReactions(thread);
			if (!reactions.length) await this.addSuggestionReactions(thread);
		}

		const bugs = await this.getThreads(DiscoLists.BUGS, true, true, 100);
		const totalbugs = bugs.length;

		let j = 0;
		for (const thread of bugs) {
			j++;
			this.log(`[BUG] ${j}/${totalbugs}`, thread.id, thread.name);
			await this.addBugReactions(thread);
		}
		*/

		this.logbar();
		this.log('test done!');
		this.logbar();
	}

	// ===== REACTIONS ==============================================

	loadSavedReactions() {
		this.log('loadSavedReactions()');
		const alreadyAdded = JSON.parse(localStorage.getItem(Disco.LSKEYS.REACTIONS_ADDED) || '{}');
		return alreadyAdded;
	}

	saveSavedReactions(added: Record<string, string>) {
		localStorage.setItem(Disco.LSKEYS.REACTIONS_ADDED, JSON.stringify(added, null, 2));
		return 0;
	}

	async addMissingReactions() {
		this.log('addMissingReactions()');

		const sugestoes = await this.getThreads(DiscoLists.SUGESTOES, true, true, 100);

		const saved = this.loadSavedReactions();
		let stack = 0;

		for (const thread of sugestoes) {
			if (saved[thread.id]) continue;

			const reactions = await this.getThreadReactions(thread);

			if (!reactions.length) {
				await this.addSuggestionReactions(thread);
				console.log('added new reactions to', thread.id, thread.name);
			}

			saved[thread.id] = thread.name;
			stack++;

			if (stack >= 5) stack = this.saveSavedReactions(saved);
		}

		this.saveSavedReactions(saved);
		this.log('added reactions to', Object.keys(saved).length, 'threads!')
	}

	async execUnlocked(thread: ThreadChannel, callback: (thread: ThreadChannel) => Promise<void>) {
		this.log('execUnlocked()', thread.id, thread.name);
		const arquived = thread.archived;
		if (arquived) await thread.setArchived(false);
		await callback(thread);
		if (arquived) await thread.setArchived(true);
	}

	async sayHello() {
		const hostname = os.hostname();
		const lastcommit = await getLastCommitMessage();
		this.send('moderator-only', `Hello, I'm online from ${hostname}! ${lastcommit}`);
	}

	// ===== THREADS ================================================

	getThreadForum(thread: ThreadChannel) {
		if (!thread.parentId) return null;
		const forum = ForumToList[thread.parentId];
		if (!forum) return null;
		return forum;

	}

	// ===== THREADS / MENTIONS =====================================

	async getThreadMentions(thread: ThreadChannel) {
		const messages = await thread.messages.fetch({});

		const regex = /(#\d{1,5})/gm;
		const mentions = [] as { id: string, qty: number }[];

		messages.forEach(x => {
			const match = x.content.match(regex);
			const id = match?.[0]?.replace('#', '');
			if (id) {
				const mid = mentions.find(x => x.id === id);
				if (mid) mid.qty++; else mentions.push({ id, qty: 1 });
			}
		});

		mentions.sort((a, b) => b.qty - a.qty);

		return mentions;
	}

	async getThreadCardId(thread: ThreadChannel) {
		const mentions = await this.getThreadMentions(thread);
		return mentions[0]?.id;
	}

	// ===== THREADS / REACTIONS ====================================

	async addSuggestionReactions(thread: ThreadChannel) {
		await this.execUnlocked(thread, async (thread) => {
			await this.removeThreadReactions(thread);
			await this.addThreadReactions(thread, ['🤨', '😍', '🤢']);
		});
	}

	async addBugReactions(thread: ThreadChannel) {
		await this.execUnlocked(thread, async (thread) => {
			await this.removeThreadReactions(thread);
			await this.addThreadReactions(thread, [':fiotebBomb:']);
		});
	}

	async removeThreadReactions(thread: ThreadChannel, checklock: boolean = false) {
		this.log('removeThreadReactions()', thread.id, thread.name);
		try {
			const message = await thread.fetchStarterMessage();
			const reactions = await this.getThreadReactions(thread);
			if (reactions?.length) await message?.reactions.removeAll();
		} catch (e) {

		}
	}

	async addThreadReactions(thread: ThreadChannel, reactions: string[]) {
		this.log('addThreadReactions()', thread.id, thread.name, reactions);
		try {
			const message = await thread.fetchStarterMessage();
			for (const reaction of reactions) await message?.react(reaction);
		} catch (e) {

		}
	}

	async getThreadReactions(thread: ThreadChannel) {
		this.log('getThreadReactions()', thread.id, thread.name);
		try {
			const message = await thread.fetchStarterMessage();
			if (!message) return [];
			const reactions = message?.reactions.cache.map(x => ({ emoji: x.emoji?.name, count: x.count }));
			return reactions;
		} catch (e) {
			return [];
		}
	}

	// ===== EXPRESS ROUTES =========================================

	async addRoutes() {
		EXPRESS().app.post('/test', async (req, res) => {
			res.send({ status: true });
		});
	}

	// ===== GAMING =================================================

	async setupGaming() {
		this.log('setupGaming()');
		this.intervalCall(() => this.updateOnlinePlayers(), 60 * 1000);
		this.intervalCall(() => this.getNewBugReports(), 10 * 1000);
	}

	// ===== GAMING / PLAYERS =======================================

	updateOnlinePlayers() {
		this.log('updateOnlinePlayers()');
		const method = 'GET';
		const headers = {};
		const body = null;
		fetchUrl(envconfig.FIOTACTICS_API_URL+'/info/online', { method, headers, body }, (err: any, meta: any, feed: any) => {
			const g = this.getChannel(DiscoChannels.USERS_ONLINE);
			let newname = '????';
			if (meta?.status == 200) {
				try {
					const list = JSON.parse(feed.toString());
					newname = 'Players Online: ' + list.length;
				} catch (e) {
					console.log(body);
					console.error(e);
					newname = 'Players Online: ERROR';
				}
			} else {
				newname = 'Servidor Offline!';
			}

			this.log('->', newname);
			g.setName(newname);
		})
	}

	// ===== GAMING / BUGS ==========================================


	getNewBugReports() {
		const lastBugReport = parseInt(localStorage.getItem(Disco.LSKEYS.LASTBUGREPORT) || '0');

		const method = 'GET';
		const headers = {'Authorization': 'Bearer ' + envconfig.FIOTACTICS_API_TOKEN};
		const url = envconfig.FIOTACTICS_API_URL+'/logs/all?afterId='+lastBugReport;

		fetchUrl(url, { method, headers }, (err: any, meta: any, res: any) => {
			if (meta?.status != 200) return console.log('bad status', meta?.status);
			try { this.parseBugReports(JSON.parse(res.toString())); } catch (e) { console.error(e);	}
		});
	}

	parseBugReports(feed: GetNewBugReportsResponse) {
		if (!feed.rows.length) return;

		let nextLastId = 0;

		feed.rows.forEach(row => {
			this.reportBugReport(row);
			nextLastId = Math.max(nextLastId, row.id);
		});

		localStorage.setItem(Disco.LSKEYS.LASTBUGREPORT, nextLastId.toString());
	}

	reportBugReport(row: BugReport) {
		this.log('reportBugReport()', row.id, row.timestamp, row.tplog, row.comment, row.battle_id, row.attached_file);
		const g = this.getChannel(DiscoChannels.MODONLY);
		const icon = (row.tplog == 'game') ? '🎲' : '⚔️';
		const url = envconfig.FIOTACTICS_API_URL + '/logs/game/' + row.attached_file;
		const dtlog = new Date(row.timestamp).toLocaleString('pt-BR');
		const lines = [
			`=============================================================`,
			`# ${icon} Bug Report [${row.id}]`,
			`* User: ${row.player_name} [${row.player_id}]`,
			`* Date: ${dtlog}`,
			`* File: [${row.attached_file}](${url})`,
			`>>> ${row.comment}`,
		];
		g?.send(lines.join('\n'));
	}

	// ===== COMMANDS & LISTENERS ===================================

	async getFilesFolder(folder: string): Promise<string[]> {
		const files = await fs.promises.readdir(folder);
		const result = [] as string[];

		for (const file of files) {
			const stat = await fs.promises.stat(path.resolve(folder, file));
			if (stat.isDirectory()) {
				const subfiles = await this.getFilesFolder(path.resolve(folder, file));
				result.push(...subfiles);
			} else {
				result.push(path.resolve(folder, file));
			}
		}

		return result;
	}

	async registerCommands() {
		this.log('registerCommands()');
		await this.ready();

		const allfiles = await this.getFilesFolder(cmdfolder);
		const commandFiles = allfiles.filter(file => file.endsWith('.ts') || file.endsWith('.js'));

		for (const file of commandFiles) {
			const command = require(file);
			this.commands.push(command);
		}

		try {
			this.log(`Started refreshing ${this.commands.length} application (/) commands.`);

			// The put method is used to fully refresh all commands in the guild with the current set
			const data = await this.rest.put(
				Routes.applicationGuildCommands(envconfig.DISCORD_APPID, envconfig.DISCORD_GUILDID),
				{ body: this.commands.map(x => x.data.toJSON()) },
			) as any;

			this.log(`Successfully reloaded ${data?.length} application (/) commands.`);
			this.log(data.map((x: any) => x.name).join(', '));
		} catch (error) {
			// And of course, make sure you catch and log any errors!
			console.error(error);
		}
	}

	static prependSymbol(symbol: string, text: string): string {
		// text = text.replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])+/gim, '');
		text = text.replace("🟩", "");
		text = text.replace("⬜", "");
		text = text.replace("🟨", "");
		text = text.replace("🟫", "");
		text = `${symbol} ${text}`;
		return text.replace(/\s+/g, ' ');
	}

	async addListeners() {
		this.client.on(Events.ThreadCreate, async (thread: ThreadChannel) => {
			if (thread.parentId == DiscoLists.SUGESTOES) {
				this.addSuggestionReactions(thread);
			}
			if (thread.parentId == DiscoLists.BUGS) {
				this.addBugReactions(thread);
			}
		});

		this.client.on('interactionCreate', async (interaction: any) => {
			this.log({ commandName: interaction.commandName, cname: interaction.constructor.name });

			if (interaction.constructor.name == 'ButtonInteraction') {

				interaction.commandName = interaction.message.interaction?.commandName;
				this.log('->', interaction.commandName, interaction.customId, typeof interaction.message);

				if (!interaction.commandName) {
					const data = JSON.stringify(interaction.message, (key, value) =>
						typeof value === 'bigint'
							? value.toString()
							: value // return everything else unchanged
						, 2);
					fs.writeFileSync('interaction.json', data);
				}
			}

			const command = this.commands.find(x => x.data.name == interaction.commandName);
			if (!command) return;

			try {
				await command.execute(this.client, interaction);
			} catch (error) {
				console.error(error);
				await interaction.reply({ content: 'There was an error while executing this command!', flags: MessageFlags.Ephemeral });
			}
		});
	}

	// ===== MESSAGES ===============================================

	async send(cname: string, content: string) {
		this.log('send()', cname, content.substring(0, 20));
		const c = this.getChannel(cname);

		// Check for duplicate messages in cache (within 30 seconds)
		const cacheKey = `${cname}:${content}`;
		const cachedMessage = this.messageCache.get(cacheKey);
		const currentTime = Date.now();

		if (cachedMessage && (currentTime - cachedMessage.timestamp < 30000)) {
			this.log('Skipping duplicate message to', cname, '(sent within last 30 seconds)');
			return;
		}

		// Add/update message in cache
		this.messageCache.set(cacheKey, {
			content,
			timestamp: currentTime
		});

		// Clean old cache entries (older than 30 seconds)
		for (const [key, value] of this.messageCache.entries()) {
			if (currentTime - value.timestamp > 30000) {
				this.messageCache.delete(key);
			}
		}

		await c?.send(content);
	}

	// ===== CHANNELS ===============================================

	getChannel(name: string) {
		const c = this.client.channels.cache.find((x: any) => x.name == name || x.id == name);
		return this.client.channels.cache.get(c?.id || '') as TextChannel;
	}

	async purgeMessagesFromChannel(chname: string, match: string) {
		this.log('purgeMessagesFromChannel()', { chname, match });

		const ch = this.getChannel(chname);

		let deleted = 1;
		let totaldeleted = 0;


		while (deleted) {
			const messages = await ch.messages.fetch({limit: 100});
			const total = messages.size;
			deleted = 0;

			const ps = [] as Promise<any>[];

			for (const msg of messages.values()) {
				if (msg.content.includes(match)) {
					const p = msg.delete().then(() => {
						deleted++;
						totaldeleted++;
					});
					ps.push(p);
				}
			}

			await Promise.all(ps);
		}

		this.log(`done purging ${totaldeleted} messages!`);
	}

	async clearChannelFromLinkSource(linksource: string, direction: 'before' | 'after') {
		this.log('clearChannelFromLinkSource()', linksource, direction.toUpperCase());
		const client = new Client({ intents: [GatewayIntentBits.Guilds] });

		const [, , , , , channel_id, message_id] = linksource.split('/');

		client.once('ready', async () => {
			const g = await client.channels.fetch(channel_id) as TextChannel;

			let found = true;
			let total = 0;
			let done = 0;
			let dstart = new Date().getTime();

			while (found) {
				const ms = await g.messages.fetch({ limit: 100, [direction]: message_id });
				console.log({ mssize: ms.size });
				found = ms.size > 0;
				const ps = [] as Promise<any>[];
				for (let i = 0; i < ms.size; i++) {
					const m = ms.at(i);
					if (m?.id && !m?.pinned) {
						total++;
						console.log(total + ':', m?.id, m?.createdAt, m?.author?.username, m?.content);
						const p = g.messages.delete(m.id).then(() => {
							let dtnow = new Date().getTime();
							let duration = dtnow - dstart;
							let avg = duration / total;
							done++;
							console.log({ done, duration, avg });
						});
						ps.push(p);
					}
				}
				await Promise.all(ps);
			}

			console.log('Pronto!');
		});

		client.login(envconfig.DISCORD_BOTTOKEN);
	}

	// ===== THREADS ================================================

	async getThreads(channel_id?: string, getActive: boolean = true, getArchived: boolean = true, limit: number = 100) {
		const keys = channel_id ? [channel_id] : Object.keys(ForumToList);

		const list = [] as ThreadChannel[];
		const ids = [] as string[];

		if (limit < 2) limit = 2;

		this.log('getThreads()', { keys, limit });

		for (const channel_id of keys) {
			const ch2 = await this.client.channels.fetch(channel_id) as TextChannel;

			let threads = new Collection<string, AnyThreadChannel>();

			if (getActive) {
				const active = await ch2.threads.fetchActive();
				threads = threads.concat(active.threads);
			}
			if (getArchived) {
				const archived = await ch2.threads.fetchArchived({ limit });
				threads = threads.concat(archived.threads);
			}

			for (const th of threads) {
				const entry = th[1];
				const id = entry.id;
				if (!ids.includes(id) && entry.parentId == channel_id) {
					ids.push(id);
					list.push(entry);
				}
			}
		}

		return list;
	}

	getThreadsByStatus = async (statuses: StatusData) => {
		const threads = await this.getThreads();

		const result = {
		} as Record<string, string[]>;


		for (const thread of threads) {
			const status = statuses.find(x => thread.name.startsWith(x.color))?.code || 'unknown';
			const list = result[status] || [];
			list.push(channelMention(thread.id));
			result[status] = list;
		}

		for (const status of statuses) {
			const list = result[status.code] || [];
			if (list.length == 0) continue;
			status.label = status.color + ' ' + status.code.toUpperCase() + ' (' + list.length + ')';
		}

		return result;
	}

	async getMentionedCard(thread: ThreadChannel, updateIfNeeded: boolean = false): Promise<string | null> {
		const regex = /[^<](#\d{1,5})/gm;
		const match = thread.name.match(regex);
		const id_title = match?.[0]?.replace('#', '')?.trim();

		if (id_title) return id_title;

		const messages = await thread.messages.fetch({});
		const mentions = [] as { id: string, qty: number }[];

		messages.forEach(x => {
			const match = x.content.match(regex);
			const id = match?.[0]?.replace('#', '')?.trim();
			if (id) {
				const mid = mentions.find(x => x.id === id);
				if (mid) mid.qty++; else mentions.push({ id, qty: 1 });
			}
		});

		mentions.sort((a, b) => b.qty - a.qty);
		const id_body = mentions[0]?.id?.trim();

		if (id_body && updateIfNeeded) await this.renameThread(thread, `${thread.name} #${id_body}`);

		return id_body;
	}

	async renameThread(thread: ThreadChannel, newname: string) {
		const wasArchived = thread.archived;
		if (wasArchived) await thread.setArchived(false);
		await thread.setName(newname);
		if (wasArchived) await thread.setArchived(true);
	}

	// ===== CARDS ==================================================

	async notifyCardMove(card_id: number, author: string, listBefore: string, listAfter: string) {
		this.log('notifyCardMove()', { card_id, author, listBefore, listAfter });

		const threads = await this.getThreads();
		const thread = threads.find(x => x.name.includes('#' + card_id));
		if (!thread) return;

		let symbol = '';

		if (listAfter == 'Doing') {
			symbol = '⬜';
		}

		if (listAfter == 'Done') {
			symbol = '🟨';
		}

		if (symbol) await this.renameThread(thread, Disco.prependSymbol(symbol, thread.name));

		if (listBefore && listAfter) await this.send(thread.id, `**${author}** moveu o card #${card_id} do trello para a lista **[${listAfter}]**.`);
	}

	// ===== MISC ===================================================

	intervalCall(action: () => void, interval: number) {
		action();
		return setInterval(action, interval);
	}

	// ===== LOG ====================================================

	logbar() {
		this.log('==============================================================');
	}

	log(...args: any[]) {
		var args2 = Array.from(args);
		args2.unshift(clc.blueBright('[Discord]'));
		console.log(...args2);
	}
}

export interface DiscoCommand {
	data: any,
	execute: (client: Client<boolean>, interaction: any) => Promise<void>
}


export type StatusData = {
	code: string;
	color: string;
	label?: string;
}[];

interface GetNewBugReportsResponse {
	rows: BugReport[]
}

interface BugReport {
	id: number;
	player_id: number;
	player_name: number;
	timestamp: number;
	tplog: string;
	comment: string;
	battle_id: string;
	attached_file: string;
}