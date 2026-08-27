import React, { useEffect } from 'react';
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
  } = useGeographyStore();

  // Load regions on mount
  useEffect(() => {
    fetchRegions();
  }, [fetchRegions]);

  // Load cities when region changes
  useEffect(() => {
    if (formData.region_id) {
      fetchCities(formData.region_id);
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
            {cities.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-60 overflow-y-auto">
                {cities.map((city) => (
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