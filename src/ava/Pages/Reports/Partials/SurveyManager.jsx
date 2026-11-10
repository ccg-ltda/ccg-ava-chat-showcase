import { router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import Alert from '@/Components/Alert';
import Badge from '@/Components/Badge';
import Card from '@/Components/Card';
import Checkbox from '@/Components/Checkbox';
import InputLabel from '@/Components/InputLabel';
import Modal from '@/Components/Modal';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import TextInput from '@/Components/TextInput';

const STATUS = {
    pending: ['Pendiente', 'neutral'], sending: ['Enviando', 'neutral'], sent: ['Enviada', 'blue'], started: ['En curso', 'blue'], answered: ['Respondida', 'green'],
    failed: ['Fallida', 'red'], uncertain: ['Sin confirmar', 'amber'], revoked: ['Revocada', 'neutral'], skipped: ['Omitida', 'neutral'],
};

const PARAM_LABEL = { customer_name: 'Nombre del cliente', business: 'Nombre del negocio', survey_name: 'Nombre de la encuesta', link: 'Enlace único' };

const ORIGIN = { conversation: 'Conversación', appointment: 'Cita', order: 'Pedido' };

const blank = { auto_send: false, trigger_event: '', send_delay_minutes: 0, cooldown_hours: 24, name: '', prompt: '', scale_min: 1, scale_max: 5, accept_whatsapp: true, accept_link: false, allow_comment: false, link_ttl_hours: 72, template_name: '', template_language: 'es', template_params: [], thanks_text: '' };

function SurveyForm({ survey, templateParams, triggers, onClose }) {
    const form = useForm(survey ? {
        name: survey.name, prompt: survey.prompt ?? '', scale_min: survey.scaleMin ?? 1, scale_max: survey.scaleMax ?? 5, accept_whatsapp: survey.acceptWhatsapp, accept_link: survey.acceptLink,
        allow_comment: survey.allowComment, link_ttl_hours: survey.linkTtlHours, template_name: survey.templateName ?? '', template_language: survey.templateLanguage ?? 'es',
        template_params: survey.templateParams, thanks_text: survey.thanksText ?? '',
        auto_send: survey.autoSend, trigger_event: survey.triggerEvent ?? '', send_delay_minutes: survey.sendDelayMinutes ?? 0, cooldown_hours: survey.cooldownHours ?? 24,
    } : blank);

    const toggleParam = (name) => form.setData('template_params', form.data.template_params.includes(name) ? form.data.template_params.filter((item) => item !== name) : [...form.data.template_params, name]);
    const submit = (event) => {
        event.preventDefault();
        const options = { preserveScroll: true, onSuccess: onClose };
        const clean = (data) => ({ ...data, template_name: data.template_name || null, template_language: data.template_name ? data.template_language : null, template_params: data.template_name ? data.template_params : null, thanks_text: data.thanks_text || null, prompt: data.prompt || null, trigger_event: data.auto_send ? data.trigger_event || null : null });
        form.transform(clean);
        survey ? form.put(route('surveys.admin.update', survey.id), options) : form.post(route('surveys.admin.store'), options);
    };

    return (
        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
            <h2 className="border-b border-line px-4 py-4 text-lg font-bold text-ink sm:px-6">{survey ? 'Editar encuesta' : 'Nueva encuesta'}</h2>
            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-5 sm:px-6">
            <fieldset className="space-y-4 rounded-lg border border-line p-4">
                <legend className="px-1 text-sm font-semibold text-ink">1. Pregunta y escala</legend>
            <div>
                <InputLabel htmlFor="s-name" value="Nombre" />
                <TextInput id="s-name" value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} className="mt-1 w-full" invalid={!!form.errors.name} />
                {form.errors.name && <p className="mt-1 text-sm text-danger">{form.errors.name}</p>}
            </div>
            <div>
                <InputLabel htmlFor="s-prompt" value="Pregunta que verá el cliente" />
                <textarea id="s-prompt" rows={2} maxLength={600} value={form.data.prompt} onChange={(e) => form.setData('prompt', e.target.value)} className="field mt-1 w-full" placeholder="¿Cómo calificas nuestro servicio del 1 al 5?" />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                    <InputLabel htmlFor="s-min" value="Escala: mínimo" />
                    <TextInput id="s-min" type="number" min={0} value={form.data.scale_min} onChange={(e) => form.setData('scale_min', e.target.value)} className="mt-1 w-full" />
                </div>
                <div>
                    <InputLabel htmlFor="s-max" value="Escala: máximo" />
                    <TextInput id="s-max" type="number" min={1} value={form.data.scale_max} onChange={(e) => form.setData('scale_max', e.target.value)} className="mt-1 w-full" invalid={!!form.errors.scale_max} />
                    {form.errors.scale_max && <p className="mt-1 text-sm text-danger">{form.errors.scale_max}</p>}
                </div>
            </div>
            </fieldset>
            <fieldset className="space-y-2 rounded-lg border border-line p-4">
                <legend className="px-1 text-sm font-semibold text-ink">2. Cómo puede responder el cliente</legend>
                <label className="flex items-center gap-2 text-sm text-ink"><Checkbox checked={form.data.accept_whatsapp} onChange={(e) => form.setData('accept_whatsapp', e.target.checked)} /> Escribiendo el número en WhatsApp</label>
                <label className="flex items-center gap-2 text-sm text-ink"><Checkbox checked={form.data.accept_link} onChange={(e) => form.setData('accept_link', e.target.checked)} /> Desde un enlace único de Ava</label>
                <label className="flex items-center gap-2 text-sm text-ink"><Checkbox checked={form.data.allow_comment} onChange={(e) => form.setData('allow_comment', e.target.checked)} /> Permitir un comentario (solo en el enlace)</label>
            </fieldset>
            <div>
                <InputLabel htmlFor="s-ttl" value="Vigencia de la invitación (horas)" />
                <TextInput id="s-ttl" type="number" min={1} max={720} value={form.data.link_ttl_hours} onChange={(e) => form.setData('link_ttl_hours', e.target.value)} className="mt-1 w-32" />
            </div>
            <fieldset className="space-y-3 rounded-lg border border-line p-4">
                <legend className="px-1 text-sm font-semibold text-ink">3. Envío automático</legend>
                <label className="flex items-center gap-2 text-sm text-ink"><Checkbox checked={form.data.auto_send} onChange={(e) => form.setData('auto_send', e.target.checked)} /> Enviar sola cuando ocurra un evento (si no, solo se envía a mano)</label>
                {form.data.auto_send && (
                    <>
                        <div>
                            <InputLabel htmlFor="s-trigger" value="Evento que la envía" />
                            <select id="s-trigger" value={form.data.trigger_event} onChange={(e) => form.setData('trigger_event', e.target.value)} className="field mt-1 w-full">
                                <option value="">Elige un evento</option>
                                {triggers.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                            </select>
                            {form.errors.trigger_event && <p className="mt-1 text-sm text-danger">{form.errors.trigger_event}</p>}
                        </div>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div>
                                <InputLabel htmlFor="s-delay" value="Demora (minutos)" />
                                <TextInput id="s-delay" type="number" min={0} max={10080} value={form.data.send_delay_minutes} onChange={(e) => form.setData('send_delay_minutes', e.target.value)} className="mt-1 w-full" />
                            </div>
                            <div>
                                <InputLabel htmlFor="s-cool" value="No repetir al mismo contacto (horas)" />
                                <TextInput id="s-cool" type="number" min={0} max={720} value={form.data.cooldown_hours} onChange={(e) => form.setData('cooldown_hours', e.target.value)} className="mt-1 w-full" />
                            </div>
                        </div>
                        <p className="text-xs text-ink-muted">Se envía por el WhatsApp del negocio al contacto de esa operación, ligada a su conversación. Nunca a quien pidió no recibir mensajes. Fuera de las 24 h de WhatsApp hace falta una plantilla aprobada.</p>
                    </>
                )}
            </fieldset>
            <fieldset className="space-y-3 rounded-lg border border-line p-4">
                <legend className="px-1 text-sm font-semibold text-ink">4. Plantilla de WhatsApp aprobada en Meta</legend>
                <p className="text-xs text-ink-muted">Ava no crea ni aprueba plantillas en Meta: escribe aquí el nombre y el idioma de una plantilla ya aprobada. Sin plantilla, solo se puede enviar la pregunta como texto a quien escribió en las últimas 24 h.</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="sm:col-span-2">
                        <InputLabel htmlFor="s-tpl" value="Nombre" />
                        <TextInput id="s-tpl" value={form.data.template_name} onChange={(e) => form.setData('template_name', e.target.value)} className="mt-1 w-full" placeholder="encuesta_ava" invalid={!!form.errors.template_name} />
                        {form.errors.template_name && <p className="mt-1 text-sm text-danger">{form.errors.template_name}</p>}
                    </div>
                    <div>
                        <InputLabel htmlFor="s-lang" value="Idioma" />
                        <TextInput id="s-lang" value={form.data.template_language} onChange={(e) => form.setData('template_language', e.target.value)} className="mt-1 w-full" />
                    </div>
                </div>
                <div>
                    <p className="text-sm font-medium text-ink">Variables, en el orden {'{{1}}'}, {'{{2}}'}…</p>
                    <div className="mt-1 flex flex-wrap gap-2">
                        {templateParams.map((name) => (
                            <button key={name} type="button" onClick={() => toggleParam(name)} aria-pressed={form.data.template_params.includes(name)} className={`rounded-full border px-3 py-1 text-xs font-semibold ${form.data.template_params.includes(name) ? 'border-primary bg-primary-soft text-primary' : 'border-field text-ink-muted'}`}>
                                {form.data.template_params.includes(name) ? `${form.data.template_params.indexOf(name) + 1}. ` : ''}{PARAM_LABEL[name]}
                            </button>
                        ))}
                    </div>
                </div>
            </fieldset>
            </div>
            <div className="flex justify-end gap-2 border-t border-line bg-card px-4 py-3 sm:px-6">
                <SecondaryButton type="button" onClick={onClose}>Cancelar</SecondaryButton>
                <PrimaryButton type="submit" disabled={form.processing}>Guardar</PrimaryButton>
            </div>
        </form>
    );
}

function InviteForm({ survey, onClose }) {
    const form = useForm({ contact_id: '', idempotency_key: crypto.randomUUID().replaceAll('-', '') });
    const submit = (event) => {
        event.preventDefault();
        form.post(route('surveys.admin.invite', survey.id), { preserveScroll: true, onSuccess: onClose });
    };

    return (
        <form onSubmit={submit} className="space-y-4 p-6">
            <h2 className="text-lg font-bold text-ink">Enviar «{survey.name}»</h2>
            <div>
                <InputLabel htmlFor="i-contact" value="Número de WhatsApp del cliente (con indicativo)" />
                <TextInput id="i-contact" inputMode="tel" value={form.data.contact_id} onChange={(e) => form.setData('contact_id', e.target.value)} className="mt-1 w-full" placeholder="573001112233" invalid={!!form.errors.contact_id} />
                {form.errors.contact_id && <p className="mt-1 text-sm text-danger">{form.errors.contact_id}</p>}
                {form.errors.integration && <p className="mt-1 text-sm text-danger">{form.errors.integration}</p>}
                {form.errors.survey && <p className="mt-1 text-sm text-danger">{form.errors.survey}</p>}
            </div>
            <p className="text-xs text-ink-muted">Se vincula al cliente y a la conversación de este número, si existen. Al enviar de nuevo con la misma pantalla abierta no se duplica la invitación.</p>
            <div className="flex justify-end gap-2">
                <SecondaryButton type="button" onClick={onClose}>Cancelar</SecondaryButton>
                <PrimaryButton type="submit" disabled={form.processing || form.data.contact_id === ''}>Enviar</PrimaryButton>
            </div>
        </form>
    );
}

/** Staff side of the native surveys: define them, send an invitation, revoke or retry. Every action is a server route inside the active Workspace. */
export default function SurveyManager({ admin, canOpenConversations }) {
    const [editing, setEditing] = useState(null); // 'new' | survey
    const [inviting, setInviting] = useState(null);
    const [problem, setProblem] = useState(null);
    const send = (name, id, data = {}) => router.post(route(name, id), data, { preserveScroll: true, onStart: () => setProblem(null), onError: (errors) => setProblem(Object.values(errors)[0] ?? 'No se pudo completar la acción.') });
    const post = (name, id) => send(name, id);

    return (
        <Card className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-base font-bold text-ink">Encuestas de Ava</h3>
                <PrimaryButton type="button" onClick={() => setEditing('new')}>Nueva encuesta</PrimaryButton>
            </div>
            {problem && <Alert tone="danger" className="mt-3">{problem}</Alert>}
            {!admin.whatsapp && <Alert tone="warning" className="mt-3">Para enviar invitaciones, el Workspace necesita exactamente una conexión de WhatsApp activa en Integraciones.</Alert>}

            {admin.surveys.filter((survey) => survey.native).length === 0 ? (
                <p className="mt-3 text-sm text-ink-muted">Todavía no hay encuestas con escala. Crea una para invitar a tus clientes desde Ava; las que reporta n8n siguen apareciendo en los resultados.</p>
            ) : (
                <ul className="mt-3 divide-y divide-line">
                    {admin.surveys.filter((survey) => survey.native).map((survey) => (
                        <li key={survey.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                            <span><span className="font-semibold text-ink">{survey.name}</span> <span className="text-ink-muted">· {survey.scaleMin}–{survey.scaleMax} · {[survey.acceptWhatsapp && 'WhatsApp', survey.acceptLink && 'enlace'].filter(Boolean).join(' + ') || 'sin respuesta habilitada'}{survey.autoSend ? ' · automática' : ''}</span></span>
                            <span className="flex gap-2">
                                <SecondaryButton type="button" onClick={() => setEditing(survey)}>Editar</SecondaryButton>
                                <PrimaryButton type="button" disabled={!admin.whatsapp || survey.status !== 'active'} onClick={() => setInviting(survey)}>Enviar</PrimaryButton>
                            </span>
                        </li>
                    ))}
                </ul>
            )}

            <h4 className="mt-5 text-sm font-bold text-ink">Últimas invitaciones</h4>
            {admin.dispatches.length === 0 ? <p className="mt-1 text-sm text-ink-muted">Aún no se ha enviado ninguna.</p> : (
                <ul className="mt-2 divide-y divide-line text-sm">
                    {admin.dispatches.map((item) => {
                        const [label, tone] = item.expired ? ['Vencida', 'amber'] : STATUS[item.status] ?? [item.status, 'neutral'];

                        return (
                            <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                                <span className="text-ink">{item.survey} <span className="text-ink-muted">· {item.contact ?? 'sin contacto'}{item.origin ? ` · ${ORIGIN[item.origin] ?? item.origin}` : ''} · {item.scheduledFor ? `programada ${new Date(item.scheduledFor).toLocaleString()}` : item.sentAt ? new Date(item.sentAt).toLocaleString() : ''}</span></span>
                                <span className="flex items-center gap-2">
                                    <Badge tone={tone} title={item.failureReason ?? undefined}>{label}</Badge>
                                    {canOpenConversations && item.conversationId && <a className="text-xs font-semibold text-primary underline" href={`${route('conversations.index')}?c=${item.conversationId}`}>Conversación</a>}
                                    {item.canRetry && <button type="button" className="text-xs font-semibold text-primary underline" onClick={() => post('surveys.admin.retry', item.id)}>Reintentar</button>}
                                    {item.canRevoke && <button type="button" className="text-xs font-semibold text-danger underline" onClick={() => post('surveys.admin.revoke', item.id)}>Revocar</button>}
                                </span>
                                {item.failureReason && ['skipped', 'failed', 'uncertain'].includes(item.status) && <span className="w-full text-xs text-ink-muted">{item.failureReason}</span>}
                            </li>
                        );
                    })}
                </ul>
            )}

            {admin.review.length > 0 && (
                <div className="mt-5 rounded-lg border border-accent-amber/40 p-4">
                    <h4 className="text-sm font-bold text-ink">Respuestas por WhatsApp sin asignar</h4>
                    <p className="mt-1 text-xs text-ink-muted">El cliente escribió un número mientras tenía varias encuestas abiertas. Elige a cuál corresponde o descártala; no cuenta como calificación hasta que la asignes.</p>
                    <ul className="mt-2 divide-y divide-line text-sm">
                        {admin.review.map((item) => (
                            <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                                <span className="text-ink">Respondió <strong>{item.attempted}</strong> <span className="text-ink-muted">· {new Date(item.at).toLocaleString()}</span></span>
                                <span className="flex flex-wrap items-center gap-2">
                                    {item.candidates.map((candidate) => (
                                        <button key={candidate.id} type="button" disabled={!candidate.answerable} className="rounded-full border border-field px-3 py-1 text-xs font-semibold text-primary disabled:opacity-50" onClick={() => send('surveys.admin.events.assign', item.id, { dispatch_id: candidate.id })}>
                                            Asignar a {candidate.survey}
                                        </button>
                                    ))}
                                    {canOpenConversations && item.conversationId && <a className="text-xs font-semibold text-primary underline" href={`${route('conversations.index')}?c=${item.conversationId}`}>Conversación</a>}
                                    <button type="button" className="text-xs font-semibold text-danger underline" onClick={() => post('surveys.admin.events.dismiss', item.id)}>Descartar</button>
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <Modal show={editing !== null} onClose={() => setEditing(null)} maxWidth="4xl" scrollable>
                {editing !== null && <SurveyForm survey={editing === 'new' ? null : editing} templateParams={admin.templateParams} triggers={admin.triggers} onClose={() => setEditing(null)} />}
            </Modal>
            <Modal show={inviting !== null} onClose={() => setInviting(null)} maxWidth="md">
                {inviting && <InviteForm survey={inviting} onClose={() => setInviting(null)} />}
            </Modal>
        </Card>
    );
}
