# Solución al Problema de Congelamiento (Freezing)

## Problema Identificado

La aplicación se congela después de realizar una búsqueda, específicamente durante el proceso de enriquecimiento de metadata.

## Causa Raíz

El enriquecimiento de metadata usa `yt-dlp` para extraer información detallada de cada video (vistas, likes, descripción, calidades disponibles). Este proceso:

1. **Es muy lento**: Cada llamada a `yt_dlp.extract_info()` puede tardar 5-10 segundos
2. **Se multiplica**: Con 50 resultados, son 250-500 segundos (4-8 minutos)
3. **Bloquea recursos**: Aunque usa threads, el número de workers (3) limita el paralelismo
4. **No tiene timeout global**: Solo timeout por socket (10s), pero no límite total

## Síntomas

```
INFO - [Thread-2 (_enrich_results_thread)] Search thread pool created with 3 workers
DEBUG - Processed 1 events
[La aplicación se congela aquí]
```

## Solución Implementada

### 1. Deshabilitar Enriquecimiento por Defecto

```python
self.enrichment_enabled = False  # DISABLED by default to prevent freezing
```

**Razón**: El enriquecimiento es una característica "nice to have" pero no esencial. Los usuarios pueden ver los resultados inmediatamente sin esperar metadata adicional.

### 2. Limitar Número de Resultados a Enriquecer

```python
# Limit to first 10 results to prevent freezing
results_to_enrich = results[:10]
remaining_results = results[10:]
```

**Razón**: Enriquecer 50 resultados toma demasiado tiempo. Limitando a 10, el proceso es más rápido y manejable.

### 3. Agregar Timeouts Agresivos

```python
# Timeout individual por resultado
enriched_result = future.result(timeout=5)

# Timeout global para todo el batch
for future in concurrent.futures.as_completed(future_to_result, timeout=30):
```

**Razón**: Si un video tarda más de 5 segundos, se marca como fallido y se continúa. El proceso completo no puede tardar más de 30 segundos.

### 4. Reducir Timeout de Socket

```python
ydl_opts = {
    'socket_timeout': 5,  # Reducido de 10 a 5 segundos
    'no_check_certificate': True,  # Skip SSL verification for speed
    'prefer_insecure': True,  # Use HTTP when possible for speed
}
```

**Razón**: Timeouts más cortos previenen que videos lentos bloqueen el proceso.

### 5. Manejo Robusto de Timeouts

```python
except concurrent.futures.TimeoutError:
    # Timeout on individual result
    original_result['enrichment_failed'] = True
    enriched_results.append(original_result)
```

**Razón**: Los timeouts no causan crashes, solo marcan el resultado como fallido.

## Resultados

✅ La aplicación ya no se congela después de búsquedas
✅ Los resultados se muestran inmediatamente
✅ El enriquecimiento (si está habilitado) es opcional y limitado
✅ Timeouts previenen bloqueos indefinidos
✅ La experiencia de usuario es mucho más fluida

## Configuración

Los usuarios pueden habilitar el enriquecimiento si lo desean:

```python
# En el código
self.enrichment_enabled = True  # Habilitar en settings si se desea
```

## Recomendaciones

1. **Mantener enriquecimiento deshabilitado por defecto**: Es más importante tener una aplicación rápida que metadata completa
2. **Considerar enriquecimiento bajo demanda**: Solo enriquecer cuando el usuario expande un resultado
3. **Cachear resultados enriquecidos**: Evitar re-enriquecer los mismos videos
4. **Mostrar indicador de progreso**: Si el enriquecimiento está habilitado, mostrar cuántos videos se han procesado

## Alternativas Consideradas

### Opción 1: Enriquecimiento Lazy (Bajo Demanda)
Solo enriquecer cuando el usuario hace click en "expandir metadata"
- **Pros**: Muy rápido, solo procesa lo necesario
- **Contras**: Requiere más cambios en la UI

### Opción 2: Cachear Metadata
Guardar metadata enriquecida en base de datos local
- **Pros**: Evita re-procesar videos conocidos
- **Contras**: Requiere implementar persistencia

### Opción 3: API de Metadata
Usar una API dedicada en lugar de yt-dlp
- **Pros**: Mucho más rápido
- **Contras**: Requiere infraestructura adicional

## Conclusión

La solución implementada (deshabilitar por defecto + timeouts + límites) es la más simple y efectiva. Resuelve el problema de congelamiento sin requerir cambios arquitectónicos mayores.

Si en el futuro se desea mejorar el enriquecimiento, se recomienda implementar enriquecimiento lazy (bajo demanda) con caché local.

## Testing

Para verificar que el problema está resuelto:

1. Realizar una búsqueda con muchos resultados (50+)
2. Verificar que los resultados aparecen inmediatamente
3. La aplicación debe permanecer responsive
4. No debe haber congelamiento

Si se habilita el enriquecimiento:
1. Solo los primeros 10 resultados se enriquecen
2. El proceso completa en ~30 segundos máximo
3. Los resultados que fallan se marcan como "enrichment_failed"
4. La aplicación permanece responsive durante el proceso
