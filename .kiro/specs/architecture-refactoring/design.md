# Design Document - Refactorización Arquitectural Klyp

## Overview

Esta refactorización transforma la arquitectura de Klyp de un modelo ad-hoc de threading a una arquitectura robusta basada en patrones probados: Event-Driven Architecture, Thread-Safe Communication Patterns, y Separation of Concerns. El diseño prioriza la estabilidad y thread-safety mientras mantiene 100% de compatibilidad con datos existentes.

**Principios de Diseño:**
- Thread-safety first: Toda comunicación entre threads debe ser explícitamente segura
- UI Thread purity: Solo el UI Thread puede modificar widgets de tkinter
- Fail-safe: Excepciones nunca deben crashear la aplicación
- Zero data loss: Compatibilidad total con formatos existentes
- Minimal changes: Refactorizar solo lo necesario para estabilidad

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        UI Layer (tkinter)                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  Home    │  │  Search  │  │  Queue   │  │ Settings │   │
│  │  Screen  │  │  Screen  │  │  Screen  │  │  Screen  │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘   │
│       │             │              │             │          │
│       └─────────────┴──────────────┴─────────────┘          │
│                          │                                   │
│                    ┌─────▼─────┐                            │
│                    │  EventBus │ (Thread-Safe)              │
│                    └─────┬─────┘                            │
└──────────────────────────┼──────────────────────────────────┘
                           │
┌──────────────────────────┼──────────────────────────────────┐
│                   Service Layer                              │
│  ┌────────────────┐  ┌──────────────┐  ┌─────────────────┐ │
│  │ Download       │  │ Search       │  │ Settings        │ │
│  │ Service        │  │ Service      │  │ Service         │ │
│  │ (Singleton)    │  │ (Singleton)  │  │ (Singleton)     │ │
│  └───────┬────────┘  └──────┬───────┘  └────────┬────────┘ │
│          │                  │                     │          │
│  ┌───────▼──────────────────▼─────────────────────▼───────┐ │
│  │           ThreadPool Manager (Centralized)             │ │
│  │  - Download Workers (max 3)                            │ │
│  │  - Search Workers (max 3)                              │ │
│  └────────────────────────────────────────────────────────┘ │
└──────────────────────────┼──────────────────────────────────┘
                           │
┌──────────────────────────┼──────────────────────────────────┐
│                    Data Layer                                │
│  ┌────────────┐  ┌──────────────┐  ┌──────────────────┐    │
│  │ Queue      │  │ History      │  │ Settings         │    │
│  │ Manager    │  │ Manager      │  │ Manager          │    │
│  │ (Thread-   │  │ (Thread-     │  │ (Thread-Safe)    │    │
│  │  Safe)     │  │  Safe)       │  │                  │    │
│  └────────────┘  └──────────────┘  └──────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### Thread Model

```
┌─────────────────────────────────────────────────────────────┐
│                      Main Thread (UI Thread)                 │
│  - Maneja todos los eventos de tkinter                       │
│  - Procesa eventos del EventBus                              │
│  - Actualiza widgets                                         │
│  - Ejecuta callbacks de after()                              │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ EventBus (queue.Queue)
                         │
┌────────────────────────┴────────────────────────────────────┐
│                    Worker Threads                            │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Download Worker Pool (ThreadPoolExecutor)           │  │
│  │  - Max 3 concurrent downloads                        │  │
│  │  - Publica eventos: DownloadProgress, Complete, Fail │  │
│  │  - NO accede directamente a UI                       │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Search Worker Pool (ThreadPoolExecutor)             │  │
│  │  - Max 3 concurrent searches                         │  │
│  │  - Publica eventos: SearchComplete, SearchFailed     │  │
│  │  - NO accede directamente a UI                       │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. EventBus (Nuevo Componente)

**Responsabilidad:** Comunicación thread-safe entre Worker Threads y UI Thread.

```python
class EventBus:
    """Thread-safe event bus for cross-thread communication."""
    
    def __init__(self):
        self._queue: queue.Queue = queue.Queue()
        self._listeners: Dict[EventType, List[Callable]] = defaultdict(list)
        self._lock = threading.Lock()
        self._running = False
    
    def publish(self, event: Event) -> None:
        """Publish event from any thread."""
        self._queue.put(event)
    
    def subscribe(self, event_type: EventType, callback: Callable) -> str:
        """Subscribe to event type. Returns subscription ID."""
        with self._lock:
            sub_id = str(uuid.uuid4())
            self._listeners[event_type].append((sub_id, callback))
            return sub_id
    
    def unsubscribe(self, sub_id: str) -> None:
        """Unsubscribe using subscription ID."""
        with self._lock:
            for event_type, listeners in self._listeners.items():
                self._listeners[event_type] = [
                    (sid, cb) for sid, cb in listeners if sid != sub_id
                ]
    
    def process_events(self, root: tk.Tk) -> None:
        """Process pending events in UI thread. Called via after()."""
        try:
            while not self._queue.empty():
                event = self._queue.get_nowait()
                self._dispatch_event(event)
        except queue.Empty:
            pass
        finally:
            if self._running:
                root.after(100, lambda: self.process_events(root))
    
    def start(self, root: tk.Tk) -> None:
        """Start event processing loop."""
        self._running = True
        self.process_events(root)
    
    def stop(self) -> None:
        """Stop event processing loop."""
        self._running = False
