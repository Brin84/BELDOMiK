import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer
      className="pt-6 pb-4 px-4 border-t"
      style={{ borderColor: '#e2e8f0' }}
    >
      <div className="space-y-4 text-center">
        {/* Юридические ссылки */}
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-2">
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

        <div className="flex flex-wrap justify-center gap-x-4 gap-y-2">
          <Link
            to="/legal?doc=cookie-policy"
            className="text-xs transition-colors"
            style={{ color: '#64748b' }}
          >
            Cookie
          </Link>
          <Link
            to="/legal?doc=gdpr"
            className="text-xs transition-colors"
            style={{ color: '#64748b' }}
          >
            GDPR
          </Link>
          <Link
            to="/legal?doc=user-rights"
            className="text-xs transition-colors"
            style={{ color: '#64748b' }}
          >
            Права пользователей
          </Link>
        </div>

        {/* Версия и бренд */}
        <div className="space-y-1">
          <div className="text-sm font-semibold" style={{ color: '#0f172a' }}>
            BELDOMiK 🇧🇾
          </div>
          <div className="text-xs" style={{ color: '#94a3b8' }}>
            Найди свой дом — Telegram Mini App
          </div>
          <div className="text-[10px]" style={{ color: '#cbd5e1' }}>
            Версия v0.1.0 • {new Date().getFullYear()}
          </div>
        </div>

        {/* Контакты */}
        <div className="pt-2">
          <p className="text-[10px]" style={{ color: '#94a3b8' }}>
            Поддержка: @beldomik_support
          </p>
        </div>
      </div>
    </footer>
  );
}
