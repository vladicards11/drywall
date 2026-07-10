import { useState, useCallback, useEffect } from 'react';
import { calcularMuro } from '@drywall-calc/core-engine';
import { obtenerCatalogoGenericoEstandar } from '@drywall-calc/catalog-schemas';
import type { Muro, ResultadoMuro, Abertura } from '@drywall-calc/catalog-schemas';

// ---- Types for form state ----
export interface MuroFormData {
  largo_m: string;
  alto_m: string;
  estructura: 'simple' | 'doble';
  caras: 1 | 2;
  capas_por_cara: number;
  perfil: string;
  riel: string;
  separacion_montante_m: number;
  placa_tipo: string;
  placa_espesor_mm: number;
  placa_formato: string;   // "1.20x2.40"
  placa_orientacion: 'vertical' | 'horizontal';
  aberturas: Abertura[];
}

export interface FormErrors {
  largo_m?: string;
  alto_m?: string;
  aberturas?: string;
}

export type CalculationState = 'idle' | 'calculating' | 'done' | 'error';

const catalogo = obtenerCatalogoGenericoEstandar();

export const DEFAULT_FORM: MuroFormData = {
  largo_m: '4.00',
  alto_m: '2.40',
  estructura: 'simple',
  caras: 2,
  capas_por_cara: 1,
  perfil: 'M48',
  riel: 'R48',
  separacion_montante_m: 0.40,
  placa_tipo: 'ST',
  placa_espesor_mm: 12.5,
  placa_formato: '1.20x2.40',
  placa_orientacion: 'vertical',
  aberturas: [],
};

function parseFormato(fmt: string): [number, number] {
  const [w, h] = fmt.split('x').map(Number);
  return [w, h];
}

function validateForm(form: MuroFormData): FormErrors {
  const errors: FormErrors = {};

  const largo = parseFloat(form.largo_m);
  if (!form.largo_m || isNaN(largo) || largo <= 0) {
    errors.largo_m = 'El largo debe ser un número positivo mayor a 0';
  } else if (largo > 50) {
    errors.largo_m = 'Valor fuera de rango (máx. 50 m)';
  }

  const alto = parseFloat(form.alto_m);
  if (!form.alto_m || isNaN(alto) || alto <= 0) {
    errors.alto_m = 'El alto debe ser un número positivo mayor a 0';
  } else if (alto > 15) {
    errors.alto_m = 'Valor fuera de rango (máx. 15 m)';
  }

  if (!errors.largo_m && !errors.alto_m) {
    for (const ab of form.aberturas) {
      if (ab.ancho_m > largo) {
        errors.aberturas = `Abertura más ancha (${ab.ancho_m}m) que el muro (${largo}m)`;
        break;
      }
      if (ab.alto_m > alto) {
        errors.aberturas = `Abertura más alta (${ab.alto_m}m) que el muro (${alto}m)`;
        break;
      }
      if (ab.distancia_desde_inicio_m + ab.ancho_m > largo + 1e-9) {
        errors.aberturas = 'Una abertura sobresale del largo del muro';
        break;
      }
    }
  }

  return errors;
}

export function serializeState(form: MuroFormData): string {
  const params = new URLSearchParams();
  params.set('largo', form.largo_m);
  params.set('alto', form.alto_m);
  params.set('estructura', form.estructura);
  params.set('caras', String(form.caras));
  params.set('capas', String(form.capas_por_cara));
  params.set('perfil', form.perfil);
  params.set('riel', form.riel);
  params.set('separacion', String(form.separacion_montante_m));
  params.set('placa_tipo', form.placa_tipo);
  params.set('placa_espesor', String(form.placa_espesor_mm));
  params.set('placa_formato', form.placa_formato);
  params.set('placa_orientacion', form.placa_orientacion);
  if (form.aberturas.length > 0) {
    params.set('aberturas', JSON.stringify(form.aberturas));
  }
  return params.toString();
}

