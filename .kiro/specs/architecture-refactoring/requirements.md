# Requirements Document

## Introduction

Esta refactorización arquitectural tiene como objetivo eliminar los crasheos frecuentes de la aplicación Klyp, especialmente los que ocurren al concluir descargas y cambiar de pantalla. La refactorización se enfocará en mejorar el manejo de multitarea, thread-safety, y la arquitectura general del código, manteniendo todas las funcionalidades existentes y la compatibilidad con datos almacenados.

## Glossary

- **System**: La aplicación Klyp Video Downloader
- **UI Thread**: El hilo principal de tkinter que maneja la interfaz gráfica
- **Worker Thread**: Hilos secundarios que ejecutan tareas de descarga o búsqueda
- **Thread-Safe Queue**: Cola thread-safe para comunicación entre hilos
- **Event Loop**: Ciclo de eventos de tkinter que procesa actualizaciones de UI
- **Callback**: Función que se ejecuta en respuesta a un evento
- **Download Manager**: Componente que gestiona las descargas
- **Queue Manager**: Componente que gestiona la cola de descargas
- **Search Manager**: Componente que gestiona las búsquedas de videos
- **State Mutation**: Modificación del estado compartido entre hilos
- **Race Condition**: Condición donde múltiples hilos acceden a datos compartidos simultáneamente
- **Deadlock**: Situación donde dos o más hilos se bloquean mutuamente
- **Resource Leak**: Recursos (threads, archivos, memoria) que no se liberan correctamente

## Requirements

### Requirement 1: Thread-Safety en Actualizaciones de UI

**User Story:** Como usuario, quiero que la aplicación no se crashee al cambiar de pantalla mientras hay descargas activas, para poder navegar libremente por la interfaz.

#### Acceptance Criteria

1. WHEN una descarga actualiza su progreso, THE System SHALL encolar la actualización de UI en el UI Thread usando el método thread-safe `after()`
2. WHEN un Worker Thread necesita actualizar la UI, THE System SHALL utilizar una cola thread-safe para comunicar cambios al UI Thread
3. WHEN el usuario cambia de pantalla, THE System SHALL cancelar callbacks pendientes de la pantalla anterior sin causar excepciones
4. WHEN una descarga finaliza, THE System SHALL notificar al UI Thread mediante un mecanismo thread-safe antes de actualizar widgets
5. IF un callback de UI se ejecuta después de que el widget fue destruido, THEN THE System SHALL capturar la excepción y registrarla sin crashear

### Requirement 2: Gestión Robusta de ThreadPoolExecutor

**User Story:** Como desarrollador, quiero que todos los ThreadPoolExecutor se gestionen correctamente, para evitar resource leaks y comportamientos impredecibles.

#### Acceptance Criteria

1. THE System SHALL crear un único ThreadPoolExecutor centralizado para descargas con límite configurable de workers
2. THE System SHALL crear un único ThreadPoolExecutor centralizado para búsquedas con límite de 3 workers
3. WHEN la aplicación se cierra, THE System SHALL ejecutar shutdown(wait=True) en todos los ThreadPoolExecutor con timeout de 10 segundos
4. WHEN un Worker Thread lanza una excepción, THE System SHALL capturarla, registrarla y notificar al usuario sin afectar otros workers
5. THE System SHALL implementar un context manager para gestión automática de ThreadPoolExecutor lifecycle

### Requirement 3: Separación de Lógica de Negocio y UI

**User Story:** Como desarrollador, quiero que la lógica de negocio esté separada de la UI, para facilitar testing y mantenimiento.

#### Acceptance Criteria

1. THE System SHALL implementar una capa de servicios que contenga toda la lógica de negocio sin dependencias de tkinter
2. THE System SHALL utilizar el patrón Observer para notificar cambios de estado desde servicios hacia UI
3. WHEN un servicio cambia de estado, THE System SHALL emitir eventos que la UI puede suscribirse
4. THE System SHALL mantener los managers (DownloadManager, QueueManager, SearchManager) libres de código de UI
5. THE System SHALL implementar interfaces claras entre capa de servicios y capa de presentación

### Requirement 4: Manejo Robusto de Excepciones

**User Story:** Como usuario, quiero que la aplicación maneje errores gracefully sin crashear, para tener una experiencia estable.

#### Acceptance Criteria

1. WHEN ocurre una excepción en un Worker Thread, THE System SHALL capturarla, registrarla con stack trace completo y continuar operando
2. WHEN ocurre una excepción en un callback de UI, THE System SHALL capturarla y mostrar un mensaje de error al usuario sin crashear
3. THE System SHALL implementar un decorador @safe_callback para todos los callbacks de UI que capture excepciones
4. WHEN yt-dlp lanza una excepción durante descarga, THE System SHALL clasificarla (red, auth, formato) y reintentar si es apropiado
5. THE System SHALL mantener un log estructurado de todas las excepciones con contexto (task_id, url, timestamp)

### Requirement 5: Gestión de Estado Thread-Safe

**User Story:** Como desarrollador, quiero que el estado compartido entre hilos esté protegido, para evitar race conditions y corrupción de datos.

#### Acceptance Criteria

1. THE System SHALL proteger todas las operaciones de lectura/escritura en QueueManager con threading.Lock
2. THE System SHALL utilizar queue.Queue para comunicación thread-safe entre Worker Threads y UI Thread
3. WHEN múltiples threads modifican active_downloads, THE System SHALL usar un lock para garantizar atomicidad
4. THE System SHALL implementar propiedades thread-safe para acceso a contadores (completed_count, failed_count)
5. THE System SHALL evitar state mutation directa desde callbacks, usando métodos thread-safe en su lugar