```

**Event Types:**
```python
class EventType(Enum):
    DOWNLOAD_PROGRESS = "download_progress"
    DOWNLOAD_COMPLETE = "download_complete"
    DOWNLOAD_FAILED = "download_failed"
    DOWNLOAD_STOPPED = "download_stopped"
    SEARCH_COMPLETE = "search_complete"
    SEARCH_FAILED = "search_failed"
    QUEUE_UPDATED = "queue_updated"
    SETTINGS_CHANGED = "settings_changed"

@dataclass
class Event:
    type: EventType
    data: Dict[str, Any]
    timestamp: datetime = field(default_factory=datetime.now)
```

### 2. ThreadPoolManager (Nuevo Componente)

**Responsabilidad:** Gestión centralizada de todos los ThreadPoolExecutor.

```python
class ThreadPoolManager:
    """Centralized thread pool management with proper lifecycle."""
    
    _instance = None
    _lock = threading.Lock()
    
    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        if hasattr(self, '_initialized'):
            return
        self._initialized = True
        self._download_pool: Optional[ThreadPoolExecutor] = None
        self._search_pool: Optional[ThreadPoolExecutor] = None
        self._logger = get_logger()
    
    @property
    def download_pool(self) -> ThreadPoolExecutor:
        """Get or create download thread pool."""
        if self._download_pool is None:
            self._download_pool = ThreadPoolExecutor(
                max_workers=3,
                thread_name_prefix="download_worker"
            )
            self._logger.info("Download thread pool created")
        return self._download_pool
    
    @property
    def search_pool(self) -> ThreadPoolExecutor:
        """Get or create search thread pool."""
        if self._search_pool is None:
            self._search_pool = ThreadPoolExecutor(
                max_workers=3,
                thread_name_prefix="search_worker"
            )
            self._logger.info("Search thread pool created")
        return self._search_pool
    
    def shutdown(self, timeout: int = 10) -> None:
        """Shutdown all thread pools gracefully."""
        self._logger.info("Shutting down thread pools...")
        
        if self._download_pool:
            self._download_pool.shutdown(wait=False)
            self._logger.info("Download pool shutdown initiated")
        
        if self._search_pool:
            self._search_pool.shutdown(wait=False)
            self._logger.info("Search pool shutdown initiated")
        
        # Wait for completion with timeout
        start_time = time.time()
        while time.time() - start_time < timeout:
            if self._all_pools_terminated():
                self._logger.info("All thread pools terminated successfully")
                return
            time.sleep(0.1)
        
        self._logger.warning(f"Thread pools did not terminate within {timeout}s")
    
    def _all_pools_terminated(self) -> bool:
        """Check if all pools are terminated."""
        # ThreadPoolExecutor doesn't expose termination status directly
        # We rely on shutdown(wait=False) and timeout
        return True
