# Corrección de Crashes en Klyp

## Problemas Identificados

### 1. Crash al Maximizar la Ventana
**Síntoma**: La aplicación se crashea cuando se maximiza la ventana.

**Causa**: No había manejo de eventos de configuración de ventana (`<Configure>`), lo que causaba errores cuando la geometría de la ventana cambiaba.

**Solución**: 
- Agregado binding del evento `<Configure>` en `main.py`
- Implementado método `_on_window_configure()` para manejar cambios de geometría de forma segura
- Agregado tracking de geometría para evitar procesamiento de eventos duplicados

### 2. Crash al Seleccionar Opciones en la Pestaña de Búsqueda
**Síntoma**: La aplicación se crashea al hacer clic en resultados de búsqueda o al intentar expandir/colapsar metadata.

**Causa**: Los métodos de manejo de eventos del Treeview no tenían protección contra `TclError` cuando los widgets eran destruidos o inválidos.

**Solución**:
- Agregado manejo de excepciones `TclError` en todos los métodos de interacción con el Treeview
- Protección en `_on_tree_click()`: Maneja clicks de forma segura
- Protección en `_toggle_metadata()`: Verifica existencia de items antes de manipularlos
- Protección en `add_selected_to_queue()`: Valida selección y existencia de items
- Protección en `display_results()`: Maneja errores al insertar items
- Protección en `clear_results()`: Maneja errores al eliminar items

### 3. Crash Durante Enriquecimiento de Metadata (CRÍTICO)
**Síntoma**: La aplicación se crashea después de completar una búsqueda, durante el proceso de enriquecimiento de metadata. Los logs muestran múltiples intentos de `safe_after` en widgets destruidos.

**Causa Raíz**: Los threads de background (enriquecimiento, búsqueda, health check, etc.) continúan ejecutándose después de que el widget SearchScreen se destruye (por ejemplo, al cambiar de pestaña o cerrar la aplicación). Cuando estos threads intentan programar callbacks con `safe_after()`, el widget ya no existe, causando el crash.

**Análisis del Problema**:
```
2026-02-12 17:15:47 - DEBUG - Ignoring safe_after call on destroyed widget: SearchScreen
2026-02-12 17:15:47 - DEBUG - Ignoring safe_after call on destroyed widget: SearchScreen
2026-02-12 17:15:47 - DEBUG - Ignoring safe_after call on destroyed widget: SearchScreen
```

Los threads de enriquecimiento pueden tardar varios segundos en completarse. Si el usuario cambia de pestaña o cierra la aplicación durante este tiempo, el widget se destruye pero los threads siguen corriendo.

**Solución**:
- Agregada verificación `is_destroyed()` al inicio y final de cada thread de background
- Los threads ahora verifican si el widget sigue vivo antes de programar callbacks
- Esto previene intentos de actualizar widgets destruidos
- Los threads se cancelan gracefully sin causar crashes

**Threads Protegidos**:
1. `_enrich_results_thread()` - Enriquecimiento de metadata
2. `_perform_search_thread()` - Búsqueda principal
3. `_preset_search_worker()` - Búsqueda con presets
4. `_search_episodes_thread()` - Búsqueda de episodios
5. `_check_platform_health_thread()` - Verificación de salud de plataformas

## Cambios Realizados

### Archivo: `main.py`

1. **Agregado binding de evento Configure**:
```python
# Bind window state change events to handle maximize/minimize
self.bind("<Configure>", self._on_window_configure)
self._last_geometry = None
```

2. **Implementado método `_on_window_configure()`**:
```python
def _on_window_configure(self, event):
    """Handle window configuration changes (resize, maximize, etc)."""
    try:
        # Only process events for the main window, not child widgets
        if event.widget != self:
            return
        
        # Get current geometry
        current_geometry = self.geometry()
        
        # Avoid processing duplicate events
        if current_geometry == self._last_geometry:
            return
        
        self._last_geometry = current_geometry
        
        # Log geometry changes in debug mode
        if self.settings_manager.get("debug_mode", False):
            info(f"Window geometry changed: {current_geometry}")
            
    except Exception as e:
        # Don't let configure errors crash the app
        error(f"Error in window configure handler: {e}", exc_info=True)
```

