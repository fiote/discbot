import { DiscoLists, DiscoSymbols, ForumToList } from "services/disco";
import { channelMention, SlashCommandBuilder } from '@discordjs/builders';
import { ButtonStyle, PermissionFlagsBits } from "discord-api-types/v10";
import { ActionRowBuilder, ButtonBuilder, ButtonInteraction, Client, CommandInteraction, TextChannel } from 'discord.js';


module.exports = {
	data: new SlashCommandBuilder()
		.setName('tbugs')
		.setDescription(`Mostra um resumo/lista de todos os bugs.`)
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
	async execute(client: Client, interaction: CommandInteraction | ButtonInteraction) {
		await interaction.deferReply();

		const ch = await client.channels.fetch(interaction.channelId) as TextChannel;
		if (ch.id != '1018261249940787311') return await interaction.editReply({ content: 'Você só pode usar esse comando no #moderator-only.' });

		const channel_id = DiscoLists.BUGS;
		const ch2 = client.channels.cache.filter(x => x.id == channel_id).first() as TextChannel;
		const archived = await ch2.threads.fetchArchived({limit: 100});
		const active = await ch2.threads.fetchActive();

		const threads = archived.threads.concat(active.threads);

		const stSymbols = [] as { state: string, symbol: string }[];
		Object.keys(DiscoSymbols).forEach(state => {
			const symbol = (DiscoSymbols as any)[state];
			stSymbols.push({ state, symbol });
		});

		const stThreads = {} as { [key: string]: {id: string, name: string}[] };

		for(const th of threads) {
			const entry = th[1];
			if (entry.parentId != channel_id) continue;


			const stSymbol = stSymbols.find(s => entry.name.startsWith(s.symbol));
			const symbol = stSymbol?.symbol ?? '⭕';
			const state = stSymbol?.state ?? 'NULL';
			if (!stThreads[state]) stThreads[state] = [];

			const id = entry.id;
			const name = symbol+' '+entry.name.replace(symbol, '');
			stThreads[state].push({id, name});
		}

		const blocks = [
			{ states: ['NULL'], title: 'Bugs não categorizados'},
			{ states: ['PENDING'], title: 'Bugs pendentes'},
			{ states: ['MORE'], title: 'Bugs inconsistentes'},
			// { states: ['DONE'], title: 'Bugs resolvidos'},
			// { states: ['LIVE'], title: 'Em produção'},
			{ states: ['MAYBE'], title: 'Outros'},
			// { states: ['BOT'], title: 'Bugs ignorados'},
		] as { states: string[], title: string }[];

		const rows = [] as string[];

		blocks.forEach(x => {
			const list = [] as string[];
			x.states.forEach(st => {
				const ths = stThreads[st];
				ths?.forEach(th => list.push(`- <#${th.id}>`));
			});
			if (list.length) {
				rows.push(`**${x.title}**`);
				list.forEach(x => rows.push(x));
				rows.push("");
			}
		});

		return await interaction.editReply({ content: rows.join("\n") });
	},
};