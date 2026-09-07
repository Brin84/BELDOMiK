import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, ChevronRight, MapPin, Search } from 'lucide-react';
import { useHaptics } from '@/shared/lib/haptics';
import { useGeographyStore } from '@/features/geography/geographyStore';
import { usePropertiesStore } from '@/features/properties/propertiesStore';
import type { City, Region } from '@/shared/api/types';

import './AllBelarusPage.css';

/**
 * Вкладка «Все Беларусь» — выбор области и города в стиле проекта
 * (Baraholka/Krisha, как каталог и шторка города). Выбор применяет
 * фильтр в propertiesStore и ведёт на страницу поиска с результатами.
 * Уровни: список областей → города области (дрилл-даун).
 */
export function AllBelarusPage() {
  const { trigger } = useHaptics();
  const navigate = useNavigate();
  const { regions, cities, fetchRegions, fetchAllCities } = useGeographyStore();
  const { filters, setRegion, setCity, setFilters } = usePropertiesStore();

  // Локальный дрилл-даун: null — список областей, иначе города области.
  const [drillRegion, setDrillRegion] = useState<Region | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    fetchRegions();
  }, [fetchRegions]);

  // Полный список городов (включая пользовательские без региона) — как в
  // шторке выбора города: guard в store пропускает повторную загрузку.
  useEffect(() => {
    fetchAllCities();
  }, [fetchAllCities]);

  const trimmedQuery = query.trim().toLowerCase();

  const sortedRegions = useMemo(
    () => [...regions].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
    [regions],
  );

  const regionCityCount = useMemo(() => {
    const counts = new Map<number, number>();
    for (const c of cities) {
      if (c.region_id != null) counts.set(c.region_id, (counts.get(c.region_id) ?? 0) + 1);
    }
    return counts;
  }, [cities]);

  const regionNameById = useMemo(() => {
    const m = new Map<number, string>();
    for (const r of regions) m.set(r.id, r.name);
    return m;
  }, [regions]);

  const filteredRegions = useMemo(
    () => (trimmedQuery ? sortedRegions.filter((r) => r.name.toLowerCase().includes(trimmedQuery)) : sortedRegions),
    [sortedRegions, trimmedQuery],
  );

  // Города области в дрилл-дауне (с учётом поиска).
  const drillCities = useMemo(() => {
    if (!drillRegion) return [];
    const list = cities.filter((c) => c.region_id === drillRegion.id);
    return trimmedQuery ? list.filter((c) => c.name.toLowerCase().includes(trimmedQuery)) : list;
  }, [cities, drillRegion, trimmedQuery]);

  // Совпадения городов по запросу на уровне списка областей
  // (позволяет найти город сразу, не заходя в область).
  const fullCityMatches = useMemo(() => {
    if (!trimmedQuery || drillRegion) return [];
    return cities.filter((c) => c.name.toLowerCase().includes(trimmedQuery));
  }, [cities, trimmedQuery, drillRegion]);

  const currentCity = filters.city_id != null ? cities.find((c) => c.id === filters.city_id) : undefined;
  const noLocationActive = filters.region_id == null && filters.city_id == null;

  const regionActive = (r: Region): boolean =>
    filters.region_id === r.id || (currentCity != null && currentCity.region_id === r.id);

  const selectAll = () => {
    trigger('selection');
    // setRegion(undefined) каскадом не очищает city_id (каскад срабатывает
    // только при не-undefined region_id), поэтому сбрасываем оба поля явно.
    setFilters({ region_id: undefined, city_id: undefined });
    navigate('/search');
  };

  const selectRegion = (r: Region) => {
    trigger('selection');
    setRegion(r.id);
    navigate('/search');
  };

  const selectCity = (c: City) => {
    trigger('selection');
    setCity(c.id);
    navigate('/search');
  };

  const clearQuery = () => {
    trigger('light');
    setQuery('');
  };

  return (
    <div className="belarus-page">
      <main className="belarus-page__inner">
        {/* Шапка */}
        <header className="belarus-header">
          <h1 className="belarus-header__title">Все Беларусь</h1>
          <p className="belarus-header__subtitle">Выберите область и город</p>
        </header>

        {/* Поиск области/города */}
        <div className="belarus-search">
          <Search size={20} className="belarus-search__icon" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={drillRegion ? 'Поиск города' : 'Поиск области или города'}
            className="belarus-search__input"
            autoComplete="off"
            enterKeyHint="search"
            aria-label="Поиск населённого пункта"
          />
          {query && (
            <button
              type="button"
              onClick={clearQuery}
              className="belarus-search__clear"
              aria-label="Очистить поиск"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>

        {drillRegion ? (
          <>
            {/* Шапка дрилл-дауна: назад к списку областей */}
            <div className="belarus-drill-head">
              <button
                type="button"
                onClick={() => {
                  trigger('light');
                  setDrillRegion(null);
                  setQuery('');
                }}
                className="belarus-drill-head__back"
                aria-label="Назад к списку областей"
              >
                <ArrowLeft size={20} strokeWidth={2.5} />
              </button>
              <h2 className="belarus-drill-head__title">{drillRegion.name}</h2>
            </div>

            {/* Выбор всей области целиком */}
            <button
              type="button"
              onClick={() => selectRegion(drillRegion)}
              className={`belarus-row ${filters.region_id === drillRegion.id ? 'belarus-row--active' : ''}`}
              aria-pressed={filters.region_id === drillRegion.id}
            >
              <span className="belarus-row__label">
                <MapPin size={18} className="belarus-row__pin" />
                Вся область
              </span>
              {filters.region_id === drillRegion.id && <Check size={20} strokeWidth={2.5} />}
            </button>

            <h3 className="belarus-section__title">Города и деревни</h3>
            {drillCities.length === 0 && trimmedQuery.length > 0 ? (
              <p className="belarus-empty">«{trimmedQuery}» нет в области «{drillRegion.name}»</p>
            ) : (
              drillCities.map((city) => {
                const isSelected = filters.city_id === city.id;
                return (
                  <button
                    key={city.id}
                    type="button"
                    onClick={() => selectCity(city)}
                    className={`belarus-row ${isSelected ? 'belarus-row--active' : ''}`}
                    aria-pressed={isSelected}
                  >
                    <span className="belarus-row__label">{city.name}</span>
                    {isSelected ? (
                      <Check size={20} strokeWidth={2.5} />
                    ) : (
                      <ChevronRight size={18} className="belarus-row__chevron" />
                    )}
                  </button>
                );
              })
            )}
          </>
        ) : (
          <>
            {/* Вся Беларусь — очистить локацию */}
            <button
              type="button"
              onClick={selectAll}
              className={`belarus-row ${noLocationActive ? 'belarus-row--active' : ''}`}
              aria-pressed={noLocationActive}
            >
              <span className="belarus-row__label">
                <MapPin size={18} className="belarus-row__pin" />
                Вся Беларусь
              </span>
              {noLocationActive && <Check size={20} strokeWidth={2.5} />}
            </button>

            <h3 className="belarus-section__title">Области</h3>
            {filteredRegions.map((region) => {
              const count = regionCityCount.get(region.id) ?? 0;
              const isActive = regionActive(region);
              return (
                <button
                  key={region.id}
                  type="button"
                  onClick={() => {
                    trigger('selection');
                    setDrillRegion(region);
                    setQuery('');
                  }}
                  className={`belarus-row ${isActive ? 'belarus-row--active' : ''}`}
                  aria-pressed={isActive}
                >
                  <span className="belarus-row__label">{region.name}</span>
                  <span className="belarus-row__meta">
                    {count > 0 && <span className="belarus-row__count">{count}</span>}
                    <ChevronRight size={18} className="belarus-row__chevron" />
                  </span>
                </button>
              );
            })}

            {/* Прямые совпадения городов по запросу */}
            {fullCityMatches.length > 0 && (
              <>
                <h3 className="belarus-section__title">Города</h3>
                {fullCityMatches.map((city) => {
                  const isSelected = filters.city_id === city.id;
                  const regionName = city.region_id != null ? regionNameById.get(city.region_id) : undefined;
                  return (
                    <button
                      key={city.id}
                      type="button"
                      onClick={() => selectCity(city)}
                      className={`belarus-row ${isSelected ? 'belarus-row--active' : ''}`}
                      aria-pressed={isSelected}
                    >
                      <span className="belarus-row__label">
                        {city.name}
                        {regionName && (
                          <span className="belarus-row__sub">{regionName}</span>
                        )}
                      </span>
                      {isSelected ? (
                        <Check size={20} strokeWidth={2.5} />
                      ) : (
                        <ChevronRight size={18} className="belarus-row__chevron" />
                      )}
                    </button>
                  );
                })}
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}