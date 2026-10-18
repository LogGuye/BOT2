const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');
const googleTTS = require('google-tts-api');
const fs = require('fs');
const express = require('express'); // ✅ Thêm Express để làm Web Server cho Render
const logCmd = require('./commands/log/log_slash.js');
const anhCmd = require('./commands/anh.js'); // ✅ Thêm module lệnh /anh

// Khởi tạo web server để Render và UptimeRobot giữ bot luôn thức 24/7
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Bot Discord đang hoạt động trực tuyến!');
});

app.listen(PORT, () => {
  console.log(`Web server đang chạy trên cổng ${PORT}`);
});

// Đọc danh sách viết tắt từ thư mục data
const danhSachVietTat = JSON.parse(fs.readFileSync('./data/viettat.json', 'utf8'));

// Gọi các module slash command từ thư mục commands
const xdach = require('./commands/xidach/xidach_slash.js');
const music = require('./commands/music/music_slash.js');
const logEvent = require('./events/log.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMembers,      // Bắt buộc cho sự kiện thành viên và role
    GatewayIntentBits.GuildModeration
  ]
});

// ✅ Xử lý Slash Commands cho Xì Dách, Music, Log và Ảnh ngẫu nhiên
client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;
  await xdach.execute(interaction);
  await music.execute(interaction);
  await logCmd.execute(interaction);

  // ✅ Thêm điều kiện bắt lệnh /anh
  if (interaction.commandName === 'anh') {
    await anhCmd.execute(interaction);
  }
});

// 🔧 Thay thế từ viết tắt từ file JSON
function thayVietTat(vănBản) {
  const từ = vănBản.split(/\s+/).map(t => {
    const từThường = t.toLowerCase();
    return danhSachVietTat[từThường] || t;
  });
  return từ.join(' ');
}

