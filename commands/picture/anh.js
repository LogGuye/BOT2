const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { ApifyClient } = require('apify-client');

const apifyClient = new ApifyClient({
  token: process.env.APIFY_API_TOKEN,
});

const DEFAULT_ALBUMS = [
  "https://www.erome.com/a/U3CyGACn", // Link album mẫu
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('anh')
    .setDescription('Lấy ngẫu nhiên một bức ảnh từ album'),

  async execute(interaction) {
    // ⚡ PHẢI GỌI NGAY LẬP TỨC để chống lỗi 3 giây của Discord
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

      // Gọi Apify Actor cào dữ liệu
      const run = await apifyClient.actor("solidcode/erome-scraper-video-downloader").call(input);
      const { items } = await apifyClient.dataset(run.defaultDatasetId).listItems();

      const imageItems = items.filter(item => item.url && (item.url.endsWith('.jpg') || item.url.endsWith('.png') || item.url.includes('image')));

      if (!imageItems || imageItems.length === 0) {
        return interaction.editReply('❌ Không tìm thấy bức ảnh nào trong album!');
      }

      const randomMedia = imageItems[Math.floor(Math.random() * imageItems.length)];
      const imageUrl = randomMedia.url || randomMedia.image;

      const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle('🖼️ Ảnh ngẫu nhiên')
        .setImage(imageUrl)
        .setFooter({ text: `Yêu cầu bởi ${interaction.user.tag}` })
        .setTimestamp();

      // Dùng editReply thay vì reply vì đã deferReply ở trên
      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Lỗi khi gọi Apify API:', error);
      // Dùng editReply để báo lỗi nếu quá trình cào dữ liệu gặp trục trặc
      await interaction.editReply('❌ Đã xảy ra lỗi khi kết nối tới dịch vụ cào dữ liệu.');
    }
  },
};