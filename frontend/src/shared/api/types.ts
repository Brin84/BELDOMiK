export type PropertyStatus =
  | 'draft'
  | 'pending_moderation'
  | 'published'
  | 'rejected'
  | 'blocked'
  | 'archived'
  | 'sold'
  | 'rented';

export type UserRole = 'owner' | 'agent' | 'agency_admin' | 'moderator' | 'admin';

export type OperationType = 'sale' | 'rent' | 'daily_rent' | 'exchange';

export type PropertyCategory =
  | 'apartment'
  | 'house'
  | 'land'
  | 'commercial'
  | 'garage'
  | 'dacha';

export interface User {
  id: number;
  telegram_id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
  role: UserRole;
  is_admin: boolean;
  is_moderator: boolean;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: 'bearer';
  user: User;
}

export interface TelegramAuthRequest {
  init_data: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export interface PropertyShort {
  id: number;
  title?: string;
  price_byn: number | null;
  price_usd: number | null;
  price_per_m2_byn: number | null;
  currency: 'BYN' | 'USD' | 'RUB';
  operation: string;
  operation_name: string;
  property_type: string;
  type_name: string;
  city: string;
  city_name: string;
  region?: string;
  region_name?: string;
  district?: string;
  district_name?: string;
  neighborhood?: string;
  neighborhood_name?: string;
  street?: string;
  street_name?: string;
  metro_station_name?: string;
  metro_distance?: number;
  rooms?: number;
  rooms_count?: number;
  area?: number;
  total_area?: number;
  floor?: number;
  floors_total?: number;
  total_floors?: number;
  photo_url?: string;
  photo_count: number;
  status: PropertyStatus;
  is_favorite: boolean;
  favorites_count: number;
  views_count: number;
  created_at: string;
  updated_at: string;
  owner_id: number;
  owner_name?: string;
  // Additional fields from backend
  latitude?: number;
  longitude?: number;
  build_year?: number;
  renovation?: string;
  furniture?: boolean;
  balcony?: boolean;
  parking?: boolean;
  elevator?: boolean;
  is_new_building?: boolean;
  is_direct?: boolean;
  description?: string;
  address?: string;
  agency_id?: number | null;
  is_promoted?: boolean;
  promotion_type?: string;
}

export interface PropertyPhoto {
  id: number;
  property_id: number;
  url: string;
  thumbnail_url: string | null;
  webp_url: string | null;
  avif_url: string | null;
  sort_order: number;
  width: number | null;
  height: number | null;
  file_size: number | null;
  mime_type: string | null;
  created_at: string;
}

export interface PropertyFeature {
  id: number;
  property_id: number;
  feature_key: string;
  feature_value: string;
}

export interface PropertyPrice {
  id: number;
  property_id: number;
  price_byn: number;
  price_usd: number | null;
  price_per_m2_byn: number | null;
  price_per_m2_usd: number | null;
  exchange_rate: number | null;
  change_reason: string | null;
  is_current: boolean;
  changed_at: string;
}

export interface PropertyDetail extends PropertyShort {
  photos: PropertyPhoto[];
  features: PropertyFeature[];
  price_history: PropertyPrice[];
  published_at: string | null;
  living_area?: number | null;
  kitchen_area?: number | null;
  // Contact info (from backend)
  phone?: string | null;
  email?: string | null;
  telegram?: string | null;
  // Owner contact channels, populated from the User relation in the detail route
  owner_username?: string | null;
  owner_phone?: string | null;
  // Owner info (may be populated from separate endpoint)
  owner?: PropertyOwner | null;
  // Agency info (joined) for the detail view.
  agency_name?: string | null;
  agency_logo_url?: string | null;
  is_verified?: boolean;
}

export interface PropertyOwner {
  id: number;
  name: string;
  username?: string;
  phone_verified: boolean;
  telegram_verified: boolean;
  role: UserRole;
  is_agency: boolean;
  agency_name?: string;
  listings_count: number;
  member_since: string;
}

export interface PropertyFilterParams {
  operation_id?: number;
  type_id?: number;

  q?: string;

  region_id?: number;
  city_id?: number;
  district_id?: number;
  neighborhood_id?: number;
  street_id?: number;
  metro_station_id?: number;

  rooms_count?: number;

