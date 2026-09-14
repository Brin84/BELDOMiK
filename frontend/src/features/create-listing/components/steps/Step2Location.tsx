import { useEffect, useState } from 'react';
import { useHaptics } from '@/shared/lib/haptics';
import { useCreateListingStore } from '../../createListingStore';
import { useGeographyStore } from '@/features/geography/geographyStore';
import { ExpandablePicker, type ExpandableOption } from '../ExpandablePicker';
import type { Region, City, District, Neighborhood, Street } from '@/shared/api/types';

type PickerName = 'region' | 'city';

// ── Светлые компактные плитки выбора (район / микрорайон / улица) ──────────
// Единый стиль дизайна BELDOMiK: белые плитки со светлой рамкой #e2e8f0,
// выбранная — синяя #2171ee. Без tg-theme-переменных и тёмных рамок.
const tileBaseClass =
  'py-2 px-3 rounded-lg text-sm font-medium text-center transition-all active:scale-[0.96]';

const tileStyle = (selected: boolean): React.CSSProperties => ({
  backgroundColor: selected ? '#2171ee' : '#ffffff',
  color: selected ? '#ffffff' : '#334155',
  border: selected ? '1px solid #2171ee' : '1px solid #e2e8f0',
  boxShadow: selected ? '0 4px 12px rgba(33, 113, 238, 0.3)' : 'none',
});

// Заголовок секции — компактнее прежнего (text-xl → text-base).
const sectionTitleClass = 'text-[#0f172a] text-base font-bold mb-3';

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
      updateFormData({
        city_id: 0,
        district_id: undefined,
        neighborhood_id: undefined,
        street_id: undefined,
        metro_station_id: undefined,
        metro_distance: undefined,
      });
    }
  }, [formData.region_id, fetchCities, updateFormData]);

  // Load districts when city changes
  useEffect(() => {
    if (formData.city_id) {
      fetchDistricts(formData.city_id);
      fetchNeighborhoods(formData.city_id);
      fetchStreets(formData.city_id);
      updateFormData({
        district_id: undefined,
        neighborhood_id: undefined,
        street_id: undefined,
        metro_station_id: undefined,
        metro_distance: undefined,
      });
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
      updateFormData({
        city_id: city.id,
        district_id: undefined,
        neighborhood_id: undefined,
        street_id: undefined,
        metro_station_id: undefined,
        metro_distance: undefined,
      });
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

  // Сетка плиток: «Любой/Любая …» для сброса + варианты.
  const districtTile = (selected: boolean, label: string, onSelect: () => void) => (
    <button
      type="button"
      onClick={onSelect}
      className={tileBaseClass}
      style={tileStyle(selected)}
      aria-pressed={selected}
    >
      {label}
    </button>
  );

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
          <h2 className={sectionTitleClass}>Район</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {districtTile(!formData.district_id, 'Любой район', () => handleDistrictChange(undefined))}
            {districts.map((district) => (
              <button
                key={district.id}
                type="button"
                onClick={() => handleDistrictChange(district)}
                className={tileBaseClass}
                style={tileStyle(formData.district_id === district.id)}
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
          <h2 className={sectionTitleClass}>Микрорайон / ЖК</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {districtTile(!formData.neighborhood_id, 'Любой', () => handleNeighborhoodChange(undefined))}
            {neighborhoods.map((neighborhood) => (
              <button
                key={neighborhood.id}
                type="button"
                onClick={() => handleNeighborhoodChange(neighborhood)}
                className={tileBaseClass}
                style={tileStyle(formData.neighborhood_id === neighborhood.id)}
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
          <h2 className={sectionTitleClass}>Улица</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-60 overflow-y-auto">
            {districtTile(!formData.street_id, 'Любая улица', () => handleStreetChange(undefined))}
            {streets.map((street) => (
              <button
                key={street.id}
                type="button"
                onClick={() => handleStreetChange(street)}
                className={tileBaseClass}
                style={tileStyle(formData.street_id === street.id)}
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
        <h2 className={sectionTitleClass}>Точный адрес (дом, корпус, квартира)</h2>
        <input
          type="text"
          value={formData.address || ''}
          onChange={(e) => updateFormData({ address: e.target.value })}
          placeholder="ул. Ленина, д. 10, кв. 5"
          className="w-full px-4 py-3 rounded-xl text-base"
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            color: '#0f172a',
          }}
          maxLength={200}
          autoComplete="off"
        />
        <p className="text-xs mt-1" style={{ color: '#94a3b8' }}>
          Укажите номер дома, корпуса и квартиры для точного расположения на карте
        </p>
      </section>
    </div>
  );
}