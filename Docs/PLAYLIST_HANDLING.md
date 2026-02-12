# Playlist Handling in Klyp Video Downloader

## Overview

Klyp detecta automáticamente cuando un enlace es una playlist y ofrece descargar todos los videos de una vez con la misma configuración de calidad.

## Cómo Identificar Playlists en Search

### Indicador Visual

Los resultados de búsqueda que probablemente sean playlists muestran un icono 📋 al inicio del título:

```
Resultados de búsqueda:
1. 📋 Synthwave Essentials Mix 2024 [1080p, 720p]
2. ▶ Best Synthwave Song Ever [1080p, 720p, 480p]
3. 📋 Retrowave Playlist - 100 Songs [720p]
4. ▶ Synthwave Tutorial [1080p]
```

### Detección Automática

La app detecta playlists basándose en patrones de URL:

**YouTube:**
- URLs con `list=` → Playlist
- URLs con `/playlist` → Playlist
- Ejemplo: `youtube.com/playlist?list=PLxxx`

**Vimeo:**
- URLs con `/showcase/` → Showcase (playlist)
- URLs con `/album/` → Album
- URLs con `/channels/` → Channel

**Dailymotion:**
- URLs con `/playlist/` → Playlist

**SoundCloud:**
- URLs con `/sets/` → Set/Playlist

**Genérico:**
- URLs que contienen "playlist", "album", o "collection"

### Confirmación Final

⚠️ **Importante:** El icono 📋 es solo una **indicación visual** basada en la URL. La confirmación real de que es una playlist ocurre cuando:

1. Haces doble clic en el resultado
2. La app extrae información con yt-dlp
3. Si realmente es playlist, muestra el diálogo de confirmación

Algunos videos individuales pueden tener "playlist" en la URL pero no ser playlists reales, y viceversa.

## Cómo Funciona

### 1. Detección de Playlist

Cuando pegas un enlace (desde Home o Search), la aplicación:

1. **Extrae información** usando `yt-dlp` con la opción `extract_flat: 'in_playlist'`
2. **Detecta el tipo**:
   - Si tiene campo `entries` → Es una playlist
   - Si no → Es un video individual

```python
# En video_downloader.py
is_playlist = 'entries' in info and info['entries']

if is_playlist:
    return {
        'type': 'playlist',
        'title': info.get('title', 'Playlist'),
        'entries': info['entries'],  # Lista de videos
        'count': len(info['entries']),  # Cantidad de videos
        'url': url
    }
```

### 2. Confirmación del Usuario

Cuando se detecta una playlist:

1. **Muestra un diálogo** con:
   - Título de la playlist
   - Cantidad de videos
   - Pregunta: "¿Agregar todos los videos a la cola?"

2. **Si el usuario acepta**:
   - Muestra el selector de calidad (una sola vez para toda la playlist)
   - El usuario elige la calidad que se aplicará a TODOS los videos

3. **Si el usuario cancela**:
   - No se agrega nada a la cola

### 3. Agregar Videos a la Cola

Una vez confirmado:

```python
# En home_screen.py o search_screen.py
def _add_playlist_to_queue(self, playlist_info, selected_quality):
    entries = playlist_info['entries']
    added_count = 0
    
    for entry in entries:
        # Crear VideoInfo para cada video
        video_info = VideoInfo(
            url=entry.get('url') or entry.get('webpage_url'),
            title=entry.get('title', 'Unknown'),
            selected_quality=selected_quality,
            filename=entry.get('title', 'video')
        )
        
        # Agregar a la cola
        try:
            self.app.queue_manager.add_task(
                video_info=video_info,
                download_path=download_path
            )
            added_count += 1
        except ValueError:
            # URL duplicada, se omite
            pass
```

### 4. Descarga

Los videos se descargan según el modo configurado:

- **Modo Secuencial**: Uno tras otro
- **Modo Multi-threaded**: Varios simultáneamente (máx. 3 por defecto)

Cada video se descarga con:
- La misma calidad seleccionada
- El mismo directorio de destino
- Las mismas opciones (subtítulos, audio, etc.)

## Escenarios de Uso

### Escenario 1: Playlist desde Home

```
Usuario → Pega URL de playlist en Home
       ↓
App detecta playlist (ej: 15 videos)
       ↓
Muestra: "Playlist detected: 'My Playlist'
         Contains 15 videos.
         Add all to queue?"
       ↓
Usuario → Acepta
       ↓
Muestra selector de calidad
       ↓
Usuario → Selecciona "720p"
       ↓
App agrega 15 tareas a la cola (todas con 720p)
       ↓
Usuario → Navega a Queue y presiona "Start All"
       ↓
Descargas comienzan según modo configurado
```

### Escenario 2: Playlist desde Search

```
Usuario → Busca "synthwave mix"
       ↓
Resultados incluyen playlists y videos
       ↓
Usuario → Hace doble clic en una playlist
       ↓
App detecta que es playlist
       ↓
Muestra confirmación y selector de calidad
       ↓
Agrega todos los videos a la cola
```

### Escenario 3: Video Individual

```
Usuario → Pega URL de video individual
       ↓
App detecta que NO es playlist
       ↓
Muestra selector de calidad directamente
       ↓
Agrega 1 tarea a la cola
```

## Plataformas Soportadas

Las playlists funcionan en cualquier plataforma que yt-dlp soporte:

