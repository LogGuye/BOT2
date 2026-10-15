const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const CONFIG_FILE = './data/log_config.json';

module.exports = {
  data: [
    new SlashCommandBuilder()
      .setName('setlog')
      .setDescription('Cấu hình kênh và các loại thông tin thông báo')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
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

    // Phản hồi chờ để tránh lỗi "Ứng dụng không phản hồi"
    await interaction.deferReply({ ephemeral: true });

    try {
      const channel = interaction.options.getChannel('kenh');
      const type = interaction.options.getString('loai');
      const status = interaction.options.getBoolean('trangthai');
      const guildId = interaction.guild.id;

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

      config[guildId].channelId = channel.id;
      config[guildId][type] = status;

      // Đảm bảo thư mục data tồn tại trước khi ghi file
      if (!fs.existsSync('./data')) {
        fs.mkdirSync('./data');
      }

      fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));

      const statusText = status ? '🟢 **Bật**' : '🔴 **Tắt**';
      return interaction.editReply({
        content: `✅ Đã cập nhật thành công!\n- Kênh log: <#${channel.id}>\n- Loại sự kiện **[${type}]**: ${statusText}`
      });
    } catch (error) {
      console.error('Lỗi lệnh setlog:', error);
      return interaction.editReply({ content: '❌ Có lỗi xảy ra khi lưu cấu hình!' });
    }
  }
};