import { REST } from '@discordjs/rest';
import clc from 'cli-color';
import { GatewayIntentBits, Routes } from 'discord-api-types/v9';
import { Client, TextChannel } from 'discord.js';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { envconfig } from '../config';

const folder = path.resolve(__dirname);
const cmdfolder = path.resolve(folder, '..', 'commands');

export const DiscoChannels = {
	MODONLY: "moderator-only",
	TWITCHCHAT: "chat-da-twitch"
};

export const DiscoForums = {
	'1020091951086829668': {board:'6093e00f7ec1885cd4759058', list: '609742fabf8e0f586f0d30d7', label: '6190ab3a65bf7137462757d6'}, // {list: "To Do", label: "Changes"}
	'1020091702368817253': {board:'6093e00f7ec1885cd4759058', list: '625c189b4310bd33c4e21ff2', label: '6190ab01f2328d6f86e64bf8'}, // {list: "Queued", label: "Bug"}
} as Record<string, {board: string, list: string, label: string}>;


export default class Disco {

	static instance : Disco;

	rest: REST;
	cready : boolean = false;
	client: Client<boolean>;
	commands = [] as DiscoCommand[];

	// ===== CORE ===================================================

	constructor() {
		this.log('constructor()');
		Disco.instance = this;
		this.rest = new REST({ version: '9' }).setToken(envconfig.DISCORD_BOTTOKEN);
		this.client = new Client({ intents: [ GatewayIntentBits.Guilds ] });
		this.client.login(envconfig.DISCORD_BOTTOKEN);
	}

	async ready() : Promise<void> {
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
		await this.registerCommands();
		await this.addListeners();
		this.addRoutes();
		await this.sayHello();
	}

	async test() {
		this.log('test()');
		return;


		const board = await process.services.trello.findBoard('unity',false);

		const labels = await board?.getLabels();
		labels?.forEach(x => console.log(x.id, x.name));

		await this.ready();

		this.log('get guild?');
		const guild = await this.client.guilds.fetch(envconfig.DISCORD_GUILDID);
		console.log(guild);

		this.log('get role?');
		const role = await guild.roles.cache.find(x => x.name == 'Admin');
		console.log(role);

		// this.send(DiscoChannels.TWITCHCHAT, 'testing bot');
	}

	async sayHello() {
		const hostname = os.hostname();
		this.send('moderator-only', `Hello, I'm online from ${hostname}!`);
	}

	// ===== EXPRESS ROUTES =========================================

	addRoutes() {
		process.services.express.app.post('/rename-channel', async (req, res) => {
			this.log('POST','/rename-channel');
  			this.log(req.body);
			if (req.headers.token != envconfig.EXPRESS_TOKEN) return res.send({status: false, body: 'invalid token'});
			if (req.body.channel) {
				const g = this.getChannel(req.body.channel);
				g.setName(req.body.newname);
			}
   			res.send({status: true});
		});
	}

	// ===== COMMANDS & LISTENERS ===================================

	async getFilesFolder(folder: string) : Promise<string[]> {
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
			this.log(data.map((x:any) => x.name).join(', '));
		} catch (error) {
			// And of course, make sure you catch and log any errors!
			console.error(error);
		}
	}

	static prependSymbol(symbol: string, text: string) : string {
		// text = text.replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])+/gim, '');
		text = text.replace("🟩","");
		text = text.replace("⬜","");
		text = text.replace("🟨","");
		text = text.replace("🟫","");
		text = `${symbol} ${text}`;
		return text.replace(/\s+/g, ' ');
	}

	async addListeners() {
		this.client.on('interactionCreate', async (interaction : any) => {
			this.log({commandName: interaction.commandName, cname: interaction.constructor.name});

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
				await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
			}
		});
	}

	// ===== MESSAGES ===============================================

	async send(cname: string, content: string) {
		this.log('send()', cname, content.substring(0, 20));
		const c = this.getChannel(cname);

		/*
		content = [
			'==============================================================',
			'@here FioTactics | Desenvolvendo um MMORPG ao vivo | Continuando implementação do PVP rankeado',
			'[STREAM ON] https://twitch.tv/fiotebeardev'
		].join('\n');
		*/

		await c?.send(content);
	}

	// ===== CHANNELS ===============================================

	getChannel(name: string) {
		const c = this.client.channels.cache.find((x: any) => x.name == name || x.id == name);
		return this.client.channels.cache.get(c?.id || '') as TextChannel;
	}

	async clearChannel(linksource: string, direction: 'before' | 'after') {
		this.log('clearChannel()', linksource, direction.toUpperCase());
		const client = new Client({ intents: [GatewayIntentBits.Guilds ] });

		const [, , , , , channel_id, message_id] = linksource.split('/');

		client.once('ready', async () => {
			const g = await client.channels.fetch(channel_id) as TextChannel;

			let found = true;
			let total = 0;
			let done = 0;
			let dstart = new Date().getTime();

			while (found) {
				const ms = await g.messages.fetch({limit: 100, [direction]: message_id });
				console.log({mssize: ms.size});
				found = ms.size > 0;
				const ps = [] as Promise<any>[];
				for (let i = 0; i < ms.size; i++) {
					const m = ms.at(i);
					if (m?.id && !m?.pinned) {
						total++;
						console.log(total+':',m?.id, m?.createdAt, m?.author?.username, m?.content);
						const p = g.messages.delete(m.id).then(() => {
							let dtnow = new Date().getTime();
							let duration = dtnow-dstart;
							let avg = duration/total;
							done++;
							console.log({done, duration, avg});
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

	// ===== LOG ====================================================

	log(...args : any[]) {
		var args2 = Array.from(args);
		args2.unshift(clc.blue('[Discord]'));
		console.log(...args2);
	}
}

export interface DiscoCommand {
	data: any,
	execute: (client: Client<boolean>, interaction: any) => Promise<void>
}