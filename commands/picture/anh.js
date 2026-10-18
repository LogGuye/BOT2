const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { ApifyClient } = require('apify-client');

const apifyClient = new ApifyClient({
  token: process.env.APIFY_API_TOKEN,
});

const DEFAULT_ALBUMS = [
  "https://www.erome.com/a/U3CyGACn",
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('anh')
    .setDescription('Lấy ngẫu nhiên một bức ảnh từ album'),

  async execute(interaction) {
    await interaction.deferReply();

    try {
      const randomAlbumUrl = DEFAULT_ALBUMS[Math.floor(Math.random() * DEFAULT_ALBUMS.length)];

      const input = {
        "startUrls": [ { "url": randomAlbumUrl } ],
        "mediaType": "all",
        "downloadFiles": false,
        "maxResults": 100,
        "maxAlbumsPerProfile": 50
      };

      const run = await apifyClient.actor("solidcode/erome-scraper-video-downloader").call(input);
      const { items } = await apifyClient.dataset(run.defaultDatasetId).listItems();

      // 🔍 In toàn bộ dữ liệu thô ra màn hình console/log của Render để xem cấu trúc thực tế
      console.log('📦 CẤU TRÚC DỮ LIỆU TỪ APIFY:', JSON.stringify(items, null, 2));

      if (!items || items.length === 0) {
        return interaction.editReply('❌ Không tìm thấy dữ liệu nào trong album!');
      }

      // Tạm thời lấy trực tiếp phần tử đầu tiên để ép gửi lên test
      const firstItem = items[0];
      const imageUrl = firstItem.url || firstItem.link || firstItem.src || firstItem.image || (firstItem.images && firstItem.images[0]);

      if (!imageUrl) {
        return interaction.editReply('❌ Đã tìm thấy dữ liệu nhưng không đọc được đường dẫn ảnh. Hãy xem log trên Render.');
      }

      const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle('🖼️ Ảnh ngẫu nhiên (Debug)')
        .setImage(imageUrl)
        .setFooter({ text: `Yêu cầu bởi ${interaction.user.tag}` })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Lỗi khi gọi Apify API:', error);
      await interaction.editReply('❌ Đã xảy ra lỗi khi kết nối tới dịch vụ cào dữ liệu.');
    }
  },
};