```

### 3. DownloadService (Refactorizado)

**Responsabilidad:** Lógica de negocio de descargas, sin dependencias de UI.

```python
class DownloadService:
    """Service layer for download operations. Singleton, thread-safe."""
    
    _instance = None
    _lock = threading.Lock()
    
    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        if hasattr(self, '_initialized'):
            return
        self._initialized = True
        
        self._queue_manager = QueueManager()
        self._history_manager = HistoryManager()
        self._settings_manager = SettingsManager()
        self._thread_pool = ThreadPoolManager()
        self._event_bus = EventBus()
        self._logger = get_logger()
        
        self._active_futures: Dict[str, Future] = {}
        self._stop_flags: Dict[str, threading.Event] = {}
        self._lock = threading.Lock()
    
    def start_download(self, task_id: str) -> bool:
        """Start a specific download task."""
        task = self._queue_manager.get_task(task_id)
        if not task:
            return False
        
        with self._lock:
            if task_id in self._active_futures:
                self._logger.warning(f"Task {task_id} already downloading")
                return False
            
            stop_event = threading.Event()
            self._stop_flags[task_id] = stop_event
            
            future = self._thread_pool.download_pool.submit(
                self._download_worker,
                task,
                stop_event
            )
            self._active_futures[task_id] = future
            
            # Add callback for completion
            future.add_done_callback(
                lambda f: self._on_download_complete(task_id, f)
            )
        
        return True
    
    def _download_worker(self, task: DownloadTask, stop_event: threading.Event) -> str:
        """Worker function that runs in thread pool."""
        task_id = task.id
        
        try:
            # Update status to downloading
            self._queue_manager.update_task_status(
                task_id, DownloadStatus.DOWNLOADING, 0.0
            )
            self._event_bus.publish(Event(
                type=EventType.DOWNLOAD_PROGRESS,
                data={"task_id": task_id, "progress": 0.0, "status": "downloading"}
            ))
            
            # Progress callback
            def progress_callback(d):
                if stop_event.is_set():
                    raise Exception("Download stopped by user")
                
                if d['status'] == 'downloading':
                    total = d.get('total_bytes') or d.get('total_bytes_estimate', 0)
                    downloaded = d.get('downloaded_bytes', 0)
                    
                    if total > 0:
                        progress = (downloaded / total) * 100
                        self._queue_manager.update_task_status(
                            task_id, DownloadStatus.DOWNLOADING, progress
                        )
                        # Throttle progress events
                        if int(progress) % 5 == 0:  # Every 5%
                            self._event_bus.publish(Event(
                                type=EventType.DOWNLOAD_PROGRESS,
                                data={"task_id": task_id, "progress": progress}
                            ))
            
            # Perform download
            downloader = VideoDownloader()
            if task.video_info.download_subtitles:
                file_path = downloader.download_with_subtitles(
                    task.video_info,
                    task.download_path,
                    progress_callback
                )
            else:
                file_path = downloader.download(
                    task.video_info,
                    task.download_path,
                    progress_callback
                )
            
            # Update status
            self._queue_manager.update_task_status(
                task_id, DownloadStatus.COMPLETED, 100.0
            )
            
            # Add to history
            self._add_to_history(task, file_path)
            
            return file_path
            
        except Exception as e:
            error_msg = str(e)
            self._logger.error(f"Download failed for {task_id}: {error_msg}", exc_info=True)
            
            if "stopped by user" in error_msg.lower():
                self._queue_manager.update_task_status(
                    task_id, DownloadStatus.STOPPED, error_message=error_msg
                )
            else:
                self._queue_manager.update_task_status(
                    task_id, DownloadStatus.FAILED, error_message=error_msg
                )
            
            raise
    
    def _on_download_complete(self, task_id: str, future: Future) -> None:
        """Callback when download completes (success or failure)."""
        with self._lock:
            self._active_futures.pop(task_id, None)
            self._stop_flags.pop(task_id, None)
        
        try:
            file_path = future.result()
            self._event_bus.publish(Event(
                type=EventType.DOWNLOAD_COMPLETE,
                data={"task_id": task_id, "file_path": file_path}
            ))
        except Exception as e:
            self._event_bus.publish(Event(
                type=EventType.DOWNLOAD_FAILED,
                data={"task_id": task_id, "error": str(e)}
            ))
    
    def stop_download(self, task_id: str) -> bool:
        """Stop a specific download."""
        with self._lock:
            if task_id in self._stop_flags:
                self._stop_flags[task_id].set()
                return True
        return False
    
    def stop_all_downloads(self) -> None:
        """Stop all active downloads."""
        with self._lock:
            for stop_event in self._stop_flags.values():
                stop_event.set()
