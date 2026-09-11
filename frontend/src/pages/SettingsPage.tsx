import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { EmptyState } from '@/shared/ui';
import { useAuthStore } from '@/features/auth';
import { useGeographyStore } from '@/features/geography/geographyStore';
import { useHaptics, hapticMedium } from '@/shared/lib/haptics';
import { useToast } from '@/shared/ui/Toast';
import { api, API_ENDPOINTS } from '@/shared/api';
import type { User, UserSettingsUpdate, UserRole } from '@/shared/api';
import { ExpandablePicker, type ExpandableOption } from '@/features/create-listing/components/ExpandablePicker';

const BIO_MAX = 2000; // совпадает с валидацией PATCH /auth/me (user_profiles.bio)

/** Компактный переключатель в светлой дизайн-системе (Kufar-тумблеры). */
function SettingsSwitch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="relative w-12 h-7 rounded-full transition-colors flex-shrink-0"
      style={{ backgroundColor: checked ? '#2171ee' : '#e2e8f0' }}
    >
      <span
        className="absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all"
        style={{ left: checked ? 'calc(100% - 24px)' : '4px' }}
      />
    </button>
  );
}

function getRoleLabel(role: UserRole): string {
  switch (role) {
    case 'admin': return '👑 Администратор';
    case 'moderator': return '🛡️ Модератор';
    case 'agency_admin': return '🏢 Админ агентства';
    case 'agent': return '🤝 Агент';
    default: return '👤 Владелец';
  }
}