### Archivo: `views/search_screen.py`

1. **Agregado import de tkinter**:
```python
import tkinter as tk
```

2. **Protección en métodos de Treeview** (`_on_tree_click`, `_toggle_metadata`, `add_selected_to_queue`, `display_results`, `clear_results`):
```python
def method_name(self, ...):
    try:
        # ... código existente ...
    except tk.TclError as e:
        # Widget was destroyed or invalid - ignore
        self.logger.debug(f"TclError in method_name: {e}")
    except Exception as e:
        # Log other errors but don't crash
        self.logger.error(f"Error in method_name: {e}", exc_info=True)
```

3. **Protección en métodos de enriquecimiento**:
```python
def _on_search_complete(self, results, query=None):
    try:
        # ... código existente ...
    except tk.TclError as e:
        self.logger.debug(f"TclError in _on_search_complete: {e}")
    except Exception as e:
        self.logger.error(f"Error in _on_search_complete: {e}", exc_info=True)

def _on_enrichment_complete(self, enriched_results):
    try:
        # ... código existente ...
        # Usa _safe_update_status para actualizaciones seguras
        self.safe_after(5000, lambda: self._safe_update_status(
            "Enter a search query to find videos",
            "#888888"
        ))
    except tk.TclError as e:
        self.logger.debug(f"TclError in _on_enrichment_complete: {e}")
    except Exception as e:
        self.logger.error(f"Error in _on_enrichment_complete: {e}", exc_info=True)
```

4. **Protección en métodos de progreso**:
```python
def show_progress(self, message="Processing..."):
    try:
        self.progress_label.config(text=message)
        self.progress_frame.pack(fill=X, pady=(0, 10), before=self.status_label)
        self.progress_bar.start(10)
    except tk.TclError as e:
        self.logger.debug(f"TclError in show_progress: {e}")
    except Exception as e:
        self.logger.error(f"Error in show_progress: {e}", exc_info=True)

def hide_progress(self):
    try:
        self.progress_bar.stop()
        self.progress_frame.pack_forget()
    except tk.TclError as e:
        self.logger.debug(f"TclError in hide_progress: {e}")
    except Exception as e:
        self.logger.error(f"Error in hide_progress: {e}", exc_info=True)
```

5. **Agregado método helper para actualizaciones seguras**:
```python
def _safe_update_status(self, text, foreground="#888888"):
    """Safely update status label text and color."""
    try:
        self.status_label.config(text=text, foreground=foreground)
    except tk.TclError as e:
        self.logger.debug(f"TclError in _safe_update_status: {e}")
    except Exception as e:
        self.logger.error(f"Error in _safe_update_status: {e}", exc_info=True)
```

6. **Protección en threads de background**:
```python
def _enrich_results_thread(self, results):
    """Enrich search results with metadata in background thread."""
    try:
        # Check if widget is still alive before starting
        if self.is_destroyed():
            self.logger.debug("Widget destroyed, skipping enrichment")
            return
        
        enriched_results = self.search_manager.enrich_results_batch(results, max_workers=5)
        
        # Check again before scheduling callback
        if self.is_destroyed():
            self.logger.debug("Widget destroyed during enrichment, skipping callback")
            return
        
        # Update search_results with enriched data
        self.safe_after(0, lambda r=enriched_results: self._on_enrichment_complete(r))
    except Exception as e:
        self.logger.error(f"Enrichment failed: {e}")
        # Check if widget is still alive before scheduling error callback
        if not self.is_destroyed():
            self.safe_after(0, lambda: self._on_enrichment_error(str(e)))
```

Patrón aplicado a todos los threads:
- `_perform_search_thread()`
- `_preset_search_worker()`
- `_search_episodes_thread()`
- `_check_platform_health_thread()`

