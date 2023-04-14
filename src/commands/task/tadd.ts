import { PermissionFlagsBits } from "discord-api-types/v10";
import { SlashCommandBuilder } from '@discordjs/builders';
import { Client, CommandInteraction, ThreadChannel } from 'discord.js';
import { Trello } from "@classes/trello";
import Disco, { DiscoForums } from "@classes/disco";

const action = '[Adicionado ao trello! #XXX]';
const symbol = '⬜';

module.exports = {
	data: new SlashCommandBuilder()
		.setName('tadd')
		.setDescription(`Adiciona um bug/sugestão ao trello e marca ele como ${symbol} ${action}.`)
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
	async execute(client: Client, interaction: CommandInteraction) {
		await interaction.deferReply();

		const ch = await client.channels.fetch(interaction.channelId) as ThreadChannel;
		const forum = ch.parentId ? DiscoForums[ch.parentId] : null;

		if (!forum) return await interaction.reply({ content: 'Você só pode usar esse comando num fórum.' });
		const message = await fetchMessage(ch, interaction);

		let data = {
			name: ch.name,
			desc: message.content,
			pos: 'top',
			idList: forum.list,
			idLabels: [forum.label],
			due: null,
			dueComplete: false,
			idMembers: ['54e0c4db6934d7a27c2c3938'],
		};

		const trello = new Trello();
		const card = await trello.createCard(data);

		const name = Disco.prependSymbol(symbol, ch.name);
		await ch.edit({ name });

		const content = Disco.prependSymbol(symbol, action.replace('#XXX', '#'+card.idShort));
		await interaction.editReply({ content });
	},
};

const fetchMessage = (ch: ThreadChannel<boolean>, interaction: CommandInteraction) : Promise<{content: string}> => {
	return new Promise(resolve => {
		ch.messages.fetch(interaction.channelId).then(msg => {
			resolve(msg);
		}).catch(err => {
			resolve({content: 'N/A'});
		});
	});
};