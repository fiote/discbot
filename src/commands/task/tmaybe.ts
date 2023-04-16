import Disco, { DiscoForums } from "@classes/disco";
import { SlashCommandBuilder } from '@discordjs/builders';
import { PermissionFlagsBits } from "discord-api-types/v10";
import { Client, CommandInteraction, ThreadChannel } from 'discord.js';

const action = '[Talvez vamos fazer isso, mas não agora -> arquivado]';
const symbol = '🟩';

module.exports = {
	data: new SlashCommandBuilder()
		.setName('tmaybe')
		.setDescription(`Marca um bug/sugestão como ${symbol} ${action}.`)
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
	async execute(client: Client, interaction: CommandInteraction) {
		await interaction.deferReply();

		const ch = await client.channels.fetch(interaction.channelId) as ThreadChannel;
		const forum = ch.parentId ? DiscoForums[ch.parentId] : null;

		if (!forum) return await interaction.editReply({ content: 'Você só pode usar esse comando num fórum.' });

		await ch.edit({ name: `${symbol} ${ch.name}`, archived: true });

		const content = Disco.prependSymbol(symbol, action);
		await interaction.editReply({ content });
	},
};