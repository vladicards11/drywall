import React, { useState, lazy, Suspense } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { MainPanel } from './components/layout/MainPanel';
import { useProyecto } from './hooks/useProyecto';

// Import dinámico — web-ifc/WASM solo se carga cuando el usuario abre el importador
const IfcImporter = lazy(() => import('./components/ifc/IfcImporter').then(m => ({ default: m.IfcImporter })));

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
  } = useProyecto();

  const [showIfcImporter, setShowIfcImporter] = useState(false);

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
        onAbrirIfcImporter={() => setShowIfcImporter(true)}
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
        onSelectMuro={setSelectedMuroIdx}
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
        onUpdateCustomCatalogo={updateCustomCatalogo}
        cargarCatalogoExterno={cargarCatalogoExterno}
        onImportarMurosDirecto={importarDesdeIFC}
        onAddNivel={addNivel}
        onUpdateNivel={updateNivel}
        onRemoveNivel={removeNivel}
        resolvePisoMuro={resolvePisoMuro}
      />

      {/* ---- Modal: Importador IFC ---- */}
      {showIfcImporter && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '1.5rem',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowIfcImporter(false); }}
        >
          <div style={{
            background: 'var(--surface, #1e293b)',
            border: '1px solid var(--border, rgba(255,255,255,0.1))',
            borderRadius: '16px',
            padding: '1.5rem',
            width: '100%',
            maxWidth: '820px',
            maxHeight: '85vh',
            overflowY: 'auto',
            boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
          }}>
            <Suspense fallback={
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                ⏳ Cargando motor IFC…
              </div>
            }>
              <IfcImporter
                onImportarMuros={(muros, uniones) => {
                  importarDesdeIFC(muros, uniones);
                  setShowIfcImporter(false);
                }}
                onCerrar={() => setShowIfcImporter(false)}
              />
            </Suspense>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
