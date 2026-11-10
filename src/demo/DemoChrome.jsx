import { router, usePage } from '@inertiajs/react';
import { BookOpen, ChevronLeft, ChevronRight, FlaskConical, Phone, PlayCircle, RotateCcw, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { mock } from '../mock/server';
import { TOUR } from './tour';

const KEY = 'ava-showcase-tour';
const read = () => { try { return JSON.parse(window.localStorage.getItem(KEY) ?? 'null'); } catch { return null; } };
const write = (v) => { try { window.localStorage.setItem(KEY, JSON.stringify(v)); } catch { /* storage blocked */ } };

/**
 * The only thing the showcase adds on top of AVA's own screens: a small floating control (bottom left) and, while the guided tour runs, a small card.
 * It never touches AVA's layout. «Restaurar datos» puts the fictional data back to its initial state.
 */
export default function DemoChrome() {
    usePage();
    const [open, setOpen] = useState(false);
    const [step, setStep] = useState(() => read()?.step ?? null);
    const [confirming, setConfirming] = useState(false);

    useEffect(() => { write(step === null ? null : { step }); }, [step]);

    const go = (i) => {
        setStep(i);
        router.get(TOUR[i].where);
    };
    const start = () => { setOpen(false); go(0); };
    const close = () => setStep(null);
    const restore = () => { mock.reset(); setConfirming(false); setOpen(false); router.get('/dashboard'); };

    const current = step !== null ? TOUR[step] : null;

    return (
        <>
            <div className="fixed bottom-4 left-4 z-[55] md:left-[17rem] print:hidden" data-demo-chrome>
                {open && (
                    <div role="dialog" aria-label="Controles de la demostración" className="mb-2 w-72 max-w-[calc(100vw-2rem)] rounded-card border border-line bg-card p-4 text-sm text-ink shadow-2xl">
                        <div className="flex items-start justify-between gap-2">
                            <p className="font-bold">Demostración de AVA Chat</p>
                            <button type="button" aria-label="Cerrar" onClick={() => setOpen(false)} className="text-ink-muted hover:text-ink"><X className="size-4" /></button>
                        </div>
                        <p className="mt-1 text-xs text-ink-muted">Datos ficticios. No está conectada a servicios productivos y no es una implementación de AVA Voz.</p>
                        <div className="mt-3 space-y-1.5">
                            <button type="button" onClick={start} className="flex w-full items-center gap-2 rounded-lg bg-primary px-3 py-2 text-left text-xs font-semibold text-white hover:bg-primary-strong"><PlayCircle className="size-4" /> {step === null ? 'Iniciar recorrido guiado' : 'Reiniciar recorrido'}</button>
                            <button type="button" onClick={() => { setOpen(false); router.get('/demo/ava-voz'); }} className="flex w-full items-center gap-2 rounded-lg border border-line px-3 py-2 text-left text-xs font-semibold hover:bg-canvas"><Phone className="size-4" /> AVA Chat → AVA Voz</button>
                            <button type="button" onClick={() => { setOpen(false); router.get('/demo/escenarios'); }} className="flex w-full items-center gap-2 rounded-lg border border-line px-3 py-2 text-left text-xs font-semibold hover:bg-canvas"><PlayCircle className="size-4" /> Escenarios simulados</button>
                            <button type="button" onClick={() => { setOpen(false); router.get('/demo/documentacion'); }} className="flex w-full items-center gap-2 rounded-lg border border-line px-3 py-2 text-left text-xs font-semibold hover:bg-canvas"><BookOpen className="size-4" /> Documentación</button>
                            {confirming ? (
                                <div className="rounded-lg border border-danger/40 bg-danger/5 p-2 text-xs">
                                    <p>Se borrará lo que hayas creado o cambiado y volverán los datos iniciales.</p>
                                    <div className="mt-2 flex gap-2"><button type="button" onClick={restore} className="rounded-md bg-danger px-2.5 py-1 font-semibold text-white">Restaurar</button><button type="button" onClick={() => setConfirming(false)} className="rounded-md border border-line px-2.5 py-1 font-semibold">Cancelar</button></div>
                                </div>
                            ) : (
                                <button type="button" onClick={() => setConfirming(true)} className="flex w-full items-center gap-2 rounded-lg border border-line px-3 py-2 text-left text-xs font-semibold hover:bg-canvas"><RotateCcw className="size-4" /> Restaurar datos iniciales</button>
                            )}
                        </div>
                    </div>
                )}
                <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="inline-flex items-center gap-2 rounded-full border border-line bg-card px-3.5 py-2 text-xs font-bold text-ink shadow-card hover:shadow-card-hover">
                    <FlaskConical className="size-4 text-accent-violet" aria-hidden="true" /> Demo
                </button>
            </div>

            {current && (
                <aside role="complementary" aria-label="Recorrido guiado" className="fixed right-4 bottom-4 z-[56] w-80 max-w-[calc(100vw-2rem)] rounded-card border border-primary/40 bg-card p-4 text-sm text-ink shadow-2xl print:hidden">
                    <div className="flex items-start justify-between gap-2">
                        <p className="text-[11px] font-bold tracking-wider text-primary uppercase">Recorrido guiado · {step + 1} de {TOUR.length}{current.voice ? ' · propuesta' : ''}</p>
                        <button type="button" aria-label="Cerrar el recorrido" onClick={close} className="text-ink-muted hover:text-ink"><X className="size-4" /></button>
                    </div>
                    <h2 className="mt-1 text-base font-bold">{current.title}</h2>
                    <p className="mt-1 text-sm text-ink-muted">{current.text}</p>
                    <div className="mt-3 flex items-center justify-between gap-2">
                        <button type="button" onClick={() => go(0)} className="text-xs font-semibold text-ink-muted underline">Reiniciar</button>
                        <div className="flex gap-2">
                            <button type="button" disabled={step === 0} onClick={() => go(step - 1)} className="inline-flex items-center gap-1 rounded-md border border-field px-2.5 py-1.5 text-xs font-semibold disabled:opacity-30"><ChevronLeft className="size-3.5" /> Anterior</button>
                            {step < TOUR.length - 1 ? (
                                <button type="button" onClick={() => go(step + 1)} className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1.5 text-xs font-semibold text-white">Siguiente <ChevronRight className="size-3.5" /></button>
                            ) : (
                                <button type="button" onClick={close} className="rounded-md bg-primary px-2.5 py-1.5 text-xs font-semibold text-white">Terminar</button>
                            )}
                        </div>
                    </div>
                </aside>
            )}
        </>
    );
}
