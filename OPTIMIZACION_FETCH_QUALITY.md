# Optimización del Fetch de Quality

## Problema

Cuando el usuario hace doble click en un resultado de búsqueda para agregarlo a la cola, el proceso de "fetching available qualities" (obtener calidades disponibles) tarda demasiado, haciendo que la aplicación parezca congelada.

## Causa

El método `extract_info()` de yt-dlp tarda mucho tiempo porque:
1. Hace múltiples requests HTTP al sitio del video
2. Descarga y parsea la página completa
3. Extrae todos los formatos disponibles
4. No tiene timeout configurado
5. Algunos sitios son muy lentos

Esto puede tardar 10-30 segundos por video, lo que es inaceptable para la experiencia de usuario.

## Solución Implementada

### 1. Timeout en extract_info (video_downloader.py)

```python
ydl_opts = {
    'quiet': True,
    'no_warnings': True,
    'extract_flat': 'in_playlist',
    'socket_timeout': 10,  # 10 second timeout
    'no_check_certificate': True,  # Skip SSL verification for speed
}
```

**Beneficios**:
- Timeout de 10 segundos por socket
- Skip SSL verification para mayor velocidad
- Extracción plana para playlists (más rápido)

### 2. Timeout Global en _fetch_formats_and_add (search_screen.py)

```python
# Create a future for the extraction with timeout
executor = concurrent.futures.ThreadPoolExecutor(max_workers=1)
future = executor.submit(downloader.extract_info, url)

try:
    # Wait max 15 seconds for extraction
    result = future.result(timeout=15)
    # ... mostrar dialog ...
except concurrent.futures.TimeoutError:
    # Timeout - show default quality options
    self._show_default_quality_dialog(url, title)
```

**Beneficios**:
- Timeout global de 15 segundos
- Si tarda más, muestra opciones por defecto
- Usuario puede continuar sin esperar

### 3. Calidades por Defecto

```python
def _show_default_quality_dialog(self, url, title):
    """Show quality dialog with default options when format fetch times out."""
    video_info = VideoInfo(
        url=url,
        title=title,
        available_qualities=["1080p", "720p", "480p", "360p", "Audio Only"]
    )
    # ... mostrar dialog ...
```

**Beneficios**:
- Usuario puede seleccionar calidad inmediatamente
- No necesita esperar a que se obtengan las calidades reales
- yt-dlp seleccionará la mejor calidad disponible al descargar

### 4. Verificación de Widget Destruido

```python
# Check if widget is still alive
if self.is_destroyed():
    return

# ... operación larga ...

# Check again if widget is still alive
if self.is_destroyed():
    return
```

**Beneficios**:
- Previene crashes si el usuario cambia de pestaña
- No intenta actualizar widgets destruidos

## Resultados

### Antes
- ⏱️ 10-30 segundos de espera
- ❌ Aplicación parece congelada
- 😤 Experiencia de usuario frustrante
- ❌ Sin feedback visual

### Después
- ⚡ Máximo 15 segundos de espera
- ✅ Timeout muestra opciones por defecto
- 😊 Usuario puede continuar inmediatamente
- ✅ Feedback visual con status label

## Flujo Optimizado

1. Usuario hace doble click en resultado
2. Muestra "Fetching available qualities..."
3. Inicia fetch con timeout de 15s
4. **Caso A - Éxito (< 15s)**:
   - Muestra calidades reales
   - Usuario selecciona
   - Agrega a cola
5. **Caso B - Timeout (> 15s)**:
   - Muestra calidades por defecto
   - Usuario selecciona
   - Agrega a cola
   - yt-dlp seleccionará mejor calidad al descargar

## Configuración

Los timeouts pueden ajustarse si es necesario:

```python
# En video_downloader.py
'socket_timeout': 10,  # Ajustar si es necesario

# En search_screen.py
result = future.result(timeout=15)  # Ajustar si es necesario
```

## Recomendaciones

1. **Mantener timeouts cortos**: 15 segundos es razonable
2. **Siempre ofrecer opciones por defecto**: Mejor que hacer esperar al usuario
3. **Mostrar feedback visual**: Status label indica qué está pasando
4. **Considerar caché**: Cachear calidades de videos ya consultados

## Alternativas Consideradas

### Opción 1: Caché de Calidades
Guardar calidades obtenidas en base de datos local
- **Pros**: Muy rápido para videos conocidos
- **Contras**: Requiere implementar persistencia

### Opción 2: Siempre Usar Calidades por Defecto
No obtener calidades reales, siempre usar defaults
- **Pros**: Instantáneo
- **Contras**: Usuario no ve calidades reales disponibles

### Opción 3: Obtener Calidades en Background
Obtener calidades después de agregar a cola
- **Pros**: No bloquea UI
- **Contras**: Usuario no puede elegir calidad antes de agregar

## Conclusión

La solución implementada (timeout + calidades por defecto) es el mejor balance entre:
- Velocidad (máximo 15 segundos)
- Precisión (intenta obtener calidades reales)
- Experiencia de usuario (siempre puede continuar)

El usuario obtiene las calidades reales cuando es posible, pero nunca tiene que esperar más de 15 segundos.

## Testing

Para verificar la optimización:

1. **Test Normal**: Hacer doble click en un video de YouTube
   - Debe mostrar calidades en < 5 segundos
   - ✅ Rápido y responsive

2. **Test Timeout**: Hacer doble click en un video de sitio lento
   - Debe mostrar calidades por defecto después de 15s
   - ✅ No se congela

3. **Test Cambio de Pestaña**: Hacer doble click y cambiar de pestaña inmediatamente
   - No debe crashear
   - ✅ Manejo seguro

4. **Test Múltiples Videos**: Agregar varios videos rápidamente
   - Debe manejar múltiples requests concurrentes
   - ✅ Sin bloqueos