  total_area_min?: number;
  total_area_max?: number;

  living_area_min?: number;
  living_area_max?: number;
  kitchen_area_min?: number;
  kitchen_area_max?: number;

  price_byn_min?: number;
  price_byn_max?: number;

  floor_min?: number;
  floor_max?: number;

  total_floors_min?: number;
  total_floors_max?: number;

  build_year_min?: number;
  build_year_max?: number;

  renovation?: string;
  furniture?: boolean;
  balcony?: boolean;
  parking?: boolean;
  elevator?: boolean;

  metro_distance_max?: number;

  sort_by?:
    | 'created_at'
    | 'created_at_desc'
    | 'price_byn'
    | 'price_byn_desc'
    | 'total_area'
    | 'total_area_desc';

  sort_order?: 'asc' | 'desc';

  page?: number;
  page_size?: number;

  with_photos_only?: boolean;
  is_favorite_only?: boolean;
  is_direct_only?: boolean;
  new_building_only?: boolean;
}

export interface PropertyCreate {
  title: string;
  description?: string;
  operation: OperationType;
  property_type_id: number;
  region_id: number;
  city_id: number;
  district_id?: number;
  neighborhood_id?: number;
  street_id?: number;
  address?: string;
  latitude?: number;
  longitude?: number;
  price_byn: number;
  price_usd?: number;
  area?: number;
  rooms?: number;
  floor?: number;
  floors_total?: number;
  build_year?: number;
  repair_type?: string;
  has_balcony?: boolean;
  has_furniture?: boolean;
  has_elevator?: boolean;
  has_parking?: boolean;
}

export interface PropertyUpdate extends Partial<PropertyCreate> {}

export interface Region {
  id: number;
  name: string;
  name_en: string;
  sort_order: number;
}

export interface City {
  id: number;
  name: string;
  name_en: string;
  /** null — свой населённый пункт, добавленный пользователем. */
  region_id: number | null;
  is_major: boolean;
  sort_order: number;
}

export interface District {
  id: number;
  name: string;
  name_en: string;
  city_id: number;
  sort_order: number;
}

export interface Neighborhood {
  id: number;
  name: string;
  name_en: string;
  city_id: number;
  sort_order: number;
}

export interface Street {
  id: number;
  name: string;
  name_en: string;
  city_id: number;
  sort_order: number;
}

export interface MetroLine {
  id: number;
  name: string;
  city_id: number;
  color: string;
}

export interface MetroStation {
  id: number;
  name: string;
  line_id: number;
  sort_order: number;
}

export interface PropertyType {
  id: number;
  category: PropertyCategory;
  name: string;
  name_en: string;
  name_plural: string;
  icon: string;
  sort_order: number;
  is_active: boolean;
}

export interface OperationTypeData {
  id: number;
  name: string;
  name_en: string;
  name_plural: string;
  sort_order: number;
  is_active: boolean;
}

export interface Favorite {
  id: number;
  user_id: number;
  property_id: number;
  created_at: string;
  property: PropertyShort;
}

export interface SavedSearch {
  id: number;
  user_id: number;
  name: string | null;
  filters_json: string;
  notify_frequency: 'immediate' | 'daily' | 'weekly' | 'disabled';
  is_active: boolean;
  last_notified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SavedSearchCreate {
  name?: string;
  filters_json: string;
  notify_frequency?: 'immediate' | 'daily' | 'weekly' | 'disabled';
}

export interface SavedSearchUpdate {
  name?: string | null;
  filters_json?: string;
  notify_frequency?: 'immediate' | 'daily' | 'weekly' | 'disabled';
  is_active?: boolean;
}

export interface Collection {
  id: number;
  user_id: number;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  property_count: number;
}

export interface CollectionDetail extends Collection {
  items: PropertyShort[];
}

export interface CollectionCreate {
  name: string;
  description?: string;
}

export interface PropertyNote {
  id: number;
  user_id: number;
  property_id: number;
  text: string;
  created_at: string;
  updated_at: string;
}

export type ViewingStatus = 'pending' | 'confirmed' | 'cancelled';

export interface ViewingRequest {
  id: number;
  property_id: number;
  user_id: number | null;
  name: string;
  phone: string;
  preferred_date: string | null;
  preferred_time: string | null;
  comment: string | null;
  status: ViewingStatus;
  created_at: string;
}

export interface ViewingRequestCreate {
  property_id: number;
  name: string;
  phone: string;
  preferred_date?: string | null;
  preferred_time?: string | null;
  comment?: string | null;
}

// ── Monetization & agencies ───────────────────────────────────

export type PromotionTypeName =
  | 'top'
  | 'vip'
  | 'bump_up'
  | 'highlight'
  | 'pin';

/** Static promotion product from the catalog. */
export interface Promotion {
  type: PromotionTypeName;
  label: string;
  price_byn: number;
  duration_days: number;
  priority: number;
  badge_color: string;
  features: string[];
}

/** Applied promotion record on a property. */
export interface PromotionApplied {
  id: number;
  property_id: number;
  type: string;
  status: string;
  started_at: string | null;
  expires_at: string;
  price_byn: number;
}

export interface PaymentCheckout {
  payment_id: number;
  amount_byn: number;
  currency: string;
  provider: string;
  confirmation: Record<string, unknown>;
}

export type PaymentStatus = 'pending' | 'succeeded' | 'failed' | 'refunded';

export interface Payment {
  id: number;
  user_id: number | null;
  agency_id: number | null;
  property_id: number | null;
  promotion_id: number | null;
  subscription_id: number | null;
  amount_byn: number;
  currency: string;
  status: PaymentStatus;
  provider: string | null;
  payment_link: string | null;
  description: string | null;
  created_at: string;
  completed_at: string | null;
}

export type SubscriptionPlanName = 'free' | 'pro' | 'enterprise';

export interface SubscriptionPlanInfo {
  plan: SubscriptionPlanName;
  label: string;
  price_byn: number;
  duration_days: number;
  max_properties: number;
  max_promotions: number;
  has_analytics: boolean;
  has_team: boolean;
  team_size: number;
  features: string[];
}

export interface Subscription {
  id: number;
  agency_id: number;
  plan: SubscriptionPlanName;
  status: string;
  started_at: string | null;
  expires_at: string;
  max_properties: number;
  max_promotions: number;
  has_analytics: boolean;
  has_team: boolean;
  team_size: number;
}

export interface Agency {
  id: number;
  name: string;
  logo_url?: string | null;
  description?: string | null;
  contact_phone?: string | null;
  contact_email?: string | null;
  website?: string | null;
  verified: boolean;
  is_active?: boolean;
  property_count: number;
  member_count?: number;
  created_at?: string | null;
}

export interface AgencyCreate {
  name: string;
  logo_url?: string | null;
  description?: string | null;
  contact_phone?: string | null;
  contact_email?: string | null;
  website?: string | null;
}

export interface AgencyUpdate extends Partial<AgencyCreate> {}

export interface AgencyMember {
  user_id: number;
  name: string;
  role: string;
  joined_at: string | null;
}

export interface AnalyticsOverview {
  total_properties: number;
  active_properties: number;
  total_users: number;
  total_views: number;
  avg_price_byn: number;
}

export interface CityStats {
  city: string;
  count: number;
  avg_price: number;
  avg_price_per_sqm: number;
}

// ── Admin types ─────────────────────────────────────────────

export interface AdminDashboard {
  total_users: number;
  total_properties: number;
  published_properties: number;
  pending_properties: number;
  blocked_properties: number;
  total_views: number;
  total_favorites: number;
  open_reports: number;
  properties_today: number;
  users_today: number;
}

export interface AdminUserListItem {
  id: number;
  tg_id: number;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  role: UserRole;
  is_active: boolean;
  is_blocked: boolean;
  properties_count: number;
  created_at: string;
}

export interface AdminPropertyListItem {
  id: number;
  title: string | null;
  type_name: string | null;
  operation_name: string | null;
  city_name: string | null;
  status: PropertyStatus;
  owner_id: number;
  owner_name: string | null;
  price_byn: number | null;
  views_count: number;
  created_at: string;
}

export interface AdminReport {
  id: number;
  reporter_id: number;
  property_id: number;
  reason: string;
  description: string | null;
  status: string;
  created_at: string;
  resolved_at: string | null;
}

export interface AdminReportResponse {
  items: AdminReport[];
  total: number;
  page: number;
  page_size: number;
}