import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer
      className="pt-4 pb-6 px-4 border-t"
      style={{ borderColor: '#e2e8f0' }}
    >
      <div className="space-y-4 text-center">
        {/* Юридические ссылки - столбиком */}
        <div className="flex flex-col items-center gap-2">
          <Link
            to="/legal?doc=privacy-policy"
            className="text-xs font-medium transition-colors"
            style={{ color: '#2171ee' }}
          >
            Политика конфиденциальности
          </Link>
          <Link
            to="/legal?doc=terms-of-service"
            className="text-xs font-medium transition-colors"
            style={{ color: '#2171ee' }}
          >
            Пользовательское соглашение
          </Link>
          <Link
            to="/legal?doc=disclaimer"
            className="text-xs font-medium transition-colors"
            style={{ color: '#2171ee' }}
          >
            Отказ от ответственности
          </Link>
        </div>

        {/* Версия и бренд */}
        <div className="space-y-1">
          <div className="text-sm font-semibold" style={{ color: '#0f172a' }}>
            BELDOMiK 🇧🇾
          </div>
          <div className="text-[10px]" style={{ color: '#94a3b8' }}>
            Найди свой дом
          </div>
        </div>

        {/* Контакты */}
        <div className="pt-1">
          <p className="text-[10px]" style={{ color: '#cbd5e1' }}>
            Поддержка: @beldomik_support
          </p>
        </div>
      </div>
    </footer>
  );
}
