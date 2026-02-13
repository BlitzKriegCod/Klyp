# Implementation Plan

## Phase 1: Infraestructura Base

- [x] 1. Implementar EventBus thread-safe
- [x] 1.1 Crear clase EventBus con queue.Queue interna
  - Implementar métodos publish(), subscribe(), unsubscribe()
  - Implementar process_events() para procesar en UI thread
  - Agregar manejo de excepciones en dispatch
  - _Requirements: 1.1, 1.2, 8.1, 8.2_

- [x] 1.2 Crear enums y dataclasses para eventos
  - Definir EventType enum con todos los tipos de eventos
  - Crear dataclass Event con type, data, timestamp
  - Documentar estructura de data para cada tipo de evento
  - _Requirements: 8.4_

- [x] 1.3 Implementar ThreadPoolManager singleton
  - Crear clase ThreadPoolManager con patrón singleton thread-safe
  - Implementar propiedades download_pool y search_pool
  - Implementar método shutdown() con timeout
  - Agregar logging de lifecycle de pools
  - _Requirements: 2.1, 2.2, 2.3, 2.5_

- [x] 1.4 Implementar SafeCallbackMixin
  - Crear mixin con métodos safe_after() y safe_after_idle()
  - Implementar tracking de callback IDs
  - Implementar cleanup_callbacks() para cancelación masiva
  - Override destroy() para cleanup automático
  - Agregar manejo de TclError para widgets destruidos
  - _Requirements: 1.5, 12.1, 12.2, 12.3, 12.4_

- [x] 1.5 Crear jerarquía de excepciones personalizadas
  - Definir KlypException como base
  - Crear DownloadException, NetworkException, AuthenticationException
  - Crear ThreadSafetyViolation para debug mode
  - Documentar cuándo usar cada tipo
  - _Requirements: 4.4_

- [x] 1.6 Implementar decorador @safe_callback
  - Crear decorador que capture excepciones en callbacks
  - Capturar TclError silenciosamente
  - Capturar otras excepciones y registrar en log
  - Agregar opción para mostrar mensaje al usuario
  - _Requirements: 4.3_

## Phase 2: Refactorizar QueueManager para Thread-Safety

- [x] 2. Hacer QueueManager thread-safe
- [x] 2.1 Agregar threading.RLock a QueueManager
  - Inicializar lock en __init__
  - Documentar que es reentrant lock
  - _Requirements: 5.1_

- [x] 2.2 Proteger método add_task con lock
  - Envolver lógica completa con with self._lock
  - Mantener validación de URL duplicada
  - Asegurar atomicidad de operación
  - _Requirements: 5.1_

- [x] 2.3 Proteger método remove_task con lock
  - Envolver lógica con with self._lock
  - Asegurar atomicidad de operación
  - _Requirements: 5.1_

- [x] 2.4 Proteger método get_task con lock
  - Envolver búsqueda con with self._lock
  - Retornar copia o referencia según necesidad
  - _Requirements: 5.1_

- [x] 2.5 Proteger método get_all_tasks con lock
  - Envolver con with self._lock
  - Retornar copia de lista para evitar modificación externa
  - _Requirements: 5.1_

- [x] 2.6 Proteger método update_task_status con lock
  - Envolver lógica completa con with self._lock
  - Asegurar atomicidad de actualización
  - _Requirements: 5.1, 5.4_

- [x] 2.7 Proteger métodos de persistencia con lock
  - Proteger save_pending_downloads()
  - Proteger load_pending_downloads()
  - Proteger restore_pending_downloads()
  - _Requirements: 5.1, 10.1_

## Phase 3: Implementar DownloadService

- [x] 3. Crear DownloadService como singleton
- [x] 3.1 Crear estructura base de DownloadService
  - Implementar patrón singleton thread-safe
  - Inicializar dependencias (QueueManager, HistoryManager, etc.)
  - Obtener ThreadPoolManager y EventBus
  - Inicializar diccionarios para active_futures y stop_flags
  - _Requirements: 2.1, 3.1, 9.1_

- [x] 3.2 Implementar método start_download()
  - Validar que task existe
  - Verificar que no está ya descargando (con lock)
  - Crear threading.Event para stop flag
  - Submittear _download_worker al thread pool
  - Registrar future en active_futures
  - Agregar done_callback para cleanup
  - _Requirements: 2.1, 3.1, 5.3_

- [x] 3.3 Implementar método _download_worker()
  - Actualizar status a DOWNLOADING
  - Publicar evento DOWNLOAD_PROGRESS inicial
  - Crear progress_callback con throttling (cada 5%)
  - Verificar stop_event en progress_callback
  - Ejecutar descarga con VideoDownloader
  - Actualizar status a COMPLETED al finalizar
  - Agregar a historial
  - Manejar excepciones y clasificarlas
  - _Requirements: 1.1, 4.1, 4.4, 7.2, 7.5_

