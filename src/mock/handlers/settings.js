import { reg } from '../server';
import cfg from '../workspaceConfig.json';
import { audit } from './conversations';

const options = (obj) => Object.entries(obj).map(([value, label]) => ({ value, label }));

const catalog = () => ({
    currencies: Object.entries(cfg.currencies).map(([value, label]) => ({ value, label: `${value} — ${label}` })),
    timezones: options(cfg.timezones),
    dateFormats: Object.entries(cfg.date_formats).map(([value, f]) => ({ value, label: f.label, php: f.php })),
    timeFormats: Object.entries(cfg.time_formats).map(([value, f]) => ({ value, label: f.label, php: f.php })),
    appearances: options(cfg.appearances),
    palette: cfg.palette,
    taxCountries: Object.entries(cfg.tax_countries).map(([code, c]) => ({ code, ...c })),
});

const form = (db) => {
    const s = db.workspace.settings;
    return { name: db.workspace.name, description: db.workspace.description ?? '', currency: s.currency, timezone: s.timezone, date_format: s.dateFormat, time_format: s.timeFormat, primary_color: s.primaryColor, appearance: s.appearance, tax_country: s.tax.country, tax_enabled: s.tax.enabled, tax_name: s.tax.name, tax_rate: s.tax.rate, logo_url: null };
};

reg.get('settings.index', ({ db }) => ({
    component: 'Settings/Index',
    props: { settings: form(db), catalog: catalog(), canEdit: true, emailTemplate: null, wompi: null, autoClose: { configured: Boolean(db.autoClose), enabled: db.autoClose?.enabled ?? false, minutes: db.autoClose?.minutes ?? 1440, min: 1, max: 1440, default: 1440 }, activityPrivacy: null },
}));

reg.mut('settings.update', ({ db, data }) => {
    const errors = {};
    if (!String(data.name ?? '').trim()) errors.name = 'El nombre es obligatorio.';
    if (!/^#[0-9a-fA-F]{6}$/.test(String(data.primary_color ?? ''))) errors.primary_color = 'Elige un color válido.';
    if (!cfg.currencies[data.currency]) errors.currency = 'Elige una moneda.';
    if (Object.keys(errors).length) return { errors };
    db.workspace.name = data.name.trim();
    db.workspace.description = data.description || '';
    Object.assign(db.workspace.settings, {
        currency: data.currency, timezone: data.timezone, dateFormat: data.date_format, timeFormat: data.time_format, primaryColor: data.primary_color.toLowerCase(), appearance: data.appearance,
        tax: { country: data.tax_country, enabled: Boolean(data.tax_enabled), name: data.tax_name, rate: String(data.tax_rate ?? '0') },
    });
    audit(db, 'Cambió la configuración del Workspace');
    return { flash: { success: 'Configuración guardada correctamente' } };
});
reg.mut('settings.conversations', ({ db, data }) => { db.autoClose = { enabled: Boolean(data.enabled), minutes: Math.min(1440, Math.max(1, Number(data.minutes ?? 1440))) }; return { flash: { success: 'Cierre automático actualizado' } }; });
