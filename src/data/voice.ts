/**
 * AVA Chat → AVA Voz. "today", "organization" and "entities" describe AVA Chat as verified in the repository.
 * "reuse", "adapt" and "new" are SUGGESTED ARCHITECTURE: nothing here says AVA Voz already implements it.
 */
export interface VoiceRow {
  component: string;
  today: string;
  organization: string;
  entities: string;
  reuse: string;
  adapt: string;
  new: string;
}

export const VOICE_MAPPING: VoiceRow[] = [
  { component: 'Multi-tenancy', today: 'Los datos se aíslan por Workspace; el plan y los módulos se evalúan por Workspace.', organization: 'Organización → Workspaces → membresías; rutas protegidas por módulo y permiso.', entities: 'Organization, Workspace, Plan, Module', reuse: 'El mismo modelo de tenant y de plan puede gobernar los números, agentes y minutos de voz.', adapt: 'Cuotas por consumo de voz (minutos, llamadas simultáneas) además de módulos.', new: 'Medición y límites de minutos por Workspace.' },
  { component: 'Workspaces', today: 'Cada negocio tiene su Workspace con ajustes, integraciones y módulos propios.', organization: 'Tabla workspaces con código, plan y ajustes; vista de Workspace activo.', entities: 'Workspace, WorkspaceSetting, WorkspaceModuleOverride', reuse: 'Un Workspace puede tener a la vez canal de chat y canal de voz.', adapt: 'Ajustes regionales de voz: idioma, voz, horario de atención telefónico.', new: 'Números telefónicos asignados al Workspace.' },
  { component: 'Usuarios', today: 'Cuentas con membresía por Workspace, invitaciones y verificación de correo.', organization: 'User + workspace_user (rol por Workspace).', entities: 'User, WorkspaceInvitation', reuse: 'Mismas cuentas y membresías para operadores de voz.', adapt: 'Estado de disponibilidad del operador (en línea, en llamada).', new: 'Presencia de operador en tiempo real.' },
  { component: 'Roles', today: 'admin, supervisor, agente, cliente (y roles de plataforma).', organization: 'Roles Spatie sembrados por RolesAndPermissionsSeeder.', entities: 'Role', reuse: 'Los mismos roles cubren a quien supervisa y a quien atiende llamadas.', adapt: 'Distinguir quién puede escuchar grabaciones.', new: 'Rol o permiso para acceso a grabaciones.' },
  { component: 'Permisos', today: 'Permisos finos por operación (ver, crear, cancelar…), exigidos en el servidor.', organization: 'config/permissions.php como lista única; middleware workspace.permission.', entities: 'Permission', reuse: 'El patrón «módulo disponible + permiso del rol» se mantiene.', adapt: 'Nuevos permisos: ver llamadas, transferir, escuchar grabación.', new: 'Permisos específicos de telefonía.' },
  { component: 'Clientes', today: 'Ficha con identidades por canal, etiquetas y consentimiento.', organization: 'Customer con CustomerIdentity por canal y CommunicationConsent.', entities: 'Customer, CustomerIdentity, CommunicationConsent', reuse: 'El número telefónico es otra identidad de la misma ficha.', adapt: 'Normalización E.164 y consentimiento de grabación y llamada.', new: 'Reconocimiento del llamante y lista de no llamar.' },
  { component: 'Asistentes IA', today: 'Asistente por canal con instrucciones y flujo n8n asignado; la IA corre en n8n.', organization: 'Chatbot + ChatbotWorkflows (catálogo en código) + AgentToken.', entities: 'Chatbot, AgentToken, KnowledgeDocument', reuse: 'Instrucciones, base de conocimiento y herramientas pueden ser compartidas con el agente de voz.', adapt: 'Instrucciones más breves y turnos hablados; manejo de interrupciones.', new: 'Elección de voz, ritmo y latencia objetivo.' },
  { component: 'Configuración de agentes', today: 'Instrucciones, herramientas expuestas y token por asistente; apariencia por canal.', organization: 'ChatbotInstructions, rutas /api/agent/*, ChannelAppearance.', entities: 'Chatbot, ChatbotChannel, AgentToolCall', reuse: 'La API de herramientas (reservas, pedidos, recordatorios) sirve igual para voz.', adapt: 'Herramientas con respuestas cortas aptas para leerse en voz alta.', new: 'Parámetros de síntesis y reconocimiento de voz.' },
  { component: 'Conversaciones', today: 'Estados IA / pendiente / en atención / resuelta, con contexto compartido.', organization: 'Conversation + Message; ConversationControl y ConversationInbox.', entities: 'Conversation, Message, MessageAttachment', reuse: 'Una llamada puede ser una conversación con canal «voz».', adapt: 'Mensajes como segmentos de transcripción con marcas de tiempo.', new: 'Sesión de voz con inicio, fin, duración y causa de cierre.' },
  { component: 'Historial', today: 'Mensajes y actividad técnica por conversación, con purga de la actividad técnica.', organization: 'ConversationActivity, AgentToolTrace, purga programada.', entities: 'Message, AgentToolCall, ApiCallLog', reuse: 'La misma vista de historial por cliente.', adapt: 'Retención y privacidad de transcripciones y grabaciones.', new: 'Almacenamiento y reproducción de audio.' },
  { component: 'Asignación humana', today: 'Traspaso a humano y asignación a un agente; estado «pendiente de agente».', organization: 'ConversationAgents y handoff por API de agente.', entities: 'Conversation (agent), alertas de conversación', reuse: 'La lógica de cola y asignación.', adapt: 'La transferencia debe ocurrir en vivo, con el contexto resumido.', new: 'Transferencia de llamada (caliente/fría) y cola telefónica.' },
  { component: 'Agenda', today: 'Disponibilidad calculada, citas con estados, reserva web, herramientas del asistente.', organization: 'Appointment, Service, Professional, ScheduleRule.', entities: 'Appointment, Service, Professional, Location', reuse: 'Las mismas herramientas de agenda desde una llamada.', adapt: 'Confirmación hablada de fecha y hora, desambiguación.', new: 'Recordatorio o confirmación por llamada saliente.' },
  { component: 'Integraciones', today: 'Tipos de integración por Workspace (canales, n8n, Booker, pasarelas) con secretos cifrados.', organization: 'IntegrationRegistry y una clase por tipo.', entities: 'Integration', reuse: 'Un nuevo tipo «telefonía» encaja en el registro.', adapt: 'Webhooks de eventos de llamada firmados.', new: 'Proveedor de telefonía/SIP y gestión de números.' },
  { component: 'Automatizaciones', today: 'Recordatorios, encuestas automáticas y flujos n8n.', organization: 'Reminder/ReminderRule, SurveyAutomation, cola de trabajos.', entities: 'Reminder, SurveyDispatch', reuse: 'Reglas y motor de recordatorios y encuestas.', adapt: 'Ventanas horarias y reintentos propios de llamadas salientes.', new: 'Campañas de llamadas salientes y marcador.' },
  { component: 'Reportes', today: 'Indicadores operativos, economía y encuestas.', organization: 'DashboardMetrics, OperationsMetrics, EconomicMetrics.', entities: 'Survey, SurveyResponse', reuse: 'Encuestas y reportes de satisfacción.', adapt: 'Medidas por canal incluyendo voz.', new: 'Métricas de voz: duración, abandono, contención de la IA, tiempo en cola.' },
  { component: 'Auditoría', today: 'Cambios administrativos y eventos automáticos, sin valores secretos.', organization: 'AuditLogger y config/audit.php.', entities: 'AuditLog', reuse: 'El mismo registro de auditoría.', adapt: 'Registrar accesos a grabaciones y transcripciones.', new: 'Eventos de seguridad propios de telefonía.' },
  { component: 'Seguridad', today: 'Tokens por asistente, contrato firmado hacia n8n, límites de tasa y tamaño, protección SSRF, consentimiento.', organization: 'Middlewares api.protect, throttle.safe, body.limit; SafeHttpTarget.', entities: 'AgentToken, WebhookEndpoint', reuse: 'Autenticación por token y firmas de webhook.', adapt: 'Protección frente a fraude telefónico y suplantación.', new: 'Cumplimiento de grabación de llamadas y cifrado de audio.' },
];

export const VOICE_PROPOSALS = [
  { title: 'Llamadas entrantes y salientes', text: 'Una llamada es una sesión asociada a un número del Workspace y a un cliente.' },
  { title: 'Sesiones de voz', text: 'Entidad nueva: inicio, fin, estado, causa de cierre y vínculo opcional con una conversación.' },
  { title: 'Transcripción', text: 'Segmentos con marcas de tiempo guardados como mensajes de la conversación.' },
  { title: 'Agentes de voz', text: 'Mismo contrato de herramientas que el asistente de chat, con instrucciones y voz propias.' },
  { title: 'Transferencia a operadores', text: 'Reutiliza la cola y la asignación humana; añade transferencia en vivo con resumen.' },
  { title: 'Historial de llamadas', text: 'Línea de tiempo del cliente que mezcla chats y llamadas.' },
  { title: 'Eventos', text: 'Webhooks firmados del proveedor (timbrando, contestada, finalizada) → eventos internos idempotentes.' },
  { title: 'Integraciones de telefonía', text: 'Nuevo tipo de integración en el registro, con credenciales cifradas de solo escritura.' },
  { title: 'Métricas de voz', text: 'Duración, abandono, contención de la IA, tiempo en cola, satisfacción.' },
];
