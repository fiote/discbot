import Disco, { DISCORD, DiscoSymbols, ForumToList } from "services/disco";
import { SlashCommandBuilder } from '@discordjs/builders';
import { PermissionFlagsBits } from "discord-api-types/v10";
import { Client, CommandInteraction, ThreadChannel } from 'discord.js';
import { TRELLO } from "@services/trello";

const action = '[Resolvendo agora! #XXX]';
const symbol = DiscoSymbols.PENDING;

module.exports = {
	data: new SlashCommandBuilder()
		.setName('tdoing')
		.setDescription(`Marca um bug/sugestão como ${symbol} ${action}.`)
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
	async execute(client: Client, interaction: CommandInteraction) {
		await interaction.deferReply();

		const thread = await client.channels.fetch(interaction.channelId) as ThreadChannel;
		const forum = thread.parentId ? ForumToList[thread.parentId] : null;

		if (!forum) return await interaction.editReply({ content: 'Você só pode usar esse comando num fórum.' });

		const card_id = await DISCORD().getMentionedCard(thread);

		if (card_id) {
			const board = await TRELLO().findBoard(forum.board);
			const card = await board?.findCard(card_id);
			if (card) await card.moveTo('Doing');
		}

		const content = Disco.prependSymbol(symbol, card_id ? action.replace('#XXX', '#'+card_id) : action);
		await interaction.editReply({ content });
	},
};