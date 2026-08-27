import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTelegram } from '@/app/providers/TelegramProvider';
import { useHaptics } from '@/shared/lib/haptics';
import { useAuthStore } from '@/features/auth';
import { useCreateListingStore } from '../createListingStore';
import { Step1OperationType } from './steps/Step1OperationType';
import { Step2Location } from './steps/Step2Location';
import { Step3Details } from './steps/Step3Details';
import { Step4Photos } from './steps/Step4Photos';
import { Step5Preview } from './steps/Step5Preview';
import { EmptyState } from '@/shared/ui';

export function CreateListingWizard() {
  const { trigger } = useHaptics();
  const { backButton } = useTelegram();
  const { user, status } = useAuthStore();
  const navigate = useNavigate();
  const {
    currentStep,
    setStep,
    nextStep,
    prevStep,
    validateStep,
    validateAll,
    submit,
    reset,
    isSubmitting,
    error,
    canProceed,
    completionPercentage,
  } = useCreateListingStore();

  const isAuthenticated = status === 'authenticated' && user;

  // Check auth on mount
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/profile');
    }
  }, [isAuthenticated, navigate]);

  // Handle back button globally
  useEffect(() => {
    if (backButton && currentStep > 1) {
      backButton.show();
      const handleBack = () => {
        trigger('light');
        prevStep();
      };
      backButton.onClick(handleBack);
      return () => {
        backButton.hide();
        backButton.offClick(handleBack);
      };
    } else if (backButton && currentStep === 1) {
      backButton.show();
      const handleBack = () => {
        trigger('light');
        navigate('/profile');
      };
      backButton.onClick(handleBack);
      return () => {
        backButton.hide();
        backButton.offClick(handleBack);
      };
    }
  }, [backButton, currentStep, navigate, prevStep, trigger]);

  // Handle successful submission
  const handleSubmit = async () => {
    if (!validateAll()) {
      trigger('error');
      return;
    }

    const result = await submit();

    if (result) {
      trigger('success');
      reset();
      navigate('/profile');
    } else {
      trigger('error');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="p-4 space-y-6 pb-20">
        <EmptyState
          title="Требуется авторизация"
          description="Войдите в профиль, чтобы создавать объявления"
          action={{
            label: 'Войти',
            onClick: () => navigate('/profile'),
          }}
        />
      </div>
    );
  }

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <Step1OperationType onNext={nextStep} canProceed={canProceed} />;
      case 2:
        return <Step2Location onNext={nextStep} onPrev={prevStep} canProceed={canProceed} />;
      case 3:
        return <Step3Details onNext={nextStep} onPrev={prevStep} canProceed={canProceed} />;
      case 4:
        return <Step4Photos onNext={nextStep} onPrev={prevStep} />;
      case 5:
        return <Step5Preview onSubmit={handleSubmit} onPrev={prevStep} isSubmitting={isSubmitting} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--tg-theme-bg-color)' }}>
      {/* Header with progress */}
      <div className="sticky top-0 z-10 p-4 border-b" style={{ backgroundColor: 'var(--tg-theme-bg-color)', borderColor: 'var(--tg-theme-hint-color)', borderWidth: '0.5px' }}>
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-tg-text text-xl font-bold">Создание объявления</h1>
          {error && (
            <div className="text-red-500 text-sm flex items-center gap-1">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
              {error}
            </div>
          )}
        </div>

        {/* Step indicators */}
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((step) => (
            <React.Fragment key={step}>
              <button
                onClick={() => {
                  if (step <= currentStep || validateStep(step as 1 | 2 | 3 | 4 | 5)) {
                    trigger('light');
                    setStep(step as 1 | 2 | 3 | 4 | 5);
                  } else {
                    trigger('error');
                  }
                }}
                className={`flex items-center justify-center w-8 h-8 rounded-full transition-all font-medium text-xs ${
                  step < currentStep ? 'bg-tg-button text-tg-button-text' :
                  step === currentStep ? 'bg-tg-button text-tg-button-text shadow-md' :
                  'bg-tg-secondary-bg text-tg-hint'
                }`}
                style={{
                  backgroundColor: step <= currentStep
                    ? 'var(--tg-theme-button-color)'
                    : 'var(--tg-theme-secondary-bg-color)',
                  color: step <= currentStep
                    ? 'var(--tg-theme-button-text-color)'
                    : 'var(--tg-theme-hint-color)',
                }}
                disabled={step > currentStep && !validateStep(step as 1 | 2 | 3 | 4 | 5)}
                aria-label={`Шаг ${step}`}
              >
                {step < currentStep ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : step}
              </button>
              {step < 5 && (
                <div
                  className="flex-1 h-1 rounded transition-colors"
                  style={{
                    backgroundColor: step < currentStep
                      ? 'var(--tg-theme-button-color)'
                      : 'var(--tg-theme-hint-color)',
                    opacity: step < currentStep ? 1 : 0.3,
                  }}
                />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Step labels */}
        <div className="flex justify-between mt-2 text-xs text-tg-hint">
          <span>Сделка</span>
          <span>Локация</span>
          <span>Детали</span>
          <span>Фото</span>
          <span>Превью</span>
        </div>

        {/* Progress bar */}
        <div className="mt-3 h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color)' }}>
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              backgroundColor: 'var(--tg-theme-button-color)',
              width: `${completionPercentage}%`,
            }}
          />
        </div>
      </div>

      {/* Step content */}
      <div className="pb-24">
        {renderStep()}
      </div>
    </div>
  );
}

export function CreateListingPage() {
  return <CreateListingWizard />;
}