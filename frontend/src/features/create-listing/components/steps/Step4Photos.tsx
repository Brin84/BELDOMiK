import React, { useEffect, useRef, useState } from 'react';
import { useTelegram } from '@/app/providers/TelegramProvider';
import { useHaptics } from '@/shared/lib/haptics';
import { useCreateListingStore } from '../../createListingStore';

interface Step4PhotosProps {
  onNext: () => void;
  onPrev: () => void;
}

export function Step4Photos({ onNext, onPrev }: Step4PhotosProps) {
  const { trigger } = useHaptics();
  const { mainButton, backButton } = useTelegram();
  const { currentStep, photos, addPhotos, removePhoto, reorderPhotos } = useCreateListingStore();

  const [previews, setPreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const MAX_PHOTOS = 20;
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

  // Sync previews with photos from store
  useEffect(() => {
    const newPreviews = photos.map(photo => URL.createObjectURL(photo));
    // Clean up old previews
    previews.forEach(p => URL.revokeObjectURL(p));
    setPreviews(newPreviews);
    return () => {
      newPreviews.forEach(p => URL.revokeObjectURL(p));
    };
  }, [photos]);

  // Setup Telegram buttons
  useEffect(() => {
    if (mainButton && currentStep === 4) {
      mainButton.setParams({
        text: 'Далее',
        is_visible: true,
        is_active: true, // Photos are optional
      });
      mainButton.show();

      const handleClick = () => {
        trigger('medium');
        onNext();
      };
      mainButton.onClick(handleClick);

      return () => {
        mainButton.hide();
        mainButton.offClick(handleClick);
      };
    }
  }, [mainButton, currentStep, onNext, trigger]);

  useEffect(() => {
    if (backButton && currentStep === 4) {
      backButton.show();
      const handleBack = () => {
        trigger('light');
        onPrev();
      };
      backButton.onClick(handleBack);
      return () => {
        backButton.hide();
        backButton.offClick(handleBack);
      };
    }
  }, [backButton, currentStep, onPrev, trigger]);

  const handleFileSelect = (files: FileList) => {
    trigger('selection');
    const newFiles = Array.from(files);
    const validFiles: File[] = [];

    for (const file of newFiles) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        trigger('error');
        alert(`Файл "${file.name}" не является изображением`);
        continue;
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        trigger('error');
        alert(`Файл "${file.name}" превышает 10 МБ`);
        continue;
      }

      // Check total count
      if (photos.length + validFiles.length >= MAX_PHOTOS) {
        trigger('error');
        alert(`Максимальное количество фото: ${MAX_PHOTOS}`);
        break;
      }

      validFiles.push(file);
    }

    if (validFiles.length > 0) {
      addPhotos(validFiles);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemovePhoto = (index: number) => {
    trigger('light');
    removePhoto(index);
  };

  const handleReorderPhotos = (fromIndex: number, toIndex: number) => {
    reorderPhotos(fromIndex, toIndex);
  };

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="p-4 space-y-6 pb-24" style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom, 0px))' }}>
      {/* Progress Indicator */}
      <div className="flex items-center gap-2">
        {[1, 2, 3, 4, 5].map((step) => (
          <React.Fragment key={step}>
            <div
              className="h-2 flex-1 rounded-full transition-colors"
              style={{
                backgroundColor: step < 4
                  ? 'var(--tg-theme-button-color)'
                  : step === 4
                  ? 'var(--tg-theme-button-color)'
                  : 'var(--tg-theme-hint-color)',
                opacity: step <= 4 ? 1 : 0.3,
              }}
            />
            {step < 5 && <div className="w-1" />}
          </React.Fragment>
        ))}
      </div>

      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-tg-text text-xl font-bold mb-2">Фотографии</h2>
          <p className="text-tg-hint text-sm">
            Добавьте до {MAX_PHOTOS} фото (макс. 10 МБ каждое). Первое фото станет обложкой объявления.
          </p>
        </div>

        {/* Photo Grid */}
        <div className="grid grid-cols-3 gap-3">
          {/* Add Photo Button */}
          {photos.length < MAX_PHOTOS && (
            <button
              onClick={openFilePicker}
              className="aspect-square rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-colors"
              style={{
                borderColor: 'var(--tg-theme-hint-color)',
                backgroundColor: 'var(--tg-theme-secondary-bg-color)',
                color: 'var(--tg-theme-text-color)',
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
                className="hidden"
              />
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} style={{ color: 'var(--tg-theme-hint-color)' }}>
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span className="text-sm">Добавить фото</span>
              <span className="text-xs text-tg-hint">{photos.length}/{MAX_PHOTOS}</span>
            </button>
          )}

          {/* Photo Previews */}
          {previews.map((preview, index) => (
            <div
              key={index}
              className="relative aspect-square rounded-2xl overflow-hidden"
              style={{ backgroundColor: 'var(--tg-theme-tertiary-bg-color, var(--tg-theme-secondary-bg-color))' }}
            >
              <img
                src={preview}
                alt={`Фото ${index + 1}`}
                className="w-full h-full object-cover"
              />
              {index === 0 && (
                <div className="absolute top-2 left-2 px-2 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: 'rgba(0,0,0,0.7)', color: 'white' }}>
                  Обложка
                </div>
              )}
              <button
                onClick={() => handleRemovePhoto(index)}
                className="absolute top-2 right-2 p-1.5 rounded-full flex items-center justify-center transition-colors"
                style={{ backgroundColor: 'rgba(255,59,48,0.9)', color: 'white' }}
                aria-label="Удалить фото"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
              <button
                onClick={() => index > 0 && handleReorderPhotos(index, 0)}
                disabled={index === 0}
                className="absolute bottom-2 left-2 p-1.5 rounded-full flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100"
                style={{ backgroundColor: 'rgba(0,0,0,0.7)', color: 'white' }}
                aria-label="Сделать обложкой"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
              </button>
            </div>
          ))}
        </div>

        {/* Photo Tips */}
        <div className="p-4 rounded-xl border" style={{ borderColor: 'var(--tg-theme-hint-color)', borderWidth: '0.5px' }}>
          <h3 className="text-tg-text font-medium mb-2 flex items-center gap-2">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--tg-theme-button-color)' }}>
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4" />
              <path d="M12 8h.01" />
            </svg>
            Рекомендации для лучших результатов:
          </h3>
          <ul className="text-tg-hint text-sm space-y-1" style={{ color: 'var(--tg-theme-hint-color)' }}>
            <li>• Первое фото — обложка, выбирайте самое привлекательное</li>
            <li>• Фото интерьера: salón, кухня, спальни, санузел</li>
            <li>• Фото внешнего вида: фасад, двор, вид из окна</li>
            <li>• Хорошее освещение, горизонтальная ориентация</li>
            <li>• Избегайте скриншотов, коллажей и водяных знаков</li>
          </ul>
        </div>
      </div>
    </div>
  );
}