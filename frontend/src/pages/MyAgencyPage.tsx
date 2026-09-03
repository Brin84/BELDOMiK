import { useEffect, useState } from 'react';
import { useHaptics } from '@/shared/lib/haptics';
import { useNavigate } from 'react-router-dom';
import { useAgenciesStore } from '@/features/agencies';
import { useAuthStore } from '@/features/auth';
import { useToast } from '@/shared/ui/Toast';
import { EmptyState, InlineError } from '@/shared/ui';
import type { AgencyCreate } from '@/shared/api/types';

export function MyAgencyPage() {
  const { trigger } = useHaptics();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { user, status } = useAuthStore();
  const {
    myAgency,
    myMembers,
    isLoadingMy,
    error,
    fetchMyAgency,
    createAgency,
    updateAgency,
    addMember,
    removeMember,
    clearError,
  } = useAgenciesStore();

  const isAuthenticated = status === 'authenticated' && user;

  // Create form state
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<AgencyCreate>({ name: '' });

  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<AgencyCreate>({ name: '' });

  // Add member state
  const [showAddMember, setShowAddMember] = useState(false);
  const [memberUserId, setMemberUserId] = useState('');
  const [memberRole, setMemberRole] = useState('agent');

  useEffect(() => {
    if (isAuthenticated) fetchMyAgency();
  }, [isAuthenticated, fetchMyAgency]);

  const isAdmin = myAgency ? myMembers.some((m) => m.user_id === user?.id && m.role === 'admin') : false;

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    trigger('light');
    try {
      await createAgency(form);
      showToast('Агентство создано!', 'success');
      setShowCreate(false);
      setForm({ name: '' });
    } catch (e) {
      showToast((e as Error).message || 'Ошибка создания', 'error');
    }
  };

  const handleUpdate = async () => {
    if (!myAgency) return;
    trigger('light');
    try {
      await updateAgency(myAgency.id, editForm);
      showToast('Сохранено', 'success');
      setIsEditing(false);
    } catch (e) {
      showToast((e as Error).message || 'Ошибка сохранения', 'error');
    }
  };

  const handleAddMember = async () => {
    const uid = Number(memberUserId);
    if (!myAgency || !uid) return;
    trigger('light');
    try {
      await addMember(myAgency.id, uid, memberRole);
      showToast('Участник добавлен', 'success');
      setShowAddMember(false);
      setMemberUserId('');
      setMemberRole('agent');
    } catch (e) {
      showToast((e as Error).message || 'Ошибка добавления', 'error');
    }
  };

  const handleRemoveMember = async (uid: number) => {
    if (!myAgency) return;
    const confirmed = window.confirm('Удалить участника из агентства?');
    if (!confirmed) return;
    trigger('medium');
    try {
      await removeMember(myAgency.id, uid);
      showToast('Участник удалён', 'success');
    } catch (e) {
      showToast((e as Error).message || 'Ошибка удаления', 'error');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="p-4 pb-24">
        <EmptyState
          icon={<span className="text-5xl">🏢</span>}
          title="Войдите в профиль"
          description="Авторизуйтесь через Telegram, чтобы управлять агентством"
        />
      </div>
    );
  }

  if (isLoadingMy && !myAgency) {
    return (
      <div className="p-4 space-y-3 pb-24">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-4 rounded-2xl animate-pulse" style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color)' }}>
            <div className="h-4 w-1/2 rounded" style={{ backgroundColor: 'var(--tg-theme-hint-color)', opacity: 0.2 }} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 pb-24">
      <div className="flex items-center justify-between">
        <h1 className="text-tg-text text-xl font-bold">🏢 Моё агентство</h1>
        <button
          onClick={() => { trigger('light'); navigate('/subscription'); }}
          className="px-3 py-1.5 rounded-lg text-xs font-medium"
          style={{ backgroundColor: 'rgba(175, 82, 222, 0.12)', color: '#af52de', border: '1px solid rgba(175, 82, 222, 0.35)' }}
        >
          💎 Подписка
        </button>
      </div>

      {error && <InlineError message={error} onDismiss={clearError} />}

      {!myAgency ? (
        showCreate ? (
          <div className="p-4 rounded-2xl space-y-3" style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color)' }}>
            <h2 className="text-tg-text font-bold">Создать агентство</h2>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Название агентства *"
              className="w-full p-3 rounded-xl text-tg-text"
              style={{ backgroundColor: 'var(--tg-theme-bg-color)', border: '0.5px solid var(--tg-theme-hint-color)' }}
            />
            <input
              value={form.description ?? ''}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Описание"
              className="w-full p-3 rounded-xl text-tg-text"
              style={{ backgroundColor: 'var(--tg-theme-bg-color)', border: '0.5px solid var(--tg-theme-hint-color)' }}
            />
            <input
              value={form.contact_phone ?? ''}
              onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
              placeholder="Контактный телефон"
              className="w-full p-3 rounded-xl text-tg-text"
              style={{ backgroundColor: 'var(--tg-theme-bg-color)', border: '0.5px solid var(--tg-theme-hint-color)' }}
            />
            <input
              value={form.website ?? ''}
              onChange={(e) => setForm({ ...form, website: e.target.value })}
              placeholder="Сайт"
              className="w-full p-3 rounded-xl text-tg-text"
              style={{ backgroundColor: 'var(--tg-theme-bg-color)', border: '0.5px solid var(--tg-theme-hint-color)' }}
            />
            <div className="flex gap-2">
              <button
                onClick={handleCreate}
                className="flex-1 py-3 rounded-xl font-medium"
                style={{ backgroundColor: 'var(--tg-theme-button-color)', color: 'var(--tg-theme-button-text-color)' }}
              >
                Создать
              </button>
              <button
                onClick={() => setShowCreate(false)}
                className="px-4 py-3 rounded-xl font-medium text-tg-hint"
              >
                Отмена
              </button>
            </div>
          </div>
        ) : (
          <EmptyState
            icon={<span className="text-5xl">🏢</span>}
            title="Вы не состоите в агентстве"
            description="Создайте собственное агентство или присоединитесь к существующему"
            action={{ label: 'Создать агентство', onClick: () => { trigger('light'); setShowCreate(true); } }}
          />
        )
      ) : (
        <>
          {/* Agency info */}
          <div className="p-4 rounded-2xl" style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color)', border: '0.5px solid var(--tg-theme-hint-color)' }}>
            <div className="flex items-center gap-3">
              {myAgency.logo_url ? (
                <img src={myAgency.logo_url} alt="" className="w-14 h-14 rounded-2xl object-cover" />
              ) : (
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ backgroundColor: 'var(--tg-theme-tertiary-bg-color)' }}>
                  <span className="text-2xl">🏢</span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h2 className="text-tg-text font-bold truncate">{myAgency.name}</h2>
                <p className="text-tg-hint text-sm">{myAgency.property_count} объявлений · {myMembers.length} участников</p>
              </div>
              {isAdmin && (
                <button
                  onClick={() => { trigger('light'); setEditForm({ name: myAgency.name, description: myAgency.description, contact_phone: myAgency.contact_phone, website: myAgency.website }); setIsEditing(true); }}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium"
                  style={{ backgroundColor: 'var(--tg-theme-button-color)', color: 'var(--tg-theme-button-text-color)' }}
                >
                  Редактировать
                </button>
              )}
            </div>
            {myAgency.description && <p className="text-tg-text text-sm mt-3">{myAgency.description}</p>}
          </div>

          {/* Edit form */}
          {isEditing && (
            <div className="p-4 rounded-2xl space-y-3" style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color)' }}>
              <h3 className="text-tg-text font-bold">Редактировать</h3>
              <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} placeholder="Название" className="w-full p-3 rounded-xl text-tg-text" style={{ backgroundColor: 'var(--tg-theme-bg-color)', border: '0.5px solid var(--tg-theme-hint-color)' }} />
              <input value={editForm.description ?? ''} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} placeholder="Описание" className="w-full p-3 rounded-xl text-tg-text" style={{ backgroundColor: 'var(--tg-theme-bg-color)', border: '0.5px solid var(--tg-theme-hint-color)' }} />
              <input value={editForm.contact_phone ?? ''} onChange={(e) => setEditForm({ ...editForm, contact_phone: e.target.value })} placeholder="Телефон" className="w-full p-3 rounded-xl text-tg-text" style={{ backgroundColor: 'var(--tg-theme-bg-color)', border: '0.5px solid var(--tg-theme-hint-color)' }} />
              <input value={editForm.website ?? ''} onChange={(e) => setEditForm({ ...editForm, website: e.target.value })} placeholder="Сайт" className="w-full p-3 rounded-xl text-tg-text" style={{ backgroundColor: 'var(--tg-theme-bg-color)', border: '0.5px solid var(--tg-theme-hint-color)' }} />
              <div className="flex gap-2">
                <button onClick={handleUpdate} className="flex-1 py-3 rounded-xl font-medium" style={{ backgroundColor: 'var(--tg-theme-button-color)', color: 'var(--tg-theme-button-text-color)' }}>Сохранить</button>
                <button onClick={() => setIsEditing(false)} className="px-4 py-3 rounded-xl font-medium text-tg-hint">Отмена</button>
              </div>
            </div>
          )}

          {/* Members */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-tg-text font-bold">Участники</h3>
              {isAdmin && (
                <button
                  onClick={() => { trigger('light'); setShowAddMember(true); }}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium"
                  style={{ backgroundColor: 'rgba(0, 122, 255, 0.12)', color: '#007aff', border: '1px solid rgba(0, 122, 255, 0.35)' }}
                >
                  + Добавить
                </button>
              )}
            </div>

            {showAddMember && (
              <div className="p-4 rounded-2xl space-y-3 mb-3" style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color)' }}>
                <h4 className="text-tg-text font-medium text-sm">Добавить участника</h4>
                <input
                  value={memberUserId}
                  onChange={(e) => setMemberUserId(e.target.value)}
                  placeholder="ID пользователя (Telegram)"
                  type="number"
                  className="w-full p-3 rounded-xl text-tg-text"
                  style={{ backgroundColor: 'var(--tg-theme-bg-color)', border: '0.5px solid var(--tg-theme-hint-color)' }}
                />
                <select
                  value={memberRole}
                  onChange={(e) => setMemberRole(e.target.value)}
                  className="w-full p-3 rounded-xl text-tg-text"
                  style={{ backgroundColor: 'var(--tg-theme-bg-color)', border: '0.5px solid var(--tg-theme-hint-color)' }}
                >
                  <option value="agent">Агент</option>
                  <option value="manager">Менеджер</option>
                  <option value="admin">Администратор</option>
                </select>
                <div className="flex gap-2">
                  <button onClick={handleAddMember} className="flex-1 py-3 rounded-xl font-medium" style={{ backgroundColor: 'var(--tg-theme-button-color)', color: 'var(--tg-theme-button-text-color)' }}>Добавить</button>
                  <button onClick={() => setShowAddMember(false)} className="px-4 py-3 rounded-xl font-medium text-tg-hint">Отмена</button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {myMembers.map((m) => {
                const isMe = m.user_id === user?.id;
                const roleLabel = m.role === 'admin' ? 'Админ' : m.role === 'manager' ? 'Менеджер' : 'Агент';
                return (
                  <div key={m.user_id} className="p-3 rounded-xl flex items-center gap-3" style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color)', border: '0.5px solid var(--tg-theme-hint-color)' }}>
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium" style={{ backgroundColor: 'var(--tg-theme-tertiary-bg-color)', color: 'var(--tg-theme-hint-color)' }}>
                      {m.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-tg-text font-medium truncate">{m.name}{isMe ? ' (вы)' : ''}</p>
                      <p className="text-tg-hint text-xs">{roleLabel}</p>
                    </div>
                    {isAdmin && m.user_id !== user?.id && (
                      <button
                        onClick={() => handleRemoveMember(m.user_id)}
                        className="px-2 py-1 rounded-lg text-xs"
                        style={{ color: '#ff3b30', backgroundColor: 'rgba(255, 59, 48, 0.1)' }}
                      >
                        Удалить
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
