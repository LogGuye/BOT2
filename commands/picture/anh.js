const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { ApifyClient } = require('apify-client');

const apifyClient = new ApifyClient({
  token: process.env.APIFY_API_TOKEN,
});

const DEFAULT_ALBUMS = [
  "http://vietdam.rest/tags/ary/", // Link album mẫu
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('anh')
    .setDescription('Lấy ngẫu nhiên một bức ảnh từ album'),

  async execute(interaction) {
    // Phản hồi chờ để chống lỗi 3 giây của Discord
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

      if (!items || items.length === 0) {
        return interaction.editReply('❌ Không tìm thấy dữ liệu nào trong album!');
      }

      // Lọc chính xác các mục có type là 'image' và có 'mediaUrl'
      const imageItems = items.filter(item => item.type === 'image' && item.mediaUrl);

      if (imageItems.length === 0) {
        return interaction.editReply('❌ Không tìm thấy bức ảnh nào trong album này!');
      }

      // Chọn ngẫu nhiên 1 bức ảnh từ danh sách lọc được
      const randomImageItem = imageItems[Math.floor(Math.random() * imageItems.length)];
      const imageUrl = randomImageItem.mediaUrl;

      // Tạo khung Embed gửi lên Discord
      const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle('🖼️ Ảnh ngẫu nhiên từ Album')
        .setImage(imageUrl)
        .setFooter({ text: `Yêu cầu bởi ${interaction.user.tag} • Album: ${randomImageItem.albumTitle || 'Erome'}` })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Lỗi khi gọi Apify API:', error);
      await interaction.editReply('❌ Đã xảy ra lỗi khi kết nối tới dịch vụ cào dữ liệu.');
    }
  },
};