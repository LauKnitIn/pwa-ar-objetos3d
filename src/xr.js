/** Estado de soporte y las comprobaciones una por una para mostrarlas en pantalla. */
export async function diagnosticarAR() {
  const lineas = [];
  const seguro = window.isSecureContext;
  lineas.push(`Contexto seguro (HTTPS o localhost): ${seguro ? "sí" : "NO"}`);
  if (!seguro) return { estado: "contexto-inseguro", lineas };

  lineas.push(`navigator.xr: ${navigator.xr ? "presente" : "AUSENTE"}`);
  if (!navigator.xr) return { estado: "sin-webxr", lineas };

  try {
    // Responde si el DISPOSITIVO puede abrir ese modo; no pide permiso ni abre nada.
    const ok = await navigator.xr.isSessionSupported("immersive-ar");
    lineas.push(`isSessionSupported("immersive-ar"): ${ok}`);
    return { estado: ok ? "disponible" : "sin-ar", lineas };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.name : String(err);
    lineas.push(`isSessionSupported("immersive-ar") lanzó: ${errorMsg}`);
    return { estado: "sin-ar", lineas };
  }
}

export function mensajeSoporteAR(estado) {
  switch (estado) {
    case "disponible":
      return "Este dispositivo puede abrir una sesión de realidad aumentada.";
    case "contexto-inseguro":
      return "La realidad aumentada exige HTTPS o localhost.";
    case "sin-webxr":
      return "Este navegador no ofrece WebXR (por ejemplo, Safari en iPhone o Firefox). El visor 3D sigue funcionando.";
    case "sin-ar":
      return "Este dispositivo no admite realidad aumentada en el navegador (por ejemplo, un computador de escritorio sin el emulador activado).";
  }
}

/**
 * Pide la sesión AR. DEBE llamarse desde el manejador de un clic: sin gesto del
 * usuario, el navegador la rechaza con SecurityError.
 * @param {HTMLElement | null} overlay 
 * @returns {Promise<XRSession>}
 */
export function pedirSesionAR(overlay) {
  const opciones = {
    requiredFeatures: ["local"], // el origen (0,0,0) es donde está el usuario al empezar
    optionalFeatures: ["hit-test", "dom-overlay"], // si existe, el botón «Salir» se dibuja sobre la cámara
  };
  if (overlay) {
    opciones.domOverlay = { root: overlay };
  }
  return navigator.xr.requestSession("immersive-ar", opciones);
}