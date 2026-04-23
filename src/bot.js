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

client.on('ready', () => {
  console.log("=== Channels bot can send to (checked on ready) ===");
  client.channels.cache.forEach(channel => {
    // ตรวจสอบเฉพาะ Text Channel และบอทมีสิทธิ์ 'SendMessages'
    if (channel.isTextBased() && channel.permissionsFor(client.user)?.has("SendMessages")) {
      console.log(`# ${channel.name} (${channel.id})`);
    }
  });
  console.log(`Bot is ready! Logged in as ${client.user.tag}`);
});

// ตรวจเมื่อมีสมาชิกเข้า Voice channel
client.on('voiceStateUpdate', async (oldState, newState) => {
  // เฉพาะตอน "เข้า" channel (old ไม่มี new มี)
  if (!oldState.channel && newState.channel) {
    const member = newState.member;
    const discordID = member.id;
    const guild = newState.guild;

    console.log(`${member.user.tag} joined voice channel: ${newState.channel.name}`);

    // 1. ดึงข้อมูลจาก Supabase
    const { data, error } = await supabase
      .from('user_profiles')
      .select('father_name')
      .eq('discord_id', discordID)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 คือ No rows found (หาไม่เจอ)
      console.error("Supabase Error:", error.message);
      // ไม่ต้อง return หากหาไม่เจอ แค่ใช้ data เป็น null/undefined
    }

    // 2. ตรวจสอบช่องที่จะส่ง
    const channel = guild.systemChannel;
    if (!channel) {
      console.log("System channel not found for this guild.");
      return;
    }

    // 3. ตรวจสอบสิทธิ์การส่งข้อความอีกครั้งก่อนส่งจริง
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
          // แม้จะตรวจสอบสิทธิ์แล้ว แต่ถ้ามีปัญหาอื่น ๆ ก็ยังจับ error ไว้
          console.error(`Failed to send message to #${channel.name} (${channel.id}):`, sendError.message);
          // ข้อผิดพลาด 50013 จะถูกจับที่นี่หากเกิดซ้ำ
      }

    } else {
      console.warn(`[WARNING] Missing 'SendMessages' permission for bot in system channel: #${channel.name} (${channel.id}).`);
      console.warn("Please check the bot's role permissions in your Discord server settings.");
    }
  }
});

client.login(process.env.DISCORD_TOKEN);