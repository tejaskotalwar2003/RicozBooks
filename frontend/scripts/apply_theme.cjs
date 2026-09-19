const fs = require('fs');
const path = require('path');

function replaceInFile(relativePath, replacements) {
  const fullPath = path.resolve(__dirname, '..', relativePath);
  let content = fs.readFileSync(fullPath, 'utf8').replace(/\r\n/g, '\n');
  let count = 0;

  for (const [target, replacement] of replacements) {
    const normalizedTarget = target.replace(/\r\n/g, '\n');
    const normalizedReplacement = replacement.replace(/\r\n/g, '\n');
    if (content.includes(normalizedTarget)) {
      content = content.split(normalizedTarget).join(normalizedReplacement);
      count++;
    } else {
      console.warn(`[WARN] In ${relativePath}, target not found:\n"${normalizedTarget.slice(0, 50)}..."`);
    }
  }

  fs.writeFileSync(fullPath, content, 'utf8');
  console.log(`[OK] Updated ${relativePath} (${count} replacements applied)`);
}

// 1. Sidebar.tsx
replaceInFile('src/components/layout/Sidebar.tsx', [
  [
    `isActive
                      ? 'bg-[#390003] text-white border-l-4 border-[#E6B676] shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-[#390003]/60'`,
    `isActive
                      ? 'bg-slate-800/80 text-white border-l-4 border-[#781019] shadow-xs'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50'`
  ]
]);

// 2. Dashboard.tsx Net Profit card
replaceInFile('src/pages/Dashboard.tsx', [
  [
    `        {/* Net Profit */}
        <div className="bg-[#FAF5EE] p-5 rounded-xl border border-[#E6B676]/60 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#390003] uppercase tracking-wider">Net Profit</span>
            <div className="w-8 h-8 rounded-lg bg-[#E6B676]/30 text-[#390003] flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#390003] mt-3 tnum">
            {currencySymbol}4,64,600.00
          </div>
          <div className="flex items-center text-xs font-bold text-emerald-700 mt-1">
            <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />
            <span>↑ 22% vs last month</span>
          </div>
        </div>`,
    `        {/* Net Profit */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Net Profit</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-[#C58B3E] flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-3 tnum">
            {currencySymbol}4,64,600.00
          </div>
          <div className="flex items-center text-xs font-semibold text-emerald-600 mt-1">
            <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />
            <span>↑ 22% vs last month</span>
          </div>
        </div>`
  ]
]);

// 3. ChartOfAccounts.tsx category tabs
replaceInFile('src/pages/ChartOfAccounts.tsx', [
  [
    `activeTab === cat.value
                  ? 'bg-[#390003] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'`,
    `activeTab === cat.value
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'`
  ]
]);

console.log('CRLF-normalized replacements finished successfully!');

