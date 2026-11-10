import { Head } from '@inertiajs/react';
import { Construction } from 'lucide-react';
import EmptyState from '@/Components/EmptyState';
import PageHeader from '@/Components/PageHeader';
import AppLayout from '@/Layouts/AppLayout';

/** A route of AVA Platform whose screen is not part of this demonstration. It says so instead of pretending. */
export default function NotInDemo({ routeName }) {
    return (
        <>
            <Head title="No incluida en la demostración" />
            <PageHeader title="Pantalla no incluida" description="Esta pantalla existe en AVA Platform pero no forma parte de esta demostración." />
            <EmptyState icon={Construction} title="No disponible en la demo" description={`La ruta${routeName ? ` «${routeName}»` : ''} no está simulada en este Showcase.`} />
        </>
    );
}

NotInDemo.layout = (page) => <AppLayout>{page}</AppLayout>;
