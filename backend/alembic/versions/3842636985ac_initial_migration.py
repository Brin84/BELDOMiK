"""Initial migration

Revision ID: 3842636985ac
Revises:
Create Date: 2026-08-19 22:20:40.138482

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '3842636985ac'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""

    # ============================================================
    # GEOGRAPHY
    # ============================================================

    op.create_table(
        'regions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('name_en', sa.String(length=100), nullable=True),
        sa.Column('sort_order', sa.Integer(), nullable=True),
        sa.PrimaryKeyConstraint('id', name='pk_regions'),
    )
    op.create_index('ix_regions_name', 'regions', ['name'], unique=False)

    op.create_table(
        'cities',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('region_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('name_en', sa.String(length=100), nullable=True),
        sa.Column('is_major', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('lat', sa.Float(), nullable=True),
        sa.Column('lng', sa.Float(), nullable=True),
        sa.Column('sort_order', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['region_id'], ['regions.id'], name='fk_cities_region_id_regions'),
        sa.PrimaryKeyConstraint('id', name='pk_cities'),
    )
    op.create_index('ix_cities_name', 'cities', ['name'], unique=False)
    op.create_index('ix_cities_region_id', 'cities', ['region_id'], unique=False)

    op.create_table(
        'districts',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('city_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('name_en', sa.String(length=100), nullable=True),
        sa.Column('sort_order', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['city_id'], ['cities.id'], name='fk_districts_city_id_cities'),
        sa.PrimaryKeyConstraint('id', name='pk_districts'),
    )
    op.create_index('ix_districts_name', 'districts', ['name'], unique=False)
    op.create_index('ix_districts_city_id', 'districts', ['city_id'], unique=False)

    op.create_table(
        'neighborhoods',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('city_id', sa.Integer(), nullable=False),
        sa.Column('district_id', sa.Integer(), nullable=True),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('name_en', sa.String(length=100), nullable=True),
        sa.Column('sort_order', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['city_id'], ['cities.id'], name='fk_neighborhoods_city_id_cities'),
        sa.ForeignKeyConstraint(['district_id'], ['districts.id'], name='fk_neighborhoods_district_id_districts'),
        sa.PrimaryKeyConstraint('id', name='pk_neighborhoods'),
    )
    op.create_index('ix_neighborhoods_name', 'neighborhoods', ['name'], unique=False)
    op.create_index('ix_neighborhoods_city_id', 'neighborhoods', ['city_id'], unique=False)
    op.create_index('ix_neighborhoods_district_id', 'neighborhoods', ['district_id'], unique=False)

    op.create_table(
        'streets',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('city_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=200), nullable=False),
        sa.Column('name_en', sa.String(length=200), nullable=True),
        sa.ForeignKeyConstraint(['city_id'], ['cities.id'], name='fk_streets_city_id_cities'),
        sa.PrimaryKeyConstraint('id', name='pk_streets'),
    )
    op.create_index('ix_streets_name', 'streets', ['name'], unique=False)
    op.create_index('ix_streets_city_id', 'streets', ['city_id'], unique=False)

    op.create_table(
        'metro_lines',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('city_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('name_en', sa.String(length=100), nullable=True),
        sa.Column('color', sa.String(length=7), nullable=True),
        sa.ForeignKeyConstraint(['city_id'], ['cities.id'], name='fk_metro_lines_city_id_cities'),
        sa.PrimaryKeyConstraint('id', name='pk_metro_lines'),
    )
    op.create_index('ix_metro_lines_name', 'metro_lines', ['name'], unique=False)
    op.create_index('ix_metro_lines_city_id', 'metro_lines', ['city_id'], unique=False)

    op.create_table(
        'metro_stations',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('line_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('name_en', sa.String(length=100), nullable=True),
        sa.Column('lat', sa.Float(), nullable=True),
        sa.Column('lng', sa.Float(), nullable=True),
        sa.Column('sort_order', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['line_id'], ['metro_lines.id'], name='fk_metro_stations_line_id_metro_lines'),
        sa.PrimaryKeyConstraint('id', name='pk_metro_stations'),
    )
    op.create_index('ix_metro_stations_name', 'metro_stations', ['name'], unique=False)
    op.create_index('ix_metro_stations_line_id', 'metro_stations', ['line_id'], unique=False)

    # ============================================================
    # PROPERTY TYPES & OPERATIONS
    # ============================================================

    op.create_table(
        'property_types',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('category', sa.String(length=50), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('name_en', sa.String(length=100), nullable=True),
        sa.Column('name_plural', sa.String(length=100), nullable=True),
        sa.Column('icon', sa.String(length=50), nullable=True),
        sa.Column('sort_order', sa.Integer(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.PrimaryKeyConstraint('id', name='pk_property_types'),
    )
    op.create_index('ix_property_types_category', 'property_types', ['category'], unique=False)
    op.create_index('ix_property_types_name', 'property_types', ['name'], unique=False)

    op.create_table(
        'operation_types',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=50), nullable=False),
        sa.Column('name_en', sa.String(length=50), nullable=True),
        sa.Column('name_plural', sa.String(length=50), nullable=True),
        sa.Column('sort_order', sa.Integer(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.PrimaryKeyConstraint('id', name='pk_operation_types'),
    )
    op.create_index('ix_operation_types_name', 'operation_types', ['name'], unique=True)

    # ============================================================
    # USERS & AGENCIES
    # ============================================================

    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('tg_id', sa.Integer(), nullable=False),
        sa.Column('username', sa.String(length=100), nullable=True),
        sa.Column('first_name', sa.String(length=100), nullable=True),
        sa.Column('last_name', sa.String(length=100), nullable=True),
        sa.Column('language_code', sa.String(length=10), nullable=True),
        sa.Column('is_bot', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('phone', sa.String(length=20), nullable=True),
        sa.Column('phone_verified', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('tg_verified', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('role', sa.String(length=20), nullable=False, server_default='user'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('is_blocked', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.PrimaryKeyConstraint('id', name='pk_users'),
        sa.UniqueConstraint('tg_id', name='uq_users_tg_id'),
    )
    op.create_index('ix_users_tg_id', 'users', ['tg_id'], unique=True)
    op.create_index('ix_users_username', 'users', ['username'], unique=False)
    op.create_index('ix_users_role', 'users', ['role'], unique=False)

    op.create_table(
        'agencies',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=200), nullable=False),
        sa.Column('logo_url', sa.String(length=500), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('contact_phone', sa.String(length=20), nullable=True),
        sa.Column('contact_email', sa.String(length=200), nullable=True),
        sa.Column('website', sa.String(length=200), nullable=True),
        sa.Column('verified', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.PrimaryKeyConstraint('id', name='pk_agencies'),
    )
    op.create_index('ix_agencies_name', 'agencies', ['name'], unique=False)

    op.create_table(
        'user_profiles',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('avatar_url', sa.String(length=500), nullable=True),
        sa.Column('bio', sa.Text(), nullable=True),
        sa.Column('is_agency', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('agency_id', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], name='fk_user_profiles_user_id_users', ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['agency_id'], ['agencies.id'], name='fk_user_profiles_agency_id_agencies'),
        sa.PrimaryKeyConstraint('id', name='pk_user_profiles'),
        sa.UniqueConstraint('user_id', name='uq_user_profiles_user_id'),
    )
    op.create_index('ix_user_profiles_user_id', 'user_profiles', ['user_id'], unique=True)
    op.create_index('ix_user_profiles_agency_id', 'user_profiles', ['agency_id'], unique=False)

    op.create_table(
        'agency_members',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('agency_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('role', sa.String(length=20), nullable=False, server_default='member'),
        sa.Column('joined_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.ForeignKeyConstraint(['agency_id'], ['agencies.id'], name='fk_agency_members_agency_id_agencies', ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], name='fk_agency_members_user_id_users', ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id', name='pk_agency_members'),
    )
    op.create_index('ix_agency_members_agency_id', 'agency_members', ['agency_id'], unique=False)
    op.create_index('ix_agency_members_user_id', 'agency_members', ['user_id'], unique=False)

    # ============================================================
    # PROPERTIES
    # ============================================================

    op.create_table(
        'properties',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('owner_id', sa.Integer(), nullable=False),
        sa.Column('agency_id', sa.Integer(), nullable=True),
        sa.Column('type_id', sa.Integer(), nullable=False),
        sa.Column('operation_id', sa.Integer(), nullable=False),
        sa.Column('city_id', sa.Integer(), nullable=False),
        sa.Column('district_id', sa.Integer(), nullable=True),
        sa.Column('neighborhood_id', sa.Integer(), nullable=True),
        sa.Column('street_id', sa.Integer(), nullable=True),
        sa.Column('metro_station_id', sa.Integer(), nullable=True),
        sa.Column('metro_distance', sa.Integer(), nullable=True),
        sa.Column('address', sa.String(length=300), nullable=True),
        sa.Column('lat', sa.Float(), nullable=True),
        sa.Column('lng', sa.Float(), nullable=True),
        sa.Column('floor', sa.Integer(), nullable=True),
        sa.Column('total_floors', sa.Integer(), nullable=True),
        sa.Column('build_year', sa.Integer(), nullable=True),
        sa.Column('total_area', sa.Float(), nullable=True),
        sa.Column('living_area', sa.Float(), nullable=True),
        sa.Column('kitchen_area', sa.Float(), nullable=True),
        sa.Column('rooms_count', sa.Integer(), nullable=True),
        sa.Column('renovation', sa.String(length=16), nullable=True),
        sa.Column('furniture', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('balcony', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('parking', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('elevator', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('status', sa.String(length=18), nullable=False, server_default='draft'),
        sa.Column('views_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('favorites_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('moderated_at', sa.DateTime(), nullable=True),
        sa.Column('moderated_by', sa.Integer(), nullable=True),
        sa.Column('published_at', sa.DateTime(), nullable=True),
        sa.Column('archived_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.ForeignKeyConstraint(['owner_id'], ['users.id'], name='fk_properties_owner_id_users', ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['agency_id'], ['agencies.id'], name='fk_properties_agency_id_agencies', ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['type_id'], ['property_types.id'], name='fk_properties_type_id_property_types'),
        sa.ForeignKeyConstraint(['operation_id'], ['operation_types.id'], name='fk_properties_operation_id_operation_types'),
        sa.ForeignKeyConstraint(['city_id'], ['cities.id'], name='fk_properties_city_id_cities'),
        sa.ForeignKeyConstraint(['district_id'], ['districts.id'], name='fk_properties_district_id_districts'),
        sa.ForeignKeyConstraint(['neighborhood_id'], ['neighborhoods.id'], name='fk_properties_neighborhood_id_neighborhoods'),
        sa.ForeignKeyConstraint(['street_id'], ['streets.id'], name='fk_properties_street_id_streets'),
        sa.ForeignKeyConstraint(['metro_station_id'], ['metro_stations.id'], name='fk_properties_metro_station_id_metro_stations'),
        sa.ForeignKeyConstraint(['moderated_by'], ['users.id'], name='fk_properties_moderated_by_users'),
        sa.PrimaryKeyConstraint('id', name='pk_properties'),
    )
    op.create_index('ix_properties_id', 'properties', ['id'], unique=False)
    op.create_index('ix_properties_status', 'properties', ['status'], unique=False)
    op.create_index('ix_properties_type_id', 'properties', ['type_id'], unique=False)
    op.create_index('ix_properties_operation_id', 'properties', ['operation_id'], unique=False)
    op.create_index('ix_properties_city_id', 'properties', ['city_id'], unique=False)
    op.create_index('ix_properties_district_id', 'properties', ['district_id'], unique=False)
    op.create_index('ix_properties_neighborhood_id', 'properties', ['neighborhood_id'], unique=False)
    op.create_index('ix_properties_street_id', 'properties', ['street_id'], unique=False)
    op.create_index('ix_properties_metro_station_id', 'properties', ['metro_station_id'], unique=False)
    op.create_index('ix_properties_owner_id', 'properties', ['owner_id'], unique=False)
    op.create_index('ix_properties_agency_id', 'properties', ['agency_id'], unique=False)
    op.create_index('ix_properties_created_at', 'properties', ['created_at'], unique=False)
    op.create_index('ix_properties_type_operation_city', 'properties', ['type_id', 'operation_id', 'city_id'], unique=False)
    op.create_index('ix_properties_owner_status', 'properties', ['owner_id', 'status'], unique=False)
    op.create_index('ix_properties_city_status_created', 'properties', ['city_id', 'status', 'created_at'], unique=False)
    op.create_index('ix_properties_price_published', 'properties', ['status', 'published_at'], unique=False)

    op.create_table(
        'property_photos',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('property_id', sa.Integer(), nullable=False),
        sa.Column('url', sa.String(length=500), nullable=False),
        sa.Column('thumbnail_url', sa.String(length=500), nullable=True),
        sa.Column('webp_url', sa.String(length=500), nullable=True),
        sa.Column('avif_url', sa.String(length=500), nullable=True),
        sa.Column('sort_order', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('width', sa.Integer(), nullable=True),
        sa.Column('height', sa.Integer(), nullable=True),
        sa.Column('file_size', sa.Integer(), nullable=True),
        sa.Column('mime_type', sa.String(length=50), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.ForeignKeyConstraint(['property_id'], ['properties.id'], name='fk_property_photos_property_id_properties', ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id', name='pk_property_photos'),
    )
    op.create_index('ix_property_photos_property_id', 'property_photos', ['property_id'], unique=False)

    op.create_table(
        'property_features',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('property_id', sa.Integer(), nullable=False),
        sa.Column('feature_key', sa.String(length=100), nullable=False),
        sa.Column('feature_value', sa.String(length=500), nullable=False),
        sa.ForeignKeyConstraint(['property_id'], ['properties.id'], name='fk_property_features_property_id_properties', ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id', name='pk_property_features'),
    )
    op.create_index('ix_property_features_property_id', 'property_features', ['property_id'], unique=False)
    op.create_index('ix_property_features_feature_key', 'property_features', ['feature_key'], unique=False)

    op.create_table(
        'property_prices',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('property_id', sa.Integer(), nullable=False),
        sa.Column('price_byn', sa.Integer(), nullable=False),
        sa.Column('price_usd', sa.Integer(), nullable=True),
        sa.Column('price_per_m2_byn', sa.Integer(), nullable=True),
        sa.Column('price_per_m2_usd', sa.Integer(), nullable=True),
        sa.Column('exchange_rate', sa.Float(), nullable=True),
        sa.Column('is_current', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('changed_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('change_reason', sa.String(length=100), nullable=True),
        sa.ForeignKeyConstraint(['property_id'], ['properties.id'], name='fk_property_prices_property_id_properties', ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id', name='pk_property_prices'),
    )
    op.create_index('ix_property_prices_property_id', 'property_prices', ['property_id'], unique=False)
    op.create_index('ix_property_prices_is_current', 'property_prices', ['is_current'], unique=False)
    op.create_index('ix_property_prices_changed_at', 'property_prices', ['changed_at'], unique=False)

    # ============================================================
    # FAVORITES & SAVED SEARCHES
    # ============================================================

    op.create_table(
        'favorites',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('property_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], name='fk_favorites_user_id_users', ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['property_id'], ['properties.id'], name='fk_favorites_property_id_properties', ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id', name='pk_favorites'),
        sa.UniqueConstraint('user_id', 'property_id', name='uq_favorites_user_property'),
    )
    op.create_index('ix_favorites_user_id', 'favorites', ['user_id'], unique=False)
    op.create_index('ix_favorites_property_id', 'favorites', ['property_id'], unique=False)

    op.create_table(
        'saved_searches',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=200), nullable=True),
        sa.Column('filters_json', sa.Text(), nullable=False),
        sa.Column('notify_frequency', sa.String(length=20), nullable=False, server_default='daily'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('last_notified_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], name='fk_saved_searches_user_id_users', ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id', name='pk_saved_searches'),
    )
    op.create_index('ix_saved_searches_user_id', 'saved_searches', ['user_id'], unique=False)

    op.create_table(
        'search_notifications',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('search_id', sa.Integer(), nullable=False),
        sa.Column('property_id', sa.Integer(), nullable=False),
        sa.Column('sent_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='sent'),
        sa.ForeignKeyConstraint(['search_id'], ['saved_searches.id'], name='fk_search_notifications_search_id_saved_searches', ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['property_id'], ['properties.id'], name='fk_search_notifications_property_id_properties', ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id', name='pk_search_notifications'),
    )
    op.create_index('ix_search_notifications_search_id', 'search_notifications', ['search_id'], unique=False)
    op.create_index('ix_search_notifications_property_id', 'search_notifications', ['property_id'], unique=False)

    # ============================================================
    # VIEWS & CONTACTS & REPORTS
    # ============================================================

    op.create_table(
        'property_views',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('property_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('viewed_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('referrer', sa.String(length=200), nullable=True),
        sa.ForeignKeyConstraint(['property_id'], ['properties.id'], name='fk_property_views_property_id_properties', ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], name='fk_property_views_user_id_users', ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id', name='pk_property_views'),
    )
    op.create_index('ix_property_views_property_id', 'property_views', ['property_id'], unique=False)
    op.create_index('ix_property_views_user_id', 'property_views', ['user_id'], unique=False)
    op.create_index('ix_property_views_viewed_at', 'property_views', ['viewed_at'], unique=False)

    op.create_table(
        'property_contacts',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('property_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('contact_type', sa.String(length=20), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.ForeignKeyConstraint(['property_id'], ['properties.id'], name='fk_property_contacts_property_id_properties', ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], name='fk_property_contacts_user_id_users', ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id', name='pk_property_contacts'),
    )
    op.create_index('ix_property_contacts_property_id', 'property_contacts', ['property_id'], unique=False)
    op.create_index('ix_property_contacts_user_id', 'property_contacts', ['user_id'], unique=False)
    op.create_index('ix_property_contacts_contact_type', 'property_contacts', ['contact_type'], unique=False)

    op.create_table(
        'reports',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('reporter_id', sa.Integer(), nullable=False),
        sa.Column('property_id', sa.Integer(), nullable=False),
        sa.Column('reason', sa.String(length=50), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='open'),
        sa.Column('resolved_at', sa.DateTime(), nullable=True),
        sa.Column('resolved_by', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['reporter_id'], ['users.id'], name='fk_reports_reporter_id_users', ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['property_id'], ['properties.id'], name='fk_reports_property_id_properties', ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['resolved_by'], ['users.id'], name='fk_reports_resolved_by_users'),
        sa.PrimaryKeyConstraint('id', name='pk_reports'),
    )
    op.create_index('ix_reports_status', 'reports', ['status'], unique=False)
    op.create_index('ix_reports_property_id', 'reports', ['property_id'], unique=False)
    op.create_index('ix_reports_reporter_id', 'reports', ['reporter_id'], unique=False)

    # ============================================================
    # MONETIZATION
    # ============================================================

    op.create_table(
        'promotions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('property_id', sa.Integer(), nullable=False),
        sa.Column('type', sa.String(length=9), nullable=False),
        sa.Column('started_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.Column('price_byn', sa.Integer(), nullable=False),
        sa.Column('status', sa.String(length=9), nullable=False, server_default='pending'),
        sa.ForeignKeyConstraint(['property_id'], ['properties.id'], name='fk_promotions_property_id_properties', ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id', name='pk_promotions'),
    )
    op.create_index('ix_promotions_property_id', 'promotions', ['property_id'], unique=False)
    op.create_index('ix_promotions_type', 'promotions', ['type'], unique=False)
    op.create_index('ix_promotions_status', 'promotions', ['status'], unique=False)
    op.create_index('ix_promotions_expires_at', 'promotions', ['expires_at'], unique=False)

    op.create_table(
        'subscriptions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('agency_id', sa.Integer(), nullable=False),
        sa.Column('plan', sa.String(length=10), nullable=False, server_default='free'),
        sa.Column('started_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.Column('status', sa.String(length=9), nullable=False, server_default='active'),
        sa.Column('max_properties', sa.Integer(), nullable=False, server_default='10'),
        sa.Column('max_promotions', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('has_analytics', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('has_team', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('team_size', sa.Integer(), nullable=False, server_default='1'),
        sa.ForeignKeyConstraint(['agency_id'], ['agencies.id'], name='fk_subscriptions_agency_id_agencies', ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id', name='pk_subscriptions'),
    )
    op.create_index('ix_subscriptions_agency_id', 'subscriptions', ['agency_id'], unique=False)
    op.create_index('ix_subscriptions_expires_at', 'subscriptions', ['expires_at'], unique=False)

    op.create_table(
        'payments',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('agency_id', sa.Integer(), nullable=True),
        sa.Column('amount_byn', sa.Integer(), nullable=False),
        sa.Column('currency', sa.String(length=3), nullable=False, server_default='BYN'),
        sa.Column('status', sa.String(length=9), nullable=False, server_default='pending'),
        sa.Column('provider', sa.String(length=50), nullable=True),
        sa.Column('provider_payment_id', sa.String(length=200), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('metadata_json', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], name='fk_payments_user_id_users', ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['agency_id'], ['agencies.id'], name='fk_payments_agency_id_agencies', ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id', name='pk_payments'),
    )
    op.create_index('ix_payments_user_id', 'payments', ['user_id'], unique=False)
    op.create_index('ix_payments_agency_id', 'payments', ['agency_id'], unique=False)
    op.create_index('ix_payments_status', 'payments', ['status'], unique=False)
    op.create_index('ix_payments_provider_payment_id', 'payments', ['provider_payment_id'], unique=False)

    # ============================================================
    # MODERATION
    # ============================================================

    op.create_table(
        'moderation_actions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('property_id', sa.Integer(), nullable=False),
        sa.Column('admin_id', sa.Integer(), nullable=False),
        sa.Column('action', sa.String(length=7), nullable=False),
        sa.Column('reason', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.ForeignKeyConstraint(['property_id'], ['properties.id'], name='fk_moderation_actions_property_id_properties', ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['admin_id'], ['users.id'], name='fk_moderation_actions_admin_id_users'),
        sa.PrimaryKeyConstraint('id', name='pk_moderation_actions'),
    )
    op.create_index('ix_moderation_actions_property_id', 'moderation_actions', ['property_id'], unique=False)
    op.create_index('ix_moderation_actions_admin_id', 'moderation_actions', ['admin_id'], unique=False)
    op.create_index('ix_moderation_actions_created_at', 'moderation_actions', ['created_at'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""

    # Drop in reverse order
    op.drop_index('ix_moderation_actions_created_at', table_name='moderation_actions')
    op.drop_index('ix_moderation_actions_admin_id', table_name='moderation_actions')
    op.drop_index('ix_moderation_actions_property_id', table_name='moderation_actions')
    op.drop_table('moderation_actions')

    op.drop_index('ix_payments_provider_payment_id', table_name='payments')
    op.drop_index('ix_payments_status', table_name='payments')
    op.drop_index('ix_payments_agency_id', table_name='payments')
    op.drop_index('ix_payments_user_id', table_name='payments')
    op.drop_table('payments')

    op.drop_index('ix_subscriptions_expires_at', table_name='subscriptions')
    op.drop_index('ix_subscriptions_agency_id', table_name='subscriptions')
    op.drop_table('subscriptions')

    op.drop_index('ix_promotions_expires_at', table_name='promotions')
    op.drop_index('ix_promotions_status', table_name='promotions')
    op.drop_index('ix_promotions_type', table_name='promotions')
    op.drop_index('ix_promotions_property_id', table_name='promotions')
    op.drop_table('promotions')

    op.drop_index('ix_reports_reporter_id', table_name='reports')
    op.drop_index('ix_reports_property_id', table_name='reports')
    op.drop_index('ix_reports_status', table_name='reports')
    op.drop_table('reports')

    op.drop_index('ix_property_contacts_contact_type', table_name='property_contacts')
    op.drop_index('ix_property_contacts_user_id', table_name='property_contacts')
    op.drop_index('ix_property_contacts_property_id', table_name='property_contacts')
    op.drop_table('property_contacts')

    op.drop_index('ix_property_views_viewed_at', table_name='property_views')
    op.drop_index('ix_property_views_user_id', table_name='property_views')
    op.drop_index('ix_property_views_property_id', table_name='property_views')
    op.drop_table('property_views')

    op.drop_index('ix_search_notifications_property_id', table_name='search_notifications')
    op.drop_index('ix_search_notifications_search_id', table_name='search_notifications')
    op.drop_table('search_notifications')

    op.drop_index('ix_saved_searches_user_id', table_name='saved_searches')
    op.drop_table('saved_searches')

    op.drop_index('ix_favorites_property_id', table_name='favorites')
    op.drop_index('ix_favorites_user_id', table_name='favorites')
    op.drop_table('favorites')

    op.drop_index('ix_property_prices_changed_at', table_name='property_prices')
    op.drop_index('ix_property_prices_is_current', table_name='property_prices')
    op.drop_index('ix_property_prices_property_id', table_name='property_prices')
    op.drop_table('property_prices')

    op.drop_index('ix_property_features_feature_key', table_name='property_features')
    op.drop_index('ix_property_features_property_id', table_name='property_features')
    op.drop_table('property_features')

    op.drop_index('ix_property_photos_property_id', table_name='property_photos')
    op.drop_table('property_photos')

    op.drop_index('ix_properties_price_published', table_name='properties')
    op.drop_index('ix_properties_city_status_created', table_name='properties')
    op.drop_index('ix_properties_owner_status', table_name='properties')
    op.drop_index('ix_properties_type_operation_city', table_name='properties')
    op.drop_index('ix_properties_created_at', table_name='properties')
    op.drop_index('ix_properties_agency_id', table_name='properties')
    op.drop_index('ix_properties_type_id', table_name='properties')
    op.drop_index('ix_properties_operation_id', table_name='properties')
    op.drop_index('ix_properties_status', table_name='properties')
    op.drop_index('ix_properties_city_id', table_name='properties')
    op.drop_index('ix_properties_district_id', table_name='properties')
    op.drop_index('ix_properties_neighborhood_id', table_name='properties')
    op.drop_index('ix_properties_street_id', table_name='properties')
    op.drop_index('ix_properties_metro_station_id', table_name='properties')
    op.drop_index('ix_properties_owner_id', table_name='properties')
    op.drop_index('ix_properties_id', table_name='properties')
    op.drop_table('properties')

    op.drop_index('ix_agency_members_user_id', table_name='agency_members')
    op.drop_index('ix_agency_members_agency_id', table_name='agency_members')
    op.drop_table('agency_members')

    op.drop_index('ix_user_profiles_agency_id', table_name='user_profiles')
    op.drop_index('ix_user_profiles_user_id', table_name='user_profiles')
    op.drop_table('user_profiles')

    op.drop_index('ix_agencies_name', table_name='agencies')
    op.drop_table('agencies')

    op.drop_index('ix_users_role', table_name='users')
    op.drop_index('ix_users_username', table_name='users')
    op.drop_index('ix_users_tg_id', table_name='users')
    op.drop_table('users')

    op.drop_index('ix_operation_types_name', table_name='operation_types')
    op.drop_table('operation_types')

    op.drop_index('ix_property_types_name', table_name='property_types')
    op.drop_index('ix_property_types_category', table_name='property_types')
    op.drop_table('property_types')

    op.drop_index('ix_metro_stations_line_id', table_name='metro_stations')
    op.drop_index('ix_metro_stations_name', table_name='metro_stations')
    op.drop_table('metro_stations')

    op.drop_index('ix_metro_lines_city_id', table_name='metro_lines')
    op.drop_index('ix_metro_lines_name', table_name='metro_lines')
    op.drop_table('metro_lines')

    op.drop_index('ix_streets_city_id', table_name='streets')
    op.drop_index('ix_streets_name', table_name='streets')
    op.drop_table('streets')

    op.drop_index('ix_neighborhoods_district_id', table_name='neighborhoods')
    op.drop_index('ix_neighborhoods_city_id', table_name='neighborhoods')
    op.drop_index('ix_neighborhoods_name', table_name='neighborhoods')
    op.drop_table('neighborhoods')

    op.drop_index('ix_districts_city_id', table_name='districts')
    op.drop_index('ix_districts_name', table_name='districts')
    op.drop_table('districts')

    op.drop_index('ix_cities_region_id', table_name='cities')
    op.drop_index('ix_cities_name', table_name='cities')
    op.drop_table('cities')

    op.drop_index('ix_regions_name', table_name='regions')
    op.drop_table('regions')