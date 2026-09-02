"""Collection service."""
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.collection import Collection, CollectionItem
from app.models.property import Property


class CollectionService:
    """Manage user collections of properties."""

    @staticmethod
    def create_collection(db: Session, user_id: int, name: str, description: str | None) -> Collection:
        """Create a new collection."""
        collection = Collection(user_id=user_id, name=name, description=description)
        db.add(collection)
        db.commit()
        db.refresh(collection)
        return collection

    @staticmethod
    def get_user_collections(db: Session, user_id: int) -> list[Collection]:
        """Get all user collections (with item counts)."""
        return (
            db.query(Collection)
            .filter(Collection.user_id == user_id)
            .order_by(Collection.created_at.desc())
            .all()
        )

    @staticmethod
    def get_user_collection(db: Session, collection_id: int, user_id: int) -> Collection | None:
        """Get a single collection (owner only)."""
        return db.query(Collection).filter(
            Collection.id == collection_id,
            Collection.user_id == user_id,
        ).first()

    @staticmethod
    def update_collection(
        db: Session,
        collection_id: int,
        user_id: int,
        name: str | None,
        description: str | None,
    ) -> Collection | None:
        """Update a collection (owner only)."""
        collection = CollectionService.get_user_collection(db, collection_id, user_id)
        if not collection:
            return None

        if name is not None:
            collection.name = name
        if description is not None:
            collection.description = description
        db.commit()
        db.refresh(collection)
        return collection

    @staticmethod
    def delete_collection(db: Session, collection_id: int, user_id: int) -> bool:
        """Delete a collection (owner only)."""
        collection = CollectionService.get_user_collection(db, collection_id, user_id)
        if not collection:
            return False
        db.delete(collection)
        db.commit()
        return True

    @staticmethod
    def add_item(db: Session, collection_id: int, user_id: int, property_id: int) -> CollectionItem | None:
        """Add a property to a collection (owner only)."""
        collection = CollectionService.get_user_collection(db, collection_id, user_id)
        if not collection:
            return None

        property_obj = db.query(Property).filter(Property.id == property_id).first()
        if not property_obj:
            return None

        existing = db.query(CollectionItem).filter(
            CollectionItem.collection_id == collection_id,
            CollectionItem.property_id == property_id,
        ).first()
        if existing:
            return existing

        item = CollectionItem(collection_id=collection_id, property_id=property_id)
        db.add(item)
        db.commit()
        db.refresh(item)
        return item

    @staticmethod
    def remove_item(db: Session, collection_id: int, user_id: int, property_id: int) -> bool:
        """Remove a property from a collection (owner only)."""
        collection = CollectionService.get_user_collection(db, collection_id, user_id)
        if not collection:
            return False

        item = db.query(CollectionItem).filter(
            CollectionItem.collection_id == collection_id,
            CollectionItem.property_id == property_id,
        ).first()
        if not item:
            return False
        db.delete(item)
        db.commit()
        return True

    @staticmethod
    def get_collection_property_ids(db: Session, collection_id: int, user_id: int) -> list[int]:
        """Get property IDs in a collection."""
        collection = CollectionService.get_user_collection(db, collection_id, user_id)
        if not collection:
            return []
        return [
            r[0]
            for r in db.query(CollectionItem.property_id)
            .filter(CollectionItem.collection_id == collection_id)
            .all()
        ]

    @staticmethod
    def get_item_count(db: Session, collection_id: int) -> int:
        """Get number of properties in a collection."""
        return (
            db.query(func.count(CollectionItem.id))
            .filter(CollectionItem.collection_id == collection_id)
            .scalar()
            or 0
        )
