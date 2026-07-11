import React, { useState } from 'react';
import styles from './MainPanel.module.css';
import { MuroVisualizer } from '../visualizer/MuroVisualizer';
import { Button } from '../ui/Button';
import { CatalogoEditor } from '../catalog/CatalogoEditor';
import { BimViewer } from '../viewer/BimViewer';
import { InteractivePlantaMap } from './InteractivePlantaMap';
import { NivelesProyecto } from './NivelesProyecto';
import { NestingVisualizer } from '../visualizer/NestingVisualizer';
import { Placas2DVisualizer } from '../visualizer/Placas2DVisualizer';
import type { MuroFormData } from '../../hooks/useCalculadora';
import type { ProyectoFormData, NivelProyecto } from '../../hooks/useProyecto';
import type { ResultadoMuro, ResultadoProyecto, Abertura, Catalogo, ResultadoCielorraso } from '@drywall-calc/catalog-schemas';
import type { CalculationState } from '../../hooks/useCalculadora';
import type { CielorrasoFormData } from '../../hooks/useProyecto';

interface MainPanelProps {
  // Multi-muro
  proyecto: ProyectoFormData;
  selectedMuroIdx: number;
  onSelectMuro?: (idx: number) => void;
  resultado: ResultadoProyecto | null;
  currentResultadoMuro: ResultadoMuro | null;
  totalPlacasConDesperdicio: number;
  onUpdateFactor: (pct: number) => void;
  onCompartir: () => string;
  // State
  state: CalculationState;
  errorMsg: string;
  // For visualizer (current wall)
  largo_m: number;
  alto_m: number;
  aberturas: Abertura[];
  carasConfig: 1 | 2;
  capasConfig: number;
  form: MuroFormData;
  catalogo: Catalogo;
  // Catalog actions
  onUpdateCustomCatalogo: (nuevoCatalogo: Catalogo) => void;
  cargarCatalogoExterno: (datos: unknown) => { success: boolean; error?: string };
  onImportarMurosDirecto?: (muros: any[]) => void;
  // Niveles del proyecto
  onAddNivel: (n: NivelProyecto) => void;
  onUpdateNivel: (idx: number, n: Partial<NivelProyecto>) => void;
  onRemoveNivel: (idx: number) => void;
  resolvePisoMuro: (muro: MuroFormData) => string;
  // Cielorraso props
  currentCielorraso: CielorrasoFormData | null;
  activeElementTab: 'muros' | 'cielorrasos';
  selectedCielorrasoIdx: number;
}

type ViewTab = 'proyecto' | 'muro' | 'editor' | 'bim';

