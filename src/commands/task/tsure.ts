import Disco, { ForumToList } from "services/disco";
import { SlashCommandBuilder } from '@discordjs/builders';
import { PermissionFlagsBits } from "discord-api-types/v10";
import { Client, CommandInteraction, ThreadChannel } from 'discord.js';

const action = '[Vamos fazer isso sim, mas sem criar uma task pra isso -> arquivado]';
const symbol = '🟩';

module.exports = {
	data: new SlashCommandBuilder()
		.setName('tsure')
		.setDescription(`Marca um bug/sugestão como ${symbol} ${action}.`)
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
	async execute(client: Client, interaction: CommandInteraction) {
		await interaction.deferReply();

		const thread = await client.channels.fetch(interaction.channelId) as ThreadChannel;
		const forum = thread.parentId ? ForumToList[thread.parentId] : null;

		if (!forum) return await interaction.editReply({ content: 'Você só pode usar esse comando num fórum.' });
		await thread.edit({ name: `${symbol} ${thread.name}`, archived: true });

		const content = Disco.prependSymbol(symbol, action);
		await interaction.editReply({ content });
	},
};