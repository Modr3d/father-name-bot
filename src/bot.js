import { Client, GatewayIntentBits, Partials } from 'discord.js';
import dotenv from 'dotenv';
import { supabase } from './db.js';

dotenv.config();

console.log("Starting Discord bot...");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates // สำคัญ! ต้องเพิ่มเพื่อจับการเข้า/ออก voice
  ],
  partials: [Partials.User]
});

client.once('clientReady', () => {
  console.log(`Bot logged in as ${client.user.tag}`);
});

// ตรวจเมื่อมีสมาชิกเข้า Voice channel
client.on('voiceStateUpdate', async (oldState, newState) => {
  // เฉพาะตอน "เข้า" channel (old ไม่มี new มี)
  if (!oldState.channel && newState.channel) {
    const member = newState.member;
    const discordID = member.id;

    console.log(`${member.user.tag} joined voice channel: ${newState.channel.name}`);

    const { data, error } = await supabase
      .from('user_profiles')
      .select('father_name')
      .eq('discord_id', discordID)
      .single();

    if (error) {
      console.error("Supabase Error:", error.message);
      return;
    }

    const channel = newState.guild.systemChannel;
    if (!channel) {
      console.log("System channel not found");
      return;
    }

    if (data?.father_name) {
        channel.send(`สวัสดีครับ <@${discordID}> ลูกของ "${data.father_name}" 👋`);
        } else {
        channel.send(`ยินดีต้อนรับ <@${discordID}>! แต่ผมยังไม่รู้จักพ่อของคุณนะครับ 😅\nพิมพ์คำว่า \`!setfather ชื่อพ่อ\` เพื่อบอกผมได้ครับ`);
        }
  }
});

client.login(process.env.DISCORD_TOKEN);
