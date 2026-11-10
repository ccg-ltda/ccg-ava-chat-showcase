export type Block =
  | { t: 'p'; text: string }
  | { t: 'ul'; items: string[] }
  | { t: 'table'; head: string[]; rows: string[][] }
  | { t: 'flow'; steps: string[] }
  | { t: 'note'; tone: 'blue' | 'amber' | 'violet'; text: string };

export interface DocSection { id: string; title: string; blocks: Block[] }

/** Every statement about AVA Chat comes from the repository (config/modules.php, routes, models, services, docs). */
export const DOCS: DocSection[] = [
  { id: 'introduccion', title: 'Introducción a AVA Chat', blocks: [
    { t: 'p', text: 'AVA Platform es un SaaS multi-tenant (Laravel, Inertia, React, PostgreSQL). AVA Chat es su parte de atención conversacional: canales, asistentes de IA, bandeja de conversaciones con atención humana, clientes, agenda, catálogo, pedidos, recordatorios, encuestas y reportes.' },
    { t: 'p', text: 'AVA es el plano de control: decide qué existe para cada Workspace, quién puede hacer qué y deja rastro. La lógica conversacional con IA se ejecuta en n8n y usa las herramientas que AVA expone.' },
    { t: 'note', tone: 'amber', text: 'Estado honesto: hay código y pruebas automatizadas de la mayoría de módulos, pero ninguna integración externa (Meta, n8n, Booker, pasarelas, correo) tiene validación real registrada.' },
  ] },
  { id: 'arquitectura', title: 'Arquitectura general', blocks: [
    { t: 'flow', steps: ['Canales (Web, WhatsApp, Instagram, Messenger)', 'AVA: conversaciones, plan, permisos, auditoría', 'n8n: flujo e IA asignados al asistente', 'Herramientas de AVA (/api/agent/*)', 'Datos del Workspace'] },
    { t: 'table', head: ['Capa', 'Tecnología / pieza'], rows: [['Servidor', 'Laravel 13, colas, tareas programadas'], ['Interfaz', 'React 19 con Inertia 3, Vite, Tailwind'], ['Datos', 'PostgreSQL; Redis para caché y colas'], ['IA', 'Flujos en n8n (fuera de AVA)'], ['Pagos', 'Núcleo propio + pasarelas por Workspace']] },
    { t: 'note', tone: 'blue', text: 'Detalles de infraestructura y despliegue se omiten a propósito: este documento es una explicación arquitectónica apta para compartir.' },
  ] },
  { id: 'mapa-modulos', title: 'Mapa de módulos', blocks: [
    { t: 'table', head: ['Sección del menú', 'Módulos'], rows: [['General', 'Dashboard, Asistentes, Conversaciones'], ['Operación', 'Reportes, Catálogo, Pedidos, Servicios, Sedes, Profesionales, Agenda, Clientes, Campañas, Recordatorios'], ['Administración', 'Usuarios y roles, Auditoría, Configuraciones, Integraciones'], ['Plataforma', 'Planes y catálogo de módulos (solo equipo de plataforma)']] },
    { t: 'p', text: 'Las soluciones comerciales (Servicios y Reservas, eCommerce, Salud, Delivery) no son secciones del menú: son categorías del catálogo y planes. Un módulo existe una sola vez y lo comparten todas.' },
  ] },
  { id: 'relaciones', title: 'Relaciones entre módulos', blocks: [
    { t: 'table', head: ['Módulo', 'Necesita'], rows: [['Asistentes', 'Conversaciones'], ['Profesionales', 'Catálogo de servicios'], ['Agenda', 'Servicios y Profesionales'], ['Proveedores de agenda', 'Agenda e Integraciones'], ['Campañas', 'Clientes'], ['Recordatorios', 'Clientes'], ['Pedidos', 'Catálogo de productos']] },
    { t: 'p', text: 'Son las dependencias técnicas declaradas en config/modules.php. Las inversas no se declaran.' },
  ] },
  { id: 'multitenancy', title: 'Multi-tenancy', blocks: [
    { t: 'flow', steps: ['Organización', 'Workspace', 'Membresía (usuario + rol)'] },
    { t: 'ul', items: ['Cada consulta se acota al Workspace activo; un chatbot, un token o un cliente pertenece a un solo Workspace.', 'El plan comercial decide qué módulos existen para el Workspace; el rol decide qué puede hacer cada persona.', 'Existe un Workspace administrativo de plataforma, protegido en el servidor, con acceso a planes y catálogo.'] },
  ] },
  { id: 'conversaciones', title: 'Flujo de conversaciones', blocks: [
    { t: 'flow', steps: ['Mensaje entrante', 'IA atendiendo', 'Pendiente de agente (traspaso)', 'En atención (humano)', 'Resuelta', 'Encuesta'] },
    { t: 'ul', items: ['Estados reales: IA atendiendo, pendiente de agente, en atención, resuelta.', 'El asistente puede pedir el traspaso; un humano toma la conversación y responde.', 'Contexto compartido: la automatización lee el historial reciente y escribe lo que aprendió.', 'Actividad técnica: cada llamada a herramienta queda registrada para depurar.'] },
  ] },
  { id: 'asistentes', title: 'Flujo de asistentes IA', blocks: [
    { t: 'flow', steps: ['Chatbot activo', 'Flujo n8n asignado (catálogo en código)', 'Token del asistente', 'Herramientas: agenda, pedidos, recordatorios, conocimiento, traspaso'] },
    { t: 'ul', items: ['El flujo solo puede asignarlo el equipo de plataforma, desde un catálogo revisado en código.', 'Cada herramienta exige que el plan incluya los módulos que necesita.', 'El asistente nunca mueve ni cancela un pedido.'] },
    { t: 'note', tone: 'amber', text: 'Sin prueba real de punta a punta con n8n todavía.' },
  ] },
  { id: 'agenda', title: 'Flujo de agenda', blocks: [
    { t: 'flow', steps: ['Servicio + profesional', 'Disponibilidad calculada', 'Cita solicitada', 'Confirmada', 'Completada / no asistió / cancelada'] },
    { t: 'ul', items: ['Disponibilidad = horarios del profesional, descansos, días no laborables y citas existentes.', 'Hay reserva web pública por clave, con límites de tasa.', 'Una agenda externa (Booker) puede ser la fuente de verdad; hoy está simulada.'] },
  ] },
  { id: 'integraciones', title: 'Integraciones', blocks: [
    { t: 'table', head: ['Tipo', 'Estado'], rows: [['Web, WhatsApp, Instagram, Messenger', 'Código listo; Meta sin validación real'], ['n8n', 'Contrato listo; sin prueba real'], ['Booker', 'Simulado'], ['HTTP genérica (p. ej. WooCommerce)', 'Prueba de conexión real; sin tienda de prueba'], ['Wompi / CardNET / AZUL', 'Wompi con dobles; CardNET y AZUL pendientes']] },
    { t: 'p', text: 'Cada tipo es una clase registrada en config/integrations.php; las credenciales se guardan cifradas y de solo escritura.' },
  ] },
  { id: 'seguridad', title: 'Permisos y seguridad', blocks: [
    { t: 'ul', items: ['Disponibilidad (plan) ≠ autorización (rol): el servidor exige ambas en cada ruta; ocultar un menú nunca sustituye la protección.', 'Tokens por asistente, contrato firmado hacia n8n, límites de tasa y de tamaño, protección frente a destinos inseguros en conexiones HTTP.', 'Secretos cifrados y de solo escritura; la auditoría no guarda valores secretos.', 'Consentimiento del cliente respetado en recordatorios, campañas y encuestas.'] },
  ] },
  { id: 'automatizaciones', title: 'Automatizaciones', blocks: [
    { t: 'ul', items: ['Recordatorios: reglas, intentos, motivos de omisión (sin consentimiento, sin teléfono válido, cita cerrada…).', 'Encuestas automáticas: al resolver una conversación, confirmar/completar una cita o entregar un pedido.', 'Cierre automático de conversaciones y purgas programadas de datos técnicos.'] },
    { t: 'note', tone: 'amber', text: 'Envío por WhatsApp de recordatorios y encuestas: sin validar con Meta. Campañas: sin envío real todavía.' },
  ] },
  { id: 'chat-vs-voz', title: 'Diferencias entre AVA Chat y AVA Voz', blocks: [
    { t: 'table', head: ['Aspecto', 'AVA Chat (existe)', 'AVA Voz (propuesta)'], rows: [['Unidad', 'Mensaje en una conversación', 'Sesión de voz continua'], ['Tiempo', 'Asíncrono, tolerante a la espera', 'Tiempo real, latencia crítica'], ['Entrada', 'Texto', 'Audio → transcripción'], ['Traspaso', 'Cola y asignación', 'Transferencia en vivo'], ['Evidencia', 'Mensajes', 'Transcripción y, si aplica, audio'], ['Canal', 'Web, Meta', 'Telefonía / SIP']] },
    { t: 'note', tone: 'violet', text: 'La columna AVA Voz es una propuesta de arquitectura, no una descripción de un sistema existente.' },
  ] },
  { id: 'recomendaciones-voz', title: 'Recomendaciones de arquitectura para AVA Voz', blocks: [
    { t: 'note', tone: 'violet', text: 'Propuestas sugeridas, no funciones existentes.' },
    { t: 'ul', items: ['Reutilizar tenant, plan, roles, permisos, clientes, agenda, reportes y auditoría; modelar la llamada como una sesión vinculada a una conversación.', 'Mantener el contrato de herramientas del asistente: el mismo backend de agenda y pedidos sirve a chat y voz.', 'Tratar la telefonía como un nuevo tipo de integración con webhooks firmados e idempotentes.', 'Diseñar desde el inicio retención, consentimiento y acceso a grabaciones y transcripciones.', 'Medir latencia, contención de la IA y abandono desde la primera versión.', 'Aislar el procesamiento de audio en tiempo real del backend transaccional.'] },
  ] },
];
