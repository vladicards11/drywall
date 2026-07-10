// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest';
import { act } from 'react';

// Configure act environment warning for React 19
// @ts-ignore
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// Setup mock for global location
if (typeof window !== 'undefined') {
  // Mock window.location
  const mockLocation = new URL('http://localhost:5173/');
  // @ts-ignore
  delete window.location;
  // @ts-ignore
  window.location = mockLocation;
}

// Alternatively, let's just write tests directly targeting the hook's helper functions,
// or use a clean React 19 test implementation.
// Wait! Let's check if we can run vitest on useProyecto by mocking React states, or if we can render a simple component.
// Let's write a simple React component and mount it using standard React DOM rendering!
import { createRoot } from 'react-dom/client';
import { useProyecto } from './useProyecto';

describe('useProyecto hook tests', () => {
  beforeEach(() => {
    window.localStorage.clear();
    // Reset URL
    window.history.replaceState({}, '', 'http://localhost:5173/');
  });

  it('debería inicializar con valores por defecto', () => {
    let hookState: any = null;

    const TestComponent = () => {
      hookState = useProyecto();
      return null;
    };

    const container = window.document.createElement('div');
    window.document.body.appendChild(container);
    
    act(() => {
      const root = createRoot(container);
      root.render(<TestComponent />);
    });

    expect(hookState).not.toBeNull();
    expect(hookState.proyecto.nombre).toBe('Proyecto sin nombre');
    expect(hookState.proyecto.muros.length).toBe(1);
    expect(hookState.proyecto.uniones.length).toBe(0);
    expect(hookState.selectedMuroIdx).toBe(0);
  });

  it('debería agregar y remover muros', () => {
    let hookState: any = null;

    const TestComponent = () => {
      hookState = useProyecto();
      return null;
    };

    const container = window.document.createElement('div');
    window.document.body.appendChild(container);
    
    act(() => {
      const root = createRoot(container);
      root.render(<TestComponent />);
    });

    // Agregar muro
    act(() => {
      hookState.addMuro();
    });

    expect(hookState.proyecto.muros.length).toBe(2);
    expect(hookState.selectedMuroIdx).toBe(1);

    // Remover muro
    act(() => {
      hookState.removeMuro(0);
    });

    expect(hookState.proyecto.muros.length).toBe(1);
    expect(hookState.selectedMuroIdx).toBe(0);
  });

  it('debería actualizar nombre de proyecto y guardar en localStorage', () => {
    let hookState: any = null;

    const TestComponent = () => {
      hookState = useProyecto();
      return null;
    };

    const container = window.document.createElement('div');
    window.document.body.appendChild(container);
    
    act(() => {
      const root = createRoot(container);
      root.render(<TestComponent />);
    });

    act(() => {
      hookState.updateNombre('Proyecto Delta');
    });

    expect(hookState.proyecto.nombre).toBe('Proyecto Delta');
    
    // El autoguardado en localStorage se ejecuta en useEffect
    // En happy-dom con act(), se procesan los effects
    const saved = window.localStorage.getItem('drywall_active_proyecto');
    expect(saved).not.toBeNull();
    expect(JSON.parse(saved!).nombre).toBe('Proyecto Delta');
  });

  it('debería guardar y cargar desde el historial', () => {
    let hookState: any = null;

    const TestComponent = () => {
      hookState = useProyecto();
      return null;
    };

    const container = window.document.createElement('div');
    window.document.body.appendChild(container);
    
    act(() => {
      const root = createRoot(container);
      root.render(<TestComponent />);
    });

    act(() => {
      hookState.updateNombre('Obra Principal');
    });

    act(() => {
      hookState.guardarEnHistorial();
    });

    expect(hookState.historial.length).toBe(1);
    expect(hookState.historial[0].nombre).toBe('Obra Principal');

    // Cambiar nombre
    act(() => {
      hookState.updateNombre('Obra Secundaria');
    });
    expect(hookState.proyecto.nombre).toBe('Obra Secundaria');

    // Cargar la primera obra desde el historial
    act(() => {
      hookState.cargarDesdeHistorial(hookState.historial[0].id);
    });

    expect(hookState.proyecto.nombre).toBe('Obra Principal');
  });
});
