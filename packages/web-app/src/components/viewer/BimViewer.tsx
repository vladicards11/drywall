import React, { useEffect, useRef, useState } from 'react';
import { BimWorld, IfcPipeline, MeasureTools, ViewsManager, DrawingExporter, ModelNavigator, StructureGenerator } from '@drywall-calc/bim-viewer';
import type { MeasureMode, View2DType, ElementProperties } from '@drywall-calc/bim-viewer';
import type { ProyectoFormData } from '../../hooks/useProyecto';
import styles from './BimViewer.module.css';

interface BimViewerProps {
  proyecto?: ProyectoFormData;
  selectedMuroIdx?: number;
  onImportarMurosDirecto?: (muros: any[]) => void;
}

export const BimViewer: React.FC<BimViewerProps> = ({ 
  proyecto, 
  selectedMuroIdx = 0,
  onImportarMurosDirecto
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [world, setWorld] = useState<BimWorld | null>(null);
  const [pipeline, setPipeline] = useState<IfcPipeline | null>(null);
  const [measureTools, setMeasureTools] = useState<MeasureTools | null>(null);
  const [viewsManager, setViewsManager] = useState<ViewsManager | null>(null);
  const [modelNavigator, setModelNavigator] = useState<ModelNavigator | null>(null);
  const [structureGenerator, setStructureGenerator] = useState<StructureGenerator | null>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [hasModel, setHasModel] = useState(false);
  const [isShowing3DStructure, setIsShowing3DStructure] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  // Estados de control del usuario
  const [measureMode, setMeasureMode] = useState<MeasureMode>('none');
  const [activeView, setActiveView] = useState<View2DType>('perspective');
  const [isGridVisible, setIsGridVisible] = useState(true);
  const [isClippingActive, setIsClippingActive] = useState(false);

  // Estados para filtros e inspección IFC
  const [selectedProps, setSelectedProps] = useState<ElementProperties | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [categoryVisibility, setCategoryVisibility] = useState<{ [cat: string]: boolean }>({});
  const [showSidebar, setShowSidebar] = useState(false);

  // Inicializar el visor y su ciclo de vida
  useEffect(() => {
    if (!containerRef.current) return;

    // Crear el mundo 3D y el pipeline de carga IFC
    const bimWorld = new BimWorld(containerRef.current);
    const ifcPipeline = new IfcPipeline(bimWorld);
    
    // Inicializar herramientas de medición, vistas, navegador y generador estructural
    const tools = new MeasureTools(bimWorld);
    tools.setColor('#6366f1'); // Indigo-500 premium accent color

    const views = new ViewsManager(bimWorld);
    const navigator = new ModelNavigator(bimWorld);
    const generator = new StructureGenerator(bimWorld);

    ifcPipeline.init().then(() => {
      setWorld(bimWorld);
      setPipeline(ifcPipeline);
      setMeasureTools(tools);
      setViewsManager(views);
      setModelNavigator(navigator);
      setStructureGenerator(generator);
    });

    // Escuchar cambios de selección
    navigator.onElementSelected((props) => {
      setSelectedProps(props);
      if (props) {
        setShowSidebar(true); // Abrir el panel de propiedades al seleccionar un elemento
      }
    });

    // Observer para redimensionado automático
    const resizeObserver = new ResizeObserver(() => {
      bimWorld.resize();
    });
    resizeObserver.observe(containerRef.current);

    // Event listener para atajos de teclado del visor
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!tools) return;

      switch (e.key.toLowerCase()) {
        case 'l':
          tools.setMode('length');
          setMeasureMode('length');
          break;
        case 'a':
          tools.setMode('angle');
          setMeasureMode('angle');
          break;
        case 'p':
          tools.setMode('area');
          setMeasureMode('area');
          break;
        case 'escape':
          tools.cancel();
          tools.setMode('none');
          setMeasureMode('none');
          break;
        case 'delete':
        case 'backspace':
          tools.deleteSelected();
          break;
        default:
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    // Limpieza al desmontar
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      resizeObserver.disconnect();
      ifcPipeline.clear();
      bimWorld.dispose();
    };
  }, []);

  // Cambiar modo de medición desde botones
  const handleToggleMeasure = (mode: MeasureMode) => {
    if (!measureTools) return;
    const newMode = measureMode === mode ? 'none' : mode;
    measureTools.setMode(newMode);
    setMeasureMode(newMode);
  };

  // Alternar la visibilidad de la grilla estructural
  const handleToggleGrid = () => {
    if (!world) return;
    const nextVal = !isGridVisible;
    world.setGridVisible(nextVal);
    setIsGridVisible(nextVal);
  };

  // Cambiar vista 2D / 3D
  const handleSetView = async (viewType: View2DType) => {
    if (!viewsManager) return;
    setIsLoading(true);
    try {
      await viewsManager.setView(viewType);
      setActiveView(viewType);
    } catch (err) {
      console.error("Error al cambiar de vista:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Alternar planos de sección interactivos
  const handleToggleClipping = () => {
    if (!viewsManager) return;
    const nextVal = !isClippingActive;
    viewsManager.setClippingEnabled(nextVal);
    setIsClippingActive(nextVal);
  };

  // Cambiar visibilidad de categoría de forma interactiva
  const handleCategoryToggle = (category: string) => {
    if (!modelNavigator) return;
    const nextVal = !categoryVisibility[category];
    modelNavigator.setCategoryVisibility(category, nextVal);
    setCategoryVisibility(prev => ({ ...prev, [category]: nextVal }));
  };

  // Importar el elemento seleccionado del visor hacia la calculadora de Drywall
  const handleImportElementToCalc = () => {
    if (!selectedProps || !onImportarMurosDirecto) return;

    // Crear el objeto MuroIFC compatible para importar
    const largo = selectedProps.largo_m || 3.0;
    const alto = selectedProps.alto_m || 2.6;
    const espesor = selectedProps.espesor_m || 0.089;

    const muroIFC = {
      expressID: selectedProps.expressID,
      tipo: selectedProps.type || 'IfcWallStandardCase',
      largo_m: largo,
      alto_m: alto,
      espesor_m: espesor,
      aberturas: [] // Las aberturas se pueden mapear o añadir después
    };

    onImportarMurosDirecto([muroIFC]);
    alert(`Muro importado a la calculadora: Largo ${largo}m, Alto ${alto}m, Espesor ${Math.round(espesor * 1000)}mm`);
  };

  // Modelar la estructura Drywall (perfiles y placas) calculada en 3D
  const handleGenerate3DStructure = () => {
    if (!structureGenerator || !proyecto || !proyecto.muros || proyecto.muros.length === 0) {
      alert("No hay muros configurados para modelar en 3D.");
      return;
    }

    const muro = proyecto.muros[selectedMuroIdx] || proyecto.muros[0];
    const separacionMontante = Number(muro.separacion_montante_m) || 0.40;

    // Obtener espesor real del perfil
    const espesorStr = muro.perfil.replace(/\D/g, ''); // Extrae números (ej: P89 -> 89)
    const espesor = espesorStr ? parseInt(espesorStr) / 1000 : 0.089;

    // Limpiar modelo IFC previo del visualizador para ver únicamente la maqueta estructural
    if (pipeline) pipeline.clear();
    if (modelNavigator) modelNavigator.clear();

    const aberturasMapeadas = (muro.aberturas || []).map((ab: any) => ({
      x: Number(ab.distancia_desde_inicio_m) || 0,
      y: ab.tipo === 'ventana' ? 1.0 : 0,
      w: Number(ab.ancho_m) || 0.8,
      h: Number(ab.alto_m) || 2.0,
      tipo: (ab.tipo || 'pase') as 'puerta' | 'ventana' | 'pase'
    }));

    setIsLoading(true);
    setTimeout(() => {
      structureGenerator.generate({
        largo_m: parseFloat(muro.largo_m) || 3.0,
        alto_m: parseFloat(muro.alto_m) || 2.6,
        separacionParantes_m: separacionMontante,
        espesorPerfil_m: espesor,
        aberturas: aberturasMapeadas
      });

      setIsShowing3DStructure(true);
      setHasModel(true);
      setIsLoading(false);
    }, 300);
  };

  // Volver a la carga normal del visor (limpiar la estructura Drywall 3D)
  const handleResetVisor = () => {
    if (structureGenerator) structureGenerator.clear();
    if (pipeline) pipeline.clear();
    if (modelNavigator) modelNavigator.clear();
    setHasModel(false);
    setIsShowing3DStructure(false);
  };

  // Exportar plano de despiece CAD del muro activo
  const handleExportCAD = () => {
    if (!proyecto || !proyecto.muros || proyecto.muros.length === 0) {
      alert("No hay muros configurados en el proyecto actual para exportar.");
      return;
    }

    const muro = proyecto.muros[selectedMuroIdx] || proyecto.muros[0];
    const exportData = {
      proyectoNombre: proyecto.nombre || "Proyecto Drywall",
      muroNombre: `Muro #${selectedMuroIdx + 1}`,
      largo_m: parseFloat(muro.largo_m) || 3.0,
      alto_m: parseFloat(muro.alto_m) || 2.6,
      distanciaParantes_cm: (Number(muro.separacion_montante_m) || 0.40) * 100,
      perfilCodigo: muro.perfil || "P89",
      rielCodigo: muro.riel || "R90",
      placaTipo: muro.placa_tipo || "ST",
      aberturas: (muro.aberturas || []).map((ab: any) => ({
        x: Number(ab.distancia_desde_inicio_m) || 0,
        y: ab.tipo === 'ventana' ? 1.0 : 0,
        w: Number(ab.ancho_m) || 0.8,
        h: Number(ab.alto_m) || 2.0,
        tipo: (ab.tipo || 'pase') as 'puerta' | 'ventana' | 'pase'
      }))
    };

    const svgString = DrawingExporter.generateTechnicalDrawing(exportData);
    
    // Descargar el archivo SVG
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `plano_despiece_cad_${exportData.muroNombre.replace(/\s+/g, '_').toLowerCase()}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Procesar archivo IFC
  const handleFile = async (file: File) => {
    if (!pipeline || !file.name.endsWith('.ifc')) return;
    setIsLoading(true);
    setIsShowing3DStructure(false);
    if (structureGenerator) structureGenerator.clear();
    
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const buffer = new Uint8Array(e.target?.result as ArrayBuffer);
        pipeline.clear(); // Limpiar modelo previo
        if (measureTools) measureTools.clearAll();
        if (viewsManager) viewsManager.clearClippingPlanes();
        if (modelNavigator) modelNavigator.clear();
        
        const model = await pipeline.loadIfc(buffer, file.name);
        
        if (model && modelNavigator) {
          modelNavigator.indexModelCategories(model);
          const cats = modelNavigator.getAvailableCategories();
          setCategories(cats);
          
          const initialVis: { [cat: string]: boolean } = {};
          cats.forEach(c => initialVis[c] = true);
          setCategoryVisibility(initialVis);
        }

        setHasModel(true);
        setIsLoading(false);
      };
      reader.readAsArrayBuffer(file);
    } catch (err) {
      console.error("Error al cargar el archivo IFC:", err);
      setIsLoading(false);
    }
  };

  // Manejo de Drag and Drop
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className={styles.viewerContainer} onDragEnter={handleDrag}>
      {/* Canvas DOM container */}
      <div ref={containerRef} className={styles.canvasContainer} />

      {/* Input oculto de archivos */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".ifc"
        style={{ display: 'none' }}
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />

      {/* Dropzone para subir archivos si no hay modelo */}
      {!hasModel && !isLoading && (
        <div 
          className={`${styles.dropzone} ${dragActive ? styles.dropzoneActive : ''}`}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
        >
          <div className={styles.dropIcon}>🏗️</div>
          <h2 className={styles.dropTitle}>Visualizador BIM 3D</h2>
          <p className={styles.dropSubtitle}>Arrastra tu archivo IFC aquí, o modela la estructura Drywall calculada</p>
          
          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
            <button 
              className={styles.fileButton} 
              onClick={() => fileInputRef.current?.click()}
            >
              Seleccionar Archivo IFC
            </button>
            <button 
              className={styles.fileButton} 
              style={{ background: 'linear-gradient(135deg, #10b981, #059669)', boxShadow: '0 10px 25px -5px rgba(16, 185, 129, 0.4)' }}
              onClick={handleGenerate3DStructure}
            >
              🛠️ Modelar Estructura 3D
            </button>
          </div>
        </div>
      )}

      {/* Indicador de carga */}
      {isLoading && (
        <div className={styles.loadingOverlay}>
          <div className={styles.spinner} />
          <div className={styles.loadingText}>Procesando geometría 3D...</div>
          <div className={styles.loadingSub}>Modulando perfiles estructurales a escala exacta</div>
        </div>
      )}

      {/* Sidebar interactiva para Filtros y Propiedades */}
      {hasModel && showSidebar && (
        <div className={styles.sidebar}>
          <div className={styles.sidebarHeader}>
            <span className={styles.sidebarTitle}>Inspección BIM / Drywall</span>
            <button 
              className={styles.sidebarClose}
              onClick={() => setShowSidebar(false)}
            >
              ✕
            </button>
          </div>
          
          <div className={styles.sidebarContent}>
            {/* Si estamos viendo la estructura 3D modelada por la calculadora */}
            {isShowing3DStructure && (
              <div className={styles.sidebarSection}>
                <h3 className={styles.sectionTitle}>🛠️ Detalles del Modelado</h3>
                <div className={styles.propertyList}>
                  <div className={styles.propertyRow}>
                    <span className={styles.propertyKey}>Muro Activo</span>
                    <span className={styles.propertyValue} style={{ color: '#10b981' }}>
                      Muro #{selectedMuroIdx + 1}
                    </span>
                  </div>
                  <div className={styles.propertyRow}>
                    <span className={styles.propertyKey}>Largo</span>
                    <span className={styles.propertyValue}>
                      {proyecto?.muros[selectedMuroIdx]?.largo_m} m
                    </span>
                  </div>
                  <div className={styles.propertyRow}>
                    <span className={styles.propertyKey}>Alto</span>
                    <span className={styles.propertyValue}>
                      {proyecto?.muros[selectedMuroIdx]?.alto_m} m
                    </span>
                  </div>
                  <div className={styles.propertyRow}>
                    <span className={styles.propertyKey}>Modulación Parantes</span>
                    <span className={styles.propertyValue}>
                      cada {(Number(proyecto?.muros[selectedMuroIdx]?.separacion_montante_m) || 0.40) * 100} cm
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Filtros de visibilidad (solo si cargamos un modelo IFC completo) */}
            {!isShowing3DStructure && (
              <div className={styles.sidebarSection}>
                <h3 className={styles.sectionTitle}>👁️ Filtros de Elementos</h3>
                <div className={styles.categoryList}>
                  {categories.length === 0 ? (
                    <p style={{ fontSize: '0.75rem', color: '#64748b' }}>No se encontraron categorías.</p>
                  ) : (
                    categories.map((cat) => (
                      <label key={cat} className={styles.categoryItem}>
                        <input 
                          type="checkbox" 
                          checked={categoryVisibility[cat] !== false}
                          onChange={() => handleCategoryToggle(cat)}
                        />
                        <span>{cat}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>
            )}

            <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.06)' }} />

            {/* Inspección de Propiedades de Elemento Seleccionado */}
            <div className={styles.sidebarSection}>
              <h3 className={styles.sectionTitle}>📄 Propiedades del Elemento</h3>
              {selectedProps ? (
                <div className={styles.propertyList} style={{ gap: '0.6rem' }}>
                  <div className={styles.propertyRow}>
                    <span className={styles.propertyKey}>ID Express</span>
                    <span className={styles.propertyValue}>{selectedProps.expressID}</span>
                  </div>
                  <div className={styles.propertyRow}>
                    <span className={styles.propertyKey}>Categoría</span>
                    <span className={styles.propertyValue} style={{ color: '#818cf8' }}>
                      {selectedProps.type}
                    </span>
                  </div>
                  <div className={styles.propertyRow}>
                    <span className={styles.propertyKey}>Nombre</span>
                    <span className={styles.propertyValue}>{selectedProps.name}</span>
                  </div>

                  {/* Dimensiones deducidas matemáticamente */}
                  {selectedProps.largo_m !== undefined && selectedProps.largo_m > 0 && (
                    <div className={styles.propertyRow} style={{ borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '0.4rem' }}>
                      <span className={styles.propertyKey} style={{ color: '#10b981' }}>Largo (Calculado)</span>
                      <span className={styles.propertyValue} style={{ color: '#10b981' }}>{selectedProps.largo_m} m</span>
                    </div>
                  )}
                  {selectedProps.alto_m !== undefined && selectedProps.alto_m > 0 && (
                    <div className={styles.propertyRow}>
                      <span className={styles.propertyKey} style={{ color: '#10b981' }}>Alto (Calculado)</span>
                      <span className={styles.propertyValue} style={{ color: '#10b981' }}>{selectedProps.alto_m} m</span>
                    </div>
                  )}
                  {selectedProps.espesor_m !== undefined && selectedProps.espesor_m > 0 && (
                    <div className={styles.propertyRow}>
                      <span className={styles.propertyKey} style={{ color: '#10b981' }}>Espesor</span>
                      <span className={styles.propertyValue} style={{ color: '#10b981' }}>{Math.round(selectedProps.espesor_m * 1000)} mm</span>
                    </div>
                  )}

                  {/* Botón de importación a calculadora */}
                  {onImportarMurosDirecto && (selectedProps.type.toUpperCase().includes('WALL') || selectedProps.type.toUpperCase().includes('MURO')) && (
                    <button 
                      className={styles.fileButton}
                      style={{ 
                        marginTop: '0.6rem', 
                        width: '100%', 
                        background: 'linear-gradient(135deg, #4f46e5, #3b82f6)',
                        boxShadow: '0 8px 20px -4px rgba(79, 70, 229, 0.4)'
                      }}
                      onClick={handleImportElementToCalc}
                    >
                      📥 Importar a Muros Activos
                    </button>
                  )}
                </div>
              ) : (
                <div className={styles.noSelection}>
                  <div className={styles.noSelectionIcon}>🖱</div>
                  <p>Haz click sobre cualquier elemento del modelo 3D para ver sus dimensiones deducidas e importarlas</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Barra de herramientas flotante premium */}
      {hasModel && world && (
        <div className={styles.toolbar}>
          {/* Cargar / Limpiar */}
          <button 
            className={styles.toolButton} 
            title="Cargar otro archivo IFC"
            onClick={() => fileInputRef.current?.click()}
          >
            📂
          </button>
          
          <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />

          {/* Grilla estructural */}
          <button 
            className={`${styles.toolButton} ${isGridVisible ? styles.toolButtonActive : ''}`}
            title="Alternar grilla de referencia (🌐)"
            onClick={handleToggleGrid}
          >
            🌐
          </button>

          {/* Sidebar toggle button */}
          <button 
            className={`${styles.toolButton} ${showSidebar ? styles.toolButtonActive : ''}`}
            title="Mostrar panel de Filtros e Inspección"
            onClick={() => setShowSidebar(!showSidebar)}
          >
            👁️
          </button>

          <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />

          {/* Toggles de Vistas Ortogonales */}
          <button 
            className={`${styles.toolButton} ${activeView === 'perspective' ? styles.toolButtonActive : ''}`} 
            title="Vista 3D Libre"
            onClick={() => handleSetView('perspective')}
          >
            🧊
          </button>
          <button 
            className={`${styles.toolButton} ${activeView === 'top' ? styles.toolButtonActive : ''}`} 
            title="Planta (Vista superior)"
            onClick={() => handleSetView('top')}
          >
            平面
          </button>
          <button 
            className={`${styles.toolButton} ${activeView === 'front' ? styles.toolButtonActive : ''}`} 
            title="Elevación Frontal"
            onClick={() => handleSetView('front')}
          >
            立面
          </button>
          <button 
            className={`${styles.toolButton} ${activeView === 'side' ? styles.toolButtonActive : ''}`} 
            title="Elevación Lateral"
            onClick={() => handleSetView('side')}
          >
            侧面
          </button>

          <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />

          {/* Planos de Sección (Clipper) */}
          <button 
            className={`${styles.toolButton} ${isClippingActive ? styles.toolButtonActive : ''}`} 
            title="Activar plano de sección interactivo (Doble-click en una pared)"
            onClick={handleToggleClipping}
          >
            ✂️
          </button>

          <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />

          {/* Herramientas de medición */}
          <button 
            className={`${styles.toolButton} ${measureMode === 'length' ? styles.toolButtonActive : ''}`} 
            title="Medir distancia lineal (L)"
            onClick={() => handleToggleMeasure('length')}
          >
            📏
          </button>
          <button 
            className={`${styles.toolButton} ${measureMode === 'angle' ? styles.toolButtonActive : ''}`} 
            title="Medir ángulo en 3D (A)"
            onClick={() => handleToggleMeasure('angle')}
          >
            📐
          </button>
          <button 
            className={`${styles.toolButton} ${measureMode === 'area' ? styles.toolButtonActive : ''}`} 
            title="Medir área (P)"
            onClick={() => handleToggleMeasure('area')}
          >
            ⬜
          </button>

          <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />

          {/* Botones de Estructura Drywall & Exportador CAD */}
          <button 
            className={styles.fileButton} 
            style={{ 
              padding: '0.35rem 0.75rem', 
              fontSize: '0.78rem', 
              boxShadow: 'none',
              background: 'linear-gradient(135deg, #10b981, #059669)'
            }}
            title="Modelar perfiles metálicos y placas Drywall calculados"
            onClick={handleGenerate3DStructure}
          >
            🛠️ 3D
          </button>

          <button 
            className={styles.fileButton} 
            style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem', boxShadow: 'none' }}
            title="Exportar plano de modulación a escala CAD (SVG)"
            onClick={handleExportCAD}
          >
            💾 CAD
          </button>

          <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />

          {/* Borrar mediciones / Todo */}
          <button 
            className={styles.toolButton} 
            title="Borrar todas las mediciones, secciones y maqueta 3D"
            onClick={() => {
              measureTools?.clearAll();
              viewsManager?.clearClippingPlanes();
              modelNavigator?.clear();
              if (structureGenerator) structureGenerator.clear();
              setIsShowing3DStructure(false);
            }}
          >
            🧼
          </button>

          <button 
            className={styles.toolButton} 
            title="Limpiar visor"
            onClick={handleResetVisor}
          >
            🗑️
          </button>
        </div>
      )}
    </div>
  );
};
