import { ForumToList } from "services/disco";
import { channelMention, SlashCommandBuilder } from '@discordjs/builders';
import { ButtonStyle, PermissionFlagsBits } from "discord-api-types/v10";
import { ActionRowBuilder, ButtonBuilder, ButtonInteraction, Client, CommandInteraction, TextChannel } from 'discord.js';


module.exports = {
	data: new SlashCommandBuilder()
		.setName('treport')
		.setDescription(`Mostra um report de todas as threads (ativas, pendentes, não classificadas, etc).`)
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
	async execute(client: Client, interaction: CommandInteraction | ButtonInteraction) {
		await interaction.deferReply();

		const ch = await client.channels.fetch(interaction.channelId) as TextChannel;
		if (ch.id != '1018261249940787311') return await interaction.editReply({ content: 'Você só pode usar esse comando no #moderator-only.' });

		const statuses = [
			{ code: 'live', color: '🟩' },
			{ code: 'done', color: '🟨' },
			{ code: 'pending', color: '⬜' },
			{ code: 'notdoing', color: '🟫' }
		] as StatusData;

		const result = await getThreadsByStatus(statuses, client);

		if (interaction instanceof ButtonInteraction && interaction.customId) {
			const st = statuses.find(x => x.code == interaction.customId);
			if (!st) return await interaction.editReply({ content: 'Nenhuma thread com o status ['+interaction.customId+'].' });
			const content = st.label+'\n'+result[st.code]?.join("\n");
			return await interaction.editReply({ content });
		}

		let content = result.unkown?.join("\n") || 'Nenhuma thread não classificada.';

		const components = [] as ActionRowBuilder<ButtonBuilder>[];

		for (const status of statuses) {
			const list = result[status.code] || [];
			if (list.length == 0) continue;
			const row = new ActionRowBuilder<ButtonBuilder>().addComponents(new ButtonBuilder().setCustomId(status.code).setLabel(status.label || 'LABEL?').setStyle(ButtonStyle.Secondary));
			components.push(row);
		}

		return await interaction.editReply({ content, components });
	},
};

export const getThreadsByStatus = async (statuses: StatusData, client: Client) => {
	const keys = Object.keys(ForumToList);

	const result = {

	} as Record<string, string[]>;

	for (const channel_id of keys) {
		const ch2 = await client.channels.fetch(channel_id) as TextChannel;

		const archived = await ch2.threads.fetchArchived({limit: 100});
		const active = await ch2.threads.fetchActive();

		const threads = archived.threads.concat(active.threads);

		for(const th of threads) {
			const entry = th[1];
			const status = statuses.find(x => entry.name.startsWith(x.color))?.code || 'unknown';
			const list = result[status] || [];
			list.push(channelMention(entry.id));
			result[status] = list;
		}
	}

	for (const status of statuses) {
		const list = result[status.code] || [];
		if (list.length == 0) continue;
		status.label = status.color+' '+status.code.toUpperCase()+' ('+list.length+')';
	}

	return result;
}

type StatusData = {
    code: string;
    color: string;
	label?: string;
}[];