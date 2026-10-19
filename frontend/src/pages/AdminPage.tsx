import { useEffect, useState, useCallback } from 'react';
import { useTelegram } from '@/app/providers/TelegramProvider';
import { useAuthStore } from '@/features/auth';
import { useHaptics } from '@/shared/lib/haptics';
import { useToast } from '@/shared/ui/Toast';
import { useNavigate } from 'react-router-dom';
import { useAdminStore } from '@/features/admin';
import type { UserRole, PropertyStatus } from '@/shared/api';
import { BynSymbol } from '@/shared/ui';
import { API_ENDPOINTS } from '@/shared/api/endpoints';
import { api } from '@/shared/api/client';
import { MONETIZATION_ENABLED } from '@/shared/lib/featureFlags';

type AdminTab = 'dashboard' | 'users' | 'properties' | 'reports' | 'promotions';

const ROLE_LABELS: Record<UserRole, string> = {
  admin: '👑 Админ',
  moderator: '🛡️ Модератор',
  agency_admin: '🏢 Админ агентства',
  agent: '🤝 Агент',
  owner: '👤 Владелец',
};

const STATUS_LABELS: Record<PropertyStatus, string> = {
  draft: 'Черновик',
  pending_moderation: 'На модерации',
  published: 'Опубликовано',
  rejected: 'Отклонено',
  blocked: 'Заблокировано',
  archived: 'В архиве',
  sold: 'Продано',
  rented: 'Сдано',
};

const STATUS_COLORS: Record<PropertyStatus, { bg: string; text: string }> = {
  draft: { bg: 'rgba(142,142,147,0.15)', text: '#8e8e93' },
  pending_moderation: { bg: 'rgba(255,149,0,0.15)', text: '#ff9500' },
  published: { bg: 'rgba(52,199,89,0.15)', text: '#34c759' },
  rejected: { bg: 'rgba(255,59,48,0.15)', text: '#ff3b30' },
  blocked: { bg: 'rgba(255,59,48,0.25)', text: '#ff3b30' },
  archived: { bg: 'rgba(142,142,147,0.15)', text: '#8e8e93' },
  sold: { bg: 'rgba(88,86,214,0.15)', text: '#5856d6' },
  rented: { bg: 'rgba(0,122,255,0.15)', text: '#007aff' },
};

