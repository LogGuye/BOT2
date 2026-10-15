const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');

const DATA_FILE = './data/xidach_data.json';
const START_COIN = 1000;

let data = fs.existsSync(DATA_FILE)
  ? JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'))
  : {};
let phòngChơi = {}; // guildId: { banker, bet, players, hands, deck, turn, kếtThúc }

function lưuData() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function tạoBài() {
  const suits = ['♠', '♥', '♦', '♣'];
  const ranks = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
  const deck = [];
  for (const s of suits) for (const r of ranks) deck.push({ s, r });
  return deck.sort(() => Math.random() - 0.5);
}

function tínhĐiểm(bài) {
  let total = 0, aces = 0;
  for (const c of bài) {
    if (['J','Q','K'].includes(c.r)) total += 10;
    else if (c.r === 'A') { total += 11; aces++; }
    else total += parseInt(c.r);
  }
  while (total > 21 && aces > 0) { total -= 10; aces--; }
  return total;
}

function loạiĐặcBiệt(bài) {
  const điểm = tínhĐiểm(bài);
  if (bài.length === 2 && bài.some(c => c.r === 'A') && bài.some(c => ['10','J','Q','K'].includes(c.r))) return 'xì dách';
  if (bài.length === 2 && bài.every(c => c.r === 'A')) return 'xì bàn';
  if (bài.length === 5 && điểm <= 21) return 'ngũ linh';
  return null;
}

function formatBài(b) {
  return b.map(c => `${c.r}${c.s}`).join(', ');
}

function embedBài(bài, điểm, đặcBiệt = null) {
  let môTả = `**${formatBài(bài)}**\nĐiểm: **${điểm}**`;
  if (đặcBiệt) môTả += `\n⭐ Đặc biệt: **${đặcBiệt.toUpperCase()}**`;

  return new EmbedBuilder()
    .setColor('Blue')
    .setTitle('🃏 Bài của bạn')
    .setDescription(môTả);
}


