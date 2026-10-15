const { REST, Routes } = require('discord.js');
const { clientId, guildIds, token } = require('./config.json');

const xdach = require('./commands/xidach/xidach_slash.js');
const music = require('./commands/music/music_slash.js');
const logCmd = require('./commands/log/log_slash.js');

// Gộp lệnh từ cả 2 file lại
const commands = [
  ...xdach.data.map(cmd => cmd.toJSON()),
  ...music.data.map(cmd => cmd.toJSON()),
  ...logCmd.data.map(cmd => cmd.toJSON())
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
