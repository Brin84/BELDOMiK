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

/** Заголовок секции по типу объекта (Kufar: «О квартире», «О доме»…). */
function sectionTitle(typeName?: string | null): string {
  const t = (typeName || '').toLowerCase();
  if (t.includes('квартир')) return 'О квартире';
  if (t.includes('комнат')) return 'О комнате';
  if (t.includes('дом')) return 'О доме';
  if (t.includes('участок')) return 'Об участке';
  if (t.includes('коммер') || t.includes('офис') || t.includes('помещен')) return 'О помещении';
  if (t.includes('гараж')) return 'О гараже';
  return 'Характеристики';
}

/** Ключевые параметры объекта. */
function buildParams(p: PropertyDetail): Row[] {
  const rows: Row[] = [];

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

/** Инфраструктура и дополнительные условия. */
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
    rows.push({ label: 'Балкон / Лоджия', value: 'Есть' });
  }
  if (p.loggia_count && p.loggia_count > 0) {
    rows.push({ label: 'Лоджия', value: String(p.loggia_count) });
  }
  if (p.parking) rows.push({ label: 'Парковка', value: 'Есть' });
  if (p.elevator) rows.push({ label: 'Лифт', value: 'Есть' });

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
          <h2 className="property-section__title">{sectionTitle(property.type_name)}</h2>
          <RowsBlock rows={params} />
        </section>
      )}
      {additional.length > 0 && (
        <section className="property-section">
          <h2 className="property-section__title">Общие характеристики</h2>
          <RowsBlock rows={additional} />
        </section>
      )}
    </>
  );
}