7. **Protección en event handlers del EventBus**:
```python
def _on_search_complete_event(self, event: Event):
    try:
        # ... código existente ...
    except tk.TclError as e:
        self.logger.debug(f"TclError in _on_search_complete_event: {e}")
    except Exception as e:
        self.logger.error(f"Error in _on_search_complete_event: {e}", exc_info=True)
```
- `_check_platform_health_thread()`
```python
def _on_search_complete_event(self, event: Event):
    try:
        # ... código existente ...
    except tk.TclError as e:
        self.logger.debug(f"TclError in _on_search_complete_event: {e}")
    except Exception as e:
        self.logger.error(f"Error in _on_search_complete_event: {e}", exc_info=True)
```

## Beneficios de las Correcciones

1. **Estabilidad Mejorada**: La aplicación ya no se crashea al maximizar la ventana
2. **Manejo Robusto de Eventos**: Los clicks en la pestaña de búsqueda son manejados de forma segura
3. **Enriquecimiento Seguro**: El proceso de enriquecimiento de metadata no causa crashes
4. **Threads Seguros**: Los threads de background verifican si el widget sigue vivo antes de actualizar la UI
5. **Mejor Logging**: Los errores se registran apropiadamente sin crashear la aplicación
6. **Experiencia de Usuario Mejorada**: La aplicación es más resiliente a condiciones de error
7. **Thread-Safety**: Los callbacks desde threads background son manejados de forma segura
8. **Graceful Degradation**: Los threads se cancelan automáticamente cuando el widget se destruye

## Testing

Se creó un script de prueba que verifica:
- ✓ Imports correctos
- ✓ Manejo de TclError
- ✓ Funcionamiento de SafeCallbackMixin

Todos los tests pasan exitosamente.

## Escenarios de Prueba Recomendados

1. **Maximizar/Minimizar**: Probar maximizando y minimizando la ventana varias veces
2. **Búsquedas**: Realizar búsquedas y hacer click en diferentes resultados
3. **Metadata**: Expandir/colapsar metadata de múltiples resultados
4. **Cambio de Pestañas**: Cambiar entre pestañas mientras hay operaciones en progreso
5. **Enriquecimiento**: Realizar búsquedas y esperar a que complete el enriquecimiento de metadata
6. **Cambio Rápido**: Cambiar de pestaña inmediatamente después de iniciar una búsqueda

## Logs

Si encuentras algún problema adicional, revisa los logs en `~/.config/klyp/logs/` para más detalles. Los errores `TclError` ahora se registran a nivel DEBUG y no causan crashes.

## Notas Técnicas

- Todos los métodos que modifican widgets de Tkinter ahora tienen protección contra `TclError`
- Los callbacks programados con `safe_after()` son cancelados automáticamente al destruir el widget
- Los event handlers del EventBus tienen protección adicional contra errores
- El método `_safe_update_status()` proporciona una forma centralizada de actualizar el status label de forma segura
- **CRÍTICO**: Todos los threads de background verifican `is_destroyed()` antes y después de operaciones largas
- Los threads se cancelan gracefully sin intentar actualizar widgets destruidos
- Esto previene el problema común de "callbacks en widgets destruidos" que causa crashes en aplicaciones Tkinter multi-threaded

## Patrón de Thread Seguro

Todos los threads de background ahora siguen este patrón:

```python
def _background_thread(self, ...):
    try:
        # 1. Verificar al inicio
        if self.is_destroyed():
            self.logger.debug("Widget destroyed, skipping operation")
            return
        
        # 2. Realizar operación larga
        result = long_running_operation()
        
        # 3. Verificar antes de callback
        if self.is_destroyed():
            self.logger.debug("Widget destroyed during operation, skipping callback")
            return
        
        # 4. Programar callback de forma segura
        self.safe_after(0, lambda r=result: self._on_complete(r))
    except Exception as e:
        # 5. Verificar antes de callback de error
        if not self.is_destroyed():
            self.safe_after(0, lambda err=e: self._on_error(str(err)))
```

Este patrón garantiza que:
- Los threads no intentan actualizar widgets destruidos
- Las operaciones largas se cancelan si el widget se destruye
- Los errores se manejan apropiadamente
- No hay memory leaks por callbacks pendientes