- [x] 3.4 Implementar método _on_download_complete()
  - Cleanup de active_futures y stop_flags (con lock)
  - Obtener resultado del future
  - Publicar evento DOWNLOAD_COMPLETE o DOWNLOAD_FAILED
  - Capturar excepciones del future
  - _Requirements: 1.1, 4.1, 8.2_

- [x] 3.5 Implementar método stop_download()
  - Verificar que task está activo (con lock)
  - Setear stop_event
  - Retornar éxito/fallo
  - _Requirements: 5.3_

- [x] 3.6 Implementar método stop_all_downloads()
  - Iterar sobre todos los stop_flags (con lock)
  - Setear todos los eventos
  - Registrar en log
  - _Requirements: 5.3, 6.1_

- [x] 3.7 Implementar método start_all_downloads()
  - Obtener todas las tareas QUEUED
  - Iniciar cada una con start_download()
  - Manejar errores individuales sin afectar otras
  - _Requirements: 2.1_

- [x] 3.8 Implementar método get_active_count()
  - Retornar len(active_futures) con lock
  - Método thread-safe
  - _Requirements: 5.4_

## Phase 4: Refactorizar DownloadManager como Wrapper

- [x] 4. Adaptar DownloadManager existente
- [x] 4.1 Modificar __init__ de DownloadManager
  - Obtener instancia de DownloadService
  - Mantener referencias a managers para compatibilidad
  - Deprecar parámetros que ya no se usan
  - Agregar warning de deprecation en logs
  - _Requirements: 3.1, 9.1_

- [x] 4.2 Refactorizar start_downloads() como wrapper
  - Delegar a DownloadService.start_all_downloads()
  - Mantener firma de método para compatibilidad
  - _Requirements: 3.1_

- [x] 4.3 Refactorizar stop_all_downloads() como wrapper
  - Delegar a DownloadService.stop_all_downloads()
  - Mantener firma de método
  - _Requirements: 3.1_

- [x] 4.4 Refactorizar start_task() como wrapper
  - Delegar a DownloadService.start_download()
  - Mantener firma de método
  - _Requirements: 3.1_

- [x] 4.5 Refactorizar stop_task() como wrapper
  - Delegar a DownloadService.stop_download()
  - Mantener firma de método
  - _Requirements: 3.1_

- [x] 4.6 Eliminar código duplicado de DownloadManager
  - Remover _download_task() (ahora en service)
  - Remover _start_sequential_downloads()
  - Remover _start_multithreaded_downloads()
  - Mantener solo métodos wrapper
  - _Requirements: 3.1_

## Phase 5: Refactorizar QueueScreen con SafeCallbackMixin

- [x] 5. Aplicar SafeCallbackMixin a QueueScreen
- [x] 5.1 Modificar herencia de QueueScreen
  - Heredar de SafeCallbackMixin además de ttk.Frame
  - Llamar __init__ de ambos padres correctamente
  - _Requirements: 12.1_

- [x] 5.2 Reemplazar self.after() con self.safe_after()
  - Buscar todos los usos de self.after()
  - Reemplazar con self.safe_after()
  - Verificar que argumentos son correctos
  - _Requirements: 1.1, 12.1_

- [x] 5.3 Reemplazar self.after_idle() con self.safe_after_idle()
  - Buscar todos los usos de self.after_idle()
  - Reemplazar con self.safe_after_idle()
  - _Requirements: 1.1, 12.1_

- [x] 5.4 Suscribir QueueScreen a eventos del EventBus
  - Suscribir a DOWNLOAD_PROGRESS en __init__
  - Suscribir a DOWNLOAD_COMPLETE
  - Suscribir a DOWNLOAD_FAILED
  - Suscribir a QUEUE_UPDATED
  - Guardar subscription IDs para cleanup
  - _Requirements: 3.2, 8.2, 8.5_

- [x] 5.5 Implementar handlers de eventos
  - Crear _on_download_progress(event)
  - Crear _on_download_complete(event)
  - Crear _on_download_failed(event)
  - Crear _on_queue_updated(event)
  - Todos los handlers deben actualizar UI de forma thread-safe
  - _Requirements: 1.1, 3.2_

- [x] 5.6 Refactorizar refresh_queue() con debouncing
  - Implementar debouncing de 500ms
  - Cancelar refresh pendiente si hay uno
  - Usar safe_after() para scheduling
  - _Requirements: 7.1, 7.4_