// 🔧 Phân tích biểu cảm
function phânTíchCảmXúc(vănBản) {
  return vănBản
    .replace(/(:\)+|=\)+)/g, 'mặt cười')
    .replace(/(:\(+|=\(+|:'\()/g, 'mặt buồn')
    .replace(/<3/g, 'trái tim')
    .replace(/:v/g, 'cười đểu')
    .replace(/:o/g, 'ngạc nhiên')
    .replace(/:D/g, 'hahahahaha');
}

// ✅ Biến toàn cục
let hangDoi = [];
let dangNoi = false;
let kếtNốiVoice = null;
let voiceChannelID = null;

client.once('ready', () => {
  console.log(`✅ Bot đăng nhập với tên ${client.user.tag}`);
  console.log(`👉 m_ hoặc / để nói | b_join để vào voice | b_out để rời | b_help để xem lệnh`);
});

// ✅ Gom chung toàn bộ xử lý prefix "b_" vào một sự kiện duy nhất để không bị xung đột TTS
client.on('messageCreate', async (msg) => {
  if (msg.author.bot) return;
  if (!msg.content.startsWith('b_')) return;

  const args = msg.content.slice(2).trim().split(/ +/);
  const lệnh = args.shift().toLowerCase();
  const voiceChannel = msg.member?.voice.channel;

  if (lệnh === 'join') {
    if (!voiceChannel) return msg.reply('⚠️ Bạn cần vào kênh thoại trước!');
    voiceChannelID = voiceChannel.id;

    try {
      kếtNốiVoice = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: msg.guild.id,
        adapterCreator: msg.guild.voiceAdapterCreator,
      });
      return msg.reply('✅ Bot đã vào kênh!');
    } catch (err) {
      console.error('❌ Lỗi khi join:', err);
      return msg.reply('❌ Bot không thể vào kênh.');
    }
  }

  // ✅ Giữ nguyên phần b_help cũ của bạn
  if (lệnh === 'help') {
    return msg.reply({
      content:
        `📘 **DANH SÁCH LỆNH BOT**\n\n` +
        `🎙️ **Hỗ trợ giọng nói (TTS)**:\n` +
        `• \`b_ [nội dung]\` – Bot sẽ đọc to văn bản bạn nhập\n` +
        `• \`b_join\` – Bot tham gia kênh voice của bạn\n` +
        `• \`b_out\` – Bot rời khỏi kênh voice\n\n` +

        `🃏 **Xì Dách (Slash Command)**:\n` +
        `• \`/xd_start [coin]\`, \`/xd_join\`, \`/xd_deal\`, \`/xd_hit\`, \`/xd_stand\`, ...\n` +
        `• \`/xd_baicuatoi\`, \`/xd_check\`, \`/xd_done\`, \`/xd_coin\`, \`/xd_top\`\n` +
        `• \`/xd_reset\`, \`/xd_setcoin\`, \`/xd_luat\`, \`/xd_lenh\`\n` +
        `• \`/xd_startbot [coin]\` – Chơi solo với BOT\n\n` +

        `🎵 **Nhạc (Slash Command)**:\n` +
        `• \`/save [note] [link]\` – Lưu một link nhạc cá nhân\n` +
        `• \`/list\` – Xem danh sách các link nhạc bạn đã lưu\n\n` +

        `💡 **Gợi ý**:\n` +
        `• Bạn nên dùng lệnh slash bằng dấu \`/\` để tự động gợi ý trong Discord.\n` +
        `• Các lệnh prefix \`b_\` dùng cho điều khiển voice và trợ giúp.`,
      ephemeral: false
    });
  }
  
  if (lệnh === 'out') {
    if (kếtNốiVoice) {
      kếtNốiVoice.destroy();
      kếtNốiVoice = null;
      return msg.reply('👋 Bot đã rời khỏi kênh.');
    } else {
      return msg.reply('⚠️ Bot không ở trong kênh.');
    }
  }

  // ✅ Xử lý lệnh nói bằng TTS (b_ [nội dung])
  let vănBản = args.join(' ').trim();
  if (!vănBản && msg.content.length > 2) {
    vănBản = msg.content.slice(2).trim();
  }
  
  if (!vănBản) return msg.reply('❗ Bạn chưa nhập nội dung cần nói.');

  // Chặn spam ký tự lặp vô nghĩa
  const isSpam = (text) => {
    const cleaned = text.replace(/\s/g, '');
    if (/^(.)\1{4,}$/.test(cleaned)) return true;
    if (!/[a-zA-Z]/.test(cleaned)) return true;
    if (cleaned.length <= 3) return true;
    return false;
  };

  if (isSpam(vănBản)) return;

  vănBản = thayVietTat(vănBản);
  vănBản = phânTíchCảmXúc(vănBản);

  if (!voiceChannel) return msg.reply('⚠️ Bạn cần vào kênh thoại trước.');
  voiceChannelID = voiceChannel.id;

  hangDoi.push({
    vănBản,
    guildId: msg.guild.id,
    adapterCreator: msg.guild.voiceAdapterCreator
  });

  if (!dangNoi) {
    xửLýHàngĐợi();
  }
});

// ✅ Xử lý hàng đợi nói TTS
async function xửLýHàngĐợi() {
  if (hangDoi.length === 0) return;

  const lệnh = hangDoi.shift();
  dangNoi = true;

  try {
    if (!kếtNốiVoice || kếtNốiVoice.state.status === 'destroyed') {
      kếtNốiVoice = joinVoiceChannel({
        channelId: voiceChannelID,
        guildId: lệnh.guildId,
        adapterCreator: lệnh.adapterCreator,
      });

      const kiểmTraNgười = setInterval(() => {
        const guild = client.guilds.cache.get(lệnh.guildId);
        const channel = guild.channels.cache.get(voiceChannelID);
        const người = channel.members.filter(m => !m.user.bot).size;

        if (người === 0) {
          console.log('👋 Không còn ai trong kênh. Bot rời kênh.');
          kếtNốiVoice.destroy();
          kếtNốiVoice = null;
          clearInterval(kiểmTraNgười);
        }
      }, 10000);
    }

    const url = googleTTS.getAudioUrl(lệnh.vănBản, { lang: 'vi', slow: false });
    const âmThanh = createAudioResource(url);
    const trìnhPhát = createAudioPlayer();

    kếtNốiVoice.subscribe(trìnhPhát);
    trìnhPhát.play(âmThanh);

    trìnhPhát.on(AudioPlayerStatus.Idle, () => {
      console.log(`✅ Nói xong: ${lệnh.vănBản}`);
      dangNoi = false;
      xửLýHàngĐợi();
    });

  } catch (err) {
    console.error('❌ Lỗi xử lý hàng đợi:', err);
    dangNoi = false;
    xửLýHàngĐợi();
  }
}

// Khởi chạy hệ thống log sự kiện
logEvent.execute(client);

// Đăng nhập bot bằng Biến môi trường trên Render (hoặc token trong data/config.json nếu test local)
const botToken = process.env.DISCORD_TOKEN || require('./data/config.json').token;
client.login(botToken);