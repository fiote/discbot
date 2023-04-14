import { GatewayIntentBits, PermissionFlagsBits } from "discord-api-types/v10";
import { SlashCommandBuilder } from '@discordjs/builders';
import { Client, CommandInteraction, TextChannel, ThreadChannel, ThreadChannelResolvable } from 'discord.js';
import { DiscoForums } from "@classes/disco";

module.exports = {
	data: new SlashCommandBuilder()
		.setName('tpurge')
		.setDescription(`Deleta posts do #bugs-e-erros e #sugestões finalizados a mais de uma semana.`)
		// .addStringOption(option => option.setName("version").setDescription("game version").setRequired(true))
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
	async execute(client: Client, interaction: CommandInteraction) {
		await interaction.deferReply();

		const ch = await client.channels.fetch(interaction.channelId) as TextChannel;
		if (ch.id != '1018261249940787311') return await interaction.editReply({ content: 'Você só pode usar esse comando no #moderator-only.' });

		const keys = Object.keys(DiscoForums);
		const dtnow = new Date().getTime();

		const deleted = [] as string[];

		const colors = ['🟩','🟫'];

		for (const channel_id of keys) {
			const ch2 = await client.channels.fetch(channel_id) as TextChannel;

			const archived = await ch2.threads.fetchArchived({limit: 100});
			const active = await ch2.threads.fetchActive();

			const threads = archived.threads.concat(active.threads);

			for(const th of threads) {
				const entry = th[1];
				if (!entry.createdTimestamp) continue;
				const difft = (dtnow - entry.createdTimestamp)/1000/60/60/24;
				// console.log({difft, dtnow, creat: entry.createdTimestamp, name: entry.name});
				if (difft && difft > 7 && colors.some(cor => entry.name.startsWith(cor))) {
					await entry.delete();
					colors.forEach(cor => entry.name = entry.name.replace(cor, '').trim());
					deleted.push(entry.name);
				}
			}
		}

		const content = deleted.length ? "Foram deletados **" + deleted.length + " posts**.\n-------\n"+deleted.join("\n") : "Não foram encontrados posts para deletar.";

		return await interaction.editReply({ content });
	},
};