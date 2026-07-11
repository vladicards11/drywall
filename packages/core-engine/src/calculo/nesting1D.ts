import { Corte1D, ResultadoNesting1D, Barra1D } from "@drywall-calc/catalog-schemas";

export function calcularNesting1D(
  cortes: Corte1D[],
  largoBarra: number,
  kerf: number = 0.0
): ResultadoNesting1D {
  if (cortes.length === 0) {
    return {
      barras: [],
      cantidad_barras: 0,
      longitud_total_cortes_m: 0,
      longitud_total_comercial_m: 0,
      desperdicio_lineal_m: 0,
      desperdicio_pct: 0,
    };
  }

  // 1. Filtrar cortes con longitud > largoBarra (robustez)
  const cortesValidos = cortes.map(c => {
    if (c.longitud_m > largoBarra) {
      return { ...c, longitud_m: largoBarra };
    }
    return c;
  });

  // 2. Ordenar cortes de mayor a menor longitud (First Fit Decreasing)
  const cortesOrdenados = [...cortesValidos].sort((a, b) => b.longitud_m - a.longitud_m);

  const barras: Barra1D[] = [];

  for (const corte of cortesOrdenados) {
    let colocado = false;

    // Buscar primera barra donde quepa
    for (const barra of barras) {
      const tieneCortes = barra.cortes.length > 0;
      const espacioRequerido = corte.longitud_m + (tieneCortes ? kerf : 0);

      if (barra.remanente_m >= espacioRequerido) {
        barra.cortes.push(corte);
        barra.longitud_usada_m += espacioRequerido;
        barra.remanente_m -= espacioRequerido;
        colocado = true;
        break;
      }
    }

    // Si no cabe en ninguna, abrir nueva barra
    if (!colocado) {
      const nuevaBarra: Barra1D = {
        id: barras.length + 1,
        cortes: [corte],
        longitud_usada_m: corte.longitud_m,
        remanente_m: largoBarra - corte.longitud_m,
      };
      barras.push(nuevaBarra);
    }
  }

  // Calcular estadísticas consolidadas
  const longitudTotalCortes = cortes.reduce((acc, c) => acc + c.longitud_m, 0);
  const longitudTotalComercial = barras.length * largoBarra;
  const desperdicioLineal = Math.max(0, longitudTotalComercial - longitudTotalCortes);
  const desperdicioPct = longitudTotalComercial > 0 ? (desperdicioLineal / longitudTotalComercial) * 100 : 0;

  return {
    barras,
    cantidad_barras: barras.length,
    longitud_total_cortes_m: parseFloat(longitudTotalCortes.toFixed(3)),
    longitud_total_comercial_m: parseFloat(longitudTotalComercial.toFixed(3)),
    desperdicio_lineal_m: parseFloat(desperdicioLineal.toFixed(3)),
    desperdicio_pct: parseFloat(desperdicioPct.toFixed(2)),
  };
}