export function AdminPage() {
  const { user } = useAuthStore();
  const { trigger } = useHaptics();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const { hapticFeedback } = useTelegram();

  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');

  // Store
  const {
    dashboard, users, properties, reports,
    usersLoading, propertiesLoading, reportsLoading,
    fetchDashboard, fetchUsers, fetchProperties, fetchReports,
    updateUserRole, blockUser, updatePropertyStatus, resolveReport,
    postListingToChannel,
  } = useAdminStore();

  // Filters
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('');
  const [propertyStatusFilter, SetPropertyStatusFilter] = useState('');
  const [propertySearch, setPropertySearch] = useState('');
  const [reportStatusFilter, setReportStatusFilter] = useState('');

  // Load data on tab change
  useEffect(() => {
    switch (activeTab) {
      case 'dashboard':
        fetchDashboard();
        break;
      case 'users':
        fetchUsers({ search: userSearch || undefined, role: userRoleFilter || undefined });
        break;
      case 'properties':
        fetchProperties({ status: propertyStatusFilter || undefined, search: propertySearch || undefined });
        break;
      case 'reports':
        fetchReports({ status: reportStatusFilter || undefined });
        break;
    }
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  // Redirect if not admin
  useEffect(() => {
    if (user && user.role !== 'admin' && user.role !== 'moderator') {
      navigate('/profile');
    }
  }, [user, navigate]);

  const handleTabChange = useCallback((tab: AdminTab) => {
    trigger('light');
    setActiveTab(tab);
  }, [trigger]);

  const formatNumber = (n: number) => n.toLocaleString('ru-BY');
  const formatDate = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  // ── Promotions state ─────────────────────────────────────────
  const [brackets, setBrackets] = useState<any[]>([]);
  const [basePrices, setBasePrices] = useState<any[]>([]);
  const [promotionsLoading, setPromotionsLoading] = useState(true);
  const [previewPrice, setPreviewPrice] = useState<string>('100000');
  const [preview, setPreview] = useState<any[]>([]);
  const [saving, setSaving] = useState<string | null>(null);

  const loadPromotionsData = async () => {
    setPromotionsLoading(true);
    try {
      const [bracketsRes, basePricesRes] = await Promise.all([
        api.get<any[]>(API_ENDPOINTS.admin.promotion.brackets),
        api.get<any[]>(API_ENDPOINTS.admin.promotion.basePrices),
      ]);
      setBrackets(bracketsRes);
      setBasePrices(basePricesRes);
    } catch (err) {
      console.error('Failed to load promotions data:', err);
      showToast('Ошибка загрузки данных', 'error');
    } finally {
      setPromotionsLoading(false);
    }
  };

  const previewPricing = async () => {
    try {
      const res = await api.post<any[]>(API_ENDPOINTS.admin.promotion.pricingPreview, {
        property_price_byn: parseInt(previewPrice) || 0,
      });
      setPreview(res);
    } catch (err) {
      console.error('Failed to preview pricing:', err);
      showToast('Ошибка расчёта', 'error');
    }
  };

  const updateBracket = async (bracket: any) => {
    setSaving(bracket.id);
    try {
      await api.patch(`${API_ENDPOINTS.admin.promotion.brackets}/${bracket.id}`, bracket);
      showToast('Брекет обновлён', 'success');
    } catch (err) {
      console.error('Failed to update bracket:', err);
      showToast('Ошибка сохранения', 'error');
    } finally {
      setSaving(null);
    }
  };

  const updateBasePrice = async (item: any) => {
    setSaving(item.type);
    try {
      await api.patch(API_ENDPOINTS.admin.promotion.basePrice(item.type), {
        base_price_byn: item.base_price_byn,
        duration_days: item.duration_days,
        priority: item.priority,
        badge_color: item.badge_color,
        features: item.features,
      });
      showToast('Базовая цена обновлена', 'success');
    } catch (err) {
      console.error('Failed to update base price:', err);
      showToast('Ошибка сохранения', 'error');
    } finally {
      setSaving(null);
    }
  };

  useEffect(() => {
    if (activeTab === 'promotions') {
      loadPromotionsData();
    }
  }, [activeTab]);

  // ── Promotions Tab ──────────────────────────────────────────
  const renderPromotions = () => {
    if (promotionsLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="text-tg-hint text-sm">Загрузка...</div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {/* Price Brackets */}
        <div className="p-3 rounded-xl" style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color)' }}>
          <h3 className="text-tg-text font-bold mb-3">📊 Ценовые брекеты (мультипликаторы)</h3>
          <div className="space-y-2">
            {brackets.map((b) => (
              <div
                key={b.id || b.min_price_byn}
                className="flex items-center gap-2 p-2 rounded-lg"
                style={{ backgroundColor: 'var(--tg-theme-bg-color)' }}
              >
                <input
                  type="number"
                  value={b.min_price_byn}
                  onChange={(e) => setBrackets(brackets.map(x => x.min_price_byn === b.min_price_byn ? { ...x, min_price_byn: parseInt(e.target.value) || 0 } : x))}
                  className="w-20 px-2 py-1 rounded text-sm"
                  style={{ backgroundColor: 'var(--tg-theme-bg-color)', color: 'var(--tg-theme-text-color)', border: '1px solid var(--tg-theme-hint-color)' }}
                />
                <span className="text-tg-hint text-sm">—</span>
                <input
                  type="number"
                  value={b.max_price_byn ?? ''}
                  onChange={(e) => setBrackets(brackets.map(x => x.min_price_byn === b.min_price_byn ? { ...x, max_price_byn: e.target.value ? parseInt(e.target.value) : null } : x))}
                  className="w-20 px-2 py-1 rounded text-sm"
                  placeholder="∞"
                  style={{ backgroundColor: 'var(--tg-theme-bg-color)', color: 'var(--tg-theme-text-color)', border: '1px solid var(--tg-theme-hint-color)' }}
                />
                <span className="text-tg-hint text-sm">×</span>
                <input
                  type="number"
                  step="0.1"
                  value={b.multiplier}
                  onChange={(e) => setBrackets(brackets.map(x => x.min_price_byn === b.min_price_byn ? { ...x, multiplier: parseFloat(e.target.value) || 1 } : x))}
                  className="w-16 px-2 py-1 rounded text-sm"
                  style={{ backgroundColor: 'var(--tg-theme-bg-color)', color: 'var(--tg-theme-text-color)', border: '1px solid var(--tg-theme-hint-color)' }}
                />
                <input
                  type="text"
                  value={b.label}
                  onChange={(e) => setBrackets(brackets.map(x => x.min_price_byn === b.min_price_byn ? { ...x, label: e.target.value } : x))}
                  className="flex-1 px-2 py-1 rounded text-sm"
                  style={{ backgroundColor: 'var(--tg-theme-bg-color)', color: 'var(--tg-theme-text-color)', border: '1px solid var(--tg-theme-hint-color)' }}
                />
                <button
                  onClick={() => updateBracket(b)}
                  disabled={saving === b.id}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium"
                  style={{
                    backgroundColor: 'var(--tg-theme-button-color)',
                    color: 'var(--tg-theme-button-text-color)',
                    opacity: saving === b.id ? 0.6 : 1,
                  }}
                >
                  {saving === b.id ? '⏳' : '💾'}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Base Prices */}
        <div className="p-3 rounded-xl" style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color)' }}>
          <h3 className="text-tg-text font-bold mb-3">💰 Базовые цены продвижений</h3>
          <div className="space-y-2">
            {basePrices.map((bp) => (
              <div
                key={bp.type}
                className="flex flex-col gap-2 p-3 rounded-lg"
                style={{ backgroundColor: 'var(--tg-theme-bg-color)', border: `2px solid ${bp.badge_color}` }}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ backgroundColor: bp.badge_color, color: '#fff' }}
                  >
                    {bp.type.charAt(0).toUpperCase()}
                  </span>
                  <span className="font-medium text-sm" style={{ color: 'var(--tg-theme-text-color)' }}>
                    {bp.label} ({bp.type})
                  </span>
                  <span className="text-tg-hint text-xs">Приоритет: {bp.priority}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <input
                    type="number"
                    step="0.1"
                    placeholder="Базовая цена"
                    value={bp.base_price_byn}
                    onChange={(e) => setBasePrices(basePrices.map(x => x.type === bp.type ? { ...x, base_price_byn: parseFloat(e.target.value) || 0 } : x))}
                    className="w-28 px-2 py-1 rounded text-sm"
                    style={{ backgroundColor: 'var(--tg-theme-bg-color)', color: 'var(--tg-theme-text-color)', border: '1px solid var(--tg-theme-hint-color)' }}
                  />
                  <input
                    type="number"
                    placeholder="Дни"
                    value={bp.duration_days}
                    onChange={(e) => setBasePrices(basePrices.map(x => x.type === bp.type ? { ...x, duration_days: parseInt(e.target.value) || 7 } : x))}
                    className="w-16 px-2 py-1 rounded text-sm"
                    style={{ backgroundColor: 'var(--tg-theme-bg-color)', color: 'var(--tg-theme-text-color)', border: '1px solid var(--tg-theme-hint-color)' }}
                  />
                  <input
                    type="number"
                    placeholder="Приоритет"
                    value={bp.priority}
                    onChange={(e) => setBasePrices(basePrices.map(x => x.type === bp.type ? { ...x, priority: parseInt(e.target.value) || 0 } : x))}
                    className="w-20 px-2 py-1 rounded text-sm"
                    style={{ backgroundColor: 'var(--tg-theme-bg-color)', color: 'var(--tg-theme-text-color)', border: '1px solid var(--tg-theme-hint-color)' }}
                  />
                  <input
                    type="color"
                    value={bp.badge_color}
                    onChange={(e) => setBasePrices(basePrices.map(x => x.type === bp.type ? { ...x, badge_color: e.target.value } : x))}
                    className="w-10 h-10 rounded"
                    style={{ border: 'none', cursor: 'pointer' }}
                  />
                </div>
                <div className="flex flex-wrap gap-1">
                  {bp.features.map((f: string, i: number) => (
                    <input
                      key={i}
                      type="text"
                      value={f}
                      onChange={(e) => setBasePrices(basePrices.map(x => x.type === bp.type ? { ...x, features: x.features.map((ff: string, ii: number) => ii === i ? e.target.value : ff) } : x))}
                      className="flex-1 min-w-[150px] px-2 py-1 rounded text-xs"
                      style={{ backgroundColor: 'var(--tg-theme-bg-color)', color: 'var(--tg-theme-text-color)', border: '1px solid var(--tg-theme-hint-color)' }}
                    />
                  ))}
                </div>
                <button
                  onClick={() => updateBasePrice(bp)}
                  disabled={saving === bp.type}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium self-end"
                  style={{
                    backgroundColor: bp.badge_color,
                    color: '#fff',
                    opacity: saving === bp.type ? 0.6 : 1,
                  }}
                >
                  {saving === bp.type ? '⏳ Сохранение...' : '💾 Сохранить'}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Pricing Preview */}
        <div className="p-3 rounded-xl" style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color)' }}>
          <h3 className="text-tg-text font-bold mb-3">🔮 Предпросмотр цен</h3>
          <div className="flex gap-2 mb-3">
            <input
              type="number"
              placeholder="Цена недвижимости (BYN)"
              value={previewPrice}
              onChange={(e) => setPreviewPrice(e.target.value)}
              className="flex-1 px-3 py-2 rounded-xl text-sm"
              style={{
                backgroundColor: 'var(--tg-theme-bg-color)',
                color: 'var(--tg-theme-text-color)',
                border: '1px solid var(--tg-theme-hint-color)',
                outline: 'none',
              }}
            />
            <button
              onClick={previewPricing}
              className="px-4 py-2 rounded-xl text-sm font-medium"
              style={{
                backgroundColor: 'var(--tg-theme-button-color)',
                color: 'var(--tg-theme-button-text-color)',
              }}
            >
              Рассчитать
            </button>
          </div>

          {preview.length > 0 && (
            <div className="space-y-2">
              {preview.map((p) => (
                <div
                  key={p.promotion_type}
                  className="flex items-center justify-between p-2 rounded-lg"
                  style={{ backgroundColor: 'var(--tg-theme-bg-color)', borderLeft: `4px solid ${p.bracket_label ? '#007aff' : 'transparent'}` }}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm" style={{ color: 'var(--tg-theme-text-color)' }}>
                      {p.label}
                    </span>
                    <span className="text-tg-hint text-xs">
                      Брекет: {p.bracket_label} (×{p.bracket_multiplier})
                    </span>
                  </div>
                  <div className="text-tg-text font-bold">
                    {p.calculated_price_byn} <BynSymbol />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  // ── Access check ──────────────────────────────────────────
  if (!user || (user.role !== 'admin' && user.role !== 'moderator')) {
    return null;
  }

  // ── Dashboard Tab ─────────────────────────────────────────
  const renderDashboard = () => {
    if (!dashboard) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="text-tg-hint text-sm">Загрузка...</div>
        </div>
      );
    }

    const stats = [
      { label: 'Пользователей', value: dashboard.total_users, icon: '👥', accent: '#007aff' },
      { label: 'Объявлений', value: dashboard.total_properties, icon: '🏠', accent: '#34c759' },
      { label: 'Опубликовано', value: dashboard.published_properties, icon: '✅', accent: '#34c759' },
      { label: 'На модерации', value: dashboard.pending_properties, icon: '⏳', accent: '#ff9500' },
      { label: 'Заблокировано', value: dashboard.blocked_properties, icon: '🚫', accent: '#ff3b30' },
      { label: 'Просмотров', value: dashboard.total_views, icon: '👁️', accent: '#5856d6' },
      { label: 'Избранное', value: dashboard.total_favorites, icon: '❤️', accent: '#ff2d55' },
      { label: 'Жалоб', value: dashboard.open_reports, icon: '⚠️', accent: '#ff3b30' },
    ];

    return (
      <div className="space-y-4">
        {/* Today's metrics */}
        <div className="flex gap-3">
          <div
            className="flex-1 p-3 rounded-xl text-center"
            style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color)' }}
          >
            <div className="text-2xl font-bold" style={{ color: '#34c759' }}>
              +{dashboard.properties_today}
            </div>
            <div className="text-xs mt-1" style={{ color: '#94a3b8' }}>
              Объявлений сегодня
            </div>
          </div>
          <div
            className="flex-1 p-3 rounded-xl text-center"
            style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color)' }}
          >
            <div className="text-2xl font-bold" style={{ color: '#007aff' }}>
              +{dashboard.users_today}
            </div>
            <div className="text-xs mt-1" style={{ color: '#94a3b8' }}>
              Пользователей сегодня
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="p-3 rounded-xl"
              style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color)' }}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{stat.icon}</span>
                <span className="text-xs" style={{ color: '#94a3b8' }}>
                  {stat.label}
                </span>
              </div>
              <div className="text-xl font-bold" style={{ color: stat.accent }}>
                {formatNumber(stat.value)}
              </div>
            </div>
          ))}
        </div>

        {/* Quick actions */}
        <div className="space-y-2">
          <button
            className="w-full p-3 rounded-xl text-left flex items-center gap-3"
            style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color)' }}
            onClick={() => { trigger('light'); SetPropertyStatusFilter('pending_moderation'); setActiveTab('properties'); }}
          >
            <span className="text-xl">⏳</span>
            <span className="flex-1" style={{ color: 'var(--tg-theme-text-color)' }}>
              Модерация объявлений
            </span>
            {dashboard.pending_properties > 0 && (
              <span
                className="px-2 py-0.5 rounded-full text-xs font-bold"
                style={{ backgroundColor: '#ff9500', color: '#fff' }}
              >
                {dashboard.pending_properties}
              </span>
            )}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ color: '#94a3b8' }}>
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
          <button
            className="w-full p-3 rounded-xl text-left flex items-center gap-3"
            style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color)' }}
            onClick={() => { trigger('light'); setReportStatusFilter(''); setActiveTab('reports'); }}
          >
            <span className="text-xl">⚠️</span>
            <span className="flex-1" style={{ color: 'var(--tg-theme-text-color)' }}>
              Жалобы пользователей
            </span>
            {dashboard.open_reports > 0 && (
              <span
                className="px-2 py-0.5 rounded-full text-xs font-bold"
                style={{ backgroundColor: '#ff3b30', color: '#fff' }}
              >
                {dashboard.open_reports}
              </span>
            )}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ color: '#94a3b8' }}>
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      </div>
    );
  };

  // ── Users Tab ─────────────────────────────────────────────
  const renderUsers = () => (
    <div className="space-y-3">
      {/* Search + Filter */}
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Поиск по имени, username, tg_id..."
          value={userSearch}
          onChange={(e) => setUserSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              fetchUsers({ search: userSearch || undefined, role: userRoleFilter || undefined });
            }
          }}
          className="flex-1 px-3 py-2 rounded-xl text-sm"
          style={{
            backgroundColor: 'var(--tg-theme-secondary-bg-color)',
            color: 'var(--tg-theme-text-color)',
            border: '1px solid var(--tg-theme-hint-color)',
            outline: 'none',
          }}
        />
        <button
          onClick={() => {
            trigger('light');
            fetchUsers({ search: userSearch || undefined, role: userRoleFilter || undefined });
          }}
          className="px-3 py-2 rounded-xl text-sm font-medium"
          style={{
            backgroundColor: 'var(--tg-theme-button-color)',
            color: 'var(--tg-theme-button-text-color)',
          }}
        >
          🔍
        </button>
      </div>

      {/* Role filter chips */}
      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        {(['', 'admin', 'moderator', 'agent', 'agency_admin', 'owner'] as const).map((role) => (
          <button
            key={role}
            onClick={() => {
              trigger('selection');
              setUserRoleFilter(role);
              fetchUsers({ search: userSearch || undefined, role: role || undefined });
            }}
            className="px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap flex-shrink-0"
            style={{
              backgroundColor: userRoleFilter === role
                ? 'var(--tg-theme-button-color)'
                : 'var(--tg-theme-secondary-bg-color)',
              color: userRoleFilter === role
                ? 'var(--tg-theme-button-text-color)'
                : 'var(--tg-theme-text-color)',
            }}
          >
            {role ? ROLE_LABELS[role as UserRole] : 'Все'}
          </button>
        ))}
      </div>

      {/* Users list */}
      {usersLoading ? (
        <div className="text-center py-8 text-tg-hint text-sm">Загрузка...</div>
      ) : users.length === 0 ? (
        <div className="text-center py-8 text-tg-hint text-sm">Пользователи не найдены</div>
      ) : (
        <div className="space-y-2">
          {users.map((u) => (
            <div
              key={u.id}
              className="p-3 rounded-xl"
              style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color)' }}
            >
              <div className="flex items-center gap-3">
                {/* Avatar */}
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                  style={{
                    backgroundColor: u.is_blocked ? '#ff3b3020' : 'var(--tg-theme-button-color)',
                    color: u.is_blocked ? '#ff3b30' : 'var(--tg-theme-button-text-color)',
                  }}
                >
                  {u.first_name?.[0] || '?'}
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate" style={{ color: 'var(--tg-theme-text-color)' }}>
                      {u.first_name} {u.last_name || ''}
                    </span>
                    {u.is_blocked && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ backgroundColor: '#ff3b3020', color: '#ff3b30' }}>
                        ЗАБЛОКИРОВАН
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {u.username && (
                      <span className="text-xs" style={{ color: '#94a3b8' }}>@{u.username}</span>
                    )}
                    <span className="text-xs" style={{ color: '#94a3b8' }}>ID: {u.tg_id}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                      style={{
                        backgroundColor: (u.role === 'admin' || u.role === 'moderator') ? 'rgba(255,149,0,0.15)' : 'rgba(0,122,255,0.15)',
                        color: (u.role === 'admin' || u.role === 'moderator') ? '#ff9500' : '#007aff',
                      }}
                    >
                      {ROLE_LABELS[u.role]}
                    </span>
                    <span className="text-[10px]" style={{ color: '#94a3b8' }}>
                      {u.properties_count} обявл.
                    </span>
                  </div>
                </div>
                {/* Actions */}
                <div className="flex flex-col gap-1">
                  <select
                    value={u.role}
                    onChange={(e) => {
                      hapticFeedback.impactOccurred('medium');
                      updateUserRole(u.id, e.target.value as UserRole);
                    }}
                    className="px-2 py-1 rounded-lg text-[10px] font-medium"
                    style={{
                      backgroundColor: 'var(--tg-theme-bg-color)',
                      color: 'var(--tg-theme-text-color)',
                      border: '1px solid var(--tg-theme-hint-color)',
                    }}
                  >
                    <option value="owner">Владелец</option>
                    <option value="agent">Агент</option>
                    <option value="agency_admin">Админ агентства</option>
                    <option value="moderator">Модератор</option>
                    <option value="admin">Админ</option>
                  </select>
                  <button
                    onClick={() => {
                      hapticFeedback.impactOccurred('heavy');
                      blockUser(u.id, !u.is_blocked);
                    }}
                    className="px-2 py-1 rounded-lg text-[10px] font-medium"
                    style={{
                      backgroundColor: u.is_blocked ? 'rgba(52,199,89,0.15)' : 'rgba(255,59,48,0.15)',
                      color: u.is_blocked ? '#34c759' : '#ff3b30',
                    }}
                  >
                    {u.is_blocked ? 'Разбан' : 'Бан'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ── Properties Tab ────────────────────────────────────────
  const renderProperties = () => (
    <div className="space-y-3">
      {/* Search + Filter */}
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Поиск по адресу, названию..."
          value={propertySearch}
          onChange={(e) => setPropertySearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              fetchProperties({ status: propertyStatusFilter || undefined, search: propertySearch || undefined });
            }
          }}
          className="flex-1 px-3 py-2 rounded-xl text-sm"
          style={{
            backgroundColor: 'var(--tg-theme-secondary-bg-color)',
            color: 'var(--tg-theme-text-color)',
            border: '1px solid var(--tg-theme-hint-color)',
            outline: 'none',
          }}
        />
        <button
          onClick={() => {
            trigger('light');
            fetchProperties({ status: propertyStatusFilter || undefined, search: propertySearch || undefined });
          }}
          className="px-3 py-2 rounded-xl text-sm font-medium"
          style={{
            backgroundColor: 'var(--tg-theme-button-color)',
            color: 'var(--tg-theme-button-text-color)',
          }}
        >
          🔍
        </button>
      </div>

      {/* Status filter chips */}
      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        {(['', 'pending_moderation', 'published', 'rejected', 'blocked', 'draft', 'archived'] as const).map((status) => (
          <button
            key={status}
            onClick={() => {
              trigger('selection');
              SetPropertyStatusFilter(status);
              fetchProperties({ status: status || undefined, search: propertySearch || undefined });
            }}
            className="px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap flex-shrink-0"
            style={{
              backgroundColor: propertyStatusFilter === status
                ? (status ? STATUS_COLORS[status].bg : 'var(--tg-theme-button-color)')
                : 'var(--tg-theme-secondary-bg-color)',
              color: propertyStatusFilter === status
                ? (status ? STATUS_COLORS[status].text : 'var(--tg-theme-button-text-color)')
                : 'var(--tg-theme-text-color)',
            }}
          >
            {status ? STATUS_LABELS[status] : 'Все'}
          </button>
        ))}
      </div>

      {/* Properties list */}
      {propertiesLoading ? (
        <div className="text-center py-8 text-tg-hint text-sm">Загрузка...</div>
      ) : properties.length === 0 ? (
        <div className="text-center py-8 text-tg-hint text-sm">Объявления не найдены</div>
      ) : (
        <div className="space-y-2">
          {properties.map((p) => {
            const statusColor = STATUS_COLORS[p.status] || STATUS_COLORS.draft;
            return (
              <div
                key={p.id}
                className="p-3 rounded-xl"
                style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color)' }}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm truncate" style={{ color: 'var(--tg-theme-text-color)' }}>
                        {p.title || `Объявление #${p.id}`}
                      </span>
                      <span
                        className="px-1.5 py-0.5 rounded text-[10px] font-medium flex-shrink-0"
                        style={{ backgroundColor: statusColor.bg, color: statusColor.text }}
                      >
                        {STATUS_LABELS[p.status]}
                      </span>
                    </div>
                    <div className="text-xs" style={{ color: '#94a3b8' }}>
                      {p.type_name} · {p.operation_name} · {p.city_name || '—'}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      {p.price_byn != null && (
                        <span className="text-xs font-medium" style={{ color: '#34c759' }}>
                          {formatNumber(p.price_byn)} <BynSymbol />
                        </span>
                      )}
                      <span className="text-[10px]" style={{ color: '#94a3b8' }}>
                        👁 {p.views_count}
                      </span>
                      <span className="text-[10px]" style={{ color: '#94a3b8' }}>
                        {formatDate(p.created_at)}
                      </span>
                    </div>
                  </div>
                  {/* Actions */}
                  <div className="flex flex-col gap-1 flex-shrink-0">
                    {p.status === 'pending_moderation' && (
                      <>
                        <button
                          onClick={() => {
                            hapticFeedback.notificationOccurred('success');
                            updatePropertyStatus(p.id, 'published');
                          }}
                          className="px-2 py-1 rounded-lg text-[10px] font-bold"
                          style={{ backgroundColor: 'rgba(52,199,89,0.2)', color: '#34c759' }}
                        >
                          ✅ Одобрить
                        </button>
                        <button
                          onClick={() => {
                            hapticFeedback.notificationOccurred('error');
                            updatePropertyStatus(p.id, 'rejected');
                          }}
                          className="px-2 py-1 rounded-lg text-[10px] font-bold"
                          style={{ backgroundColor: 'rgba(255,59,48,0.15)', color: '#ff3b30' }}
                        >
                          ❌ Отклонить
                        </button>
                      </>
                    )}
                    {p.status === 'published' && (
                      <>
                        <button
                          onClick={() => {
                            hapticFeedback.impactOccurred('light');
                            postListingToChannel(p.id)
                              .then(() => {
                                trigger('success');
                                showToast(`Объявление #${p.id} опубликовано в канале`, 'success');
                              })
                              .catch((err) => {
                                trigger('error');
                                showToast(
                                  err instanceof Error && err.message ? err.message : 'Не удалось опубликовать в канал',
                                  'error'
                                );
                              });
                          }}
                          className="px-2 py-1 rounded-lg text-[10px] font-bold"
                          style={{ backgroundColor: 'rgba(0,122,255,0.15)', color: '#007aff' }}
                        >
                          📢 В канал
                        </button>
                        <button
                          onClick={() => {
                            hapticFeedback.impactOccurred('heavy');
                            updatePropertyStatus(p.id, 'blocked');
                          }}
                          className="px-2 py-1 rounded-lg text-[10px] font-bold"
                          style={{ backgroundColor: 'rgba(255,59,48,0.15)', color: '#ff3b30' }}
                        >
                          🚫 Заблокировать
                        </button>
                      </>
                    )}
                    {(p.status === 'rejected' || p.status === 'blocked') && (
                      <button
                        onClick={() => {
                          hapticFeedback.notificationOccurred('success');
                          updatePropertyStatus(p.id, 'published');
                        }}
                        className="px-2 py-1 rounded-lg text-[10px] font-bold"
                        style={{ backgroundColor: 'rgba(52,199,89,0.2)', color: '#34c759' }}
                      >
                        ✅ Восстановить
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  // ── Reports Tab ───────────────────────────────────────────
  const renderReports = () => (
    <div className="space-y-3">
      {/* Status filter */}
      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        {(['', 'pending', 'open', 'resolved'] as const).map((status) => (
          <button
            key={status}
            onClick={() => {
              trigger('selection');
              setReportStatusFilter(status);
              fetchReports({ status: status || undefined });
            }}
            className="px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap flex-shrink-0"
            style={{
              backgroundColor: reportStatusFilter === status
                ? 'var(--tg-theme-button-color)'
                : 'var(--tg-theme-secondary-bg-color)',
              color: reportStatusFilter === status
                ? 'var(--tg-theme-button-text-color)'
                : 'var(--tg-theme-text-color)',
            }}
          >
            {status === '' ? 'Открытые' : status === 'pending' ? 'Ожидают' : status === 'open' ? 'Открытые' : 'Решённые'}
          </button>
        ))}
      </div>

      {/* Reports list */}
      {reportsLoading ? (
        <div className="text-center py-8 text-tg-hint text-sm">Загрузка...</div>
      ) : reports.length === 0 ? (
        <div className="text-center py-8 text-tg-hint text-sm">Жалоб нет 🎉</div>
      ) : (
        <div className="space-y-2">
          {reports.map((r) => (
            <div
              key={r.id}
              className="p-3 rounded-xl"
              style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color)' }}
            >
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                      style={{
                        backgroundColor: r.status === 'resolved' ? 'rgba(52,199,89,0.15)' : 'rgba(255,149,0,0.15)',
                        color: r.status === 'resolved' ? '#34c759' : '#ff9500',
                      }}
                    >
                      {r.status === 'resolved' ? '✅ Решено' : '⏳ ' + r.status}
                    </span>
                    <span className="text-[10px]" style={{ color: '#94a3b8' }}>
                      #{r.id}
                    </span>
                  </div>
                  <div className="text-sm font-medium" style={{ color: 'var(--tg-theme-text-color)' }}>
                    {r.reason}
                  </div>
                  {r.description && (
                    <div className="text-xs mt-1" style={{ color: '#94a3b8' }}>
                      {r.description}
                    </div>
                  )}
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[10px]" style={{ color: '#94a3b8' }}>
                      Объявление #{r.property_id}
                    </span>
                    <span className="text-[10px]" style={{ color: '#94a3b8' }}>
                      Автор: #{r.reporter_id}
                    </span>
                    <span className="text-[10px]" style={{ color: '#94a3b8' }}>
                      {formatDate(r.created_at)}
                    </span>
                  </div>
                </div>
                {r.status !== 'resolved' && (
                  <button
                    onClick={() => {
                      hapticFeedback.notificationOccurred('success');
                      resolveReport(r.id);
                    }}
                    className="px-3 py-1.5 rounded-lg text-[10px] font-bold flex-shrink-0"
                    style={{ backgroundColor: 'rgba(52,199,89,0.2)', color: '#34c759' }}
                  >
                    ✅ Решить
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ── Tabs ──────────────────────────────────────────────────
  // Вкладка «Продвижения» скрыта, пока монетизация выключена: цены брекетов и
  // базовые цены задаются вручную, а платные услуги пока не принимаются.
  const tabs: { key: AdminTab; label: string; icon: string; badge?: number }[] = [
    { key: 'dashboard', label: 'Обзор', icon: '📊' },
    { key: 'users', label: 'Люди', icon: '👥' },
    { key: 'properties', label: 'Объявления', icon: '🏠', badge: dashboard?.pending_properties },
    { key: 'reports', label: 'Жалобы', icon: '⚠️', badge: dashboard?.open_reports },
    ...(MONETIZATION_ENABLED
      ? [{ key: 'promotions' as AdminTab, label: 'Продвижения', icon: '⭐' }]
      : []),
  ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--tg-theme-bg-color)' }}>
      {/* Header */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={() => { trigger('light'); navigate('/profile'); }}
            className="p-2 rounded-xl"
            style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color)' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--tg-theme-text-color)' }}>
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <div>
            <h1 className="text-lg font-bold" style={{ color: 'var(--tg-theme-text-color)' }}>
              👑 Админ-панель
            </h1>
            <p className="text-xs" style={{ color: '#94a3b8' }}>
              Управление платформой
            </p>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 p-1 rounded-xl" style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color)' }}>
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all relative"
              style={{
                backgroundColor: activeTab === tab.key ? 'var(--tg-theme-bg-color)' : 'transparent',
                color: activeTab === tab.key ? 'var(--tg-theme-text-color)' : 'var(--tg-theme-hint-color)',
                boxShadow: activeTab === tab.key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              <span>{tab.icon}</span>
              <span className="hidden sm:inline">{tab.label}</span>
              {tab.badge != null && tab.badge > 0 && (
                <span
                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center"
                  style={{ backgroundColor: '#ff3b30', color: '#fff' }}
                >
                  {tab.badge > 99 ? '99+' : tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pb-20">
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'users' && renderUsers()}
        {activeTab === 'properties' && renderProperties()}
        {activeTab === 'reports' && renderReports()}
        {MONETIZATION_ENABLED && activeTab === 'promotions' && renderPromotions()}
      </div>
    </div>
  );
}