- [x] 5.7 Implementar método cleanup()
  - Desuscribir todos los eventos del EventBus
  - Llamar cleanup_callbacks() del mixin
  - Limpiar referencias a managers
  - _Requirements: 6.3, 12.4_

- [x] 5.8 Eliminar auto_refresh() recursivo
  - Reemplazar con suscripción a eventos
  - Eliminar lógica de polling
  - _Requirements: 7.1, 8.2_

## Phase 6: Refactorizar Otras Screens

- [x] 6. Aplicar SafeCallbackMixin a HomeScreen
- [x] 6.1 Modificar herencia y __init__
  - Heredar SafeCallbackMixin
  - Inicializar correctamente
  - _Requirements: 12.1_

- [x] 6.2 Reemplazar after() y after_idle()
  - Usar safe_after() y safe_after_idle()
  - _Requirements: 1.1, 12.1_

- [x] 6.3 Suscribir a eventos relevantes
  - DOWNLOAD_COMPLETE para actualizar summary
  - QUEUE_UPDATED para actualizar contadores
  - _Requirements: 3.2, 8.2_

- [x] 6.4 Implementar cleanup()
  - Desuscribir eventos
  - Cleanup callbacks
  - _Requirements: 12.4_

- [x] 7. Aplicar SafeCallbackMixin a SearchScreen
- [x] 7.1 Modificar herencia y __init__
  - Heredar SafeCallbackMixin
  - _Requirements: 12.1_

- [x] 7.2 Reemplazar after() y after_idle()
  - Usar métodos safe
  - _Requirements: 1.1, 12.1_

- [x] 7.3 Suscribir a eventos de búsqueda
  - SEARCH_COMPLETE
  - SEARCH_FAILED
  - _Requirements: 8.2_

- [x] 7.4 Implementar cleanup()
  - Desuscribir eventos
  - Cleanup callbacks
  - _Requirements: 12.4_

- [x] 8. Aplicar SafeCallbackMixin a SettingsScreen
- [x] 8.1 Modificar herencia y __init__
  - Heredar SafeCallbackMixin
  - _Requirements: 12.1_

- [x] 8.2 Reemplazar after() y after_idle()
  - Usar métodos safe
  - _Requirements: 1.1, 12.1_

- [x] 8.3 Publicar evento SETTINGS_CHANGED cuando cambian settings
  - Publicar al guardar configuración
  - Incluir qué settings cambiaron en data
  - _Requirements: 8.1_

- [x] 8.4 Implementar cleanup()
  - Cleanup callbacks
  - _Requirements: 12.4_

- [x] 9. Aplicar SafeCallbackMixin a HistoryScreen
- [x] 9.1 Modificar herencia y __init__
  - Heredar SafeCallbackMixin
  - _Requirements: 12.1_

- [x] 9.2 Reemplazar after() y after_idle()
  - Usar métodos safe
  - _Requirements: 1.1, 12.1_

- [x] 9.3 Suscribir a DOWNLOAD_COMPLETE
  - Actualizar historial automáticamente
  - _Requirements: 8.2_

- [x] 9.4 Implementar cleanup()
  - Desuscribir eventos
  - Cleanup callbacks
  - _Requirements: 12.4_

## Phase 7: Refactorizar SearchManager

- [x] 10. Migrar SearchManager a ThreadPoolManager
- [x] 10.1 Remover ThreadPoolExecutor propio de SearchManager
  - Eliminar self.executor
  - Eliminar inicialización en __init__
  - _Requirements: 2.2_

- [x] 10.2 Usar ThreadPoolManager.search_pool
  - Obtener instancia de ThreadPoolManager
  - Usar search_pool para submit de búsquedas
  - _Requirements: 2.2, 9.2_

- [x] 10.3 Implementar método shutdown()
  - Método vacío o que delegue a ThreadPoolManager
  - Mantener para compatibilidad
  - _Requirements: 2.3_

- [x] 10.4 Publicar eventos en lugar de callbacks
  - Publicar SEARCH_COMPLETE con resultados
  - Publicar SEARCH_FAILED con error
  - Mantener callbacks para compatibilidad (deprecated)
  - _Requirements: 8.1, 8.2_

- [x] 10.5 Agregar manejo robusto de excepciones
  - Capturar excepciones en workers
  - Clasificar errores (red, API, parsing)
  - Registrar en log con contexto
  - _Requirements: 4.1, 4.5_

## Phase 8: Integrar EventBus en Main Application

- [x] 11. Modificar KlypVideoDownloader main class
- [x] 11.1 Inicializar EventBus en __init__
  - Crear instancia de EventBus
  - Guardar referencia en self._event_bus
  - _Requirements: 8.1_

