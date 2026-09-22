const path = require('path');
const fs = require('fs');
const puppeteer = require(path.join(__dirname, '..', 'frontend', 'node_modules', 'puppeteer-core'));

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const ARTIFACT_DIR = 'C:\\Users\\hp\\.gemini\\antigravity\\brain\\dcf973e8-53e0-4af4-bde1-359fab0f5489';
const PROJECT_DIR = 'C:\\Users\\hp\\Documents\\RicozBooks';

async function generatePitchDeckPDF() {
  console.log('Building Investor Presentation HTML (16:9 widescreen)...');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>RicozBooks - Investor Presentation 2026</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap');

    @page {
      size: 16in 9in;
      margin: 0;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      margin: 0;
      padding: 0;
      font-family: 'Plus Jakarta Sans', -apple-system, sans-serif;
      background: #0B0F19;
      color: #0F172A;
    }
    .slide {
      width: 16in;
      height: 9in;
      position: relative;
      page-break-after: always;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 0.8in 1in;
      background: #F8FAFC;
      overflow: hidden;
    }
    .slide.dark {
      background: #0B0F19;
      color: #FFFFFF;
    }
    .slide:last-child {
      page-break-after: avoid;
    }

    /* Typography */
    .tag {
      font-size: 0.95rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: #6366F1;
      margin-bottom: 0.35rem;
    }
    .title {
      font-size: 2.25rem;
      font-weight: 800;
      color: #0F172A;
      line-height: 1.2;
      margin: 0 0 1.5rem 0;
    }
    .title span {
      color: #6366F1;
    }
    .slide.dark .title {
      color: #FFFFFF;
    }

    /* Cards */
    .card {
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 1rem;
      padding: 1.5rem;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
    }
    .card.dark {
      background: #111827;
      border-color: #1F2937;
      color: #F3F4F6;
    }

    /* Badges */
    .badge {
      display: inline-block;
      padding: 0.25rem 0.65rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .badge-green {
      background: #D1FAE5;
      color: #065F46;
      border: 1px solid #A7F3D0;
    }
    .badge-blue {
      background: #E0E7FF;
      color: #312E81;
      border: 1px solid #C7D2FE;
    }
    .badge-burgundy {
      background: #FEE2E2;
      color: #991B1B;
      border: 1px solid #FECACA;
    }

    /* Grid Layouts */
    .grid-3 {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1.5rem;
    }
    .grid-4 {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1.25rem;
    }
    .grid-2 {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1.75rem;
    }

    /* Tables */
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.95rem;
    }
    th {
      background: #F1F5F9;
      color: #0F172A;
      font-weight: 700;
      text-align: left;
      padding: 0.85rem 1rem;
      border-bottom: 2px solid #CBD5E1;
    }
    td {
      padding: 0.85rem 1rem;
      border-bottom: 1px solid #E2E8F0;
      color: #334155;
    }
  </style>
</head>
<body>

  <!-- ========================================== -->
  <!-- SLIDE 1: COVER -->
  <!-- ========================================== -->
  <div class="slide dark" style="justify-content: center; align-items: center; text-align: center;">
    <div style="max-width: 12in;">
      <div class="tag" style="margin-bottom: 1rem;">RICOZ INNOVATION • INVESTOR PRESENTATION 2026</div>
      <h1 style="font-size: 4.5rem; font-weight: 900; margin: 0; color: #FFFFFF; letter-spacing: -1px;">
        Ricoz<span style="color: #6366F1;">Books</span>
      </h1>
      <p style="font-size: 1.85rem; font-weight: 700; color: #F1F5F9; margin: 1rem 0 0.5rem 0;">
        The Financial Operating Platform for Growing Multi-Entity Businesses
      </p>
      <p style="font-size: 1.2rem; color: #94A3B8; margin-bottom: 2.5rem;">
        Complete Double-Entry Ledger, Indian GST Return Suite, and Four-Eyes Financial Governance.
      </p>

      <div style="display: flex; justify-content: center; gap: 1rem;">
        <span class="badge badge-blue" style="font-size: 0.95rem; padding: 0.6rem 1.2rem;">✓ 22 Modules Fully Built</span>
        <span class="badge badge-green" style="font-size: 0.95rem; padding: 0.6rem 1.2rem;">✓ 48/48 Test Suite Passing</span>
        <span class="badge badge-blue" style="font-size: 0.95rem; padding: 0.6rem 1.2rem;">✓ Indian GSTN & E-Invoicing Ready</span>
        <span class="badge badge-green" style="font-size: 0.95rem; padding: 0.6rem 1.2rem;">✓ Live on Render Cloud</span>
      </div>
    </div>
  </div>

  <!-- ========================================== -->
  <!-- SLIDE 2: THE PROBLEM -->
  <!-- ========================================== -->
  <div class="slide">
    <div>
      <div class="tag">01 — THE PROBLEM</div>
      <h2 class="title">Financial Complexity Stalls <span>Growing Businesses</span></h2>

      <div class="grid-3" style="margin-top: 2rem;">
        <div class="card">
          <span class="badge badge-burgundy">Fragmented Operations</span>
          <h3 style="font-size: 1.35rem; font-weight: 700; margin: 1rem 0 0.5rem 0;">Disconnected Workflows</h3>
          <p style="color: #64748B; font-size: 1.05rem; line-height: 1.5;">
            Growing businesses juggle multiple legal entities, vendors, customers, and bank accounts across spreadsheets and basic billing apps, generating blind spots and massive reconciliation lag.
          </p>
        </div>

        <div class="card">
          <span class="badge badge-burgundy">Control & Governance Failures</span>
          <h3 style="font-size: 1.35rem; font-weight: 700; margin: 1rem 0 0.5rem 0;">Zero Segregation of Duties</h3>
          <p style="color: #64748B; font-size: 1.05rem; line-height: 1.5;">
            Entry-level software allows any user to post, edit, or delete transactions retroactively. There is no Maker-Checker review workflow, leading to audit vulnerabilities, fraud risks, and tax penalties.
          </p>
        </div>

        <div class="card">
          <span class="badge badge-burgundy">Scaling Friction</span>
          <h3 style="font-size: 1.35rem; font-weight: 700; margin: 1rem 0 0.5rem 0;">Trapped Between Extremes</h3>
          <p style="color: #64748B; font-size: 1.05rem; line-height: 1.5;">
            Companies outgrow single-user tools like Tally desktop, but cannot afford multi-crore enterprise ERPs (SAP/NetSuite) that take 9+ months to deploy and lack native Indian GST return automation.
          </p>
        </div>
      </div>
    </div>

    <div class="card" style="background: #EEF2FF; border-color: #C7D2FE; padding: 1rem; text-align: center;">
      <span style="font-weight: 700; color: #312E81; font-size: 1.05rem;">
        💡 Market Imperative: Indian mid-market enterprises need double-entry mathematical precision combined with enterprise governance, without legacy ERP complexity.
      </span>
    </div>
  </div>

  <!-- ========================================== -->
  <!-- SLIDE 3: OUR SOLUTION -->
  <!-- ========================================== -->
  <div class="slide">
    <div>
      <div class="tag">02 — OUR SOLUTION</div>
      <h2 class="title">Meet <span>RicozBooks</span> — The Financial Operating Engine</h2>

      <div class="grid-2" style="margin-top: 1.5rem;">
        <div style="display: flex; flex-direction: column; gap: 1rem;">
          <div class="card">
            <h4 style="color: #6366F1; font-weight: 800; margin: 0 0 0.25rem 0;">Strict Double-Entry General Ledger</h4>
            <p style="margin: 0; color: #64748B; font-size: 0.95rem;">
              Mathematical Debit = Credit invariant enforced at database layer. Zero balance drift guaranteed.
            </p>
          </div>
          <div class="card">
            <h4 style="color: #6366F1; font-weight: 800; margin: 0 0 0.25rem 0;">Native Multi-Entity & Multi-Currency</h4>
            <p style="margin: 0; color: #64748B; font-size: 0.95rem;">
              Central organization umbrella managing isolated subsidiaries, fiscal calendars, and foreign exchange rates (INR, USD, EUR, GBP).
            </p>
          </div>
          <div class="card">
            <h4 style="color: #6366F1; font-weight: 800; margin: 0 0 0.25rem 0;">Four-Eyes Governance & Period Lock</h4>
            <p style="margin: 0; color: #64748B; font-size: 0.95rem;">
              Mandatory Maker-Checker review queues and tamper-proof fiscal period close freezes with signed audit trails.
            </p>
          </div>
          <div class="card">
            <h4 style="color: #6366F1; font-weight: 800; margin: 0 0 0.25rem 0;">Automated Indian GST Suite</h4>
            <p style="margin: 0; color: #64748B; font-size: 0.95rem;">
              Auto-generation of GSTR-1 & 3B return schedules, B2B/B2C summaries, and Input Tax Credit (ITC) checks.
            </p>
          </div>
        </div>

        <div class="card" style="border: 2px solid #6366F1; padding: 2rem;">
          <div style="font-size: 0.85rem; font-weight: 800; color: #6366F1; text-transform: uppercase; letter-spacing: 1px;">
            LIVE PRODUCT WORKBENCH
          </div>
          <h3 style="font-size: 1.4rem; font-weight: 800; margin: 0.5rem 0 1rem 0; color: #0F172A;">
            Ricoz India Pvt Ltd (INR) • Status: Active & Balanced
          </h3>
          <ul style="color: #475569; font-size: 1rem; line-height: 1.8; padding-left: 1.25rem;">
            <li><strong>General Ledger:</strong> Voucher #JE-2026-0042 verified (Variance = ₹0.00)</li>
            <li><strong>Tax Invoice Engine:</strong> #INV-2026-0881 posted to AR 1200 with 18% GST</li>
            <li><strong>GST Return Center:</strong> GSTR-1 B2B supplies compiled (₹14.80 Lakhs)</li>
            <li><strong>Perpetual Inventory:</strong> FIFO stock valuation synced to GL 1300</li>
            <li><strong>Period Close Manager:</strong> August 2026 permanently locked against edits</li>
          </ul>
          <div style="margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid #E2E8F0;">
            <span class="badge badge-green" style="font-size: 0.85rem;">Live Web App: https://ricozbooks-web.onrender.com</span>
          </div>
        </div>
      </div>
    </div>

    <div></div>
  </div>

  <!-- ========================================== -->
  <!-- SLIDE 4: CORE PRODUCT ARCHITECTURE (CORRECTED) -->
  <!-- ========================================== -->
  <div class="slide">
    <div>
      <div class="tag">03 — CORE PRODUCT</div>
      <h2 class="title">One Unified Platform for <span>All Financial Operations</span> (22 Modules Built)</h2>

      <div class="grid-4" style="margin-top: 1.5rem;">
        <div class="card">
          <span class="badge badge-green">BUILT & LIVE</span>
          <h3 style="font-size: 1.25rem; font-weight: 800; margin: 0.75rem 0 0.5rem 0;">Entity Management</h3>
          <ul style="color: #64748B; font-size: 0.9rem; line-height: 1.6; padding-left: 1rem;">
            <li>Self-serve registration</li>
            <li>Isolated subsidiary ledgers</li>
            <li>Cryptographic invitations</li>
            <li>Multi-currency FX matrix</li>
          </ul>
        </div>

        <div class="card">
          <span class="badge badge-green">BUILT & LIVE</span>
          <h3 style="font-size: 1.25rem; font-weight: 800; margin: 0.75rem 0 0.5rem 0;">Double-Entry Core</h3>
          <ul style="color: #64748B; font-size: 0.9rem; line-height: 1.6; padding-left: 1rem;">
            <li>Hierarchical Chart of Accounts</li>
            <li>Multi-line journal vouchers</li>
            <li>Debit = Credit database lock</li>
            <li>Immutable audit logs</li>
          </ul>
        </div>

        <div class="card">
          <span class="badge badge-green">BUILT & LIVE</span>
          <h3 style="font-size: 1.25rem; font-weight: 800; margin: 0.75rem 0 0.5rem 0;">Sales & Purchases</h3>
          <ul style="color: #64748B; font-size: 0.9rem; line-height: 1.6; padding-left: 1rem;">
            <li>Estimates to Tax Invoices</li>
            <li>Sales Orders & Credit Notes</li>
            <li>Purchase Orders to Bills</li>
            <li>1-Click document conversion</li>
          </ul>
        </div>

        <div class="card">
          <span class="badge badge-green">BUILT & LIVE</span>
          <h3 style="font-size: 1.25rem; font-weight: 800; margin: 0.75rem 0 0.5rem 0;">Tax & Reporting</h3>
          <ul style="color: #64748B; font-size: 0.9rem; line-height: 1.6; padding-left: 1rem;">
            <li>GSTR-1 & 3B return engine</li>
            <li>FIFO inventory & COGS sync</li>
            <li>Bank OFX/CSV reconciliation</li>
            <li>Real-time Balance Sheet & P&L</li>
          </ul>
        </div>
      </div>
    </div>

    <div class="card" style="background: #F1F5F9; padding: 0.85rem; text-align: center;">
      <span style="font-weight: 700; color: #334155; font-size: 0.95rem;">
        ⚡ All 22 financial modules are fully functional, integrated, and verified with 48/48 passing backend tests.
      </span>
    </div>
  </div>

  <!-- ========================================== -->
  <!-- SLIDE 5: PRODUCT SHOWCASE IN ACTION -->
  <!-- ========================================== -->
  <div class="slide">
    <div>
      <div class="tag">04 — PRODUCT SHOWCASE</div>
      <h2 class="title">RicozBooks in Action — <span>Enterprise Core</span></h2>

      <div class="grid-3" style="margin-top: 1.25rem;">
        <div class="card">
          <span class="badge badge-green">01 • EXECUTIVE DASHBOARD</span>
          <h4 style="font-size: 1.15rem; font-weight: 800; margin: 0.6rem 0 0.4rem 0;">Real-Time Financial Health</h4>
          <p style="color: #64748B; font-size: 0.9rem; margin: 0;">
            Live KPI tracking: Revenue, Receivables, Payables, Net Cashflow, and operating account balances across entities.
          </p>
        </div>

        <div class="card">
          <span class="badge badge-green">02 • JOURNAL ENGINE</span>
          <h4 style="font-size: 1.15rem; font-weight: 800; margin: 0.6rem 0 0.4rem 0;">Multi-Line Vouchers</h4>
          <p style="color: #64748B; font-size: 0.9rem; margin: 0;">
            Dynamic line creation, real-time debit-credit balance calculations, line-level narrations, and reference document linking.
          </p>
        </div>

        <div class="card">
          <span class="badge badge-green">03 • SALES & AP HUB</span>
          <h4 style="font-size: 1.15rem; font-weight: 800; margin: 0.6rem 0 0.4rem 0;">Full Commercial Lifecycle</h4>
          <p style="color: #64748B; font-size: 0.9rem; margin: 0;">
            Sub-tabs for Invoices, Estimates, Orders, Credit Notes, Bills, POs, and Debit Notes with automated ledger postings.
          </p>
        </div>

        <div class="card">
          <span class="badge badge-green">04 • GST TAX ENGINE</span>
          <h4 style="font-size: 1.15rem; font-weight: 800; margin: 0.6rem 0 0.4rem 0;">Indian GST Return Suite</h4>
          <p style="color: #64748B; font-size: 0.9rem; margin: 0;">
            GSTR-1, GSTR-3B, B2B/B2C schedules, automated IGST vs CGST+SGST determination, and Input Tax Credit (ITC) checks.
          </p>
        </div>

        <div class="card">
          <span class="badge badge-green">05 • BANK RECONCILIATION</span>
          <h4 style="font-size: 1.15rem; font-weight: 800; margin: 0.6rem 0 0.4rem 0;">OFX & CSV Statement Sync</h4>
          <p style="color: #64748B; font-size: 0.9rem; margin: 0;">
            Upload electronic bank statements and execute intelligent rule-based 1-click matching against general ledger cash records.
          </p>
        </div>

        <div class="card">
          <span class="badge badge-green">06 • FOUR-EYES GOVERNANCE</span>
          <h4 style="font-size: 1.15rem; font-weight: 800; margin: 0.6rem 0 0.4rem 0;">Approvals & Hard Close</h4>
          <p style="color: #64748B; font-size: 0.9rem; margin: 0;">
            Maker-checker verification queue and cryptographic period close locks preventing retroactive alterations during tax audits.
          </p>
        </div>
      </div>
    </div>

    <div></div>
  </div>

  <!-- ========================================== -->
  <!-- SLIDE 6: FINANCIAL GOVERNANCE -->
  <!-- ========================================== -->
  <div class="slide">
    <div>
      <div class="tag">05 — FINANCIAL GOVERNANCE</div>
      <h2 class="title">Accounting with <span>Built-In Internal Controls</span></h2>

      <div class="grid-3" style="margin-top: 1.5rem;">
        <div class="card">
          <span class="badge badge-burgundy">Four-Eyes Workflow</span>
          <h3 style="font-size: 1.3rem; font-weight: 800; margin: 0.75rem 0 0.5rem 0;">Segregation of Duties</h3>
          <p style="color: #64748B; font-size: 0.95rem; line-height: 1.5;">
            Junior accountants draft vouchers, but cannot post directly to the ledger. Senior Reviewers or CFOs verify and approve or reject with mandatory reasons.
          </p>
          <ul style="color: #334155; font-size: 0.9rem; margin-top: 1rem; padding-left: 1rem;">
            <li>Accountant prepares draft voucher</li>
            <li>Reviewer inspects line narrations</li>
            <li>Approved: Immutable ledger posting</li>
            <li>Rejected: Reason logged for revision</li>
          </ul>
        </div>

        <div class="card">
          <span class="badge badge-burgundy">Period Close Locking</span>
          <h3 style="font-size: 1.3rem; font-weight: 800; margin: 0.75rem 0 0.5rem 0;">Tamper-Proof Ledger Freeze</h3>
          <p style="color: #64748B; font-size: 0.95rem; line-height: 1.5;">
            Prevents accidental or unauthorized retroactive modifications to accounting records once closed. Once a period is locked, all backdated entries are strictly rejected.
          </p>
          <ul style="color: #334155; font-size: 0.9rem; margin-top: 1rem; padding-left: 1rem;">
            <li>Monthly & quarterly close checklists</li>
            <li>Hard database-level entry block</li>
            <li>Cryptographic sign-off stamp</li>
            <li>Complies with statutory tax audits</li>
          </ul>
        </div>

        <div class="card">
          <span class="badge badge-burgundy">Controlled Reopening</span>
          <h3 style="font-size: 1.3rem; font-weight: 800; margin: 0.75rem 0 0.5rem 0;">Audited Administrative Access</h3>
          <p style="color: #64748B; font-size: 0.95rem; line-height: 1.5;">
            In statutory audit scenarios requiring adjustments, only authorized Administrators can reopen a closed period, requiring mandatory justification notes and audit logs.
          </p>
          <ul style="color: #334155; font-size: 0.9rem; margin-top: 1rem; padding-left: 1rem;">
            <li>Admin-only permission barrier</li>
            <li>Mandatory justification reason</li>
            <li>Immutable audit log generated</li>
            <li>Signed reversing entry workflow</li>
          </ul>
        </div>
      </div>
    </div>

    <div class="card" style="background: #EEF2FF; border-color: #C7D2FE; padding: 1rem; text-align: center;">
      <span style="font-weight: 700; color: #312E81; font-size: 1.05rem;">
        🛡️ Built for high-integrity enterprises preparing for statutory GST filings, bank loans, and external audits.
      </span>
    </div>
  </div>

  <!-- ========================================== -->
  <!-- SLIDE 7: VALUE & CAPABILITY TABLE -->
  <!-- ========================================== -->
  <div class="slide">
    <div>
      <div class="tag">06 — VALUE & CAPABILITY</div>
      <h2 class="title">From Bookkeeping to <span>Enterprise Financial Control</span></h2>

      <div class="card" style="padding: 0; overflow: hidden; margin-top: 1.5rem;">
        <table>
          <thead>
            <tr>
              <th style="width: 25%;">Platform Capability</th>
              <th style="width: 20%;">RicozBooks Status</th>
              <th style="width: 55%;">Architectural Implementation</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Multi-Entity Management</strong></td>
              <td><span class="badge badge-green">✓ Built & Live</span></td>
              <td>Central organization umbrella managing isolated subsidiaries, base currencies (INR/USD/EUR/GBP), and FX.</td>
            </tr>
            <tr>
              <td><strong>Double-Entry Foundation</strong></td>
              <td><span class="badge badge-green">✓ Built & Live</span></td>
              <td>Debit-equals-credit invariant validated at DB level; impossible to commit unbalanced journals.</td>
            </tr>
            <tr>
              <td><strong>Four-Eyes Approval Governance</strong></td>
              <td><span class="badge badge-green">✓ Built & Live</span></td>
              <td>Maker-checker verification decoupling draft entry preparation from ledger posting with mandatory notes.</td>
            </tr>
            <tr>
              <td><strong>Commercial Sales & Procurement</strong></td>
              <td><span class="badge badge-green">✓ Built & Live</span></td>
              <td>Complete lifecycle: Estimates &rarr; Orders &rarr; Invoices &rarr; Credit Notes; POs &rarr; Bills &rarr; Debit Notes.</td>
            </tr>
            <tr>
              <td><strong>Indian GST & E-Invoicing Suite</strong></td>
              <td><span class="badge badge-green">✓ Built & Live</span></td>
              <td>Automated GSTR-1 & 3B return schedules, intra/inter-state tax splitting, and Input Tax Credit (ITC) checks.</td>
            </tr>
            <tr>
              <td><strong>Perpetual Stock Valuation</strong></td>
              <td><span class="badge badge-green">✓ Built & Live</span></td>
              <td>FIFO & Weighted Average costing, reorder level alerts, and automated COGS ledger bookings.</td>
            </tr>
            <tr>
              <td><strong>Developer API & Webhooks</strong></td>
              <td><span class="badge badge-green">✓ Built & Live</span></td>
              <td>RESTful API with OpenAPI/Swagger, Bearer authentication, and event webhooks for payment gateways.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div></div>
  </div>

  <!-- ========================================== -->
  <!-- SLIDE 8: TECHNOLOGY ARCHITECTURE -->
  <!-- ========================================== -->
  <div class="slide">
    <div>
      <div class="tag">07 — TECHNOLOGY ARCHITECTURE</div>
      <h2 class="title">RicozBooks — <span>Full-Stack Cloud Architecture</span></h2>

      <div class="card dark" style="padding: 0.75rem 1.5rem; margin-bottom: 1.5rem; text-align: center;">
        <span style="font-weight: 700; color: #E6B676; font-size: 0.95rem;">
          🔒 SECURITY & GOVERNANCE BAND: JWT Auth • RBAC Permissions • Multi-Tenant Isolation • Period Close Lock • Cryptographic Audit Trails
        </span>
      </div>

      <div class="grid-4">
        <div class="card">
          <div style="font-size: 0.8rem; font-weight: 800; color: #6366F1;">LAYER 01</div>
          <h4 style="font-size: 1.15rem; font-weight: 800; margin: 0.25rem 0;">Client Experience</h4>
          <div style="font-size: 0.85rem; font-weight: 700; color: #781019; margin-bottom: 0.5rem;">React 18 + Tailwind</div>
          <ul style="color: #64748B; font-size: 0.85rem; line-height: 1.5; padding-left: 1rem;">
            <li>Fast SPA interface</li>
            <li>Interactive live workbench</li>
            <li>Maker-checker approvals UI</li>
            <li>Mobile responsive drawer</li>
            <li>Client-side CSV/PDF exports</li>
          </ul>
        </div>

        <div class="card">
          <div style="font-size: 0.8rem; font-weight: 800; color: #6366F1;">LAYER 02</div>
          <h4 style="font-size: 1.15rem; font-weight: 800; margin: 0.25rem 0;">REST API Engine</h4>
          <div style="font-size: 0.85rem; font-weight: 700; color: #781019; margin-bottom: 0.5rem;">Python 3.14 + FastAPI</div>
          <ul style="color: #64748B; font-size: 0.85rem; line-height: 1.5; padding-left: 1rem;">
            <li>Asynchronous routing</li>
            <li>Swagger / OpenAPI schema</li>
            <li>Bearer token authentication</li>
            <li>Granular RBAC dependencies</li>
            <li>Real-time event webhooks</li>
          </ul>
        </div>

        <div class="card">
          <div style="font-size: 0.8rem; font-weight: 800; color: #6366F1;">LAYER 03</div>
          <h4 style="font-size: 1.15rem; font-weight: 800; margin: 0.25rem 0;">Financial Logic</h4>
          <div style="font-size: 0.85rem; font-weight: 700; color: #781019; margin-bottom: 0.5rem;">SQLAlchemy + Rules</div>
          <ul style="color: #64748B; font-size: 0.85rem; line-height: 1.5; padding-left: 1rem;">
            <li>Strict Debit = Credit validation</li>
            <li>FIFO inventory & COGS rules</li>
            <li>Indian GST tax computation</li>
            <li>Multi-currency FX revaluation</li>
            <li>Hard period lock enforcement</li>
          </ul>
        </div>

        <div class="card">
          <div style="font-size: 0.8rem; font-weight: 800; color: #6366F1;">LAYER 04</div>
          <h4 style="font-size: 1.15rem; font-weight: 800; margin: 0.25rem 0;">Database Storage</h4>
          <div style="font-size: 0.85rem; font-weight: 700; color: #781019; margin-bottom: 0.5rem;">PostgreSQL Relational</div>
          <ul style="color: #64748B; font-size: 0.85rem; line-height: 1.5; padding-left: 1rem;">
            <li>Multi-tenant schema scoping</li>
            <li>Foreign key constraint checks</li>
            <li>ACID transactional security</li>
            <li>Continuous cloud backups</li>
            <li>Immutable audit event log</li>
          </ul>
        </div>
      </div>
    </div>

    <div></div>
  </div>

  <!-- ========================================== -->
  <!-- SLIDE 9: TARGET MARKET -->
  <!-- ========================================== -->
  <div class="slide">
    <div>
      <div class="tag">08 — TARGET MARKET</div>
      <h2 class="title">Serving India's Booming <span>SME Economy</span></h2>

      <div class="grid-2" style="margin-top: 1.5rem;">
        <div class="card">
          <div style="font-size: 0.85rem; font-weight: 800; color: #6366F1;">MARKET INFLECTION</div>
          <h3 style="font-size: 1.5rem; font-weight: 800; margin: 0.5rem 0 1rem 0;">India's Large & Growing SME Ecosystem</h3>
          <p style="color: #64748B; font-size: 1.05rem; line-height: 1.6;">
            Indian enterprises are actively transitioning from offline legacy desktop tools to modern cloud platforms to satisfy compliance mandates, manage multi-branch operations, and collaborate remotely.
          </p>
          <div style="margin-top: 1.5rem; padding: 1rem; background: #F8FAFC; border-left: 4px solid #6366F1; font-weight: 600; color: #334155;">
            Geographic Horizon: India anchor market &rarr; Expansion into APAC &rarr; Global cross-border SMB finance.
          </div>
        </div>

        <div class="card">
          <div style="font-size: 0.85rem; font-weight: 800; color: #6366F1;">CUSTOMER SEGMENTS</div>
          <h3 style="font-size: 1.5rem; font-weight: 800; margin: 0.5rem 0 1rem 0;">High-LTV Commercial Segments</h3>
          
          <div style="margin-bottom: 1.25rem;">
            <strong style="color: #0F172A; font-size: 1.05rem;">Trading & Distribution Businesses:</strong>
            <p style="color: #64748B; margin: 0.25rem 0 0 0; font-size: 0.95rem;">Multi-warehouse inventory, high transaction counts, complex intra/inter-state GST rules.</p>
          </div>

          <div style="margin-bottom: 1.25rem;">
            <strong style="color: #0F172A; font-size: 1.05rem;">Professional Services & Tech Agencies:</strong>
            <p style="color: #64748B; margin: 0.25rem 0 0 0; font-size: 0.95rem;">Multi-currency client contracts (USD/INR), recurring invoicing, and project profitability tracking.</p>
          </div>

          <div>
            <strong style="color: #0F172A; font-size: 1.05rem;">Chartered Accountant (CA) Firms (Our Multiplier):</strong>
            <p style="color: #64748B; margin: 0.25rem 0 0 0; font-size: 0.95rem;">One CA firm manages 20 to 100+ client SME entities on RicozBooks with unified review dashboards.</p>
          </div>
        </div>
      </div>
    </div>

    <div></div>
  </div>

  <!-- ========================================== -->
  <!-- SLIDE 10: BUSINESS MODEL & PRICING -->
  <!-- ========================================== -->
  <div class="slide">
    <div>
      <div class="tag">09 — BUSINESS MODEL</div>
      <h2 class="title">Predictable B2B <span>SaaS Subscription Model</span></h2>

      <div class="grid-3" style="margin-top: 1.5rem;">
        <div class="card">
          <span class="badge badge-blue">STARTER</span>
          <h3 style="font-size: 1.75rem; font-weight: 800; margin: 0.75rem 0 0.25rem 0;">₹ 999 <span style="font-size: 1rem; color: #64748B; font-weight: 500;">/ mo</span></h3>
          <p style="color: #64748B; font-size: 0.9rem; margin-bottom: 1rem;">For single-entity small businesses needing core double-entry bookkeeping.</p>
          <ul style="color: #334155; font-size: 0.9rem; line-height: 1.6; padding-left: 1rem;">
            <li>1 Legal Business Entity</li>
            <li>Single-user access</li>
            <li>Standard Chart of Accounts</li>
            <li>Basic Invoicing & Expenses</li>
            <li>Trial Balance & Balance Sheet</li>
          </ul>
        </div>

        <div class="card" style="border: 2px solid #6366F1;">
          <span class="badge badge-green">MOST POPULAR • PROFESSIONAL</span>
          <h3 style="font-size: 1.75rem; font-weight: 800; margin: 0.75rem 0 0.25rem 0;">₹ 2,499 <span style="font-size: 1rem; color: #64748B; font-weight: 500;">/ mo</span></h3>
          <p style="color: #64748B; font-size: 0.9rem; margin-bottom: 1rem;">For growing businesses requiring multi-user controls and GST compliance.</p>
          <ul style="color: #334155; font-size: 0.9rem; line-height: 1.6; padding-left: 1rem;">
            <li>Up to 3 Legal Entities</li>
            <li>Up to 5 Users with RBAC</li>
            <li>Four-Eyes Approval Workflow</li>
            <li>Indian GST Suite (GSTR-1, 3B)</li>
            <li>FIFO Inventory & COGS Sync</li>
            <li>Bank Statement Reconciliation</li>
          </ul>
        </div>

        <div class="card">
          <span class="badge badge-burgundy">ENTERPRISE</span>
          <h3 style="font-size: 1.75rem; font-weight: 800; margin: 0.75rem 0 0.25rem 0;">₹ 5,999 <span style="font-size: 1rem; color: #64748B; font-weight: 500;">/ mo</span></h3>
          <p style="color: #64748B; font-size: 0.9rem; margin-bottom: 1rem;">For multi-entity corporations needing complete governance and custom APIs.</p>
          <ul style="color: #334155; font-size: 0.9rem; line-height: 1.6; padding-left: 1rem;">
            <li>Unlimited Legal Entities</li>
            <li>Unlimited Users & Custom Roles</li>
            <li>Hard Fiscal Period Close Locks</li>
            <li>Multi-Currency FX Revaluation</li>
            <li>Developer API & Webhooks</li>
            <li>Dedicated CA Advisory SLA</li>
          </ul>
        </div>
      </div>
    </div>

    <div class="card" style="background: #F8FAFC; padding: 0.85rem; text-align: center;">
      <span style="font-weight: 600; color: #64748B; font-size: 0.95rem;">
        Expansion Revenue: Additional entity packs, custom webhook throughput, CA firm enterprise seat bundles, and automated bank feed subscriptions.
      </span>
    </div>
  </div>

  <!-- ========================================== -->
  <!-- SLIDE 11: GO-TO-MARKET PLAN -->
  <!-- ========================================== -->
  <div class="slide">
    <div>
      <div class="tag">10 — GO-TO-MARKET PLAN</div>
      <h2 class="title">How RicozBooks Will <span>Scale Customer Acquisition</span></h2>

      <div class="grid-4" style="margin-top: 1.5rem;">
        <div class="card">
          <span class="badge badge-green">ZERO CAC MULTIPLIER</span>
          <h3 style="font-size: 1.25rem; font-weight: 800; margin: 0.75rem 0 0.5rem 0;">1. CA Partnerships</h3>
          <p style="color: #64748B; font-size: 0.9rem; line-height: 1.5;">
            Partnering with Chartered Accountants who mandate RicozBooks to their clients to streamline review workflows.
          </p>
        </div>

        <div class="card">
          <span class="badge badge-blue">TARGETED OUTREACH</span>
          <h3 style="font-size: 1.25rem; font-weight: 800; margin: 0.75rem 0 0.5rem 0;">2. Direct SME Sales</h3>
          <p style="color: #64748B; font-size: 0.9rem; line-height: 1.5;">
            Targeting multi-entity and trading businesses through LinkedIn outreach, CFO roundtables, and localized demonstrations.
          </p>
        </div>

        <div class="card">
          <span class="badge badge-green">VIRAL PRODUCT LOOP</span>
          <h3 style="font-size: 1.25rem; font-weight: 800; margin: 0.75rem 0 0.5rem 0;">3. Inbound Invoicing</h3>
          <p style="color: #64748B; font-size: 0.9rem; line-height: 1.5;">
            Every invoice, estimate, and PO sent generates counterparty brand discovery with 'Powered by RicozBooks' links.
          </p>
        </div>

        <div class="card">
          <span class="badge badge-blue">SEARCH ENGINE MOAT</span>
          <h3 style="font-size: 1.25rem; font-weight: 800; margin: 0.75rem 0 0.5rem 0;">4. Digital Content</h3>
          <p style="color: #64748B; font-size: 0.9rem; line-height: 1.5;">
            High-intent organic content around Indian GST compliance, GSTR-1 preparation, period close governance, and Tally alternatives.
          </p>
        </div>
      </div>
    </div>

    <div class="card" style="padding: 1.25rem; text-align: center;">
      <div style="font-weight: 800; color: #6366F1; font-size: 0.85rem; text-transform: uppercase;">CONVERSION FUNNEL</div>
      <div style="font-weight: 700; color: #0F172A; font-size: 1.25rem; margin-top: 0.35rem;">
        1. Target Lead  &rarr;  2. Interactive Live Sandbox  &rarr;  3. 14-Day Full Access Trial  &rarr;  4. Team Onboarding  &rarr;  5. Paid Annual Subscription
      </div>
    </div>
  </div>

  <!-- ========================================== -->
  <!-- SLIDE 12: CURRENT PRODUCT READINESS (UPDATED!) -->
  <!-- ========================================== -->
  <div class="slide">
    <div>
      <div class="tag">11 — PRODUCT SCOPE & READINESS</div>
      <h2 class="title">Proven Engineering Execution — <span>22 Modules Live</span></h2>

      <div class="grid-2" style="margin-top: 1.5rem;">
        <div class="card" style="border: 2px solid #10B981;">
          <span class="badge badge-green">CORE PLATFORM: FULLY BUILT & DEPLOYED (100%)</span>
          <ul style="color: #0F172A; font-size: 0.95rem; line-height: 1.8; margin-top: 1rem; padding-left: 1.25rem;">
            <li><strong>Authentication & Security:</strong> JWT tokens, bcrypt, RBAC matrix</li>
            <li><strong>Multi-Entity Engine:</strong> Isolated subsidiary ledgers & FX rates</li>
            <li><strong>General Ledger:</strong> Balanced vouchers, line narrations (Δ = ₹0.00)</li>
            <li><strong>Sales Operations:</strong> Estimates &rarr; Orders &rarr; Invoices &rarr; Credit Notes</li>
            <li><strong>Procurement Hub:</strong> Purchase Orders &rarr; Bills &rarr; Debit Notes</li>
            <li><strong>Indian GST Suite:</strong> GSTR-1, GSTR-3B, B2B/B2C, and ITC reconciliation</li>
            <li><strong>Perpetual Inventory:</strong> FIFO stock ledger & automated COGS</li>
            <li><strong>Banking & Reconciliation:</strong> OFX/CSV import & 1-click matching</li>
            <li><strong>Four-Eyes Governance:</strong> Maker-checker queue & period lock</li>
          </ul>
        </div>

        <div class="card" style="border: 2px solid #6366F1;">
          <span class="badge badge-blue">ACTIVE HORIZON: AI INTELLIGENCE & ECOSYSTEM (Q3-Q4)</span>
          <ul style="color: #475569; font-size: 0.95rem; line-height: 1.8; margin-top: 1rem; padding-left: 1.25rem;">
            <li><strong>AI Financial Assistant:</strong> Natural language queries on ledger balances</li>
            <li><strong>Bank Feed Categorization:</strong> Machine learning classification rules</li>
            <li><strong>Financial Anomaly Detection:</strong> Automated alerts on unusual entries</li>
            <li><strong>Direct Bank Settlement APIs:</strong> ICICI / HDFC / Razorpay integration</li>
            <li><strong>Automated E-Way Bill Sync:</strong> Direct GSTN portal filing bridge</li>
            <li><strong>Payroll Automation Module:</strong> Salary disbursements with TDS & PF</li>
            <li><strong>Native Mobile Companion:</strong> Receipt OCR scanning & approval mobile app</li>
          </ul>
        </div>
      </div>
    </div>

    <div></div>
  </div>

  <!-- ========================================== -->
  <!-- SLIDE 13: PRODUCT ROADMAP (UPDATED!) -->
  <!-- ========================================== -->
  <div class="slide">
    <div>
      <div class="tag">12 — PRODUCT ROADMAP</div>
      <h2 class="title">From Precision Accounting to <span>Financial Intelligence</span></h2>

      <div class="grid-4" style="margin-top: 1.5rem;">
        <div class="card">
          <span class="badge badge-green">COMPLETED</span>
          <h3 style="font-size: 1.2rem; font-weight: 800; margin: 0.75rem 0 0.5rem 0;">Phase 1: Foundation</h3>
          <ul style="color: #334155; font-size: 0.85rem; line-height: 1.6; padding-left: 1rem;">
            <li>✓ Double-entry core</li>
            <li>✓ Multi-entity scoping</li>
            <li>✓ Hierarchical COA</li>
            <li>✓ JWT & RBAC security</li>
          </ul>
        </div>

        <div class="card">
          <span class="badge badge-green">COMPLETED</span>
          <h3 style="font-size: 1.2rem; font-weight: 800; margin: 0.75rem 0 0.5rem 0;">Phase 2: Operations</h3>
          <ul style="color: #334155; font-size: 0.85rem; line-height: 1.6; padding-left: 1rem;">
            <li>✓ Quotes to Tax Invoices</li>
            <li>✓ POs to Vendor Bills</li>
            <li>✓ Bank OFX/CSV recon</li>
            <li>✓ Full P&L & Balance Sheet</li>
          </ul>
        </div>

        <div class="card">
          <span class="badge badge-green">COMPLETED</span>
          <h3 style="font-size: 1.2rem; font-weight: 800; margin: 0.75rem 0 0.5rem 0;">Phase 3: GST & Controls</h3>
          <ul style="color: #334155; font-size: 0.85rem; line-height: 1.6; padding-left: 1rem;">
            <li>✓ Indian GST (GSTR-1/3B)</li>
            <li>✓ FIFO Inventory & COGS</li>
            <li>✓ Four-Eyes maker-checker</li>
            <li>✓ Hard period close locks</li>
          </ul>
        </div>

        <div class="card" style="border: 2px solid #6366F1;">
          <span class="badge badge-blue">CURRENT FRONTIER</span>
          <h3 style="font-size: 1.2rem; font-weight: 800; margin: 0.75rem 0 0.5rem 0;">Phase 4: AI & Sync</h3>
          <ul style="color: #475569; font-size: 0.85rem; line-height: 1.6; padding-left: 1rem;">
            <li>→ AI Ledger Assistant</li>
            <li>→ Bank feed auto-tagging</li>
            <li>→ Cash flow predictive insights</li>
            <li>→ GSTN Direct API bridge</li>
          </ul>
        </div>
      </div>
    </div>

    <div></div>
  </div>

  <!-- ========================================== -->
  <!-- SLIDE 14: LEADERSHIP & EXECUTION -->
  <!-- ========================================== -->
  <div class="slide">
    <div>
      <div class="tag">13 — LEADERSHIP & TEAM</div>
      <h2 class="title">The Team Behind <span>RicozBooks</span></h2>

      <div class="grid-3" style="margin-top: 1.5rem;">
        <div class="card">
          <span class="badge badge-blue">PRODUCT & VISION LEAD</span>
          <h3 style="font-size: 1.35rem; font-weight: 800; margin: 0.75rem 0 0.5rem 0;">Founder & Architect</h3>
          <p style="color: #64748B; font-size: 0.95rem; line-height: 1.5;">
            Responsible for overall platform roadmap, financial workflow architecture, and customer problem validation with growing multi-entity businesses.
          </p>
          <ul style="color: #334155; font-size: 0.9rem; margin-top: 1rem; padding-left: 1rem;">
            <li>Product design & market positioning</li>
            <li>Double-entry workflow architecture</li>
            <li>Customer discovery & execution</li>
          </ul>
        </div>

        <div class="card">
          <span class="badge badge-blue">ENGINEERING & SECURITY</span>
          <h3 style="font-size: 1.35rem; font-weight: 800; margin: 0.75rem 0 0.5rem 0;">Technical Architecture</h3>
          <p style="color: #64748B; font-size: 0.95rem; line-height: 1.5;">
            Leading core FastAPI backend development, PostgreSQL transaction integrity, double-entry mathematical invariants, and React frontend systems.
          </p>
          <ul style="color: #334155; font-size: 0.9rem; margin-top: 1rem; padding-left: 1rem;">
            <li>Distributed systems architecture</li>
            <li>Double-entry database verification</li>
            <li>Security, encryption & JWT controls</li>
          </ul>
        </div>

        <div class="card">
          <span class="badge badge-blue">OPERATIONS & ECOSYSTEM</span>
          <h3 style="font-size: 1.35rem; font-weight: 800; margin: 0.75rem 0 0.5rem 0;">CA Advisory & Compliance</h3>
          <p style="color: #64748B; font-size: 0.95rem; line-height: 1.5;">
            Guiding Indian statutory accounting compliance, period locking specifications, Four-Eyes approval logic, and accounting firm partnerships.
          </p>
          <ul style="color: #334155; font-size: 0.9rem; margin-top: 1rem; padding-left: 1rem;">
            <li>Chartered Accountant network</li>
            <li>Statutory audit workflow validation</li>
            <li>GST filing schema precision</li>
          </ul>
        </div>
      </div>
    </div>

    <div class="card" style="background: #EEF2FF; border-color: #C7D2FE; padding: 1rem; text-align: center;">
      <span style="font-weight: 700; color: #312E81; font-size: 1.05rem;">
        👥 Core team dedicated to building high-integrity financial operating systems for growing companies.
      </span>
    </div>
  </div>

  <!-- ========================================== -->
  <!-- SLIDE 15: INVESTMENT OPPORTUNITY -->
  <!-- ========================================== -->
  <div class="slide">
    <div>
      <div class="tag">14 — INVESTMENT OPPORTUNITY</div>
      <h2 class="title">Accelerating Commercial Growth in <span>Indian Enterprise Tech</span></h2>

      <div class="grid-2" style="margin-top: 1.5rem;">
        <div class="card">
          <span class="badge badge-blue">CAPITAL ALLOCATION</span>
          <h3 style="font-size: 1.75rem; font-weight: 800; margin: 0.75rem 0 0.5rem 0;">Seed Round Investment</h3>
          <p style="color: #64748B; font-size: 1rem; line-height: 1.6;">
            Allocation of Funds:
          </p>
          <ul style="color: #334155; font-size: 0.95rem; line-height: 1.8; padding-left: 1.25rem;">
            <li><strong>40% — Sales & GTM:</strong> Direct SME acquisition & CA firm partnerships</li>
            <li><strong>30% — Product & AI:</strong> ML bank classification, anomaly detection</li>
            <li><strong>20% — Cloud & Security:</strong> 99.99% SLA & GSTN Direct API certification</li>
            <li><strong>10% — Operations:</strong> Legal, compliance & customer onboarding</li>
          </ul>
        </div>

        <div class="card">
          <span class="badge badge-green">KEY STRATEGIC OBJECTIVES</span>
          <h3 style="font-size: 1.75rem; font-weight: 800; margin: 0.75rem 0 0.5rem 0;">18–24 Month Targets</h3>
          <ul style="color: #0F172A; font-size: 0.95rem; line-height: 1.8; padding-left: 1.25rem;">
            <li>✓ Acquire initial cohort of <strong>500+ paying SME entities</strong> across India</li>
            <li>✓ Establish <strong>₹1.5 Cr+ in Annual Recurring Revenue (ARR)</strong></li>
            <li>✓ Onboard <strong>50+ CA firms</strong> managing multi-tenant client portfolios</li>
            <li>✓ Launch AI-driven Automated Bookkeeping & Bank Feeds</li>
            <li>✓ Maintain <strong>99.99% Cloud Service Level Agreement (SLA)</strong></li>
          </ul>
        </div>
      </div>
    </div>

    <div></div>
  </div>

  <!-- ========================================== -->
  <!-- SLIDE 16: CONCLUSION & LIVE ACCESS -->
  <!-- ========================================== -->
  <div class="slide dark" style="justify-content: center; align-items: center; text-align: center;">
    <div style="max-width: 12in;">
      <div class="tag" style="margin-bottom: 1rem;">RICOZ INNOVATION • RICOZBOOKS CLOUD</div>
      <h1 style="font-size: 4rem; font-weight: 900; margin: 0; color: #FFFFFF; letter-spacing: -1px;">
        Ricoz<span style="color: #6366F1;">Books</span>
      </h1>
      <p style="font-size: 1.75rem; font-weight: 700; color: #F1F5F9; margin: 0.75rem 0 0.5rem 0;">
        Accounting. Control. Intelligence.
      </p>
      <p style="font-size: 1.15rem; color: #94A3B8; margin-bottom: 2.5rem;">
        Building the next generation of financial operations for growing businesses.
      </p>

      <div class="card dark" style="border: 2px solid #6366F1; padding: 2rem; max-width: 9in; margin: 0 auto;">
        <div style="font-size: 0.9rem; font-weight: 800; color: #6366F1; text-transform: uppercase; letter-spacing: 1px;">
          EXPERIENCE THE LIVE PRODUCT IN ACTION
        </div>
        <div style="font-size: 1.25rem; font-weight: 700; color: #FFFFFF; margin: 0.75rem 0;">
          Web Application: <a href="https://ricozbooks-web.onrender.com" style="color: #818CF8; text-decoration: none;">https://ricozbooks-web.onrender.com</a><br/>
          REST API Engine: <a href="https://ricozbooks-api.onrender.com" style="color: #818CF8; text-decoration: none;">https://ricozbooks-api.onrender.com</a>
        </div>
        <div style="font-size: 0.95rem; color: #94A3B8; margin-top: 0.5rem;">
          1-Click Live Role Sandboxes Available: Administrator / Senior Accountant / Reviewer & Auditor
        </div>
      </div>
    </div>
  </div>

</body>
</html>`;

  const htmlPathWorkspace = path.join(PROJECT_DIR, 'RicozBooks_Investor_Presentation_2026.html');
  fs.writeFileSync(htmlPathWorkspace, html, 'utf8');
  console.log(`Saved HTML presentation to ${htmlPathWorkspace}`);

  console.log('Launching Edge to print pixel-perfect PDF...');
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });

  const pdfPathWorkspace = path.join(PROJECT_DIR, 'RicozBooks_Investor_Presentation_2026.pdf');
  const pdfPathArtifact = path.join(ARTIFACT_DIR, 'RicozBooks_Investor_Presentation_2026.pdf');

  console.log(`Generating 16:9 PDF at ${pdfPathWorkspace}...`);
  await page.pdf({
    path: pdfPathWorkspace,
    width: '16in',
    height: '9in',
    printBackground: true,
    margin: {
      top: '0in',
      bottom: '0in',
      left: '0in',
      right: '0in'
    }
  });

  fs.copyFileSync(pdfPathWorkspace, pdfPathArtifact);
  console.log(`PDF successfully copied to artifact: ${pdfPathArtifact}`);

  await browser.close();
  console.log('PRESENTATION_PDF_GENERATION_SUCCESSFUL');
}

generatePitchDeckPDF().catch(err => {
  console.error('Failed to generate Presentation PDF:', err);
  process.exit(1);
});
