import React from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { MainPanel } from './components/layout/MainPanel';
import { useCalculadora } from './hooks/useCalculadora';

const App: React.FC = () => {
  const {
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
  } = useCalculadora();

  return (
    <div style={{ display: 'flex', minHeight: '100vh', width: '100vw' }}>
      <Sidebar
        form={form}
        errors={errors}
        catalogo={catalogo}
        isCalculating={state === 'calculating'}
        onFieldChange={updateField}
        onAddAbertura={addAbertura}
        onRemoveAbertura={removeAbertura}
        onCalcular={calcular}
        onReset={reset}
      />
      <MainPanel
        resultado={resultado}
        state={state}
        errorMsg={errorMsg}
      />
    </div>
  );
};

export default App;
