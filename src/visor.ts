import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { pedirSesionAR, capacidadesDe } from './xr.js';
import { crearGestos } from './gestos.js';
export { iniciarVisor as crearVisor };

export type FaseAR = "buscando" | "listo" | "colocado";

export interface CapacidadesAR {
  overlay: boolean;
  hitTest: boolean;
  anclas: boolean;
}

export interface EstadoAR extends CapacidadesAR {
  fase: FaseAR;
  anclado: boolean;
  escala: number;
  giroGrados: number;
  posicion: { x: number; y: number; z: number };
  consultas: number;
  resultados: number;
  impactos: number;
  sinSuperficie: boolean;
}

export interface EstadoAR extends CapacidadesAR {
  fase: FaseAR;
  anclado: boolean;
  escala: number;
  giroGrados: number;
  posicion: { x: number; y: number; z: number };
  consultas: number;
  resultados: number;
  impactos: number;
  sinSuperficie: boolean;
}

export interface OpcionesAR {
  overlay: HTMLElement;
  alCambiar: (estado: EstadoAR) => void;
  alTerminar: () => void;
}

const ESCALA_INICIAL = 0.25;
const ESCALA_MIN = 0.1;
const ESCALA_MAX = 1;
const CADA_CUANTOS_FOTOGRAMAS = 2;
const MS_HASTA_PLAN_B = 6000;
const CONSULTAS_SIN_IMPACTO = 8;
const MITAD = 0.8;

function aGrados(rad: number): number {
  return (rad * 180) / Math.PI;
}

