import React from 'react';

export interface Filters {
  categories: string[];
  maxDistance?: number;
  minRating?: number;
  openNow: boolean;
}

interface FiltersBarProps {
  filters: Filters;
  onChange: (filters: Filters) => void;
  onClear: () => void;
}

const CATEGORIES = [
  { id: 'comida', label: 'Comida' },
  { id: 'cultura', label: 'Cultura' },
  { id: 'naturaleza', label: 'Naturaleza' },
  { id: 'vida_nocturna', label: 'Vida Nocturna' },
];

export const FiltersBar: React.FC<FiltersBarProps> = ({ filters, onChange, onClear }) => {
  const toggleCategory = (cat: string) => {
    const updated = filters.categories.includes(cat)
      ? filters.categories.filter((c) => c !== cat)
      : [...filters.categories, cat];
    onChange({ ...filters, categories: updated });
  };

  return (
    <div style={{ marginBottom: '1rem', padding: '0.75rem', background: '#f9fafb', borderRadius: '0.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <h3 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600, color: '#374151' }}>Filtros</h3>
        <button
          onClick={onClear}
          style={{
            padding: '0.25rem 0.75rem',
            fontSize: '0.75rem',
            border: 'none',
            background: 'transparent',
            color: '#3b82f6',
            cursor: 'pointer',
            textDecoration: 'underline',
          }}
        >
          Limpiar
        </button>
      </div>

      <div style={{ marginBottom: '0.75rem' }}>
        <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 500, marginBottom: '0.5rem', color: '#6b7280' }}>
          Categorias
        </label>
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => toggleCategory(cat.id)}
              style={{
                padding: '0.3rem 0.6rem',
                fontSize: '0.7rem',
                border: '1px solid',
                borderColor: filters.categories.includes(cat.id) ? '#3b82f6' : '#d1d5db',
                borderRadius: '9999px',
                background: filters.categories.includes(cat.id) ? '#eff6ff' : 'white',
                color: filters.categories.includes(cat.id) ? '#3b82f6' : '#6b7280',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: '0.75rem' }}>
        <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 500, marginBottom: '0.5rem', color: '#6b7280' }}>
          Distancia maxima: {filters.maxDistance || 10} km
        </label>
        <input
          type="range"
          min="1"
          max="50"
          value={filters.maxDistance || 10}
          onChange={(e) => onChange({ ...filters, maxDistance: Number(e.target.value) })}
          style={{ width: '100%', height: '0.5rem' }}
        />
      </div>

      <div style={{ marginBottom: '0.75rem' }}>
        <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 500, marginBottom: '0.5rem', color: '#6b7280' }}>
          Rating minimo
        </label>
        <select
          value={filters.minRating || 0}
          onChange={(e) => onChange({ ...filters, minRating: Number(e.target.value) })}
          style={{
            width: '100%',
            padding: '0.5rem',
            fontSize: '0.8rem',
            border: '1px solid #d1d5db',
            borderRadius: '0.375rem',
          }}
        >
          <option value={0}>Todos</option>
          <option value={3}>3+ estrellas</option>
          <option value={4}>4+ estrellas</option>
          <option value={4.5}>4.5+ estrellas</option>
        </select>
      </div>

      <div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={filters.openNow}
            onChange={(e) => onChange({ ...filters, openNow: e.target.checked })}
            style={{ width: '1rem', height: '1rem' }}
          />
          Abierto ahora
        </label>
      </div>
    </div>
  );
};

export default FiltersBar;
