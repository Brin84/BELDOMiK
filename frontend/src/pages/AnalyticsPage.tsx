import { useEffect } from 'react';
import { useTelegram } from '@/app/providers/TelegramProvider';
import { AnalyticsDashboard } from '@/features/analytics/components/AnalyticsDashboard';

export function AnalyticsPage() {
  const { mainButton } = useTelegram();

  useEffect(() => {
    mainButton.hide();
  }, [mainButton]);

  return <AnalyticsDashboard />;
}