import React, { useState } from 'react';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import type { MuroFormData, FormErrors } from '../../hooks/useCalculadora';
import type { Catalogo, Abertura } from '@drywall-calc/catalog-schemas';
import styles from './MuroForm.module.css';

interface MuroFormProps {
  form: MuroFormData;
  errors: FormErrors;
  catalogo: Catalogo;
  onFieldChange: <K extends keyof MuroFormData>(key: K, value: MuroFormData[K]) => void;
  onAddAbertura: (ab: Abertura) => void;
  onRemoveAbertura: (idx: number) => void;
  onCalcular: () => void;
  onReset: () => void;
  isCalculating: boolean;
}

const TIPO_ABERTURA_OPTIONS = [
  { value: 'puerta', label: '🚪 Puerta' },
  { value: 'ventana', label: '🪟 Ventana' },
  { value: 'pase', label: '↔ Pase libre' },
];

const EMPTY_ABERTURA = {
  tipo: 'puerta' as const,
  ancho_m: '0.90',
  alto_m: '2.10',
  distancia_desde_inicio_m: '0.30',
};

export const MuroForm: React.FC<MuroFormProps> = ({
  form,
  errors,
  catalogo,
  onFieldChange,
  onAddAbertura,
  onRemoveAbertura,
  onCalcular,
  onReset,
  isCalculating,
}) => {
  const [newAb, setNewAb] = useState(EMPTY_ABERTURA);
  const [addingAb, setAddingAb] = useState(false);

  // Build select options from catalog
  const perfilOptions = catalogo.perfiles.montante.map((p) => ({
    value: p.codigo,
    label: `${p.codigo} (${p.ancho_mm}mm, ${p.largo_barra_m}m)`,
  }));
  const rielOptions = catalogo.perfiles.riel.map((r) => ({
    value: r.codigo,
    label: `${r.codigo} (${r.ancho_mm}mm)`,
  }));
  const placaOptions = catalogo.placas.map((p) => ({
    value: p.tipo,
    label: `${p.tipo} — ${p.nombre} (${p.espesor_mm}mm, ${p.peso_kg_m2} kg/m²)`,
  }));

  const selectedPlaca = catalogo.placas.find((p) => p.tipo === form.placa_tipo);
  const formatoOptions = (selectedPlaca?.formatos_m ?? [[1.2, 2.4]]).map(([w, h]) => ({
    value: `${w}x${h}`,
    label: `${w.toFixed(2)} × ${h.toFixed(2)} m`,
  }));

  const separacionOptions = catalogo.perfiles.separaciones_permitidas_m.map((s) => ({
    value: s,
    label: `${s * 100} cm`,
  }));

  const hasErrors = Object.keys(errors).length > 0;

  const handleAddAbertura = () => {
    onAddAbertura({
      tipo: newAb.tipo as 'puerta' | 'ventana' | 'pase',
      ancho_m: parseFloat(newAb.ancho_m),
      alto_m: parseFloat(newAb.alto_m),
      distancia_desde_inicio_m: parseFloat(newAb.distancia_desde_inicio_m),
    });
    setNewAb(EMPTY_ABERTURA);
    setAddingAb(false);
  };

  return (
    <div className={styles.form}>

      {/* === GEOMETRÍA === */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>
          <span className={styles.sectionIcon}>📐</span>
          Geometría del muro
        </h3>
        <div className={styles.row2}>
          <Input
            id="largo_m"
            label="Largo"
            type="number"
            step="0.01"
            min="0.1"
            max="50"
            suffix="m"
            value={form.largo_m}
            onChange={(e) => onFieldChange('largo_m', e.target.value)}
            error={errors.largo_m}
            required
          />
          <Input
            id="alto_m"
            label="Alto"
            type="number"
            step="0.01"
            min="0.1"
            max="15"
            suffix="m"
            value={form.alto_m}
            onChange={(e) => onFieldChange('alto_m', e.target.value)}
            error={errors.alto_m}
            required
          />
        </div>
      </section>

      {/* === SISTEMA CONSTRUCTIVO === */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>
          <span className={styles.sectionIcon}>🏗️</span>
          Sistema constructivo
        </h3>

        <div className={styles.row2}>
          <Select
            id="estructura"
            label="Estructura"
            value={form.estructura}
            onChange={(e) => onFieldChange('estructura', e.target.value as 'simple' | 'doble')}
            options={[
              { value: 'simple', label: 'Simple' },
              { value: 'doble', label: 'Doble' },
            ]}
          />
          <Select
            id="caras"
            label="Caras"
            value={form.caras}
            onChange={(e) => onFieldChange('caras', parseInt(e.target.value) as 1 | 2)}
            options={[
              { value: 1, label: '1 cara' },
              { value: 2, label: '2 caras' },
            ]}
          />
        </div>

        <div className={styles.row2}>
          <Select
            id="perfil"
            label="Montante (perfil)"
            value={form.perfil}
            onChange={(e) => onFieldChange('perfil', e.target.value)}
            options={perfilOptions}
          />
          <Select
            id="riel"
            label="Riel"
            value={form.riel}
            onChange={(e) => onFieldChange('riel', e.target.value)}
            options={rielOptions}
          />
        </div>

        <div className={styles.row2}>
          <Select
            id="separacion"
            label="Separación de montantes"
            value={form.separacion_montante_m}
            onChange={(e) => onFieldChange('separacion_montante_m', parseFloat(e.target.value))}
            options={separacionOptions}
          />
          <Select
            id="capas"
            label="Capas por cara"
            value={form.capas_por_cara}
            onChange={(e) => onFieldChange('capas_por_cara', parseInt(e.target.value))}
            options={[
              { value: 1, label: '1 capa' },
              { value: 2, label: '2 capas' },
            ]}
          />
        </div>
      </section>

      {/* === PLACA === */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>
          <span className={styles.sectionIcon}>🟦</span>
          Placa
        </h3>

        <Select
          id="placa_tipo"
          label="Tipo de placa"
          value={form.placa_tipo}
          onChange={(e) => {
            const tipo = e.target.value;
            onFieldChange('placa_tipo', tipo);
            const p = catalogo.placas.find((pl) => pl.tipo === tipo);
            if (p) {
              onFieldChange('placa_espesor_mm', p.espesor_mm);
              const fmt = p.formatos_m[0];
              onFieldChange('placa_formato', `${fmt[0]}x${fmt[1]}`);
            }
          }}
          options={placaOptions}
        />

        <div className={styles.row2}>
          <Select
            id="placa_formato"
            label="Formato"
            value={form.placa_formato}
            onChange={(e) => onFieldChange('placa_formato', e.target.value)}
            options={formatoOptions}
          />
          <Select
            id="placa_orientacion"
            label="Orientación"
            value={form.placa_orientacion}
            onChange={(e) => onFieldChange('placa_orientacion', e.target.value as 'vertical' | 'horizontal')}
            options={[
              { value: 'vertical', label: 'Vertical (parada)' },
              { value: 'horizontal', label: 'Horizontal (acostada)' },
            ]}
          />
        </div>

        {selectedPlaca && (
          <div className={styles.placaInfo}>
            <span className="text-muted" style={{ fontSize: 'var(--text-xs)' }}>
              Espesor: <strong>{selectedPlaca.espesor_mm} mm</strong> · Peso: <strong>{selectedPlaca.peso_kg_m2} kg/m²</strong>
            </span>
          </div>
        )}
      </section>

      {/* === ABERTURAS === */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}>🪟</span>
            Aberturas
            {form.aberturas.length > 0 && (
              <Badge variant="primary">{form.aberturas.length}</Badge>
            )}
          </h3>
          {!addingAb && (
            <Button
              id="btn-add-abertura"
              variant="ghost"
              size="sm"
              onClick={() => setAddingAb(true)}
              icon={<span>+</span>}
            >
              Agregar
            </Button>
          )}
        </div>

        {errors.aberturas && (
          <p className={styles.aberturaError}>⚠ {errors.aberturas}</p>
        )}

        {/* List of existing aberturas */}
        {form.aberturas.length > 0 && (
          <div className={styles.aberturasList}>
            {form.aberturas.map((ab, idx) => (
              <div key={idx} className={styles.aberturaItem}>
                <div className={styles.aberturaInfo}>
                  <Badge variant="default">
                    {ab.tipo === 'puerta' ? '🚪' : ab.tipo === 'ventana' ? '🪟' : '↔'}
                    {' '}{ab.tipo}
                  </Badge>
                  <span className="text-secondary" style={{ fontSize: 'var(--text-xs)' }}>
                    {ab.ancho_m.toFixed(2)}m × {ab.alto_m.toFixed(2)}m, desde {ab.distancia_desde_inicio_m.toFixed(2)}m
                  </span>
                </div>
                <Button
                  id={`btn-remove-ab-${idx}`}
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemoveAbertura(idx)}
                  title="Eliminar abertura"
                >
                  ✕
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Add abertura panel */}
        {addingAb && (
          <div className={styles.addAberturaPanel}>
            <Select
              id="nueva_ab_tipo"
              label="Tipo"
              value={newAb.tipo}
              onChange={(e) => setNewAb((p) => ({ ...p, tipo: e.target.value as any }))}
              options={TIPO_ABERTURA_OPTIONS}
            />
            <div className={styles.row3}>
              <Input
                id="nueva_ab_ancho"
                label="Ancho"
                type="number"
                step="0.01"
                min="0.1"
                suffix="m"
                value={newAb.ancho_m}
                onChange={(e) => setNewAb((p) => ({ ...p, ancho_m: e.target.value }))}
              />
              <Input
                id="nueva_ab_alto"
                label="Alto"
                type="number"
                step="0.01"
                min="0.1"
                suffix="m"
                value={newAb.alto_m}
                onChange={(e) => setNewAb((p) => ({ ...p, alto_m: e.target.value }))}
              />
              <Input
                id="nueva_ab_dist"
                label="Desde inicio"
                type="number"
                step="0.01"
                min="0"
                suffix="m"
                value={newAb.distancia_desde_inicio_m}
                onChange={(e) => setNewAb((p) => ({ ...p, distancia_desde_inicio_m: e.target.value }))}
              />
            </div>
            <div className={styles.addAberturaActions}>
              <Button id="btn-confirm-ab" variant="secondary" size="sm" onClick={handleAddAbertura}>
                Confirmar abertura
              </Button>
              <Button id="btn-cancel-ab" variant="ghost" size="sm" onClick={() => setAddingAb(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </section>

      {/* === ACTIONS === */}
      <div className={styles.actions}>
        <Button
          id="btn-calcular"
          variant="primary"
          size="lg"
          onClick={onCalcular}
          loading={isCalculating}
          disabled={hasErrors}
          style={{ flex: 1 }}
        >
          Calcular materiales
        </Button>
        <Button
          id="btn-reset"
          variant="ghost"
          size="lg"
          onClick={onReset}
          title="Reiniciar formulario"
        >
          ↺
        </Button>
      </div>
    </div>
  );
};
