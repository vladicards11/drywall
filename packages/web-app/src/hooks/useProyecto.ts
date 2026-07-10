import { useState, useCallback, useEffect } from 'react';
import { calcularProyecto } from '@drywall-calc/core-engine';
import { obtenerCatalogo, obtenerCatalogoGenericoEstandar, cargarCatalogo } from '@drywall-calc/catalog-schemas';
import type { Muro, Union, ResultadoProyecto, ResultadoMuro, Abertura, Catalogo } from '@drywall-calc/catalog-schemas';
import type { MuroFormData, FormErrors } from './useCalculadora';
import { DEFAULT_FORM, validateForm } from './useCalculadora';

// ---- Nivel / Piso del proyecto (configuración manual) ----
/**
 * Define un nivel arquitectónico del proyecto.
 * Cuando el IFC no tiene IfcBuildingStorey, los muros se asignan
 * automáticamente al nivel cuyo rango de elevación los contenga.
 * El usuario también puede sobreescribir el piso de cada muro individualmente.
 */
export interface NivelProyecto {
  /** Nombre visible del piso, ej: "Planta Baja", "Primer Piso" */
  nombre: string;
  /** Elevación de inicio del piso en metros (cota Z inferior) */
  elevacionInicioM: number;
  /** Altura libre del piso en metros */
  alturaM: number;
}

// ---- Union form data ----
export interface UnionFormData {
  id: string;
  muro_a: string; // muro id (e.g. 'muro_0')
  muro_b: string; // muro id
  tipo_union: string; // tipologia código del catálogo
  angulo_grados: number;
}

// ---- Project-level form data ----
export interface ProyectoFormData {
  nombre: string;
  catalogo_sistema: string; // 'generico_estandar' | 'gyplac_superboard' | 'tupemesa_precor' | 'custom'
  catalogo_custom?: Catalogo; // Overrides when using custom catalog editor
  muros: MuroFormData[];
  uniones: UnionFormData[];
  factor_desperdicio_pct: number; // 0–30, default from catalogo
  /**
   * Definición manual de los pisos/niveles del proyecto.
   * Se usa cuando el IFC no tiene IfcBuildingStorey o el proyecto fue creado manualmente.
   * Cada nivel se define con nombre + elevación de inicio + altura libre.
   */
  nivelesProyecto?: NivelProyecto[];
}

export type ProyectoCalculationState = 'idle' | 'calculating' | 'done' | 'error';

const catalogoDefault = obtenerCatalogoGenericoEstandar();

const DEFAULT_PROYECTO: ProyectoFormData = {
  nombre: 'Proyecto sin nombre',
  catalogo_sistema: 'generico_estandar',
  muros: [{ ...DEFAULT_FORM }],
  uniones: [],
  factor_desperdicio_pct: Math.round(catalogoDefault.factor_desperdicio_placas_default * 100),
  nivelesProyecto: [], // vacío por defecto — el usuario los configura o vienen del IFC
};


function parseFormato(fmt: string): [number, number] {
  const [w, h] = fmt.split('x').map(Number);
  return [w, h];
}

function formToMuro(form: MuroFormData, idx: number): Muro {
  return {
    id: `muro_${idx}`,
    geometria: {
      largo_m: parseFloat(form.largo_m),
      alto_m: parseFloat(form.alto_m),
    },
    sistema: {
      estructura: form.estructura,
      caras: form.caras,
      capas_por_cara: form.capas_por_cara,
      perfil: form.perfil,
      riel: form.riel,
      separacion_montante_m: form.separacion_montante_m,
    },
    placa: {
      tipo: form.placa_tipo,
      espesor_mm: form.placa_espesor_mm,
      formato_m: parseFormato(form.placa_formato),
      orientacion: form.placa_orientacion,
    },
    aberturas: form.aberturas,
    encuentros: [],
  };
}

