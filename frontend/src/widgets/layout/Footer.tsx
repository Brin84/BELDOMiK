import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer
      className="pt-4 pb-4 px-4 border-t"
      style={{ borderColor: '#e2e8f0' }}
    >
      <div className="space-y-3 text-center">
        {/* Юридические ссылки - компактно */}
        <div className="flex flex-wrap justify-center gap-x-3 gap-y-2">
          <Link
            to="/legal?doc=privacy-policy"
            className="text-[10px] font-medium transition-colors"
            style={{ color: '#2171ee' }}
          >
            Политика
          </Link>
          <Link
            to="/legal?doc=terms-of-service"
            className="text-[10px] font-medium transition-colors"
            style={{ color: '#2171ee' }}
          >
            Соглашение
          </Link>
          <Link
            to="/legal?doc=disclaimer"
            className="text-[10px] font-medium transition-colors"
            style={{ color: '#2171ee' }}
          >
            Отказ
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
          <p className="text-[9px]" style={{ color: '#cbd5e1' }}>
            Поддержка: @beldomik_support
          </p>
        </div>
      </div>
    </footer>
  );
}
