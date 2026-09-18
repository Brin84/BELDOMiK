import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { EmptyState } from '@/shared/ui';
import { LegalDocumentResponse } from '@/shared/api/types';
import { API_ENDPOINTS } from '@/shared/api/endpoints';

interface DocumentLink {
  id: string;
  title: string;
  url: string;
}

const DOCUMENTS: DocumentLink[] = [
  { id: 'privacy-policy', title: 'Политика конфиденциальности', url: '/api/v1/legal/privacy-policy' },
  { id: 'terms-of-service', title: 'Пользовательское соглашение', url: '/api/v1/legal/terms-of-service' },
  { id: 'cookie-policy', title: 'Политика использования cookie', url: '/api/v1/legal/cookie-policy' },
  { id: 'gdpr', title: 'GDPR compliance', url: '/api/v1/legal/gdpr' },
  { id: 'privacy-by-design', title: 'Privacy by Design', url: '/api/v1/legal/privacy-by-design' },
  { id: 'user-rights', title: 'Права пользователей', url: '/api/v1/legal/user-rights' },
  { id: 'disclaimer', title: 'Юридическое уведомление и отказ от ответственности', url: '/api/v1/legal/disclaimer' },
];

function DocumentContent({ content }: { content: string }) {
  // Основные HTML-элементы для отображения Markdown-подобного контента
  return (
    <div className="prose prose-sm prose-stone max-w-none p-4 md:prose-base">
      {content.split('\n').map((line, index) => {
        if (line.startsWith('# ')) {
          return (
            <h1 key={index} className="text-2xl font-bold mb-4" style={{ color: '#0f172a' }}>
              {line.slice(2)}
            </h1>
          );
        }
        if (line.startsWith('## ')) {
          return (
            <h2 key={index} className="text-xl font-semibold mt-6 mb-3" style={{ color: '#0f172a' }}>
              {line.slice(3)}
            </h2>
          );
        }
        if (line.startsWith('### ')) {
          return (
            <h3 key={index} className="text-lg font-medium mt-4 mb-2" style={{ color: '#0f172a' }}>
              {line.slice(4)}
            </h3>
          );
        }
        if (line.startsWith('**')) {
          return (
            <strong key={index} className="font-semibold" style={{ color: '#0f172a' }}>
              {line}
            </strong>
          );
        }
        if (line.startsWith('• ') || line.startsWith('- ')) {
          return (
            <li key={index} className="ml-4 list-disc mb-2" style={{ color: '#334155' }}>
              {line.slice(2)}
            </li>
          );
        }
        if (line.trim() === '') {
          return <br key={index} />;
        }
        return <p key={index} className="mb-3" style={{ color: '#334155', lineHeight: '1.6' }}>
          {line}
        </p>;
      })}
    </div>
  );
}

export function LegalDocumentsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [selectedDocument, setSelectedDocument] = useState<string | null>(
    searchParams.get('doc') || null
  );
  const [documentData, setDocumentData] = useState<LegalDocumentResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchDocument = async (docId: string) => {
    setLoading(true);
    try {
      const endpoint = API_ENDPOINTS.legal[docId as keyof typeof API_ENDPOINTS.legal];
      if (!endpoint) throw new Error('Invalid document ID');
      const response = await fetch(endpoint);
      if (!response.ok) throw new Error('Failed to fetch document');
      const data: LegalDocumentResponse = await response.json();
      setDocumentData(data);
    } catch {
      // Fallback for development without backend
      setDocumentData({
        title: 'Документ',
        last_updated: '2026-09-18',
        content: 'Контент документа загружается с сервера. В текущем режиме отображается заглушка.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDocumentSelect = (docId: string) => {
    setSelectedDocument(docId);
    navigate(`?doc=${docId}`);
    if (!documentData || documentData.title === 'Документ') {
      fetchDocument(docId);
    }
  };

  if (!selectedDocument) {
    return (
      <div className="p-4 pb-20">
        <h1 className="text-2xl font-bold mb-6" style={{ color: '#0f172a' }}>
          Юридическая информация
        </h1>
        <div className="space-y-3">
          {DOCUMENTS.map((doc) => (
            <button
              key={doc.id}
              onClick={() => handleDocumentSelect(doc.id)}
              className="w-full text-left p-4 rounded-xl transition-colors active:opacity-80"
              style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0' }}
            >
              <div className="font-medium" style={{ color: '#0f172a' }}>
                {doc.title}
              </div>
              <div className="text-xs mt-1" style={{ color: '#94a3b8' }}>
                {doc.id}
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 pb-20">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => {
            setSelectedDocument(null);
            navigate('/settings');
          }}
          className="p-2 rounded-full transition-colors active:opacity-80"
          style={{ backgroundColor: '#e2e8f0' }}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="#0f172a" strokeWidth="2">
            <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 className="text-xl font-bold flex-1" style={{ color: '#0f172a' }}>
          {documentData?.title || 'Документ'}
        </h1>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <svg className="animate-spin w-8 h-8" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
      ) : documentData ? (
        <div className="bg-white rounded-2xl overflow-hidden" style={{ border: '1px solid #e2e8f0' }}>
          <div className="p-4 border-b" style={{ borderColor: '#e2e8f0' }}>
            <div className="text-xs" style={{ color: '#94a3b8' }}>
              Последнее обновление: {documentData.last_updated}
            </div>
          </div>
          <div className="max-h-[60vh] overflow-y-auto">
            <DocumentContent content={documentData.content} />
          </div>
        </div>
      ) : (
        <EmptyState title="Ошибка загрузки" description="Не удалось загрузить документ" />
      )}

      <div className="mt-6 pt-4 border-t text-center text-sm" style={{ borderColor: '#e2e8f0', color: '#94a3b8' }}>
        BELDOMiK — соблюдаем права пользователей
      </div>
    </div>
  );
}
