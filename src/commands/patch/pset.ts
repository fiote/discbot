import { SlashCommandBuilder } from '@discordjs/builders';
import { PermissionFlagsBits } from "discord-api-types/v10";
import { Client, CommandInteraction, ThreadChannel } from 'discord.js';

module.exports = {
	data: new SlashCommandBuilder()
		.setName('pset')
		.setDescription(`Avisa que um novo patch/build está sendo preparado.`)
		.addStringOption(option => option.setName("version").setDescription("game version").setRequired(true))
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
	async execute(client: Client, interaction: CommandInteraction) {
		await interaction.deferReply();

		if (!interaction.isCommand()) return;
		const gameversion = interaction.options.get("version")?.value?.toString() || '';

		const ch = await client.channels.fetch(interaction.channelId) as ThreadChannel;
		if (ch.id != '969077856783175772') return await interaction.editReply({ content: 'Você só pode usar esse comando no #avisos-do-jogo.' });

		const prefix = gameversion?.endsWith('0') ? 'Nova build' : 'Patch de correção';
		return await interaction.editReply({ content: `🔶 ${prefix} **${gameversion}** deve sair daqui a pouco. O jogo pode ficar indisponível até isso acontecer.`});
	},
};