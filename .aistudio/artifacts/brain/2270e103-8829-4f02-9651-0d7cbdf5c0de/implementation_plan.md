# Plan de Implementación: Reproductor Móvil Flotante (FAB) y Streaming de Audio Completo

Diseño y arquitectura para integrar un **Floating Action Bubble (FAB)** en la vista móvil de Klyp anclado en la esquina inferior derecha sobre el Float Navbar, con despliegue de **Modal Fullscreen ("Now Playing")**, junto con un motor de **streaming de audio completo** (sin límite de preview de 30s) tanto para canciones individuales como para álbumes completos en cola continua.

---

## Decisiones del Usuario Confirmadas
1. **Punto de anclaje móvil**: Esquina inferior derecha sobre el navbar flotante (`bottom-20 right-4 md:hidden`).
2. **Comportamiento al tocar la burbuja**: Apertura de modal a pantalla completa (Fullscreen Modal) con carátula en alta definición, scrubber interactivo, controles completos y cola del álbum.
3. **Requisito de Streaming**: Reproducción de la canción y del álbum **100% completos**, superando las restricciones de las vistas previas de 30 segundos.

---

## 1. Arquitectura de Streaming de Audio Completo (Full-Length & Full-Album)

### Causa Raíz de las Vistas Previas de 30s:
Actualmente, las URLs directas de stream de YouTube (`googlevideo.com`) generadas por `yt-dlp -g` quedan restringidas por la IP del servidor backend. Al intentar reproducirse directamente desde el navegador del cliente, Google responde con `403 Forbidden`, lo que forzaba al cliente a retroceder al `previewUrl` (el fragmento de 30 segundos de iTunes).

### Solución Técnica:
1. **Ruta Proxy de Streaming de Audio en Backend (`/api/music/audio-stream`)**:
   - Endpoint: `GET /api/music/audio-stream?artist=...&title=...`
   - Realiza la búsqueda de audio completo (`ytsearch1` con fallback a `scsearch1`) y transmite el flujo de audio directamente al cliente a través de Express con soporte de **HTTP Range Requests** (`206 Partial Content`, `Content-Type: audio/mpeg`).
   - Elimina bloqueos por IP (403), problemas de CORS y expiración de tokens en el navegador.
2. **Reproducción Continua de Álbum Completo**:
   - Al pulsar "Play Album" o cualquier canción de un disco, la lista de canciones se carga completa en el orden oficial (`discNumber` y `trackNumber`).
   - El evento `onEnded` del elemento `<audio>` invoca automáticamente a `onNextTrack()`, pasando fluidamente a la siguiente pista del álbum y resolviendo su audio completo.

---

## 2. Experiencia Móvil: Floating Action Bubble (FAB) + Fullscreen Modal

### A. Burbuja Flotante (FAB Móvil):
- **Posición**: `fixed bottom-[84px] right-4 z-40 md:hidden` (anclada justo encima del extremo derecho del Float Navbar, sin solaparse con ningún botón de navegación).
- **Diseño**:
  - Disco circular de 54x54 px con borde acento esmeralda (`#10b981`), sombra profunda (`shadow-2xl shadow-black/80`) y fondo `backdrop-blur-xl`.
  - Carátula circular de la canción que gira suavemente a 33 RPM cuando está sonando (`animate-spin-slow`) y se pausa cuando está en pausa.
  - Centro con indicador pulsante de reproducción / ecualizador visual.
  - Al hacer tap sobre la burbuja, se abre con animación fluida el reproductor a pantalla completa.

### B. Modal Fullscreen ("Now Playing" Sheet):
- **Diseño**:
  - Encabezado con botón de minimizar (`ChevronDown`), etiqueta "Now Playing" y botón para detener/cerrar (`X`).
  - Carátula de vinilo/álbum grande y nítida (hasta 1200x1200 px con resplandor ambiental de fondo).
  - Título de la pista (con scroll si es largo), nombre del artista, nombre del álbum y género.
  - Scrubber táctil de alta precisión para adelantar o retroceder, con marcas de tiempo en formato `mm:ss`.
  - Fila de controles principales: Shuffle, Pista Anterior, Play/Pausa central grande verde, Siguiente Pista, Modo Repetición (Off / All / One).
  - Barra de volumen y botón de descarga directa en MP3 320kbps con carátula incrustada.
  - Pestaña desplegable para visualizar toda la cola del álbum y cambiar de canción con un solo toque.

### C. Persistencia en Escritorio (`>= md`):
- En resoluciones de escritorio, el reproductor conserva su barra horizontal inferior fija en `bottom-0 left-0 right-0`, garantizando consistencia.

---

## 3. Plan de Modificaciones de Código

### Fase 1: Backend de Streaming Completo (`apps/server`)
1. **`apps/server/src/services/music.service.ts`**:
   - Añadir método `streamAudioPipe(artist: string, title: string, req: Request, res: Response)` para canalizar la salida de audio de `yt-dlp` a través del proxy del servidor con soporte de rangos.
   - Optimizar `resolveStream` para devolver la URL del proxy interno (`/api/music/audio-stream?artist=...&title=...`) como fuente principal de streaming completo (`isFullAudio: true`).
2. **`apps/server/src/controllers/music.controller.ts` & `apps/server/src/routes/music.routes.ts`**:
   - Montar la ruta `GET /music/audio-stream` conectada a `MusicController.pipeAudioStream`.

### Fase 2: Componente del Reproductor (`src/components/music/MusicPlayerBar.tsx`)
1. **Estado `isMobileModalOpen: boolean`**:
   - Controla si el modal a pantalla completa está visible en móvil.
2. **Renderizado Condicional Móvil / Escritorio**:
   - En `< md`: renderizar el **FAB flotante** en la esquina inferior derecha + el **Fullscreen Modal** cuando esté abierto.
   - En `>= md`: renderizar la barra completa estándar inferior.
3. **Flujo de Álbum Continuo**:
   - Verificar que al terminar la canción (`onEnded`) avance automáticamente a la siguiente canción del álbum de manera ininterrumpida.

### Fase 3: Integración en `src/App.tsx` y Verificación
1. Validar que el FAB y el Float Navbar coexistan sin interferir en toques ni bloquear botones.
2. Ejecutar `compile_applet` y `lint_applet` para garantizar cero errores de TypeScript y empaquetado.
3. Probar la reproducción en streaming completo de canciones y álbumes en el servidor dev.
