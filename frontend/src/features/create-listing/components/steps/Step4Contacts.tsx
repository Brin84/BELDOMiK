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
    <div className="p-4 space-y-6">
      {/* Имя контактного лица */}
      <section>
        <h2 style={{ color: '#0f172a', fontSize: '20px', fontWeight: 700, marginBottom: '16px' }}>
          Имя <span style={{ color: '#94a3b8', fontWeight: 400 }}>*</span>
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
            backgroundColor: '#f1f5f9',
            border: errors.contact_name ? '2px solid #ef4444' : '1px solid #e2e8f0',
            color: '#0f172a',
          }}
        />
        {errors.contact_name && (
          <p className="text-sm mt-1" style={{ color: '#ef4444' }}>{errors.contact_name}</p>
        )}
      </section>

      {/* Телефон */}
      <section>
        <h2 style={{ color: '#0f172a', fontSize: '20px', fontWeight: 700, marginBottom: '16px' }}>
          Телефон <span style={{ color: '#94a3b8', fontWeight: 400 }}>*</span>
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
            backgroundColor: '#f1f5f9',
            border: errors.contact_phone ? '2px solid #ef4444' : '1px solid #e2e8f0',
            color: '#0f172a',
          }}
        />
        {errors.contact_phone && (
          <p className="text-sm mt-1" style={{ color: '#ef4444' }}>{errors.contact_phone}</p>
        )}
        <p className="text-xs mt-1" style={{ color: '#94a3b8' }}>
          Номер нужен для связи покупателей — он надёжно защищён и не публикуется без вашего согласия.
        </p>
      </section>

      {/* Показывать номер в объявлении */}
      <section
        className="rounded-2xl p-4"
        style={{
          backgroundColor: '#ffffff',
          border: showPhone ? '1px solid #cbd5e1' : '1px solid #e2e8f0',
        }}
      >
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="text-[16px] font-semibold" style={{ color: '#0f172a' }}>
              Показывать номер в объявлении
            </div>
            <div className="text-[13px] mt-1 leading-snug" style={{ color: '#64748b' }}>
              {showPhone
                ? 'Номер виден покупателям и сбоку от кнопки «Позвонить»'
                : 'Номер скрыт — связаться с вами можно через чат Telegram'}
            </div>
          </div>
          {/* Переключатель (switch) */}
          <button
            role="switch"
            aria-checked={showPhone}
            onClick={() => {
              trigger('selection');
              updateFormData({ show_phone: !showPhone });
            }}
            className="relative w-[52px] h-8 rounded-full transition-colors flex-shrink-0"
            style={{
              backgroundColor: showPhone ? '#2171ee' : '#e2e8f0',
            }}
          >
            <span
              className="absolute top-1 w-6 h-6 rounded-full shadow transition-all"
              style={{
                backgroundColor: '#ffffff',
                left: showPhone ? '24px' : '4px',
              }}
            />
          </button>
        </div>
      </section>

      {/* Подсказка */}
      <div className="p-4 rounded-xl" style={{ backgroundColor: '#f1f5f9', border: '1px solid #e2e8f0' }}>
        <p className="text-sm leading-relaxed" style={{ color: '#64748b' }}>
          Так мы связываем покупателя с продавцом. Телефон не проверяется модерацией
          и не отображается в поиске — только в карточке объявления.
        </p>
      </div>
    </div>
  );
}