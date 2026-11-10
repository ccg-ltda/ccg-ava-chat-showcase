/**
 * Guided tour for people who do not know AVA Platform. Each step opens a real screen of the showcase and explains it in plain words.
 * `where` is the URL the step navigates to; steps marked `voice` are conceptual (AVA Voz proposal), never an existing function.
 */
export const TOUR = [
    { where: '/dashboard', title: 'Dashboard', text: 'Es la pantalla de inicio de un negocio: cuántas conversaciones llegaron, cuántas atendió la IA, qué necesita atención y el estado de las conexiones. Todas las cifras de esta demostración son ficticias.' },
    { where: '/conversations?c=1', title: 'Conversaciones: la IA atiende', text: 'Aquí llegan los mensajes de todos los canales. Esta conversación de WhatsApp la atiende la IA. Abre «Simulación DEMO» sobre los mensajes y escribe «quiero una cita» para ver cómo responde y crea una cita.' },
    { where: '/conversations?c=2', title: 'Atención humana', text: 'Cuando la IA no puede resolver algo (aquí, una factura), la conversación queda «Pendiente de agente». Pulsa «Tomar conversación»: la IA deja de responder y tú contestas como agente. Luego puedes devolverla a la IA o resolverla.' },
    { where: '/chatbots/1', title: 'Chatbots y asistentes', text: 'Cada asistente tiene sus instrucciones, sus canales, su apariencia y una base de conocimiento. En la pestaña de canales y apariencia ves cómo se vería el widget en una página web. Las respuestas inteligentes las produce un flujo externo (n8n); AVA lo controla.' },
    { where: '/bookings', title: 'Agenda: una reserva simulada', text: 'El calendario muestra las citas de los profesionales. Pulsa «Nueva cita», elige servicio y horario libre: la cita aparece en el calendario y en el historial del cliente. La cita que pidió Valeria por WhatsApp está «Solicitada».' },
    { where: '/customers/1', title: 'Clientes', text: 'La ficha reúne a la persona con sus conversaciones y sus citas. Un mismo cliente puede escribir por WhatsApp, reservar en la web y comprar; todo queda en una sola ficha.' },
    { where: '/reports', title: 'Reportes', text: 'Los reportes combinan conversaciones, reservas, pedidos, economía y encuestas. Cuando resuelves una conversación se envía una encuesta (simulada) y su respuesta aparece en la pestaña «Encuestas».' },
    { where: '/integrations', title: 'Integraciones', text: 'Cada negocio conecta sus propios canales y servicios. Aquí ninguno está conectado de verdad: las pruebas son simuladas y las pasarelas de pago no procesan nada. CardNET está pendiente de documentación oficial.' },
    { where: '/demo/ava-voz', title: 'AVA Chat → AVA Voz', text: 'Para quien desarrolla AVA Voz: compara 17 componentes de AVA Chat y propone qué se reutilizaría, qué se adaptaría y qué sería nuevo. Todo lo violeta es una propuesta, no una función existente.', voice: true },
    { where: '/demo/escenarios?s=voz-llamada', title: 'Escenario conceptual de voz', text: 'Llamada entrante, identificación del cliente, agente IA, consulta de información, cita, transferencia humana, registro y métricas. Es una ilustración conceptual y simulada.', voice: true },
];
