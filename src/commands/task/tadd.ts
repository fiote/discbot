import Disco, { DiscoSymbols, ForumToList } from "services/disco";
import { SlashCommandBuilder } from '@discordjs/builders';
import { PermissionFlagsBits } from "discord-api-types/v10";
import { Client, CommandInteraction, ThreadChannel } from 'discord.js';
import { TRELLO } from "@services/trello";

const action = '[Adicionado ao trello! #XXX]';
const symbol = DiscoSymbols.PENDING;

module.exports = {
	data: new SlashCommandBuilder()
		.setName('tadd')
		.setDescription(`Adiciona um bug/sugestão ao trello e marca ele como ${symbol} ${action}.`)
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
	async execute(client: Client, interaction: CommandInteraction) {
		await interaction.deferReply();

		const thread = await client.channels.fetch(interaction.channelId) as ThreadChannel;
		
		const messages = await thread.messages.fetch({limit: 1, after: '0'});
		const message = messages.first();

		const forum = thread.parentId ? ForumToList[thread.parentId] : null;

		if (!forum) return await interaction.reply({ content: 'Você só pode usar esse comando num fórum.' });

		let data = {
			name: thread.name,
			desc: message?.content || 'N/A',
			pos: 'top',
			idList: forum.list,
			idLabels: [forum.label],
			due: null,
			dueComplete: false,
			idMembers: ['54e0c4db6934d7a27c2c3938'],
		};
		
		const card = await TRELLO().createCard(data);
		
		const images = message?.attachments.map(x => x.url);
		if (images?.length) await card.setImageDiscord(images[0]);

		const name = Disco.prependSymbol(symbol, thread.name)+' #'+card.idShort;
		await thread.edit({ name });

		const content = Disco.prependSymbol(symbol, action.replace('#XXX', '#'+card.idShort));
		await interaction.editReply({ content });
	},
};