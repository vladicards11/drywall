import { useState, useCallback, useEffect } from 'react';
import { calcularProyecto } from '@drywall-calc/core-engine';
import { obtenerCatalogoGenericoEstandar } from '@drywall-calc/catalog-schemas';
import type { Muro, Union, ResultadoProyecto, ResultadoMuro, Abertura } from '@drywall-calc/catalog-schemas';
import type { MuroFormData, FormErrors } from './useCalculadora';
import { DEFAULT_FORM, validateForm } from './useCalculadora';

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
  muros: MuroFormData[];
  uniones: UnionFormData[];
  factor_desperdicio_pct: number; // 0–30, default from catalogo
}

export type ProyectoCalculationState = 'idle' | 'calculating' | 'done' | 'error';

const catalogo = obtenerCatalogoGenericoEstandar();

const DEFAULT_PROYECTO: ProyectoFormData = {
  nombre: 'Proyecto sin nombre',
  muros: [{ ...DEFAULT_FORM }],
  uniones: [],
  factor_desperdicio_pct: Math.round(catalogo.factor_desperdicio_placas_default * 100),
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
    if (decoded) return decoded;
    const local = window.localStorage.getItem('drywall_active_proyecto');
    if (local) {
      try {
        return JSON.parse(local) as ProyectoFormData;
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

// ---- Hook principal ----
export function useProyecto() {
  const [proyecto, setProyecto] = useState<ProyectoFormData>(getInitialProyecto);
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
        catalogo: 'generico_estandar',
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
    addUnion,
    removeUnion,
    updateNombre,
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
  };
}
