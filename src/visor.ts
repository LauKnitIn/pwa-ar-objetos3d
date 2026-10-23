import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export interface Visor {
  rotarHacia(rotX: number, rotY: number): void;
  controlPorSensores(activo: boolean): void;
  rotacionActualGrados(): { x: number; y: number };
  destruir(): void;
}

export function crearVisor(contenedor: HTMLElement): Visor {
  const escena = new THREE.Scene();
  escena.background = new THREE.Color(0x0b1220);

  const camara = new THREE.PerspectiveCamera(50, contenedor.clientWidth / contenedor.clientHeight, 0.1, 100);
  camara.position.set(0, 0, 4);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(contenedor.clientWidth, contenedor.clientHeight);
  contenedor.appendChild(renderer.domElement);

  // Luz ambiental y direccional
  const luzAmbiental = new THREE.AmbientLight(0xffffff, 0.7);
  escena.add(luzAmbiental);
  const luzDireccional = new THREE.DirectionalLight(0xffffff, 1);
  luzDireccional.position.set(5, 5, 5);
  escena.add(luzDireccional);

  // Cubo de prueba (demostración honesta antes del catálogo real)
  const geometria = new THREE.BoxGeometry(1.2, 1.2, 1.2);
  const material = new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.3, metalness: 0.8 });
  const cubo = new THREE.Mesh(geometria, material);
  
  const grupo = new THREE.Group();
  grupo.add(cubo);
  escena.add(grupo);

  const controles = new OrbitControls(camara, renderer.domElement);
  controles.enableDamping = true;

  let porSensores = false;
  let objetivoX = 0;
  let objetivoY = 0;
  let animacionId: number;

  function bucle() {
    animacionId = requestAnimationFrame(bucle);
    if (porSensores) {
      grupo.rotation.x += (objetivoX - grupo.rotation.x) * 0.15;
      grupo.rotation.y += (objetivoY - grupo.rotation.y) * 0.15;
    }
    controles.update();
    renderer.render(escena, camara);
  }
  bucle();

  window.addEventListener('resize', () => {
    if (!contenedor) return;
    camara.aspect = contenedor.clientWidth / contenedor.clientHeight;
    camara.updateProjectionMatrix();
    renderer.setSize(contenedor.clientWidth, contenedor.clientHeight);
  });

  return {
    rotarHacia(rotX: number, rotY: number) {
      objetivoX = rotX;
      objetivoY = rotY;
    },
    controlPorSensores(activo: boolean) {
      porSensores = activo;
      controles.enabled = !activo;
    },
    rotacionActualGrados() {
      return {
        x: Math.round(grupo.rotation.x * (180 / Math.PI)),
        y: Math.round(grupo.rotation.y * (180 / Math.PI))
      };
    },
    destruir() {
      cancelAnimationFrame(animacionId);
      renderer.dispose();
      contenedor.innerHTML = '';
    }
  };
}