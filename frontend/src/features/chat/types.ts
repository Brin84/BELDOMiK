/**
 * Модели чатов (Kufar-модель): переписка покупателя с продавцом по
 * объявлению хранится в MiniApp, пока пользователь не удалит её сам.
 */

/** Строка списка «Сообщения»: собеседник + объявление + хвост переписки. */
export interface ChatConversation {
  id: number;
  property_id: number;
  property_title: string | null;
  property_photo_url: string | null;
  counterpart_id: number;
  counterpart_name: string;
  counterpart_username: string | null;
  last_message_text: string | null;
  last_message_at: string;
  unread_count: number;
  created_at: string;
}

/** Сообщение диалога. */
export interface ChatMessage {
  id: number;
  conversation_id: number;
  sender_id: number;
  text: string;
  created_at: string;
  read_at: string | null;
  is_mine: boolean;
}

/** Диалог целиком: шапка + история сообщений по возрастанию времени. */
export interface ChatConversationDetail extends ChatConversation {
  messages: ChatMessage[];
}