export function iniciarVisor(contenedorId: string, opcionesAR?: OpcionesAR) {
  const contenedor = document.getElementById(contenedorId);
  if (!contenedor) return;

  const escena = new THREE.Scene();
  escena.background = new THREE.Color(0x0b1220);

  const camara = new THREE.PerspectiveCamera(
    60,
    contenedor.clientWidth / contenedor.clientHeight,
    0.1,
    100
  );
  camara.position.set(0, 1.6, 3);

  const renderizador = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderizador.setSize(contenedor.clientWidth, contenedor.clientHeight);
  renderizador.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  
  while (contenedor.firstChild) {
    contenedor.removeChild(contenedor.firstChild);
  }
  contenedor.appendChild(renderizador.domElement);

  const controles = new OrbitControls(camara, renderizador.domElement);
  controles.enableDamping = true;
  controles.dampingFactor = 0.05;

  const luzAmbiente = new THREE.AmbientLight(0xffffff, 0.8);
  escena.add(luzAmbiente);
  const luzDir = new THREE.DirectionalLight(0xffffff, 1.2);
  luzDir.position.set(5, 10, 7);
  escena.add(luzDir);

  const raiz = new THREE.Group();
  const grupo = new THREE.Group();
  const cubo = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 1.6, 1.6),
    new THREE.MeshStandardMaterial({ color: 0xffcc29, roughness: 0.45 })
  );
  const aristas = new THREE.LineSegments(
    new THREE.EdgesGeometry(cubo.geometry),
    new THREE.LineBasicMaterial({ color: 0x0b1220 })
  );
  grupo.add(cubo, aristas);
  raiz.add(grupo);
  escena.add(raiz);

  raiz.matrixAutoUpdate = false;
  grupo.position.set(0, MITAD * ESCALA_INICIAL, 0);
  grupo.scale.setScalar(ESCALA_INICIAL);
  grupo.rotation.set(0, 0, 0);

  let animacionId: number | null = null;
  function bucle() {
    animacionId = requestAnimationFrame(bucle);
    controles.update();
    renderizador.render(escena, camara);
  }
  bucle();

  function ajustarTamano() {
    if (!contenedor) return;
    const w = contenedor.clientWidth;
    const h = contenedor.clientHeight;
    camara.aspect = w / h;
    camara.updateProjectionMatrix();
    renderizador.setSize(w, h);
  }

  window.addEventListener('resize', ajustarTamano);

  let sesionAR: XRSession | null = null;
  const btnAR = document.getElementById('btn-ar') as HTMLButtonElement | null;
  const estadoAR = document.getElementById('estado-ar');
  const xrOverlay = document.getElementById('xr-overlay');
  const btnSalirAR = document.getElementById('btn-salir-ar');

  if ('xr' in navigator) {
    navigator.xr!.isSessionSupported('immersive-ar').then((suportado) => {
      if (suportado && btnAR) {
        btnAR.disabled = false;
        if (estadoAR) estadoAR.textContent = 'Realidad aumentada disponible.';
      } else if (estadoAR) {
        estadoAR.textContent = 'Realidad aumentada no soportada en este dispositivo.';
      }
    });
  } else if (estadoAR) {
    estadoAR.textContent = 'WebXR no disponible en este navegador.';
  }

  if (btnAR && xrOverlay) {
    btnAR.addEventListener('click', async () => {
      try {
        const sesion = await pedirSesionAR(xrOverlay);
        await entrarEnAR(sesion);
      } catch (err: any) {
        console.error('Error al iniciar AR:', err);
        if (estadoAR) estadoAR.textContent = 'Error al iniciar AR: ' + err.message;
      }
    });
  }

  if (btnSalirAR) {
    btnSalirAR.addEventListener('beforexrselect', (e: Event) => e.preventDefault());
    btnSalirAR.addEventListener('click', () => {
      if (sesionAR) sesionAR.end();
    });
  }

  async function entrarEnAR(sesion: XRSession) {
    if (animacionId !== null) cancelAnimationFrame(animacionId);
    (renderizador.xr as any).enabled = true;
    (renderizador.xr as any).setReferenceSpaceType('local');
    await renderizador.xr.setSession(sesion);
    sesionAR = sesion;

    const caps = capacidadesDe(sesion);
    const fondoPrevio = escena.background;
    escena.background = null;
    controles.enabled = false;

    let fase: FaseAR = caps.hitTest ? 'buscando' : 'colocado';
    let ancla: XRAnchor | null = null;
    let escala = ESCALA_INICIAL;
    let consultas = 0;
    let resultados = 0;
    let impactosVistos = 0;
    let sinSuperficie = false;
    let ultimaPose = performance.now();
    let ultimoImpacto: XRRigidTransform | null = null;
    let sinImpacto = 0;
    let cuadro = 0;

    const estado = (): EstadoAR => {
      raiz.updateMatrixWorld(true);
      const p = grupo.getWorldPosition(new THREE.Vector3());
      return {
        ...caps,
        fase,
        anclado: ancla !== null,
        escala,
        giroGrados: ((aGrados(grupo.rotation.y) % 360) + 360) % 360,
        posicion: { x: p.x, y: p.y, z: p.z },
        consultas,
        resultados,
        impactos: impactosVistos,
        sinSuperficie,
      };
    };
    const avisar = () => {
      if (opcionesAR && opcionesAR.alCambiar) opcionesAR.alCambiar(estado());
    };

    if (!caps.hitTest) {
      raiz.visible = true;
      raiz.matrix.makeTranslation(0, -0.5, -1.5);
    } else {
      raiz.visible = true;
      raiz.matrix.makeTranslation(0, 0, -1.5);
    }

    let fuente: XRHitTestSource | null = null;
    if (caps.hitTest) {
      try {
        const espacioViewer = await sesion.requestReferenceSpace('viewer');
        try {
          fuente = (await (sesion as any).requestHitTestSource?.({ space: espacioViewer, entityTypes: ['plane', 'point'] })) ?? null;
        } catch {
          fuente = (await (sesion as any).requestHitTestSource?.({ space: espacioViewer })) ?? null;
        }
      } catch {
        fuente = null;
      }
      if (!fuente) {
        caps.hitTest = false;
        fase = 'colocado';
        raiz.visible = true;
        raiz.matrix.makeTranslation(0, -0.5, -1.5);
      }
    }

    const reticula = new THREE.Mesh(
      new THREE.RingGeometry(0.1, 0.13, 40).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0x4ade80 })
    );
    reticula.matrixAutoUpdate = false;
    reticula.visible = false;
    escena.add(reticula);

    const rayo = new THREE.Raycaster();
    const plano = new THREE.Plane();
    const desfase = new THREE.Vector2();
    const tmp = new THREE.Vector3();

    function mover(clientX: number, clientY: number, primero: boolean) {
      if (fase !== 'colocado') return;
      rayo.setFromCamera(new THREE.Vector2((clientX / window.innerWidth) * 2 - 1, -(clientY / window.innerHeight) * 2 + 1), camara);
      raiz.updateMatrixWorld(true);
      const normal = new THREE.Vector3(0, 1, 0).transformDirection(raiz.matrixWorld);
      plano.setFromNormalAndCoplanarPoint(normal, tmp.setFromMatrixPosition(raiz.matrixWorld));
      const punto = rayo.ray.intersectPlane(plano, new THREE.Vector3());
      if (!punto) return;
      const local = raiz.worldToLocal(punto);
      if (primero) desfase.set(grupo.position.x - local.x, grupo.position.z - local.z);
      grupo.position.x = local.x + desfase.x;
      grupo.position.z = local.z + desfase.y;
      avisar();
    }

    const gestos = crearGestos(xrOverlay!, {
      alMover: mover,
      alGirar(rad: number) {
        if (fase !== 'colocado') return;
        grupo.rotation.y += rad;
        avisar();
      },
      alEscalar(factor: number) {
        if (fase !== 'colocado') return;
        escala = Math.min(ESCALA_MAX, Math.max(ESCALA_MIN, escala * factor));
        grupo.scale.setScalar(escala);
        grupo.position.y = MITAD * escala;
        avisar();
      },
    });

    let turno = 0;
    async function colocar(frame: XRFrame) {
      const referencia = renderizador.xr.getReferenceSpace();
      if (!referencia) return;
      const mio = ++turno;
      let impacto: XRRigidTransform | null = null;
      const hayImpacto = fuente !== null && reticula.visible && ultimoImpacto !== null;
      if (fuente && !hayImpacto && !sinSuperficie) return;
      
      if (hayImpacto) {
        impacto = ultimoImpacto;
        raiz.matrix.copy(reticula.matrix);
      } else {
        const posicion = new THREE.Vector3().setFromMatrixPosition(camara.matrixWorld);
        const delante = camara.getWorldDirection(new THREE.Vector3()).setY(0).normalize();
        posicion.addScaledVector(delante, 1.5);
        posicion.y -= 0.5;
        raiz.matrix.makeTranslation(posicion.x, posicion.y, posicion.z);
      }
      grupo.position.set(0, MITAD * escala, 0);
      raiz.visible = true;
      fase = 'colocado';
      reticula.visible = false;

      (ancla as any)?.delete?.();
      ancla = null;
      avisar();

      if (impacto && caps.anclas) {
        try {
          const nueva = await (frame as any).createAnchor!(impacto, referencia);
          if (mio !== turno || !sesionAR) nueva.delete();
          else ancla = nueva;
        } catch {
          ancla = null;
        }
        avisar();
      }
    }

    sesion.addEventListener('select', (ev: any) => {
      if (gestos.huboGesto()) return;
      void colocar(ev.frame);
    });

    renderizador.setAnimationLoop((_t: number, frame?: XRFrame) => {
      const referencia = renderizador.xr.getReferenceSpace();
      if (frame && referencia) {
        if (fuente && cuadro++ % CADA_CUANTOS_FOTOGRAMAS === 0) {
          const impactos = frame.getHitTestResults(fuente);
          const pose = impactos.length ? impactos[0].getPose(referencia) : null;
          consultas++;
          if (impactos.length) resultados++;
          if (pose) impactosVistos++;
          if (consultas % 30 === 0) avisar();

          if (pose) {
            sinImpacto = 0;
            sinSuperficie = false;
            ultimaPose = performance.now();
            if (fase !== 'colocado') {
              reticula.visible = true;
              reticula.matrix.fromArray(pose.transform.matrix);
            }
            ultimoImpacto = pose.transform;
            if (fase === 'buscando') {
              fase = 'listo';
              avisar();
            }
          } else if (++sinImpacto >= CONSULTAS_SIN_IMPACTO) {
            reticula.visible = false;
            ultimoImpacto = null;
            if (fase === 'listo') {
              fase = 'buscando';
              avisar();
            }
          }
          if (!pose && fase === 'buscando' && !sinSuperficie && performance.now() - ultimaPose > MS_HASTA_PLAN_B) {
            sinSuperficie = true;
            avisar();
          }
        }
        if (ancla && (frame as any).trackedAnchors?.has(ancla)) {
          const poseAncla = (frame as any).getPose((ancla as any).anchorSpace, referencia);
          if (poseAncla) raiz.matrix.fromArray(poseAncla.transform.matrix);
        }
      }
      renderizador.render(escena, camara);
    });

    sesion.addEventListener(
      'end',
      () => {
        renderizador.setAnimationLoop(null);
        (renderizador.xr as any).enabled = false;
        sesionAR = null;
        gestos.destruir();
        (fuente as any)?.cancel?.();
        (ancla as any)?.delete?.();
        escena.remove(reticula);
        reticula.geometry.dispose();
        (reticula.material as THREE.Material).dispose();
        escena.background = fondoPrevio;
        controles.enabled = true;
        raiz.matrixAutoUpdate = true;
        raiz.matrix.identity();
        raiz.visible = true;
        grupo.position.set(0, MITAD * ESCALA_INICIAL, 0);
        grupo.scale.setScalar(ESCALA_INICIAL);
        grupo.rotation.set(0, 0, 0);
        ajustarTamano();
        bucle();
        if (opcionesAR && opcionesAR.alTerminar) opcionesAR.alTerminar();
      },
      { once: true }
    );

    avisar();
  }
}