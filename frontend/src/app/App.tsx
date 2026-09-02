import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from '@/widgets/layout/AppShell';
import { CatalogPage } from '@/pages/CatalogPage';
import { FavoritesPage } from '@/pages/FavoritesPage';
import { MortgagePage } from '@/pages/MortgagePage';
import { ProfilePage } from '@/pages/ProfilePage';
import { SearchPage } from '@/pages/SearchPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { PropertyDetailPage } from '@/features/property-detail/components/PropertyDetailPage';
import { CreateListingPage } from '@/features/create-listing/components/CreateListingWizard';
import { AnalyticsPage } from '@/pages/AnalyticsPage';
import { MyListingsPage } from '@/features/my-listings/MyListingsPage';
import { ComparisonPage } from '@/pages/ComparisonPage';
import { CollectionsPage } from '@/pages/CollectionsPage';
import { CollectionDetailPage } from '@/pages/CollectionDetailPage';
import { ViewingsPage } from '@/pages/ViewingsPage';
import { ToastProvider } from '@/shared/ui/Toast';

// Lazy load MapPage for code splitting
const MapPage = lazy(() => import('@/pages/MapPage').then(module => ({ default: module.MapPage })));

function MapPageFallback() {
  return (
    <div className="flex items-center justify-center" style={{ height: 'calc(var(--tg-viewport-stable-height, 100vh))' }}>
      <div className="text-center p-4">
        <svg className="animate-spin mx-auto mb-3 h-8 w-8" viewBox="0 0 24 24" style={{ color: 'var(--tg-theme-hint-color)', opacity: 0.5 }}>
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <p className="text-tg-hint text-sm">Загрузка карты...</p>
      </div>
    </div>
  );
}

export function App() {
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
        <Route path="/favorites" element={<FavoritesPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/create-listing" element={<CreateListingPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/my-listings" element={<MyListingsPage />} />
        <Route path="/collections" element={<CollectionsPage />} />
        <Route path="/collections/:id" element={<CollectionDetailPage />} />
        <Route path="/viewings" element={<ViewingsPage />} />
        <Route path="/comparison" element={<ComparisonPage />} />
        <Route path="/mortgage" element={<MortgagePage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AppShell>
    </ToastProvider>
  );
}