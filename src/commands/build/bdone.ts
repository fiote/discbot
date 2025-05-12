import { SlashCommandBuilder } from '@discordjs/builders';
import { PermissionFlagsBits } from "discord-api-types/v10";
import { Client, CommandInteraction, ThreadChannel } from 'discord.js';

module.exports = {
	data: new SlashCommandBuilder()
		.setName('bdone')
		.setDescription(`Avisa que uma nova build está pronta!`)
		.addStringOption(option => option.setName("version").setDescription("game version").setRequired(true))
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
	async execute(client: Client, interaction: CommandInteraction) {
		await interaction.deferReply();

		const gameversion = interaction.options.get("version")?.value;

		const ch = await client.channels.fetch(interaction.channelId) as ThreadChannel;
		if (ch.id != '969077856783175772') return await interaction.editReply({ content: 'Você só pode usar esse comando no #avisos-do-jogo.' });

		const lines = [
			`🔷🔷🔷🇧🇷 Server online! NOVA BUILD **${gameversion}**!`,
			`🔷🔷🔷🇺🇸 Server online! NEW BUILD **${gameversion}**!`,
		];

		return await interaction.editReply({ content: lines.join('\n') });
	},
};