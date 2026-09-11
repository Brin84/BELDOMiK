import { useEffect, useRef, useState } from 'react';
import { useHaptics } from '@/shared/lib/haptics';
import { useCreateListingStore } from '../../createListingStore';

/**
 * Шаг 5 «Фотографии». Как в Kufar: максимум 10 фото, счётчик занятых мест,
 * первое фото — обложка объявления.
 */
export function Step5Photos() {
  const { trigger } = useHaptics();
  const { photos, addPhotos, removePhoto, reorderPhotos } = useCreateListingStore();

  const [previews, setPreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const MAX_PHOTOS = 10;
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
    <div className="p-4 space-y-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold" style={{ color: '#0f172a' }}>Фотографии</h2>
            <p className="text-sm mt-1" style={{ color: '#64748b' }}>
              Первое фото станет обложкой объявления
            </p>
          </div>
          {/* Счётчик фото (как «3/10» на Kufar) */}
          {photos.length > 0 && (
            <span
              className="px-3 py-1.5 rounded-full text-sm font-semibold flex-shrink-0"
              style={{
                backgroundColor: photos.length === MAX_PHOTOS ? '#fee2e2' : '#f1f5f9',
                color: photos.length === MAX_PHOTOS ? '#dc2626' : '#64748b',
              }}
            >
              {photos.length}/{MAX_PHOTOS}
            </span>
          )}
        </div>

        {/* Photo Grid */}
        <div className="grid grid-cols-3 gap-3">
          {/* Add Photo Button */}
          {photos.length < MAX_PHOTOS && (
            <button
              onClick={openFilePicker}
              className="aspect-square rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-colors active:opacity-80"
              style={{
                borderColor: '#cbd5e1',
                backgroundColor: '#f8fafc',
                color: '#0f172a',
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
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} style={{ color: '#94a3b8' }}>
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span className="text-sm">Добавить фото</span>
              <span className="text-xs" style={{ color: '#94a3b8' }}>{photos.length}/{MAX_PHOTOS}</span>
            </button>
          )}

          {/* Photo Previews */}
          {previews.map((preview, index) => (
            <div
              key={index}
              className="relative aspect-square rounded-2xl overflow-hidden"
              style={{ backgroundColor: '#e2e8f0' }}
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
                className="absolute top-2 right-2 p-1.5 rounded-full flex items-center justify-center transition-colors active:opacity-70"
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
                className="absolute bottom-2 left-2 p-1.5 rounded-full flex items-center justify-center transition-colors"
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
        <div className="p-4 rounded-xl border" style={{ borderColor: '#e2e8f0', borderWidth: '0.5px' }}>
          <h3 className="font-medium mb-2 flex items-center gap-2" style={{ color: '#0f172a' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ color: '#2171ee' }}>
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4" />
              <path d="M12 8h.01" />
            </svg>
            Рекомендации для лучших результатов:
          </h3>
          <ul className="text-sm space-y-1" style={{ color: '#64748b' }}>
            <li>• Первое фото — обложка, выбирайте самое привлекательное</li>
            <li>• Фото интерьера: гостиная, кухня, спальни, санузел</li>
            <li>• Фото внешнего вида: фасад, двор, вид из окна</li>
            <li>• Хорошее освещение, горизонтальная ориентация</li>
            <li>• Избегайте скриншотов, коллажей и водяных знаков</li>
          </ul>
        </div>
      </div>
    </div>
  );
}