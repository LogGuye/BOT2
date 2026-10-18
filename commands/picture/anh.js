const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { ApifyClient } = require('apify-client');

// Khởi tạo Apify Client bằng Token từ biến môi trường
const apifyClient = new ApifyClient({
  token: process.env.APIFY_API_TOKEN,
});

module.exports = {
  data: new SlashCommandBuilder()
    .setName('anh')
    .setDescription('Lấy ngẫu nhiên một bức ảnh từ link album')
    .addStringOption(option =>
      option.setName('link')
        .setDescription('Nhập đường dẫn album cần lấy ảnh')
        .setRequired(true)
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const albumUrl = interaction.options.getString('link');

    try {
      // Chuẩn bị dữ liệu đầu vào cho Actor theo tài liệu Apify của bạn
      const input = {
        "startUrls": [ { "url": albumUrl } ],
        "mediaType": "all",
        "downloadFiles": false,
        "maxResults": 100,
        "maxAlbumsPerProfile": 50
      };

      // Gọi Actor trên Apify để chạy và đợi kết quả trả về
      const run = await apifyClient.actor("solidcode/erome-scraper-video-downloader").call(input);
      
      // Lấy danh sách kết quả từ dataset của Apify
      const { items } = await apifyClient.dataset(run.defaultDatasetId).listItems();

      // Lọc ra các mục là hình ảnh
      const imageItems = items.filter(item => item.url && (item.url.endsWith('.jpg') || item.url.endsWith('.png') || item.url.includes('image')));

      if (!imageItems || imageItems.length === 0) {
        return interaction.editReply('❌ Không tìm thấy bức ảnh nào trong đường dẫn album này!');
      }

      // Chọn ngẫu nhiên 1 bức ảnh từ danh sách thu về
      const randomMedia = imageItems[Math.floor(Math.random() * imageItems.length)];
      const imageUrl = randomMedia.url || randomMedia.image;

      // Tạo khung Embed gửi lên Discord
      const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle('🖼️ Ảnh ngẫu nhiên từ Album')
        .setImage(imageUrl)
        .setFooter({ text: `Yêu cầu bởi ${interaction.user.tag}` })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Lỗi khi gọi Apify API:', error);
      await interaction.editReply('❌ Đã xảy ra lỗi khi kết nối tới dịch vụ cào dữ liệu hoặc link không hợp lệ.');
    }
  },
};