import { reg } from '../server';
import { SCENARIOS } from '../../demo/scenario';

/** Screens of the showcase itself: they render inside AVA's own shell with AVA's own components. */
reg.get('demo.voice', () => ({ component: 'Demo/Voice', props: {} }));
reg.get('demo.docs.index', () => ({ redirect: '/demo/documentacion/introduccion' }));
reg.get('demo.docs', ({ params }) => ({ component: 'Demo/Docs', props: { section: params.section } }));
reg.get('demo.scenarios', ({ query }) => ({ component: 'Demo/Scenarios', props: { scenario: query.s ?? SCENARIOS[0].id } }));
