import Disco, { DiscoForums } from "services/disco";
import { SlashCommandBuilder } from '@discordjs/builders';
import { PermissionFlagsBits } from "discord-api-types/v10";
import { Client, CommandInteraction, ThreadChannel } from 'discord.js';

const action = '[Isso já está no trello no card #XXX]';
const symbol = '⬜';

module.exports = {
	data: new SlashCommandBuilder()
		.setName('tlink')
		.setDescription(`Marca um bug/sugestão como ${symbol} ${action}.`)
		.addIntegerOption(option => option.setName("cardid").setDescription("card #number").setRequired(true))
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
	async execute(client: Client, interaction: CommandInteraction) {
		await interaction.deferReply();

		const cardid = interaction.options.get("cardid")?.value;

		const ch = await client.channels.fetch(interaction.channelId) as ThreadChannel;
		const forum = ch.parentId ? DiscoForums[ch.parentId] : null;

		if (!forum) return await interaction.editReply({ content: 'Você só pode usar esse comando num fórum.' });
		await ch.edit({ name: `${symbol} ${ch.name}` });

		const content = Disco.prependSymbol(symbol, action.replace('#XXX', '#'+cardid));
		await interaction.editReply({ content });
	},
};