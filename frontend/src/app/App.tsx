import { Suspense, lazy, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useTelegram } from '@/app/providers/TelegramProvider';
import { AppShell } from '@/widgets/layout/AppShell';
import { CatalogPage } from '@/pages/CatalogPage';
import { FavoritesPage } from '@/pages/FavoritesPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { SearchPage } from '@/pages/SearchPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { PropertyDetailPage } from '@/features/property-detail/components/PropertyDetailPage';
import { CreateListingPage } from '@/features/create-listing/components/CreateListingWizard';
import { AnalyticsPage } from '@/pages/AnalyticsPage';
import { MyListingsPage } from '@/features/my-listings/MyListingsPage';
import { ComparisonPage } from '@/pages/ComparisonPage';
import { AdminPage } from '@/pages/AdminPage';
import { CollectionsPage } from '@/pages/CollectionsPage';
import { CollectionDetailPage } from '@/pages/CollectionDetailPage';
import { ViewingsPage } from '@/pages/ViewingsPage';
import { MessagesPage } from '@/pages/MessagesPage';
import { ChatPage } from '@/pages/ChatPage';
import { AgencyCatalogPage } from '@/pages/AgencyCatalogPage';
import { AgencyDetailPage } from '@/pages/AgencyDetailPage';
import { MyAgencyPage } from '@/pages/MyAgencyPage';
import { SubscriptionPage } from '@/pages/SubscriptionPage';
import { ToastProvider } from '@/shared/ui/Toast';
import { AllBelarusPage } from '@/pages/AllBelarusPage';
import { SettingsPage } from '@/pages/SettingsPage';

// Lazy load MapPage for code splitting
const MapPage = lazy(() => import('@/pages/MapPage').then(module => ({ default: module.MapPage })));

function MapPageFallback() {
  return (
    <div className="flex items-center justify-center" style={{ height: 'calc(var(--tg-viewport-stable-height, 100vh))' }}>
      <div className="text-center p-4">
        <svg className="animate-spin mx-auto mb-3 h-8 w-8" viewBox="0 0 24 24" style={{ color: '#94a3b8', opacity: 0.5 }}>
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <p className="text-tg-hint text-sm">Загрузка карты...</p>
      </div>
    </div>
  );
}

export function App() {
  const navigate = useNavigate();
  const { startParam } = useTelegram();

  // Глубокая ссылка из бота/канала:
  // startapp=property_<id> → открываем конкретное объявление;
  // startapp=chat_<id>    → открываем переписку (уведомление о сообщении).
  useEffect(() => {
    if (!startParam) return;
    const property = /^property_(\d+)$/.exec(startParam);
    if (property) {
      navigate(`/property/${property[1]}`, { replace: true });
      return;
    }
    const chat = /^chat_(\d+)$/.exec(startParam);
    if (chat) {
      navigate(`/messages/${chat[1]}`, { replace: true });
    }
  }, [startParam, navigate]);

  return (
    <ToastProvider>
      <AppShell>
        <Routes>
        <Route path="/" element={<Navigate to="/catalog" replace />} />
        <Route path="/catalog" element={<CatalogPage />} />
        <Route path="/property/:id" element={<PropertyDetailPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/map" element={
          <Suspense fallback={<MapPageFallback />}>
            <MapPage />
          </Suspense>
        } />
        <Route path="/regions" element={<AllBelarusPage />} />
        <Route path="/favorites" element={<FavoritesPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/create-listing" element={<CreateListingPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/my-listings" element={<MyListingsPage />} />
        <Route path="/collections" element={<CollectionsPage />} />
        <Route path="/collections/:id" element={<CollectionDetailPage />} />
        <Route path="/viewings" element={<ViewingsPage />} />
        <Route path="/messages" element={<MessagesPage />} />
        <Route path="/messages/:id" element={<ChatPage />} />
        <Route path="/agencies" element={<AgencyCatalogPage />} />
        <Route path="/agencies/me" element={<MyAgencyPage />} />
        <Route path="/agencies/:id" element={<AgencyDetailPage />} />
        <Route path="/subscription" element={<SubscriptionPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/comparison" element={<ComparisonPage />} />
        {/* Ипотечный калькулятор временно отключён от приложения:
            роут /mortgage снят, код сохранён в features/mortgage
            и pages/MortgagePage.tsx для повторного включения. */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AppShell>
    </ToastProvider>
  );
}