### Requirement 6: Ciclo de Vida de Recursos

**User Story:** Como usuario, quiero que la aplicación libere recursos correctamente al cerrar, para evitar procesos zombie y archivos bloqueados.

#### Acceptance Criteria

1. WHEN el usuario cierra la aplicación, THE System SHALL detener todos los Worker Threads activos con timeout de 5 segundos
2. WHEN el usuario cierra la aplicación, THE System SHALL guardar el estado de descargas pendientes antes de terminar threads
3. THE System SHALL cancelar todos los callbacks pendientes de `after()` al destruir una pantalla
4. WHEN SearchManager se destruye, THE System SHALL ejecutar shutdown en su ThreadPoolExecutor
5. THE System SHALL cerrar todas las conexiones de red y archivos abiertos antes de terminar

### Requirement 7: Debouncing y Throttling de UI

**User Story:** Como usuario, quiero que la UI responda fluidamente sin congelarse, incluso durante actualizaciones frecuentes de progreso.

#### Acceptance Criteria

1. THE System SHALL implementar debouncing para refresh_queue con delay mínimo de 500ms entre actualizaciones
2. WHEN múltiples actualizaciones de progreso llegan en ráfaga, THE System SHALL procesar solo la más reciente
3. THE System SHALL usar un patrón de cola de eventos para batch updates de UI en lugar de actualizar por cada cambio
4. WHEN el usuario navega entre pantallas, THE System SHALL cancelar refreshes pendientes de la pantalla anterior
5. THE System SHALL limitar actualizaciones de progreso a máximo 2 por segundo por tarea

### Requirement 8: Patrón de Comunicación Asíncrona

**User Story:** Como desarrollador, quiero un patrón claro de comunicación entre threads, para evitar deadlocks y mejorar mantenibilidad.

#### Acceptance Criteria

1. THE System SHALL implementar una clase EventBus thread-safe para comunicación entre componentes
2. WHEN un Worker Thread completa una tarea, THE System SHALL publicar un evento en el EventBus
3. THE System SHALL procesar eventos del EventBus en el UI Thread usando `after_idle()`
4. THE System SHALL implementar tipos de eventos claramente definidos (DownloadProgress, DownloadComplete, DownloadFailed, etc.)
5. THE System SHALL permitir suscripción y desuscripción dinámica de listeners sin race conditions

### Requirement 9: Singleton Pattern para Managers

**User Story:** Como desarrollador, quiero que los managers sean singleton, para evitar múltiples instancias y estado inconsistente.

#### Acceptance Criteria

1. THE System SHALL implementar DownloadManager como singleton con lazy initialization
2. THE System SHALL implementar SearchManager como singleton con lazy initialization
3. THE System SHALL implementar SettingsManager como singleton para evitar múltiples lecturas de disco
4. WHEN VideoDownloader necesita configuración, THE System SHALL obtenerla del SettingsManager singleton sin crear nuevas instancias
5. THE System SHALL garantizar thread-safety en la inicialización de singletons usando double-checked locking

### Requirement 10: Compatibilidad con Datos Existentes

**User Story:** Como usuario, quiero que la refactorización mantenga todos mis datos existentes, para no perder historial ni configuraciones.

#### Acceptance Criteria

1. THE System SHALL mantener el formato JSON actual para pending_downloads.json sin cambios
2. THE System SHALL mantener el formato de base de datos SQLite actual para historial sin cambios
3. THE System SHALL mantener la estructura de configuración en settings.json sin cambios
4. WHEN la aplicación se actualiza, THE System SHALL migrar datos automáticamente si hay cambios menores de formato
5. THE System SHALL mantener compatibilidad con rutas de archivos existentes (config, logs, downloads)

### Requirement 11: Testing y Validación

**User Story:** Como desarrollador, quiero poder validar que la refactorización no introduce regresiones, para garantizar estabilidad.

#### Acceptance Criteria

1. THE System SHALL mantener todas las funcionalidades existentes sin cambios en comportamiento visible
2. THE System SHALL permitir testing de componentes de negocio sin inicializar UI
3. THE System SHALL implementar logging detallado de operaciones thread-sensitive para debugging
4. WHEN se ejecuta en modo debug, THE System SHALL validar que todas las operaciones de UI ocurren en el UI Thread
5. THE System SHALL incluir assertions para detectar violaciones de thread-safety en desarrollo

### Requirement 12: Manejo de Callbacks Pendientes

**User Story:** Como usuario, quiero que la aplicación no crashee cuando callbacks se ejecutan después de cerrar pantallas, para tener una experiencia estable.

#### Acceptance Criteria

1. WHEN una pantalla se destruye, THE System SHALL cancelar todos sus callbacks pendientes registrados con `after()`
2. THE System SHALL mantener un registro de callback IDs por pantalla para cancelación masiva
3. WHEN un callback intenta acceder a un widget destruido, THE System SHALL capturar TclError y registrarlo sin crashear
4. THE System SHALL implementar un método cleanup() en cada pantalla que cancele callbacks y libere recursos
5. WHEN el usuario cambia de pantalla rápidamente, THE System SHALL garantizar que callbacks de pantalla anterior no afecten la nueva
