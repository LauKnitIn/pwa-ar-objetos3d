const GRADOS_A_RAD = Math.PI / 180;

function limitar(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

export interface ControlOrientacion {
  calibrar(): void;
  detener(): void;
}

export async function hayOrientacionReal(): Promise<boolean> {
  return new Promise((resolve) => {
    if (!window.DeviceOrientationEvent) {
      resolve(false);
      return;
    }
    let recibido = false;
    const testHandler = (e: DeviceOrientationEvent) => {
      if (e.beta !== null || e.gamma !== null) recibido = true;
      window.removeEventListener('deviceorientation', testHandler);
      resolve(recibido);
    };
    window.addEventListener('deviceorientation', testHandler);
    setTimeout(() => {
      if (!recibido) {
        window.removeEventListener('deviceorientation', testHandler);
        resolve(false);
      }
    }, 500);
  });
}

export async function pedirPermisoOrientacion(): Promise<PermissionState | 'granted' | 'denied' | 'no-soportado'> {
  // @ts-ignore
  if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
    try {
      // @ts-ignore
      const respuesta = await DeviceOrientationEvent.requestPermission();
      return respuesta;
    } catch (e) {
      return 'denied';
    }
  }
  return 'granted';
}

export function iniciarControlOrientacion(
  onRotacion: (rotX: number, rotY: number) => void,
  intervaloMs = 33
): ControlOrientacion {
  let referencia: { beta: number; gamma: number } | null = null;
  let ultimaLectura: { beta: number; gamma: number } | null = null;
  let ultimoAviso = 0;

  const manejador = (e: DeviceOrientationEvent) => {
    if (e.beta === null || e.gamma === null) return;
    ultimaLectura = { beta: e.beta, gamma: e.gamma };
    if (!referencia) referencia = { ...ultimaLectura };

    const ahora = performance.now();
    if (ahora - ultimoAviso < intervaloMs) return;
    ultimoAviso = ahora;

    const dBeta = limitar(e.beta - referencia.beta, -90, 90);
    const dGamma = limitar(e.gamma - referencia.gamma, -90, 90);

    onRotacion(dBeta * GRADOS_A_RAD, dGamma * GRADOS_A_RAD);
  };

  window.addEventListener('deviceorientation', manejador);

  return {
    calibrar() {
      referencia = ultimaLectura ? { ...ultimaLectura } : null;
      onRotacion(0, 0);
    },
    detener() {
      window.removeEventListener('deviceorientation', manejador);
    }
  };
}