export const MainPanel: React.FC<MainPanelProps> = ({
  proyecto,
  selectedMuroIdx,
  onSelectMuro,
  resultado,
  currentResultadoMuro,
  totalPlacasConDesperdicio,
  onUpdateFactor,
  onCompartir,
  state,
  errorMsg,
  largo_m,
  alto_m,
  aberturas,
  carasConfig,
  capasConfig,
  form,
  catalogo,
  onUpdateCustomCatalogo,
  cargarCatalogoExterno,
  onImportarMurosDirecto,
  onAddNivel,
  onUpdateNivel,
  onRemoveNivel,
  resolvePisoMuro,
  currentCielorraso,
  activeElementTab,
  selectedCielorrasoIdx,
}) => {
  const [copySuccess, setCopySuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<ViewTab>('proyecto');
  const [nestingProfileTab, setNestingProfileTab] = useState<'montantes' | 'rieles'>('montantes');
  const [nestingCielorrasoProfileTab, setNestingCielorrasoProfileTab] = useState<'secundarios' | 'principales' | 'perimetrales'>('secundarios');
  const [muroViewMode, setMuroViewMode] = useState<'3d' | '2d'>('3d');

  // ---- Material rows for a single cielorraso ----
  const getCielorrasoMaterialRows = (r: ResultadoCielorraso, f: CielorrasoFormData) => {
    const rows = [
      {
        grupo: 'Placas',
        nombre: `Placa ${f.placa_tipo} (${f.placa_espesor_mm}mm)`,
        cantidad: `${r.placas.cantidad_total} und`,
        detalle: `Formato ${f.placa_formato}m (Orientación ${f.placa_orientacion})`,
        peso: r.placas.peso_total_kg,
      },
      {
        grupo: 'Estructura',
        nombre: `Perfil Secundario ${f.perfil_secundario}`,
        cantidad: `${r.perfiles.secundarios_barras} barras`,
        detalle: `Modulado cada ${f.separacion_secundario_m}m, barra 3.00m`,
        peso: r.perfiles.secundarios_barras * 3.0 * 0.35,
      },
      {
        grupo: 'Estructura',
        nombre: `Perfil Perimetral ${f.perfil_perimetral}`,
        cantidad: `${r.perfiles.perimetrales_barras} barras`,
        detalle: `Ángulo perimetral, barra 3.00m`,
        peso: r.perfiles.perimetrales_barras * 3.0 * 0.28,
      }
    ];

    if (f.tipo_estructura === 'suspendido') {
      rows.push(
        {
          grupo: 'Estructura',
          nombre: `Perfil Principal ${f.perfil_principal}`,
          cantidad: `${r.perfiles.principales_barras} barras`,
          detalle: `Modulado cada ${f.separacion_principal_m}m, barra 3.00m`,
          peso: r.perfiles.principales_barras * 3.0 * 0.55,
        },
        {
          grupo: 'Fijaciones',
          nombre: 'Colgadores de Suspensión',
          cantidad: `${r.colgadores.cantidad_total} und`,
          detalle: `Varillas de cuelgue con resortes/reguladores`,
          peso: r.colgadores.cantidad_total * 0.12,
        },
        {
          grupo: 'Estructura',
          nombre: 'Alambre galvanizado #14',
          cantidad: `${r.colgadores.alambre_ml.toFixed(1)} ml`,
          detalle: `Para anclajes de suspensión`,
          peso: r.colgadores.alambre_ml * 0.02,
        }
      );
    }

    rows.push(
      {
        grupo: 'Fijaciones',
        nombre: 'Tornillos Placa-Perfil',
        cantidad: `${r.tornillos.placa_perfil} und`,
        detalle: `Fijación a perfiles secundarios`,
        peso: r.tornillos.placa_perfil * 0.0015,
      },
      {
        grupo: 'Fijaciones',
        nombre: 'Tornillos Perfil-Perfil (wafer)',
        cantidad: `${r.tornillos.perfil_perfil} und`,
        detalle: `Fijaciones de empalme / cruces`,
        peso: r.tornillos.perfil_perfil * 0.001,
      },
      {
        grupo: 'Fijaciones',
        nombre: 'Anclajes a Losa',
        cantidad: `${r.tornillos.anclajes_losa} und`,
        detalle: `Fijaciones superiores de colgadores/perfiles`,
        peso: r.tornillos.anclajes_losa * 0.015,
      }
    );

    if (r.tornillos.anclajes_pared > 0) {
      rows.push({
        grupo: 'Fijaciones',
        nombre: 'Anclajes a Pared',
        cantidad: `${r.tornillos.anclajes_pared} und`,
        detalle: `Fijación de angular perimetral`,
        peso: r.tornillos.anclajes_pared * 0.015,
      });
    }

    rows.push(
      {
        grupo: 'Acabados',
        nombre: 'Cinta de papel',
        cantidad: `${r.cinta.rollos} rollo${r.cinta.rollos !== 1 ? 's' : ''}`,
        detalle: `Tratamiento de juntas (${r.cinta.ml_total.toFixed(1)} ml)`,
        peso: r.cinta.rollos * 0.40,
      },
      {
        grupo: 'Acabados',
        nombre: 'Masilla lista para usar',
        cantidad: `${r.masilla.bolsas} bolsa${r.masilla.bolsas !== 1 ? 's' : ''}`,
        detalle: `Tomado de juntas (${r.masilla.kg_total.toFixed(1)} kg)`,
        peso: r.masilla.kg_total,
      }
    );

    if (r.aislante.paquetes > 0) {
      rows.push({
        grupo: 'Aislante',
        nombre: 'Aislante lana de vidrio',
        cantidad: `${r.aislante.paquetes} paquete${r.aislante.paquetes !== 1 ? 's' : ''}`,
        detalle: `Aislación termoacústica (${r.aislante.m2.toFixed(1)} m²)`,
        peso: r.aislante.paquetes * 6.0,
      });
    }

    return rows;
  };

  // ---- Material rows for a single muro ----
  const getMaterialRows = (r: ResultadoMuro, f: MuroFormData) => {
    const montanteConfig = catalogo.perfiles.montante.find((m) => m.codigo === f.perfil);
    const montantePesoMl = montanteConfig ? montanteConfig.peso_kg_ml : 0.52;
    const rielConfig = catalogo.perfiles.riel.find((riel) => riel.codigo === f.riel);
    const rielPesoMl = rielConfig ? rielConfig.peso_kg_ml : 0.49;

    const rows = [
      {
        grupo: 'Placas',
        nombre: `Placa ${f.placa_tipo} (${f.placa_espesor_mm}mm)`,
        cantidad: `${r.placas.cantidad_total} und`,
        detalle: `Formato ${f.placa_formato}m (Orientación ${f.placa_orientacion})`,
        peso: r.placas.peso_total_kg,
      },
      {
        grupo: 'Estructura',
        nombre: `Perfil Montante ${f.perfil}`,
        fancyNombre: `Perfil Montante ${f.perfil}`,
        cantidad: `${r.perfiles.montantes} barras`,
        detalle: `Perfil vertical, barras de 3.00m`,
        peso: r.perfiles.montantes * montantePesoMl * 3.0,
      },
      {
        grupo: 'Estructura',
        nombre: `Perfil Riel ${f.riel}`,
        cantidad: `${r.perfiles.rieles_barras} barras`,
        detalle: `Perfil horizontal guía, barras de 3.00m`,
        peso: r.perfiles.rieles_barras * rielPesoMl * 3.0,
      },
      {
        grupo: 'Fijaciones',
        nombre: 'Tornillos Placa-Perfil',
        cantidad: `${r.tornillos.placa_perfil} und`,
        detalle: `Fijación de placas a la estructura`,
        peso: r.tornillos.placa_perfil * 0.0015,
      },
      {
        grupo: 'Fijaciones',
        nombre: 'Tornillos Perfil-Perfil',
        cantidad: `${r.tornillos.perfil_perfil} und`,
        detalle: `Fijación de montante a riel`,
        peso: r.tornillos.perfil_perfil * 0.001,
      },
      {
        grupo: 'Fijaciones',
        nombre: 'Anclajes a Losa',
        cantidad: `${r.tornillos.anclajes_losa} und`,
        detalle: `Fijación de riel a piso/techo`,
        peso: r.tornillos.anclajes_losa * 0.015,
      },
      {
        grupo: 'Acabados',
        nombre: 'Cinta de papel',
        cantidad: `${r.cinta.rollos} rollo${r.cinta.rollos !== 1 ? 's' : ''}`,
        detalle: `Tratamiento de juntas (${r.cinta.ml_total.toFixed(1)} ml)`,
        peso: r.cinta.rollos * 0.40,
      },
      {
        grupo: 'Acabados',
        nombre: 'Masilla lista para usar',
        cantidad: `${r.masilla.bolsas} bolsa${r.masilla.bolsas !== 1 ? 's' : ''}`,
        detalle: `Tomado de juntas (${r.masilla.kg_total.toFixed(1)} kg)`,
        peso: r.masilla.kg_total,
      },
    ];

    if (r.aislante.paquetes > 0) {
      rows.push({
        grupo: 'Aislante',
        nombre: 'Aislante lana de vidrio',
        cantidad: `${r.aislante.paquetes} paquete${r.aislante.paquetes !== 1 ? 's' : ''}`,
        detalle: `Aislación termoacústica (${r.aislante.m2.toFixed(1)} m²)`,
        peso: r.aislante.paquetes * 6.0,
      });
    }
    if (r.esquineros.ml_total > 0) {
      rows.push({
        grupo: 'Acabados',
        nombre: 'Esquinero metálico',
        cantidad: `${r.esquineros.ml_total.toFixed(1)} ml`,
        detalle: `Protección de esquinas externas`,
        peso: r.esquineros.ml_total * 0.46,
      });
    }
    return rows;
  };

  const getConsolidadoRows = (res: ResultadoProyecto) => {
    const t = res.totales;
    const rows = [
      {
        grupo: 'Placas',
        nombre: 'Placas (neto)',
        cantidad: `${t.placas.cantidad_total} und`,
        detalle: 'Suma de placas de todos los elementos',
        peso: t.placas.peso_total_kg,
      },
      {
        grupo: 'Placas',
        nombre: `Placas (+ ${proyecto.factor_desperdicio_pct}% desperdicio)`,
        cantidad: `${totalPlacasConDesperdicio} und`,
        detalle: 'Total a comprar/presupuestar',
        peso: totalPlacasConDesperdicio * (t.placas.peso_total_kg / (t.placas.cantidad_total || 1)),
      },
    ];

    if (t.perfiles.montantes > 0) {
      rows.push({
        grupo: 'Estructura',
        nombre: 'Montantes (Muros)',
        cantidad: `${t.perfiles.montantes} barras`,
        detalle: `Incluye refuerzos de vanos y uniones`,
        peso: t.perfiles.montantes * 3.0 * (catalogo.perfiles.montante[0]?.peso_kg_ml || 0.55),
      });
    }

    if (t.perfiles.rieles_barras > 0) {
      rows.push({
        grupo: 'Estructura',
        nombre: 'Rieles (Muros)',
        cantidad: `${t.perfiles.rieles_barras} barras`,
        detalle: `Guías horizontales`,
        peso: t.perfiles.rieles_barras * 3.0 * (catalogo.perfiles.riel[0]?.peso_kg_ml || 0.50),
      });
    }

    // Inyectar insumos específicos de cielorrasos si se calcularon
    if (res.cielorrasos && res.cielorrasos.length > 0 && t.cielorraso) {
      const tc = t.cielorraso;
      if (tc.secundarios > 0) {
        rows.push({
          grupo: 'Estructura',
          nombre: 'Perfiles Secundarios (Cielorraso)',
          cantidad: `${tc.secundarios} barras`,
          detalle: 'Perfil omega o montante base',
          peso: tc.secundarios * 3.0 * 0.35,
        });
      }
      if (tc.principales > 0) {
        rows.push({
          grupo: 'Estructura',
          nombre: 'Perfiles Principales (Cielorraso)',
          cantidad: `${tc.principales} barras`,
          detalle: 'Perfil portante superior',
          peso: tc.principales * 3.0 * 0.55,
        });
      }
      if (tc.perimetrales > 0) {
        rows.push({
          grupo: 'Estructura',
          nombre: 'Perfiles Perimetrales (Cielorraso)',
          cantidad: `${tc.perimetrales} barras`,
          detalle: 'Ángulo perimetral de soporte',
          peso: tc.perimetrales * 3.0 * 0.28,
        });
      }
      if (tc.colgadores > 0) {
        rows.push({
          grupo: 'Fijaciones',
          nombre: 'Colgadores de Suspensión',
          cantidad: `${tc.colgadores} und`,
          detalle: 'Varillas de cuelgue regulables',
          peso: tc.colgadores * 0.12,
        });
      }
      if (tc.alambre_ml > 0) {
        rows.push({
          grupo: 'Estructura',
          nombre: 'Alambre galvanizado #14',
          cantidad: `${tc.alambre_ml.toFixed(1)} ml`,
          detalle: 'Alambre de suspensión de cielos',
          peso: tc.alambre_ml * 0.02,
        });
      }
    }

    // Inyectar insumos específicos de cenefas si se calcularon
    if (res.cenefas && res.cenefas.length > 0 && t.cenefa) {
      const tcen = t.cenefa;
      if (tcen.secundarios > 0) {
        rows.push({
          grupo: 'Estructura',
          nombre: 'Perfiles Secundarios (Cenefa)',
          cantidad: `${tcen.secundarios} barras`,
          detalle: 'Montantes de pórticos internos',
          peso: tcen.secundarios * 3.0 * 0.52,
        });
      }
      if (tcen.perimetrales > 0) {
        rows.push({
          grupo: 'Estructura',
          nombre: 'Perfiles Perimetrales (Cenefa)',
          cantidad: `${tcen.perimetrales} barras`,
          detalle: 'Rieles de anclaje de cenefa',
          peso: tcen.perimetrales * 3.0 * 0.49,
        });
      }
      if (tcen.esquineros_ml > 0) {
        rows.push({
          grupo: 'Acabados',
          nombre: 'Esquineros Cantonera (Cenefa)',
          cantidad: `${tcen.esquineros_ml.toFixed(1)} ml`,
          detalle: 'Protección de cantos salientes',
          peso: tcen.esquineros_ml * 0.46,
        });
      }
    }

    rows.push(
      {
        grupo: 'Fijaciones',
        nombre: 'Tornillos Placa-Perfil',
        cantidad: `${t.tornillos.placa_perfil} und`,
        detalle: `Para fijación de placas`,
        peso: t.tornillos.placa_perfil * 0.001,
      },
      {
        grupo: 'Fijaciones',
        nombre: 'Tornillos Perfil-Perfil',
        cantidad: `${t.tornillos.perfil_perfil} und`,
        detalle: `Para encuentros de perfiles y wafer`,
        peso: t.tornillos.perfil_perfil * 0.001,
      },
      {
        grupo: 'Fijaciones',
        nombre: 'Anclajes Generales (Losa/Pared)',
        cantidad: `${t.tornillos.anclajes_losa} und`,
        detalle: `Para fijación a losas y mampostería`,
        peso: t.tornillos.anclajes_losa * 0.015,
      },
      {
        grupo: 'Acabados',
        nombre: 'Cinta de papel',
        cantidad: `${t.cinta.rollos} rollo${t.cinta.rollos !== 1 ? 's' : ''}`,
        detalle: `Tomado de juntas (${t.cinta.ml_total.toFixed(1)} ml)`,
        peso: t.cinta.rollos * 0.40,
      },
      {
        grupo: 'Acabados',
        nombre: 'Masilla lista para usar',
        cantidad: `${t.masilla.bolsas} bolsa${t.masilla.bolsas !== 1 ? 's' : ''}`,
        detalle: `Tomado de juntas (${t.masilla.kg_total.toFixed(1)} kg)`,
        peso: t.masilla.kg_total,
      }
    );

    if (t.aislante.paquetes > 0) {
      rows.push({
        grupo: 'Aislante',
        nombre: 'Aislante lana de vidrio',
        cantidad: `${t.aislante.paquetes} paquete${t.aislante.paquetes !== 1 ? 's' : ''}`,
        detalle: `Aislación termoacústica (${t.aislante.m2.toFixed(1)} m²)`,
        peso: t.aislante.paquetes * 6.0,
      });
    }

    if (t.esquineros.ml_total > 0 && (!t.cenefa || t.esquineros.ml_total > t.cenefa.esquineros_ml)) {
      const mlEsquinerosMuro = t.esquineros.ml_total - (t.cenefa ? t.cenefa.esquineros_ml : 0);
      if (mlEsquinerosMuro > 0.01) {
        rows.push({
          grupo: 'Acabados',
          nombre: 'Esquinero metálico (Muros)',
          cantidad: `${mlEsquinerosMuro.toFixed(1)} ml`,
          detalle: `Protección de esquinas y hornacinas`,
          peso: mlEsquinerosMuro * 0.46,
        });
      }
    }

    return rows;
  };

  const totalWeight = (rows: ReturnType<typeof getMaterialRows>) =>
    rows.reduce((acc, r) => acc + (r.peso || 0), 0);

  // ---- Export CSV (proyecto completo) ----
  const handleExportCSV = () => {
    if (!resultado) return;
    const t = resultado.totales;
    const lines = [
      'PROYECTO;' + proyecto.nombre,
      'MUROS;' + resultado.muros.length,
      '',
      'Grupo;Material;Cantidad;Detalle',
      `Placas;Total placas netas;${t.placas.cantidad_total} und;Suma de todos los muros`,
      `Placas;Total placas con ${proyecto.factor_desperdicio_pct}% desperdicio;${totalPlacasConDesperdicio} und;Para compra`,
      `Estructura;Montantes;${t.perfiles.montantes} barras;`,
      `Estructura;Rieles;${t.perfiles.rieles_barras} barras;`,
      `Fijaciones;Tornillos Placa-Perfil;${t.tornillos.placa_perfil} und;`,
      `Fijaciones;Tornillos Perfil-Perfil;${t.tornillos.perfil_perfil} und;`,
      `Fijaciones;Anclajes a Losa;${t.tornillos.anclajes_losa} und;`,
      `Acabados;Cinta de papel;${t.cinta.rollos} rollos;${t.cinta.ml_total.toFixed(1)} ml`,
      `Acabados;Masilla;${t.masilla.bolsas} bolsas;${t.masilla.kg_total.toFixed(1)} kg`,
      `Aislante;Aislante;${t.aislante.paquetes} paquetes;${t.aislante.m2.toFixed(1)} m²`,
      `Acabados;Esquineros;${t.esquineros.ml_total.toFixed(1)} ml;`,
      '',
      'DETALLE POR MURO',
    ];

    resultado.muros.forEach((rm, idx) => {
      const mf = proyecto.muros[idx];
      lines.push(`Muro #${idx + 1};${mf?.largo_m ?? '?'}×${mf?.alto_m ?? '?'}m`);
      lines.push(`  Placas;${rm.placas.cantidad_total} und`);
      lines.push(`  Montantes;${rm.perfiles.montantes} barras`);
    });

    const blob = new Blob([new Uint8Array([0xef, 0xbb, 0xbf]), lines.join('\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `presupuesto_proyecto_${resultado.muros.length}_muros.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ---- Share ----
  const handleShare = () => {
    onCompartir();
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 3000);
  };

  const muroRows = currentResultadoMuro ? getMaterialRows(currentResultadoMuro, form) : [];
  const muroWeight = totalWeight(muroRows);

  return (
    <main className={styles.main}>
      <div className={styles.resultsHeader} style={{ marginBottom: '1.25rem' }}>
        <div>
          <h2 className={styles.resultsTitle}>Drywall Calc Studio</h2>
          <p className={styles.resultsSubtitle}>
            {proyecto.nombre || 'Proyecto sin nombre'} · {proyecto.muros.length} muro{proyecto.muros.length !== 1 ? 's' : ''}
          </p>
        </div>
        {resultado && activeTab !== 'editor' && (
          <div className={`${styles.actions} no-print`}>
            <Button id="btn-share" variant="secondary" size="sm" onClick={handleShare}>
              🔗 {copySuccess ? '¡Enlace copiado!' : 'Compartir'}
            </Button>
            <Button id="btn-export-csv" variant="secondary" size="sm" onClick={handleExportCSV}>
              📥 CSV
            </Button>
            <Button id="btn-export-pdf" variant="primary" size="sm" onClick={() => window.print()}>
              🖨️ PDF
            </Button>
          </div>
        )}
      </div>

      {copySuccess && (
        <div className={styles.shareAlert} style={{ marginBottom: '1rem' }}>
          🚀 <strong>¡Enlace de compartición copiado al portapapeles!</strong> Podés enviarlo a tus clientes o equipo para reproducir este proyecto.
        </div>
      )}

      <div className={`${styles.tabs} no-print`} style={{ marginBottom: '1.25rem' }}>
        <button
          className={`${styles.tab} ${activeTab === 'proyecto' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('proyecto')}
        >
          📋 Vista Proyecto {resultado ? `(${resultado.muros.length})` : ''}
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'muro' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('muro')}
        >
          🟦 Visualizador de Muro
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'editor' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('editor')}
        >
          🛠️ Editor de Catálogo
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'bim' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('bim')}
        >
          🏗️ Visor BIM 3D (IFC)
        </button>
      </div>

      {activeTab === 'editor' && (
        <div className="animate-fade-in">
          <CatalogoEditor
            catalogo={catalogo}
            onUpdateCustomCatalogo={onUpdateCustomCatalogo}
            cargarCatalogoExterno={cargarCatalogoExterno}
          />
        </div>
      )}

      {activeTab === 'proyecto' && (
        <div className="animate-fade-in">
          {state === 'calculating' && (
            <div className={styles.centerState}>
              <div className={styles.spinner} />
              <p className="text-secondary">Calculando materiales…</p>
            </div>
          )}

          {state === 'error' && (
            <div className={styles.errorState}>
              <div className={styles.errorIcon}>⚠️</div>
              <h2 className={styles.errorTitle}>Error en el cálculo</h2>
              <p className={styles.errorMsg}>{errorMsg}</p>
            </div>
          )}

          {state === 'idle' && !resultado && (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>📐</div>
              <h2 className={styles.emptyTitle}>Configurá tu proyecto</h2>
              <p className={styles.emptyText}>
                Agregá uno o más muros en el panel izquierdo y presioná{' '}
                <strong>Calcular materiales</strong> para obtener el cómputo exacto.
              </p>
            </div>
          )}

          {state === 'done' && resultado && (
            <div className={styles.tabContent}>
              <InteractivePlantaMap 
                proyecto={proyecto} 
                selectedMuroIdx={selectedMuroIdx} 
                onSelectMuro={onSelectMuro} 
              />
              <div className={styles.desperdicioCard}>
                <div className={styles.desperdicioHeader}>
                  <span>🗑️ Factor de desperdicio</span>
                  <span className={styles.desperdicioValue}>{proyecto.factor_desperdicio_pct}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={30}
                  step={1}
                  value={proyecto.factor_desperdicio_pct}
                  onChange={(e) => onUpdateFactor(Number(e.target.value))}
                  className={`${styles.desperdicioSlider} no-print`}
                />
              </div>

              <div className={styles.weightCard}>
                <div className={styles.weightHeader}>
                  <span className={styles.weightIcon}>⚖️</span>
                  <div>
                    <span className={styles.weightTitle}>Peso Estructural del Proyecto</span>
                    <p className={styles.weightDesc}>Suma combinada de perfiles, placas y acabados de todos los muros</p>
                  </div>
                </div>
                <div className={styles.weightValue}>{totalWeight(resultado.muros.flatMap((m, idx) => getMaterialRows(m, proyecto.muros[idx]))).toFixed(1)} kg</div>
              </div>

              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Grupo</th>
                      <th>Material / Insumo</th>
                      <th style={{ textAlign: 'right' }}>Cantidad</th>
                      <th>Detalle Técnico</th>
                      <th style={{ textAlign: 'right' }}>Peso Est.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getConsolidadoRows(resultado).map((row, idx) => (
                      <tr key={idx}>
                        <td>
                          <span className={`${styles.badge} ${styles[row.grupo.toLowerCase()] || ''}`}>
                            {row.grupo}
                          </span>
                        </td>
                        <td className={styles.materialName}>{row.nombre}</td>
                        <td className={styles.materialQty}>{row.cantidad}</td>
                        <td className={styles.materialDetail}>{row.detalle}</td>
                        <td className={styles.materialWeight}>
                          {row.peso ? `${row.peso.toFixed(1)} kg` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Biblioteca de Retazos (Nesting 2D) */}
              {resultado && ((resultado.retazos_disponibles || []).length > 0 || (resultado.retazos_reutilizados || []).length > 0) ? (
                <div style={{
                  marginTop: '1.75rem',
                  background: 'rgba(30, 41, 59, 0.3)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '16px',
                  padding: '1.25rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-primary, #f8fafc)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      ♻️ Biblioteca de Retazos de Placa (Nesting 2D)
                    </h3>
                    <span style={{
                      background: 'rgba(16, 185, 129, 0.15)',
                      color: '#10b981',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      padding: '0.2rem 0.6rem',
                      borderRadius: '12px',
                      border: '1px solid rgba(16, 185, 129, 0.25)'
                    }}>
                      Ahorro Activo
                    </span>
                  </div>

                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary, #94a3b8)', margin: '0 0 1.25rem 0', lineHeight: 1.4 }}>
                    El motor de nesting 2D ha detectado y extraído los sobrantes sanos de las puertas y ventanas, asignándolos automáticamente al revestimiento de hornacinas y cenefas del proyecto.
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                    <div style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px dashed rgba(16, 185, 129, 0.2)', borderRadius: '12px', padding: '0.75rem' }}>
                      <span style={{ fontSize: '0.7rem', color: '#10b981', display: 'block', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.5px' }}>
                        Retazos Reutilizados
                      </span>
                      <span style={{ fontSize: '1.35rem', fontWeight: 700, color: '#10b981' }}>
                        {(resultado.retazos_reutilizados || []).length} <span style={{ fontSize: '0.8rem', fontWeight: 400 }}>piezas</span>
                      </span>
                    </div>
                    <div style={{ background: 'rgba(99, 102, 241, 0.05)', border: '1px dashed rgba(99, 102, 241, 0.2)', borderRadius: '12px', padding: '0.75rem' }}>
                      <span style={{ fontSize: '0.7rem', color: '#818cf8', display: 'block', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.5px' }}>
                        Retazos Libres en Obra
                      </span>
                      <span style={{ fontSize: '1.35rem', fontWeight: 700, color: '#818cf8' }}>
                        {(resultado.retazos_disponibles || []).length} <span style={{ fontSize: '0.8rem', fontWeight: 400 }}>piezas</span>
                      </span>
                    </div>
                  </div>

                  {/* Listado de retazos */}
                  <details>
                    <summary style={{ fontSize: '0.78rem', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 600 }}>
                      📋 Ver inventario detallado de retazos
                    </summary>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.75rem', maxHeight: '200px', overflowY: 'auto', paddingRight: '4px' }}>
                      {/* Reutilizados */}
                      {(resultado.retazos_reutilizados || []).map((ret, idx) => (
                        <div key={`reut-${idx}`} style={{
                          background: 'rgba(16, 185, 129, 0.03)',
                          border: '1px solid rgba(16, 185, 129, 0.1)',
                          borderRadius: '8px',
                          padding: '0.5rem 0.75rem',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: '0.72rem'
                        }}>
                          <div>
                            <span style={{ color: '#10b981', fontWeight: 700 }}>♻️ {ret.ancho_m.toFixed(2)}m x {ret.alto_m.toFixed(2)}m</span>
                            <span style={{ color: '#94a3b8', marginLeft: '0.5rem' }}>({ret.placa_tipo} {ret.espesor_mm}mm)</span>
                          </div>
                          <span style={{ color: '#94a3b8', fontSize: '0.65rem' }}>Origen: {ret.origen_elemento_id}</span>
                        </div>
                      ))}

                      {/* Disponibles */}
                      {(resultado.retazos_disponibles || []).map((ret, idx) => (
                        <div key={`disp-${idx}`} style={{
                          background: 'rgba(99, 102, 241, 0.03)',
                          border: '1px solid rgba(99, 102, 241, 0.1)',
                          borderRadius: '8px',
                          padding: '0.5rem 0.75rem',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: '0.72rem'
                        }}>
                          <div>
                            <span style={{ color: '#818cf8', fontWeight: 700 }}>📦 {ret.ancho_m.toFixed(2)}m x {ret.alto_m.toFixed(2)}m</span>
                            <span style={{ color: '#94a3b8', marginLeft: '0.5rem' }}>({ret.placa_tipo} {ret.espesor_mm}mm)</span>
                          </div>
                          <span style={{ color: '#94a3b8', fontSize: '0.65rem' }}>Sobrante: {ret.origen_elemento_id}</span>
                        </div>
                      ))}
                    </div>
                  </details>
                </div>
              ) : null}

              {/* ---- Configuración de Niveles del Proyecto ---- */}
              <NivelesProyecto
                niveles={proyecto.nivelesProyecto ?? []}
                onAdd={onAddNivel}
                onUpdate={onUpdateNivel}
                onRemove={onRemoveNivel}
              />

              {/* ---- Desglose por Piso (resolvePisoMuro — 4 niveles de prioridad) ---- */}
              {(() => {
                // resolvePisoMuro usa: IFC storey → rango Z en nivelesProyecto → piso manual → fallback
                const grupos = new Map<string, { muros: typeof proyecto.muros; resultados: typeof resultado.muros }>();
                const tieneStoreyIFC = proyecto.muros.some(m => m.storey);
                const tieneNiveles = (proyecto.nivelesProyecto ?? []).length > 0;

                proyecto.muros.forEach((m, idx) => {
                  const label = resolvePisoMuro(m);
                  if (!grupos.has(label)) grupos.set(label, { muros: [], resultados: [] });
                  grupos.get(label)!.muros.push(m);
                  if (resultado.muros[idx]) grupos.get(label)!.resultados.push(resultado.muros[idx]);

                });

                if (grupos.size <= 1) return null;

                const modeLabel = tieneStoreyIFC
                  ? `🏢 Desglose por Piso IFC (${grupos.size} niveles)`
                  : tieneNiveles
                    ? `🏗️ Desglose por Niveles Configurados (${grupos.size} pisos)`
                    : `📐 Desglose por Altura (${grupos.size} grupos)`;

                const badgeLabel = tieneStoreyIFC ? 'IFC real' : tieneNiveles ? 'config. manual' : null;
                const badgeColor = tieneStoreyIFC ? '#6366f1' : '#10b981';
                const headerColor = tieneStoreyIFC ? '#6366f1' : tieneNiveles ? '#10b981' : '#94a3b8';

                return (
                  <details style={{ marginTop: '1rem' }} open>
                    <summary style={{
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: '0.82rem',
                      color: headerColor,
                      padding: '0.5rem 0',
                      listStyle: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      userSelect: 'none',
                    }}>
                      {modeLabel}
                      {badgeLabel && (
                        <span style={{
                          background: `rgba(${tieneStoreyIFC ? '99,102,241' : '16,185,129'},0.15)`,
                          color: badgeColor,
                          fontSize: '0.62rem',
                          fontWeight: 500,
                          padding: '1px 6px',
                          borderRadius: '99px',
                          border: `1px solid rgba(${tieneStoreyIFC ? '99,102,241' : '16,185,129'},0.3)`,
                        }}>
                          {badgeLabel}
                        </span>
                      )}
                    </summary>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.75rem' }}>
                      {Array.from(grupos.entries()).map(([label, grupo]) => {
                        const totalPlacas = grupo.resultados.reduce((s, r) => s + r.placas.cantidad_total, 0);
                        const totalMontantes = grupo.resultados.reduce((s, r) => s + r.perfiles.montantes, 0);
                        const totalRieles = grupo.resultados.reduce((s, r) => s + r.perfiles.rieles_barras, 0);
                        const totalTornillos = grupo.resultados.reduce((s, r) => s + r.tornillos.placa_perfil + r.tornillos.perfil_perfil, 0);
                        return (
                          <div key={label} style={{
                            background: 'rgba(30, 41, 59, 0.4)',
                            border: tieneStoreyIFC
                              ? '1px solid rgba(99,102,241,0.2)'
                              : '1px solid rgba(255,255,255,0.06)',
                            borderRadius: '12px',
                            padding: '0.875rem 1rem',
                          }}>
                            <div style={{ fontWeight: 600, fontSize: '0.8rem', color: '#e2e8f0', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span>{label}</span>
                              <span style={{ color: '#64748b', fontSize: '0.72rem' }}>
                                {grupo.muros.length} muro{grupo.muros.length !== 1 ? 's' : ''}
                              </span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.4rem' }}>
                              {[
                                { label: 'Placas', value: `${totalPlacas}`, unit: 'und', color: '#6366f1' },
                                { label: 'Montantes', value: `${totalMontantes}`, unit: 'barras', color: '#10b981' },
                                { label: 'Rieles', value: `${totalRieles}`, unit: 'barras', color: '#f59e0b' },
                                { label: 'Tornillos', value: `${totalTornillos}`, unit: 'und', color: '#f87171' },
                              ].map(item => (
                                <div key={item.label} style={{
                                  background: 'rgba(15, 23, 42, 0.5)',
                                  borderRadius: '8px',
                                  padding: '0.4rem 0.6rem',
                                  textAlign: 'center',
                                }}>
                                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: item.color }}>{item.value}</div>
                                  <div style={{ fontSize: '0.6rem', color: '#64748b', marginTop: '1px' }}>{item.unit}</div>
                                  <div style={{ fontSize: '0.6rem', color: '#475569', marginTop: '1px' }}>{item.label}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </details>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {activeTab === 'muro' && (
        <div className="animate-fade-in">
          <div className={styles.tabContent}>
            {activeElementTab === 'muros' ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <button
                    style={{
                      background: muroViewMode === '3d' ? 'var(--accent, #6366f1)' : 'rgba(255,255,255,0.04)',
                      color: '#fff',
                      border: '1px solid rgba(255,255,255,0.08)',
                      padding: '0.4rem 0.8rem',
                      borderRadius: '8px',
                      fontSize: '0.78rem',
                      cursor: 'pointer',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem'
                    }}
                    onClick={() => setMuroViewMode('3d')}
                  >
                    📏 Plano de Placas (Interactivo)
                  </button>
                  <button
                    style={{
                      background: muroViewMode === '2d' ? 'var(--accent, #6366f1)' : 'rgba(255,255,255,0.04)',
                      color: '#fff',
                      border: '1px solid rgba(255,255,255,0.08)',
                      padding: '0.4rem 0.8rem',
                      borderRadius: '8px',
                      fontSize: '0.78rem',
                      cursor: 'pointer',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem'
                    }}
                    onClick={() => setMuroViewMode('2d')}
                  >
                    ♻️ Plano de Cortes y Retazos (Nesting 2D)
                  </button>
                </div>

                {muroViewMode === '3d' ? (
                  <MuroVisualizer
                    resultado={currentResultadoMuro}
                    largo_m={largo_m}
                    alto_m={alto_m}
                    aberturas={aberturas}
                    carasConfig={carasConfig}
                    capasConfig={capasConfig}
                  />
                ) : (
                  <Placas2DVisualizer
                    placas={currentResultadoMuro?.placas?.detalle || []}
                    aberturas={aberturas}
                    largoMuro={largo_m}
                    altoMuro={alto_m}
                    nombreMuro={`Muro #${selectedMuroIdx + 1}`}
                  />
                )}

                {state === 'done' && currentResultadoMuro ? (
                  <>
                    <div className={styles.weightCard} style={{ marginTop: '1.25rem' }}>
                      <div className={styles.weightHeader}>
                        <span className={styles.weightIcon}>⚖️</span>
                        <div>
                          <span className={styles.weightTitle}>Peso Estructural Estimado — Muro #{selectedMuroIdx + 1}</span>
                          <p className={styles.weightDesc}>Carga total aproximada a transmitir a losas/vigas</p>
                        </div>
                      </div>
                      <div className={styles.weightValue}>{muroWeight.toFixed(1)} kg</div>
                    </div>

                    <div className={styles.tableWrapper}>
                      <table className={styles.table}>
                        <thead>
                          <tr>
                            <th>Grupo</th>
                            <th>Material / Insumo</th>
                            <th style={{ textAlign: 'right' }}>Cantidad</th>
                            <th>Detalle Técnico</th>
                            <th style={{ textAlign: 'right' }}>Peso Est.</th>
                          </tr>
                        </thead>
                        <tbody>
                          {muroRows.map((row, idx) => (
                            <tr key={idx}>
                              <td>
                                <span className={`${styles.badge} ${styles[row.grupo.toLowerCase()] || ''}`}>
                                  {row.grupo}
                                </span>
                              </td>
                              <td className={styles.materialName}>{row.nombre}</td>
                              <td className={styles.materialQty}>{row.cantidad}</td>
                              <td className={styles.materialDetail}>{row.detalle}</td>
                              <td className={styles.materialWeight}>{row.peso ? `${row.peso.toFixed(1)} kg` : '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Visualización de Nesting de Perfiles para Muro */}
                    {currentResultadoMuro.perfiles.nesting_montantes && currentResultadoMuro.perfiles.nesting_rieles && (
                      <div style={{
                        marginTop: '1.5rem',
                        border: '1px solid rgba(255,255,255,0.06)',
                        borderRadius: '16px',
                        padding: '1.25rem',
                        background: 'rgba(30, 41, 59, 0.2)'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                          <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary, #f8fafc)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            ⚡ Optimización de Cortes (Nesting 1D)
                          </h3>
                          <div style={{ display: 'flex', gap: '0.35rem' }}>
                            <button
                              style={{
                                background: nestingProfileTab === 'montantes' ? 'var(--accent, #6366f1)' : 'rgba(255,255,255,0.04)',
                                color: '#fff',
                                border: 'none',
                                padding: '0.25rem 0.6rem',
                                borderRadius: '6px',
                                fontSize: '0.72rem',
                                cursor: 'pointer',
                                fontWeight: 500
                              }}
                              onClick={() => setNestingProfileTab('montantes')}
                            >
                              Montantes
                            </button>
                            <button
                              style={{
                                background: nestingProfileTab === 'rieles' ? 'var(--accent, #6366f1)' : 'rgba(255,255,255,0.04)',
                                color: '#fff',
                                border: 'none',
                                padding: '0.25rem 0.6rem',
                                borderRadius: '6px',
                                fontSize: '0.72rem',
                                cursor: 'pointer',
                                fontWeight: 500
                              }}
                              onClick={() => setNestingProfileTab('rieles')}
                            >
                              Rieles
                            </button>
                          </div>
                        </div>

                        {nestingProfileTab === 'montantes' ? (
                          <NestingVisualizer
                            nesting={currentResultadoMuro.perfiles.nesting_montantes}
                            largoBarraComercial={catalogo.perfiles.montante.find(m => m.codigo === form.perfil)?.largo_barra_m || 3.00}
                            nombrePerfil={form.perfil}
                          />
                        ) : (
                          <NestingVisualizer
                            nesting={currentResultadoMuro.perfiles.nesting_rieles}
                            largoBarraComercial={catalogo.perfiles.riel.find(r => r.codigo === form.riel)?.largo_barra_m || 3.00}
                            nombrePerfil={form.riel}
                          />
                        )}
                      </div>
                    )}

                    <details className={styles.trazabilidad}>
                      <summary className={styles.trazabilidadSummary}>📋 Ver trazabilidad y fórmulas matemáticas</summary>
                      <div className={styles.trazabilidadList}>
                        {currentResultadoMuro.trazabilidad.map((t, i) => (
                          <div key={i} className={styles.trazabilidadItem}>
                            <span className={styles.trazabilidadNum}>{i + 1}</span>
                            <span className={styles.trazabilidadText}>{t}</span>
                          </div>
                        ))}
                      </div>
                    </details>
                  </>
                ) : (
                  <div className={styles.emptyState} style={{ padding: '2.5rem 1rem', marginTop: '1rem' }}>
                    <div className={styles.emptyIcon}>📐</div>
                    <h3 className={styles.emptyTitle} style={{ fontSize: '1rem', marginBottom: '0.25rem' }}>Vista previa del trazo de placas</h3>
                    <p className={styles.emptyText} style={{ fontSize: '0.78rem' }}>
                      Presioná <strong>Calcular materiales</strong> en el panel izquierdo para computar este muro.
                    </p>
                  </div>
                )}
              </>
            ) : (
              <>
                {/* Visualizador de Cielorraso */}
                <div style={{
                  padding: '2.5rem 1.5rem',
                  background: 'rgba(30, 41, 59, 0.25)',
                  border: '1px dashed rgba(255,255,255,0.06)',
                  borderRadius: '16px',
                  textAlign: 'center',
                  color: 'var(--text-secondary)'
                }}>
                  <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '0.5rem' }}>🌌</span>
                  <h3 style={{ fontSize: '1.05rem', color: 'var(--text-primary)', margin: '0 0 0.25rem' }}>
                    Cielorraso: {currentCielorraso?.nombre || `Cielorraso #${selectedCielorrasoIdx + 1}`}
                  </h3>
                  <p style={{ fontSize: '0.8rem', maxWidth: '380px', margin: '0 auto 1.25rem' }}>
                    La modulación y el plano de cuelgues de la estructura metálica horizontal del cielorraso se pueden visualizar en detalle 3D en la pestaña de arriba.
                  </p>
                  <Button variant="secondary" size="sm" onClick={() => setActiveTab('bim')}>
                    🧱 Ir al Visor 3D Estructural
                  </Button>
                </div>

                {state === 'done' && resultado && resultado.cielorrasos && resultado.cielorrasos[selectedCielorrasoIdx] ? (
                  (() => {
                    const resCie = resultado.cielorrasos[selectedCielorrasoIdx];
                    const cieForm = proyecto.cielorrasos?.[selectedCielorrasoIdx];
                    if (!cieForm) return null;
                    const cieRows = getCielorrasoMaterialRows(resCie, cieForm);
                    const cieWeight = totalWeight(cieRows);

                    return (
                      <>
                        <div className={styles.weightCard} style={{ marginTop: '1.25rem' }}>
                          <div className={styles.weightHeader}>
                            <span className={styles.weightIcon}>⚖️</span>
                            <div>
                              <span className={styles.weightTitle}>Peso Estructural del Cielorraso</span>
                              <p className={styles.weightDesc}>Carga muerta transmitida a la losa / estructura soporte</p>
                            </div>
                          </div>
                          <div className={styles.weightValue}>{cieWeight.toFixed(1)} kg</div>
                        </div>

                        <div className={styles.tableWrapper}>
                          <table className={styles.table}>
                            <thead>
                              <tr>
                                <th>Grupo</th>
                                <th>Material / Insumo</th>
                                <th style={{ textAlign: 'right' }}>Cantidad</th>
                                <th>Detalle Técnico</th>
                                <th style={{ textAlign: 'right' }}>Peso Est.</th>
                              </tr>
                            </thead>
                            <tbody>
                              {cieRows.map((row, idx) => (
                                <tr key={idx}>
                                  <td>
                                    <span className={`${styles.badge} ${styles[row.grupo.toLowerCase()] || ''}`}>
                                      {row.grupo}
                                    </span>
                                  </td>
                                  <td className={styles.materialName}>{row.nombre}</td>
                                  <td className={styles.materialQty}>{row.cantidad}</td>
                                  <td className={styles.materialDetail}>{row.detalle}</td>
                                  <td className={styles.materialWeight}>{row.peso ? `${row.peso.toFixed(1)} kg` : '—'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Visualización de Nesting de Perfiles para Cielorraso */}
                        {resCie.nesting_secundarios && (
                          <div style={{
                            marginTop: '1.5rem',
                            border: '1px solid rgba(255,255,255,0.06)',
                            borderRadius: '16px',
                            padding: '1.25rem',
                            background: 'rgba(30, 41, 59, 0.2)',
                            textAlign: 'left'
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                              <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary, #f8fafc)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                ⚡ Optimización de Cortes (Nesting 1D)
                              </h3>
                              <div style={{ display: 'flex', gap: '0.35rem' }}>
                                <button
                                  style={{
                                    background: nestingCielorrasoProfileTab === 'secundarios' ? 'var(--accent, #6366f1)' : 'rgba(255,255,255,0.04)',
                                    color: '#fff',
                                    border: 'none',
                                    padding: '0.25rem 0.6rem',
                                    borderRadius: '6px',
                                    fontSize: '0.72rem',
                                    cursor: 'pointer',
                                    fontWeight: 500
                                  }}
                                  onClick={() => setNestingCielorrasoProfileTab('secundarios')}
                                >
                                  Secundarios
                                </button>
                                {resCie.nesting_principales && (
                                  <button
                                    style={{
                                      background: nestingCielorrasoProfileTab === 'principales' ? 'var(--accent, #6366f1)' : 'rgba(255,255,255,0.04)',
                                      color: '#fff',
                                      border: 'none',
                                      padding: '0.25rem 0.6rem',
                                      borderRadius: '6px',
                                      fontSize: '0.72rem',
                                      cursor: 'pointer',
                                      fontWeight: 500
                                    }}
                                    onClick={() => setNestingCielorrasoProfileTab('principales')}
                                  >
                                    Principales
                                  </button>
                                )}
                                <button
                                  style={{
                                    background: nestingCielorrasoProfileTab === 'perimetrales' ? 'var(--accent, #6366f1)' : 'rgba(255,255,255,0.04)',
                                    color: '#fff',
                                    border: 'none',
                                    padding: '0.25rem 0.6rem',
                                    borderRadius: '6px',
                                    fontSize: '0.72rem',
                                    cursor: 'pointer',
                                    fontWeight: 500
                                  }}
                                  onClick={() => setNestingCielorrasoProfileTab('perimetrales')}
                                >
                                  Perimetrales
                                </button>
                              </div>
                            </div>

                            {nestingCielorrasoProfileTab === 'secundarios' && (
                              <NestingVisualizer
                                nesting={resCie.nesting_secundarios}
                                largoBarraComercial={catalogo.perfiles.omega?.find(o => o.codigo === cieForm.perfil_secundario)?.largo_barra_m || catalogo.perfiles.montante.find(m => m.codigo === cieForm.perfil_secundario)?.largo_barra_m || 3.00}
                                nombrePerfil={cieForm.perfil_secundario}
                              />
                            )}
                            {nestingCielorrasoProfileTab === 'principales' && resCie.nesting_principales && (
                              <NestingVisualizer
                                nesting={resCie.nesting_principales}
                                largoBarraComercial={cieForm.perfil_principal ? (catalogo.perfiles.montante.find(m => m.codigo === cieForm.perfil_principal)?.largo_barra_m || 3.00) : 3.00}
                                nombrePerfil={cieForm.perfil_principal || ''}
                              />
                            )}
                            {nestingCielorrasoProfileTab === 'perimetrales' && resCie.nesting_perimetrales && (
                              <NestingVisualizer
                                nesting={resCie.nesting_perimetrales}
                                largoBarraComercial={catalogo.perfiles.angular?.find(a => a.codigo === cieForm.perfil_perimetral)?.largo_barra_m || 3.00}
                                nombrePerfil={cieForm.perfil_perimetral}
                              />
                            )}
                          </div>
                        )}

                        <details className={styles.trazabilidad}>
                          <summary className={styles.trazabilidadSummary}>📋 Ver trazabilidad y fórmulas del cielorraso</summary>
                          <div className={styles.trazabilidadList}>
                            {resCie.trazabilidad.map((t: string, i: number) => (
                              <div key={i} className={styles.trazabilidadItem}>
                                <span className={styles.trazabilidadNum}>{i + 1}</span>
                                <span className={styles.trazabilidadText}>{t}</span>
                              </div>
                            ))}
                          </div>
                        </details>
                      </>
                    );
                  })()
                ) : (
                  <div className={styles.emptyState} style={{ padding: '2.5rem 1rem', marginTop: '1rem' }}>
                    <div className={styles.emptyIcon}>📐</div>
                    <h3 className={styles.emptyTitle} style={{ fontSize: '1rem', marginBottom: '0.25rem' }}>Presupuesto del cielorraso</h3>
                    <p className={styles.emptyText} style={{ fontSize: '0.78rem' }}>
                      Presioná <strong>Calcular materials</strong> en el panel izquierdo para computar este cielorraso.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {activeTab === 'bim' && (
        <div className="animate-fade-in" style={{ height: 'calc(100vh - 12rem)', minHeight: '520px', width: '100%' }}>
          <BimViewer 
            proyecto={proyecto} 
            resultado={resultado}
            selectedMuroIdx={selectedMuroIdx} 
            onImportarMurosDirecto={onImportarMurosDirecto} 
            selectedCielorrasoIdx={selectedCielorrasoIdx}
            activeElementTab={activeElementTab}
          />
        </div>
      )}
    </main>
  );
};
