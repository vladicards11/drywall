import React from 'react';
import styles from './Sidebar.module.css';
import { MuroForm } from '../form/MuroForm';
import { MurosList } from './MurosList';
import { UnionesPanel } from './UnionesPanel';
import { HistorialPanel } from './HistorialPanel';
import { CielorrasoForm } from '../form/CielorrasoForm';
import type { MuroFormData, FormErrors } from '../../hooks/useCalculadora';
import type { UnionFormData, ProyectoFormData, HistorialItem, CielorrasoFormData } from '../../hooks/useProyecto';
import type { Catalogo, Abertura } from '@drywall-calc/catalog-schemas';

interface SidebarProps {
  // Project management props
  proyecto: ProyectoFormData;
  historial: HistorialItem[];
  onUpdateNombre: (nombre: string) => void;
  onUpdateCatalogoSistema: (sistema: string) => void;
  onGuardarEnHistorial: () => void;
  onCargarDesdeHistorial: (id: string) => void;
  onEliminarDeHistorial: (id: string) => void;
  onImportarProyecto: (datos: ProyectoFormData) => void;
  onAbrirIfcImporter: () => void;

  // Multi-muro project props
  muros: MuroFormData[];
  selectedMuroIdx: number;
  uniones: UnionFormData[];
  onSelectMuro: (idx: number) => void;
  onAddMuro: () => void;
  onDuplicateMuro: (idx: number) => void;
  onRemoveMuro: (idx: number) => void;
  onAddUnion: (u: UnionFormData) => void;
  onRemoveUnion: (id: string) => void;

  // Current wall form
  form: MuroFormData;
  errors: FormErrors;
  catalogo: Catalogo;
  isCalculating: boolean;
  onFieldChange: <K extends keyof MuroFormData>(key: K, value: MuroFormData[K]) => void;
  onAddAbertura: (ab: Abertura) => void;
  onRemoveAbertura: (idx: number) => void;
  onCalcular: () => void;
  onReset: () => void;

  // Cielorrasos props
  cielorrasos: CielorrasoFormData[];
  selectedCielorrasoIdx: number;
  onSelectCielorraso: (idx: number) => void;
  onAddCielorraso: () => void;
  onDuplicateCielorraso: (idx: number) => void;
  onRemoveCielorraso: (idx: number) => void;
  onCielorrasoFieldChange: (key: keyof CielorrasoFormData, val: any) => void;
  currentCielorraso: CielorrasoFormData | null;
  activeElementTab: 'muros' | 'cielorrasos';
  onChangeActiveElementTab: (tab: 'muros' | 'cielorrasos') => void;
}