- [x] 11.2 Iniciar EventBus después de crear UI
  - Llamar event_bus.start(self) después de setup_ui()
  - Verificar que mainloop no ha iniciado aún
  - _Requirements: 8.3_

- [x] 11.3 Pasar EventBus a screens
  - Modificar constructores de screens para recibir event_bus
  - Pasar self._event_bus al crear cada screen
  - _Requirements: 8.2_

- [x] 11.4 Detener EventBus en on_closing()
  - Llamar event_bus.stop() antes de destroy
  - Asegurar que se procesen eventos pendientes
  - _Requirements: 6.1, 8.1_

- [x] 11.5 Shutdown de ThreadPoolManager en on_closing()
  - Obtener ThreadPoolManager
  - Llamar shutdown(timeout=10)
  - Registrar en log
  - _Requirements: 2.3, 6.1, 6.2_

- [x] 11.6 Eliminar callback directo on_download_status_update
  - Remover método on_download_status_update()
  - Remover set_status_callback() de DownloadManager
  - Screens ahora usan eventos en lugar de callback
  - _Requirements: 3.2, 8.2_

- [x] 11.7 Implementar cleanup de screens al cambiar tabs
  - Bind a <<NotebookTabChanged>>
  - Llamar cleanup() en screen anterior si existe
  - Prevenir memory leaks de callbacks
  - _Requirements: 6.3, 12.5_

## Phase 9: Refactorizar VideoDownloader

- [x] 12. Optimizar VideoDownloader para evitar overhead
- [x] 12.1 Remover instanciación de SettingsManager en _get_ydl_opts
  - Recibir settings como parámetro en constructor
  - Cachear settings en instancia
  - _Requirements: 9.4_

- [x] 12.2 Modificar DownloadService para pasar settings
  - Obtener SettingsManager singleton una vez
  - Pasar settings a VideoDownloader en constructor
  - _Requirements: 9.3, 9.4_

- [x] 12.3 Agregar manejo de excepciones específicas de yt-dlp
  - Capturar DownloadError
  - Capturar ExtractorError
  - Clasificar y re-lanzar como excepciones propias
  - _Requirements: 4.4_

## Phase 10: Implementar SettingsManager Singleton

- [x] 13. Convertir SettingsManager a singleton
- [x] 13.1 Implementar patrón singleton thread-safe
  - Agregar __new__ con double-checked locking
  - Agregar flag _initialized
  - _Requirements: 9.3_

- [x] 13.2 Cachear settings en memoria
  - Cargar settings una vez en __init__
  - Mantener dict en memoria
  - Invalidar cache solo cuando se guardan cambios
  - _Requirements: 9.3_

- [x] 13.3 Hacer métodos get() thread-safe
  - Agregar RLock para proteger acceso a cache
  - Asegurar atomicidad de lectura
  - _Requirements: 5.1_

- [x] 13.4 Publicar evento SETTINGS_CHANGED al guardar
  - Publicar evento cuando se llama save()
  - Incluir qué settings cambiaron
  - _Requirements: 8.1_

## Phase 11: Testing y Validación

- [x] 14. Crear tests unitarios para componentes nuevos
- [x] 14.1 Tests para EventBus
  - Test publish y subscribe
  - Test unsubscribe
  - Test process_events
  - Test thread-safety con múltiples publishers
  - _Requirements: 11.2_

- [x] 14.2 Tests para ThreadPoolManager
  - Test singleton pattern
  - Test creación de pools
  - Test shutdown con timeout
  - Test thread-safety de inicialización
  - _Requirements: 11.2_

- [x] 14.3 Tests para DownloadService
  - Test start_download
  - Test stop_download
  - Test eventos publicados
  - Test manejo de excepciones
  - _Requirements: 11.2_

- [x] 14.4 Tests para QueueManager thread-safety
  - Test acceso concurrent a add_task
  - Test acceso concurrent a update_task_status
  - Test que no hay race conditions
  - _Requirements: 11.2_

- [x] 14.5 Tests para SafeCallbackMixin
  - Test safe_after con widget destruido
  - Test cleanup_callbacks
  - Test que TclError se captura
  - _Requirements: 11.2_

- [x] 15. Crear tests de integración
- [x] 15.1 Test flujo completo de descarga
  - Agregar tarea a queue
  - Iniciar descarga
  - Verificar eventos publicados
  - Verificar tarea en historial
  - _Requirements: 11.2_

- [x] 15.2 Test cancelación de descarga
  - Iniciar descarga
  - Cancelar a mitad
  - Verificar status STOPPED
  - Verificar cleanup de recursos
  - _Requirements: 11.2_

