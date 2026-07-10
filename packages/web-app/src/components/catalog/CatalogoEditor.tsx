import React, { useState, useEffect } from 'react';
import styles from './CatalogoEditor.module.css';
import { CatalogoSchema } from '@drywall-calc/catalog-schemas';
import type { Catalogo } from '@drywall-calc/catalog-schemas';

interface CatalogoEditorProps {
  catalogo: Catalogo;
  onUpdateCustomCatalogo: (nuevoCatalogo: Catalogo) => void;
  cargarCatalogoExterno: (datos: unknown) => { success: boolean; error?: string };
}

type SectionKey = 'general' | 'perfiles' | 'placas' | 'tornillos' | 'insumos' | 'aislante';

export const CatalogoEditor: React.FC<CatalogoEditorProps> = ({
  catalogo,
  onUpdateCustomCatalogo,
  cargarCatalogoExterno,
}) => {
  const [draft, setDraft] = useState<Catalogo>(() => JSON.parse(JSON.stringify(catalogo)));
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [activeSection, setActiveSection] = useState<SectionKey>('general');
  const [appliedSuccess, setAppliedSuccess] = useState(false);
  const [importError, setImportError] = useState('');

  // Sync draft when parent catalog changes (e.g. catalog switched in dropdown)
  useEffect(() => {
    setDraft(JSON.parse(JSON.stringify(catalogo)));
    setValidationErrors([]);
    setAppliedSuccess(false);
    setImportError('');
  }, [catalogo]);

  // Run Zod validation on draft changes
  useEffect(() => {
    const result = CatalogoSchema.safeParse(draft);
    if (result.success) {
      setValidationErrors([]);
    } else {
      const errMsgs = result.error.errors.map((err) => {
        const path = err.path.join('.');
        return `${path}: ${err.message}`;
      });
      setValidationErrors(errMsgs);
    }
    setAppliedSuccess(false);
  }, [draft]);

  const handleApply = () => {
    if (validationErrors.length > 0) return;
    onUpdateCustomCatalogo(draft);
    setAppliedSuccess(true);
    setTimeout(() => setAppliedSuccess(false), 3000);
  };

  const handleReset = () => {
    setDraft(JSON.parse(JSON.stringify(catalogo)));
    setAppliedSuccess(false);
  };

  // ---- Export Catalog ----
  const handleExportCatalog = () => {
    const rawData = JSON.stringify(draft, null, 2);
    const blob = new Blob([rawData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `catalogo_personalizado_${draft.sistema}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // ---- Import Catalog ----
  const handleImportCatalog = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        const res = cargarCatalogoExterno(parsed);
        if (res.success) {
          setImportError('');
        } else {
          setImportError(res.error || 'Catálogo inválido.');
        }
      } catch (err) {
        setImportError('Error al leer el archivo JSON.');
      }
    };
    reader.readAsText(file);
    if (e.target) e.target.value = '';
  };

  // ---- Draft Updater Helpers ----
  const updateDraft = (updater: (d: Catalogo) => void) => {
    setDraft((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      updater(next);
      return next;
    });
  };

  const toggleSection = (section: SectionKey) => {
    setActiveSection(activeSection === section ? 'general' : section);
  };

  return (
    <div className={styles.editor}>
      <div className={styles.header}>
        <div>
          <h3 className={styles.title}>🛠️ Editor Técnico de Catálogo</h3>
          <p className={styles.subtitle}>
            Personalizá pesos de perfiles, placas y coeficientes de consumo en tiempo real.
          </p>
        </div>
        <div className={styles.headerBtns}>
          <button className={styles.secBtn} onClick={handleExportCatalog}>
            📤 Exportar Catálogo
          </button>
          <label className={styles.fileLabel}>
            📥 Importar Catálogo
            <input type="file" accept=".json" onChange={handleImportCatalog} className={styles.fileInput} />
          </label>
        </div>
      </div>

      {importError && (
        <div className={styles.errorAlert}>
          <strong>❌ Error al importar catálogo:</strong> {importError}
        </div>
      )}

      {validationErrors.length > 0 ? (
        <div className={styles.errorAlert}>
          <strong>⚠️ Catálogo Inválido (Errores del Schema):</strong>
          <ul className={styles.errorList}>
            {validationErrors.slice(0, 5).map((err, i) => (
              <li key={i}>{err}</li>
            ))}
            {validationErrors.length > 5 && <li>... y {validationErrors.length - 5} errores más.</li>}
          </ul>
        </div>
      ) : (
        <div className={styles.successAlert}>
          ✅ <strong>Catálogo válido conforme al Schema Zod.</strong> Listo para aplicar.
        </div>
      )}

      {appliedSuccess && (
        <div className={styles.appliedAlert}>
          🚀 <strong>¡Catálogo aplicado exitosamente al cálculo activo!</strong> Los cómputos fueron actualizados.
        </div>
      )}

      <div className={styles.mainGrid}>
        {/* Accordions */}
        <div className={styles.sections}>
          {/* 1. General */}
          <div className={`${styles.section} ${activeSection === 'general' ? styles.sectionActive : ''}`}>
            <div className={styles.sectionHeader} onClick={() => toggleSection('general')}>
              <span>⚙️ Parámetros Generales</span>
              <span>{activeSection === 'general' ? '▼' : '▶'}</span>
            </div>
            {activeSection === 'general' && (
              <div className={styles.sectionBody}>
                <div className={styles.formGrid}>
                  <div className={styles.formRow}>
                    <label className={styles.label}>Desperdicio por Defecto (Placas)</label>
                    <input
                      type="number"
                      step="0.01"
                      className={styles.input}
                      value={draft.factor_desperdicio_placas_default}
                      onChange={(e) =>
                        updateDraft((d) => {
                          d.factor_desperdicio_placas_default = parseFloat(e.target.value) || 0;
                        })
                      }
                    />
                  </div>
                  <div className={styles.formRow}>
                    <label className={styles.label}>Desfase Juntas Verticales Mínimo (m)</label>
                    <input
                      type="number"
                      step="0.05"
                      className={styles.input}
                      value={draft.desfase_junta_vertical_min_m}
                      onChange={(e) =>
                        updateDraft((d) => {
                          d.desfase_junta_vertical_min_m = parseFloat(e.target.value) || 0;
                        })
                      }
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 2. Perfiles */}
          <div className={`${styles.section} ${activeSection === 'perfiles' ? styles.sectionActive : ''}`}>
            <div className={styles.sectionHeader} onClick={() => toggleSection('perfiles')}>
              <span>🏗️ Estructura Metálica (Perfiles y Rieles)</span>
              <span>{activeSection === 'perfiles' ? '▼' : '▶'}</span>
            </div>
            {activeSection === 'perfiles' && (
              <div className={styles.sectionBody}>
                <h4 className={styles.subTitle}>Parantes (Montantes)</h4>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th>Ancho (mm)</th>
                      <th>Largo Barra (m)</th>
                      <th>Peso (kg/ml)</th>
                      <th>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {draft.perfiles.montante.map((m, idx) => (
                      <tr key={idx}>
                        <td>
                          <input
                            type="text"
                            className={styles.tableInput}
                            value={m.codigo}
                            onChange={(e) =>
                              updateDraft((d) => {
                                d.perfiles.montante[idx].codigo = e.target.value;
                              })
                            }
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            className={styles.tableInput}
                            value={m.ancho_mm}
                            onChange={(e) =>
                              updateDraft((d) => {
                                d.perfiles.montante[idx].ancho_mm = parseInt(e.target.value) || 0;
                              })
                            }
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            step="0.1"
                            className={styles.tableInput}
                            value={m.largo_barra_m}
                            onChange={(e) =>
                              updateDraft((d) => {
                                d.perfiles.montante[idx].largo_barra_m = parseFloat(e.target.value) || 0;
                              })
                            }
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            step="0.01"
                            className={styles.tableInput}
                            value={m.peso_kg_ml}
                            onChange={(e) =>
                              updateDraft((d) => {
                                d.perfiles.montante[idx].peso_kg_ml = parseFloat(e.target.value) || 0;
                              })
                            }
                          />
                        </td>
                        <td>
                          <button
                            className={styles.deleteBtn}
                            onClick={() =>
                              updateDraft((d) => {
                                d.perfiles.montante.splice(idx, 1);
                              })
                            }
                          >
                            🗑️
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <button
                  className={styles.addBtn}
                  onClick={() =>
                    updateDraft((d) => {
                      d.perfiles.montante.push({ codigo: 'NUEVO_M', ancho_mm: 64, largo_barra_m: 3.0, peso_kg_ml: 0.55 });
                    })
                  }
                >
                  ➕ Agregar Parante
                </button>

                <h4 className={styles.subTitle} style={{ marginTop: '1.5rem' }}>Rieles</h4>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th>Ancho (mm)</th>
                      <th>Largo Barra (m)</th>
                      <th>Peso (kg/ml)</th>
                      <th>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {draft.perfiles.riel.map((r, idx) => (
                      <tr key={idx}>
                        <td>
                          <input
                            type="text"
                            className={styles.tableInput}
                            value={r.codigo}
                            onChange={(e) =>
                              updateDraft((d) => {
                                d.perfiles.riel[idx].codigo = e.target.value;
                              })
                            }
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            className={styles.tableInput}
                            value={r.ancho_mm}
                            onChange={(e) =>
                              updateDraft((d) => {
                                d.perfiles.riel[idx].ancho_mm = parseInt(e.target.value) || 0;
                              })
                            }
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            step="0.1"
                            className={styles.tableInput}
                            value={r.largo_barra_m}
                            onChange={(e) =>
                              updateDraft((d) => {
                                d.perfiles.riel[idx].largo_barra_m = parseFloat(e.target.value) || 0;
                              })
                            }
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            step="0.01"
                            className={styles.tableInput}
                            value={r.peso_kg_ml}
                            onChange={(e) =>
                              updateDraft((d) => {
                                d.perfiles.riel[idx].peso_kg_ml = parseFloat(e.target.value) || 0;
                              })
                            }
                          />
                        </td>
                        <td>
                          <button
                            className={styles.deleteBtn}
                            onClick={() =>
                              updateDraft((d) => {
                                d.perfiles.riel.splice(idx, 1);
                              })
                            }
                          >
                            🗑️
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <button
                  className={styles.addBtn}
                  onClick={() =>
                    updateDraft((d) => {
                      d.perfiles.riel.push({ codigo: 'NUEVO_R', ancho_mm: 65, largo_barra_m: 3.0, peso_kg_ml: 0.50 });
                    })
                  }
                >
                  ➕ Agregar Riel
                </button>
              </div>
            )}
          </div>

          {/* 3. Placas */}
          <div className={`${styles.section} ${activeSection === 'placas' ? styles.sectionActive : ''}`}>
            <div className={styles.sectionHeader} onClick={() => toggleSection('placas')}>
              <span>🟦 Placas (Yeso / Cemento)</span>
              <span>{activeSection === 'placas' ? '▼' : '▶'}</span>
            </div>
            {activeSection === 'placas' && (
              <div className={styles.sectionBody}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Tipo</th>
                      <th>Nombre</th>
                      <th>Espesor (mm)</th>
                      <th>Peso (kg/m²)</th>
                      <th>Formatos (Ancho x Alto, m)</th>
                      <th>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {draft.placas.map((p, idx) => (
                      <tr key={idx}>
                        <td>
                          <input
                            type="text"
                            className={styles.tableInput}
                            value={p.tipo}
                            onChange={(e) =>
                              updateDraft((d) => {
                                d.placas[idx].tipo = e.target.value;
                              })
                            }
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            className={styles.tableInput}
                            value={p.nombre}
                            onChange={(e) =>
                              updateDraft((d) => {
                                d.placas[idx].nombre = e.target.value;
                              })
                            }
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            step="0.5"
                            className={styles.tableInput}
                            value={p.espesor_mm}
                            onChange={(e) =>
                              updateDraft((d) => {
                                d.placas[idx].espesor_mm = parseFloat(e.target.value) || 0;
                              })
                            }
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            step="0.1"
                            className={styles.tableInput}
                            value={p.peso_kg_m2}
                            onChange={(e) =>
                              updateDraft((d) => {
                                d.placas[idx].peso_kg_m2 = parseFloat(e.target.value) || 0;
                              })
                            }
                          />
                        </td>
                        <td>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                            {p.formatos_m.map((f) => `${f[0]}x${f[1]}`).join(', ')}
                          </span>
                        </td>
                        <td>
                          <button
                            className={styles.deleteBtn}
                            onClick={() =>
                              updateDraft((d) => {
                                d.placas.splice(idx, 1);
                              })
                            }
                          >
                            🗑️
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <button
                  className={styles.addBtn}
                  onClick={() =>
                    updateDraft((d) => {
                      d.placas.push({
                        tipo: 'NUEVA',
                        nombre: 'Nueva Placa',
                        espesor_mm: 12.5,
                        formatos_m: [[1.22, 2.44]],
                        peso_kg_m2: 8.5,
                      });
                    })
                  }
                >
                  ➕ Agregar Placa
                </button>
              </div>
            )}
          </div>

          {/* 4. Tornillos */}
          <div className={`${styles.section} ${activeSection === 'tornillos' ? styles.sectionActive : ''}`}>
            <div className={styles.sectionHeader} onClick={() => toggleSection('tornillos')}>
              <span>🔩 Fijaciones y Tornillería</span>
              <span>{activeSection === 'tornillos' ? '▼' : '▶'}</span>
            </div>
            {activeSection === 'tornillos' && (
              <div className={styles.sectionBody}>
                <div className={styles.formGrid}>
                  <div className={styles.formRow}>
                    <label className={styles.label}>Tornillos Perfil-Perfil por Unión</label>
                    <input
                      type="number"
                      className={styles.input}
                      value={draft.tornillos.perfil_perfil_por_union}
                      onChange={(e) =>
                        updateDraft((d) => {
                          d.tornillos.perfil_perfil_por_union = parseInt(e.target.value) || 0;
                        })
                      }
                    />
                  </div>
                  <div className={styles.formRow}>
                    <label className={styles.label}>Separación de Anclaje a Losa/Suelo (m)</label>
                    <input
                      type="number"
                      step="0.05"
                      className={styles.input}
                      value={draft.tornillos.anclaje_losa_separacion_m}
                      onChange={(e) =>
                        updateDraft((d) => {
                          d.tornillos.anclaje_losa_separacion_m = parseFloat(e.target.value) || 0;
                        })
                      }
                    />
                  </div>
                </div>
                <h4 className={styles.subTitle} style={{ marginTop: '1rem' }}>Tornillos Placa-Perfil por m²</h4>
                <div className={styles.formGrid}>
                  {Object.keys(draft.tornillos.placa_perfil_por_m2).map((key) => (
                    <div key={key} className={styles.formRow}>
                      <label className={styles.label}>Espesor {key}</label>
                      <input
                        type="number"
                        className={styles.input}
                        value={draft.tornillos.placa_perfil_por_m2[key]}
                        onChange={(e) =>
                          updateDraft((d) => {
                            d.tornillos.placa_perfil_por_m2[key] = parseInt(e.target.value) || 0;
                          })
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 5. Insumos */}
          <div className={`${styles.section} ${activeSection === 'insumos' ? styles.sectionActive : ''}`}>
            <div className={styles.sectionHeader} onClick={() => toggleSection('insumos')}>
              <span>🧶 Cinta, Cantoneras y Masilla</span>
              <span>{activeSection === 'insumos' ? '▼' : '▶'}</span>
            </div>
            {activeSection === 'insumos' && (
              <div className={styles.sectionBody}>
                <h4 className={styles.subTitle}>Cinta y Esquinas</h4>
                <div className={styles.formGrid}>
                  <div className={styles.formRow}>
                    <label className={styles.label}>Rendimiento Cinta (ml por Rollo)</label>
                    <input
                      type="number"
                      className={styles.input}
                      value={draft.cinta.rendimiento_ml_por_rollo}
                      onChange={(e) =>
                        updateDraft((d) => {
                          d.cinta.rendimiento_ml_por_rollo = parseInt(e.target.value) || 0;
                        })
                      }
                    />
                  </div>
                  <div className={styles.formRow}>
                    <label className={styles.label}>Factor de Traslape</label>
                    <input
                      type="number"
                      step="0.01"
                      className={styles.input}
                      value={draft.cinta.factor_traslape}
                      onChange={(e) =>
                        updateDraft((d) => {
                          d.cinta.factor_traslape = parseFloat(e.target.value) || 0;
                        })
                      }
                    />
                  </div>
                </div>

                <h4 className={styles.subTitle} style={{ marginTop: '1.25rem' }}>Masilla de Juntas</h4>
                <div className={styles.formGrid}>
                  <div className={styles.formRow}>
                    <label className={styles.label}>Consumo Masilla (kg/ml por mano)</label>
                    <input
                      type="number"
                      step="0.01"
                      className={styles.input}
                      value={draft.masilla.kg_por_ml_por_mano}
                      onChange={(e) =>
                        updateDraft((d) => {
                          d.masilla.kg_por_ml_por_mano = parseFloat(e.target.value) || 0;
                        })
                      }
                    />
                  </div>
                  <div className={styles.formRow}>
                    <label className={styles.label}>Manos de Masilla Estándar</label>
                    <input
                      type="number"
                      className={styles.input}
                      value={draft.masilla.manos_estandar}
                      onChange={(e) =>
                        updateDraft((d) => {
                          d.masilla.manos_estandar = parseInt(e.target.value) || 0;
                        })
                      }
                    />
                  </div>
                  <div className={styles.formRow}>
                    <label className={styles.label}>Presentación Masilla (kg por Bolsa)</label>
                    <input
                      type="number"
                      className={styles.input}
                      value={draft.masilla.presentacion_kg_por_bolsa}
                      onChange={(e) =>
                        updateDraft((d) => {
                          d.masilla.presentacion_kg_por_bolsa = parseFloat(e.target.value) || 0;
                        })
                      }
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className={styles.footer}>
        <button className={styles.resetBtn} onClick={handleReset}>
          🔄 Deshacer Cambios
        </button>
        <button
          className={styles.applyBtn}
          onClick={handleApply}
          disabled={validationErrors.length > 0}
        >
          🚀 Aplicar al Cálculo Activo
        </button>
      </div>
    </div>
  );
};
