import Sidebar from '@/components/Sidebar'
import WhiteLabelApplier from '@/components/WhiteLabelApplier'
import BusquedaGlobal from '@/components/BusquedaGlobal'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
      <WhiteLabelApplier />
      <BusquedaGlobal />
      <Sidebar />
      <main className="flex-1 p-6 overflow-auto">{children}</main>
    </div>
  )
}
