import { SlashCommandBuilder } from '@discordjs/builders';
import { DiscoSymbols } from '@services/disco';
import { PermissionFlagsBits } from "discord-api-types/v10";
import { Client, CommandInteraction } from 'discord.js';
import { resolveThread } from "libs/resolver";

const content = '[Não cosnegui replicar/precisamos de mais dados! #XXX]';
const symbol = DiscoSymbols.MORE;
const newlist = 'Need More Reports';

module.exports = {
	data: new SlashCommandBuilder()
		.setName('tmore')
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
