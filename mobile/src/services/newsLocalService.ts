import AsyncStorage from '@react-native-async-storage/async-storage';

const NEWS_STORAGE_KEY = '@pharma_news_posts_v1';
const DEFAULT_NEWS_IMAGE =
  'https://images.unsplash.com/photo-1528127269322-539801943592?q=80&w=1600&auto=format&fit=crop';
const NEWS_SEEDED_KEY = '@pharma_news_seeded_v1';

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
  return [];
}

async function ensureSeedData(): Promise<void> {
  return;
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