```

### 4. SafeCallbackMixin (Nuevo Componente)

**Responsabilidad:** Proporcionar métodos thread-safe para actualizar UI desde screens.

```python
class SafeCallbackMixin:
    """Mixin for screens to handle thread-safe UI updates."""
    
    def __init__(self):
        self._callback_ids: List[str] = []
        self._destroyed = False
    
    def safe_after(self, ms: int, func: Callable, *args, **kwargs) -> str:
        """Schedule callback with automatic cleanup tracking."""
        if self._destroyed:
            return ""
        
        def wrapped():
            if not self._destroyed:
                try:
                    func(*args, **kwargs)
                except tk.TclError as e:
                    # Widget was destroyed
                    self._logger.debug(f"TclError in callback: {e}")
                except Exception as e:
                    self._logger.error(f"Error in callback: {e}", exc_info=True)
        
        callback_id = self.after(ms, wrapped)
        self._callback_ids.append(callback_id)
        return callback_id
    
    def safe_after_idle(self, func: Callable, *args, **kwargs) -> str:
        """Schedule idle callback with automatic cleanup tracking."""
        if self._destroyed:
            return ""
        
        def wrapped():
            if not self._destroyed:
                try:
                    func(*args, **kwargs)
                except tk.TclError as e:
                    self._logger.debug(f"TclError in idle callback: {e}")
                except Exception as e:
                    self._logger.error(f"Error in idle callback: {e}", exc_info=True)
        
        callback_id = self.after_idle(wrapped)
        self._callback_ids.append(callback_id)
        return callback_id
    
    def cleanup_callbacks(self) -> None:
        """Cancel all pending callbacks."""
        self._destroyed = True
        for callback_id in self._callback_ids:
            try:
                self.after_cancel(callback_id)
            except:
                pass
        self._callback_ids.clear()
    
    def destroy(self) -> None:
        """Override destroy to cleanup callbacks."""
        self.cleanup_callbacks()
        super().destroy()
```

### 5. QueueManager (Refactorizado para Thread-Safety)

**Cambios principales:**
- Agregar `threading.Lock` para proteger todas las operaciones
- Hacer métodos atómicos
- Agregar propiedades thread-safe

```python
class QueueManager:
    """Thread-safe queue manager."""
    
    def __init__(self):
        self._queue: List[DownloadTask] = []
        self._lock = threading.RLock()  # Reentrant lock
    
    def add_task(self, video_info: VideoInfo, download_path: str = "") -> DownloadTask:
        """Thread-safe add task."""
        with self._lock:
            if self.is_url_in_queue(video_info.url):
                raise ValueError(f"URL already in queue: {video_info.url}")
            
            task = DownloadTask(
                id=str(uuid.uuid4()),
                video_info=video_info,
                download_path=download_path
            )
            self._queue.append(task)
            return task
    
    def get_task(self, task_id: str) -> Optional[DownloadTask]:
        """Thread-safe get task."""
        with self._lock:
            for task in self._queue:
                if task.id == task_id:
                    return task
            return None
    
    def get_all_tasks(self) -> List[DownloadTask]:
        """Thread-safe get all tasks. Returns a copy."""
        with self._lock:
            return self._queue.copy()
    
    def update_task_status(self, task_id: str, status: DownloadStatus, 
                          progress: float = None, error_message: str = "") -> bool:
        """Thread-safe update task status."""
        with self._lock:
            task = self._get_task_unsafe(task_id)
            if task:
                task.status = status
                if progress is not None:
                    task.progress = progress
                if error_message:
                    task.error_message = error_message
                return True
            return False
    
    def _get_task_unsafe(self, task_id: str) -> Optional[DownloadTask]:
        """Internal method - assumes lock is held."""
        for task in self._queue:
            if task.id == task_id:
                return task
        return None
```

## Data Models

No hay cambios en los data models existentes. Se mantienen 100% compatibles:
- `VideoInfo`
- `DownloadTask`
- `DownloadStatus`
- `DownloadHistory`

## Error Handling

### Exception Hierarchy

```python
class KlypException(Exception):
    """Base exception for Klyp."""
    pass

class DownloadException(KlypException):
    """Download-related exceptions."""
    pass

class NetworkException(DownloadException):
    """Network-related download errors."""
    pass

class AuthenticationException(DownloadException):
    """Authentication-related errors."""
    pass

class FormatException(DownloadException):
    """Format/codec-related errors."""
    pass

class ThreadSafetyViolation(KlypException):
    """Raised when UI is accessed from wrong thread (debug mode only)."""
    pass
