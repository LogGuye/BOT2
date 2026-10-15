const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const CONFIG_FILE = './data/log_config.json';

module.exports = {
  data: [
    new SlashCommandBuilder()
      .setName('setlog')
      .setDescription('Cấu hình kênh và các loại thông tin thông báo')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator) // Chỉ Admin mới dùng được
      .addChannelOption(option =>
        option.setName('kenh')
          .setDescription('Chọn kênh để bot gửi thông báo log')
          .setRequired(true))
      .addStringOption(option =>
        option.setName('loai')
          .setDescription('Chọn loại thông tin cần bật/tắt')
          .setRequired(true)
          .addChoices(
            { name: 'Thành viên vào/ra server', value: 'member' },
            { name: 'Chỉnh sửa Role (Chức vụ)', value: 'role' },
            { name: 'Hoạt động phòng Voice', value: 'voice' },
            { name: 'Xóa tin nhắn', value: 'message' }
          ))
      .addBooleanOption(option =>
        option.setName('trangthai')
          .setDescription('Bật (True) hoặc Tắt (False)')
          .setRequired(true))
  ],

  async execute(interaction) {
    if (interaction.commandName !== 'setlog') return;

    const channel = interaction.options.getChannel('kenh');
    const type = interaction.options.getString('loai');
    const status = interaction.options.getBoolean('trangthai');
    const guildId = interaction.guild.id;

    // Đọc cấu hình hiện tại
    let config = {};
    if (fs.existsSync(CONFIG_FILE)) {
      try {
        config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
      } catch (e) {
        config = {};
      }
    }

    if (!config[guildId]) {
      config[guildId] = { channelId: channel.id, member: true, role: true, voice: true, message: true };
    }

    // Cập nhật kênh và trạng thái loại log tương ứng
    config[guildId].channelId = channel.id;
    config[guildId][type] = status;

    // Lưu lại vào file JSON
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));

    const statusText = status ? '🟢 **Bật**' : '🔴 **Tắt**';
    return interaction.reply({
      content: `✅ Đã cập nhật thành công!\n- Kênh log: <#${channel.id}>\n- Loại sự kiện **[${type}]**: ${statusText}`,
      ephemeral: true
    });
  }
};