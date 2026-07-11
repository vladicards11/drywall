import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { BimWorld, IfcPipeline, MeasureTools, ViewsManager, DrawingExporter, ModelNavigator, StructureGenerator } from '@drywall-calc/bim-viewer';
import type { MeasureMode, View2DType, ElementProperties } from '@drywall-calc/bim-viewer';
import type { ProyectoFormData } from '../../hooks/useProyecto';
import type { ResultadoProyecto } from '@drywall-calc/catalog-schemas';
import styles from './BimViewer.module.css';

interface BimViewerProps {
  proyecto?: ProyectoFormData;
  resultado?: ResultadoProyecto | null;
  selectedMuroIdx?: number;
  onImportarMurosDirecto?: (muros: any[]) => void;
  selectedCielorrasoIdx?: number;
  activeElementTab?: 'muros' | 'cielorrasos';
}

export const BimViewer: React.FC<BimViewerProps> = ({ 
  proyecto, 
  resultado,
  selectedMuroIdx = 0,
  onImportarMurosDirecto,
  selectedCielorrasoIdx = 0,
  activeElementTab = 'muros'
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
  const [showPlacas, setShowPlacas] = useState(true);
  const [showEstructura, setShowEstructura] = useState(true);

  // Estados para filtros e inspección IFC
  const [selectedProps, setSelectedProps] = useState<ElementProperties | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [categoryVisibility, setCategoryVisibility] = useState<{ [cat: string]: boolean }>({});
  const [showSidebar, setShowSidebar] = useState(false);
  const [floors, setFloors] = useState<any[]>([]);
  const [activeFloorId, setActiveFloorId] = useState<string | null>(null);

  // Estados para avance de obra y marcadores 3D
  const [murosAvance, setMurosAvance] = useState<{ [id: string]: 'planificado' | 'estructurado' | 'cerrado' | 'terminado' }>({});
  const [pinMode, setPinMode] = useState(false);
  const [markers, setMarkers] = useState<Array<{ id: string; text: string; point: THREE.Vector3 }>>([]);
  const [rawIfcBuffer, setRawIfcBuffer] = useState<ArrayBuffer | null>(null);

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

    ifcPipeline.init('/web-ifc/')
      .then(() => {
        setWorld(bimWorld);
        setPipeline(ifcPipeline);
        setMeasureTools(tools);
        setViewsManager(views);
        setModelNavigator(navigator);
        setStructureGenerator(generator);
      })
      .catch((err) => {
        console.error("Error al inicializar el visualizador 3D:", err);
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

  // Actualizar visibilidad de capas en el structureGenerator
  useEffect(() => {
    if (structureGenerator && isShowing3DStructure) {
      structureGenerator.setVisibility(showPlacas, showEstructura);
    }
  }, [showPlacas, showEstructura, isShowing3DStructure, structureGenerator]);

  // Cambiar modo de medición desde botones
  const handleToggleMeasure = (mode: MeasureMode) => {
    if (!measureTools) return;
    setPinMode(false); // Desactivar modo pin al medir
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

  // Cambiar el estado de avance de un muro y aplicar coloración en el visor
  const handleStatusChange = (muroName: string, status: 'planificado' | 'estructurado' | 'cerrado' | 'terminado') => {
    const newAvance = { ...murosAvance, [muroName]: status };
    setMurosAvance(newAvance);
    
    if (modelNavigator) {
      const statusMap = new Map<string | number, 'planificado' | 'estructurado' | 'cerrado' | 'terminado'>();
      Object.entries(newAvance).forEach(([key, val]) => {
        statusMap.set(key, val);
      });
      modelNavigator.applyProgressColors(statusMap);
    }
  };

  // Click doble en lienzo para colocar un marcador/anotación 3D
  const handleCanvasDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!pinMode || !world || !modelNavigator) return;

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2(x, y);

    const camera = world.world.camera.three;
    const scene = world.world.scene.three;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(scene.children, true);

    if (intersects.length > 0) {
      const validIntersect = intersects.find(intersect => {
        let isMesh = intersect.object instanceof THREE.Mesh;
        let isVisible = intersect.object.visible;
        return isMesh && isVisible;
      });

      const intersect = validIntersect || intersects[0];
      const text = prompt("Ingrese nota de control de calidad o incidente en 3D:");
      if (text) {
        const markerId = modelNavigator.createMarker(text, intersect.point);
        if (markerId) {
          setMarkers(prev => [...prev, { id: markerId, text, point: intersect.point }]);
        }
      }
    }
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
    console.log("Modelar Estructura clicked. Generator:", structureGenerator, "Proyecto:", proyecto, "Tab:", activeElementTab);
    if (!structureGenerator) {
      alert("El visualizador 3D (WASM) aún no se ha inicializado o falló al cargar.");
      return;
    }
    if (!proyecto) {
      alert("No hay un proyecto activo configurado en el sistema.");
      return;
    }

    if (activeElementTab === 'cielorrasos') {
      const cie = proyecto.cielorrasos?.[selectedCielorrasoIdx];
      if (!cie) {
        alert("No hay cielorraso configurado para modelar en 3D.");
        return;
      }

      // Limpiar modelo previo
      if (pipeline) pipeline.clear();
      if (modelNavigator) modelNavigator.clear();

      setIsLoading(true);
      setTimeout(() => {
        structureGenerator.generateCielorraso({
          largo_m: parseFloat(cie.largo_m) || 4.0,
          ancho_m: parseFloat(cie.ancho_m) || 4.0,
          tipo_estructura: cie.tipo_estructura,
          separacion_secundario_m: cie.separacion_secundario_m,
          separacion_principal_m: cie.separacion_principal_m,
          distancia_cuelgue_m: cie.distancia_cuelgue_m,
          altura_suspension_m: parseFloat(cie.altura_suspension_m) || 0.50,
          espesorPerfil_m: 0.038
        });

        // Aplicar filtros de capas actuales
        structureGenerator.setVisibility(showPlacas, showEstructura);

        setIsShowing3DStructure(true);
        setHasModel(true);
        setIsLoading(false);
      }, 300);

    } else {
      if (!proyecto.muros || proyecto.muros.length === 0) {
        alert("No hay muros configurados para modelar en 3D.");
        return;
      }

      const muro = proyecto.muros[selectedMuroIdx] || proyecto.muros[0];
      const separacionMontante = Number(muro.separacion_montante_m) || 0.40;

      // Obtener espesor real del perfil
      const perfilStr = muro.perfil || muro.riel || "P89"; // Fallback seguro
      const espesorStr = perfilStr.replace(/\D/g, ''); // Extrae números (ej: P89 -> 89)
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
          aberturas: aberturasMapeadas,
          placas: resultado?.muros[selectedMuroIdx]?.placas?.detalle || []
        });

        // Aplicar filtros de capas actuales
        structureGenerator.setVisibility(showPlacas, showEstructura);

        setIsShowing3DStructure(true);
        setHasModel(true);
        setIsLoading(false);
      }, 300);
    }
  };

  // Volver a la carga normal del visor (limpiar la estructura Drywall 3D)
  const handleResetVisor = () => {
    if (structureGenerator) structureGenerator.clear();
    if (pipeline) pipeline.clear();
    if (modelNavigator) modelNavigator.clear();
    if (modelNavigator) modelNavigator.clearAllMarkers();
    setHasModel(false);
    setIsShowing3DStructure(false);
    setFloors([]);
    setActiveFloorId(null);
    setMarkers([]);
    setMurosAvance({});
    setRawIfcBuffer(null);
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

  // Exportar plano en formato DXF profesional para AutoCAD
  const handleExportDXF = () => {
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

    const dxfString = DrawingExporter.generateTechnicalDxf(exportData);
    
    // Descargar el archivo DXF
    const blob = new Blob([dxfString], { type: 'application/dxf;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `plano_despiece_cad_${exportData.muroNombre.replace(/\s+/g, '_').toLowerCase()}.dxf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Inyectar elementos de drywall (parantes/placas) en el IFC original y descargar
  const handleInyectarDescargarIFC = async () => {
    if (!rawIfcBuffer) {
      alert("Por favor, cargue primero un modelo IFC original en el visor.");
      return;
    }
    if (!resultado || !resultado.muros || resultado.muros.length === 0) {
      alert("No hay resultados de cálculo en el proyecto actual para inyectar.");
      return;
    }

    setIsLoading(true);
    try {
      const murosData = resultado.muros.map((muro) => {
        const elementos: any[] = [];

        // Montantes
        const numMontantes = (muro.perfiles.montantes || 0) + (muro.perfiles.montantes_refuerzo_vanos || 0) + (muro.perfiles.montantes_union || 0);
        for (let i = 0; i < numMontantes; i++) {
          elementos.push({
            tipo: 'parante',
            nombre: `Muro ${muro.muro_id} - Parante #${i + 1}`
          });
        }

        // Rieles
        const numRieles = muro.perfiles.rieles_barras || 0;
        for (let i = 0; i < numRieles; i++) {
          elementos.push({
            tipo: 'parante',
            nombre: `Muro ${muro.muro_id} - Riel #${i + 1}`
          });
        }

        // Placas
        const numPlacas = Math.ceil(muro.placas.cantidad_total || 0);
        for (let i = 0; i < numPlacas; i++) {
          elementos.push({
            tipo: 'placa',
            nombre: `Muro ${muro.muro_id} - Placa #${i + 1}`
          });
        }

        return {
          muroId: muro.muro_id,
          elementos
        };
      });

      const { inyectarEstructuraDrywall } = await import('@drywall-calc/ifc-importer');
      const modifiedBuffer = await inyectarEstructuraDrywall(rawIfcBuffer, murosData);

      const blob = new Blob([modifiedBuffer as any], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${proyecto?.nombre || 'proyecto'}_modificado_drywall.ifc`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Error al inyectar elementos en IFC:", err);
      alert("Hubo un error al inyectar los elementos en el archivo IFC.");
    } finally {
      setIsLoading(false);
    }
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
        const arrayBuffer = e.target?.result as ArrayBuffer;
        setRawIfcBuffer(arrayBuffer);
        const buffer = new Uint8Array(arrayBuffer);
        pipeline.clear(); // Limpiar modelo previo
        if (measureTools) measureTools.clearAll();
        if (viewsManager) viewsManager.clearClippingPlanes();
        if (modelNavigator) modelNavigator.clear();
        setFloors([]);
        setActiveFloorId(null);
        
        const model = await pipeline.loadIfc(buffer, file.name);
        
        if (model && modelNavigator) {
          modelNavigator.indexModelCategories(model);
          const cats = modelNavigator.getAvailableCategories();
          setCategories(cats);
          
          const initialVis: { [cat: string]: boolean } = {};
          cats.forEach(c => initialVis[c] = true);
          setCategoryVisibility(initialVis);
        }

        if (model && viewsManager) {
          await viewsManager.generatePlans(model);
          const planViews = viewsManager.getPlans();
          setFloors(planViews);
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
      <div 
        ref={containerRef} 
        className={styles.canvasContainer} 
        onDoubleClick={handleCanvasDoubleClick}
      />

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

                  {/* Selector de estado físico de avance */}
                  <div className={styles.propertyRow} style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.6rem', marginTop: '0.4rem', flexDirection: 'column', gap: '0.25rem', alignItems: 'stretch' }}>
                    <span className={styles.propertyKey} style={{ textAlign: 'left', marginBottom: '0.2rem' }}>Estado de Avance Físico:</span>
                    <select
                      value={murosAvance[selectedProps.name] || 'planificado'}
                      onChange={(e) => handleStatusChange(selectedProps.name, e.target.value as any)}
                      className={styles.floorSelect}
                      style={{ width: '100%', height: '32px', minWidth: 'auto' }}
                    >
                      <option value="planificado">⚪ Planificado</option>
                      <option value="estructurado">🟡 Estructurado (Parantes)</option>
                      <option value="cerrado">🔵 Cerrado (Placas)</option>
                      <option value="terminado">🟢 Terminado (Masilla/Cinta)</option>
                    </select>
                  </div>

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

            {/* Lista de incidentes/anotaciones 3D */}
            <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.06)', margin: '0.5rem 0' }} />
            <div className={styles.sidebarSection}>
              <h3 className={styles.sectionTitle}>📍 Notas de Calidad ({markers.length})</h3>
              {markers.length === 0 ? (
                <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Haga doble clic en una pared con el modo marcador [📍] activo para crear una nota 3D.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '150px', overflowY: 'auto' }}>
                  {markers.map((m) => (
                    <div 
                      key={m.id} 
                      style={{ 
                        background: 'rgba(2, 6, 17, 0.4)', 
                        border: '1px solid rgba(255,255,255,0.04)', 
                        borderRadius: '8px', 
                        padding: '0.5rem', 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        fontSize: '0.75rem'
                      }}
                    >
                      <span style={{ color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '80%' }} title={m.text}>
                        {m.text}
                      </span>
                      <button 
                        onClick={() => {
                          modelNavigator?.deleteMarker(m.id);
                          setMarkers(prev => prev.filter(x => x.id !== m.id));
                        }}
                        style={{ background: 'transparent', border: 'none', color: '#f43f5e', cursor: 'pointer', fontSize: '0.8rem', padding: 0 }}
                        title="Eliminar pin"
                      >
                        ❌
                      </button>
                    </div>
                  ))}
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

          {/* Selector de pisos */}
          {floors.length > 0 && (
            <>
              <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />
              <select
                value={activeFloorId || ""}
                onChange={async (e) => {
                  const id = e.target.value;
                  if (id) {
                    await viewsManager?.goToPlan(id);
                    setActiveFloorId(id);
                  } else {
                    await viewsManager?.exitPlan();
                    setActiveFloorId(null);
                  }
                }}
                className={styles.floorSelect}
                title="Seleccionar Piso / Nivel"
              >
                <option value="">Vista 3D Completa</option>
                {floors.map((floor) => (
                  <option key={floor.id} value={floor.id}>
                    {floor.name || `Piso ${floor.id}`}
                  </option>
                ))}
              </select>
            </>
          )}

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
            PLA
          </button>
          <button 
            className={`${styles.toolButton} ${activeView === 'front' ? styles.toolButtonActive : ''}`} 
            title="Elevación Frontal"
            onClick={() => handleSetView('front')}
          >
            ALZ
          </button>
          <button 
            className={`${styles.toolButton} ${activeView === 'side' ? styles.toolButtonActive : ''}`} 
            title="Elevación Lateral"
            onClick={() => handleSetView('side')}
          >
            LAT
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

          <button 
            className={`${styles.toolButton} ${pinMode ? styles.toolButtonActive : ''}`} 
            title="Modo Pin / Marcador (Doble clic en muro para colocar) (📍)"
            onClick={() => {
              setPinMode(!pinMode);
              if (measureMode !== 'none') handleToggleMeasure('none');
            }}
          >
            📍
          </button>

          <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />

          {/* Filtros interactivos de capas */}
          {isShowing3DStructure && (
            <>
              <button 
                className={`${styles.toolButton}`}
                title="Mostrar/Ocultar Estructura Metálica (Parantes, Rieles, Colgadores)"
                style={{ 
                  background: showEstructura ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.03)',
                  border: showEstructura ? '1px solid #6366f1' : '1px solid rgba(255,255,255,0.08)',
                  color: showEstructura ? '#818cf8' : '#64748b',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.2rem',
                  padding: '0 0.5rem'
                }}
                onClick={() => setShowEstructura(!showEstructura)}
              >
                ⚙️ Estructura
              </button>
              <button 
                className={`${styles.toolButton}`}
                title="Mostrar/Ocultar Placas de Yeso"
                style={{ 
                  background: showPlacas ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.03)',
                  border: showPlacas ? '1px solid #10b981' : '1px solid rgba(255,255,255,0.08)',
                  color: showPlacas ? '#34d399' : '#64748b',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.2rem',
                  padding: '0 0.5rem'
                }}
                onClick={() => setShowPlacas(!showPlacas)}
              >
                📄 Placas
              </button>
              <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />
            </>
          )}

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

          <button 
            className={styles.fileButton} 
            style={{ 
              padding: '0.35rem 0.75rem', 
              fontSize: '0.78rem', 
              boxShadow: 'none',
              background: 'linear-gradient(135deg, #f59e0b, #d97706)'
            }}
            title="Exportar plano de modulación en formato AutoCAD (DXF)"
            onClick={handleExportDXF}
          >
            📐 DXF
          </button>

          {rawIfcBuffer && (
            <button 
              className={styles.fileButton} 
              style={{ 
                padding: '0.35rem 0.75rem', 
                fontSize: '0.78rem', 
                boxShadow: 'none',
                background: 'linear-gradient(135deg, #10b981, #059669)'
              }}
              title="Inyectar perfiles y placas calculados en el modelo IFC original y descargar"
              onClick={handleInyectarDescargarIFC}
            >
              📥 Descargar IFC Modificado
            </button>
          )}

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
              if (modelNavigator) modelNavigator.clearAllMarkers();
              setMarkers([]);
              setMurosAvance({});
              setRawIfcBuffer(null);
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
