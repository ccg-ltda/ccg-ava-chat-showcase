# AVA Chat Showcase

> **Esta aplicación es una demostración de referencia de AVA Chat. No está conectada a servicios productivos y no representa una implementación funcional de AVA Voz.**

Aplicación web estática, independiente de AVA Platform, que muestra cómo está organizado AVA Chat (módulos, flujos, multi-tenancy, permisos, integraciones) y qué conceptos pueden servir de referencia para AVA Voz.

## Público destinatario

Dirección y equipo técnico que diseña AVA Voz y necesita entender la estructura de AVA Chat.

## Qué es real, qué es simulado

| Etiqueta | Significado |
|---|---|
| **Implementado en AVA** | Existe en el código de AVA Platform y tiene pruebas automatizadas. No implica validación contra un servicio externo real. |
| **Parcial en AVA** | Existe con límites (p. ej. integración sin validación real, sin envío real). El límite se muestra en cada módulo. |
| **Planificado / pendiente** | No funciona todavía (p. ej. CardNET, AZUL). |
| **Propuesta AVA Voz** | Arquitectura sugerida; no existe en AVA Chat ni se afirma que exista en AVA Voz. |
| **Simulado** | Interacción de esta demostración con datos ficticios, que ocurre solo en el navegador. |

Los estados de los módulos salen de `config/modules.php`, rutas, modelos, servicios y `RECOMENDACIONES.md` de AVA Platform (revisados en solo lectura el 2026-11-10). Cada página de módulo lista su evidencia.

## Tecnologías

React 19, TypeScript, Vite, Tailwind CSS 4, React Router, lucide-react (mismos iconos que AVA), Inter autoalojada. Sin backend, base de datos, autenticación ni llamadas de red a terceros.

## Instalación y ejecución

```bash
npm install
npm run dev        # desarrollo
npm run build      # producción (carpeta dist/)
npm run preview    # servir el build
npm run typecheck
npm run lint
npm test
```

## Estructura

```
src/
  components/   Layout (sidebar, barra superior, modo claro/oscuro), ui (tarjetas, tablas, avisos, notificaciones simuladas)
  data/         modules.ts (inventario real de AVA), demo.ts (datos ficticios), voice.ts (AVA Chat → AVA Voz), docs.ts
  lib/          scenario.ts (motor puro de escenarios) y pruebas
  pages/        una página por módulo + Escenarios, Documentación y AVA Voz
vercel.json     build estático + fallback SPA
```

## Módulos representados

Dashboard · Asistentes IA · Chatbots (widget interactivo) · Conversaciones (filtros, asignación, resolver, encuesta) · Clientes · Agenda (citas, servicios, profesionales, recordatorios) · Catálogo e inventario por sede · Pedidos (flujo de estados real) · Reportes y encuestas · Integraciones · Administración (organizaciones, workspaces, roles, permisos, planes) · Pagos (conceptual).

## Escenarios simulados

*Escenarios simulados* recorre paso a paso: mensaje de un cliente → chatbot → intención de la IA → solicitud → cita → traspaso a humano → resolución → encuesta → reportes. Incluye un segundo escenario **conceptual** de AVA Voz (llamada → transcripción → agenda → transferencia → métricas), marcado como propuesta.

## Relación con AVA Voz

La sección **AVA Chat → AVA Voz** compara 17 componentes (multi-tenancy, workspaces, usuarios, roles, permisos, clientes, asistentes, configuración de agentes, conversaciones, historial, asignación humana, agenda, integraciones, automatizaciones, reportes, auditoría, seguridad). Para cada uno: qué hace hoy en AVA Chat, cómo está organizado, qué entidades usa y —como propuesta— qué se reutilizaría, qué se adaptaría y qué sería nuevo.

## Limitaciones

- Datos ficticios; ninguna cifra es real.
- No hay IA: el widget responde con frases guionadas locales.
- No se envían mensajes, no se procesan pagos, no se conecta con Meta, n8n, telefonía ni pasarelas.
- Se omiten a propósito detalles de infraestructura y despliegue de AVA.
- La demostración refleja el estado de AVA Platform a 2026-11-10 y no se actualiza sola.

## Despliegue en Vercel

1. Sube el repositorio a GitHub.
2. En Vercel: **Add New → Project** → importa el repositorio.
3. Vercel detecta Vite. `vercel.json` ya fija `npm ci`, `npm run build`, salida `dist` y el fallback SPA (cualquier ruta interna sirve `index.html`).
4. No hay variables de entorno. No pongas tokens en el repositorio.

Actualizar = `git push` a la rama conectada.
