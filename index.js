const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');
const googleTTS = require('google-tts-api');
const fs = require('fs');
const express = require('express'); // ✅ Thêm Express để làm Web Server cho Render

// Khởi tạo web server để Render và UptimeRobot giữ bot luôn thức 24/7
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Bot Discord đang hoạt động trực tuyến!');
});

app.listen(PORT, () => {
  console.log(`Web server đang chạy trên cổng ${PORT}`);
});

// Đọc danh sách viết tắt từ file
const danhSachVietTat = JSON.parse(fs.readFileSync('viettat.json', 'utf8'));

// Gọi các module slash command
const xdach = require('./xidach_slash.js');
const music = require('./music_slash.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates
  ]
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;
  await xdach.execute(interaction);
  await music.execute(interaction);
});

function thayVietTat(vănBản) {
  const từ = vănBản.split(/\s+/).map(t => {
    const từThường = t.toLowerCase();
    return danhSachVietTat[từThường] || t;
  });
  return từ.join(' ');
}

function phânTíchCảmXúc(vănBản) {
  return vănBản
    .replace(/(:\)+|=\)+)/g, 'mặt cười')
    .replace(/(:\(+|=\(+|:'\()/g, 'mặt buồn')
    .replace(/<3/g, 'trái tim')
    .replace(/:v/g, 'cười đểu')
    .replace(/:o/g, 'ngạc nhiên')
    .replace(/:D/g, 'hahahahaha');
}

let hangDoi = [];
let dangNoi = false;
let kếtNốiVoice = null;
let voiceChannelID = null;

client.once('ready', () => {
  console.log(`✅ Bot đăng nhập với tên ${client.user.tag}`);
});

client.on('messageCreate', async (msg) => {
  if (msg.author.bot) return;
  if (!msg.content.startsWith('b_')) return;

  const lệnh = msg.content.slice(2).trim().toLowerCase();
  const voiceChannel = msg.member.voice.channel;

  if (lệnh === 'join') {
    if (!voiceChannel) return msg.reply('⚠️ Bạn cần vào kênh thoại trước!');
    voiceChannelID = voiceChannel.id;

    try {
      kếtNốiVoice = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: msg.guild.id,
        adapterCreator: msg.guild.voiceAdapterCreator,
      });
      msg.reply('✅ Bot đã vào kênh!');
    } catch (err) {
      console.error('❌ Lỗi khi join:', err);
      msg.reply('❌ Bot không thể vào kênh.');
    }
  }

  if (lệnh === 'help') {
    return msg.reply({
      content:
        `📘 **DANH SÁCH LỆNH BOT**\n\n` +
        `🎙️ **Hỗ trợ giọng nói (TTS)**:\n` +
        `• \`/ [nội dung]\` – Bot sẽ đọc to văn bản bạn nhập\n` +
        `• \`b_join\` – Bot tham gia kênh voice của bạn\n` +
        `• \`b_out\` – Bot rời khỏi kênh voice`,
      ephemeral: false
    });
  }
  
  if (lệnh === 'out') {
    if (kếtNốiVoice) {
      kếtNốiVoice.destroy();
      kếtNốiVoice = null;
      msg.reply('👋 Bot đã rời khỏi kênh.');
    } else {
      msg.reply('⚠️ Bot không ở trong kênh.');
    }
  }
});

client.on('messageCreate', async (msg) => {
  const isSpam = (text) => {
    const cleaned = text.replace(/\s/g, '');
    if (/^(.)\1{4,}$/.test(cleaned)) return true;
    if (!/[a-zA-Z]/.test(cleaned)) return true;
    if (cleaned.length <= 3) return true;
    return false;
  };

  if (isSpam(msg.content)) return;
  if (msg.author.bot) return;
  if (!msg.content.startsWith('/')) return;

  let vănBản = msg.content.slice(2).trim();
  if (!vănBản) return msg.reply('❗ Bạn chưa nhập nội dung cần nói.');

  vănBản = thayVietTat(vănBản);
  vănBản = phânTíchCảmXúc(vănBản);

  const thànhViên = msg.member;
  const voiceChannel = thànhViên.voice.channel;
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

    trìnhPhatz = trìnhPhát;
    trìnhPhát.on(AudioPlayerStatus.Idle, () => {
      dangNoi = false;
      xửLýHàngĐợi();
    });

  } catch (err) {
    console.error('❌ Lỗi xử lý hàng đợi:', err);
    dangNoi = false;
    xửLýHàngĐợi();
  }
}

// Đăng nhập bot bằng Biến môi trường trên Render (hoặc token trong config nếu test local)
const botToken = process.env.DISCORD_TOKEN || require('./config.json').token;
client.login(botToken);