✅ **YouTube**
- Playlists públicas
- Playlists privadas (con cookies)
- Canales completos
- Mix automáticos

✅ **Vimeo**
- Showcases
- Channels
- Albums

✅ **Dailymotion**
- Playlists de usuario

✅ **SoundCloud**
- Sets/Playlists

✅ **Otras plataformas**
- Cualquier sitio con soporte de playlist en yt-dlp

## Características Especiales

### 1. Detección Rápida

Usa `extract_flat: 'in_playlist'` para:
- Extraer solo metadatos básicos
- No descargar información completa de cada video
- Respuesta rápida al usuario

### 2. Calidad Unificada

- Una sola selección de calidad para toda la playlist
- Simplifica el proceso
- Evita 50 diálogos para 50 videos

### 3. Manejo de Duplicados

```python
try:
    self.app.queue_manager.add_task(video_info, download_path)
    added_count += 1
except ValueError:
    # URL ya está en la cola, se omite silenciosamente
    pass
```

### 4. Feedback Visual

```python
# Muestra cuántos videos se agregaron
self.summary_label.config(
    text=f"✓ {added_count} videos added to queue from playlist",
    foreground="#10b981"  # Verde
)
```

## Limitaciones Actuales

⚠️ **No hay selección individual de videos**
- Se agregan TODOS los videos de la playlist
- No hay opción de elegir solo algunos

⚠️ **No hay preview de videos**
- No se muestra lista de videos antes de agregar
- Solo se muestra el conteo total

⚠️ **Calidad única para todos**
- No se puede elegir calidad diferente por video
- Todos usan la misma configuración

⚠️ **No hay filtrado**
- No se puede filtrar por duración, fecha, etc.
- Se agregan todos sin excepción

## Mejoras Futuras Recomendadas

### 1. Selector de Videos Individual

```
┌─────────────────────────────────────┐
│ Playlist: My Awesome Mix (50 videos)│
├─────────────────────────────────────┤
│ ☑ Video 1 - Title Here    [5:23]   │
│ ☑ Video 2 - Another Title [3:45]   │
│ ☐ Video 3 - Skip This     [10:00]  │
│ ☑ Video 4 - Good One      [4:12]   │
│                                     │
│ [Select All] [Deselect All]        │
│ [Add Selected (48)] [Cancel]       │
└─────────────────────────────────────┘
```

### 2. Calidad por Video

- Permitir calidad diferente para videos específicos
- Útil para playlists mixtas (música + videos)

### 3. Filtros Avanzados

- Filtrar por duración (ej: solo videos < 10 min)
- Filtrar por fecha de publicación
- Filtrar por palabras clave en título

### 4. Preview de Playlist

- Mostrar lista completa antes de agregar
- Mostrar miniaturas
- Mostrar duración total estimada

### 5. Playlist Inteligente

- Detectar series/episodios automáticamente
- Sugerir orden de descarga
- Detectar duplicados por contenido (no solo URL)

## Código Relevante

### Archivos Principales

- `utils/video_downloader.py` - Detección y extracción
- `views/home_screen.py` - Manejo en pantalla Home
- `views/search_screen.py` - Manejo en pantalla Search
- `controllers/queue_manager.py` - Gestión de cola

### Métodos Clave

```python
# Detección
VideoDownloader.extract_info(url) → dict

# Confirmación
_show_playlist_confirm(playlist_info) → None

# Agregar a cola
_add_playlist_to_queue(playlist_info, quality) → None
```

## Ejemplo Completo

```python
# 1. Usuario pega: https://www.youtube.com/playlist?list=PLxxx
url = "https://www.youtube.com/playlist?list=PLxxx"

# 2. App extrae info
downloader = VideoDownloader()
result = downloader.extract_info(url)

# 3. Resultado
{
    'type': 'playlist',
    'title': 'Synthwave Essentials',
    'count': 25,
    'entries': [
        {'url': 'https://...', 'title': 'Song 1'},
        {'url': 'https://...', 'title': 'Song 2'},
        # ... 23 más
    ]
}

# 4. Usuario confirma y elige "720p"

# 5. App agrega 25 tareas a la cola
for entry in result['entries']:
    video_info = VideoInfo(
        url=entry['url'],
        title=entry['title'],
        selected_quality="720p"
    )
    queue_manager.add_task(video_info)

# 6. Usuario inicia descargas
# 7. Se descargan los 25 videos en 720p
```

## Preguntas Frecuentes

**P: ¿Puedo pausar una playlist a mitad de descarga?**
R: Sí, puedes pausar/detener descargas individuales o todas a la vez.

**P: ¿Qué pasa si un video de la playlist falla?**
R: Los demás continúan. El video fallido se marca como "Failed" en la cola.

**P: ¿Puedo agregar más videos mientras se descarga una playlist?**
R: Sí, puedes agregar más tareas en cualquier momento.

**P: ¿Se guarda el progreso si cierro la app?**
R: Sí, si tienes auto-resume habilitado, las descargas pendientes se restauran al iniciar.

**P: ¿Hay límite de videos en una playlist?**
R: No hay límite en la app, pero playlists muy grandes (>1000 videos) pueden tardar en procesarse.

**P: ¿Puedo cambiar la calidad después de agregar?**
R: No directamente. Debes eliminar las tareas y volver a agregar la playlist.
