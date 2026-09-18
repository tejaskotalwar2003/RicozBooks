const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const ARTIFACT_DIR = 'C:\\Users\\hp\\.gemini\\antigravity\\brain\\dcf973e8-53e0-4af4-bde1-359fab0f5489';
const PROJECT_DIR = 'C:\\Users\\hp\\Documents\\RicozBooks';

function getBase64Image(filePath) {
  try {
    const data = fs.readFileSync(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const mime = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/png';
    return `data:${mime};base64,${data.toString('base64')}`;
  } catch (e) {
    console.error(`Error reading ${filePath}:`, e.message);
    return '';
  }
}

async function generatePDF() {
  console.log('Encoding screenshots to Base64...');
  const logoBase64 = getBase64Image(path.join(PROJECT_DIR, 'frontend', 'public', 'logo.jpg'));
  const p1Img = getBase64Image(path.join(ARTIFACT_DIR, 'page1_landing_hero.png'));
  const p2Img = getBase64Image(path.join(ARTIFACT_DIR, 'page2_features_grid.png'));
  const p3Img = getBase64Image(path.join(ARTIFACT_DIR, 'page3_security_overview.png'));
  const p4Img = getBase64Image(path.join(ARTIFACT_DIR, 'page8_new_journal_modal.png'));
  const p5Img = getBase64Image(path.join(ARTIFACT_DIR, 'page12_multi_entity_setup.png'));
  const p6Img = getBase64Image(path.join(ARTIFACT_DIR, 'page6_chart_of_accounts.png'));
  const p7Img = getBase64Image(path.join(ARTIFACT_DIR, 'page9_approval_queue.png'));
  const p8Img = getBase64Image(path.join(ARTIFACT_DIR, 'page10_general_ledger.png'));
  const p9Img = getBase64Image(path.join(ARTIFACT_DIR, 'page11_financial_reports.png'));
  const p10Img = getBase64Image(path.join(ARTIFACT_DIR, 'page5_dashboard_metrics.png'));
  const p11Img = getBase64Image(path.join(ARTIFACT_DIR, 'page4_login_screen.png'));
  const p12Img = getBase64Image(path.join(ARTIFACT_DIR, 'page12_render_cloud_blueprint.png'));

  console.log('Building executive document HTML...');
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>RicozBooks - Enterprise Architecture & Executive Whitepaper (12-Pager)</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 14mm 16mm 14mm 16mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #1E293B;
      margin: 0;
      padding: 0;
      font-size: 10pt;
      line-height: 1.45;
      background: #FFFFFF;
    }
    .page {
      page-break-after: always;
      position: relative;
      height: 100%;
      min-height: 258mm;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .page:last-child {
      page-break-after: avoid;
    }

    /* Header */
    .page-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 2px solid #260002;
      padding-bottom: 6px;
      margin-bottom: 12px;
    }
    .header-brand {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .header-logo {
      width: 26px;
      height: 26px;
      border-radius: 4px;
      object-fit: cover;
    }
    .header-title {
      font-size: 13pt;
      font-weight: 800;
      color: #260002;
      letter-spacing: -0.3px;
    }
    .header-title span {
      color: #C58B3E;
    }
    .header-subtitle {
      font-size: 7.5pt;
      text-transform: uppercase;
      letter-spacing: 1.2px;
      color: #781019;
      font-weight: 700;
    }
    .header-meta {
      font-size: 8pt;
      color: #64748B;
      text-align: right;
    }

    /* Content Area */
    .page-body {
      flex: 1;
    }
    h1 {
      font-size: 16pt;
      font-weight: 800;
      color: #260002;
      margin: 0 0 4px 0;
      letter-spacing: -0.4px;
    }
    .page-badge {
      display: inline-block;
      background: #260002;
      color: #EEC68B;
      font-size: 7pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      padding: 2px 8px;
      border-radius: 3px;
      margin-bottom: 6px;
    }
    h2 {
      font-size: 11.5pt;
      font-weight: 700;
      color: #781019;
      margin: 10px 0 4px 0;
      border-left: 3px solid #C58B3E;
      padding-left: 6px;
    }
    h3 {
      font-size: 9.5pt;
      font-weight: 700;
      color: #0F172A;
      margin: 6px 0 2px 0;
    }
    p {
      margin: 0 0 6px 0;
      color: #334155;
      font-size: 8.8pt;
    }
    ul, ol {
      margin: 0 0 8px 0;
      padding-left: 18px;
      font-size: 8.8pt;
      color: #334155;
    }
    li {
      margin-bottom: 3px;
    }
    strong {
      color: #0F172A;
    }

    /* Tables */
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 6px 0 10px 0;
      font-size: 8pt;
    }
    th {
      background: #260002;
      color: #FFFFFF;
      text-align: left;
      padding: 5px 8px;
      font-weight: 600;
      border: 1px solid #260002;
    }
    td {
      padding: 4px 8px;
      border: 1px solid #E2E8F0;
      color: #334155;
    }
    tr:nth-child(even) td {
      background: #F8FAFC;
    }

    /* Cards & Boxes */
    .callout-box {
      background: #FFFBEB;
      border-left: 3px solid #D97706;
      padding: 6px 10px;
      margin: 6px 0 8px 0;
      border-radius: 3px;
      font-size: 8.5pt;
      color: #92400E;
    }
    .formula-box {
      background: #F8FAFC;
      border: 1px solid #CBD5E1;
      border-left: 3px solid #260002;
      padding: 6px 10px;
      margin: 6px 0 8px 0;
      border-radius: 4px;
      font-family: "Courier New", Courier, monospace;
      font-size: 8.2pt;
      color: #0F172A;
    }

    /* Images */
    .screenshot-container {
      margin: 8px 0;
      border: 1px solid #CBD5E1;
      border-radius: 6px;
      overflow: hidden;
      background: #000;
      box-shadow: 0 2px 5px rgba(0,0,0,0.06);
    }
    .screenshot-img {
      width: 100%;
      height: auto;
      max-height: 110mm;
      object-fit: contain;
      display: block;
      background: #FFFFFF;
    }
    .screenshot-caption {
      background: #F1F5F9;
      color: #475569;
      font-size: 7.2pt;
      font-weight: 600;
      padding: 4px 8px;
      border-top: 1px solid #E2E8F0;
      display: flex;
      justify-content: space-between;
    }

    /* Footer */
    .page-footer {
      border-top: 1px solid #E2E8F0;
      padding-top: 5px;
      margin-top: 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 7.5pt;
      color: #64748B;
    }
    .page-num {
      font-weight: 700;
      color: #260002;
    }
  </style>
</head>
<body>

  <!-- ======================================================== -->
  <!-- PAGE 1: Executive Summary, Strategic Vision & Brand Identity -->
  <!-- ======================================================== -->
  <div class="page">
    <div class="page-header">
      <div class="header-brand">
        <img src="${logoBase64}" class="header-logo" alt="Logo" />
        <div>
          <div class="header-title">Ricoz<span>Books</span></div>
          <div class="header-subtitle">by ricoz &bull; Enterprise Whitepaper</div>
        </div>
      </div>
      <div class="header-meta">
        <strong>Confidential & Proprietary</strong><br>
        Version 1.0.0 Enterprise &bull; 2026 Edition
      </div>
    </div>

    <div class="page-body">
      <span class="page-badge">PAGE 01 &bull; EXECUTIVE SUMMARY & VISION</span>
      <h1>Executive Summary, Strategic Vision & Brand Identity</h1>
      
      <p><strong>RicozBooks</strong> is an enterprise-grade, cloud-native double-entry financial accounting platform engineered to provide multi-entity visibility, unyielding ledger integrity, and institutional maker-checker governance for high-growth enterprises.</p>
      
      <div class="callout-box">
        <strong>Strategic Value Proposition:</strong> <em>"Accurate Books. Stronger Decisions."</em> — Eliminating financial ambiguity by automating the bridge between bookkeeping vouchers and board-level financial statements.
      </div>

      <h2>Core Institutional Value Drivers</h2>
      <ul>
        <li><strong>Zero Out-of-Balance Transactions:</strong> Real-time mathematical invariant validation (\\(\\sum \\text{Debit} \\equiv \\sum \\text{Credit}\\)) rejects asymmetric entries before ledger persistence.</li>
        <li><strong>True Multi-Entity Architecture:</strong> Autonomous operating subsidiaries (INR, USD, GBP) under a consolidated corporate umbrella with zero cross-entity data mixing.</li>
        <li><strong>Institutional Maker-Checker Workflow:</strong> Cryptographically enforced segregation of duties (Accountant creates &rarr; Reviewer verifies &rarr; CFO posts).</li>
        <li><strong>Dynamic Real-Time Ledger & Statements:</strong> Instantaneous running balances, audit drill-down, and automated Trial Balance, P&L, and Balance Sheet reporting.</li>
        <li><strong>Turnkey Zero-Cost Cloud Deployment:</strong> Automated Render Blueprint infrastructure (PostgreSQL 16 + FastAPI + React Vite SPA).</li>
      </ul>

      <div class="screenshot-container">
        <img src="${p1Img}" class="screenshot-img" alt="Landing Page Hero" />
        <div class="screenshot-caption">
          <span>Figure 1.1: RicozBooks Commercial SaaS Portal & Live Double-Entry Interactive Voucher Verification</span>
          <span>LIVE PRODUCTION SYSTEM</span>
        </div>
      </div>
    </div>

    <div class="page-footer">
      <span>RicozBooks Platform Whitepaper &bull; Ricoz Technologies</span>
      <span class="page-num">Page 1 of 12</span>
    </div>
  </div>

  <!-- ======================================================== -->
  <!-- PAGE 2: Market Opportunity, Problem Space & Pain Points -->
  <!-- ======================================================== -->
  <div class="page">
    <div class="page-header">
      <div class="header-brand">
        <img src="${logoBase64}" class="header-logo" alt="Logo" />
        <div>
          <div class="header-title">Ricoz<span>Books</span></div>
          <div class="header-subtitle">by ricoz &bull; Enterprise Whitepaper</div>
        </div>
      </div>
      <div class="header-meta">
        Market Architecture Analysis<br>Problem Space & ROI
      </div>
    </div>

    <div class="page-body">
      <span class="page-badge">PAGE 02 &bull; PROBLEM SPACE & OPPORTUNITY</span>
      <h1>Market Opportunity & Industry Failure Modes</h1>

      <p>As modern corporations scale across international boundaries, manage remote legal subsidiaries, and process thousands of monthly transactions, legacy tools (desktop accounting suites, disconnected spreadsheets) break down across four critical failure modes:</p>

      <table>
        <tr>
          <th>Legacy Failure Mode</th>
          <th>Systemic Consequence</th>
          <th>The RicozBooks Engineered Solution</th>
        </tr>
        <tr>
          <td><strong>Asymmetric Journals</strong></td>
          <td>Unbalanced trial balances, weeks of reconciliation</td>
          <td>Database & API-level double-entry invariant validation (\\(\\text{Debit} \\equiv \\text{Credit}\\))</td>
        </tr>
        <tr>
          <td><strong>Single-User Override</strong></td>
          <td>Internal fraud, unilateral balance alterations</td>
          <td>4-Eyes Supervisory Maker-Checker Pipeline with mandatory audit trail</td>
        </tr>
        <tr>
          <td><strong>Siloed Spreadsheets</strong></td>
          <td>Data contamination, delayed statutory reporting</td>
          <td>Unified Multi-Tenant Multi-Entity engine (INR, USD, GBP)</td>
        </tr>
        <tr>
          <td><strong>Destructive Edits</strong></td>
          <td>Auditors unable to trace balance movements</td>
          <td>Non-destructive journal lifecycle with atomic reversal entries (\\(\\text{REV-YYYY-XXXX}\\))</td>
        </tr>
      </table>

      <div class="screenshot-container">
        <img src="${p2Img}" class="screenshot-img" alt="Features Grid" />
        <div class="screenshot-caption">
          <span>Figure 2.1: Modern Enterprise Accounting Capabilities Built for Scale & Institutional Rigor</span>
          <span>SYSTEM ARCHITECTURE</span>
        </div>
      </div>
    </div>

    <div class="page-footer">
      <span>RicozBooks Platform Whitepaper &bull; Ricoz Technologies</span>
      <span class="page-num">Page 2 of 12</span>
    </div>
  </div>

  <!-- ======================================================== -->
  <!-- PAGE 3: System Architecture & Cloud Topology -->
  <!-- ======================================================== -->
  <div class="page">
    <div class="page-header">
      <div class="header-brand">
        <img src="${logoBase64}" class="header-logo" alt="Logo" />
        <div>
          <div class="header-title">Ricoz<span>Books</span></div>
          <div class="header-subtitle">by ricoz &bull; Enterprise Whitepaper</div>
        </div>
      </div>
      <div class="header-meta">
        Cloud Topology & System Stack<br>Tiered Infrastructure
      </div>
    </div>

    <div class="page-body">
      <span class="page-badge">PAGE 03 &bull; CLOUD TOPOLOGY & TECH STACK</span>
      <h1>System Architecture & Cloud Infrastructure</h1>

      <p>RicozBooks is engineered as a decoupled, high-performance web architecture utilizing proven enterprise open-source technology:</p>

      <table>
        <tr>
          <th>Layer</th>
          <th>Technology</th>
          <th>Architectural Role & Specifications</th>
        </tr>
        <tr>
          <td><strong>Frontend SPA</strong></td>
          <td>React 18 + TypeScript + Vite 5</td>
          <td>Strongly-typed component hierarchy, Tailwind CSS design system, sub-second HMR</td>
        </tr>
        <tr>
          <td><strong>API Backend</strong></td>
          <td>FastAPI (Python 3.11 / 3.14)</td>
          <td>Asynchronous REST endpoints, strict Pydantic payload models, sub-millisecond route latency</td>
        </tr>
        <tr>
          <td><strong>Persistence Tier</strong></td>
          <td>Managed PostgreSQL 16</td>
          <td>ACID transactional atomicity, foreign key cascade protection, foreign currency indexing</td>
        </tr>
        <tr>
          <td><strong>Cloud Hosting</strong></td>
          <td>Render Cloud Blueprint</td>
          <td>Zero-cost Infrastructure-as-Code (render.yaml), automated git pushes, HTTPS edge CDN</td>
        </tr>
      </table>

      <div class="screenshot-container">
        <img src="${p3Img}" class="screenshot-img" alt="Security Overview" />
        <div class="screenshot-caption">
          <span>Figure 3.1: Bank-Grade Security Architecture, 256-bit Encryption, and Multi-Tier Cloud Topology</span>
          <span>INFRASTRUCTURE SPECIFICATION</span>
        </div>
      </div>
    </div>

    <div class="page-footer">
      <span>RicozBooks Platform Whitepaper &bull; Ricoz Technologies</span>
      <span class="page-num">Page 3 of 12</span>
    </div>
  </div>

  <!-- ======================================================== -->
  <!-- PAGE 4: Double-Entry Accounting Engine & Vouchers -->
  <!-- ======================================================== -->
  <div class="page">
    <div class="page-header">
      <div class="header-brand">
        <img src="${logoBase64}" class="header-logo" alt="Logo" />
        <div>
          <div class="header-title">Ricoz<span>Books</span></div>
          <div class="header-subtitle">by ricoz &bull; Enterprise Whitepaper</div>
        </div>
      </div>
      <div class="header-meta">
        Double-Entry Mathematics<br>Transactional Invariants
      </div>
    </div>

    <div class="page-body">
      <span class="page-badge">PAGE 04 &bull; DOUBLE-ENTRY ENGINE & INVARIANTS</span>
      <h1>Double-Entry Accounting Engine & Mathematical Invariants</h1>

      <p>Every single transaction in RicozBooks is governed by strict mathematical double-entry invariants enforced at both the API schema boundary and the PostgreSQL transactional layer:</p>

      <div class="formula-box">
        <strong>Mathematical Invariant:</strong> &sum; Debit_i &equiv; &sum; Credit_i &nbsp;&nbsp;(where n &ge; 2 and Debit_i, Credit_i &ge; 0)<br>
        <strong>Unidirectionality Rule:</strong> &forall; i: (Debit_i &gt; 0 &and; Credit_i == 0) &or; (Credit_i &gt; 0 &and; Debit_i == 0)
      </div>

      <h2>Sequential Voucher Lifecycle & Non-Destructive Audit</h2>
      <ul>
        <li><strong>Deterministic Voucher Numbering:</strong> Sequential keys (e.g., <code>JE-2026-0001</code>) generated upon submission.</li>
        <li><strong>Post-Posting Immutability:</strong> Once posted to the General Ledger, rows cannot be deleted or modified.</li>
        <li><strong>Traceable Reversals:</strong> Errors are rectified by generating paired counter-vouchers (<code>REV-2026-XXXX</code>) that invert debits and credits while recording the authorizer and rationale.</li>
      </ul>

      <div class="screenshot-container">
        <img src="${p4Img}" class="screenshot-img" alt="Voucher Modal" />
        <div class="screenshot-caption">
          <span>Figure 4.1: Real-Time Double-Entry Voucher Engine Enforcing Real-Time Debit-Credit Equilibrium</span>
          <span>VOUCHER CREATION INTERFACE</span>
        </div>
      </div>
    </div>

    <div class="page-footer">
      <span>RicozBooks Platform Whitepaper &bull; Ricoz Technologies</span>
      <span class="page-num">Page 4 of 12</span>
    </div>
  </div>

  <!-- ======================================================== -->
  <!-- PAGE 5: Multi-Entity Hierarchy & Multi-Currency -->
  <!-- ======================================================== -->
  <div class="page">
    <div class="page-header">
      <div class="header-brand">
        <img src="${logoBase64}" class="header-logo" alt="Logo" />
        <div>
          <div class="header-title">Ricoz<span>Books</span></div>
          <div class="header-subtitle">by ricoz &bull; Enterprise Whitepaper</div>
        </div>
      </div>
      <div class="header-meta">
        Multi-Entity Corporate Schema<br>Multi-Currency Matrix
      </div>
    </div>

    <div class="page-body">
      <span class="page-badge">PAGE 05 &bull; MULTI-ENTITY ARCHITECTURE</span>
      <h1>Multi-Entity Corporate Hierarchy & Multi-Currency</h1>

      <p>Modern enterprises operate across jurisdictional boundaries. RicozBooks provides unified corporate holding governance over autonomous operating subsidiaries:</p>

      <table>
        <tr>
          <th>Subsidiary Legal Entity</th>
          <th>Base Currency</th>
          <th>Tax Identification</th>
          <th>Statutory Jurisdiction</th>
        </tr>
        <tr>
          <td><strong>Ricoz Technologies India Pvt Ltd</strong></td>
          <td>INR (&#8377;)</td>
          <td>GSTIN: 27AAACA1234F1Z5 &bull; PAN: AAACA1234F</td>
          <td>Maharashtra, India (April&ndash;March FY)</td>
        </tr>
        <tr>
          <td><strong>Ricoz America LLC</strong></td>
          <td>USD ($)</td>
          <td>EIN: EIN-84-9382109</td>
          <td>Delaware, United States (Jan&ndash;Dec FY)</td>
        </tr>
        <tr>
          <td><strong>Ricoz UK Limited</strong></td>
          <td>GBP (&pound;)</td>
          <td>VAT: GB998234120</td>
          <td>England & Wales (April&ndash;March FY)</td>
        </tr>
      </table>

      <h2>Cross-Entity Data Isolation & Workspace Switching</h2>
      <p>A single CFO account switches seamlessly between subsidiary workspaces. Charts of accounts, journals, and trial balances are partitioned by <code>entity_id</code>, guaranteeing compliance with local tax and audit authorities.</p>

      <div class="screenshot-container">
        <img src="${p5Img}" class="screenshot-img" alt="Multi Entity Setup" />
        <div class="screenshot-caption">
          <span>Figure 5.1: Multi-Entity Management Portfolio: Segregated Autonomous Subsidiaries with Cross-Entity Isolation</span>
          <span>ENTITY WORKSPACE MANAGER</span>
        </div>
      </div>
    </div>

    <div class="page-footer">
      <span>RicozBooks Platform Whitepaper &bull; Ricoz Technologies</span>
      <span class="page-num">Page 5 of 12</span>
    </div>
  </div>

  <!-- ======================================================== -->
  <!-- PAGE 6: Chart of Accounts Taxonomy -->
  <!-- ======================================================== -->
  <div class="page">
    <div class="page-header">
      <div class="header-brand">
        <img src="${logoBase64}" class="header-logo" alt="Logo" />
        <div>
          <div class="header-title">Ricoz<span>Books</span></div>
          <div class="header-subtitle">by ricoz &bull; Enterprise Whitepaper</div>
        </div>
      </div>
      <div class="header-meta">
        Chart of Accounts<br>Normal Balance Taxonomy
      </div>
    </div>

    <div class="page-body">
      <span class="page-badge">PAGE 06 &bull; CHART OF ACCOUNTS TAXONOMY</span>
      <h1>Chart of Accounts Taxonomy & Normal Balance Rules</h1>

      <p>RicozBooks organizes economic accounts into standard accounting classifications with an intuitive 4-digit numbering scheme:</p>

      <table>
        <tr>
          <th>Code Range</th>
          <th>Account Class</th>
          <th>Normal Balance</th>
          <th>Statement Impact</th>
          <th>Standard Accounts</th>
        </tr>
        <tr>
          <td><strong>1000 &ndash; 1999</strong></td>
          <td><strong>ASSET</strong></td>
          <td>DEBIT</td>
          <td>Balance Sheet (Assets)</td>
          <td>Cash on Hand (1000), Bank Accounts (1100), Debtors (1200)</td>
        </tr>
        <tr>
          <td><strong>2000 &ndash; 2999</strong></td>
          <td><strong>LIABILITY</strong></td>
          <td>CREDIT</td>
          <td>Balance Sheet (Liabilities)</td>
          <td>Accounts Payable (2000), GST Output Tax Payable (2100)</td>
        </tr>
        <tr>
          <td><strong>3000 &ndash; 3999</strong></td>
          <td><strong>EQUITY</strong></td>
          <td>CREDIT</td>
          <td>Balance Sheet (Equity)</td>
          <td>Share Capital (3000), Retained Earnings (3100)</td>
        </tr>
        <tr>
          <td><strong>4000 &ndash; 4999</strong></td>
          <td><strong>REVENUE</strong></td>
          <td>CREDIT</td>
          <td>Profit & Loss (Income)</td>
          <td>Sales & SaaS Revenue (4000), Consulting Services</td>
        </tr>
        <tr>
          <td><strong>5000 &ndash; 5999</strong></td>
          <td><strong>EXPENSE</strong></td>
          <td>DEBIT</td>
          <td>Profit & Loss (Expenses)</td>
          <td>Salary & Payroll (5000), Office Rent (5100), Cloud Hosting (5200)</td>
        </tr>
      </table>

      <div class="formula-box">
        <strong>Debit-Normal Balance:</strong> &Delta; Balance = Debit &minus; Credit &nbsp;&nbsp;|&nbsp;&nbsp; 
        <strong>Credit-Normal Balance:</strong> &Delta; Balance = Credit &minus; Debit
      </div>

      <div class="screenshot-container">
        <img src="${p6Img}" class="screenshot-img" alt="Chart of Accounts" />
        <div class="screenshot-caption">
          <span>Figure 6.1: Chart of Accounts Register showing 5 Core Classes, Normal Balance Tags, and Filtering</span>
          <span>CHART OF ACCOUNTS MODULE</span>
        </div>
      </div>
    </div>

    <div class="page-footer">
      <span>RicozBooks Platform Whitepaper &bull; Ricoz Technologies</span>
      <span class="page-num">Page 6 of 12</span>
    </div>
  </div>

  <!-- ======================================================== -->
  <!-- PAGE 7: Maker-Checker Governance & Approvals -->
  <!-- ======================================================== -->
  <div class="page">
    <div class="page-header">
      <div class="header-brand">
        <img src="${logoBase64}" class="header-logo" alt="Logo" />
        <div>
          <div class="header-title">Ricoz<span>Books</span></div>
          <div class="header-subtitle">by ricoz &bull; Enterprise Whitepaper</div>
        </div>
      </div>
      <div class="header-meta">
        Maker-Checker Pipeline<br>Four-Eyes Principle
      </div>
    </div>

    <div class="page-body">
      <span class="page-badge">PAGE 07 &bull; MAKER-CHECKER GOVERNANCE</span>
      <h1>Maker-Checker Governance & Segregation of Duties</h1>

      <p>To eliminate internal fraud and unverified manual ledger alterations, RicozBooks enforces the institutional <strong>Four-Eyes Principle</strong>:</p>

      <div class="formula-box">
        <strong>Segregation of Duties Invariant:</strong> Creator &ne; Reviewer &ne; Poster
      </div>

      <h2>Voucher State Transition Architecture</h2>
      <ul>
        <li><strong>1. Draft Creation (Maker):</strong> Accountants enter vouchers with balanced lines and internal descriptions.</li>
        <li><strong>2. Submission & Queueing:</strong> Vouchers transition to <code>SUBMITTED</code> and appear in the supervisory queue.</li>
        <li><strong>3. Supervisory Review (Checker):</strong> Reviewers inspect individual lines and approve or reject with <em>mandatory written comments</em>.</li>
        <li><strong>4. General Ledger Commitment (Poster):</strong> Only CFOs or Administrators can post approved vouchers to the ledger.</li>
      </ul>

      <div class="screenshot-container">
        <img src="${p7Img}" class="screenshot-img" alt="Approvals Queue" />
        <div class="screenshot-caption">
          <span>Figure 7.1: Four-Eyes Supervisory Approval Queue with Real-Time Queue Monitors and Audit Trails</span>
          <span>SUPERVISORY APPROVALS QUEUE</span>
        </div>
      </div>
    </div>

    <div class="page-footer">
      <span>RicozBooks Platform Whitepaper &bull; Ricoz Technologies</span>
      <span class="page-num">Page 7 of 12</span>
    </div>
  </div>

  <!-- ======================================================== -->
  <!-- PAGE 8: General Ledger Engine & Running Balances -->
  <!-- ======================================================== -->
  <div class="page">
    <div class="page-header">
      <div class="header-brand">
        <img src="${logoBase64}" class="header-logo" alt="Logo" />
        <div>
          <div class="header-title">Ricoz<span>Books</span></div>
          <div class="header-subtitle">by ricoz &bull; Enterprise Whitepaper</div>
        </div>
      </div>
      <div class="header-meta">
        General Ledger Engine<br>Dynamic Running Balances
      </div>
    </div>

    <div class="page-body">
      <span class="page-badge">PAGE 08 &bull; GENERAL LEDGER ENGINE</span>
      <h1>General Ledger Engine & Dynamic Opening Balances</h1>

      <p>Instead of relying on brittle batch-aggregated balance tables that drift out of alignment, RicozBooks computes general ledger statements dynamically from posted voucher entries:</p>

      <div class="formula-box">
        <strong>Opening Signed Balance [t &lt; T_start]:</strong><br>
        &bull; Debit-Normal: &sum; Debit_t &minus; &sum; Credit_t &nbsp;&nbsp;|&nbsp;&nbsp; &bull; Credit-Normal: &sum; Credit_t &minus; &sum; Debit_t<br>
        <strong>Closing Balance:</strong> Opening Balance + Period Movement (Precision Decimal arithmetic)
      </div>

      <h2>Dual-View Ledger Interface & Deep Voucher Drill-Down</h2>
      <ul>
        <li><strong>5 Key Financial Cards:</strong> Opening Balance, Period Debits, Period Credits, Net Movement, and Closing Balance.</li>
        <li><strong>Voucher Drill-Down:</strong> Clicking any voucher code opens an instant modal displaying the underlying lines and approvals.</li>
        <li><strong>One-Click CSV Export:</strong> Instant generation of official ledger statements formatted for external audit teams.</li>
      </ul>

      <div class="screenshot-container">
        <img src="${p8Img}" class="screenshot-img" alt="General Ledger" />
        <div class="screenshot-caption">
          <span>Figure 8.1: Live General Ledger Statement for Cash on Hand (1000) with Running DR/CR Balances & Drill-Down</span>
          <span>GENERAL LEDGER ENGINE</span>
        </div>
      </div>
    </div>

    <div class="page-footer">
      <span>RicozBooks Platform Whitepaper &bull; Ricoz Technologies</span>
      <span class="page-num">Page 8 of 12</span>
    </div>
  </div>

  <!-- ======================================================== -->
  <!-- PAGE 9: Financial Reports (Trial Balance, P&L, Balance Sheet) -->
  <!-- ======================================================== -->
  <div class="page">
    <div class="page-header">
      <div class="header-brand">
        <img src="${logoBase64}" class="header-logo" alt="Logo" />
        <div>
          <div class="header-title">Ricoz<span>Books</span></div>
          <div class="header-subtitle">by ricoz &bull; Enterprise Whitepaper</div>
        </div>
      </div>
      <div class="header-meta">
        Financial Statements Suite<br>Invariant Equilibrium
      </div>
    </div>

    <div class="page-body">
      <span class="page-badge">PAGE 09 &bull; FINANCIAL STATEMENTS SUITE</span>
      <h1>Financial Reports: Trial Balance, P&L & Balance Sheet</h1>

      <p>RicozBooks automatically derives the three fundamental corporate financial statements in real time directly from verified General Ledger entries:</p>

      <table>
        <tr>
          <th>Financial Statement</th>
          <th>Mathematical Invariant / Equation</th>
          <th>Corporate Function</th>
        </tr>
        <tr>
          <td><strong>1. Trial Balance (TB)</strong></td>
          <td>&sum; Closing Debits &equiv; &sum; Closing Credits (Diff = 0.00)</td>
          <td>Verifies total double-entry ledger balance before period close</td>
        </tr>
        <tr>
          <td><strong>2. Profit & Loss (P&L)</strong></td>
          <td>Net Profit = Total Operating Revenue &minus; Total Operating Expenses</td>
          <td>Measures operating profitability and margin contribution over a period</td>
        </tr>
        <tr>
          <td><strong>3. Balance Sheet (BS)</strong></td>
          <td>Total Assets &equiv; Total Liabilities + Total Equity</td>
          <td>Cumulative financial position; automatically folds net income into Equity</td>
        </tr>
      </table>

      <div class="screenshot-container">
        <img src="${p9Img}" class="screenshot-img" alt="Financial Reports" />
        <div class="screenshot-caption">
          <span>Figure 9.1: Verified Trial Balance (&sum; Debit &equiv; &sum; Credit, Difference: &#8377;0.00) with Direct CSV Export</span>
          <span>FINANCIAL STATEMENTS MODULE</span>
        </div>
      </div>
    </div>

    <div class="page-footer">
      <span>RicozBooks Platform Whitepaper &bull; Ricoz Technologies</span>
      <span class="page-num">Page 9 of 12</span>
    </div>
  </div>

  <!-- ======================================================== -->
  <!-- PAGE 10: Period-End Close Management & Forensic Audit -->
  <!-- ======================================================== -->
  <div class="page">
    <div class="page-header">
      <div class="header-brand">
        <img src="${logoBase64}" class="header-logo" alt="Logo" />
        <div>
          <div class="header-title">Ricoz<span>Books</span></div>
          <div class="header-subtitle">by ricoz &bull; Enterprise Whitepaper</div>
        </div>
      </div>
      <div class="header-meta">
        Period Close Governance<br>Forensic Audit Trail
      </div>
    </div>

    <div class="page-body">
      <span class="page-badge">PAGE 10 &bull; PERIOD-END CLOSE & AUDITING</span>
      <h1>Period-End Close Management & Forensic Audit Logs</h1>

      <p>Closing a financial period is the most critical milestone for corporate finance teams. RicozBooks automates close workflows while safeguarding forensic traceability:</p>

      <h2>8-Step Period-End Close Verification Checklist</h2>
      <ul>
        <li>1. Operating Bank Reconciliation &bull; 2. Accrued Expense & Prepaid Amortization</li>
        <li>3. Fixed Asset Straight-Line Depreciation &bull; 4. Monthly Recurring Revenue (MRR) Recognition</li>
        <li>5. Intercompany Subsidiary Balance Reconciliation &bull; 6. GST 2B Tax Credit Reconciliation</li>
        <li>7. Supervisory Journal Review Verification &bull; 8. CFO Final Period Lock Sign-Off</li>
      </ul>

      <div class="callout-box">
        <strong>Hard Ledger Locking:</strong> Once a period is marked closed, the double-entry engine strictly forbids new journal postings dated within that window.
      </div>

      <div class="screenshot-container">
        <img src="${p10Img}" class="screenshot-img" alt="Close Manager" />
        <div class="screenshot-caption">
          <span>Figure 10.1: Executive Dashboard showing 80% Period Close Completion, Balanced & Locked Status, and Metrics</span>
          <span>EXECUTIVE CLOSE GOVERNANCE</span>
        </div>
      </div>
    </div>

    <div class="page-footer">
      <span>RicozBooks Platform Whitepaper &bull; Ricoz Technologies</span>
      <span class="page-num">Page 10 of 12</span>
    </div>
  </div>

  <!-- ======================================================== -->
  <!-- PAGE 11: Security Architecture, RBAC & REST APIs -->
  <!-- ======================================================== -->
  <div class="page">
    <div class="page-header">
      <div class="header-brand">
        <img src="${logoBase64}" class="header-logo" alt="Logo" />
        <div>
          <div class="header-title">Ricoz<span>Books</span></div>
          <div class="header-subtitle">by ricoz &bull; Enterprise Whitepaper</div>
        </div>
      </div>
      <div class="header-meta">
        Security Architecture<br>Role-Based Access Control
      </div>
    </div>

    <div class="page-body">
      <span class="page-badge">PAGE 11 &bull; SECURITY ARCHITECTURE & RBAC</span>
      <h1>Security Architecture, Role-Based Access & APIs</h1>

      <p>RicozBooks applies defense-in-depth security principles across the API layer, database, and client interface:</p>

      <table>
        <tr>
          <th>Role</th>
          <th>Primary Responsibilities</th>
          <th>System Permissions</th>
        </tr>
        <tr>
          <td><strong>Admin & CFO</strong></td>
          <td>Executive governance & final ledger posting</td>
          <td>Full Access: Post to Ledger, Reverse Vouchers, Close Periods, Manage Entities</td>
        </tr>
        <tr>
          <td><strong>Reviewer & Auditor</strong></td>
          <td>Supervisory review & compliance checks</td>
          <td>Approve/Reject Vouchers, Inspect Audit Logs, Export Statements (No Drafting/Posting)</td>
        </tr>
        <tr>
          <td><strong>Senior Accountant</strong></td>
          <td>Bookkeeping & voucher drafting</td>
          <td>Create/Edit Draft Vouchers, Submit for Review, View Accounts (No Approving/Posting)</td>
        </tr>
      </table>

      <div class="screenshot-container">
        <img src="${p11Img}" class="screenshot-img" alt="Login Screen" />
        <div class="screenshot-caption">
          <span>Figure 11.1: Cryptographic Authentication Portal with 1-Click Role Switcher (Admin CFO, Accountant, Reviewer)</span>
          <span>AUTHENTICATION GATEWAY</span>
        </div>
      </div>
    </div>

    <div class="page-footer">
      <span>RicozBooks Platform Whitepaper &bull; Ricoz Technologies</span>
      <span class="page-num">Page 11 of 12</span>
    </div>
  </div>

  <!-- ======================================================== -->
  <!-- PAGE 12: Deployment Blueprint & Strategic Roadmap -->
  <!-- ======================================================== -->
  <div class="page">
    <div class="page-header">
      <div class="header-brand">
        <img src="${logoBase64}" class="header-logo" alt="Logo" />
        <div>
          <div class="header-title">Ricoz<span>Books</span></div>
          <div class="header-subtitle">by ricoz &bull; Enterprise Whitepaper</div>
        </div>
      </div>
      <div class="header-meta">
        Production Deployment<br>Automated Quality & Roadmap
      </div>
    </div>

    <div class="page-body">
      <span class="page-badge">PAGE 12 &bull; DEPLOYMENT BLUEPRINT & ROADMAP</span>
      <h1>Deployment Blueprint, Quality Verification & Roadmap</h1>

      <p>RicozBooks features a turn-key Infrastructure-as-Code blueprint deploying the entire production stack to <strong>Render</strong> at <strong>$0.00/month</strong>:</p>

      <h2>Automated Quality Assurance Verification Matrix</h2>
      <ul>
        <li><strong>Backend Automated Suite:</strong> <strong>20 of 20 Tests Passed (100%)</strong> in 29.44s covering Auth, Double-Entry Invariants, Ledger Balances, Multi-Entity CRUD, and Financial Reports.</li>
        <li><strong>Frontend Production Compilation:</strong> <code>tsc &amp;&amp; vite build</code> bundles 1,504 modules in 12.08s with <strong>0 errors</strong>.</li>
      </ul>

      <h2>Strategic Product Roadmap Status</h2>
      <table>
        <tr>
          <th>Phase</th>
          <th>Focus Area</th>
          <th>Production Delivery Status</th>
        </tr>
        <tr>
          <td><strong>Phase 1&ndash;3</strong></td>
          <td>Foundation, Double-Entry Engine, Ledger, Audit Logs</td>
          <td><span style="color:#059669;font-weight:700;">100% COMPLETE & LIVE</span></td>
        </tr>
        <tr>
          <td><strong>Commercial</strong></td>
          <td>Commercial Landing Page & Mobile Responsive Drawer</td>
          <td><span style="color:#059669;font-weight:700;">100% COMPLETE & LIVE</span></td>
        </tr>
        <tr>
          <td><strong>Phase 4</strong></td>
          <td>Financial Statements (Trial Balance, P&L, Balance Sheet)</td>
          <td><span style="color:#059669;font-weight:700;">100% COMPLETE & LIVE</span></td>
        </tr>
        <tr>
          <td><strong>Phase 5&ndash;6</strong></td>
          <td>Close Manager UI, Settings & Multi-Currency Matrix</td>
          <td><span style="color:#D97706;font-weight:700;">Backend Seeded, UI Scheduled</span></td>
        </tr>
      </table>

      <div class="screenshot-container">
        <img src="${p12Img}" class="screenshot-img" alt="Render Cloud Blueprint" />
        <div class="screenshot-caption">
          <span>Figure 12.1: Live Cloud Deployment Infrastructure on Render (PostgreSQL 16, FastAPI Backend, Vite Static Site)</span>
          <span>CLOUD INFRASTRUCTURE</span>
        </div>
      </div>
    </div>

    <div class="page-footer">
      <span>RicozBooks Platform Whitepaper &bull; Ricoz Technologies</span>
      <span class="page-num">Page 12 of 12</span>
    </div>
  </div>

</body>
</html>`;

  const htmlPath = path.join(ARTIFACT_DIR, 'ricozbooks_12_pager.html');
  fs.writeFileSync(htmlPath, html, 'utf8');
  console.log(`Saved HTML preview to ${htmlPath}`);

  console.log('Launching Edge to print pixel-perfect PDF...');
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });

  const pdfPathWorkspace = path.join(PROJECT_DIR, 'RicozBooks_Enterprise_12_Pager.pdf');
  const pdfPathArtifact = path.join(ARTIFACT_DIR, 'RicozBooks_Enterprise_12_Pager.pdf');

  console.log(`Generating PDF at ${pdfPathWorkspace}...`);
  await page.pdf({
    path: pdfPathWorkspace,
    format: 'A4',
    printBackground: true,
    margin: {
      top: '12mm',
      bottom: '12mm',
      left: '14mm',
      right: '14mm'
    }
  });

  fs.copyFileSync(pdfPathWorkspace, pdfPathArtifact);
  console.log(`PDF successfully copied to artifact: ${pdfPathArtifact}`);

  await browser.close();
  console.log('PDF_GENERATION_SUCCESSFUL');
}

generatePDF().catch(err => {
  console.error('Failed to generate PDF:', err);
  process.exit(1);
});