function formToUnion(u: UnionFormData): Union {
  return {
    id: u.id,
    muros_conectados: [u.muro_a, u.muro_b],
    angulo_grados: u.angulo_grados,
    tipo_union: u.tipo_union,
    config_modulacion: {
      resetear_perfiles: false,
      perfiles_simetricos: true,
    },
  };
}

// ---- Serialización a URL ----
function serializeProyecto(p: ProyectoFormData): string {
  try {
    return btoa(JSON.stringify(p));
  } catch {
    return '';
  }
}

function deserializeProyecto(search: string): ProyectoFormData | null {
  try {
    const params = new URLSearchParams(search);
    const raw = params.get('proyecto');
    if (!raw) return null;
    return JSON.parse(atob(raw)) as ProyectoFormData;
  } catch {
    return null;
  }
}

const getInitialProyecto = (): ProyectoFormData => {
  if (typeof window !== 'undefined') {
    const decoded = deserializeProyecto(window.location.search);
    if (decoded) {
      if (!decoded.catalogo_sistema) decoded.catalogo_sistema = 'generico_estandar';
      return decoded;
    }
    const local = window.localStorage.getItem('drywall_active_proyecto');
    if (local) {
      try {
        const parsed = JSON.parse(local) as ProyectoFormData;
        if (!parsed.catalogo_sistema) parsed.catalogo_sistema = 'generico_estandar';
        return parsed;
      } catch {
        // ignore
      }
    }
  }
  return DEFAULT_PROYECTO;
};

export interface HistorialItem {
  id: string;
  nombre: string;
  timestamp: string;
  datos: ProyectoFormData;
}

