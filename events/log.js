const { Partials, EmbedBuilder, AuditLogEvent } = require('discord.js');
const fs = require('fs');
const CONFIG_FILE = './data/log_config.json';

// Cấu hình mặc định gắn sẵn để không bị mất khi Render reset file
const DEFAULT_CONFIG = {
  "846255149596934158": {
    "channelId": "1560290772983488644",
    "member": true,
    "role": true,
    "voice": true,
    "message": true
  }
};

function getLogConfig() {
  if (!fs.existsSync(CONFIG_FILE)) {
    return DEFAULT_CONFIG;
  }
  try {
    const data = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    if (Object.keys(data).length === 0) return DEFAULT_CONFIG;
    return data;
  } catch (e) {
    return DEFAULT_CONFIG;
  }
}

function sendLog(guild, type, embed) {
  const config = getLogConfig();
  const guildConfig = config[guild.id] || DEFAULT_CONFIG[guild.id];
  if (!guildConfig || !guildConfig.channelId) return;
  if (guildConfig[type] === false) return;

  const channel = guild.channels.cache.get(guildConfig.channelId);
  if (channel) {
    channel.send({ embeds: [embed] }).catch(err => console.error('Lỗi gửi log:', err));
  }
}

module.exports = {
  intents: [
    'Guilds',
    'GuildMembers',
    'GuildModeration',
    'GuildVoiceStates',
    'GuildMessages',
    'MessageContent'
  ],
  partials: [Partials.Message, Partials.Channel, Partials.GuildMember, Partials.User],

  execute(client) {
    // 1. Ai vào / ra server lúc nào
    client.on('guildMemberAdd', member => {
      const embed = new EmbedBuilder()
        .setColor('#57F287')
        .setAuthor({ name: member.user.tag, iconURL: member.user.displayAvatarURL() })
        .setDescription(`📥 **Đã tham gia máy chủ**`)
        .setFooter({ text: `${member.guild.name} •${new Date().toLocaleString()}` })
        .setTimestamp();
      sendLog(member.guild, 'member', embed);
    });

    client.on('guildMemberRemove', member => {
      const embed = new EmbedBuilder()
        .setColor('#ED4245')
        .setAuthor({ name: member.user.tag, iconURL: member.user.displayAvatarURL() })
        .setDescription(`📤 **Đã rời khỏi máy chủ**`)
        .setFooter({ text: `${member.guild.name} •${new Date().toLocaleString()}` })
        .setTimestamp();
      sendLog(member.guild, 'member', embed);
    });

    // 2 & 3. Vào/ra kênh thoại, di chuyển kênh thoại
    client.on('voiceStateUpdate', async (oldState, newState) => {
      const user = newState.member.user;
      const guild = newState.guild;

      // Vào kênh
      if (!oldState.channelId && newState.channelId) {
        const embed = new EmbedBuilder()
          .setColor('#5865F2')
          .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL() })
          .setDescription(`🔊 <@${user.id}> **đã vào kênh** \`${newState.channel.name}\`.`)
          .setFooter({ text: `${guild.name} •${new Date().toLocaleString()}` })
          .setTimestamp();
        sendLog(guild, 'voice', embed);
      } 
      // Rời kênh
      else if (oldState.channelId && !newState.channelId) {
        const embed = new EmbedBuilder()
          .setColor('#ED4245')
          .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL() })
          .setDescription(`🔇 <@${user.id}> **đã rời kênh** \`${oldState.channel.name}\`.`)
          .setFooter({ text: `${guild.name} •${new Date().toLocaleString()}` })
          .setTimestamp();
        sendLog(guild, 'voice', embed);
      } 
      // Chuyển kênh hoặc bị ai đó kéo đi (Move members)
      else if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
        const fetchedLogs = await guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.MemberMove });
        const moveLog = fetchedLogs.entries.first();
        
        let desc = `🔀 <@${user.id}> **đã đổi kênh** từ \`${oldState.channel.name}\` -> \`${newState.channel.name}\`.`;
        if (moveLog && moveLog.target.id === user.id && (Date.now() - moveLog.createdTimestamp < 5000)) {
          desc = `🔀 **${moveLog.executor.tag}** đã di chuyển <@${user.id}> từ \`${oldState.channel.name}\` sang \`${newState.channel.name}\`.`;
        }

        const embed = new EmbedBuilder()
          .setColor('#FEE75C')
          .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL() })
          .setDescription(desc)
          .setFooter({ text: `${guild.name} •${new Date().toLocaleString()}` })
          .setTimestamp();
        sendLog(guild, 'voice', embed);
      }
    });

    // 4. Ai sửa đổi cài đặt server lúc nào
    client.on('guildUpdate', async (oldGuild, newGuild) => {
      const fetchedLogs = await newGuild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.GuildUpdate });
      const updateLog = fetchedLogs.entries.first();
      const executor = updateLog ? updateLog.executor : { tag: 'Không rõ', displayAvatarURL: () => null };

      const embed = new EmbedBuilder()
        .setColor('#EB459E')
        .setAuthor({ name: executor.tag, iconURL: executor.displayAvatarURL?.() })
        .setDescription(`🛠️ **Đã cập nhật cài đặt máy chủ**`)
        .setFooter({ text: `${newGuild.name} •${new Date().toLocaleString()}` })
        .setTimestamp();
      sendLog(newGuild, 'member', embed);
    });

    // 5. Ai sửa role của ai, role gì và lúc nào
    client.on('guildMemberUpdate', async (oldMember, newMember) => {
      const fetchedLogs = await newMember.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.MemberRoleUpdate });
      const roleLog = fetchedLogs.entries.first();
      const executor = roleLog ? roleLog.executor : { tag: 'Hệ thống', displayAvatarURL: () => null };

      const addedRoles = newMember.roles.cache.filter(role => !oldMember.roles.cache.has(role.id));
      const removedRoles = oldMember.roles.cache.filter(role => !newMember.roles.cache.has(role.id));

      if (addedRoles.size > 0) {
        const roleNames = addedRoles.map(r => `\`${r.name}\``).join(', ');
        const embed = new EmbedBuilder()
          .setColor('#57F287')
          .setAuthor({ name: executor.tag, iconURL: executor.displayAvatarURL?.() })
          .setDescription(`✍️ **Đã cấp vai trò cho** <@${newMember.id}>`)
          .addFields({ name: 'Vai trò:', value: roleNames })
          .setFooter({ text: `${newMember.guild.name} •${new Date().toLocaleString()}` })
          .setTimestamp();
        sendLog(newMember.guild, 'role', embed);
      }

      if (removedRoles.size > 0) {
        const roleNames = removedRoles.map(r => `\`${r.name}\``).join(', ');
        const embed = new EmbedBuilder()
          .setColor('#ED4245')
          .setAuthor({ name: executor.tag, iconURL: executor.displayAvatarURL?.() })
          .setDescription(`✍️ **Đã tước vai trò của** <@${newMember.id}>`)
          .addFields({ name: 'Vai trò:', value: roleNames })
          .setFooter({ text: `${newMember.guild.name} • ${new Date().toLocaleString()}` })
          .setTimestamp();
        sendLog(newMember.guild, 'role', embed);
      }
    });

    // 6. Xóa / Sửa tin nhắn (Bao gồm nội dung cũ + mới)
    client.on('messageDelete', message => {
      if (message.author?.bot || !message.guild) return;
      const embed = new EmbedBuilder()
        .setColor('#ED4245')
        .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL() })
        .setDescription(`🗑️ **Đã xóa tin nhắn của** <@${message.author.id}> trong kênh <#${message.channel.id}>.`)
        .addFields({ name: 'Nội dung đã xóa:', value: message.content || '[Không có nội dung văn bản / Hình ảnh]' })
        .setFooter({ text: `${message.guild.name} • ${new Date().toLocaleString()}` })
        .setTimestamp();
      sendLog(message.guild, 'message', embed);
    });

    client.on('messageUpdate', (oldMessage, newMessage) => {
      if (oldMessage.author?.bot || !oldMessage.guild) return;
      if (oldMessage.content === newMessage.content) return;

      const embed = new EmbedBuilder()
        .setColor('#FEE75C')
        .setAuthor({ name: oldMessage.author.tag, iconURL: oldMessage.author.displayAvatarURL() })
        .setDescription(`✏️ **Đã chỉnh sửa tin nhắn** trong kênh <#${oldMessage.channel.id}>.`)
        .addFields(
          { name: 'Nội dung cũ:', value: oldMessage.content || '[Trống]' },
          { name: 'Nội dung mới:', value: newMessage.content || '[Trống]' }
        )
        .setFooter({ text: `${oldMessage.guild.name} • ${new Date().toLocaleString()}` })
        .setTimestamp();
      sendLog(oldMessage.guild, 'message', embed);
    });
  }
};