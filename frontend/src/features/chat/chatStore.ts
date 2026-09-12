import { create } from 'zustand';
import { api, API_ENDPOINTS } from '@/shared/api';
import type { ChatConversation, ChatConversationDetail, ChatMessage } from './types';

interface ChatState {
  // Список переписок (вкладка «Сообщения»)
  conversations: ChatConversation[];
  total: number;
  isLoading: boolean;
  error: string | null;

  // Бейдж непрочитанных в нижней навигации
  unreadCount: number;

  // Открытый диалог (/messages/:id)
  active: ChatConversationDetail | null;
  isActiveLoading: boolean;
  isSending: boolean;

  fetchConversations: () => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  startChat: (propertyId: number, text?: string) => Promise<number>;
  openChat: (conversationId: number) => Promise<void>;
  pollActive: (conversationId: number) => Promise<void>;
  sendMessage: (conversationId: number, rawText: string) => Promise<void>;
  removeChat: (conversationId: number) => Promise<void>;
  clearActive: () => void;
  clearError: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  total: 0,
  isLoading: false,
  error: null,

  unreadCount: 0,

  active: null,
  isActiveLoading: false,
  isSending: false,

  fetchConversations: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get<ChatConversation[]>(API_ENDPOINTS.messages.list, {
        page: 1,
        page_size: 50,
      });
      set({ conversations: response, total: response.length, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Не удалось загрузить чаты',
        isLoading: false,
      });
    }
  },

  fetchUnreadCount: async () => {
    try {
      const response = await api.get<{ unread_count: number }>(
        API_ENDPOINTS.messages.unreadCount
      );
      set({ unreadCount: response.unread_count });
    } catch {
      // Тихо: бейдж — не критичная часть, при следующем успешном запросе обновится.
    }
  },

  startChat: async (propertyId, text) => {
    const response = await api.post<ChatConversation>(API_ENDPOINTS.messages.start, {
      property_id: propertyId,
      text: text ?? null,
    });
    // Вставляем/обновляем чат в списке без перезагрузки всего инбокса.
    set((state) => ({
      conversations: [response, ...state.conversations.filter((c) => c.id !== response.id)],
      total: state.conversations.some((c) => c.id === response.id)
        ? state.total
        : state.total + 1,
    }));
    return response.id;
  },

  openChat: async (conversationId) => {
    set({ isActiveLoading: true, error: null });
    try {
      const detail = await api.get<ChatConversationDetail>(
        API_ENDPOINTS.messages.detail(conversationId)
      );
      set({ active: detail, isActiveLoading: false });
      void get().fetchUnreadCount();
      // Синхронизируем строку инбокса (проверка прочтения, хвост переписки).
      set((state) => ({
        conversations: state.conversations.map((c) =>
          c.id === detail.id
            ? {
                ...c,
                last_message_text: detail.last_message_text,
                last_message_at: detail.last_message_at,
                unread_count: 0,
              }
            : c
        ),
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Не удалось открыть чат',
        isActiveLoading: false,
      });
    }
  },

  pollActive: async (conversationId) => {
    try {
      const detail = await api.get<ChatConversationDetail>(
        API_ENDPOINTS.messages.detail(conversationId)
      );
      // Пользователь мог уйти из диалога, пока шёл запрос — обновляем только
      // если чат ещё открыт.
      if (get().active && get().active!.id === conversationId) {
        set({ active: detail });
        void get().fetchUnreadCount();
      }
    } catch {
      // Тихо: следующее опрошение попробует снова.
    }
  },

  sendMessage: async (conversationId, rawText) => {
    const text = rawText.trim();
    const active = get().active;
    if (!text || !active || get().isSending) return;

    const tempId = -Date.now();
    const nowIso = new Date().toISOString();
    // Оптимистично добавляем сообщение, пока идёт запрос.
    set((state) => ({
      isSending: true,
      active: state.active
        ? {
            ...state.active,
            messages: [
              ...state.active.messages,
              {
                id: tempId,
                conversation_id: conversationId,
                sender_id: 0,
                text,
                created_at: nowIso,
                read_at: null,
                is_mine: true,
              },
            ],
          }
        : state.active,
    }));

    try {
      const created = await api.post<ChatMessage>(
        API_ENDPOINTS.messages.send(conversationId),
        { text }
      );
      set((state) => ({
        isSending: false,
        active: state.active
          ? {
              ...state.active,
              messages: state.active.messages.map((m) => (m.id === tempId ? created : m)),
            }
          : state.active,
      }));
      // Хвост переписки в инбоксе без повторной загрузки списка.
      set((state) => ({
        conversations: state.conversations.map((c) =>
          c.id === conversationId
            ? {
                ...c,
                last_message_text: created.text,
                last_message_at: created.created_at,
                unread_count: 0,
              }
            : c
        ),
      }));
    } catch (error) {
      set((state) => ({
        isSending: false,
        error: error instanceof Error ? error.message : 'Не удалось отправить сообщение',
        active: state.active
          ? {
              ...state.active,
              messages: state.active.messages.filter((m) => m.id !== tempId),
            }
          : state.active,
      }));
    }
  },

  removeChat: async (conversationId) => {
    await api.delete(API_ENDPOINTS.messages.delete(conversationId));
    set((state) => ({
      conversations: state.conversations.filter((c) => c.id !== conversationId),
      total: Math.max(0, state.total - 1),
      active: state.active && state.active.id === conversationId ? null : state.active,
    }));
  },

  clearActive: () => set({ active: null }),

  clearError: () => set({ error: null }),
}));