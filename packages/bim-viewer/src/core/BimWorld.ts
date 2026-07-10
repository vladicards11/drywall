import * as THREE from 'three';
import * as OBC from '@thatopen/components';
import * as OBF from '@thatopen/components-front';

export class BimWorld {
  components: OBC.Components;
  world: OBC.SimpleWorld<OBC.SimpleScene, OBC.OrthoPerspectiveCamera, OBF.PostproductionRenderer>;

  constructor(container: HTMLDivElement) {
    this.components = new OBC.Components();
    const worlds = this.components.get(OBC.Worlds);

    // Creamos el mundo 3D usando tipos específicos de ThatOpen
    this.world = worlds.create<
      OBC.SimpleScene,
      OBC.OrthoPerspectiveCamera,
      OBF.PostproductionRenderer
    >();

    // Inicializamos la escena básica
    this.world.scene = new OBC.SimpleScene(this.components);
    this.world.scene.setup();
    this.world.scene.three.background = null; // Soporte para fondo transparente / glassmorphism

    // Inicializamos el renderizador premium con oclusión ambiental y contornos
    this.world.renderer = new OBF.PostproductionRenderer(this.components, container);

    // Inicializamos la cámara de doble modo (perspectiva y ortogonal)
    this.world.camera = new OBC.OrthoPerspectiveCamera(this.components);

    // Inicializamos el contenedor del motor OBC
    this.components.init();

    // Iluminación básica premium
    const mainLight = new THREE.DirectionalLight(0xffffff, 2.0);
    mainLight.position.set(30, 80, 40);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    mainLight.shadow.bias = -0.0001;
    this.world.scene.three.add(mainLight);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    this.world.scene.three.add(ambientLight);

    // Activamos efectos de post-producción por defecto
    const renderer = this.world.renderer as OBF.PostproductionRenderer | null;
    if (renderer) {
      const post = renderer.postproduction;
      post.enabled = true;
      
      // Configuración para suavizado de bordes e iluminación indirecta
      if (post.settings) {
        post.settings.ao = true;
        post.settings.gamma = true;
      }
    }

    // Inicializamos la grilla de referencia en el mundo 3D
    const grids = this.components.get(OBC.Grids);
    const grid = grids.create(this.world);
    grid.setup({
      color: new THREE.Color(0x334155), // Slate-700
      primarySize: 1,
      secondarySize: 10
    });
    grid.visible = true;
  }

  setGridVisible(visible: boolean) {
    const grids = this.components.get(OBC.Grids);
    const grid = grids.list.get(this.world.uuid);
    if (grid) {
      grid.visible = visible;
    }
  }

  resize() {
    this.world.renderer?.resize();
    this.world.camera.updateAspect();
  }

  dispose() {
    this.components.dispose();
  }
}