export function useProyecto() {
  const [proyecto, setProyecto] = useState<ProyectoFormData>(getInitialProyecto);

  // Resolvido dinámicamente según el catálogo seleccionado
  let catalogo: Catalogo;
  if (proyecto.catalogo_sistema === 'custom' && proyecto.catalogo_custom) {
    catalogo = proyecto.catalogo_custom;
  } else {
    try {
      catalogo = obtenerCatalogo(proyecto.catalogo_sistema);
    } catch {
      catalogo = catalogoDefault;
    }
  }
  const [historial, setHistorial] = useState<HistorialItem[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem('drywall_historial_proyectos');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          // ignore
        }
      }
    }
    return [];
  });
  const [selectedMuroIdx, setSelectedMuroIdx] = useState<number>(0);
  const [errors, setErrors] = useState<FormErrors[]>([{}]);
  const [state, setState] = useState<ProyectoCalculationState>('idle');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [resultado, setResultado] = useState<ResultadoProyecto | null>(null);

  // ---- Muro CRUD ----
  const addMuro = useCallback(() => {
    setProyecto((prev) => {
      const template = prev.muros[selectedMuroIdx] ?? DEFAULT_FORM;
      const newMuro: MuroFormData = { ...template, aberturas: [] };
      const newMuros = [...prev.muros, newMuro];
      setSelectedMuroIdx(newMuros.length - 1);
      setErrors((e) => [...e, {}]);
      return { ...prev, muros: newMuros };
    });
    setState('idle');
  }, [selectedMuroIdx]);

  const duplicarMuro = useCallback((idx: number) => {
    setProyecto((prev) => {
      const src = prev.muros[idx];
      if (!src) return prev;
      const newMuro: MuroFormData = { ...src, aberturas: [...src.aberturas] };
      const newMuros = [...prev.muros.slice(0, idx + 1), newMuro, ...prev.muros.slice(idx + 1)];
      setErrors((e) => {
        const ne = [...e];
        ne.splice(idx + 1, 0, {});
        return ne;
      });
      setSelectedMuroIdx(idx + 1);
      return { ...prev, muros: newMuros };
    });
    setState('idle');
  }, []);

  const removeMuro = useCallback((idx: number) => {
    setProyecto((prev) => {
      if (prev.muros.length <= 1) return prev;
      const newMuros = prev.muros.filter((_, i) => i !== idx);
      // Remove unions referencing this muro
      const removedId = `muro_${idx}`;
      const newUniones = prev.uniones.filter(
        (u) => u.muro_a !== removedId && u.muro_b !== removedId
      );
      setErrors((e) => e.filter((_, i) => i !== idx));
      setSelectedMuroIdx((s) => Math.min(s, newMuros.length - 1));
      return { ...prev, muros: newMuros, uniones: newUniones };
    });
    setState('idle');
  }, []);

  const updateMuroField = useCallback(
    <K extends keyof MuroFormData>(idx: number, key: K, value: MuroFormData[K]) => {
      setProyecto((prev) => {
        const newMuros = [...prev.muros];
        newMuros[idx] = { ...newMuros[idx], [key]: value };
        const newErrors = validateForm(newMuros[idx]);
        setErrors((e) => {
          const ne = [...e];
          ne[idx] = newErrors;
          return ne;
        });
        return { ...prev, muros: newMuros };
      });
      setState('idle');
    },
    []
  );

  const addAbertura = useCallback((idx: number, ab: Abertura) => {
    setProyecto((prev) => {
      const newMuros = [...prev.muros];
      newMuros[idx] = { ...newMuros[idx], aberturas: [...newMuros[idx].aberturas, ab] };
      return { ...prev, muros: newMuros };
    });
    setState('idle');
  }, []);

  const removeAbertura = useCallback((muroIdx: number, abIdx: number) => {
    setProyecto((prev) => {
      const newMuros = [...prev.muros];
      newMuros[muroIdx] = {
        ...newMuros[muroIdx],
        aberturas: newMuros[muroIdx].aberturas.filter((_, i) => i !== abIdx),
      };
      return { ...prev, muros: newMuros };
    });
    setState('idle');
  }, []);

  // ---- Importar muros desde IFC ----
  const importarDesdeIFC = useCallback((
    murosIFC: import('@drywall-calc/ifc-importer').MuroIFC[],
    unionesIFC?: import('@drywall-calc/ifc-importer').UnionIFC[]
  ) => {
    setProyecto((prev) => {
      const cat = prev.catalogo_sistema === 'custom' && prev.catalogo_custom
        ? prev.catalogo_custom
        : (() => { try { return obtenerCatalogo(prev.catalogo_sistema); } catch { return catalogoDefault; } })();

      // Guardamos la asociación expressId -> ID interno asignado para mapear uniones después
      const expressIdToMuroIdMap = new Map<number, string>();
      const offsetIndex = prev.muros.length;

      // Si el proyecto solo tiene el muro vacío por defecto, lo reemplazamos
      const esSoloPorDefecto =
        prev.muros.length === 1 &&
        prev.muros[0].largo_m === DEFAULT_FORM.largo_m &&
        prev.muros[0].alto_m === DEFAULT_FORM.alto_m &&
        prev.muros[0].aberturas.length === 0;

      // Convertimos cada MuroIFC al MuroFormData del formulario
      const nuevosMuros: MuroFormData[] = murosIFC.map((m, idx) => {
        const aberturas = m.aberturas.map((ab) => ({
          tipo: ab.tipo as 'puerta' | 'ventana' | 'pase',
          ancho_m: ab.ancho_m,
          alto_m: ab.alto_m,
          posicion_x_m: ab.posicion_x_m,
          distancia_desde_inicio_m: ab.posicion_x_m, // alias requerido por el tipo Abertura
        }));

        const perfilDefault = cat.perfiles.montante[0]?.codigo ?? '';
        const rielDefault = cat.perfiles.riel[0]?.codigo ?? '';
        const placaDefault = cat.placas[0];

        const targetIdx = esSoloPorDefecto ? idx : offsetIndex + idx;
        expressIdToMuroIdMap.set(m.expressId, `muro_${targetIdx}`);

        return {
          ...DEFAULT_FORM,
          largo_m: m.largo_m.toFixed(2),
          alto_m: m.alto_m.toFixed(2),
          perfil: perfilDefault,
          riel: rielDefault,
          placa_tipo: placaDefault?.tipo ?? DEFAULT_FORM.placa_tipo,
          placa_espesor_mm: placaDefault?.espesor_mm ?? DEFAULT_FORM.placa_espesor_mm,
          placa_formato: placaDefault
            ? `${placaDefault.formatos_m[0][0]}x${placaDefault.formatos_m[0][1]}`
            : DEFAULT_FORM.placa_formato,
          aberturas,
          // Datos espaciales e IFC
          storey: m.storey,
          startX: m.startX,
          startY: m.startY,
          endX: m.endX,
          endY: m.endY,
          notas: m.advertencias.length > 0 ? m.advertencias.join(' | ') : undefined,
        };
      });

      const murosCombinados = esSoloPorDefecto ? nuevosMuros : [...prev.muros, ...nuevosMuros];
      setErrors(murosCombinados.map((mf) => validateForm(mf)));
      setSelectedMuroIdx(esSoloPorDefecto ? 0 : prev.muros.length);

      // Mapeamos las uniones detectadas espacialmente
      const nuevasUniones: UnionFormData[] = [];
      if (unionesIFC) {
        unionesIFC.forEach((u) => {
          const muroAId = expressIdToMuroIdMap.get(u.muros_conectados[0]);
          const muroBId = expressIdToMuroIdMap.get(u.muros_conectados[1]);

          if (muroAId && muroBId) {
            // Mapeo de tipología de unión: buscar una que coincida con el tipo ('L' o 'T') en el catálogo
            const tipoUnionCodigo = catalogo.tipologias_union.find(
              (t) => u.tipo_union === 'T'
                ? t.codigo.toLowerCase().includes('t_') || t.codigo.toLowerCase().includes('encuentro')
                : t.codigo.toLowerCase().includes('esquina')
            )?.codigo ?? (u.tipo_union === 'T' ? 'encuentro_T_simple' : 'esquina_externa_simple');

            nuevasUniones.push({
              id: u.id,
              muro_a: muroAId,
              muro_b: muroBId,
              tipo_union: tipoUnionCodigo,
              angulo_grados: u.angulo_grados,
            });
          }
        });
      }

      // Si no es por defecto, unimos a las uniones ya existentes
      const unionesCombinadas = esSoloPorDefecto ? nuevasUniones : [...prev.uniones, ...nuevasUniones];

      return { 
        ...prev, 
        muros: murosCombinados,
        uniones: unionesCombinadas
      };
    });
    setState('idle');
    setResultado(null);
  }, []);

  // ---- Uniones CRUD ----
  const addUnion = useCallback((union: UnionFormData) => {
    setProyecto((prev) => ({
      ...prev,
      uniones: [...prev.uniones, union],
    }));
    setState('idle');
  }, []);

  const removeUnion = useCallback((id: string) => {
    setProyecto((prev) => ({
      ...prev,
      uniones: prev.uniones.filter((u) => u.id !== id),
    }));
    setState('idle');
  }, []);

  // ---- Nombre del proyecto ----
  const updateNombre = useCallback((nombre: string) => {
    setProyecto((prev) => ({ ...prev, nombre }));
  }, []);

  // ---- Cambio de Catálogo de Referencia ----
  const updateCatalogoSistema = useCallback((sistema: string) => {
    setProyecto((prev) => {
      // Resolve the new catalog
      let newCatalogo;
      try {
        newCatalogo = obtenerCatalogo(sistema);
      } catch {
        newCatalogo = catalogoDefault;
      }

      // Safe transition: reset any selected items in walls if they don't exist in the new catalog
      const newMuros = prev.muros.map((m) => {
        const hasPerfil = newCatalogo.perfiles.montante.some((p) => p.codigo === m.perfil);
        const hasRiel = newCatalogo.perfiles.riel.some((r) => r.codigo === m.riel);
        const hasPlacaTipo = newCatalogo.placas.some((p) => p.tipo === m.placa_tipo);

        return {
          ...m,
          perfil: hasPerfil ? m.perfil : newCatalogo.perfiles.montante[0]?.codigo || '',
          riel: hasRiel ? m.riel : newCatalogo.perfiles.riel[0]?.codigo || '',
          placa_tipo: hasPlacaTipo ? m.placa_tipo : newCatalogo.placas[0]?.tipo || '',
          placa_espesor_mm: hasPlacaTipo ? m.placa_espesor_mm : newCatalogo.placas[0]?.espesor_mm || 12.5,
          placa_formato: hasPlacaTipo ? m.placa_formato : `${newCatalogo.placas[0]?.formatos_m[0][0]}x${newCatalogo.placas[0]?.formatos_m[0][1]}` || '1.20x2.40',
        };
      });

      // Clear/validate uniones if they are not compatible (they are generally compatible standard types, but just in case)
      const allowedUnions = new Set(newCatalogo.tipologias_union.map((t) => t.codigo));
      const newUniones = prev.uniones.filter((u) => allowedUnions.has(u.tipo_union));

      // Reset waste factor to the default of the new catalog
      const newWasteFactor = Math.round(newCatalogo.factor_desperdicio_placas_default * 100);

      return {
        ...prev,
        catalogo_sistema: sistema,
        muros: newMuros,
        uniones: newUniones,
        factor_desperdicio_pct: newWasteFactor,
      };
    });
    setState('idle');
    setResultado(null);
  }, []);

  // ---- Modificar Catálogo Personalizado (Custom) ----
  const updateCustomCatalogo = useCallback((nuevoCatalogo: Catalogo) => {
    setProyecto((prev) => {
      // Safe transition if profiles or placas were removed in the edited catalog
      const newMuros = prev.muros.map((m) => {
        const hasPerfil = nuevoCatalogo.perfiles.montante.some((p) => p.codigo === m.perfil);
        const hasRiel = nuevoCatalogo.perfiles.riel.some((r) => r.codigo === m.riel);
        const hasPlacaTipo = nuevoCatalogo.placas.some((p) => p.tipo === m.placa_tipo);

        return {
          ...m,
          perfil: hasPerfil ? m.perfil : nuevoCatalogo.perfiles.montante[0]?.codigo || '',
          riel: hasRiel ? m.riel : nuevoCatalogo.perfiles.riel[0]?.codigo || '',
          placa_tipo: hasPlacaTipo ? m.placa_tipo : nuevoCatalogo.placas[0]?.tipo || '',
          placa_espesor_mm: hasPlacaTipo ? m.placa_espesor_mm : nuevoCatalogo.placas[0]?.espesor_mm || 12.5,
          placa_formato: hasPlacaTipo ? m.placa_formato : `${nuevoCatalogo.placas[0]?.formatos_m[0][0]}x${nuevoCatalogo.placas[0]?.formatos_m[0][1]}` || '1.20x2.40',
        };
      });

      const allowedUnions = new Set(nuevoCatalogo.tipologias_union.map((t) => t.codigo));
      const newUniones = prev.uniones.filter((u) => allowedUnions.has(u.tipo_union));

      return {
        ...prev,
        catalogo_sistema: 'custom',
        catalogo_custom: nuevoCatalogo,
        muros: newMuros,
        uniones: newUniones,
      };
    });
    setState('idle');
    setResultado(null);
  }, []);

  const cargarCatalogoExterno = useCallback((datos: unknown) => {
    try {
      const parsed = cargarCatalogo(datos);
      updateCustomCatalogo(parsed);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }, [updateCustomCatalogo]);

  // ---- Factor de desperdicio ----
  const updateFactorDesperdicio = useCallback((pct: number) => {
    setProyecto((prev) => ({ ...prev, factor_desperdicio_pct: pct }));
  }, []);

  // ---- Calcular ----
  const calcular = useCallback(() => {
    // Validate all muros
    const allErrors = proyecto.muros.map((m) => validateForm(m));
    setErrors(allErrors);
    const hasErrors = allErrors.some((e) => Object.keys(e).length > 0);
    if (hasErrors) return;

    // Check that all muros have valid numeric dimensions
    for (const m of proyecto.muros) {
      const largo = parseFloat(m.largo_m);
      const alto = parseFloat(m.alto_m);
      if (isNaN(largo) || isNaN(alto) || largo <= 0 || alto <= 0) return;
    }

    setState('calculating');
    setErrorMsg('');

    try {
      const murosDomain: Muro[] = proyecto.muros.map((m, idx) => {
        const muro = formToMuro(m, idx);
        // Attach encuentros from unions
        const encuentros = proyecto.uniones
          .filter((u) => u.muro_a === muro.id || u.muro_b === muro.id)
          .map((u) => u.id);
        return { ...muro, encuentros };
      });

      const unionesDomain: Union[] = proyecto.uniones.map(formToUnion);

      // Build the Proyecto domain object
      const proyectoDomain = {
        proyecto: proyecto.nombre,
        catalogo: proyecto.catalogo_sistema,
        elementos: murosDomain,
        uniones: unionesDomain,
      };

      const res = calcularProyecto(proyectoDomain, catalogo);
      setResultado(res);
      setState('done');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setState('error');
    }
  }, [proyecto]);

  // Auto-calculo si hay estado en URL
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.search) {
      const decoded = deserializeProyecto(window.location.search);
      if (decoded) {
        // trigger calculation on next tick so state is settled
        setTimeout(() => calcular(), 0);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Compartir ----
  const compartir = useCallback(() => {
    const serialized = serializeProyecto(proyecto);
    const shareUrl = `${window.location.origin}${window.location.pathname}?proyecto=${serialized}`;
    navigator.clipboard.writeText(shareUrl).catch(() => {});
    return shareUrl;
  }, [proyecto]);

  // ---- Auto-guardado ----
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('drywall_active_proyecto', JSON.stringify(proyecto));
    }
  }, [proyecto]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('drywall_historial_proyectos', JSON.stringify(historial));
    }
  }, [historial]);

  // ---- Historial Actions ----
  const guardarEnHistorial = useCallback(() => {
    const newItem: HistorialItem = {
      id: `proj_${Date.now()}`,
      nombre: proyecto.nombre || 'Obra sin nombre',
      timestamp: new Date().toLocaleString(),
      datos: JSON.parse(JSON.stringify(proyecto)), // clone
    };
    setHistorial((prev) => [newItem, ...prev]);
  }, [proyecto]);

  const cargarDesdeHistorial = useCallback((id: string) => {
    const item = historial.find((h) => h.id === id);
    if (!item) return;
    setProyecto(JSON.parse(JSON.stringify(item.datos)));
    setSelectedMuroIdx(0);
    setState('idle');
    setResultado(null);
    // trigger recalculation on next tick
    setTimeout(() => {
      // triggers compute using the state we just set
      setProyecto((p) => {
        // we execute compute inside a timeout or directly by refactoring, but we can also just let the user click compute or call the calc function
        return p;
      });
    }, 0);
  }, [historial]);

  const eliminarDeHistorial = useCallback((id: string) => {
    setHistorial((prev) => prev.filter((h) => h.id !== id));
  }, []);

  const importarProyecto = useCallback((datos: ProyectoFormData) => {
    // Basic validation
    if (datos && typeof datos === 'object' && Array.isArray(datos.muros)) {
      setProyecto(datos);
      setSelectedMuroIdx(0);
      setState('idle');
      setResultado(null);
    }
  }, []);

  // ---- Reset ----
  const reset = useCallback(() => {
    setProyecto(DEFAULT_PROYECTO);
    setErrors([{}]);
    setResultado(null);
    setState('idle');
    setErrorMsg('');
    setSelectedMuroIdx(0);
    if (typeof window !== 'undefined' && window.location.search) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // ---- CRUD de Niveles del Proyecto ----
  const addNivel = useCallback((nivel: NivelProyecto) => {
    setProyecto((prev) => ({
      ...prev,
      nivelesProyecto: [...(prev.nivelesProyecto ?? []), nivel],
    }));
  }, []);

  const updateNivel = useCallback((idx: number, nivel: Partial<NivelProyecto>) => {
    setProyecto((prev) => {
      const niveles = [...(prev.nivelesProyecto ?? [])];
      if (!niveles[idx]) return prev;
      niveles[idx] = { ...niveles[idx], ...nivel };
      return { ...prev, nivelesProyecto: niveles };
    });
  }, []);

  const removeNivel = useCallback((idx: number) => {
    setProyecto((prev) => ({
      ...prev,
      nivelesProyecto: (prev.nivelesProyecto ?? []).filter((_, i) => i !== idx),
    }));
  }, []);

  /**
   * Resuelve el nombre del piso para un muro dado usando la cadena de prioridades:
   * 1. storey del IFC (IfcBuildingStorey) — más preciso
   * 2. Rango de elevación Z en nivelesProyecto configurados por el usuario
   * 3. Campo `piso` editado manualmente en el formulario del muro
   * 4. "Sin Piso Asignado"
   */
  const resolvePisoMuro = useCallback((muro: MuroFormData): string => {
    // Prioridad 1: storey IFC real
    if (muro.storey) return muro.storey;

    // Prioridad 2: buscar en niveles configurados por elevación Z del muro
    const niveles = proyecto.nivelesProyecto ?? [];
    if (niveles.length > 0) {
      // Usamos startY como proxy de la elevación Z del muro (viene de las coords IFC)
      const elevMuro = muro.startY ?? null;
      if (elevMuro !== null) {
        const nivelMatch = niveles.find((n) => {
          const desde = n.elevacionInicioM;
          const hasta = n.elevacionInicioM + n.alturaM;
          return elevMuro >= desde && elevMuro < hasta;
        });
        if (nivelMatch) return nivelMatch.nombre;
      }
      // Si no hay coordenada Z pero hay un único nivel con la misma altura, asignarlo
      const nivelPorAltura = niveles.find(
        (n) => Math.abs(n.alturaM - parseFloat(muro.alto_m)) < 0.05
      );
      if (nivelPorAltura) return nivelPorAltura.nombre;
    }

    // Prioridad 3: campo piso editado manualmente
    if (muro.piso && muro.piso.trim()) return muro.piso.trim();

    // Prioridad 4: sin asignación
    return 'Sin Piso Asignado';
  }, [proyecto.nivelesProyecto]);

  // ---- Helpers derivados ----
  const currentForm = proyecto.muros[selectedMuroIdx] ?? DEFAULT_FORM;
  const currentErrors = errors[selectedMuroIdx] ?? {};
  const currentResultadoMuro: ResultadoMuro | null =
    resultado?.muros[selectedMuroIdx] ?? null;

  // Aplicar factor de desperdicio al total de placas
  const factor = proyecto.factor_desperdicio_pct / 100;
  const totalPlacasNeto = resultado?.totales.placas.cantidad_total ?? 0;
  const totalPlacasConDesperdicio = Math.ceil(totalPlacasNeto * (1 + factor));

  return {
    proyecto,
    selectedMuroIdx,
    currentForm,
    currentErrors,
    currentResultadoMuro,
    errors,
    state,
    errorMsg,
    resultado,
    catalogo,
    totalPlacasConDesperdicio,
    factor,
    // Actions
    setSelectedMuroIdx,
    addMuro,
    duplicarMuro,
    removeMuro,
    updateMuroField,
    addAbertura,
    removeAbertura,
    importarDesdeIFC,
    addUnion,
    removeUnion,
    updateNombre,
    updateCatalogoSistema,
    updateCustomCatalogo,
    cargarCatalogoExterno,
    updateFactorDesperdicio,
    calcular,
    compartir,
    reset,
    // Project management extensions
    historial,
    guardarEnHistorial,
    cargarDesdeHistorial,
    eliminarDeHistorial,
    importarProyecto,
    // Niveles del proyecto
    addNivel,
    updateNivel,
    removeNivel,
    resolvePisoMuro,
  };
}

