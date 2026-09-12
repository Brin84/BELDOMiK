import type { PropertyDetail } from '@/shared/api/types';
import { formatArea } from '@/shared/lib/format';

interface PropertyCharacteristicsProps {
  property: PropertyDetail;
}

type Row = {
  label: string;
  value: string;
};

const RENOVATION_LABELS: Record<string, string> = {
  none: 'Без ремонта',
  needs_renovation: 'Требует ремонта',
  cosmetic: 'Косметический',
  euro: 'Евроремонт',
  designer: 'Дизайнерский',
};

/** Секция «Параметры» — ключевые характеристики объекта. */
function buildParams(p: PropertyDetail): Row[] {
  const rows: Row[] = [];

  if (p.type_name) rows.push({ label: 'Назначение', value: p.type_name });
  if (p.total_area) rows.push({ label: 'Общая площадь', value: formatArea(p.total_area) });
  if (p.living_area) rows.push({ label: 'Жилая площадь', value: formatArea(p.living_area) });
  if (p.kitchen_area) rows.push({ label: 'Площадь кухни', value: formatArea(p.kitchen_area) });
  if (p.rooms_count) rows.push({ label: 'Комнаты', value: `${p.rooms_count}` });
  if (p.floor && p.total_floors) {
    rows.push({ label: 'Этаж', value: `${p.floor} / ${p.total_floors}` });
  } else if (p.floor) {
    rows.push({ label: 'Этаж', value: `${p.floor}` });
  }
  if (p.build_year) rows.push({ label: 'Год постройки', value: `${p.build_year} г.` });
  if (p.renovation) {
    rows.push({
      label: 'Состояние',
      value: RENOVATION_LABELS[p.renovation] || p.renovation,
    });
  }

  return rows;
}

/** Секция «Дополнительно» — особенности и инфраструктура. */
function buildAdditional(p: PropertyDetail): Row[] {
  const rows: Row[] = [];

  if (p.metro_station_name) {
    const distance = p.metro_distance ? ` · ${p.metro_distance} м` : '';
    rows.push({ label: 'Метро', value: `${p.metro_station_name}${distance}` });
  }
  if (p.furniture) rows.push({ label: 'Мебель', value: 'Есть' });
  if (p.balcony_count && p.balcony_count > 0) {
    rows.push({ label: 'Балкон', value: String(p.balcony_count) });
  } else if (p.balcony) {
    // Старые объявления без balcony_count, но с флагом «есть балкон».
    rows.push({ label: 'Балкон / Лоджия', value: 'Есть' });
  }
  if (p.loggia_count && p.loggia_count > 0) {
    rows.push({ label: 'Лоджия', value: String(p.loggia_count) });
  }
  if (p.parking) rows.push({ label: 'Парковка', value: 'Есть' });
  if (p.elevator) rows.push({ label: 'Лифт', value: 'Есть' });
  if (p.is_new_building) rows.push({ label: 'Новостройка', value: 'Да' });
  if (p.agency_id == null) rows.push({ label: 'Без посредников', value: 'Да' });

  return rows;
}

function RowsBlock({ rows }: { rows: Row[] }) {
  if (rows.length === 0) return null;
  return (
    <div className="property-rows">
      {rows.map((row) => (
        <div key={row.label} className="property-rows__row">
          <span className="property-rows__label">{row.label}</span>
          <span className="property-rows__value">{row.value}</span>
        </div>
      ))}
    </div>
  );
}

export function PropertyCharacteristics({ property }: PropertyCharacteristicsProps) {
  const params = buildParams(property);
  const additional = buildAdditional(property);

  return (
    <>
      {params.length > 0 && (
        <section className="property-section">
          <h2 className="property-section__title">Параметры</h2>
          <RowsBlock rows={params} />
        </section>
      )}
      {additional.length > 0 && (
        <section className="property-section">
          <h2 className="property-section__title">Дополнительно</h2>
          <RowsBlock rows={additional} />
        </section>
      )}
    </>
  );
}
