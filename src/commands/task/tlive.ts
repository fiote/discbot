import { SlashCommandBuilder } from '@discordjs/builders';
import { PermissionFlagsBits } from "discord-api-types/v10";
import { Client, CommandInteraction } from 'discord.js';
import { resolveThread } from "libs/resolver";

const content = '[Resolvido em produção (na versão atual)! #XXX]';
const symbol = '🟩';

module.exports = {
	data: new SlashCommandBuilder()
		.setName('tlive')
		.setDescription(`Marca um bug/sugestão como ${symbol} ${content}.`)
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
	async execute(client: Client, interaction: CommandInteraction) {

		await resolveThread({
			client,
			interaction,
			symbol,
			content,
			archived: true
		});
	}
};