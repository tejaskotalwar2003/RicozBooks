export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC] text-slate-900 p-6">
      <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-8 shadow-sm space-y-4 text-center">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#781019] to-[#3B0006] flex items-center justify-center mx-auto text-[#E6B676] font-bold text-xl">
          RB
        </div>
        <h1 className="text-xl font-bold text-slate-900">RicozBooks</h1>
        <p className="text-xs text-slate-500">
          Accounting. Control. Intelligence. — Next.js Migration Workspace Active.
        </p>
      </div>
    </div>
  );
}