- [x] 15.3 Test múltiples descargas concurrentes
  - Iniciar 5 descargas simultáneas
  - Verificar que solo 3 corren a la vez
  - Verificar que todas completan
  - _Requirements: 11.2_

- [x] 15.4 Test cambio de pantalla durante descarga
  - Iniciar descarga
  - Cambiar de QueueScreen a HomeScreen
  - Verificar que no hay crasheo
  - Verificar que callbacks se cancelan
  - _Requirements: 11.2, 12.5_

- [x] 15.5 Test cierre de aplicación con descargas activas
  - Iniciar descargas
  - Cerrar aplicación
  - Verificar shutdown graceful
  - Verificar que pending downloads se guardan
  - _Requirements: 11.2, 6.1, 6.2_

- [x] 16. Testing de stress y estabilidad
- [x] 16.1 Test de stress con 100 tareas en queue
  - Agregar 100 tareas
  - Iniciar todas
  - Verificar que no hay memory leaks
  - Verificar que todas completan o fallan gracefully
  - _Requirements: 11.2_

- [x] 16.2 Test de cambios rápidos de pantalla
  - Cambiar entre screens cada 100ms durante 1 minuto
  - Verificar que no hay crasheos
  - Verificar que no hay memory leaks de callbacks
  - _Requirements: 11.2, 12.5_

- [x] 16.3 Test de búsquedas concurrentes
  - Ejecutar 10 búsquedas simultáneas
  - Verificar que solo 3 corren a la vez
  - Verificar que todas completan
  - _Requirements: 11.2_

- [x] 17. Validación de compatibilidad de datos
- [x] 17.1 Test de carga de pending_downloads.json existente
  - Usar archivo real de versión anterior
  - Verificar que se carga correctamente
  - Verificar que formato se mantiene al guardar
  - _Requirements: 10.1, 10.5, 11.2_

- [x] 17.2 Test de carga de historial SQLite existente
  - Usar base de datos real de versión anterior
  - Verificar que se lee correctamente
  - Verificar que nuevas entradas son compatibles
  - _Requirements: 10.2, 10.5, 11.2_

- [x] 17.3 Test de carga de settings.json existente
  - Usar archivo real de versión anterior
  - Verificar que se carga correctamente
  - Verificar que formato se mantiene
  - _Requirements: 10.3, 10.5, 11.2_

## Phase 12: Logging y Debug Mode

- [x] 18. Implementar logging mejorado
- [x] 18.1 Agregar logging de operaciones thread-sensitive
  - Log cuando se publica evento (con thread ID)
  - Log cuando se procesa evento (con thread ID)
  - Log cuando se crea/destruye thread pool
  - _Requirements: 11.3_

- [x] 18.2 Implementar debug mode para thread-safety
  - Agregar flag DEBUG_THREAD_SAFETY en settings
  - Validar que UI updates ocurren en main thread
  - Lanzar ThreadSafetyViolation si no
  - _Requirements: 11.4_

- [x] 18.3 Agregar structured logging para excepciones
  - Log con contexto completo (task_id, url, timestamp)
  - Log con stack trace completo
  - Categorizar por tipo de excepción
  - _Requirements: 4.5_

## Phase 13: Documentación y Cleanup

- [x] 19. Documentar cambios arquitecturales
- [x] 19.1 Actualizar docstrings de componentes modificados
  - Documentar thread-safety guarantees
  - Documentar cuándo usar cada componente
  - Agregar ejemplos de uso
  - _Requirements: 11.1_

- [x] 19.2 Crear guía de migración para desarrolladores
  - Documentar cambios en API
  - Documentar patrones deprecados
  - Documentar nuevos patrones recomendados
  - _Requirements: 11.1_

- [x] 19.3 Agregar comentarios en código crítico
  - Comentar secciones thread-sensitive
  - Comentar por qué se usa cada lock
  - Comentar invariantes importantes
  - _Requirements: 11.1_

- [x] 20. Cleanup de código deprecado
- [x] 20.1 Marcar métodos deprecados con warnings
  - Agregar @deprecated decorator
  - Agregar warnings.warn() en métodos viejos
  - Documentar alternativas
  - _Requirements: 11.1_

- [x] 20.2 Remover código muerto
  - Identificar métodos no usados
  - Remover con cuidado
  - Verificar que tests pasan
  - _Requirements: 11.1_

- [x] 20.3 Refactorizar imports
  - Organizar imports por categoría
  - Remover imports no usados
  - Agregar type hints donde falten
  - _Requirements: 11.1_
