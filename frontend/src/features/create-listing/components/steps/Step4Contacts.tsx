import { useHaptics } from '@/shared/lib/haptics';
import { useCreateListingStore } from '../../createListingStore';

/**
 * Шаг 4 «Контакты» (Kufar-модель): имя контактного лица, телефон и
 * переключатель «показывать номер». Номер обязателен для связи (чат/звонок),
 * но пользователь может скрыть его в публичном объявлении.
 */
export function Step4Contacts() {
  const { trigger } = useHaptics();
  const { updateFormData, formData, clearError, errors } = useCreateListingStore();

  const showPhone = formData.show_phone !== false;

  return (
    <div className="p-4 space-y-6" style={{ backgroundColor: 'var(--bd-bg-base)' }}>
      {/* Имя контактного лица */}
      <section>
        <h2 style={{ color: 'var(--bd-text-primary)', fontSize: '20px', fontWeight: 700, marginBottom: '16px' }}>
          Имя <span style={{ color: 'var(--bd-text-secondary)', fontWeight: 400 }}>*</span>
        </h2>
        <input
          type="text"
          value={formData.contact_name || ''}
          onChange={(e) => {
            trigger('selection');
            updateFormData({ contact_name: e.target.value });
            clearError('contact_name');
          }}
          placeholder="Как к вам обращаться?"
          maxLength={50}
          className="w-full px-4 py-3 rounded-xl text-base outline-none"
          style={{
            backgroundColor: 'var(--bd-bg-base)',
            border: errors.contact_name ? '2px solid #ef4444' : '1px solid rgba(255,255,255,0.6)',
            color: 'var(--bd-text-primary)',
            boxShadow: 'inset 2px 2px 5px var(--bd-raise-dark), inset -2px -2px 5px var(--bd-raise-light)',
          }}
        />
        {errors.contact_name && (
          <p className="text-sm mt-1" style={{ color: '#ef4444' }}>{errors.contact_name}</p>
        )}
      </section>

      {/* Телефон */}
      <section>
        <h2 style={{ color: 'var(--bd-text-primary)', fontSize: '20px', fontWeight: 700, marginBottom: '16px' }}>
          Телефон <span style={{ color: 'var(--bd-text-secondary)', fontWeight: 400 }}>*</span>
        </h2>
        <input
          type="tel"
          value={formData.contact_phone || ''}
          onChange={(e) => {
            trigger('selection');
            updateFormData({ contact_phone: e.target.value });
            clearError('contact_phone');
          }}
          placeholder="+375 (29) 123-45-67"
          inputMode="tel"
          maxLength={20}
          className="w-full px-4 py-3 rounded-xl text-base outline-none"
          style={{
            backgroundColor: 'var(--bd-bg-base)',
            border: errors.contact_phone ? '2px solid #ef4444' : '1px solid rgba(255,255,255,0.6)',
            color: 'var(--bd-text-primary)',
            boxShadow: 'inset 2px 2px 5px var(--bd-raise-dark), inset -2px -2px 5px var(--bd-raise-light)',
          }}
        />
        {errors.contact_phone && (
          <p className="text-sm mt-1" style={{ color: '#ef4444' }}>{errors.contact_phone}</p>
        )}
        <p className="text-xs mt-1" style={{ color: 'var(--bd-text-secondary)' }}>
          Номер нужен для связи покупателей — он надёжно защищён и не публикуется без вашего согласия.
        </p>
      </section>

      {/* Показывать номер в объявлении */}
      <section
        className="rounded-2xl p-4"
        style={{
          backgroundColor: 'var(--bd-bg-base)',
          border: showPhone ? '1px solid rgba(255,255,255,0.6)' : '1px solid rgba(255,255,255,0.6)',
          boxShadow: showPhone ? 'var(--bd-shadow-raised)' : '6px 6px 12px var(--bd-raise-dark), -6px -6px 12px var(--bd-raise-light)',
        }}
      >
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="text-[16px] font-semibold" style={{ color: 'var(--bd-text-primary)' }}>
              Показывать номер в объявлении
            </div>
            <div className="text-[13px] mt-1 leading-snug" style={{ color: 'var(--bd-text-secondary)' }}>
              {showPhone
                ? 'Номер виден покупателям и сбоку от кнопки «Позвонить»'
                : 'Номер скрыт — связаться с вами можно через чат Telegram'}
            </div>
          </div>
          {/* Переключатель (switch) в Soft UI */}
          <button
            role="switch"
            aria-checked={showPhone}
            onClick={() => {
              trigger('selection');
              updateFormData({ show_phone: !showPhone });
            }}
            className="relative w-[52px] h-8 rounded-full transition-colors flex-shrink-0"
            style={{
              backgroundColor: showPhone ? 'var(--bd-accent-primary)' : 'var(--bd-bg-base)',
              boxShadow: showPhone
                ? 'var(--bd-shadow-raised)'
                : 'inset 2px 2px 4px var(--bd-raise-dark), inset -2px -2px 4px var(--bd-raise-light)',
            }}
          >
            <span
              className="absolute top-1 w-6 h-6 rounded-full shadow transition-all"
              style={{
                backgroundColor: '#ffffff',
                left: showPhone ? '24px' : '4px',
                boxShadow: '3px 3px 6px var(--bd-raise-dark), -3px -3px 6px var(--bd-raise-light)',
              }}
            />
          </button>
        </div>
      </section>

      {/* Подсказка */}
      <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--bd-bg-base)', border: '1px solid rgba(255,255,255,0.6)', boxShadow: 'inset 2px 2px 5px var(--bd-raise-dark), inset -2px -2px 5px var(--bd-raise-light)' }}>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--bd-text-secondary)' }}>
          Так мы связываем покупателя с продавцом. Телефон не проверяется модерацией
          и не отображается в поиске — только в карточке объявления.
        </p>
      </div>
    </div>
  );
}
