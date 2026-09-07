import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useHaptics } from '@/shared/lib/haptics';
import { useTelegram } from '@/app/providers/TelegramProvider';
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
  const [searchParams] = useSearchParams();
  const {
    currentStep,
    setStep,
    nextStep,
    prevStep,
    validateStep,
    validateAll,
    submit,
    submitForModeration,
    reset,
    loadDraft,
    isSubmitting,
    draftId,
    error,
  } = useCreateListingStore();

  const isAuthenticated = status === 'authenticated' && user;

  // canProceed/completionPercentage НЕ берём из store: в Zustand v5 геттер
  // в состоянии после первого set() замораживается в обычное значение
  // (снапшот), и прогресс/активность кнопки «Далее» намертво застревают.
  // Считаем их «живо»: validateStep() читает свежий formData на каждом
  // рендере, а визард подписан на весь store целиком и пере-рендерится
  // на любое изменение.
  const canProceed = validateStep(currentStep);
  const completionPercentage = Math.round(
    ([1, 2, 3, 4, 5]
      .filter((s) => s <= currentStep && validateStep(s as 1 | 2 | 3 | 4 | 5))
      .length / 5) * 100,
  );

  // Load draft from URL parameter on mount
  useEffect(() => {
    const draftParam = searchParams.get('draft');
    if (draftParam) {
      const draftId = parseInt(draftParam, 10);
      if (!isNaN(draftId)) {
        loadDraft(draftId);
      }
    }
  }, [searchParams, loadDraft]);

  // Check auth on mount
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/profile');
    }
  }, [isAuthenticated, navigate]);

  // Native Telegram BackButton: step back on steps 2-5, leave wizard on step 1
  useEffect(() => {
    if (!backButton || !isAuthenticated) return;
    backButton.show();
    const handleBack = () => {
      if (currentStep > 1) {
        trigger('light');
        prevStep();
      } else {
        navigate(-1);
      }
    };
    backButton.onClick(handleBack);
    return () => {
      backButton.hide();
      backButton.offClick(handleBack);
    };
  }, [backButton, currentStep, prevStep, navigate, trigger, isAuthenticated]);

  // Handle successful submission
  const handleSubmit = async () => {
    if (!validateAll()) {
      trigger('error');
      return;
    }

    // If editing existing draft, update it; otherwise create new
    // Then submit for moderation
    const result = draftId ? await submitForModeration() : await submit();

    if (result) {
      trigger('success');
      reset();
      navigate('/profile');
    } else {
      trigger('error');
    }
  };

  const handlePrimary = () => {
    if (currentStep === 5) {
      handleSubmit();
    } else if (canProceed) {
      trigger('medium');
      nextStep();
    } else {
      trigger('error');
    }
  };

  const primaryLabel = currentStep === 5
    ? (isSubmitting ? 'Отправка...' : 'Отправить на модерацию')
    : 'Далее';
  const primaryDisabled = currentStep === 5 ? isSubmitting : !canProceed;

  if (!isAuthenticated) {
    return (
      <div className="p-4 space-y-6">
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
        return <Step1OperationType />;
      case 2:
        return <Step2Location />;
      case 3:
        return <Step3Details />;
      case 4:
        return <Step4Photos />;
      case 5:
        return <Step5Preview />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f7f9fc' }}>
      {/* Header with progress */}
      <div className="sticky top-0 z-10 p-4 border-b" style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderWidth: '0.5px' }}>
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-[#0f172a] text-xl font-bold">Создание объявления</h1>
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
            role="progressbar"
            aria-valuenow={completionPercentage}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Прогресс заполнения"
            className="h-full rounded-full transition-all duration-300"
            style={{
              backgroundColor: 'var(--tg-theme-button-color)',
              width: `${completionPercentage}%`,
            }}
          />
        </div>
      </div>

      {/* Step content */}
      <div className="pb-32">
        {renderStep()}
      </div>

      {/* Sticky bottom action bar (always visible — works in Telegram and browser) */}
      <div
        className="fixed bottom-0 left-0 right-0 z-40 border-t"
        style={{
          backgroundColor: '#ffffff',
          borderColor: '#e2e8f0',
          borderWidth: '0.5px',
          padding: '12px 16px calc(12px + env(safe-area-inset-bottom, 0px))',
          boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.04)',
        }}
      >
        <div className="flex gap-3 max-w-[560px] mx-auto">
          {currentStep > 1 && (
            <button
              onClick={() => {
                trigger('light');
                prevStep();
              }}
              className="flex-1 py-3.5 rounded-xl font-medium transition-colors active:opacity-80"
              style={{ backgroundColor: 'transparent', color: '#0f172a', border: '1px solid #e2e8f0' }}
            >
              Назад
            </button>
          )}
          <button
            onClick={handlePrimary}
            disabled={primaryDisabled}
            className="flex-1 py-3.5 rounded-xl font-semibold transition-colors active:opacity-90 disabled:opacity-60"
            style={{
              backgroundColor: '#2171ee',
              color: '#ffffff',
              boxShadow: '0 6px 18px rgba(33, 113, 238, 0.35)',
            }}
          >
            {primaryLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function CreateListingPage() {
  return <CreateListingWizard />;
}
