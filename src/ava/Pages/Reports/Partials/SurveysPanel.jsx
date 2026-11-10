import { ClipboardList, Hourglass, Percent, Send, Smile, Star } from 'lucide-react';
import Alert from '@/Components/Alert';
import Card from '@/Components/Card';
import ChartCard from '@/Components/Charts/ChartCard';
import ChartEmpty from '@/Components/Charts/ChartEmpty';
import DonutChart from '@/Components/Charts/DonutChart';
import RankingList from '@/Components/Charts/RankingList';
import TimeChart from '@/Components/Charts/TimeChart';
import MetricCard from '@/Components/MetricCard';
import SurveyManager from './SurveyManager';

const pct = (value) => (value === null || value === undefined ? null : `${value}%`);

function Ranking({ title, description, items, loading }) {
    return (
        <ChartCard title={title} description={description} loading={loading} height={200}>
            {items.length === 0 ? <ChartEmpty type="ranking" title="Sin datos en este periodo" description="Aparece cuando las respuestas están ligadas a este dato." height={200} /> : <RankingList items={items} formatValue={(value) => `${value}`} />}
        </ChartCard>
    );
}

/**
 * Reportes > Encuestas: persisted dispatches and responses (native WhatsApp / link, or reported by an engine such as n8n). Every figure is computed from stored rows; an indicator that has no data
 * says so ("—") instead of showing a zero. Response rate = dispatches answered / dispatches sent. Satisfaction = scored responses in the top 20% of their scale.
 */
