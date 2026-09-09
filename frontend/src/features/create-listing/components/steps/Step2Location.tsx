import { useEffect, useState } from 'react';
import { useHaptics } from '@/shared/lib/haptics';
import { useCreateListingStore } from '../../createListingStore';
import { useGeographyStore } from '@/features/geography/geographyStore';
import { ExpandablePicker, type ExpandableOption } from '../ExpandablePicker';
import type { Region, City, District, Neighborhood, Street } from '@/shared/api/types';

type PickerName = 'region' | 'city';

export function Step2Location() {
  const { trigger } = useHaptics();
  const { updateFormData, formData } = useCreateListingStore();
  const [openPicker, setOpenPicker] = useState<PickerName | null>(null);
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

  // ── Region picker ──────────────────────────────────────

  const regionOptions: ExpandableOption<number>[] = regions.map((r: Region) => ({
    value: r.id,
    title: r.name,
  }));

  const handleRegionChange = (value: number) => {
    updateFormData({ region_id: value });
    setOpenPicker(null);
  };

  // ── City picker ────────────────────────────────────────

  const cityOptions: ExpandableOption<number>[] = cities.map((c: City) => ({
    value: c.id,
    title: c.name,
    subtitle: c.is_major ? 'областной центр' : undefined,
  }));

  const handleCityChange = (value: number) => {
    updateFormData({ city_id: value });
    setOpenPicker(null);
  };

  const handleAddCity = async (query: string) => {
    if (!query || !formData.region_id) return;
    setIsAddingCity(true);
    trigger('selection');
    const city = await addCity(query, formData.region_id);
    setIsAddingCity(false);
    if (city) {
      trigger('success');
      updateFormData({ city_id: city.id, district_id: undefined, neighborhood_id: undefined, street_id: undefined });
      setOpenPicker(null);
    } else {
      trigger('error');
    }
  };

  // ── District / Neighborhood / Street ────────────────────

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

  const handleToggle = (picker: PickerName) => {
    trigger('light');
    setOpenPicker((prev) => (prev === picker ? null : picker));
  };

  return (
    <div className="p-4 space-y-6">
      <div className="space-y-3">
        {/* Region Selector — ExpandablePicker */}
        <ExpandablePicker<number>
          label="Область"
          placeholder="Выберите область"
          selected={formData.region_id || null}
          options={regionOptions}
          onSelect={handleRegionChange}
          open={openPicker === 'region'}
          onToggle={() => handleToggle('region')}
        />

        {/* City Selector — ExpandablePicker с поиском и «Добавить» */}
        {formData.region_id && (
          <ExpandablePicker<number>
            label="Город / деревня"
            placeholder="Выберите город"
            selected={formData.city_id || null}
            options={cityOptions}
            onSelect={handleCityChange}
            open={openPicker === 'city'}
            onToggle={() => handleToggle('city')}
            searchable
            searchPlaceholder="Название города или деревни"
            addOption={{
              label: 'Добавить',
              onAdd: handleAddCity,
              isAdding: isAddingCity,
            }}
          />
        )}
      </div>

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
          onChange={(e) => updateFormData({ address: e.target.value })}
          placeholder="ул. Ленина, д. 10, кв. 5"
          className="w-full px-4 py-3 rounded-xl text-tg-text text-base"
          style={{
            backgroundColor: 'var(--tg-theme-secondary-bg-color)',
            border: '1px solid var(--tg-theme-hint-color)',
            color: 'var(--tg-theme-text-color)',
          }}
          maxLength={200}
          autoComplete="off"
        />
        <p className="text-tg-hint text-xs mt-1">Укажите номер дома, корпуса и квартиры для точного расположения на карте</p>
      </section>
    </div>
  );
}
