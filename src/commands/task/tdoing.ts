import Disco, { DiscoForums } from "services/disco";
import { SlashCommandBuilder } from '@discordjs/builders';
import { PermissionFlagsBits } from "discord-api-types/v10";
import { Client, CommandInteraction, ThreadChannel } from 'discord.js';

const action = '[Resolvendo agora! #XXX]';
const symbol = '⬜';

module.exports = {
	data: new SlashCommandBuilder()
		.setName('tdoing')
		.setDescription(`Marca um bug/sugestão como ${symbol} ${action}.`)
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
	async execute(client: Client, interaction: CommandInteraction) {
		await interaction.deferReply();

		const ch = await client.channels.fetch(interaction.channelId) as ThreadChannel;
		const forum = ch.parentId ? DiscoForums[ch.parentId] : null;

		if (!forum) return await interaction.editReply({ content: 'Você só pode usar esse comando num fórum.' });

		const messages = await ch.messages.fetch({});

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

		if (!mentions.length) return await interaction.editReply({ content: 'Nenhum card mencionado nesse tópico.' });

		mentions.sort((a, b) => b.qty - a.qty);
		const mention = mentions[0];

		const board = await process.services.trello.findBoard(forum.board);
		const card = await board?.findCard(mention.id);

		if (!card) return await interaction.editReply({ content: 'Card #'+mention.id+' não encontrado no trello.' });

		await card.moveTo('Doing');

		const content = Disco.prependSymbol(symbol, action.replace('#XXX', '#'+card.idShort));
		await interaction.editReply({ content });
	},
};