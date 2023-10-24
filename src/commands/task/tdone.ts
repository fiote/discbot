import { SlashCommandBuilder } from '@discordjs/builders';
import { DiscoSymbols } from '@services/disco';
import { PermissionFlagsBits } from "discord-api-types/v10";
import { Client, CommandInteraction } from 'discord.js';
import { resolveThread } from "libs/resolver";

const content = '[Resolvido localmente (vai subir na próxima build)! #XXX]';
const symbol = DiscoSymbols.DONE;
const newlist = 'Done';

module.exports = {
	data: new SlashCommandBuilder()
		.setName('tdone')
		.setDescription(`Marca um bug/sugestão como ${symbol} ${content}.`)
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
	async execute(client: Client, interaction: CommandInteraction) {

		await resolveThread({
			client,
			interaction,
			symbol,
			content,
			newlist
		});

	},
};
