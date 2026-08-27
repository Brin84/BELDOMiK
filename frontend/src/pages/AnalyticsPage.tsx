import { useEffect } from 'react';
import { useTelegram } from '@/app/providers/TelegramProvider';
import { useHaptics } from '@/shared/lib/haptics';
import { AnalyticsDashboard } from '@/features/analytics/components/AnalyticsDashboard';

export function AnalyticsPage() {
  const { trigger } = useHaptics();
  const { backButton, mainButton } = useTelegram();

  useEffect(() => {
    mainButton.hide();

    if (backButton) {
      backButton.show();
      const handleBack = () => {
        trigger('light');
        window.history.back();
      };
      backButton.onClick(handleBack);
      return () => {
        backButton.hide();
        backButton.offClick(handleBack);
      };
    }
  }, [backButton, trigger, mainButton]);

  return <AnalyticsDashboard />;
}