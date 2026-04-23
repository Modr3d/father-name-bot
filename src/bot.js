import { Client, GatewayIntentBits, Partials } from 'discord.js';
import dotenv from 'dotenv';
import { supabase } from './db.js';
import express from 'express';

dotenv.config();

/* ---------------- EXPRESS SERVER ---------------- */
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Bot is running');
});

app.listen(PORT, () => {
  console.log(`Web server running on port ${PORT}`);
});

/* ---------------- DISCORD BOT ---------------- */

console.log("Starting Discord bot...");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates
  ],
  partials: [Partials.User]
});

client.on('ready', () => {
  console.log("=== Channels bot can send to (checked on ready) ===");
  client.channels.cache.forEach(channel => {

    if (channel.isTextBased() && channel.permissionsFor(client.user)?.has("SendMessages")) {
      console.log(`# ${channel.name} (${channel.id})`);
    }
  });
  console.log(`Bot is ready! Logged in as ${client.user.tag}`);
});

client.on('voiceStateUpdate', async (oldState, newState) => {

  if (!oldState.channel && newState.channel) {
    const member = newState.member;
    const discordID = member.id;
    const guild = newState.guild;

    console.log(`${member.user.tag} joined voice channel: ${newState.channel.name}`);

    const { data, error } = await supabase
      .from('user_profiles')
      .select('father_name')
      .eq('discord_id', discordID)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error("Supabase Error:", error.message);

    }

    const channel = guild.systemChannel;
    if (!channel) {
      console.log("System channel not found for this guild.");
      return;
    }

    if (channel.isTextBased() && channel.permissionsFor(client.user)?.has("SendMessages")) {
      
      const fatherName = data?.father_name;
      let messageContent = '';

      if (fatherName) {
        messageContent = `สวัสดีครับ <@${discordID}> ลูกของ "${fatherName}" 👋`;
      } else {
        messageContent = `ยินดีต้อนรับ <@${discordID}>! แต่ผมยังไม่รู้จักพ่อของคุณนะครับ 😅\nพิมพ์คำว่า \`!setfather ชื่อพ่อ\` เพื่อบอกผมได้ครับ`;
      }
      
      try {
          await channel.send(messageContent);
          console.log(`Successfully sent message to #${channel.name}`);
      } catch (sendError) {
          console.error(`Failed to send message to #${channel.name} (${channel.id}):`, sendError.message);
      }

    } else {
      console.warn(`[WARNING] Missing 'SendMessages' permission for bot in system channel: #${channel.name} (${channel.id}).`);
      console.warn("Please check the bot's role permissions in your Discord server settings.");
    }
  }
});

client.login(process.env.DISCORD_TOKEN);