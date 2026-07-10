import { useState, useCallback } from 'react';
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
    // Validate that all aberturas fit in the muro
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

export function useCalculadora() {
  const [form, setForm] = useState<MuroFormData>(DEFAULT_FORM);
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
      // Live validate fields that are being edited
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
  }, []);

  const removeAbertura = useCallback((idx: number) => {
    setForm((prev) => ({
      ...prev,
      aberturas: prev.aberturas.filter((_, i) => i !== idx),
    }));
  }, []);

  const calcular = useCallback(() => {
    const currentErrors = validateForm(form);
    setErrors(currentErrors);
    if (Object.keys(currentErrors).length > 0) return;

    setState('calculating');
    setErrorMsg('');

    try {
      const muro: Muro = {
        id: 'muro_calculadora',
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

      const res = calcularMuro(muro, [], catalogo);
      setResultado(res);
      setState('done');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setState('error');
    }
  }, [form]);

  const reset = useCallback(() => {
    setForm(DEFAULT_FORM);
    setErrors({});
    setResultado(null);
    setState('idle');
    setErrorMsg('');
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