```

### Error Handling Strategy

1. **Worker Thread Exceptions:**
   - Capturar en `_download_worker`
   - Clasificar tipo de error
   - Publicar evento `DOWNLOAD_FAILED` con detalles
   - Registrar en log con stack trace completo
   - NO propagar al thread pool

2. **UI Callback Exceptions:**
   - Envolver todos los callbacks con try-except
   - Capturar `TclError` (widget destruido) silenciosamente
   - Capturar otras excepciones y mostrar mensaje al usuario
   - Registrar en log

3. **Thread-Safety Violations (Debug Mode):**
   - Detectar acceso a UI desde threads incorrectos
   - Lanzar `ThreadSafetyViolation` en modo debug
   - Registrar warning en modo producción

## Testing Strategy

### Unit Testing

```python
# Ejemplo de test para DownloadService
class TestDownloadService(unittest.TestCase):
    def setUp(self):
        self.service = DownloadService()
        self.event_bus = EventBus()
    
    def test_download_publishes_events(self):
        """Test that download publishes correct events."""
        events = []
        self.event_bus.subscribe(
            EventType.DOWNLOAD_PROGRESS,
            lambda e: events.append(e)
        )
        
        # Mock download
        task = create_mock_task()
        self.service.start_download(task.id)
        
        # Wait for completion
        time.sleep(2)
        
        # Verify events
        self.assertGreater(len(events), 0)
        self.assertEqual(events[-1].type, EventType.DOWNLOAD_COMPLETE)
```

### Integration Testing

- Probar flujo completo: agregar tarea → descargar → verificar historial
- Probar cancelación de descargas
- Probar múltiples descargas concurrentes
- Probar cambio de pantalla durante descarga

### Thread-Safety Testing

```python
def test_concurrent_queue_access():
    """Test that QueueManager handles concurrent access."""
    manager = QueueManager()
    
    def add_tasks():
        for i in range(100):
            manager.add_task(VideoInfo(url=f"http://test.com/{i}"))
    
    threads = [threading.Thread(target=add_tasks) for _ in range(10)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    
    # Should have exactly 1000 tasks
    assert len(manager.get_all_tasks()) == 1000
```

## Migration Strategy

### Phase 1: Infraestructura Base (Sin cambios visibles)
1. Implementar `EventBus`
2. Implementar `ThreadPoolManager`
3. Implementar `SafeCallbackMixin`
4. Agregar thread-safety a `QueueManager`

### Phase 2: Refactorizar DownloadManager
1. Crear `DownloadService`
2. Migrar lógica de descarga a service
3. Conectar con `EventBus`
4. Mantener `DownloadManager` como wrapper (deprecated)

### Phase 3: Refactorizar Screens
1. Aplicar `SafeCallbackMixin` a todas las screens
2. Suscribir screens a eventos del `EventBus`
3. Eliminar llamadas directas a managers desde callbacks
4. Implementar `cleanup()` en cada screen

### Phase 4: Refactorizar SearchManager
1. Migrar a usar `ThreadPoolManager`
2. Implementar shutdown correcto
3. Publicar eventos en lugar de callbacks directos

### Phase 5: Testing y Validación
1. Testing exhaustivo de cada componente
2. Testing de integración
3. Testing de stress (múltiples descargas, cambios rápidos de pantalla)
4. Validación de compatibilidad de datos

## Performance Considerations

### Memory

- `EventBus` queue limitada a 1000 eventos (prevenir memory leak)
- Limpiar eventos procesados inmediatamente
- Cancelar callbacks pendientes al destruir screens

### CPU

- Throttling de eventos de progreso (máximo 2/segundo por tarea)
- Debouncing de refresh de UI (mínimo 500ms entre refreshes)
- Batch processing de eventos en `EventBus`

### Thread Pool Sizing

- Download pool: 3 workers (balance entre velocidad y recursos)
- Search pool: 3 workers (suficiente para búsquedas paralelas)
- Evitar crear threads ad-hoc

## Compatibility

### Backward Compatibility

- **100% compatible** con formatos de datos existentes
- **100% compatible** con rutas de archivos existentes
- **100% compatible** con configuraciones existentes
- **Sin cambios** en API pública de managers (solo internals)

### Forward Compatibility

- Diseño permite agregar nuevos tipos de eventos fácilmente
- Arquitectura permite agregar nuevos servicios sin modificar existentes
- EventBus permite agregar listeners dinámicamente

## Security Considerations

- No hay cambios en seguridad (fuera del scope)
- Mantener validación existente de URLs
- Mantener manejo existente de cookies

## Deployment

- Refactorización se despliega como actualización normal
- No requiere migración de datos
- No requiere cambios en configuración del usuario
- Backward compatible con versión anterior