export const Sidebar: React.FC<SidebarProps> = (props) => {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.header}>
        <div className={styles.logo}>
          <div className={styles.logoBadge}>DW</div>
          <div>
            <h1 className={styles.logoTitle}>Drywall Calc</h1>
            <p className={styles.logoSubtitle}>Motor de cómputo métrico</p>
          </div>
        </div>
      </div>

      {/* BIM / IFC import shortcut */}
      <button
        id="btn-ifc-importer"
        onClick={props.onAbrirIfcImporter}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          width: 'calc(100% - 2rem)',
          margin: '0.5rem 1rem 0',
          padding: '0.55rem 0.9rem',
          background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.10))',
          border: '1px solid rgba(99,102,241,0.35)',
          borderRadius: '10px',
          color: '#818cf8',
          fontSize: '0.83rem',
          fontWeight: 700,
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          textAlign: 'left',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.25)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.10))')}
      >
        <span>🏗️</span>
        <span>Importar desde IFC / BIM</span>
      </button>

      {/* Selector de Pestañas de Elementos (Muros vs Cielorrasos) */}
      <div style={{
        display: 'flex',
        padding: '0.25rem',
        margin: '0.75rem 1rem 0.25rem',
        background: 'rgba(255,255,255,0.03)',
        borderRadius: '10px',
        border: '1px solid rgba(255,255,255,0.05)'
      }}>
        <button
          onClick={() => props.onChangeActiveElementTab('muros')}
          style={{
            flex: 1,
            padding: '0.4rem',
            borderRadius: '8px',
            border: 'none',
            fontSize: '0.8rem',
            fontWeight: 600,
            cursor: 'pointer',
            background: props.activeElementTab === 'muros' ? 'var(--surface-light, #1e293b)' : 'transparent',
            color: props.activeElementTab === 'muros' ? 'var(--accent, #6366f1)' : 'var(--text-secondary, #94a3b8)',
            transition: 'all 0.15s ease'
          }}
        >
          🧱 Muros & Uniones
        </button>
        <button
          onClick={() => props.onChangeActiveElementTab('cielorrasos')}
          style={{
            flex: 1,
            padding: '0.4rem',
            borderRadius: '8px',
            border: 'none',
            fontSize: '0.8rem',
            fontWeight: 600,
            cursor: 'pointer',
            background: props.activeElementTab === 'cielorrasos' ? 'var(--surface-light, #1e293b)' : 'transparent',
            color: props.activeElementTab === 'cielorrasos' ? 'var(--accent, #6366f1)' : 'var(--text-secondary, #94a3b8)',
            transition: 'all 0.15s ease'
          }}
        >
          🌌 Cielorrasos
        </button>
      </div>

      <div className={styles.scrollArea}>
        {/* Gestión de Proyecto y backups siempre visible */}
        <HistorialPanel
          proyecto={props.proyecto}
          historial={props.historial}
          onUpdateNombre={props.onUpdateNombre}
          onUpdateCatalogoSistema={props.onUpdateCatalogoSistema}
          onGuardarEnHistorial={props.onGuardarEnHistorial}
          onCargarDesdeHistorial={props.onCargarDesdeHistorial}
          onEliminarDeHistorial={props.onEliminarDeHistorial}
          onImportarProyecto={props.onImportarProyecto}
        />

        {props.activeElementTab === 'muros' ? (
          <>
            {/* Lista de muros */}
            <MurosList
              muros={props.muros}
              selected={props.selectedMuroIdx}
              onSelect={props.onSelectMuro}
              onAdd={props.onAddMuro}
              onDuplicate={props.onDuplicateMuro}
              onRemove={props.onRemoveMuro}
            />

            {/* Panel de uniones */}
            <UnionesPanel
              muros={props.muros}
              uniones={props.uniones}
              tipologias={props.catalogo.tipologias_union}
              onAdd={props.onAddUnion}
              onRemove={props.onRemoveUnion}
            />

            {/* Formulario del muro activo */}
            <MuroForm
              form={props.form}
              errors={props.errors}
              catalogo={props.catalogo}
              onFieldChange={props.onFieldChange}
              onAddAbertura={props.onAddAbertura}
              onRemoveAbertura={props.onRemoveAbertura}
              onCalcular={props.onCalcular}
              onReset={props.onReset}
              isCalculating={props.isCalculating}
            />
          </>
        ) : (
          <div style={{ padding: '0 1rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Lista de Cielorrasos */}
            <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Elementos Cielorraso</span>
                <button
                  onClick={props.onAddCielorraso}
                  style={{
                    background: 'rgba(99,102,241,0.15)',
                    border: '1px solid rgba(99,102,241,0.3)',
                    borderRadius: '6px',
                    color: '#818cf8',
                    padding: '0.2rem 0.5rem',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  ➕ Añadir
                </button>
              </div>

              {props.cielorrasos.length === 0 ? (
                <div style={{ padding: '1rem', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.01)', borderRadius: '8px' }}>
                  No hay cielorrasos en este proyecto. Haz click en añadir para empezar.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {props.cielorrasos.map((c, i) => (
                    <div
                      key={c.id}
                      onClick={() => props.onSelectCielorraso(i)}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '0.5rem 0.75rem',
                        borderRadius: '8px',
                        background: props.selectedCielorrasoIdx === i ? 'rgba(99,102,241,0.1)' : 'rgba(255,255,255,0.02)',
                        border: `1px solid ${props.selectedCielorrasoIdx === i ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.05)'}`,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <span style={{ fontSize: '0.82rem', fontWeight: 500, color: props.selectedCielorrasoIdx === i ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                        {c.nombre || `Cielorraso #${i + 1}`}
                      </span>
                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        <button
                          onClick={(e) => { e.stopPropagation(); props.onDuplicateCielorraso(i); }}
                          title="Duplicar"
                          style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '0.8rem' }}
                        >
                          📋
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); props.onRemoveCielorraso(i); }}
                          title="Eliminar"
                          style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '0.8rem' }}
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Formulario del cielorraso activo */}
            {props.currentCielorraso && (
              <>
                <CielorrasoForm
                  cielorraso={props.currentCielorraso}
                  idx={props.selectedCielorrasoIdx}
                  catalogo={props.catalogo}
                  onFieldChange={props.onCielorrasoFieldChange}
                />

                {/* Botón Calcular */}
                <button
                  id="btn-calcular-cielorraso"
                  disabled={props.isCalculating}
                  onClick={props.onCalcular}
                  style={{
                    background: 'linear-gradient(135deg, var(--accent, #6366f1) 0%, #4f46e5 100%)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0.65rem',
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(99,102,241,0.2)',
                    transition: 'all 0.15s ease',
                    marginTop: '0.5rem'
                  }}
                >
                  {props.isCalculating ? '⚡ Computando...' : '⚡ Calcular Presupuesto'}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
