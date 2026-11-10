# AVA Chat Showcase

> **Esta aplicación es una demostración de referencia de AVA Chat. No está conectada a servicios productivos y no representa una implementación funcional de AVA Voz.**

Réplica del frontend real de AVA Platform («Zonno Platform by CCG») que funciona **sin backend**: las mismas pantallas, componentes y estilos, alimentados por un servidor simulado que vive en el navegador y por datos ficticios. Sirve para que dirección y el equipo de AVA Voz vean cómo está organizado AVA Chat.

## Cómo está hecha la fidelidad

No es una reinterpretación visual: **el código de interfaz de AVA Platform se reutiliza tal cual** y solo se sustituye lo que depende de Laravel.

| Capa | Qué es | Origen |
|---|---|---|
| `src/ava/` | Layouts, componentes, hooks, páginas, configuración y estilos (`css/app.css`, `css/ava.css`) | **Copia de `resources/js` y `resources/css` de AVA Platform**, sin modificar |
| `src/shim/` | `@inertiajs/react` (`Link`, `router`, `useForm`, `usePage`, `Head`), `axios` y `route()` (Ziggy) | Adaptadores propios con la misma API |
| `src/mock/` | «Servidor» en el navegador: un manejador por **nombre de ruta real** de AVA, base de datos en memoria (con `localStorage`), semilla coherente, tabla de rutas | Propio. Las formas de los datos replican lo que devuelven los controladores de AVA |
| `src/demo/` | Guía de AVA Chat → AVA Voz, documentación, escenarios, recorrido guiado y el pequeño control «Demo» | Propio |
| `public/widget/ava-widget.js` | El script público del widget web, que AVA usa en su vista previa | Copia sin modificar |
| `public/brand/` | Mascota y favicon de AVA | Recursos de AVA |

El alias de Vite resuelve `@inertiajs/react`, `axios` y `@/` hacia esas capas, de modo que los archivos de `src/ava/` no cambian.

## Módulos (todos con la interfaz real de AVA)

Dashboard · Asistentes y Chatbots (pestañas General, Canales, Canales y apariencia con la vista previa real del widget, IA y comportamiento) · Conversaciones (bandeja, filtros, panel de chat, atención humana, contexto, operaciones, encuesta, banco de simulación DEMO) · Reportes (resumen, conversaciones, interacciones, encuestas, tendencias, reservas, pedidos, economía, clientes) · Catálogo e inventario por sede · Pedidos · Servicios · Sedes · Profesionales · Agenda · Clientes · Integraciones · Usuarios y Roles (usuarios, roles, permisos, Workspaces) · Auditoría · Configuraciones.

Además, desde el botón **Demo** (abajo, junto al menú): recorrido guiado, **AVA Chat → AVA Voz**, escenarios simulados, documentación y **Restaurar datos iniciales**.

## Qué es real y qué es simulado

| Etiqueta | Significado |
|---|---|
| Interfaz | Es el código de AVA Platform |
| Datos | Ficticios y coherentes: un cliente tiene conversación, cita, pedido y encuesta; resolver una conversación envía una encuesta (simulada) y cambia los contadores; una cita creada aparece en Agenda y en la ficha del cliente; un pedido solo cambia por las transiciones reales de `config/orders.php` |
| «IA» | Un guion local de palabras clave (agenda una cita, pasa a un humano…). No hay modelo, ni tokens |
| Integraciones | Ninguna se conecta. Las pruebas devuelven un resultado simulado; las pasarelas no guardan credenciales ni cobran; CardNET figura «Integración pendiente» |
| Funciones de AVA Voz | **Propuestas** de arquitectura (en violeta), nunca funciones existentes |

La red está cerrada por construcción: `fetch` se intercepta (mismo origen → servidor simulado, cualquier otro → error) y `XMLHttpRequest` se desactiva. Una prueba lo verifica.

## Instalación y ejecución

```bash
npm ci            # o npm install
npm run dev       # desarrollo en http://localhost:5173
npm run build     # producción en dist/
npm run preview   # sirve el build
npm run typecheck # TypeScript (los .ts del repositorio)
npm run lint      # ESLint sobre el código propio
npm test          # Vitest: semilla, transiciones, rutas, aislamiento de red
```

Requiere Node 22 o superior. No usa Docker, PHP, base de datos ni variables de entorno.

## Datos de demostración

Una sola semilla (`src/mock/seed.js` y `src/mock/seed/`): 2 asistentes, 12 clientes, unas 155 conversaciones en 60 días, citas con dos profesionales y dos sedes, productos con inventario por sede, pedidos, encuestas, usuarios y auditoría. Los cambios se guardan en el navegador (`localStorage`); **Demo → Restaurar datos iniciales** los borra.

## Recorrido guiado

Botón **Demo → Iniciar recorrido guiado** (10 pasos): Dashboard, conversaciones con IA, atención humana, chatbots, agenda, clientes, reportes, integraciones, y los dos pasos de AVA Voz (marcados «propuesta»). Es un panel pequeño en una esquina: no modifica el diseño de AVA. Se puede cerrar, retroceder, avanzar y reiniciar.

## Limitaciones conocidas

- Se ve el Workspace de un **administrador de cliente**. No hay selector de Workspace (solo existe para la administración de plataforma), ni Planes, ni la pestaña Organizaciones.
- No se reproducen: Campañas, Recordatorios, Perfil, Planes, inicio de sesión y registro, páginas públicas (reserva, pago, encuesta, legales) y los paneles de plataforma de Configuraciones (Wompi, plantilla de correo, privacidad de la actividad). Si se abre uno, aparece «Pantalla no incluida».
- Integraciones: no se simulan los flujos de Meta (OAuth), los webhooks entrantes y salientes ni el historial de llamadas API.
- El tiempo real de AVA (alertas de conversación, Reverb) no existe; el banco DEMO de la bandeja lo sustituye.
- Los productos no tienen imágenes (AVA las guarda en almacenamiento privado).
- La comparación visual con la aplicación real se hizo en modo claro; el modo oscuro se comprobó solo en la demostración.

## Estructura

```
src/
  ava/      Frontend de AVA Platform (copia)
  shim/     Inertia, axios y route() locales
  mock/     Servidor, base de datos, semilla y manejadores por ruta
  demo/     AVA Chat → AVA Voz, documentación, escenarios y recorrido
  test/     Pruebas
public/     Marca y widget de AVA
vercel.json Build estático y fallback SPA
```

## Despliegue en Vercel

1. Importa el repositorio en Vercel (Add New → Project).
2. `vercel.json` fija `npm ci`, `npm run build`, salida `dist` y la reescritura SPA (cualquier ruta interna sirve `index.html`).
3. No hay variables de entorno. No guardes tokens en el repositorio.

Actualizar = `git push` a la rama conectada.

## Seguridad

Sin secretos, claves ni datos reales. Las URL absolutas del código son marcadores de posición (`tu-dominio.example`, `n8n.ejemplo.com`…) y una prueba falla si aparece otra. `npm audit` no reporta vulnerabilidades.
