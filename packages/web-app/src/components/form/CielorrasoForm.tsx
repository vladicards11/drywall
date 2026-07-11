import React from 'react';
import type { Catalogo } from '@drywall-calc/catalog-schemas';
import type { CielorrasoFormData } from '../../hooks/useProyecto';

interface CielorrasoFormProps {
  cielorraso: CielorrasoFormData;
  idx: number;
  catalogo: Catalogo;
  onFieldChange: (key: keyof CielorrasoFormData, value: any) => void;
}

export const CielorrasoForm: React.FC<CielorrasoFormProps> = ({
  cielorraso,
  catalogo,
  onFieldChange,
}) => {
  // Opciones de perfiles y placas derivadas del catálogo
  const omegas = catalogo.perfiles.omega || [];
  const angulares = catalogo.perfiles.angular || [];
  const montantes = catalogo.perfiles.montante || [];
  const placas = catalogo.placas || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary, #f8fafc)', margin: 0 }}>
        Configuración de Cielorraso
      </h3>

      {/* Nombre */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
        <label style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary, #94a3b8)' }}>
          Nombre de Obra / Cielorraso
        </label>
        <input
          type="text"
          value={cielorraso.nombre}
          onChange={(e) => onFieldChange('nombre', e.target.value)}
          style={{
            background: 'var(--surface-light, #0f172a)',
            border: '1px solid var(--border, rgba(255,255,255,0.1))',
            borderRadius: '8px',
            padding: '0.5rem 0.75rem',
            color: 'var(--text-primary, #f8fafc)',
            outline: 'none',
          }}
        />
      </div>

      {/* Geometría 2D */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <label style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary, #94a3b8)' }}>
            Largo (m)
          </label>
          <input
            type="number"
            step="0.05"
            min="0.1"
            value={cielorraso.largo_m}
            onChange={(e) => onFieldChange('largo_m', e.target.value)}
            style={{
              background: 'var(--surface-light, #0f172a)',
              border: '1px solid var(--border, rgba(255,255,255,0.1))',
              borderRadius: '8px',
              padding: '0.5rem 0.75rem',
              color: 'var(--text-primary, #f8fafc)',
              outline: 'none',
            }}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <label style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary, #94a3b8)' }}>
            Ancho (m)
          </label>
          <input
            type="number"
            step="0.05"
            min="0.1"
            value={cielorraso.ancho_m}
            onChange={(e) => onFieldChange('ancho_m', e.target.value)}
            style={{
              background: 'var(--surface-light, #0f172a)',
              border: '1px solid var(--border, rgba(255,255,255,0.1))',
              borderRadius: '8px',
              padding: '0.5rem 0.75rem',
              color: 'var(--text-primary, #f8fafc)',
              outline: 'none',
            }}
          />
        </div>
      </div>

      {/* Tipo de Suspensión */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
        <label style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary, #94a3b8)' }}>
          Estructura de Cielorraso
        </label>
        <select
          value={cielorraso.tipo_estructura}
          onChange={(e) => onFieldChange('tipo_estructura', e.target.value)}
          style={{
            background: 'var(--surface-light, #0f172a)',
            border: '1px solid var(--border, rgba(255,255,255,0.1))',
            borderRadius: '8px',
            padding: '0.5rem 0.75rem',
            color: 'var(--text-primary, #f8fafc)',
            outline: 'none',
          }}
        >
          <option value="omega">Fijo (Unidireccional Omega)</option>
          <option value="suspendido">Suspendido (Bidireccional Doble Nivel)</option>
        </select>
      </div>

      {/* Perfiles de Soporte */}
      <div style={{ border: '1px solid rgba(255,255,255,0.05)', borderRadius: '10px', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', background: 'rgba(255,255,255,0.01)' }}>
        <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent, #6366f1)', margin: 0 }}>
          ⚙️ Modulación y Perfiles
        </h4>

        {/* Perfil Secundario */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary, #94a3b8)' }}>
            Perfil Secundario (Omegas/Montantes)
          </label>
          <select
            value={cielorraso.perfil_secundario}
            onChange={(e) => onFieldChange('perfil_secundario', e.target.value)}
            style={{
              background: 'var(--surface-light, #0f172a)',
              border: '1px solid var(--border, rgba(255,255,255,0.1))',
              borderRadius: '6px',
              padding: '0.4rem 0.6rem',
              color: 'var(--text-primary, #f8fafc)',
              fontSize: '0.85rem',
            }}
          >
            {omegas.map((o) => (
              <option key={o.codigo} value={o.codigo}>{o.codigo} (Omega {o.ancho_mm}mm)</option>
            ))}
            {montantes.map((m) => (
              <option key={m.codigo} value={m.codigo}>{m.codigo} (Montante {m.ancho_mm}mm)</option>
            ))}
          </select>
        </div>

        {/* Separación Secundario */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary, #94a3b8)' }}>
            Separación de Secundarios (m)
          </label>
          <select
            value={cielorraso.separacion_secundario_m}
            onChange={(e) => onFieldChange('separacion_secundario_m', parseFloat(e.target.value))}
            style={{
              background: 'var(--surface-light, #0f172a)',
              border: '1px solid var(--border, rgba(255,255,255,0.1))',
              borderRadius: '6px',
              padding: '0.4rem 0.6rem',
              color: 'var(--text-primary, #f8fafc)',
              fontSize: '0.85rem',
            }}
          >
            <option value={0.40}>0.40 m (Recomendado)</option>
            <option value={0.50}>0.50 m</option>
            <option value={0.60}>0.60 m</option>
          </select>
        </div>

        {/* Parámetros Específicos Suspendidos */}
        {cielorraso.tipo_estructura === 'suspendido' && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary, #94a3b8)' }}>
                Perfil Principal (Portante superior)
              </label>
              <select
                value={cielorraso.perfil_principal}
                onChange={(e) => onFieldChange('perfil_principal', e.target.value)}
                style={{
                  background: 'var(--surface-light, #0f172a)',
                  border: '1px solid var(--border, rgba(255,255,255,0.1))',
                  borderRadius: '6px',
                  padding: '0.4rem 0.6rem',
                  color: 'var(--text-primary, #f8fafc)',
                  fontSize: '0.85rem',
                }}
              >
                {montantes.map((m) => (
                  <option key={m.codigo} value={m.codigo}>{m.codigo} (Montante {m.ancho_mm}mm)</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary, #94a3b8)' }}>
                Separación de Principales (m)
              </label>
              <input
                type="number"
                step="0.05"
                min="0.5"
                value={cielorraso.separacion_principal_m}
                onChange={(e) => onFieldChange('separacion_principal_m', parseFloat(e.target.value))}
                style={{
                  background: 'var(--surface-light, #0f172a)',
                  border: '1px solid var(--border, rgba(255,255,255,0.1))',
                  borderRadius: '6px',
                  padding: '0.4rem 0.6rem',
                  color: 'var(--text-primary, #f8fafc)',
                  fontSize: '0.85rem',
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary, #94a3b8)' }}>
                Distancia entre Colgadores (m)
              </label>
              <input
                type="number"
                step="0.05"
                min="0.5"
                value={cielorraso.distancia_cuelgue_m}
                onChange={(e) => onFieldChange('distancia_cuelgue_m', parseFloat(e.target.value))}
                style={{
                  background: 'var(--surface-light, #0f172a)',
                  border: '1px solid var(--border, rgba(255,255,255,0.1))',
                  borderRadius: '6px',
                  padding: '0.4rem 0.6rem',
                  color: 'var(--text-primary, #f8fafc)',
                  fontSize: '0.85rem',
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary, #94a3b8)' }}>
                Altura de Suspensión (m)
              </label>
              <input
                type="number"
                step="0.05"
                min="0.1"
                value={cielorraso.altura_suspension_m}
                onChange={(e) => onFieldChange('altura_suspension_m', e.target.value)}
                style={{
                  background: 'var(--surface-light, #0f172a)',
                  border: '1px solid var(--border, rgba(255,255,255,0.1))',
                  borderRadius: '6px',
                  padding: '0.4rem 0.6rem',
                  color: 'var(--text-primary, #f8fafc)',
                  fontSize: '0.85rem',
                }}
              />
            </div>
          </>
        )}

        {/* Perfil Perimetral */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary, #94a3b8)' }}>
            Perfil Perimetral (Angular)
          </label>
          <select
            value={cielorraso.perfil_perimetral}
            onChange={(e) => onFieldChange('perfil_perimetral', e.target.value)}
            style={{
              background: 'var(--surface-light, #0f172a)',
              border: '1px solid var(--border, rgba(255,255,255,0.1))',
              borderRadius: '6px',
              padding: '0.4rem 0.6rem',
              color: 'var(--text-primary, #f8fafc)',
              fontSize: '0.85rem',
            }}
          >
            {angulares.map((a) => (
              <option key={a.codigo} value={a.codigo}>{a.codigo} (Angular {a.ancho_mm}mm)</option>
            ))}
            {/* Fallback en caso de que no haya angulares en el catálogo custom */}
            {angulares.length === 0 && (
              <option value="ANG25">ANG25 (Angular Estándar 25mm)</option>
            )}
          </select>
        </div>
      </div>

      {/* Placa y Planchas */}
      <div style={{ border: '1px solid rgba(255,255,255,0.05)', borderRadius: '10px', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', background: 'rgba(255,255,255,0.01)' }}>
        <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent, #6366f1)', margin: 0 }}>
          📄 Placas de Revestimiento
        </h4>

        {/* Tipo de Placa */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary, #94a3b8)' }}>
            Tipo de Placa
          </label>
          <select
            value={cielorraso.placa_tipo}
            onChange={(e) => onFieldChange('placa_tipo', e.target.value)}
            style={{
              background: 'var(--surface-light, #0f172a)',
              border: '1px solid var(--border, rgba(255,255,255,0.1))',
              borderRadius: '6px',
              padding: '0.4rem 0.6rem',
              color: 'var(--text-primary, #f8fafc)',
              fontSize: '0.85rem',
            }}
          >
            {placas.map((p) => (
              <option key={`${p.tipo}-${p.espesor_mm}`} value={p.tipo}>
                {p.nombre} ({p.tipo})
              </option>
            ))}
          </select>
        </div>

        {/* Espesor de Placa */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary, #94a3b8)' }}>
            Espesor de Placa (mm)
          </label>
          <select
            value={cielorraso.placa_espesor_mm}
            onChange={(e) => onFieldChange('placa_espesor_mm', parseFloat(e.target.value))}
            style={{
              background: 'var(--surface-light, #0f172a)',
              border: '1px solid var(--border, rgba(255,255,255,0.1))',
              borderRadius: '6px',
              padding: '0.4rem 0.6rem',
              color: 'var(--text-primary, #f8fafc)',
              fontSize: '0.85rem',
            }}
          >
            <option value={9.5}>9.5 mm (Recomendado cielos)</option>
            <option value={12.5}>12.5 mm (Estándar)</option>
            <option value={15.0}>15.0 mm</option>
          </select>
        </div>

        {/* Orientación */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary, #94a3b8)' }}>
            Orientación de Placas
          </label>
          <select
            value={cielorraso.placa_orientacion}
            onChange={(e) => onFieldChange('placa_orientacion', e.target.value)}
            style={{
              background: 'var(--surface-light, #0f172a)',
              border: '1px solid var(--border, rgba(255,255,255,0.1))',
              borderRadius: '6px',
              padding: '0.4rem 0.6rem',
              color: 'var(--text-primary, #f8fafc)',
              fontSize: '0.85rem',
            }}
          >
            <option value="vertical">Cruzada a perfiles (Técnico)</option>
            <option value="horizontal">Paralela a perfiles</option>
          </select>
        </div>
      </div>
    </div>
  );
};