export function deserializeState(queryString: string): Partial<MuroFormData> | null {
  try {
    const params = new URLSearchParams(queryString);
    if (!params.has('largo') || !params.has('alto')) return null;

    const aberturasStr = params.get('aberturas');
    let aberturas: Abertura[] = [];
    if (aberturasStr) {
      aberturas = JSON.parse(aberturasStr);
    }

    return {
      largo_m: params.get('largo') || DEFAULT_FORM.largo_m,
      alto_m: params.get('alto') || DEFAULT_FORM.alto_m,
      estructura: (params.get('estructura') as any) || DEFAULT_FORM.estructura,
      caras: Number(params.get('caras') || DEFAULT_FORM.caras) as 1 | 2,
      capas_por_cara: Number(params.get('capas') || DEFAULT_FORM.capas_por_cara),
      perfil: params.get('perfil') || DEFAULT_FORM.perfil,
      riel: params.get('riel') || DEFAULT_FORM.riel,
      separacion_montante_m: Number(params.get('separacion') || DEFAULT_FORM.separacion_montante_m),
      placa_tipo: params.get('placa_tipo') || DEFAULT_FORM.placa_tipo,
      placa_espesor_mm: Number(params.get('placa_espesor') || DEFAULT_FORM.placa_espesor_mm),
      placa_formato: params.get('placa_formato') || DEFAULT_FORM.placa_formato,
      placa_orientacion: (params.get('placa_orientacion') as any) || DEFAULT_FORM.placa_orientacion,
      aberturas,
    };
  } catch (e) {
    console.error('Error deserializing URL state:', e);
    return null;
  }
}

const getInitialForm = (): MuroFormData => {
  if (typeof window !== 'undefined') {
    const decoded = deserializeState(window.location.search);
    if (decoded) {
      return { ...DEFAULT_FORM, ...decoded };
    }
  }
  return DEFAULT_FORM;
};

export function useCalculadora() {
  const [form, setForm] = useState<MuroFormData>(getInitialForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const [resultado, setResultado] = useState<ResultadoMuro | null>(null);
  const [state, setState] = useState<CalculationState>('idle');
  const [errorMsg, setErrorMsg] = useState<string>('');

  const updateField = useCallback(<K extends keyof MuroFormData>(
    key: K,
    value: MuroFormData[K]
  ) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      const newErrors = validateForm(next);
      setErrors(newErrors);
      return next;
    });
    if (state === 'done' || state === 'error') setState('idle');
  }, [state]);

  const addAbertura = useCallback((ab: Abertura) => {
    setForm((prev) => ({
      ...prev,
      aberturas: [...prev.aberturas, ab],
    }));
    if (state === 'done' || state === 'error') setState('idle');
  }, [state]);

  const removeAbertura = useCallback((idx: number) => {
    setForm((prev) => ({
      ...prev,
      aberturas: prev.aberturas.filter((_, i) => i !== idx),
    }));
    if (state === 'done' || state === 'error') setState('idle');
  }, [state]);

  const calcular = useCallback((currentForm?: MuroFormData) => {
    // Guard against React Event objects being passed as argument
    const formToValidate = (currentForm && typeof currentForm === 'object' && 'largo_m' in currentForm)
      ? currentForm
      : form;
    const currentErrors = validateForm(formToValidate);
    setErrors(currentErrors);
    if (Object.keys(currentErrors).length > 0) return;

    setState('calculating');
    setErrorMsg('');

    try {
      const muro: Muro = {
        id: 'muro_calculadora',
        geometria: {
          largo_m: parseFloat(formToValidate.largo_m),
          alto_m: parseFloat(formToValidate.alto_m),
        },
        sistema: {
          estructura: formToValidate.estructura,
          caras: formToValidate.caras,
          capas_por_cara: formToValidate.capas_por_cara,
          perfil: formToValidate.perfil,
          riel: formToValidate.riel,
          separacion_montante_m: formToValidate.separacion_montante_m,
        },
        placa: {
          tipo: formToValidate.placa_tipo,
          espesor_mm: formToValidate.placa_espesor_mm,
          formato_m: parseFormato(formToValidate.placa_formato),
          orientacion: formToValidate.placa_orientacion,
        },
        aberturas: formToValidate.aberturas,
        encuentros: [],
      };

      const res = calcularMuro(muro, [], catalogo);
      setResultado(res);
      setState('done');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setState('error');
    }
  }, [form]);

  // Auto-calculate on initial mount if there is URL state loaded
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.search) {
      const decoded = deserializeState(window.location.search);
      if (decoded) {
        calcular({ ...DEFAULT_FORM, ...decoded } as MuroFormData);
      }
    }
  }, [calcular]);

  const reset = useCallback(() => {
    setForm(DEFAULT_FORM);
    setErrors({});
    setResultado(null);
    setState('idle');
    setErrorMsg('');
    if (typeof window !== 'undefined' && window.location.search) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  return {
    form,
    errors,
    resultado,
    state,
    errorMsg,
    catalogo,
    updateField,
    addAbertura,
    removeAbertura,
    calcular,
    reset,
  };
}
