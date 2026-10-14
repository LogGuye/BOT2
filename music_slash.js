const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');

const FILE_NAME = 'music_data.json';

// Tải dữ liệu nếu đã có
let musicData = fs.existsSync(FILE_NAME)
  ? JSON.parse(fs.readFileSync(FILE_NAME, 'utf8'))
  : {};

// Lưu dữ liệu lại
function saveData() {
  fs.writeFileSync(FILE_NAME, JSON.stringify(musicData, null, 2));
}

module.exports = {

  data: [
    new SlashCommandBuilder()
      .setName('save')
      .setDescription('Lưu một link nhạc với ghi chú.')
      .addStringOption(opt => opt.setName('note').setDescription('Tên hoặc ghi chú cho link').setRequired(true))
      .addStringOption(opt => opt.setName('link').setDescription('Link nhạc cần lưu').setRequired(true)),

    new SlashCommandBuilder()
      .setName('list')
      .setDescription('Hiển thị danh sách link nhạc bạn đã lưu.'),

    // ✅ Thêm Slash Command mới: /chat [nội dung]
    new SlashCommandBuilder()
      .setName('chat')
      .setDescription('Bot sẽ gửi một tin nhắn công khai.')
      .addStringOption(opt =>
        opt.setName('noidung')
          .setDescription('Nội dung cần bot gửi')
          .setRequired(true))
  ],

  async execute(interaction) {
    const { commandName, user, options } = interaction;
    const userId = user.id;

    if (!musicData[userId]) musicData[userId] = [];

    // ✅ /save
    if (commandName === 'save') {
      const note = options.getString('note');
      const link = options.getString('link');

      if (!note || !link) {
        return interaction.reply({ content: '❌ Thiếu ghi chú hoặc link.', ephemeral: false });
      }

      musicData[userId].push({ note, link });
      saveData();

      return interaction.reply({ content: `✅ Đã lưu: **${note}** – ${link}`, ephemeral: false });
    }

    // ✅ /list
    if (commandName === 'list') {
      const danhSach = musicData[userId];

      if (!danhSach || danhSach.length === 0) {
        return interaction.reply({ content: '📭 Bạn chưa lưu link nhạc nào.', ephemeral: false });
      }

      const hiểnThị = danhSach
        .map((item, i) => `${i + 1}. **${item.note}**: <${item.link}>`)
        .join('\n');

      return interaction.reply({ content: `🎵 **Danh sách link nhạc của bạn:**\n${hiểnThị}`, ephemeral: false });
    }

    // ✅ /chat
    if (commandName === 'chat') {
      const nộiDung = options.getString('noidung');
      await interaction.deferReply({ ephemeral: true });
      await interaction.deleteReply(); // xóa lệnh gốc của người dùng

      return interaction.channel.send(nộiDung); // gửi tin nhắn công khai như bot
    }
  }
};
