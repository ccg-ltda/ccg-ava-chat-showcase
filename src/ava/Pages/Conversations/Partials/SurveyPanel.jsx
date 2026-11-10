import axios from 'axios';
import { RotateCw, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Badge from '@/Components/Badge';

const STATUS = {
    pending: ['Pendiente', 'neutral'], sending: ['Enviando', 'neutral'], sent: ['Enviada', 'blue'], started: ['En curso', 'blue'], answered: ['Respondida', 'green'],
    failed: ['Fallida', 'red'], uncertain: ['Sin confirmar', 'amber'], revoked: ['Revocada', 'neutral'], skipped: ['Omitida', 'neutral'],
};
const MODE = { whatsapp: 'WhatsApp', link: 'Enlace único' };

/** The score on its scale, e.g. «4 de 5». Nothing is shown for an invitation nobody answered. */
export function ratingLabel(survey) {
    if (survey.rating === null) return null;
    const value = Number.isInteger(survey.rating) ? survey.rating : survey.rating.toFixed(1);

    return survey.scaleMax !== null ? `${value} de ${survey.scaleMax}` : String(value);
}

function Fact({ label, children }) {
    if (children === null || children === undefined || children === '') return null;

    return (
        <div className="flex justify-between gap-3">
            <dt className="shrink-0 text-ink-muted">{label}</dt>
            <dd className="min-w-0 text-right text-ink">{children}</dd>
        </div>
    );
}

function SurveyItem({ survey }) {
    const [label, tone] = STATUS[survey.status] ?? [survey.status, 'neutral'];
    const rating = ratingLabel(survey);

    return (
        <li className="space-y-2 rounded-lg border border-line p-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="min-w-0 font-semibold break-words text-ink">{survey.survey ?? 'Encuesta'}</span>
                <Badge tone={tone}>{label}</Badge>
            </div>
            {rating && <p className="text-2xl font-bold text-ink" aria-label={`Calificación ${rating}`}>{rating}</p>}
            <dl className="space-y-1">
                <Fact label="Enviada">{survey.sentAt}</Fact>
                <Fact label="Respondida">{survey.answeredAt}</Fact>
                <Fact label="Escala">{survey.scaleMin !== null && survey.scaleMax !== null ? `${survey.scaleMin} a ${survey.scaleMax}` : null}</Fact>
                <Fact label="Modalidad">{MODE[survey.mode] ?? null}</Fact>
                <Fact label="Relacionada con">{survey.origin ? `${survey.origin} #${survey.originId}` : null}</Fact>
            </dl>
            {survey.comment && <p className="rounded-lg bg-canvas p-2 text-sm break-words text-ink">{survey.comment}</p>}
        </li>
    );
}

/** «Encuesta»: the surveys related to this conversation, loaded when the panel opens (nothing is copied into the conversation). */
export default function SurveyPanel({ conversationId, onClose }) {
    const [data, setData] = useState(null);
    const [failed, setFailed] = useState(false);

    const load = useCallback(() => {
        axios.get(route('conversations.survey', conversationId)).then((response) => { setFailed(false); setData(response.data); }).catch(() => setFailed(true));
    }, [conversationId]);

    useEffect(load, [load]);
    useEffect(() => {
        const close = (event) => event.key === 'Escape' && onClose();
        document.addEventListener('keydown', close);

        return () => document.removeEventListener('keydown', close);
    }, [onClose]);

    return createPortal(
        <aside role="complementary" aria-label="Encuesta de la conversación" className="fixed inset-y-0 right-0 z-[60] flex w-full flex-col border-l border-line bg-card shadow-2xl sm:w-[26rem]">
            <header className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
                <div className="min-w-0">
                    <h2 className="text-base font-bold text-ink">Encuesta</h2>
                    <p className="text-xs text-ink-muted">Encuestas enviadas desde o por esta conversación y su respuesta.</p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                    <button type="button" onClick={load} aria-label="Actualizar" className="grid size-9 place-items-center rounded-lg text-ink-muted hover:bg-canvas hover:text-ink focus-visible:outline-2 focus-visible:outline-primary">
                        <RotateCw className="size-4" aria-hidden="true" />
                    </button>
                    <button type="button" onClick={onClose} aria-label="Cerrar la encuesta" className="grid size-9 place-items-center rounded-lg text-ink-muted hover:bg-canvas hover:text-ink focus-visible:outline-2 focus-visible:outline-primary">
                        <X className="size-4" aria-hidden="true" />
                    </button>
                </div>
            </header>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
                {failed && <p role="alert" className="text-sm text-danger">No se pudo cargar la encuesta.</p>}
                {!failed && data === null && <p className="text-sm text-ink-muted">Cargando…</p>}
                {data && data.surveys.length === 0 && <p className="text-sm text-ink-muted">Esta conversación no tiene encuestas relacionadas.</p>}
                {data && data.surveys.length > 0 && <ul className="space-y-3">{data.surveys.map((survey) => <SurveyItem key={survey.id} survey={survey} />)}</ul>}
                {data?.truncated && <p className="text-xs text-ink-muted">Se muestran las encuestas más recientes.</p>}
            </div>
        </aside>,
        document.body,
    );
}
