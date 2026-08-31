import AsyncStorage from '@react-native-async-storage/async-storage';

const NEWS_STORAGE_KEY = '@mock_news_posts_v1';
const DEFAULT_NEWS_IMAGE =
  'https://images.unsplash.com/photo-1528127269322-539801943592?q=80&w=1600&auto=format&fit=crop';
const NEWS_SEEDED_KEY = '@mock_news_seeded_v1';

export type NewsPost = {
  id: string;
  title: string;
  summary: string;
  content: string;
  imageUrl?: string;
  authorId: string;
  authorName: string;
  createdAt: string;
  updatedAt: string;
  isPublished: boolean;
};

export type CreateNewsInput = {
  title: string;
  summary: string;
  content: string;
  imageUrl?: string;
  authorId: string;
  authorName: string;
  isPublished?: boolean;
};

async function readAll(): Promise<NewsPost[]> {
  const raw = await AsyncStorage.getItem(NEWS_STORAGE_KEY);
  if (!raw) return [];
  try {
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

async function writeAll(posts: NewsPost[]): Promise<void> {
  await AsyncStorage.setItem(NEWS_STORAGE_KEY, JSON.stringify(posts));
}

function buildSeedPosts(): NewsPost[] {
  const now = Date.now();
  const seedAuthorId = 'system-demo';
  const seedAuthorName = 'Ban tổ chức Eventix';
  return [
    {
      id: 'seed-1',
      title: 'Lễ hội Âm nhạc Mùa Hè 2026 chính thức mở bán vé sớm',
      summary:
        'Sự kiện quy tụ hơn 20 nghệ sĩ trong và ngoài nước, mở bán Early Bird với số lượng giới hạn.',
      content:
        'Ban tổ chức công bố chương trình Lễ hội Âm nhạc Mùa Hè 2026 sẽ diễn ra vào cuối tháng 6 tại TP.HCM. Vé Early Bird được mở bán trong 72 giờ đầu với mức ưu đãi đặc biệt. Người dùng nên theo dõi mục tin tức và thông báo để không bỏ lỡ các mốc thời gian quan trọng.',
      imageUrl:
        'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?q=80&w=1600&auto=format&fit=crop',
      authorId: seedAuthorId,
      authorName: seedAuthorName,
      createdAt: new Date(now - 1000 * 60 * 30).toISOString(),
      updatedAt: new Date(now - 1000 * 60 * 30).toISOString(),
      isPublished: true,
    },
    {
      id: 'seed-2',
      title: 'Hướng dẫn check-in nhanh trong ngày diễn ra sự kiện',
      summary:
        'Khách tham dự có thể check-in bằng QR hoặc mã vé; khuyến nghị đến sớm 30 phút để vào cổng thuận lợi.',
      content:
        'Để tối ưu tốc độ vào cổng, người tham dự vui lòng chuẩn bị sẵn mã QR trên điện thoại. Trong trường hợp mất mạng, bạn có thể cung cấp mã vé cho nhân viên để check-in thủ công. Ban tổ chức cũng bố trí khu vực hỗ trợ riêng cho các trường hợp quên vé.',
      imageUrl:
        'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=1600&auto=format&fit=crop',
      authorId: seedAuthorId,
      authorName: seedAuthorName,
      createdAt: new Date(now - 1000 * 60 * 90).toISOString(),
      updatedAt: new Date(now - 1000 * 60 * 90).toISOString(),
      isPublished: true,
    },
    {
      id: 'seed-3',
      title: 'Cập nhật sơ đồ khu vực và vị trí cổng vào',
      summary:
        'Sơ đồ chỗ ngồi và cổng vào đã được cập nhật, người dùng nên kiểm tra trước khi di chuyển tới địa điểm.',
      content:
        'Ban tổ chức đã hoàn tất bản cập nhật sơ đồ khu vực cho các hạng vé VIP, Standard và Standing. Người dùng vui lòng kiểm tra lại thông tin trên vé để xác định đúng cổng vào và khu vực ngồi/đứng tương ứng.',
      imageUrl:
        'https://images.unsplash.com/photo-1506157786151-b8491531f063?q=80&w=1600&auto=format&fit=crop',
      authorId: seedAuthorId,
      authorName: seedAuthorName,
      createdAt: new Date(now - 1000 * 60 * 180).toISOString(),
      updatedAt: new Date(now - 1000 * 60 * 180).toISOString(),
      isPublished: true,
    },
  ];
}

async function ensureSeedData(): Promise<void> {
  const seeded = await AsyncStorage.getItem(NEWS_SEEDED_KEY);
  const posts = await readAll();
  if (seeded === '1' || posts.length > 0) return;

  const seedPosts = buildSeedPosts();
  await writeAll(seedPosts);
  await AsyncStorage.setItem(NEWS_SEEDED_KEY, '1');
}

async function ensureDemoCoverage(): Promise<void> {
  const posts = await readAll();
  const normalized = posts.map((item) => ({
    ...item,
    imageUrl: item.imageUrl?.trim() || DEFAULT_NEWS_IMAGE,
  }));

  if (JSON.stringify(normalized) !== JSON.stringify(posts)) {
    await writeAll(normalized);
  }
}

export const NewsLocalService = {
  async listAll(): Promise<NewsPost[]> {
    await ensureSeedData();
    await ensureDemoCoverage();
    const posts = await readAll();
    return posts.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  },

  async listPublished(): Promise<NewsPost[]> {
    const posts = await this.listAll();
    return posts.filter((post) => post.isPublished);
  },

  async listByAuthor(authorId: string): Promise<NewsPost[]> {
    const posts = await this.listAll();
    return posts.filter((post) => post.authorId === authorId);
  },

  async getById(id: string): Promise<NewsPost | null> {
    const posts = await this.listAll();
    return posts.find((post) => post.id === id) || null;
  },

  async create(input: CreateNewsInput): Promise<NewsPost> {
    const posts = await readAll();
    const now = new Date().toISOString();
    const newPost: NewsPost = {
      id: Date.now().toString(),
      title: input.title.trim(),
      summary: input.summary.trim(),
      content: input.content.trim(),
      imageUrl: input.imageUrl?.trim() || DEFAULT_NEWS_IMAGE,
      authorId: input.authorId,
      authorName: input.authorName,
      createdAt: now,
      updatedAt: now,
      isPublished: input.isPublished ?? true,
    };

    posts.unshift(newPost);
    await writeAll(posts);
    return newPost;
  },

  async togglePublish(id: string): Promise<NewsPost | null> {
    const posts = await readAll();
    const idx = posts.findIndex((post) => post.id === id);
    if (idx === -1) return null;

    const updated: NewsPost = {
      ...posts[idx],
      isPublished: !posts[idx].isPublished,
      updatedAt: new Date().toISOString(),
    };
    posts[idx] = updated;
    await writeAll(posts);
    return updated;
  },

  async remove(id: string): Promise<boolean> {
    const posts = await readAll();
    const next = posts.filter((post) => post.id !== id);
    if (next.length === posts.length) return false;
    await writeAll(next);
    return true;
  },
};

