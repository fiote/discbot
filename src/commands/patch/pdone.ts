import { SlashCommandBuilder } from '@discordjs/builders';
import { PermissionFlagsBits } from "discord-api-types/v10";
import { Client, CommandInteraction, ThreadChannel } from 'discord.js';

module.exports = {
	data: new SlashCommandBuilder()
		.setName('pdone')
		.setDescription(`Avisa que um novo patch está pronto!`)
		.addStringOption(option => option.setName("version").setDescription("game version").setRequired(true))
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
	async execute(client: Client, interaction: CommandInteraction) {
		await interaction.deferReply();

		const gameversion = interaction.options.get("version")?.value;

		const ch = await client.channels.fetch(interaction.channelId) as ThreadChannel;
		if (ch.id != '969077856783175772') return await interaction.editReply({ content: 'Você só pode usar esse comando no #avisos-do-jogo.' });

		const lines = [
			`🔷🇧🇷 Server online! Patch de correção **${gameversion}** aplicado com sucesso!`,
			`🔷🇺🇸 Server online! Patch **${gameversion}** successfully applied!`,
		];

		return await interaction.editReply({ content: lines.join('\n') });
	},
};