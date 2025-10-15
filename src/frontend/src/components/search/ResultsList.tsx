import React from 'react';

export interface Place {
  id: string;
  name: string;
  category: string;
  lat: number;
  lng: number;
  rating: number;
  address: string;
  distance?: number;
}

interface ResultsListProps {
  results: Place[];
  onViewOnMap?: (id: string) => void;
}

export const ResultsList: React.FC<ResultsListProps> = ({ results, onViewOnMap }) => {
  const categoryLabels: Record<string, string> = {
    comida: 'Comida',
    cultura: 'Cultura',
    naturaleza: 'Naturaleza',
    vida_nocturna: 'Vida Nocturna',
  };

  return (
    <div style={{ height: '100%', overflowY: 'auto' }}>
      {results.length === 0 ? (
        <p style={{ padding: '1rem', color: '#6b7280', textAlign: 'center' }}>
          No se encontraron resultados
        </p>
      ) : (
        results.map((place) => (
          <div
            key={place.id}
            style={{
              padding: '0.75rem',
              marginBottom: '0.5rem',
              background: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '0.5rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
              <div style={{ flex: 1 }}>
                <h4 style={{ margin: '0 0 0.25rem', fontSize: '0.95rem', fontWeight: 600 }}>
                  {place.name}
                </h4>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                  <span
                    style={{
                      padding: '0.125rem 0.5rem',
                      fontSize: '0.7rem',
                      background: '#f3f4f6',
                      color: '#374151',
                      borderRadius: '0.25rem',
                    }}
                  >
                    {categoryLabels[place.category] || place.category}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: '#f59e0b' }}>
                    {place.rating.toFixed(1)} estrellas
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#6b7280' }}>{place.address}</p>
                {place.distance !== undefined && (
                  <p style={{ margin: '0.25rem 0 0', fontSize: '0.7rem', color: '#9ca3af' }}>
                    {place.distance.toFixed(1)} km
                  </p>
                )}
              </div>
              <button
                onClick={() => onViewOnMap?.(place.id)}
                style={{
                  padding: '0.4rem 0.6rem',
                  border: '1px solid #3b82f6',
                  background: '#eff6ff',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  borderRadius: '0.375rem',
                  color: '#3b82f6',
                  fontWeight: '500',
                }}
              >
                Ver en mapa
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default ResultsList;
