"""Chat service — переписка покупателей с продавцами внутри MiniApp.

Kufar-модель: диалог привязан к объявлению, поэтому у покупателя отдельный
чат по каждому объекту, а у продавца — отдельный чат с каждым клиентом.
Доступ проверяется участием в диалоге (buyer_id/seller_id), история
хранится до явного удаления пользователем.
"""
import html
from datetime import datetime

from sqlalchemy import and_, func, or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.chat import ChatMessage, Conversation
from app.models.property import Property, PropertyPhoto, PropertyStatus
from app.models.user import User
from app.services.notification_service import NotificationService


class ChatService:
    """Диалоги по объявлениям: старт, список, сообщения, скрытие."""

    @staticmethod
    def _display_name(user: User | None, fallback_id: int) -> str:
        """Имя собеседника: имя из Telegram → username → заглушка."""
        if user is None:
            return f"Пользователь #{fallback_id}"
        full_name = " ".join(part for part in (user.first_name, user.last_name) if part)
        if full_name:
            return full_name
        if user.username:
            return f"@{user.username}"
        return f"Пользователь #{fallback_id}"

    @staticmethod
    def _property_title(property_obj: Property | None) -> str | None:
        """Описание объявления для списка чатов (у Property нет колонки title)."""
        if property_obj is None:
            return None
        parts = [
            property_obj.type.name if property_obj.type else None,
            f"{property_obj.rooms_count}-комн." if property_obj.rooms_count else None,
            f"{property_obj.total_area} м²" if property_obj.total_area else None,
            property_obj.city.name if property_obj.city else None,
        ]
        title = ", ".join(part for part in parts if part)
        return title or f"Объявление #{property_obj.id}"

    @staticmethod
    def _row(
        conversation: Conversation,
        user_id: int,
        unread_count: int,
        photo_url: str | None,
    ) -> dict[str, object]:
        """Строка списка чатов: собеседник + объявление + хвост переписки."""
        is_buyer = conversation.buyer_id == user_id
        counterpart = conversation.seller if is_buyer else conversation.buyer
        counterpart_id = conversation.seller_id if is_buyer else conversation.buyer_id
        return {
            "id": conversation.id,
            "property_id": conversation.property_id,
            "property_title": ChatService._property_title(conversation.property),
            "property_photo_url": photo_url,
            "counterpart_id": counterpart_id,
            "counterpart_name": ChatService._display_name(counterpart, counterpart_id),
            "counterpart_username": counterpart.username if counterpart else None,
            "last_message_text": conversation.last_message_text,
            "last_message_at": conversation.last_message_at,
            "unread_count": unread_count,
            "created_at": conversation.created_at,
        }

    @staticmethod
    def serialize_messages(
        messages: list[ChatMessage], user_id: int
    ) -> list[dict[str, object]]:
        """Сообщения под схему ответа (is_mine — для выравнивания в UI)."""
        return [
            {
                "id": message.id,
                "conversation_id": message.conversation_id,
                "sender_id": message.sender_id,
                "text": message.text,
                "created_at": message.created_at,
                "read_at": message.read_at,
                "is_mine": message.sender_id == user_id,
            }
            for message in messages
        ]

    @staticmethod
    def get_for_user(db: Session, conversation_id: int, user_id: int) -> Conversation | None:
        """Диалог пользователя, если он участник и не скрыл его (иначе None).

        Мягкое удаление действует на сторону: после удаления чата его больше
        нет у удалившего (ни на чтение, ни на отправку), а у собеседника он
        остаётся видимым.
        """
        return (
            db.query(Conversation)
            .filter(
                Conversation.id == conversation_id,
                or_(
                    and_(
                        Conversation.buyer_id == user_id,
                        Conversation.buyer_deleted_at.is_(None),
                    ),
                    and_(
                        Conversation.seller_id == user_id,
                        Conversation.seller_deleted_at.is_(None),
                    ),
                ),
            )
            .first()
        )

    @staticmethod
    def get_or_create(
        db: Session, user_id: int, property_id: int
    ) -> Conversation | None:
        """Найти или создать диалог покупателя с владельцем объявления.

        None — если объявление не найдено, заблокировано модератором или
        пользователь сам является владельцем (писать себе нельзя).
        """
        property_obj = db.query(Property).filter(Property.id == property_id).first()
        if property_obj is None or property_obj.owner_id == user_id:
            return None
        if property_obj.status == PropertyStatus.BLOCKED:
            return None

        conversation = (
            db.query(Conversation)
            .filter(
                Conversation.property_id == property_id,
                Conversation.buyer_id == user_id,
                Conversation.seller_id == property_obj.owner_id,
            )
            .first()
        )
        if conversation is None:
            conversation = Conversation(
                property_id=property_id,
                buyer_id=user_id,
                seller_id=property_obj.owner_id,
                last_message_at=datetime.utcnow(),
            )
            db.add(conversation)
            try:
                db.commit()
            except IntegrityError:
                # Параллельный запрос уже создал этот диалог — берём его.
                db.rollback()
                conversation = (
                    db.query(Conversation)
                    .filter(
                        Conversation.property_id == property_id,
                        Conversation.buyer_id == user_id,
                        Conversation.seller_id == property_obj.owner_id,
                    )
                    .first()
                )
                if conversation is None:
                    raise
            else:
                db.refresh(conversation)
        elif conversation.buyer_deleted_at is not None:
            # Покупатель удалял чат, но снова открыл его из объявления.
            conversation.buyer_deleted_at = None
            db.commit()
        return conversation

    @staticmethod
    def describe(
        db: Session, conversation: Conversation, user_id: int
    ) -> dict[str, object]:
        """Одна строка списка чатов (для ответа на старт/открытие диалога)."""
        unread_count = (
            db.query(func.count(ChatMessage.id))
            .filter(
                ChatMessage.conversation_id == conversation.id,
                ChatMessage.sender_id != user_id,
                ChatMessage.read_at.is_(None),
            )
            .scalar()
            or 0
        )
        photo_url = (
            db.query(func.min(PropertyPhoto.url))
            .filter(PropertyPhoto.property_id == conversation.property_id)
            .scalar()
        )
        return ChatService._row(conversation, user_id, unread_count, photo_url)

    @staticmethod
    def list_conversations(
        db: Session, user_id: int, page: int = 1, page_size: int = 30
    ) -> tuple[list[dict[str, object]], int]:
        """Чаты пользователя: скрытые им не показываются, свежие сверху."""
        visible = or_(
            and_(Conversation.buyer_id == user_id, Conversation.buyer_deleted_at.is_(None)),
            and_(Conversation.seller_id == user_id, Conversation.seller_deleted_at.is_(None)),
        )
        query = (
            db.query(Conversation)
            .filter(visible)
            .order_by(Conversation.last_message_at.desc(), Conversation.id.desc())
        )
        total = query.count()
        conversations = query.offset((page - 1) * page_size).limit(page_size).all()

        ids = [conversation.id for conversation in conversations]
        property_ids = [conversation.property_id for conversation in conversations]

        unread_map: dict[int, int] = {}
        photo_map: dict[int, str] = {}
        if ids:
            unread_map = {
                row[0]: row[1]
                for row in db.query(ChatMessage.conversation_id, func.count(ChatMessage.id))
                .filter(
                    ChatMessage.conversation_id.in_(ids),
                    ChatMessage.sender_id != user_id,
                    ChatMessage.read_at.is_(None),
                )
                .group_by(ChatMessage.conversation_id)
                .all()
            }
        if property_ids:
            photo_map = {
                row[0]: row[1]
                for row in db.query(PropertyPhoto.property_id, func.min(PropertyPhoto.url))
                .filter(PropertyPhoto.property_id.in_(property_ids))
                .group_by(PropertyPhoto.property_id)
                .all()
            }

        rows = [
            ChatService._row(
                conversation,
                user_id,
                unread_map.get(conversation.id, 0),
                photo_map.get(conversation.property_id),
            )
            for conversation in conversations
        ]
        return rows, total

    @staticmethod
    def list_messages(
        db: Session, conversation_id: int, user_id: int, limit: int = 200
    ) -> list[ChatMessage] | None:
        """История диалога (только для участника); входящие → прочитанные."""
        if ChatService.get_for_user(db, conversation_id, user_id) is None:
            return None

        unread = (
            db.query(ChatMessage)
            .filter(
                ChatMessage.conversation_id == conversation_id,
                ChatMessage.sender_id != user_id,
                ChatMessage.read_at.is_(None),
            )
            .all()
        )
        if unread:
            now = datetime.utcnow()
            for message in unread:
                message.read_at = now
            db.commit()

        messages = (
            db.query(ChatMessage)
            .filter(ChatMessage.conversation_id == conversation_id)
            .order_by(ChatMessage.id.desc())
            .limit(limit)
            .all()
        )
        messages.reverse()
        return messages

    @staticmethod
    def send_message(
        db: Session, conversation_id: int, user_id: int, text: str
    ) -> tuple[ChatMessage, Conversation] | None:
        """Отправить сообщение в диалог (только участник).

        Новое сообщение возвращает переписку обоим: если кто-то удалял чат,
        метка удаления снимается — свежее сообщение снова видно.
        """
        conversation = ChatService.get_for_user(db, conversation_id, user_id)
        if conversation is None:
            return None

        clean_text = text.strip()
        if not clean_text:
            return None

        message = ChatMessage(
            conversation_id=conversation_id,
            sender_id=user_id,
            text=clean_text,
        )
        db.add(message)

        conversation.last_message_text = clean_text[:500]
        conversation.last_message_at = datetime.utcnow()
        conversation.buyer_deleted_at = None
        conversation.seller_deleted_at = None
        db.commit()
        db.refresh(message)
        return message, conversation

    @staticmethod
    def delete_conversation(db: Session, conversation_id: int, user_id: int) -> bool:
        """Скрыть чат у себя: у собеседника переписка остаётся."""
        conversation = ChatService.get_for_user(db, conversation_id, user_id)
        if conversation is None:
            return False

        now = datetime.utcnow()
        if conversation.buyer_id == user_id:
            conversation.buyer_deleted_at = now
        else:
            conversation.seller_deleted_at = now
        db.commit()
        return True

    @staticmethod
    def unread_total(db: Session, user_id: int) -> int:
        """Сколько входящих ждут прочтения — бейдж «Сообщения» в нижнем баре."""
        visible = or_(
            and_(Conversation.buyer_id == user_id, Conversation.buyer_deleted_at.is_(None)),
            and_(Conversation.seller_id == user_id, Conversation.seller_deleted_at.is_(None)),
        )
        return (
            db.query(func.count(ChatMessage.id))
            .join(Conversation, Conversation.id == ChatMessage.conversation_id)
            .filter(
                visible,
                ChatMessage.sender_id != user_id,
                ChatMessage.read_at.is_(None),
            )
            .scalar()
            or 0
        )

    @staticmethod
    async def notify_new_message(
        db: Session, message: ChatMessage, conversation: Conversation
    ) -> bool:
        """Telegram-уведомление получателю (best-effort — чат живёт и без него)."""
        recipient_id = (
            conversation.seller_id
            if message.sender_id == conversation.buyer_id
            else conversation.buyer_id
        )
        recipient = db.query(User).filter(User.id == recipient_id).first()
        if recipient is None or not recipient.tg_id:
            return False

        sender = db.query(User).filter(User.id == message.sender_id).first()
        sender_name = ChatService._display_name(sender, message.sender_id)
        text = (
            f"💬 <b>Новое сообщение</b>\n\n"
            f"От: {html.escape(sender_name)}\n"
            f"{html.escape(message.text[:300])}"
        )
        reply_markup = {
            "inline_keyboard": [
                [
                    {
                        "text": "Открыть чат",
                        "url": NotificationService.miniapp_deep_link(f"chat_{conversation.id}"),
                    }
                ]
            ]
        }
        return await NotificationService.send_telegram_message(
            recipient.tg_id, text, reply_markup=reply_markup
        )
