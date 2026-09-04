import React, { useEffect, useMemo, useState } from 'react';
import { useTelegram } from '@/app/providers/TelegramProvider';
import { useHaptics } from '@/shared/lib/haptics';
import { useCreateListingStore } from '../../createListingStore';
import { useGeographyStore } from '@/features/geography/geographyStore';
import type { Region, City, District, Neighborhood, Street } from '@/shared/api/types';

interface Step2LocationProps {
  onNext: () => void;
  onPrev: () => void;
  canProceed: boolean;
}

export function Step2Location({ onNext, onPrev, canProceed }: Step2LocationProps) {
  const { trigger } = useHaptics();
  const { mainButton, backButton } = useTelegram();
  const { updateFormData, formData, currentStep } = useCreateListingStore();
  const [citySearchQuery, setCitySearchQuery] = useState('');
  const [isAddingCity, setIsAddingCity] = useState(false);

  const {
    regions,
    cities,
    districts,
    neighborhoods,
    streets,
    fetchRegions,
    fetchCities,
    fetchDistricts,
    fetchNeighborhoods,
    fetchStreets,
    getRegionById,
    getCityById,
    getDistrictById,
    addCity,
  } = useGeographyStore();

  // Load regions on mount
  useEffect(() => {
    fetchRegions();
  }, [fetchRegions]);

  // Load cities when region changes
  useEffect(() => {
    if (formData.region_id) {
      fetchCities(formData.region_id);
      setCitySearchQuery('');
      updateFormData({ city_id: 0, district_id: undefined, neighborhood_id: undefined, street_id: undefined });
    }
  }, [formData.region_id, fetchCities, updateFormData]);

  // Load districts when city changes
  useEffect(() => {
    if (formData.city_id) {
      fetchDistricts(formData.city_id);
      fetchNeighborhoods(formData.city_id);
      fetchStreets(formData.city_id);
      updateFormData({ district_id: undefined, neighborhood_id: undefined, street_id: undefined });
    }
  }, [formData.city_id, fetchDistricts, fetchNeighborhoods, fetchStreets, updateFormData]);

  // Setup Telegram buttons
  useEffect(() => {
    if (mainButton && currentStep === 2) {
      mainButton.setParams({
        text: 'Далее',
        is_visible: true,
        is_active: canProceed,
      });
      mainButton.show();

      const handleClick = () => {
        if (canProceed) {
          trigger('medium');
          onNext();
        } else {
          trigger('error');
        }
      };
      mainButton.onClick(handleClick);

      return () => {
        mainButton.hide();
        mainButton.offClick(handleClick);
      };
    }
  }, [mainButton, currentStep, canProceed, onNext, trigger]);

  useEffect(() => {
    if (backButton && currentStep === 2) {
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

  const selectedRegion = formData.region_id ? getRegionById(formData.region_id) : null;
  const selectedCity = formData.city_id ? getCityById(formData.city_id) : null;
  const selectedDistrict = formData.district_id ? getDistrictById(formData.district_id) : null;

  const handleRegionChange = (region: Region) => {
    trigger('selection');
    updateFormData({ region_id: region.id });
  };

  const handleCityChange = (city: City) => {
    trigger('selection');
    updateFormData({ city_id: city.id });
  };

  const trimmedCityQuery = citySearchQuery.trim();
  const filteredCities = useMemo(() => {
    if (!trimmedCityQuery) return cities;
    const q = trimmedCityQuery.toLowerCase();
    return cities.filter((c) => c.name.toLowerCase().includes(q));
  }, [cities, trimmedCityQuery]);

  const cityNoMatches = trimmedCityQuery.length > 0 && filteredCities.length === 0;

  const handleAddCity = async () => {
    if (!cityNoMatches || !trimmedCityQuery || !formData.region_id) return;
    setIsAddingCity(true);
    trigger('selection');
    const city = await addCity(trimmedCityQuery, formData.region_id);
    setIsAddingCity(false);
    if (city) {
      trigger('success');
      updateFormData({ city_id: city.id, district_id: undefined, neighborhood_id: undefined, street_id: undefined });
    } else {
      trigger('error');
    }
  };

  const handleDistrictChange = (district: District | undefined) => {
    trigger('selection');
    updateFormData({ district_id: district?.id });
  };

  const handleNeighborhoodChange = (neighborhood: Neighborhood | undefined) => {
    trigger('selection');
    updateFormData({ neighborhood_id: neighborhood?.id });
  };

  const handleStreetChange = (street: Street | undefined) => {
    trigger('selection');
    updateFormData({ street_id: street?.id });
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
                backgroundColor: step < 2
                  ? 'var(--tg-theme-button-color)'
                  : step === 2
                  ? 'var(--tg-theme-button-color)'
                  : 'var(--tg-theme-hint-color)',
                opacity: step <= 2 ? 1 : 0.3,
              }}
            />
            {step < 5 && <div className="w-1" />}
          </React.Fragment>
        ))}
      </div>

      <div className="space-y-6">
        {/* Location Summary */}
        {(selectedRegion || selectedCity || selectedDistrict) && (
          <div className="p-3 rounded-xl" style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color)' }}>
            <div className="text-tg-hint text-xs mb-1">Выбранный адрес:</div>
            <div className="text-tg-text text-sm font-medium flex flex-wrap gap-1">
              {selectedRegion && <span>{selectedRegion.name}</span>}
              {selectedRegion && selectedCity && <span className="text-tg-hint">,</span>}
              {selectedCity && <span>{selectedCity.name}</span>}
              {selectedCity && selectedDistrict && <span className="text-tg-hint">,</span>}
              {selectedDistrict && <span>{selectedDistrict.name}</span>}
            </div>
          </div>
        )}

        {/* Region Selector */}
        <section>
          <h2 className="text-tg-text text-xl font-bold mb-4">Область <span className="text-tg-hint font-normal">*</span></h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {regions.map((region) => (
              <button
                key={region.id}
                onClick={() => handleRegionChange(region)}
                className={`py-3 px-4 rounded-xl font-medium transition-all text-center ${
                  formData.region_id === region.id ? 'ring-2 shadow-sm' : ''
                }`}
                style={{
                  backgroundColor: formData.region_id === region.id
                    ? 'var(--tg-theme-button-color)'
                    : 'var(--tg-theme-secondary-bg-color)',
                  color: formData.region_id === region.id
                    ? 'var(--tg-theme-button-text-color)'
                    : 'var(--tg-theme-text-color)',
                  border: formData.region_id !== region.id ? '1px solid var(--tg-theme-hint-color)' : 'none',
                }}
                aria-pressed={formData.region_id === region.id}
              >
                {region.name}
              </button>
            ))}
          </div>
        </section>

        {/* City Selector */}
        {formData.region_id && (
          <section>
            <h2 className="text-tg-text text-xl font-bold mb-4">Город <span className="text-tg-hint font-normal">*</span></h2>

            {/* City search */}
            <div className="relative mb-3">
              <svg
                className="absolute left-4 top-1/2 -translate-y-1/2 flex-shrink-0"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                style={{ color: 'var(--tg-theme-hint-color)' }}
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                value={citySearchQuery}
                onChange={(e) => setCitySearchQuery(e.target.value)}
                placeholder="Поиск города или деревни"
                className="w-full pl-11 pr-10 py-3 rounded-xl text-tg-text text-base"
                style={{
                  backgroundColor: 'var(--tg-theme-secondary-bg-color)',
                  border: '1px solid var(--tg-theme-hint-color)',
                  color: 'var(--tg-theme-text-color)',
                }}
                autoComplete="off"
                maxLength={100}
                aria-label="Поиск города или деревни"
              />
              {citySearchQuery && (
                <button
                  onClick={() => {
                    trigger('light');
                    setCitySearchQuery('');
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full"
                  style={{ color: 'var(--tg-theme-hint-color)' }}
                  aria-label="Очистить поиск"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>

            {cityNoMatches ? (
              <div className="text-center">
                <p className="py-2 text-sm" style={{ color: 'var(--tg-theme-hint-color)' }}>
                  «{trimmedCityQuery}» нет в списке
                </p>
                <button
                  onClick={handleAddCity}
                  disabled={isAddingCity}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-medium transition-colors active:opacity-80 disabled:opacity-60"
                  style={{
                    backgroundColor: 'var(--tg-theme-button-color)',
                    color: 'var(--tg-theme-button-text-color)',
                  }}
                >
                  {isAddingCity ? (
                    <>
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Добавляем...
                    </>
                  ) : (
                    <>➕ Добавить «{trimmedCityQuery}»</>
                  )}
                </button>
                <p className="pt-2 text-xs" style={{ color: 'var(--tg-theme-hint-color)' }}>
                  Деревня добавится в список области
                </p>
              </div>
            ) : cities.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-60 overflow-y-auto">
                {filteredCities.map((city) => (
                  <button
                    key={city.id}
                    onClick={() => handleCityChange(city)}
                    className={`py-3 px-4 rounded-xl font-medium transition-all text-center ${
                      formData.city_id === city.id ? 'ring-2 shadow-sm' : ''
                    }`}
                    style={{
                      backgroundColor: formData.city_id === city.id
                        ? 'var(--tg-theme-button-color)'
                        : 'var(--tg-theme-secondary-bg-color)',
                      color: formData.city_id === city.id
                        ? 'var(--tg-theme-button-text-color)'
                        : 'var(--tg-theme-text-color)',
                      border: formData.city_id !== city.id ? '1px solid var(--tg-theme-hint-color)' : 'none',
                    }}
                    aria-pressed={formData.city_id === city.id}
                  >
                    {city.name} {city.is_major && <span className="text-xs ml-1">⭐</span>}
                  </button>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-tg-hint">Загрузка городов...</div>
            )}
          </section>
        )}

        {/* District Selector */}
        {formData.city_id && districts.length > 0 && (
          <section>
            <h2 className="text-tg-text text-xl font-bold mb-4">Район</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <button
                onClick={() => handleDistrictChange(undefined)}
                className={`py-3 px-4 rounded-xl font-medium transition-all text-center ${
                  !formData.district_id ? 'ring-2 shadow-sm' : ''
                }`}
                style={{
                  backgroundColor: !formData.district_id
                    ? 'var(--tg-theme-button-color)'
                    : 'var(--tg-theme-secondary-bg-color)',
                  color: !formData.district_id
                    ? 'var(--tg-theme-button-text-color)'
                    : 'var(--tg-theme-text-color)',
                  border: formData.district_id ? '1px solid var(--tg-theme-hint-color)' : 'none',
                }}
                aria-pressed={!formData.district_id}
              >
                Любой район
              </button>
              {districts.map((district) => (
                <button
                  key={district.id}
                  onClick={() => handleDistrictChange(district)}
                  className={`py-3 px-4 rounded-xl font-medium transition-all text-center ${
                    formData.district_id === district.id ? 'ring-2 shadow-sm' : ''
                  }`}
                  style={{
                    backgroundColor: formData.district_id === district.id
                      ? 'var(--tg-theme-button-color)'
                      : 'var(--tg-theme-secondary-bg-color)',
                    color: formData.district_id === district.id
                      ? 'var(--tg-theme-button-text-color)'
                      : 'var(--tg-theme-text-color)',
                    border: formData.district_id !== district.id ? '1px solid var(--tg-theme-hint-color)' : 'none',
                  }}
                  aria-pressed={formData.district_id === district.id}
                >
                  {district.name}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Neighborhood Selector */}
        {formData.city_id && neighborhoods.length > 0 && (
          <section>
            <h2 className="text-tg-text text-xl font-bold mb-4">Микрорайон / ЖК</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <button
                onClick={() => handleNeighborhoodChange(undefined)}
                className={`py-3 px-4 rounded-xl font-medium transition-all text-center ${
                  !formData.neighborhood_id ? 'ring-2 shadow-sm' : ''
                }`}
                style={{
                  backgroundColor: !formData.neighborhood_id
                    ? 'var(--tg-theme-button-color)'
                    : 'var(--tg-theme-secondary-bg-color)',
                  color: !formData.neighborhood_id
                    ? 'var(--tg-theme-button-text-color)'
                    : 'var(--tg-theme-text-color)',
                  border: formData.neighborhood_id ? '1px solid var(--tg-theme-hint-color)' : 'none',
                }}
                aria-pressed={!formData.neighborhood_id}
              >
                Любой
              </button>
              {neighborhoods.map((neighborhood) => (
                <button
                  key={neighborhood.id}
                  onClick={() => handleNeighborhoodChange(neighborhood)}
                  className={`py-3 px-4 rounded-xl font-medium transition-all text-center ${
                    formData.neighborhood_id === neighborhood.id ? 'ring-2 shadow-sm' : ''
                  }`}
                  style={{
                    backgroundColor: formData.neighborhood_id === neighborhood.id
                      ? 'var(--tg-theme-button-color)'
                      : 'var(--tg-theme-secondary-bg-color)',
                    color: formData.neighborhood_id === neighborhood.id
                      ? 'var(--tg-theme-button-text-color)'
                      : 'var(--tg-theme-text-color)',
                    border: formData.neighborhood_id !== neighborhood.id ? '1px solid var(--tg-theme-hint-color)' : 'none',
                  }}
                  aria-pressed={formData.neighborhood_id === neighborhood.id}
                >
                  {neighborhood.name}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Street Selector */}
        {formData.city_id && streets.length > 0 && (
          <section>
            <h2 className="text-tg-text text-xl font-bold mb-4">Улица</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-60 overflow-y-auto">
              <button
                onClick={() => handleStreetChange(undefined)}
                className={`py-3 px-4 rounded-xl font-medium transition-all text-center ${
                  !formData.street_id ? 'ring-2 shadow-sm' : ''
                }`}
                style={{
                  backgroundColor: !formData.street_id
                    ? 'var(--tg-theme-button-color)'
                    : 'var(--tg-theme-secondary-bg-color)',
                  color: !formData.street_id
                    ? 'var(--tg-theme-button-text-color)'
                    : 'var(--tg-theme-text-color)',
                  border: formData.street_id ? '1px solid var(--tg-theme-hint-color)' : 'none',
                }}
                aria-pressed={!formData.street_id}
              >
                Любая улица
              </button>
              {streets.map((street) => (
                <button
                  key={street.id}
                  onClick={() => handleStreetChange(street)}
                  className={`py-3 px-4 rounded-xl font-medium transition-all text-center ${
                    formData.street_id === street.id ? 'ring-2 shadow-sm' : ''
                  }`}
                  style={{
                    backgroundColor: formData.street_id === street.id
                      ? 'var(--tg-theme-button-color)'
                      : 'var(--tg-theme-secondary-bg-color)',
                    color: formData.street_id === street.id
                      ? 'var(--tg-theme-button-text-color)'
                      : 'var(--tg-theme-text-color)',
                    border: formData.street_id !== street.id ? '1px solid var(--tg-theme-hint-color)' : 'none',
                  }}
                  aria-pressed={formData.street_id === street.id}
                >
                  {street.name}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Address Input */}
        <section>
          <h2 className="text-tg-text text-xl font-bold mb-4">Точный адрес (дом, корпус, квартира)</h2>
          <input
            type="text"
            value={formData.address || ''}
            onChange={(e) => {
              trigger('selection');
              updateFormData({ address: e.target.value });
            }}
            placeholder="ул. Ленина, д. 10, кв. 5"
            className="w-full px-4 py-3 rounded-xl text-tg-text text-base"
            style={{
              backgroundColor: 'var(--tg-theme-secondary-bg-color)',
              border: '1px solid var(--tg-theme-hint-color)',
              color: 'var(--tg-theme-text-color)',
            }}
            maxLength={200}
          />
          <p className="text-tg-hint text-xs mt-1">Укажите номер дома, корпуса и квартиры для точного расположения на карте</p>
        </section>
      </div>
    </div>
  );
}