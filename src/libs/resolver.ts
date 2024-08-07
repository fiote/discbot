import Disco, { ForumToList } from "services/disco";
import { TRELLO } from "services/trello";
import { Client, CommandInteraction, ThreadChannel } from "discord.js";

interface IResolveThread {
	client: Client;
	interaction: CommandInteraction;
	symbol: string;
	content: string;
	newlist?: string | null;
	archived?: boolean | null;
}

export const resolveThread = async ({ client, interaction, symbol, content, newlist, archived }: IResolveThread) => {
	await interaction.deferReply();
	const ch = await client.channels.fetch(interaction.channelId) as ThreadChannel;

	const messages = await ch.messages.fetch({});
	const forum = ch.parentId ? ForumToList[ch.parentId] : null;

	if (!forum) return await interaction.editReply({ content: 'Você só pode usar esse comando num fórum.' });

	const regex = /(#\d{1,5})/gm;
	const mentions = [] as { id: string, qty: number }[];

	messages.forEach(x => {
		const match = x.content.match(regex);
		const id = match?.[0]?.replace('#', '');
		if (id) {
			const mid = mentions.find(x => x.id === id);
			if (mid) mid.qty++; else mentions.push({ id, qty: 1 });
		}
	});

	const name = Disco.prependSymbol(symbol, ch.name);

	await ch.edit({ name, archived: archived ?? undefined });

	if (mentions.length) {
		mentions.sort((a, b) => b.qty - a.qty);
		const mention = mentions[0];
		const board = await TRELLO().findBoard(forum.board);
		const card = await board?.findCard(mention.id);


		if (card) {
			content = content.replace('#XXX', '#'+card.idShort);
			if (newlist) await card.moveTo(newlist);
		} else {
			await interaction.editReply({ content: 'Card #'+mention.id+' não encontrado no trello.' });
			return;
		}

		content = Disco.prependSymbol(symbol, content);

	} else {
		content = content.replace('#XXX','');
	}

	await interaction.editReply({ content });
};