export function SettingsPage() {
  const { user, updateUser, logout } = useAuthStore();
  const { trigger } = useHaptics();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const { cities, fetchAllCities } = useGeographyStore();
  const [openPicker, setOpenPicker] = useState(false);
  const [addingCity, setAddingCity] = useState(false);

  // Форма профиля синхронизируется при загрузке/обновлении пользователя.
  const [firstName, setFirstName] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setFirstName(user.first_name ?? '');
      setPhone(user.phone ?? '');
      setBio(user.bio ?? '');
    }
  }, [user?.id]);

  useEffect(() => {
    fetchAllCities();
  }, [fetchAllCities]);

  if (!user) {
    return (
      <div className="p-4 pb-20">
        <EmptyState
          title="Войдите в профиль"
          description="Авторизуйтесь через Telegram, чтобы редактировать настройки"
          action={{
            label: 'В профиль',
            onClick: () => navigate('/profile'),
          }}
        />
      </div>
    );
  }

  const initials = user.first_name
    ? `${user.first_name[0]}${user.last_name?.[0] || ''}`.toUpperCase()
    : user.username
      ? user.username[0].toUpperCase()
      : '?';

  // ── Профиль ────────────────────────────────────────────────

  const saveProfile = async () => {
    if (!!saving) return;
    setSaving(true);
    trigger('medium');
    try {
      const updated = await api.patch<User>(API_ENDPOINTS.auth.update, {
        first_name: firstName.trim(),
        phone: phone.trim(),
        bio: bio.trim(),
      });
      updateUser(updated);
      showToast('Профиль сохранён', 'success');
    } catch {
      trigger('error');
      showToast('Не удалось сохранить профиль', 'error');
    } finally {
      setSaving(false);
    }
  };

  // ── Приложение ─────────────────────────────────────────────

  const saveSettings = async (patch: UserSettingsUpdate) => {
    trigger('light');
    try {
      const updated = await api.patch<User>(API_ENDPOINTS.auth.updateSettings, patch);
      updateUser(updated);
    } catch {
      trigger('error');
      showToast('Не удалось сохранить настройки', 'error');
    }
  };

  const cityOptions: ExpandableOption<number>[] = cities.map((c) => ({
    value: c.id,
    title: c.name,
    subtitle: c.is_major ? 'областной центр' : undefined,
  }));
  const defaultCityId = user.settings?.default_city_id ?? null;

  const handleCitySelect = (value: number) => {
    setOpenPicker(false);
    saveSettings({ default_city_id: value });
  };

  const handleAddCity = async (query: string) => {
    if (!query) return;
    setAddingCity(true);
    trigger('selection');
    const city = await useGeographyStore.getState().addCity(query, null);
    setAddingCity(false);
    if (city) {
      trigger('success');
      setOpenPicker(false);
      saveSettings({ default_city_id: city.id });
    } else {
      trigger('error');
    }
  };

  const handleLogout = () => {
    hapticMedium();
    logout();
    navigate('/catalog');
  };

  const inputStyle = {
    width: '100%',
    backgroundColor: '#f7f9fc',
    border: '1px solid #e2e8f0',
    borderRadius: 12,
    padding: '10px 12px',
    fontSize: 15,
    color: '#0f172a',
    outline: 'none',
  } as const;

  return (
    <div className="p-4 space-y-6 pb-4">
      {/* Header профиля */}
      <div className="flex items-center gap-4">
        <div className="relative w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0">
          <div
            className="absolute inset-0 flex items-center justify-center text-xl font-bold"
            style={{ backgroundColor: '#2171ee', color: '#ffffff' }}
          >
            {initials}
          </div>
          {user.avatar_url && (
            <img
              src={user.avatar_url}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
              referrerPolicy="no-referrer"
              onError={(e) => e.currentTarget.remove()}
            />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-[17px] font-bold truncate" style={{ color: '#0f172a' }}>
            {user.first_name || ''} {user.last_name || ''}
          </h1>
          <p className="text-sm truncate" style={{ color: '#64748b' }}>
            {getRoleLabel(user.role as UserRole)}
          </p>
        </div>
      </div>

      {/* ─── Профиль ─────────────────────────────────────── */}
      <section>
        <h2 className="text-[15px] font-semibold mb-3" style={{ color: '#0f172a' }}>Профиль</h2>
        <div className="rounded-2xl overflow-hidden bg-white" style={{ border: '1px solid #e2e8f0' }}>
          <div className="px-4 pt-4 pb-1">
            <label className="text-xs block mb-1" style={{ color: '#64748b' }}>Имя</label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              style={inputStyle}
              maxLength={100}
              inputMode="text"
              autoComplete="given-name"
              placeholder="Имя"
            />
          </div>
          <div className="px-4 pt-3 pb-1">
            <label className="text-xs block mb-1" style={{ color: '#64748b' }}>Телефон для связи</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              style={inputStyle}
              maxLength={20}
              inputMode="tel"
              autoComplete="tel"
              placeholder="+375 (29) 123-45-67"
            />
          </div>
          <div className="px-4 pt-3 pb-4">
            <label className="text-xs block mb-1" style={{ color: '#64748b' }}>О себе</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              style={{ ...inputStyle, minHeight: 72, resize: 'vertical' }}
              maxLength={BIO_MAX}
              rows={3}
              placeholder="Коротко о себе — помогаю с покупкой, продажей и арендой"
            />
          </div>
        </div>
        <button
          type="button"
          onClick={saveProfile}
          disabled={!!saving}
          className="w-full mt-3 py-3 rounded-xl font-semibold text-white transition-opacity active:opacity-80 disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg,#4c91ff,#2171ee)' }}
        >
          {saving ? 'Сохраняем…' : 'Сохранить'}
        </button>
      </section>

      {/* ─── Приложение ──────────────────────────────────── */}
      <section>
        <h2 className="text-[15px] font-semibold mb-3" style={{ color: '#0f172a' }}>Приложение</h2>

        <div className="rounded-2xl bg-white overflow-hidden" style={{ border: '1px solid #e2e8f0' }}>
          {/* Регион по умолчанию */}
          <div className="p-3">
            <ExpandablePicker<number>
              label="Регион по умолчанию"
              placeholder="Не выбран — вся Беларусь"
              selected={defaultCityId}
              options={cityOptions}
              onSelect={handleCitySelect}
              open={openPicker}
              onToggle={() => {
                trigger('light');
                setOpenPicker((prev) => !prev);
              }}
              searchable
              searchPlaceholder="Название города или деревни"
              addOption={{
                label: 'Добавить',
                onAdd: handleAddCity,
                isAdding: addingCity,
              }}
            />
            {defaultCityId && (
              <button
                type="button"
                onClick={() => saveSettings({ default_city_id: null })}
                className="text-xs mt-2 px-0"
                style={{ color: '#2171ee' }}
              >
                Сбросить регион
              </button>
            )}
          </div>

          {/* Уведомления */}
          <div className="px-4 py-2" style={{ borderTop: '1px solid #f1f5f9' }}>
            <div className="py-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-[15px] font-medium" style={{ color: '#0f172a' }}>
                  Снижение цены в избранном
                </div>
                <div className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>
                  Уведомление при падении цены на объявление в избранном
                </div>
              </div>
              <SettingsSwitch
                checked={user.settings?.notify_price_drop ?? true}
                onChange={(v) => saveSettings({ notify_price_drop: v })}
              />
            </div>
            <div className="py-3 flex items-center gap-3" style={{ borderTop: '1px solid #f1f5f9' }}>
              <div className="flex-1 min-w-0">
                <div className="text-[15px] font-medium" style={{ color: '#0f172a' }}>
                  Новые по сохранённым поискам
                </div>
                <div className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>
                  Уведомление о новых объявлениях по вашим фильтрам
                </div>
              </div>
              <SettingsSwitch
                checked={user.settings?.notify_saved_searches ?? true}
                onChange={(v) => saveSettings({ notify_saved_searches: v })}
              />
            </div>
          </div>

          {/* Информация */}
          <div style={{ borderTop: '1px solid #f1f5f9' }}>
            {[
              { label: 'Тема оформления', value: 'Светлая' },
              { label: 'Язык интерфейса', value: 'Русский' },
              { label: 'Версия приложения', value: 'v0.1.0' },
            ].map((row, i) => (
              <div
                key={row.label}
                className="px-4 py-3 flex items-center justify-between"
                style={i === 0 ? undefined : { borderTop: '1px solid #f1f5f9' }}
              >
                <span className="text-[15px]" style={{ color: '#0f172a' }}>{row.label}</span>
                <span className="text-sm" style={{ color: '#94a3b8' }}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Выход ───────────────────────────────────────── */}
      <section>
        <button
          type="button"
          onClick={handleLogout}
          className="w-full py-3 rounded-xl font-semibold transition-opacity active:opacity-80"
          style={{ backgroundColor: '#fff', border: '1px solid #ff3b30', color: '#ff3b30' }}
        >
          Выйти из аккаунта
        </button>
      </section>

      <div className="pt-4 text-center text-sm" style={{ color: '#94a3b8' }}>
        BELDOMiK 🇧🇾 — настройки по стандарту Kufar
      </div>
    </div>
  );
}