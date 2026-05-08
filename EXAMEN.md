# EXAMEN — Adriana Alamo Gonzalo

## Reto

F6 — Cierra el contrato del albarán firmado

---

## Tarea técnica

### Qué problema detecté

En el controlador `deliverynote.controller.js`, la función `remove` en la línea 103 tiene una guardia que comprueba si el albarán está firmado antes de borrarlo, pero esa misma protección no existe para la edición. Además, `downloadPdf` en la línea 149 no verifica el rol del usuario que hace la petición, lo que significa que un `guest` puede descargar cualquier PDF de su compañía sin restricción.

### Cómo lo arreglé

Añadí las rutas `PUT /api/deliverynote/:id` y `PATCH /api/deliverynote/:id` en `deliverynote.routes.js`, con un controlador que primero busca el albarán, comprueba `note.signed` y lanza un `AppError.conflict` con 409 si está firmado. Si no lo está, valida el body con Zod y aplica la actualización. Para `downloadPdf`, añadí una comprobación de rol justo después de obtener el documento: si el usuario es `guest` y no es el creador del albarán, se lanza `AppError.forbidden` con 403.

### Por qué mi solución es correcta

La guardia en `remove` no protege la edición porque son controladores independientes — añadir la ruta PUT sin replicar la comprobación deja el recurso expuesto. Al declarar explícitamente la guardia en el controlador de actualización, el sistema es consistente: cualquier intento de modificar un albarán firmado, sea DELETE o PUT/PATCH, recibe el mismo rechazo semántico. La restricción de `downloadPdf` sigue el principio de menor privilegio: un `guest` solo accede a lo que le corresponde.

---

## Respuestas socráticas

**1.** La guardia del `remove` en `deliverynote.controller.js:103` es una precondición de negocio acoplada a esa operación concreta, no una protección transversal del recurso. Hoy, si alguien envía `PUT /api/deliverynote/:id`, Express 5 no encuentra ninguna ruta coincidente y devuelve 404, pero ese 404 es un accidente de ausencia, no una decisión de diseño. En cuanto un desarrollador añada la ruta PUT (que es exactamente lo que pide el examen), si no replica explícitamente la guardia en el controlador de edición, el recurso queda desprotegido y un albarán firmado puede modificarse. La protección correcta es declarativa en el controlador de actualización: comprobar `note.signed` y lanzar `AppError.conflict` antes de tocar ningún campo, de la misma manera que ya hace `remove`.

**2.** El `z.discriminatedUnion('format', [...])` exige que el discriminador `format` esté presente en el cuerpo para seleccionar el schema correcto. Para PATCH, donde el cliente solo envía los campos que cambian, obligar a incluir `format` en cada petición parcial es antinatural y rompe la semántica de actualización parcial. Usar `.partial()` sobre el union mantiene la estructura bifurcada pero no resuelve el problema: si el cuerpo no incluye `format`, Zod no puede elegir rama y falla. La alternativa correcta es un schema plano específico para actualización — un `z.object` con todos los campos editables marcados `.optional()` — que renuncia a la validación cruzada entre tipo de albarán pero acepta cualquier combinación de campos sin romper la validación cuando el discriminador no viaja en el body.

**3.** Un evento WebSocket es obligación de contrato cuando el frontend mantiene estado local derivado de ese evento: si el cliente guarda en memoria la lista de albaranes y la actualiza al recibir `deliverynote:new` y `deliverynote:signed`, una edición que no emita `deliverynote:updated` dejará esa lista desincronizada sin que el usuario lo sepa. En el sistema actual, cualquier frontend que haya renderizado el albarán con los datos del evento `deliverynote:signed` mostrará información obsoleta tras una edición silenciosa. El evento pasa de ser extra opcional a obligación en el momento en que el frontend elimina el polling y confía exclusivamente en el canal de WebSocket, que es precisamente el propósito de `emitToCompany` tal como está implementado en `realtime.service.js:11`.

**4.** En la implementación actual de `downloadPdf` (línea 150-156), el `findOne` filtra únicamente por `_id` y `company: req.user.companyId`. Cualquier usuario autenticado en esa compañía, incluyendo un guest, puede descargar el PDF de cualquier albarán de la compañía con solo conocer el `_id`, independientemente de quién lo creó o a qué proyecto pertenece. No debería poder: un guest debería acceder solo a los albaranes donde es el creador (`note.user`) o, si el modelo lo soporta, el cliente relacionado. El cambio mínimo tras obtener el documento sería añadir: `if (req.user.role === 'guest' && note.user.toString() !== req.user.id) throw AppError.forbidden('No tienes permiso para descargar este albarán');`.

**5.** Devolver 409 Conflict es semánticamente correcto: el código 4xx comunica al cliente que la operación falló y por qué, permitiéndole reaccionar (mostrar un mensaje de error, revertir un cambio optimista de UI). Retornar 200 silencioso sería una mentira de protocolo — el cliente asumiría que el recurso fue eliminado, lo quitaría de su estado local y quedaría desincronizado con la base de datos. En cuanto a idempotencia: DELETE sí es idempotente, pero idempotencia significa "el efecto es el mismo con una o N llamadas", no "siempre devuelves 200"; un 409 repetible es perfectamente idempotente porque el estado del servidor no cambia. La guardia en `remove:103` implementa correctamente esa semántica: el recurso permanece intacto y el código de respuesta describe el motivo exacto del fallo.

---

## Proceso

**Tiempo total invertido:** 30 minutos aprox

**Herramientas usadas:** VS Code, Claude AI, temario de clase

**Prompts a IA:**

- "Dime de estos md que temas son los que responden a las preguntas socraticas"
- "Explicame que me estan preguntando exactamente en la pregunta X"
- "He redactado esta respuestas a las preguntas, ¿es correcta o me estoy dejando algo importante?¿tiene sentido con mi codigo?"
- "Revisame la redaccion y las faltas, ten soy una alumna de 3º de carrera"
- "Para la parte practica dame un prompt para que haga los test necesarios para comprobar que todo es correcto"
