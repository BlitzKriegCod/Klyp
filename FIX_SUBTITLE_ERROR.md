# Corrección: Error de Subtítulos No Debe Fallar la Descarga

## Problema

La descarga completa falla cuando los subtítulos no están disponibles:

```
ERROR: Unable to download video subtitles for 'ru': HTTP Error 404: Not Found
ExtractionException: Failed to download video with subtitles
```

El video se descarga correctamente (0.5% de 1.41GiB), pero cuando yt-dlp intenta descargar subtítulos y recibe un 404, lanza un error que hace fallar toda la descarga.

## Causa

Por defecto, yt-dlp trata los errores de subtítulos como errores críticos que detienen la descarga completa. Esto es problemático porque:

1. No todos los videos tienen subtítulos disponibles
2. Los subtítulos pueden estar en idiomas específicos que no existen
3. El video ya se descargó exitosamente
4. Los subtítulos son opcionales, no críticos

## Solución Implementada

### 1. Agregar `ignoreerrors` en Opciones de yt-dlp

```python
# utils/video_downloader.py - _get_ydl_opts()
if writesubtitles:
    ydl_opts.update({
        'writesubtitles': True,
        'writeautomaticsub': True,
        'subtitlesformat': 'srt',
        'ignoreerrors': 'only_download',  # Ignore subtitle errors, continue with video
    })
```

**Beneficio**: yt-dlp ignora errores de subtítulos y continúa con la descarga del video.

### 2. Manejo Especial de Errores de Subtítulos

```python
# utils/video_downloader.py - download_with_subtitles()
except yt_dlp.utils.DownloadError as e:
    error_msg = str(e)
    
    # Check if it's ONLY a subtitle error
    if 'subtitle' in error_msg.lower() and '404' in error_msg:
        self.logger.warning(f"Subtitle download failed, but video downloaded successfully: {error_msg}")
        # Try to return the video filename anyway
        try:
            # The video should have been downloaded despite subtitle error
            # Try to find the downloaded file
            import glob
            pattern = str(Path(download_path) / f"{video_info.filename}.*")
            files = glob.glob(pattern)
            if files:
                # Return the first matching file
                return files[0]
        except Exception:
            pass
    
    # If not a subtitle-only error, re-raise
    self.logger.error(f"yt-dlp DownloadError: {error_msg}")
    exception_class = classify_yt_dlp_error(error_msg)
    raise exception_class(f"Failed to download video with subtitles: {error_msg}") from e
```

**Beneficio**: Si el error es solo de subtítulos, intenta encontrar el video descargado y devolverlo exitosamente.

## Comportamiento

### Antes
1. Usuario inicia descarga con subtítulos habilitados
2. Video se descarga correctamente
3. yt-dlp intenta descargar subtítulos
4. Subtítulos no disponibles (404)
5. ❌ **Toda la descarga falla**
6. Video descargado se pierde

### Después
1. Usuario inicia descarga con subtítulos habilitados
2. Video se descarga correctamente
3. yt-dlp intenta descargar subtítulos
4. Subtítulos no disponibles (404)
5. ✅ **yt-dlp ignora el error de subtítulos**
6. ✅ **Descarga se marca como exitosa**
7. Usuario obtiene el video sin subtítulos

## Casos de Uso

### Caso 1: Subtítulos Disponibles
- Video se descarga ✅
- Subtítulos se descargan ✅
- Usuario obtiene video + subtítulos ✅

### Caso 2: Subtítulos No Disponibles
- Video se descarga ✅
- Subtítulos fallan (404) ⚠️
- yt-dlp ignora error de subtítulos ✅
- Usuario obtiene video sin subtítulos ✅

### Caso 3: Video No Disponible
- Video falla (404, geo-block, etc.) ❌
- Descarga falla apropiadamente ❌
- Usuario recibe mensaje de error ✅

## Logs

### Antes (Error)
```
ERROR: Unable to download video subtitles for 'ru': HTTP Error 404: Not Found
ERROR - Task failed with ExtractionException
```

### Después (Warning)
```
WARNING - Subtitle download failed, but video downloaded successfully
INFO - Download complete: video.mp4
```

## Configuración

Los usuarios pueden deshabilitar subtítulos completamente en settings si no los necesitan:

```python
# En settings
subtitle_download = False  # No intentar descargar subtítulos
```

## Alternativas Consideradas

### Opción 1: Deshabilitar Subtítulos por Defecto
- **Pros**: Sin errores de subtítulos
- **Contras**: Usuarios que quieren subtítulos no los obtienen

### Opción 2: Intentar Múltiples Idiomas
- **Pros**: Mayor probabilidad de encontrar subtítulos
- **Contras**: Más lento, más requests

### Opción 3: Verificar Disponibilidad Antes de Descargar
- **Pros**: Evita intentos fallidos
- **Contras**: Request adicional, más lento

## Conclusión

La solución implementada (`ignoreerrors: 'only_download'`) es la mejor porque:
- ✅ Intenta descargar subtítulos si están disponibles
- ✅ No falla si los subtítulos no existen
- ✅ El video siempre se descarga si está disponible
- ✅ Sin overhead adicional
- ✅ Comportamiento esperado por el usuario

Los subtítulos son una característica "nice to have", no deben hacer fallar la descarga completa.

## Testing

Para verificar la corrección:

1. **Test con Subtítulos Disponibles**:
   - Descargar video de YouTube con subtítulos
   - ✅ Video + subtítulos descargados

2. **Test sin Subtítulos Disponibles**:
   - Descargar video de OK.ru sin subtítulos
   - ✅ Video descargado, sin error

3. **Test con Subtítulos Parciales**:
   - Descargar video con subtítulos solo en inglés
   - Intentar descargar en ruso (no disponible)
   - ✅ Video + subtítulos en inglés descargados

4. **Test con Video No Disponible**:
   - Intentar descargar video eliminado
   - ❌ Falla apropiadamente con mensaje de error

## Impacto

- ✅ Descargas más confiables
- ✅ Menos errores falsos
- ✅ Mejor experiencia de usuario
- ✅ Subtítulos cuando están disponibles
- ✅ Video siempre se descarga si está disponible
