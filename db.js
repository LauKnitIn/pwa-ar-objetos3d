const DB_NAME = 'atlas3d-progreso-db';
const DB_VERSION = 1;


export function abrirBaseDeDatos() {
  return new Promise((resolve, reject) => {
    const peticion = indexedDB.open(DB_NAME, DB_VERSION);

    peticion.onupgradeneeded = event => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('progreso')) {
        const store = db.createObjectStore('progreso', { keyPath: 'modeloId' });
        store.createIndex('porFavorito', 'favorito', { unique: false });
        store.createIndex('porUltimaVisita', 'ultimaVisita', { unique: false });
      }
    };

    peticion.onsuccess = event => resolve(event.target.result);
    peticion.onerror = event => reject(event.target.error);
  });
}

export function marcarModeloVisto(db, modeloId) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('progreso', 'readwrite');
    const store = tx.objectStore('progreso');
    const peticion = store.get(modeloId);

    peticion.onsuccess = () => {
      const registro = peticion.result || {
        modeloId,
        favorito: false,
        ultimaVisita: null,
        notaCifrada: null,
        notaIv: null
      };
      
      registro.ultimaVisita = Date.now();
      const escritura = store.put(registro);

      escritura.onsuccess = () => resolve(registro);
      escritura.onerror = () => reject(escritura.error);
    };

    peticion.onerror = () => reject(peticion.error);
  });
}


export function alternarFavorito(db, modeloId) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('progreso', 'readwrite');
    const store = tx.objectStore('progreso');
    const peticion = store.get(modeloId);

    peticion.onsuccess = () => {
      const registro = peticion.result || { 
        modeloId, 
        favorito: false, 
        ultimaVisita: null, 
        notaCifrada: null, 
        notaIv: null 
      };
      
      registro.favorito = !registro.favorito; 

      const escritura = store.put(registro);

      escritura.onsuccess = () => resolve(registro.favorito);
      escritura.onerror = () => reject(escritura.error);
    };

    peticion.onerror = () => reject(peticion.error);
  });
}


export function obtenerFavoritos(db) {
  return new Promise((resolve, reject) => {
    const resultado = [];
    const tx = db.transaction('progreso', 'readonly');
    const store = tx.objectStore('progreso');
    
    const cursorRequest = store.openCursor();

    cursorRequest.onsuccess = event => {
      const cursor = event.target.result;
      if (cursor) {
        if (cursor.value.favorito === true) {
          resultado.push(cursor.value);
        }
        cursor.continue();
      } else {
        resolve(resultado);
      }
    };

    cursorRequest.onerror = event => reject(event.target.error);
  });
}

export async function derivarClave(password, salt) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function cifrarTexto(clave, texto) {
  const enc = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cifrado = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    clave,
    enc.encode(texto)
  );
  return { cifrado, iv };
}

export async function guardarNotaDeEstudio(db, clave, modeloId, texto) {
  const { cifrado, iv } = await cifrarTexto(clave, texto);

  const tx = db.transaction('progreso', 'readwrite');
  const store = tx.objectStore('progreso');

  const registro = (await new Promise(r => {
    store.get(modeloId).onsuccess = e => r(e.target.result);
  })) || { modeloId, favorito: false, ultimaVisita: null };

  registro.notaCifrada = cifrado;
  registro.notaIv = iv;

  return new Promise((resolve, reject) => {
    const escritura = store.put(registro);
    escritura.onsuccess = () => resolve();
    escritura.onerror = () => reject(escritura.error);
  });
}