import { SlashCommandBuilder } from '@discordjs/builders';
import { ButtonStyle, PermissionFlagsBits } from "discord-api-types/v10";
import { ActionRowBuilder, ButtonBuilder, ButtonInteraction, Client, CommandInteraction, TextChannel } from 'discord.js';

module.exports = {
	data: new SlashCommandBuilder()
		.setName('xclear')
		.setDescription(`Deleta todos as mensagens de um canal.`)
		// .addStringOption(option => option.setName("version").setDescription("game version").setRequired(true))
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
	async execute(client: Client, interaction: CommandInteraction | ButtonInteraction) {
		await interaction.deferReply();

		const ch = await client.channels.fetch(interaction.channelId) as TextChannel;

		if (interaction !instanceof ButtonInteraction && interaction.customId) {
			const customId = interaction.customId;
			if (customId == 'yes') {
				const content = 'TEM CERTEZA MESMO?';
				const row = new ActionRowBuilder<ButtonBuilder>().addComponents(new ButtonBuilder().setCustomId('iamsure').setLabel('SIM, tenho certeza!').setStyle(ButtonStyle.Danger));
				await interaction.deleteReply();
				await interaction.message.edit({ content, components: [row] });
				return;
			}
			if (customId == 'iamsure') {
				const ch2 = await client.channels.fetch(interaction.channelId) as TextChannel;
				const messages = await ch2.messages.fetch({limit: 100});

				const todel = messages.filter(x => x.id != interaction.message.id);
				const total = todel.size;
				let deleted = 0;

				await interaction.message.edit({ content: `Deletando ${total} mensagens...`, components: [] });

				const ps = [] as Promise<any>[];

				for (const msg of todel.values()) {
					const p = msg.delete().then(() => {
						deleted++;
						interaction.message.edit({ content: `Mensagens deletadas: ${deleted} de ${total}` });
					});
					ps.push(p);
				}

				await Promise.all(ps);

				for (let i = 5; i > 0; i--) {
					await interaction.message.edit({ content: `Essa mensagem se auto-destruirá em ${i} segundo${i == 1 ? '' : 's'}...`, components: [] });
					await new Promise(resolve => setTimeout(resolve, 1000));
				}

				await interaction.message.delete();
				return;
			}
		}

		const content = 'Tem certeza que deseja limpar esse canal?';
		const row = new ActionRowBuilder<ButtonBuilder>().addComponents(new ButtonBuilder().setCustomId('yes').setLabel('Sim, eu quero.').setStyle(ButtonStyle.Danger));
		return await interaction.editReply({ content, components: [row] });
	},
};