# Spec: Refactorización Arquitectural de Klyp

## Resumen Ejecutivo

Esta especificación define una refactorización arquitectural completa de Klyp Video Downloader para eliminar los crasheos frecuentes causados por problemas de thread-safety y gestión inadecuada de recursos. La refactorización mantiene 100% de compatibilidad con datos existentes y todas las funcionalidades actuales.

## Problema Identificado

**Crasheos principales:**
- Al concluir una descarga y cambiar de pantalla
- Actualizaciones de UI desde threads secundarios (violación de thread-safety de tkinter)
- Callbacks ejecutándose después de que widgets fueron destruidos
- ThreadPoolExecutor sin gestión adecuada de lifecycle

**Causas raíz:**
1. **Violación de thread-safety de tkinter**: Worker threads actualizan UI directamente
2. **Falta de gestión de callbacks**: Callbacks pendientes se ejecutan después de destruir widgets
3. **ThreadPoolExecutor sin control**: Múltiples instancias sin shutdown adecuado
4. **Falta de separación de responsabilidades**: Lógica de negocio mezclada con UI
5. **Estado compartido sin protección**: Race conditions en QueueManager y DownloadManager

## Solución Propuesta

### Arquitectura Event-Driven

```
UI Layer (tkinter) 
    ↓ suscribe a eventos
EventBus (thread-safe queue)
    ↑ publica eventos
Service Layer (sin UI)
    ↓ usa
ThreadPoolManager (centralizado)
    ↓ ejecuta
Worker Threads
```

### Componentes Clave

1. **EventBus**: Comunicación thread-safe entre threads usando queue.Queue
2. **ThreadPoolManager**: Gestión centralizada de todos los thread pools (Singleton)
3. **DownloadService**: Lógica de negocio sin dependencias de UI (Singleton)
4. **SafeCallbackMixin**: Mixin para screens con callbacks thread-safe
5. **QueueManager Thread-Safe**: Protección con locks de todas las operaciones

### Principios de Diseño

- **Thread-safety first**: Toda comunicación entre threads es explícitamente segura
- **UI Thread purity**: Solo el UI Thread modifica widgets de tkinter
- **Fail-safe**: Excepciones nunca crashean la aplicación
- **Zero data loss**: 100% compatible con formatos existentes
- **Minimal changes**: Refactorizar solo lo necesario

## Estructura de Archivos

```
.kiro/specs/architecture-refactoring/
├── README.md           # Este archivo
├── requirements.md     # 12 requirements con acceptance criteria
├── design.md          # Diseño técnico detallado
└── tasks.md           # 95 tareas de implementación
```

## Plan de Implementación

### 13 Fases - 95 Tareas

**Phase 1-2**: Infraestructura base y thread-safety (15 tareas)
**Phase 3-4**: DownloadService y refactorización de DownloadManager (14 tareas)
**Phase 5-6**: Refactorización de screens con SafeCallbackMixin (18 tareas)
**Phase 7-8**: SearchManager y integración de EventBus (12 tareas)
**Phase 9-10**: Optimizaciones y singletons (8 tareas)
**Phase 11**: Testing y validación (17 tareas)
**Phase 12**: Logging y debug mode (3 tareas)
**Phase 13**: Documentación y cleanup (8 tareas)

## Compatibilidad

✅ **100% compatible** con:
- pending_downloads.json (formato JSON)
- Historial SQLite (schema sin cambios)
- settings.json (estructura sin cambios)
- Rutas de archivos existentes
- API pública de managers

## Beneficios Esperados

### Estabilidad
- ✅ Elimina crasheos al cambiar de pantalla
- ✅ Elimina crasheos al completar descargas
- ✅ Manejo robusto de excepciones
- ✅ Shutdown graceful de la aplicación

### Mantenibilidad
- ✅ Separación clara de responsabilidades
- ✅ Código testeable sin inicializar UI
- ✅ Arquitectura escalable para nuevas features
- ✅ Logging detallado para debugging

### Performance
- ✅ Throttling de actualizaciones de UI
- ✅ Debouncing de refreshes
- ✅ Gestión eficiente de thread pools
- ✅ Cache de settings en memoria

## Riesgos y Mitigación

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Regresión en funcionalidad | Media | Alto | Testing exhaustivo de cada fase |
| Incompatibilidad de datos | Baja | Alto | Tests de compatibilidad con datos reales |
| Performance degradation | Baja | Medio | Benchmarking antes/después |
| Complejidad aumentada | Media | Medio | Documentación detallada y ejemplos |

## Métricas de Éxito

1. **Cero crasheos** en test de stress (100 descargas, cambios rápidos de pantalla)
2. **100% compatibilidad** con datos existentes (verificado con tests)
3. **Shutdown graceful** en <10 segundos con descargas activas
4. **Todas las funcionalidades** mantienen comportamiento idéntico
5. **Cobertura de tests** >80% en componentes críticos

## Próximos Pasos

1. ✅ **Revisar y aprobar** esta especificación
2. 🔄 **Ejecutar tareas** siguiendo el orden del tasks.md
3. ⏳ **Testing continuo** después de cada fase
4. ⏳ **Validación final** con usuario antes de merge

## Notas Importantes

- **No modificar** formatos de datos existentes
- **Mantener** tkinter/ttkbootstrap como framework UI
- **Priorizar** estabilidad sobre nuevas features
- **Testing exhaustivo** antes de considerar completo
- **Documentar** todos los cambios arquitecturales

## Contacto y Soporte

Para preguntas sobre esta especificación:
- Revisar design.md para detalles técnicos
- Revisar requirements.md para acceptance criteria
- Revisar tasks.md para plan de implementación detallado

---

**Estado**: ✅ Aprobado - Listo para implementación
**Fecha**: 2026-02-12
**Versión**: 1.0