module.exports = {
  data: [
    new SlashCommandBuilder().setName('xd_start').setDescription('Mở sòng và làm cái').addIntegerOption(opt => opt.setName('coin').setDescription('Coin mỗi người cược').setRequired(true)),
    new SlashCommandBuilder().setName('xd_join').setDescription('Tham gia sòng'),
    new SlashCommandBuilder().setName('xd_deal').setDescription('Chia bài bắt đầu'),
    new SlashCommandBuilder().setName('xd_baicuatoi').setDescription('Xem bài của bạn trong ván hiện tại.'),
    new SlashCommandBuilder().setName('xd_hit').setDescription('Rút bài'),
    new SlashCommandBuilder().setName('xd_stand').setDescription('Dừng rút'),
    new SlashCommandBuilder().setName('xd_check').setDescription('Cái kiểm tra bài người chơi').addUserOption(opt => opt.setName('nguoichoi').setDescription('Người cần kiểm').setRequired(true)),
    new SlashCommandBuilder().setName('xd_done').setDescription('Lật bài tất cả người chơi'),
    new SlashCommandBuilder().setName('xd_coin').setDescription('Xem coin của bạn'),
    new SlashCommandBuilder().setName('xd_lenh').setDescription('Xem danh sách các lệnh có thể dùng'),
    new SlashCommandBuilder().setName('xd_luat').setDescription('Xem luật chơi Xì Dách'),
    new SlashCommandBuilder().setName('xd_top').setDescription('Xem bảng xếp hạng coin'),
    new SlashCommandBuilder().setName('xd_startbot').setDescription('Chơi solo với BOT Xì Dách').addIntegerOption(opt => opt.setName('coin').setDescription('Coin bạn cược').setRequired(true)),
    new SlashCommandBuilder().setName('xd_reset').setDescription('Reset coin của người chơi').addUserOption(opt => opt.setName('nguoichoi').setDescription('Người chơi cần reset').setRequired(true)),
    new SlashCommandBuilder().setName('xd_setcoin').setDescription('Thiết lập số coin cho người chơi (chỉ chủ bot)').addUserOption(opt => opt.setName('nguoichoi').setDescription('Người chơi cần chỉnh').setRequired(true)).addIntegerOption(opt => opt.setName('coin').setDescription('Số coin cần đặt').setRequired(true))
  ],

  async execute(interaction) {
    const { commandName, guildId, user, options } = interaction;
    const userId = user.id;
    const tên = user.username;

    if (!data[userId]) data[userId] = { coin: START_COIN };
    const phòng = phòngChơi[guildId];

    if (commandName === 'xd_coin') {
      return interaction.reply({ content: `💰 ${tên} có ${data[userId].coin} coin.`, ephemeral: true });
    }

    if (commandName === 'xd_start') {
      const bet = options.getInteger('coin');
      if (data[userId].coin < bet) return interaction.reply({ content: '❌ Không đủ coin để làm cái.', ephemeral: true });

      phòngChơi[guildId] = {
        banker: userId,
        bet,
        players: [userId],
        hands: {},
        turn: 0,
        deck: tạoBài(),
        kếtThúc: false
      };
      return interaction.reply(`🃏 ${tên} đã mở sòng xì dách với cược ${bet} coin.\nAi muốn chơi dùng /xd_join`);
    }

    if (commandName === 'xd_join') {
      if (!phòng || phòng.kếtThúc) return interaction.reply({ content: '❌ Không có sòng nào!', ephemeral: true });
      if (phòng.players.includes(userId)) return interaction.reply({ content: '❗ Bạn đã tham gia!', ephemeral: true });
      if (data[userId].coin < phòng.bet) return interaction.reply({ content: '❌ Không đủ coin để tham gia.', ephemeral: true });

      phòng.players.push(userId);
      return interaction.reply(`✅ ${tên} đã tham gia sòng!`);
    }

    if (commandName === 'xd_deal') {
      if (!phòng || phòng.banker !== userId)
        return interaction.reply({ content: '❌ Bạn không phải cái.', ephemeral: true });

      await interaction.deferReply({ ephemeral: false });

      phòng.deck = tạoBài();
      phòng.hands = {};
      phòng.turn = 0;
      phòng.kếtThúc = false;
      phòng.state = 'playing';

      for (const id of phòng.players) {
        phòng.hands[id] = [phòng.deck.pop(), phòng.deck.pop()];
      }

      const đầu = phòng.players[phòng.turn];
      await interaction.editReply(`✅ Đã chia bài. 👉 Đến lượt <@${đầu}> → dùng /xd_hit hoặc /xd_stand`);
    }

    if (commandName === 'xd_baicuatoi') {
      if (!phòng || phòng.state !== 'playing') {
        return interaction.reply({ content: '❌ Không có ván nào đang diễn ra.', ephemeral: true });
      }

      if (!phòng.players.includes(userId)) {
        return interaction.reply({ content: '❌ Bạn không tham gia ván này.', ephemeral: true });
      }

      const bài = phòng.hands[userId];
      if (!bài) return interaction.reply({ content: '❌ Bạn chưa được chia bài.', ephemeral: true });

      const điểm = tínhĐiểm(bài);
      const đặcBiệt = loạiĐặcBiệt(bài);
      const embed = embedBài(bài, điểm, đặcBiệt);
      
      return interaction.reply({ content: '🃏 Đây là bài của bạn:', embeds: [embed], ephemeral: true });
    }

    if (commandName === 'xd_hit') {
      if (!phòng || phòng.kếtThúc) return interaction.reply({ content: '❌ Không có ván nào.', ephemeral: true });
      if (phòng.players[phòng.turn] !== userId) return interaction.reply({ content: '⏳ Chưa đến lượt bạn.', ephemeral: true });

      const bài = phòng.hands[userId];
      bài.push(phòng.deck.pop());
      const điểm = tínhĐiểm(bài);
      const đặcBiệt = loạiĐặcBiệt(bài);
      await interaction.reply({
        embeds: [embedBài(bài, điểm, đặcBiệt)],
        ephemeral: true
      });
      
      if (điểm > 21) {
        interaction.followUp({ content: '💥 Bạn đã quắc!', ephemeral: true });
        phòng.kếtThúc = true; // ✅ đánh dấu kết thúc để /xd_stand xử lý bot
      }      

      if (phòng.bot) {
        // BOT rút bài thông minh hơn
        const bàiBot = phòng.hands['BOT'];
        while (true) {
          const điểm = tínhĐiểm(bàiBot);
          if (điểm >= 18 || bàiBot.length >= 5 || Math.random() > 0.7) break; // 70% là không rút thêm nếu khá cao
          bàiBot.push(phòng.deck.pop());
        }
      
        const điểmNg = tínhĐiểm(phòng.hands[userId]);
        const điểmBot = tínhĐiểm(bàiBot);
        const đặcNg = loạiĐặcBiệt(phòng.hands[userId]);
        const đặcBot = loạiĐặcBiệt(bàiBot);
      
        let result = '';
        let thắng = false, hòa = false;
      
        if (đặcNg && !đặcBot) thắng = true;
        else if (!đặcNg && đặcBot) thắng = false;
        else if (đặcNg && đặcBot) {
          const ưuTiên = { 'ngũ linh': 3, 'xì bàn': 2, 'xì dách': 1 };
          const soNg = ưuTiên[đặcNg];
          const soBot = ưuTiên[đặcBot];
          if (soNg > soBot) thắng = true;
          else if (soNg < soBot) thắng = false;
          else hòa = true;
        } else {
          if (điểmNg > 21 || (điểmBot <= 21 && điểmBot > điểmNg)) thắng = false;
          else if (điểmNg === điểmBot) hòa = true;
          else thắng = true;
        }
      
        if (hòa) {
          result = `🤝 Hòa!\n**Bạn**: ${formatBài(phòng.hands[userId])} (${điểmNg})\n**BOT**: ${formatBài(bàiBot)} (${điểmBot})`;
        } else if (thắng) {
          data[userId].coin += phòng.bet;
          result = `✅ Bạn thắng BOT!\n**Bạn**: ${formatBài(phòng.hands[userId])} (${điểmNg})\n**BOT**: ${formatBài(bàiBot)} (${điểmBot})`;
        } else {
          data[userId].coin -= phòng.bet;
          result = `❌ Bạn thua BOT.\n**Bạn**: ${formatBài(phòng.hands[userId])} (${điểmNg})\n**BOT**: ${formatBài(bàiBot)} (${điểmBot})`;
        }
      
        lưuData();
        return interaction.followUp({ content: result, ephemeral: false });
      }      
         
    }

    if (commandName === 'xd_stand') {
      if (!phòng || phòng.kếtThúc) return interaction.reply({ content: '❌ Không có ván nào.', ephemeral: true });
      if (phòng.players[phòng.turn] !== userId) return interaction.reply({ content: '⏳ Chưa đến lượt bạn.', ephemeral: true });

      interaction.reply({ content: '✋ Bạn đã kết thúc lượt.', ephemeral: true });
      if (phòng.bot) {
        // BOT rút bài thông minh hơn
        const bàiBot = phòng.hands['BOT'];
        while (true) {
          const điểm = tínhĐiểm(bàiBot);
          if (điểm >= 18 || bàiBot.length >= 5 || Math.random() > 0.7) break; // 70% là không rút thêm nếu khá cao
          bàiBot.push(phòng.deck.pop());
        }
      
        const điểmNg = tínhĐiểm(phòng.hands[userId]);
        const điểmBot = tínhĐiểm(bàiBot);
        const đặcNg = loạiĐặcBiệt(phòng.hands[userId]);
        const đặcBot = loạiĐặcBiệt(bàiBot);
      
        let result = '';
        let thắng = false, hòa = false;
      
        if (đặcNg && !đặcBot) thắng = true;
        else if (!đặcNg && đặcBot) thắng = false;
        else if (đặcNg && đặcBot) {
          const ưuTiên = { 'ngũ linh': 3, 'xì bàn': 2, 'xì dách': 1 };
          const soNg = ưuTiên[đặcNg];
          const soBot = ưuTiên[đặcBot];
          if (soNg > soBot) thắng = true;
          else if (soNg < soBot) thắng = false;
          else hòa = true;
        } else {
          if (điểmNg > 21 || (điểmBot <= 21 && điểmBot > điểmNg)) thắng = false;
          else if (điểmNg === điểmBot) hòa = true;
          else thắng = true;
        }
      
        await interaction.deferReply({ ephemeral: false }); // ✅ thêm dòng này

        if (hòa) {
          result = `🤝 Hòa!\n**Bạn**: ${formatBài(phòng.hands[userId])} (${điểmNg})\n**BOT**: ${formatBài(bàiBot)} (${điểmBot})`;
        } else if (thắng) {
          data[userId].coin += phòng.bet;
          result = `✅ Bạn thắng BOT!\n**Bạn**: ${formatBài(phòng.hands[userId])} (${điểmNg})\n**BOT**: ${formatBài(bàiBot)} (${điểmBot})`;
        } else {
          data[userId].coin -= phòng.bet;
          result = `❌ Bạn thua BOT.\n**Bạn**: ${formatBài(phòng.hands[userId])} (${điểmNg})\n**BOT**: ${formatBài(bàiBot)} (${điểmBot})`;
        }
        
        lưuData();
        return interaction.editReply({ content: result });
        
      }
      
      nextTurn(interaction, phòng);
    }

    if (commandName === 'xd_check') {
      if (!phòng || phòng.banker !== userId)
        return interaction.reply({ content: '❌ Bạn không phải cái.', ephemeral: true });
    
      const target = options.getUser('nguoichoi');
      const targetId = target.id;
    
      if (!phòng.hands[targetId])
        return interaction.reply({ content: '❌ Người này không trong sòng.', ephemeral: true });
    
      const bàiNg = phòng.hands[targetId];
      const điểmNg = tínhĐiểm(bàiNg);
      const đặcBiệtNg = loạiĐặcBiệt(bàiNg);
    
      const bàiCái = phòng.hands[phòng.banker];
      const điểmCái = tínhĐiểm(bàiCái);
      const đặcBiệtCái = loạiĐặcBiệt(bàiCái);
    
      let thắng = false;
      let hòa = false;
    
      if (đặcBiệtNg && !đặcBiệtCái) thắng = true;
      else if (!đặcBiệtNg && đặcBiệtCái) thắng = false;
      else if (đặcBiệtNg && đặcBiệtCái) {
        const ưuTiên = { 'ngũ linh': 3, 'xì bàn': 2, 'xì dách': 1 };
        const soNg = ưuTiên[đặcBiệtNg];
        const soCái = ưuTiên[đặcBiệtCái];
    
        if (soNg > soCái) thắng = true;
        else if (soNg < soCái) thắng = false;
        else hòa = true;
      } else {
        if (điểmNg > 21 || (điểmCái <= 21 && điểmCái > điểmNg)) thắng = false;
        else if (điểmCái === điểmNg) hòa = true;
        else thắng = true;
      }

      interaction.channel.send(`📣 Bài của <@${targetId}> đã bị check!`);
      let báoCáo = `🃏 ${tên} kiểm bài ${target.username}: ${formatBài(bàiNg)} (${điểmNg}${đặcBiệtNg ? ` – ${đặcBiệtNg}` : ''})\n`;
    
      if (hòa) {
        báoCáo += `🤝 <@${targetId}> hòa.`;
      } else if (thắng) {
        data[targetId].coin += phòng.bet;
        data[phòng.banker].coin -= phòng.bet;
        báoCáo += `✅ <@${targetId}> thắng!`;
      } else {
        data[targetId].coin -= phòng.bet;
        data[phòng.banker].coin += phòng.bet;
        báoCáo += `❌ <@${targetId}> thua.`;
      }
    
      lưuData();
      return interaction.reply(báoCáo);
    }
    

    if (commandName === 'xd_done') {
      if (!phòng || phòng.banker !== userId)
        return interaction.reply({ content: '❌ Bạn không phải cái.', ephemeral: true });
    
      if (!phòng.kếtThúc)
        return interaction.reply({ content: '⏳ Chưa đến lúc kết thúc. Hãy chờ người chơi chơi xong.', ephemeral: true });
    
      const bàiCái = phòng.hands[phòng.banker];
      const điểmCái = tínhĐiểm(bàiCái);
      const đặcBiệtCái = loạiĐặcBiệt(bàiCái);
    
      let báoCáo = `🃏 **Kết quả kiểm bài cả bàn:**\n\n👑 **Cái – <@${phòng.banker}>**: (${formatBài(bàiCái)}) – ${điểmCái}${đặcBiệtCái ? ` – ${đặcBiệtCái}` : ''}\n`;
    
      for (const id of phòng.players) {
        if (id === phòng.banker) continue;
    
        const bài = phòng.hands[id];
        const điểm = tínhĐiểm(bài);
        const đặcBiệt = loạiĐặcBiệt(bài);
    
        let thắng = false;
        let hòa = false;
    
        if (đặcBiệt && !đặcBiệtCái) thắng = true;
        else if (!đặcBiệt && đặcBiệtCái) thắng = false;
        else if (đặcBiệt && đặcBiệtCái) {
          const ưuTiên = { 'ngũ linh': 3, 'xì bàn': 2, 'xì dách': 1 };
          const a = ưuTiên[đặcBiệt];
          const b = ưuTiên[đặcBiệtCái];
    
          if (a > b) thắng = true;
          else if (a < b) thắng = false;
          else hòa = true;
        } else {
          if (điểm > 21 || (điểmCái <= 21 && điểmCái > điểm)) thắng = false;
          else if (điểmCái === điểm) hòa = true;
          else thắng = true;
        }
    
        if (hòa) {
          báoCáo += `🤝 <@${id}> hòa. (${formatBài(bài)} – ${điểm}${đặcBiệt ? ` – ${đặcBiệt}` : ''})\n`;
        } else if (thắng) {
          data[id].coin += phòng.bet;
          data[phòng.banker].coin -= phòng.bet;
          báoCáo += `✅ <@${id}> thắng! (${formatBài(bài)} – ${điểm}${đặcBiệt ? ` – ${đặcBiệt}` : ''})\n`;
        } else {
          data[id].coin -= phòng.bet;
          data[phòng.banker].coin += phòng.bet;
          báoCáo += `❌ <@${id}> thua. (${formatBài(bài)} – ${điểm}${đặcBiệt ? ` – ${đặcBiệt}` : ''})\n`;
        }
      }
    
      lưuData();
      return interaction.reply(báoCáo);
    }

    if (commandName === 'xd_lenh') {
      return interaction.reply({
        ephemeral: false,
        content:
          `📌 **DANH SÁCH LỆNH XÌ DÁCH**\n` +
          `• \`/xd_start [coin]\` – Mở sòng và làm cái\n` +
          `• \`/xd_join\` – Tham gia sòng chơi\n` +
          `• \`/xd_deal\` – Cái chia bài bắt đầu ván\n` +
          `• \`/xd_baicuatoi\` – Xem bài của bạn\n` +
          `• \`/xd_hit\` – Rút thêm bài\n` +
          `• \`/xd_stand\` – Dừng không rút nữa\n` +
          `• \`/xd_check [@user]\` – Cái kiểm bài người chơi\n` +
          `• \`/xd_done\` – Cái kết thúc và kiểm tất cả bài\n` +
          `• \`/xd_coin\` – Xem số coin hiện có\n` +
          `• \`/xd_top\` – Xem bảng xếp hạng coin trong server\n` +
          `• \`/xd_reset [@user]\` – Reset coin (admin)\n` +
          `• \`/xd_setcoin [@user] [coin]\` – Thiết lập coin (admin)\n` +
          `• \`/xd_luat\` – Xem luật chơi\n` +
          `• \`/xd_lenh\` – Xem danh sách các lệnh`
      });
    }
    

    if (commandName === 'xd_luat') {
      return interaction.reply({
        ephemeral: false,
        content:
    `📜 **LUẬT VÀ QUY TRÌNH CHƠI XÌ DÁCH**:
    
    👑 **1. Mở sòng và tham gia:**
    • \`/xd_start [coin]\` – Người làm "cái" mở sòng (cần có đủ coin).
    • \`/xd_join\` – Người chơi tham gia sòng.
    
    🎲 **2. Bắt đầu chia bài:**
    • \`/xd_deal\` – "Cái" chia 2 lá bài cho tất cả người chơi.
    
    🃏 **3. Rút bài theo lượt:**
    • Mỗi người chơi đến lượt sẽ dùng:
      → \`/xd_hit\` – Rút thêm 1 lá bài.
      → \`/xd_stand\` – Dừng rút bài.
    
    💥 Nếu rút vượt quá 21 điểm sẽ bị "quắc" và thua.
    
    📥 **4. Xem bài:**
    • \`/xd_baicuatoi\` – Xem lại bài của bạn (bot gửi ẩn).
    
    📤 **5. Kết thúc và so bài:**
    • \`/xd_check [@user]\` – "Cái" kiểm bài từng người (xem thắng thua).
    • \`/xd_done\` – "Cái" kết thúc toàn ván và tự động so điểm với tất cả người chơi.
    
    🧠 **6. Tính điểm:**
    • A tính 1 hoặc 11 điểm. J/Q/K = 10.
    • Tổng điểm gần 21 nhất và không vượt quá là tốt nhất.
    
    🌟 **Trường hợp đặc biệt:**
    • **Xì Dách**: A + 10/J/Q/K → thắng ngay nếu chia đầu.
    • **Xì Bàn**: 2 lá đều là A → thắng tuyệt đối.
    • **Ngũ Linh**: Có 5 lá bài nhưng tổng điểm ≤ 21 → thắng tất cả.

    📊 **Thứ tự ưu tiên khi có đặc biệt**:
    • 🖐 **Ngũ Linh** > 🂡 **Xì Bàn** > 🂱 **Xì Dách**
    → Nếu cả người chơi và cái cùng có đặc biệt, ai có loại cao hơn sẽ thắng.
    → Nếu cả hai có **cùng loại đặc biệt**, **được tính là hòa**.

    💰 **7. Coin thắng thua:**
    • Người thắng nhận thêm coin = cược bàn.
    • Người thua chung người thắng.
    
    🎉 Chúc bạn chơi vui!`
      });
    }
    
    // Chủ sở hữu bot
const OWNER_ID = '883860409784877127';

if (commandName === 'xd_top') {
  try {
    // Chỉ lấy thành viên đang có trong cache của server (an toàn)
    const members = interaction.guild.members.cache;
    const idsTrongServer = new Set(members.map(m => m.id));

    const bảng = Object.entries(data)
      .filter(([id]) => idsTrongServer.has(id))
      .sort(([, a], [, b]) => b.coin - a.coin)
      .slice(0, 5)
      .map(([id, u], i) => `**${i + 1}. <@${id}>**: ${u.coin} coin`)
      .join('\n');

    return interaction.reply({
      content: `🏆 **TOP COIN NGƯỜI CHƠI**:\n${bảng || 'Không có dữ liệu!'}`,
      ephemeral: false
    });

  } catch (error) {
    console.error('❌ Lỗi khi xử lý /xd_top:', error);
    if (!interaction.replied) {
      return interaction.reply({ content: '❌ Có lỗi xảy ra khi lấy top coin.', ephemeral: true });
    }
  }
}

if (commandName === 'xd_reset') {
  if (userId !== '883860409784877127') // ID của bạn
    return interaction.reply({ content: '❌ Bạn không có quyền dùng lệnh này.', ephemeral: true });

  const target = options.getUser('nguoichoi');
  const id = target.id;

  if (!data[id]) data[id] = { coin: START_COIN };
  else data[id].coin = START_COIN;

  lưuData();
  return interaction.reply({ content: `🔄 Đã reset coin của <@${id}> về ${START_COIN}.`, ephemeral: true });
}

if (commandName === 'xd_setcoin') {
  if (userId !== OWNER_ID)
    return interaction.reply({ content: '❌ Bạn không có quyền dùng lệnh này.', ephemeral: false });

  const target = options.getUser('nguoichoi');
  const id = target.id;
  const coin = options.getInteger('coin');

  if (!data[id]) data[id] = { coin };
  else data[id].coin = coin;

  lưuData();
  return interaction.reply({ content: `✅ Đã đặt coin cho <@${id}> là ${coin}.`, ephemeral: false });
}

if (commandName === 'xd_startbot') {
  const bet = options.getInteger('coin');
  if (data[userId].coin < bet) return interaction.reply({ content: '❌ Không đủ coin để chơi.', ephemeral: true });

  // Tạo phòng solo với bot
  phòngChơi[guildId] = {
    banker: 'BOT',
    bot: true,
    solo: true,
    bet,
    players: [userId],
    hands: {},
    turn: 0,
    deck: tạoBài(),
    kếtThúc: false,
    state: 'playing'
  };

  // Chia bài
  const phòng = phòngChơi[guildId];
  phòng.hands[userId] = [phòng.deck.pop(), phòng.deck.pop()];
  phòng.hands['BOT'] = [phòng.deck.pop(), phòng.deck.pop()];

  return interaction.reply({
    content: `🎮 Bạn bắt đầu chơi solo với BOT cược ${bet} coin.\n👉 ! /xd_baicuatoi để coi bài. /xd_hit (rút) hoặc /xd_stand (dừng).`,
    ephemeral: false
  });
}

function nextTurn(inter, phòng) {
  do {
    phòng.turn++;
  } while (
    phòng.turn < phòng.players.length &&
    tínhĐiểm(phòng.hands[phòng.players[phòng.turn]]) > 21
  );

  if (phòng.turn >= phòng.players.length) {
    phòng.kếtThúc = true;
    inter.channel.send('✅ Tất cả đã xong. Dùng /xd_check từng người hoặc /xd_done để kết thúc.');
  } else {
    const id = phòng.players[phòng.turn];

    if (phòng.bot && id === 'BOT') {
      // BOT xử lý tự rút bài thông minh (tỉ lệ thắng cao hơn người chơi)
      const bàiBot = phòng.hands['BOT'];
      while (true) {
        const điểm = tínhĐiểm(bàiBot);
        if (điểm >= 18 || bàiBot.length >= 5 || Math.random() > 0.7) break;
        bàiBot.push(phòng.deck.pop());
      }

      const userId = phòng.players.find(id => id !== 'BOT');
      const bàiNg = phòng.hands[userId];
      const điểmNg = tínhĐiểm(bàiNg);
      const đặcNg = loạiĐặcBiệt(bàiNg);
      const điểmBot = tínhĐiểm(bàiBot);
      const đặcBot = loạiĐặcBiệt(bàiBot);

      let thắng = false, hòa = false;
      if (đặcNg && !đặcBot) thắng = true;
      else if (!đặcNg && đặcBot) thắng = false;
      else if (đặcNg && đặcBot) {
        const ưuTiên = { 'ngũ linh': 3, 'xì bàn': 2, 'xì dách': 1 };
        const soNg = ưuTiên[đặcNg];
        const soBot = ưuTiên[đặcBot];
        if (soNg > soBot) thắng = true;
        else if (soNg < soBot) thắng = false;
        else hòa = true;
      } else {
        if (điểmNg > 21 && điểmBot > 21) hòa = true;
        else if (điểmNg > 21) thắng = false;
        else if (điểmBot > 21) thắng = true;
        else if (điểmNg === điểmBot) hòa = true;
        else thắng = điểmNg > điểmBot;
      }

      let result = '';
      if (hòa) {
        result = `🤝 Hòa!\n**Bạn**: ${formatBài(bàiNg)} (${điểmNg})\n**BOT**: ${formatBài(bàiBot)} (${điểmBot})`;
      } else if (thắng) {
        data[userId].coin += phòng.bet;
        result = `✅ Bạn thắng BOT!\n**Bạn**: ${formatBài(bàiNg)} (${điểmNg})\n**BOT**: ${formatBài(bàiBot)} (${điểmBot})`;
      } else {
        data[userId].coin -= phòng.bet;
        result = `❌ Bạn thua BOT.\n**Bạn**: ${formatBài(bàiNg)} (${điểmNg})\n**BOT**: ${formatBài(bàiBot)} (${điểmBot})`;
      }

      lưuData();
      inter.channel.send(result);
    } else {
      inter.channel.send(`👉 Đến lượt <@${id}>! /xd_baicuatoi để coi bài. /xd_hit (rút) hoặc /xd_stand (dừng).`);
        }
      }
    }

  }
}
