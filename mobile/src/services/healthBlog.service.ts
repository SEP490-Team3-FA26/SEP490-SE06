/**
 * Dịch vụ Dữ liệu Blog Y Khoa & Thuốc Gợi Ý Theo Mùa
 * Chuẩn hóa cẩm nang sức khỏe và gợi ý sản phẩm không bọc border theo phong cách FPT Long Châu
 */

export type HealthBlogCategory = 'FLU' | 'STOMACH' | 'ALLERGY' | 'IMMUNITY';

export interface HealthBlogArticle {
  title: string;
  author: string;
  readTime: string;
  categoryName: string;
  imageUrl: string;
  summary: string;
  advice: string;
  symptoms: string[];
}

export interface MedicineSearchItem {
  name: string;
  active?: string;
  category?: string;
  [key: string]: any;
}

/**
 * Danh mục cẩm nang y khoa phân theo bệnh lý phổ biến theo mùa
 */
export const SEASONAL_BLOGS: Record<HealthBlogCategory, HealthBlogArticle> = {
  FLU: {
    title: 'Cẩm Nang Xử Trí Cảm Cúm & Viêm Họng Giao Mùa',
    author: 'DS. Nguyễn Thu Trang',
    readTime: '3 phút đọc',
    categoryName: 'Hô hấp & Cảm cúm',
    imageUrl: 'https://images.unsplash.com/photo-1584017911766-d451b3d0e843?w=800&auto=format&fit=crop&q=80',
    summary: 'Thời tiết thay đổi đột ngột làm suy giảm niêm mạc hô hấp, dễ gây sốt, ho khan và rát họng kéo dài.',
    advice: 'Giữ ấm cổ ngực, súc họng bằng nước muối sinh lý, bổ sung Vitamin C và dùng thuốc giảm đau hạ sốt đúng liều.',
    symptoms: ['Sốt nhẹ', 'Đau rát họng', 'Nghẹt mũi & Hắt hơi'],
  },
  STOMACH: {
    title: 'Xử Trí Đau Dạ Dày, Ợ Chua & Rối Loạn Tiêu Hóa',
    author: 'DS. Trần Minh Đức',
    readTime: '4 phút đọc',
    categoryName: 'Tiêu hóa & Dạ dày',
    imageUrl: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=800&auto=format&fit=crop&q=80',
    summary: 'Ăn uống thất thường hoặc căng thẳng kích thích dạ dày tăng tiết acid, gây cồn cào và khó tiêu.',
    advice: 'Chia nhỏ bữa ăn, bổ sung men vi sinh sống để tái tạo khuẩn ruột và dùng gel tráng niêm mạc khi có cơn đau.',
    symptoms: ['Đầy hơi khó tiêu', 'Ợ chua trào ngược', 'Cồn cào nóng rát'],
  },
  ALLERGY: {
    title: 'Chăm Sóc Da & Đối Phó Dị Ứng Thời Tiết Mẩn Ngứa',
    author: 'DS. Lê Thị Mai',
    readTime: '3 phút đọc',
    categoryName: 'Da liễu & Dị ứng',
    imageUrl: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&auto=format&fit=crop&q=80',
    summary: 'Độ ẩm không khí thay đổi và phấn hoa dễ kích hoạt phản ứng quá mẫn, khiến da khô rát và ngứa ngáy.',
    advice: 'Tránh gãi trầy xước, dưỡng ẩm thường xuyên bằng kem y khoa lành tính và dùng thuốc kháng histamine thế hệ mới.',
    symptoms: ['Mẩn ngứa mề đay', 'Khô rát bong tróc', 'Hắt hơi sổ mũi'],
  },
  IMMUNITY: {
    title: 'Chiến Lược Tăng Đề Kháng Toàn Diện Mùa Dịch',
    author: 'DS. Hoàng Quốc Bảo',
    readTime: '4 phút đọc',
    categoryName: 'Miễn dịch & Bổ sung',
    imageUrl: 'https://images.unsplash.com/photo-1577401239170-897942555fb3?w=800&auto=format&fit=crop&q=80',
    summary: 'Hệ miễn dịch là lá chắn tự nhiên của cơ thể. Bổ sung vi chất đúng cách giúp phòng ngừa 80% nguy cơ ốm vặt.',
    advice: 'Bổ sung kết hợp Kẽm Gluconat, Vitamin C hàm lượng cao và duy trì giấc ngủ sâu ít nhất 7 tiếng mỗi ngày.',
    symptoms: ['Cơ thể mệt mỏi', 'Hay ốm vặt', 'Kém ăn mất ngủ'],
  },
};

/**
 * Bản đồ từ khóa dược lý tương ứng với từng chuyên mục bệnh
 */
export const BLOG_KEYWORDS_MAP: Record<HealthBlogCategory, string[]> = {
  FLU: ['cảm', 'sốt', 'paracetamol', 'panadol', 'họng', 'ho', 'hapacol', 'eugica', 'strepsils', 'xịt mũi'],
  STOMACH: ['dạ dày', 'tiêu hóa', 'men vi sinh', 'gaviscon', 'omeprazol', 'đầy hơi', 'ợ chua', 'đại tràng'],
  ALLERGY: ['dị ứng', 'mẩn ngứa', 'mề đay', 'loratadin', 'cetirizin', 'kem bôi', 'viêm da', 'kháng histamine'],
  IMMUNITY: ['vitamin c', 'vitamin', 'kẽm', 'đề kháng', 'miễn dịch', 'omega', 'khoáng chất', 'viên sủi', 'bổ sung'],
};

/**
 * Hàm lọc thuốc gợi ý phù hợp dựa trên chủ đề bài blog y khoa đang chọn
 * @param medicines Danh sách thuốc từ kho
 * @param category Danh mục bệnh
 * @param maxItems Số lượng sản phẩm tối đa trả về (mặc định 6)
 */
export function filterRecommendedMedicines<T extends MedicineSearchItem>(
  medicines: T[] | null | undefined,
  category: HealthBlogCategory,
  maxItems = 6,
): T[] {
  // Xử lý dữ liệu dị thường hoặc rỗng
  if (!medicines || !Array.isArray(medicines) || medicines.length === 0) {
    return [];
  }

  const keywords = BLOG_KEYWORDS_MAP[category] || [];
  if (keywords.length === 0) {
    return medicines.slice(0, maxItems);
  }

  // Lọc sản phẩm khớp từ khóa trong tên, hoạt chất hoặc danh mục
  const matched = medicines.filter((m) => {
    if (!m) return false;
    const text = `${m.name || ''} ${m.active || ''} ${m.category || ''}`.toLowerCase();
    return keywords.some((kw) => text.includes(kw));
  });

  // Nếu có thuốc khớp, ưu tiên trả về thuốc khớp, nếu không có thì fallback các thuốc đầu tiên
  return matched.length > 0 ? matched.slice(0, maxItems) : medicines.slice(0, maxItems);
}
