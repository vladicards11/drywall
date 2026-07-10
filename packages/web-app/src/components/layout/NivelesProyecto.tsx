/**
 * NivelesProyecto.tsx
 * Panel de configuración manual de pisos/niveles del proyecto.
 * Se activa cuando el IFC no provee IfcBuildingStorey o para proyectos manuales.
 *
 * Permite al usuario definir:
 *   - Nombre del piso (ej: "Planta Baja")
 *   - Elevación de inicio en metros (cota Z)
 *   - Altura libre del piso en metros
 *
 * Los muros sin storey IFC se asignan automáticamente al nivel cuyo rango los contiene.
 */
import React, { useState } from 'react';
import type { NivelProyecto } from '../../hooks/useProyecto';

interface Props {
  niveles: NivelProyecto[];
  onAdd: (n: NivelProyecto) => void;
  onUpdate: (idx: number, n: Partial<NivelProyecto>) => void;
  onRemove: (idx: number) => void;
}

const NOMBRES_PREDEFINIDOS = [
  'Subsuelo',
  'Planta Baja',
  'Primer Piso',
  'Segundo Piso',
  'Tercer Piso',
  'Cuarto Piso',
  'Nivel de Azotea',
];

export function NivelesProyecto({ niveles, onAdd, onUpdate, onRemove }: Props) {
  const [expandido, setExpandido] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevaElevacion, setNuevaElevacion] = useState('0.00');
  const [nuevaAltura, setNuevaAltura] = useState('3.00');

  const handleAdd = () => {
    const nombre = nuevoNombre.trim();
    if (!nombre) return;
    const elevacion = parseFloat(nuevaElevacion);
    const altura = parseFloat(nuevaAltura);
    if (isNaN(elevacion) || isNaN(altura) || altura <= 0) return;

    onAdd({ nombre, elevacionInicioM: elevacion, alturaM: altura });

    // Auto-avanzar para el siguiente piso
    const siguienteElevacion = (elevacion + altura).toFixed(2);
    setNuevoNombre('');
    setNuevaElevacion(siguienteElevacion);
    setNuevaAltura(nuevaAltura);
  };

  const handleNombreRapido = () => {
    // Sugerir el siguiente nombre de la lista
    const usados = new Set(niveles.map((n) => n.nombre));
    const siguiente = NOMBRES_PREDEFINIDOS.find((n) => !usados.has(n)) ?? `Piso ${niveles.length + 1}`;
    setNuevoNombre(siguiente);
  };

  return (
    <details
      open={expandido || niveles.length > 0}
      onToggle={(e) => setExpandido((e.target as HTMLDetailsElement).open)}
      style={{ marginTop: '0.75rem' }}
    >
      <summary style={{
        cursor: 'pointer',
        fontWeight: 600,
        fontSize: '0.8rem',
        color: '#94a3b8',
        listStyle: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.4rem 0',
        userSelect: 'none',
      }}>
        🏗️ Configuración de Niveles / Pisos
        {niveles.length > 0 && (
          <span style={{
            background: 'rgba(99,102,241,0.15)',
            color: '#818cf8',
            fontSize: '0.62rem',
            padding: '1px 6px',
            borderRadius: '99px',
            border: '1px solid rgba(99,102,241,0.3)',
          }}>
            {niveles.length} nivel{niveles.length !== 1 ? 'es' : ''}
          </span>
        )}
      </summary>

      <div style={{ marginTop: '0.6rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {/* Lista de niveles existentes */}
        {niveles.map((n, idx) => (
          <div key={idx} style={{
            display: 'grid',
            gridTemplateColumns: '1fr 80px 80px auto',
            gap: '0.4rem',
            alignItems: 'center',
            background: 'rgba(30, 41, 59, 0.4)',
            borderRadius: '8px',
            padding: '0.4rem 0.6rem',
            border: '1px solid rgba(99,102,241,0.15)',
          }}>
            <input
              value={n.nombre}
              onChange={(e) => onUpdate(idx, { nombre: e.target.value })}
              placeholder="Nombre del piso"
              style={{
                background: 'transparent',
                border: 'none',
                color: '#e2e8f0',
                fontSize: '0.78rem',
                fontWeight: 500,
                outline: 'none',
                width: '100%',
              }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ fontSize: '0.58rem', color: '#64748b' }}>Cota Z (m)</span>
              <input
                type="number"
                step="0.05"
                value={n.elevacionInicioM}
                onChange={(e) => onUpdate(idx, { elevacionInicioM: parseFloat(e.target.value) || 0 })}
                style={{
                  background: 'rgba(15,23,42,0.5)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '4px',
                  color: '#94a3b8',
                  fontSize: '0.75rem',
                  padding: '2px 4px',
                  width: '100%',
                  textAlign: 'center',
                }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ fontSize: '0.58rem', color: '#64748b' }}>Altura (m)</span>
              <input
                type="number"
                step="0.05"
                min="0.5"
                value={n.alturaM}
                onChange={(e) => onUpdate(idx, { alturaM: parseFloat(e.target.value) || 0 })}
                style={{
                  background: 'rgba(15,23,42,0.5)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '4px',
                  color: '#94a3b8',
                  fontSize: '0.75rem',
                  padding: '2px 4px',
                  width: '100%',
                  textAlign: 'center',
                }}
              />
            </div>
            <button
              onClick={() => onRemove(idx)}
              title="Eliminar nivel"
              style={{
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.2)',
                borderRadius: '6px',
                color: '#f87171',
                cursor: 'pointer',
                fontSize: '0.75rem',
                padding: '3px 6px',
                lineHeight: 1,
              }}
            >
              ✕
            </button>
          </div>
        ))}

        {/* Fila de agregar nuevo nivel */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 80px 80px auto',
          gap: '0.4rem',
          alignItems: 'flex-end',
        }}>
          <div>
            <div style={{ fontSize: '0.6rem', color: '#64748b', marginBottom: '2px' }}>Nombre</div>
            <div style={{ position: 'relative' }}>
              <input
                value={nuevoNombre}
                onChange={(e) => setNuevoNombre(e.target.value)}
                onFocus={handleNombreRapido}
                placeholder="ej: Planta Baja"
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                list="nombres-piso-sugeridos"
                style={{
                  background: 'rgba(15,23,42,0.5)',
                  border: '1px solid rgba(99,102,241,0.3)',
                  borderRadius: '6px',
                  color: '#e2e8f0',
                  fontSize: '0.76rem',
                  padding: '4px 8px',
                  width: '100%',
                  outline: 'none',
                }}
              />
              <datalist id="nombres-piso-sugeridos">
                {NOMBRES_PREDEFINIDOS.map((n) => <option key={n} value={n} />)}
              </datalist>
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.6rem', color: '#64748b', marginBottom: '2px' }}>Cota Z (m)</div>
            <input
              type="number"
              step="0.05"
              value={nuevaElevacion}
              onChange={(e) => setNuevaElevacion(e.target.value)}
              style={{
                background: 'rgba(15,23,42,0.5)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '6px',
                color: '#94a3b8',
                fontSize: '0.75rem',
                padding: '4px 6px',
                width: '100%',
                textAlign: 'center',
              }}
            />
          </div>
          <div>
            <div style={{ fontSize: '0.6rem', color: '#64748b', marginBottom: '2px' }}>Altura (m)</div>
            <input
              type="number"
              step="0.05"
              min="0.5"
              value={nuevaAltura}
              onChange={(e) => setNuevaAltura(e.target.value)}
              style={{
                background: 'rgba(15,23,42,0.5)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '6px',
                color: '#94a3b8',
                fontSize: '0.75rem',
                padding: '4px 6px',
                width: '100%',
                textAlign: 'center',
              }}
            />
          </div>
          <button
            onClick={handleAdd}
            disabled={!nuevoNombre.trim()}
            title="Agregar nivel"
            style={{
              background: 'rgba(99,102,241,0.2)',
              border: '1px solid rgba(99,102,241,0.4)',
              borderRadius: '6px',
              color: '#818cf8',
              cursor: 'pointer',
              fontSize: '0.8rem',
              padding: '4px 8px',
              fontWeight: 600,
              opacity: !nuevoNombre.trim() ? 0.4 : 1,
            }}
          >
            + Agregar
          </button>
        </div>

        {/* Ayuda contextual */}
        {niveles.length === 0 && (
          <div style={{
            fontSize: '0.68rem',
            color: '#475569',
            fontStyle: 'italic',
            marginTop: '0.25rem',
            lineHeight: 1.4,
          }}>
            💡 Agrega los pisos de tu proyecto. Los muros sin información de piso IFC
            se asignarán automáticamente según su elevación o altura de muro.
            También puedes editar el campo "Piso" de cada muro individualmente.
          </div>
        )}
        {niveles.length > 0 && (
          <div style={{ fontSize: '0.66rem', color: '#475569', marginTop: '0.1rem' }}>
            🔍 Coberturas: {niveles.map((n) =>
              `${n.nombre} [${n.elevacionInicioM.toFixed(1)}–${(n.elevacionInicioM + n.alturaM).toFixed(1)} m]`
            ).join(' · ')}
          </div>
        )}
      </div>
    </details>
  );
}