export default function SurveysPanel({ section, loading, onRetry, admin = null, canOpenConversations = false }) {
    if (!section) return null;

    if (section.error) {
        return (
            <Alert tone="warning">
                {section.error}{' '}
                <button type="button" onClick={onRetry} className="font-semibold underline underline-offset-2">Reintentar</button>
            </Alert>
        );
    }

    const data = section.data;
    const empty = data.sent === 0 && data.responses === 0;
    const scaleHint = data.scale ? `Escala ${data.scale.min} a ${data.scale.max}` : 'Varias escalas: ver por encuesta';

    return (
        <section aria-label="Encuestas" className="space-y-6">
            {empty && (
                <Alert tone="info">Todavía no hay encuestas registradas en este periodo. Cuando envíes una encuesta desde Ava o un flujo (n8n, Lava Studio) la reporte, aparecerán aquí; no se muestran cifras inventadas.</Alert>
            )}

            {admin && <SurveyManager admin={admin} canOpenConversations={canOpenConversations} />}

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                <MetricCard label="Encuestas enviadas" hint="Envíos del periodo" value={data.sent} icon={Send} tone="blue" />
                <MetricCard label="Respuestas" hint={data.incomplete > 0 ? `${data.incomplete} incompletas` : 'Recibidas en el periodo'} value={data.responses} icon={ClipboardList} tone="amber" delay={60} />
                <MetricCard label="Tasa de respuesta" hint="Envíos con respuesta / enviados" value={data.responseRate} formatValue={pct} icon={Percent} tone="violet" delay={120} />
                <MetricCard label="Calificación promedio" hint={scaleHint} value={data.average} icon={Star} tone="green" delay={180} />
                <MetricCard label="Satisfacción" hint="Respuestas en el 20 % superior de la escala" value={data.satisfaction} formatValue={pct} icon={Smile} tone="green" delay={240} />
                <MetricCard label="Pendientes" hint="Enviadas, aún dentro de su vigencia" value={data.pending} icon={Hourglass} tone="blue" delay={300} />
                <MetricCard label="Vencidas" hint="Sin respuesta y fuera de vigencia" value={data.expired} icon={Hourglass} tone="amber" delay={360} />
                {data.nps && <MetricCard label="NPS" hint={`${data.nps.responses} resp. · ${data.nps.promoters} promotores · ${data.nps.detractors} detractores`} value={data.nps.score} icon={Smile} tone="violet" delay={420} />}
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                <ChartCard title="Respuestas en el tiempo" description="Encuestas contestadas por periodo." loading={loading} height={260}>
                    {data.evolution.length === 0 ? <ChartEmpty type="line" title="Sin respuestas" description="Aún no hay respuestas en este periodo." height={260} /> : <TimeChart points={data.evolution} ariaLabel="Respuestas de encuestas por periodo" />}
                </ChartCard>
                <ChartCard title="Distribución de calificaciones" description="Cuántas respuestas tuvo cada calificación." loading={loading} height={260}>
                    {data.distribution.length === 0 ? <ChartEmpty type="donut" title="Sin calificaciones comparables" description="Necesita respuestas con calificación en una misma escala." height={260} /> : <DonutChart items={data.distribution.map((item) => ({ ...item, tone: 'blue' }))} totalLabel="Respuestas" ariaLabel="Distribución de calificaciones" />}
                </ChartCard>
                <ChartCard title="Tendencia de la calificación" description="Promedio por periodo (solo cuando todas las encuestas usan la misma escala)." loading={loading} height={260}>
                    {data.trend.length === 0 ? <ChartEmpty type="line" title="Sin tendencia" description="Necesita respuestas con calificación en una misma escala." height={260} /> : <TimeChart points={data.trend} ariaLabel="Calificación promedio por periodo" />}
                </ChartCard>
                <Ranking title="Por origen" description="Conversación, cita, pedido o envío manual." items={data.byOrigin} loading={loading} />
                <Ranking title="Por canal de respuesta" description="WhatsApp, enlace o motor externo." items={data.bySource} loading={loading} />
                <Ranking title="Por sede" description="Respuestas recibidas por sede." items={data.byLocation} loading={loading} />
                <Ranking title="Por servicio" description="Según la reserva asociada." items={data.byService} loading={loading} />
                <Ranking title="Por profesional" description="Según la reserva asociada." items={data.byProfessional} loading={loading} />
                <ChartCard title="Por encuesta" description="Promedio y satisfacción de cada encuesta, en su propia escala." loading={loading} height={200}>
                    {data.bySurvey.length === 0 ? (
                        <ChartEmpty type="ranking" title="Sin datos" description="Aún no hay respuestas con calificación." height={200} />
                    ) : (
                        <ul className="divide-y divide-line text-sm">
                            {data.bySurvey.map((survey) => (
                                <li key={survey.name} className="flex flex-wrap items-center justify-between gap-2 py-2">
                                    <span className="font-semibold text-ink">{survey.name}</span>
                                    <span className="text-ink-muted">{survey.responses} resp. · promedio {survey.average}/{survey.scaleMax} · satisfacción {pct(survey.satisfaction)}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </ChartCard>
            </div>

            {data.skipped > 0 && <Alert tone="info">{data.skipped} invitación(es) automática(s) se omitieron en este periodo (sin contacto de WhatsApp, cliente que pidió no recibir mensajes, repetida o encuesta desactivada). Su motivo está en «Últimas invitaciones».</Alert>}

            {(data.events.ambiguous > 0 || data.events.invalid > 0 || data.events.duplicate > 0) && (
                <Alert tone="info">
                    Intentos que no cuentan como calificación en este periodo: {data.events.ambiguous} ambiguos (varias encuestas abiertas), {data.events.invalid} inválidos (fuera de la escala) y {data.events.duplicate} repetidos (la primera respuesta válida se conserva). Se guardan en el historial del envío.
                </Alert>
            )}

            <Card className="p-5">
                <h3 className="text-base font-bold text-ink">Respuestas ligadas a conversaciones</h3>
                <p className="mt-1 text-xs text-ink-muted">{data.linkedToConversation} de {data.responses} respuestas del periodo tienen conversación.</p>
                {data.recent.length === 0 ? (
                    <p className="mt-2 text-sm text-ink-muted">No hay respuestas en este periodo.</p>
                ) : (
                    <ul className="mt-3 divide-y divide-line text-sm">
                        {data.recent.map((item, index) => (
                            <li key={index} className="flex flex-wrap items-center justify-between gap-2 py-2">
                                <span className="text-ink">{item.survey}: <strong>{item.rating}</strong>/{item.scaleMax} <span className="text-ink-muted">· {item.source === 'whatsapp' ? 'WhatsApp' : item.source === 'link' ? 'Enlace' : 'Motor externo'} · {new Date(item.at).toLocaleString()}</span></span>
                                {canOpenConversations && item.conversationId && <a className="text-xs font-semibold text-primary underline" href={`${route('conversations.index')}?c=${item.conversationId}`}>Ver conversación</a>}
                            </li>
                        ))}
                    </ul>
                )}
            </Card>

            <Card className="p-5">
                <h3 className="text-base font-bold text-ink">Comentarios recibidos</h3>
                {data.comments.length === 0 ? (
                    <p className="mt-2 text-sm text-ink-muted">No hay comentarios en este periodo.</p>
                ) : (
                    <ul className="mt-3 divide-y divide-line">
                        {data.comments.map((item, index) => (
                            <li key={index} className="py-2 text-sm">
                                <p className="text-ink">{item.comment}</p>
                                <p className="text-xs text-ink-muted">{item.rating !== null ? `Calificación ${item.rating} · ` : ''}{new Date(item.at).toLocaleString()}</p>
                            </li>
                        ))}
                    </ul>
                )}
            </Card>
        </section>
    );
}
