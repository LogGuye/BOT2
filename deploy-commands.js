const { REST, Routes } = require('discord.js');
const { clientId, guildIds, token } = require('./config.json');

const xdach = require('./xidach_slash.js');
const music = require('./music_slash.js'); // ✅ Thêm dòng này

// Gộp lệnh từ cả 2 file lại
const commands = [
  ...xdach.data.map(cmd => cmd.toJSON()),
  ...music.data.map(cmd => cmd.toJSON()) // ✅ Thêm dòng này
];

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
  try {
    console.log('🚀 Đang đăng ký Slash Commands...');

    for (const guildId of guildIds) {
      await rest.put(
        Routes.applicationGuildCommands(clientId, guildId),
        { body: commands }
      );
      console.log(`✅ Đã đăng ký Slash Commands cho máy chủ: ${guildId}`);
    }

  } catch (error) {
    console.error('❌ Lỗi khi đăng ký:', error);
  }
})();
