import { PermissionFlagsBits } from "discord-api-types/v10";
import { SlashCommandBuilder } from '@discordjs/builders';
import { Client, CommandInteraction, ThreadChannel } from 'discord.js';
import Disco, { DiscoForums } from "@classes/disco";
import { Trello } from "@classes/trello";
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