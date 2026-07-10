import React from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { MainPanel } from './components/layout/MainPanel';
import { useProyecto } from './hooks/useProyecto';

const App: React.FC = () => {
  const {
    proyecto,
    selectedMuroIdx,
    currentForm,
    currentErrors,
    currentResultadoMuro,
    state,
    errorMsg,
    resultado,
    catalogo,
    totalPlacasConDesperdicio,
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
    updateCatalogoSistema,
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
  } = useProyecto();

  return (
    <div style={{ display: 'flex', minHeight: '100vh', width: '100vw' }}>
      <Sidebar
        proyecto={proyecto}
        historial={historial}
        onUpdateNombre={updateNombre}
        onUpdateCatalogoSistema={updateCatalogoSistema}
        onGuardarEnHistorial={guardarEnHistorial}
        onCargarDesdeHistorial={cargarDesdeHistorial}
        onEliminarDeHistorial={eliminarDeHistorial}
        onImportarProyecto={importarProyecto}
        muros={proyecto.muros}
        selectedMuroIdx={selectedMuroIdx}
        uniones={proyecto.uniones}
        onSelectMuro={setSelectedMuroIdx}
        onAddMuro={addMuro}
        onDuplicateMuro={duplicarMuro}
        onRemoveMuro={removeMuro}
        onAddUnion={addUnion}
        onRemoveUnion={removeUnion}
        form={currentForm}
        errors={currentErrors}
        catalogo={catalogo}
        isCalculating={state === 'calculating'}
        onFieldChange={(key, val) => updateMuroField(selectedMuroIdx, key, val)}
        onAddAbertura={(ab) => addAbertura(selectedMuroIdx, ab)}
        onRemoveAbertura={(abIdx) => removeAbertura(selectedMuroIdx, abIdx)}
        onCalcular={calcular}
        onReset={reset}
      />
      <MainPanel
        proyecto={proyecto}
        selectedMuroIdx={selectedMuroIdx}
        resultado={resultado}
        currentResultadoMuro={currentResultadoMuro}
        totalPlacasConDesperdicio={totalPlacasConDesperdicio}
        onUpdateFactor={updateFactorDesperdicio}
        onCompartir={compartir}
        state={state}
        errorMsg={errorMsg}
        largo_m={parseFloat(currentForm.largo_m)}
        alto_m={parseFloat(currentForm.alto_m)}
        aberturas={currentForm.aberturas}
        carasConfig={currentForm.caras}
        capasConfig={currentForm.capas_por_cara}
        form={currentForm}
        catalogo={catalogo}
      />
    </div>
  );
};

export default App;
