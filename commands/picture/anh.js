const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { ApifyClient } = require('apify-client');

const apifyClient = new ApifyClient({
  token: process.env.APIFY_API_TOKEN,
});

// Danh sách các link album mặc định để bot tự động chọn ngẫu nhiên khi bạn chỉ gõ /anh
const DEFAULT_ALBUMS = [
  "https://www.erome.com/a/U3CyGACn", // Thay bằng các link album mặc định của bạn ở đây
  // Bạn có thể thêm nhiều link khác vào đây ngăn cách bằng dấu phẩy
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('anh')
    .setDescription('Lấy ngẫu nhiên một bức ảnh từ album có sẵn'),

  async execute(interaction) {
    await interaction.deferReply();

    try {
      // Chọn ngẫu nhiên 1 link từ danh sách album mặc định
      const randomAlbumUrl = DEFAULT_ALBUMS[Math.floor(Math.random() * DEFAULT_ALBUMS.length)];

      const input = {
        "startUrls": [ { "url": randomAlbumUrl } ],
        "mediaType": "all",
        "downloadFiles": false,
        "maxResults": 100,
        "maxAlbumsPerProfile": 50
      };

      // Gọi Apify Actor cào dữ liệu từ album được chọn ngẫu nhiên
      const run = await apifyClient.actor("solidcode/erome-scraper-video-downloader").call(input);
      const { items } = await apifyClient.dataset(run.defaultDatasetId).listItems();

      const imageItems = items.filter(item => item.url && (item.url.endsWith('.jpg') || item.url.endsWith('.png') || item.url.includes('image')));

      if (!imageItems || imageItems.length === 0) {
        return interaction.editReply('❌ Không tìm thấy bức ảnh nào trong album mặc định!');
      }

      // Lấy ngẫu nhiên 1 bức ảnh từ kết quả cào về
      const randomMedia = imageItems[Math.floor(Math.random() * imageItems.length)];
      const imageUrl = randomMedia.url || randomMedia.image;

      const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle('🖼️ Ảnh ngẫu nhiên')
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