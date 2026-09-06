import type { EventLayout } from './layoutApiService';
import type { UserRoleMobile } from '../context/AuthContext';

type AskAIParams = {
  role?: UserRoleMobile;
  firstName?: string;
  message: string;
  events?: EventLayout[];
  selectedEvent?: EventLayout | null;
};

type GroqMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

function buildSystemPrompt(role?: UserRoleMobile, firstName?: string): string {
  const basePrompt =
    `Bạn là Eventix AI, trợ lý tiếng Việt cho ứng dụng quản lý và đặt vé sự kiện. ` +
    `Hãy trả lời ngắn gọn, rõ ràng, dễ làm theo cho người mới.`;

  const organizerPrompt =
    `Ưu tiên hỗ trợ organizer theo checklist thực tế: ` +
    `1) chuẩn bị thông tin sự kiện, 2) setup sơ đồ ghế, 3) định giá vé, ` +
    `4) timeline mở bán, 5) check-in ngày diễn ra, 6) xử lý voucher và khuyến mãi, ` +
    `7) theo dõi số liệu sau sự kiện.`;

  const userPrompt =
    `Nếu là user/customer, ưu tiên gợi ý tìm sự kiện, xem chi tiết và đặt vé.`;

  const rolePrompt = role === 'organizer' ? organizerPrompt : userPrompt;
  const namePrompt = firstName ? `Tên người dùng: ${firstName}.` : '';

  return `${basePrompt} ${rolePrompt} ${namePrompt} Nếu không chắc chắn, hãy nói rõ giả định của bạn.`;
}

function buildEventContext(events: EventLayout[], selectedEvent?: EventLayout | null): string {
  const selectedEventContext = selectedEvent
    ? [
        `Sự kiện đang chọn:`,
        `- Tên: ${selectedEvent.eventName || 'N/A'}`,
        `- Địa điểm: ${selectedEvent.eventLocation || 'N/A'}`,
        `- Giá vé thấp nhất: ${selectedEvent.minPrice ?? 'N/A'}`,
        `- Số zone: ${selectedEvent.zones?.length ?? 0}`,
      ].join('\n')
    : 'Chưa chọn sự kiện cụ thể.';

  if (!events.length) return 'Hiện chưa có dữ liệu sự kiện.';

  const list = events
    .slice(0, 8)
    .map(
      (event, index) =>
        `${index + 1}. ${event.eventName || 'N/A'} | ${event.eventLocation || 'N/A'} | minPrice: ${event.minPrice ?? 'N/A'}`
    )
    .join('\n');

  return `${selectedEventContext}\n\nMột số sự kiện hiện có trong hệ thống:\n${list}`;
}

function getProvider(): string {
  return (process.env.EXPO_PUBLIC_AI_PROVIDER || '').toLowerCase().trim();
}

function getGroqApiKey(): string {
  return process.env.EXPO_PUBLIC_GROQ_API_KEY || '';
}

export async function askAIAssistant(params: AskAIParams): Promise<string | null> {
  const provider = getProvider();
  const apiKey = getGroqApiKey();

  if (provider !== 'groq' || !apiKey) {
    return null;
  }

  const messages: GroqMessage[] = [
    {
      role: 'system',
      content: buildSystemPrompt(params.role, params.firstName),
    },
    {
      role: 'user',
      content: `${buildEventContext(params.events || [], params.selectedEvent)}\n\nCâu hỏi: ${params.message}`,
    },
  ];

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        temperature: 0.4,
        max_tokens: 300,
        messages,
      }),
    });

    const rawText = await response.text();
    const json = rawText ? JSON.parse(rawText) : {};

    if (!response.ok) {
      const msg = json?.error?.message || `Groq API error: ${response.status}`;
      throw new Error(msg);
    }

    const answer = json?.choices?.[0]?.message?.content?.trim();
    return answer || null;
  } catch (error) {
    console.error('[AIAssistantService] Failed to call AI provider:', error);
    return null;
  }
}
