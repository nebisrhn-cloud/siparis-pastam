import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'Sipariş Pastam', description: 'Tezgâhtan üretime pasta sipariş takibi.', icons: {icon:'/favicon.svg'} };
export default function Layout({children}:{children:React.ReactNode}) {return <html lang="tr"><body>{children}</body></html>}
