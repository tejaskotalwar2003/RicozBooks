import os
import sys
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE

def create_deck():
    prs = Presentation()
    # 16:9 Widescreen (13.333 x 7.5 inches)
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)

    # Color Palette
    BG_DARK = RGBColor(11, 15, 25)         # #0B0F19 (Deep Obsidian)
    BG_CARD = RGBColor(17, 24, 39)         # #111827 (Card Dark)
    BG_LIGHT = RGBColor(248, 250, 252)     # #F8FAFC (Clean Off-White)
    CARD_WHITE = RGBColor(255, 255, 255)   # #FFFFFF
    CARD_BORDER = RGBColor(226, 232, 240)  # #E2E8F0
    TEXT_MAIN = RGBColor(15, 23, 42)       # #0F172A (Slate 900)
    TEXT_MUTED = RGBColor(100, 116, 139)   # #64748B (Slate 500)
    TEXT_WHITE = RGBColor(255, 255, 255)
    TEXT_LIGHT_MUTED = RGBColor(148, 163, 184) # #94A3B8
    ACCENT_INDIGO = RGBColor(99, 102, 241) # #6366F1
    ACCENT_BURGUNDY = RGBColor(120, 16, 25)# #781019
    ACCENT_EMERALD = RGBColor(16, 185, 129)# #10B981
    ACCENT_AMBER = RGBColor(245, 158, 11)  # #F59E0B
    BADGE_GREEN_BG = RGBColor(209, 250, 229) # Emerald 100
    BADGE_GREEN_TXT = RGBColor(6, 95, 70)    # Emerald 800
    BADGE_BLUE_BG = RGBColor(224, 231, 255)  # Indigo 100
    BADGE_BLUE_TXT = RGBColor(49, 46, 129)   # Indigo 900

    blank_layout = prs.slide_layouts[6]

    def set_slide_bg(slide, color):
        bg = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, prs.slide_height)
        bg.fill.solid()
        bg.fill.fore_color.rgb = color
        bg.line.fill.background()
        return bg

    def add_header(slide, tag_text, title_prefix, title_highlight, title_suffix=""):
        # Header Tag
        tb_tag = slide.shapes.add_textbox(Inches(0.8), Inches(0.5), Inches(11.7), Inches(0.4))
        tf_tag = tb_tag.text_frame
        tf_tag.word_wrap = True
        p_tag = tf_tag.paragraphs[0]
        p_tag.text = tag_text.upper()
        p_tag.font.size = Pt(10)
        p_tag.font.bold = True
        p_tag.font.color.rgb = ACCENT_INDIGO

        # Main Title
        tb_title = slide.shapes.add_textbox(Inches(0.8), Inches(0.85), Inches(11.7), Inches(0.8))
        tf_title = tb_title.text_frame
        tf_title.word_wrap = True
        p_title = tf_title.paragraphs[0]
        
        r1 = p_title.add_run()
        r1.text = title_prefix + " "
        r1.font.size = Pt(24)
        r1.font.bold = True
        r1.font.color.rgb = TEXT_MAIN

        r2 = p_title.add_run()
        r2.text = title_highlight + " "
        r2.font.size = Pt(24)
        r2.font.bold = True
        r2.font.color.rgb = ACCENT_INDIGO

        if title_suffix:
            r3 = p_title.add_run()
            r3.text = title_suffix
            r3.font.size = Pt(24)
            r3.font.bold = True
            r3.font.color.rgb = TEXT_MAIN

    # ==========================================
    # SLIDE 1: COVER (Dark Theme)
    # ==========================================
    slide1 = prs.slides.add_slide(blank_layout)
    set_slide_bg(slide1, BG_DARK)

    # Subtitle tag
    tb = slide1.shapes.add_textbox(Inches(1.5), Inches(2.2), Inches(10.33), Inches(0.5))
    p = tb.text_frame.paragraphs[0]
    p.text = "RICOZ INNOVATION • INVESTOR PRESENTATION 2026"
    p.alignment = PP_ALIGN.CENTER
    p.font.size = Pt(11)
    p.font.bold = True
    p.font.color.rgb = ACCENT_INDIGO

    # Brand Title
    tb = slide1.shapes.add_textbox(Inches(1.5), Inches(2.8), Inches(10.33), Inches(1.2))
    p = tb.text_frame.paragraphs[0]
    r1 = p.add_run()
    r1.text = "Ricoz"
    r1.font.size = Pt(56)
    r1.font.bold = True
    r1.font.color.rgb = TEXT_WHITE
    r2 = p.add_run()
    r2.text = "Books"
    r2.font.size = Pt(56)
    r2.font.bold = True
    r2.font.color.rgb = ACCENT_INDIGO
    p.alignment = PP_ALIGN.CENTER

    # Value Statement
    tb = slide1.shapes.add_textbox(Inches(1.5), Inches(4.1), Inches(10.33), Inches(0.6))
    p = tb.text_frame.paragraphs[0]
    p.text = "The Financial Operating Platform for Growing Multi-Entity Businesses"
    p.alignment = PP_ALIGN.CENTER
    p.font.size = Pt(20)
    p.font.bold = True
    p.font.color.rgb = TEXT_WHITE

    tb = slide1.shapes.add_textbox(Inches(1.5), Inches(4.7), Inches(10.33), Inches(0.5))
    p = tb.text_frame.paragraphs[0]
    p.text = "Complete Double-Entry General Ledger, Indian GST Suite, and Four-Eyes Financial Governance."
    p.alignment = PP_ALIGN.CENTER
    p.font.size = Pt(13)
    p.font.color.rgb = TEXT_LIGHT_MUTED

    # Proof Badges
    badges = [
        "✓ 22 Modules Fully Built",
        "✓ 48/48 Test Suite Passing",
        "✓ Multi-Entity & GSTN Ready",
        "✓ Live on Render Cloud"
    ]
    bx = 1.6
    for b_text in badges:
        card = slide1.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(bx), Inches(5.6), Inches(2.35), Inches(0.55))
        card.fill.solid()
        card.fill.fore_color.rgb = BG_CARD
        card.line.color.rgb = ACCENT_INDIGO
        tf = card.text_frame
        p = tf.paragraphs[0]
        p.text = b_text
        p.alignment = PP_ALIGN.CENTER
        p.font.size = Pt(10)
        p.font.bold = True
        p.font.color.rgb = TEXT_WHITE
        bx += 2.55

    # ==========================================
    # SLIDE 2: THE PROBLEM
    # ==========================================
    slide2 = prs.slides.add_slide(blank_layout)
    set_slide_bg(slide2, BG_LIGHT)
    add_header(slide2, "01 — THE PROBLEM", "Financial Complexity Stalls", "Growing Businesses")

    prob_cards = [
        ("Fragmented Operations", "Growing businesses manage multiple entities, customers, vendors, and taxes across disconnected apps and spreadsheets, creating critical data blind spots and reconciliation delays.", "Multiple disparate tools"),
        ("Internal Control Failures", "Entry-level accounting software lacks separation of duties. Any user can post or edit transactions retroactively, leading to audit vulnerabilities, fraud risks, and tax penalties.", "Zero maker-checker logic"),
        ("Scaling & Compliance Friction", "Scaling companies outgrow simple invoicing tools but cannot afford rigid, multi-crore legacy enterprise ERPs that take 9+ months to deploy and lack native Indian GST compliance.", "Trapped between tools")
    ]
    cx = 0.8
    for title, desc, tag in prob_cards:
        card = slide2.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(cx), Inches(1.8), Inches(3.64), Inches(4.3))
        card.fill.solid()
        card.fill.fore_color.rgb = CARD_WHITE
        card.line.color.rgb = CARD_BORDER
        
        tb = slide2.shapes.add_textbox(Inches(cx + 0.3), Inches(2.2), Inches(3.04), Inches(3.5))
        tf = tb.text_frame
        tf.word_wrap = True
        
        p = tf.paragraphs[0]
        p.text = tag.upper()
        p.font.size = Pt(9)
        p.font.bold = True
        p.font.color.rgb = ACCENT_BURGUNDY
        
        p2 = tf.add_paragraph()
        p2.text = title
        p2.font.size = Pt(17)
        p2.font.bold = True
        p2.font.color.rgb = TEXT_MAIN
        p2.space_before = Pt(8)
        
        p3 = tf.add_paragraph()
        p3.text = desc
        p3.font.size = Pt(11)
        p3.font.color.rgb = TEXT_MUTED
        p3.space_before = Pt(12)
        
        cx += 3.9

    # Bottom Takeaway Box
    bot = slide2.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(6.3), Inches(11.7), Inches(0.65))
    bot.fill.solid()
    bot.fill.fore_color.rgb = RGBColor(238, 242, 255)
    bot.line.color.rgb = ACCENT_INDIGO
    p = bot.text_frame.paragraphs[0]
    p.text = "💡 Market Imperative: Growing enterprises require modern double-entry precision with enterprise governance, without ERP bloat."
    p.alignment = PP_ALIGN.CENTER
    p.font.size = Pt(11)
    p.font.bold = True
    p.font.color.rgb = RGBColor(49, 46, 129)

    # ==========================================
    # SLIDE 3: OUR SOLUTION (MEET RICOZBOOKS)
    # ==========================================
    slide3 = prs.slides.add_slide(blank_layout)
    set_slide_bg(slide3, BG_LIGHT)
    add_header(slide3, "02 — OUR SOLUTION", "Meet", "RicozBooks", "— The Modern Financial Engine")

    # Left Column: Solution Highlights
    sol_cards = [
        ("Core Double-Entry GL", "Real-time debit-equals-credit invariant enforced at database layer. Zero mathematical balance drift."),
        ("Multi-Entity & Multi-Currency", "Seamless cross-subsidiary switching, consolidated reporting, and automated FX revaluation (INR/USD/EUR/GBP)."),
        ("Four-Eyes Governance", "Strict Maker-Checker separation: junior accountants draft vouchers, senior reviewers/CFOs approve."),
        ("Native Indian GST Suite", "GSTR-1, GSTR-3B B2B/B2C automated generation, HSN summary, and Input Tax Credit (ITC) reconciliation.")
    ]
    sy = 1.8
    for title, desc in sol_cards:
        card = slide3.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(sy), Inches(5.6), Inches(1.15))
        card.fill.solid()
        card.fill.fore_color.rgb = CARD_WHITE
        card.line.color.rgb = CARD_BORDER
        tf = card.text_frame
        tf.word_wrap = True
        p = tf.paragraphs[0]
        p.text = title
        p.font.size = Pt(12)
        p.font.bold = True
        p.font.color.rgb = ACCENT_INDIGO
        p2 = tf.add_paragraph()
        p2.text = desc
        p2.font.size = Pt(9.5)
        p2.font.color.rgb = TEXT_MUTED
        sy += 1.25

    # Right Column: Live Workbench Mockup Panel
    mock = slide3.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(6.7), Inches(1.8), Inches(5.8), Inches(4.9))
    mock.fill.solid()
    mock.fill.fore_color.rgb = CARD_WHITE
    mock.line.color.rgb = ACCENT_INDIGO
    tf = mock.text_frame
    tf.word_wrap = True
    
    p = tf.paragraphs[0]
    p.text = "RICOZBOOKS PRODUCT INTERFACE — LIVE PRODUCTION WORKBENCH"
    p.font.size = Pt(10)
    p.font.bold = True
    p.font.color.rgb = ACCENT_INDIGO

    p2 = tf.add_paragraph()
    p2.text = "Active Entity: Ricoz India Pvt Ltd (INR) • Status: Active & Balanced"
    p2.font.size = Pt(11)
    p2.font.bold = True
    p2.font.color.rgb = TEXT_MAIN
    p2.space_before = Pt(8)

    p3 = tf.add_paragraph()
    p3.text = "• General Ledger: Voucher #JE-2026-0042 (Balanced Δ = ₹0.00)\n• Tax Invoicing: #INV-2026-0881 (Posted to AR 1200, GST 18%)\n• GST Return Engine: GSTR-1 Ready (B2B Supplies ₹14,80,000)\n• Stock Ledger: FIFO Valuation Active (GL 1300 Sync)\n• Period Close Manager: Fiscal Period Locked & Signed Off"
    p3.font.size = Pt(11)
    p3.font.color.rgb = TEXT_MUTED
    p3.space_before = Pt(12)

    p4 = tf.add_paragraph()
    p4.text = "Live Deployments:\nWeb App: https://ricozbooks-web.onrender.com\nAPI Engine: https://ricozbooks-api.onrender.com"
    p4.font.size = Pt(10)
    p4.font.bold = True
    p4.font.color.rgb = ACCENT_EMERALD
    p4.space_before = Pt(16)

    # ==========================================
    # SLIDE 4: CORE PRODUCT ARCHITECTURE (CORRECTED: ALL BUILT)
    # ==========================================
    slide4 = prs.slides.add_slide(blank_layout)
    set_slide_bg(slide4, BG_LIGHT)
    add_header(slide4, "03 — CORE PRODUCT", "One Unified Platform for", "All Financial Operations", "(22 Modules Built)")

    cols = [
        ("Company & Multi-Entity", "BUILT & LIVE", BADGE_GREEN_BG, BADGE_GREEN_TXT, [
            "Self-serve tenant registration",
            "Multi-entity isolated ledgers",
            "Cryptographic user invitations",
            "Multi-currency FX matrix (4 FX)"
        ]),
        ("Core Double-Entry GL", "BUILT & LIVE", BADGE_GREEN_BG, BADGE_GREEN_TXT, [
            "Hierarchical Chart of Accounts",
            "Multi-line journal vouchers",
            "Strict Debit = Credit validation",
            "Tamper-proof audit logging"
        ]),
        ("Commercial Sales & AP", "BUILT & LIVE", BADGE_GREEN_BG, BADGE_GREEN_TXT, [
            "Estimates & Quotes to Invoices",
            "Sales Orders & Credit Notes",
            "Purchase Orders & Vendor Bills",
            "1-Click Document Conversion"
        ]),
        ("Tax, Recon & Reporting", "BUILT & LIVE", BADGE_GREEN_BG, BADGE_GREEN_TXT, [
            "Indian GSTR-1 & 3B Filing Engine",
            "Perpetual FIFO Stock & COGS",
            "Bank OFX/CSV Reconciliation",
            "Balance Sheet, P&L & Cash Flow"
        ])
    ]

    col_x = 0.8
    for title, badge_t, b_bg, b_txt, items in cols:
        card = slide4.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(col_x), Inches(1.8), Inches(2.72), Inches(5.1))
        card.fill.solid()
        card.fill.fore_color.rgb = CARD_WHITE
        card.line.color.rgb = CARD_BORDER

        tf = card.text_frame
        tf.word_wrap = True

        p = tf.paragraphs[0]
        p.text = badge_t
        p.font.size = Pt(8.5)
        p.font.bold = True
        p.font.color.rgb = b_txt

        p2 = tf.add_paragraph()
        p2.text = title
        p2.font.size = Pt(13)
        p2.font.bold = True
        p2.font.color.rgb = TEXT_MAIN
        p2.space_before = Pt(6)

        for itm in items:
            pi = tf.add_paragraph()
            pi.text = "✓ " + itm
            pi.font.size = Pt(10)
            pi.font.color.rgb = TEXT_MUTED
            pi.space_before = Pt(8)

        col_x += 2.98

    # ==========================================
    # SLIDE 5: PRODUCT SHOWCASE IN ACTION
    # ==========================================
    slide5 = prs.slides.add_slide(blank_layout)
    set_slide_bg(slide5, BG_LIGHT)
    add_header(slide5, "04 — PRODUCT SHOWCASE", "RicozBooks in Action", "— Production Engine")

    showcase_grid = [
        ("01 • Real-Time Dashboard", "Executive KPI cards: Total Revenue, Receivables, Payables, Net Operating Cashflow, and active bank balances across entities.", "BUILT & TESTED"),
        ("02 • Double-Entry Voucher Engine", "Multi-line journal drafting with real-time balance calculations, line narrations, document attachments, and zero-drift invariant.", "BUILT & TESTED"),
        ("03 • Sales & Procurement Hub", "Complete commercial flow: Estimates &rarr; Sales Orders &rarr; Invoices &rarr; Credit Notes, plus Purchase Orders &rarr; Vendor Bills &rarr; Debit Notes.", "BUILT & TESTED"),
        ("04 • Indian GST & E-Invoicing", "Native GSTR-1 & GSTR-3B generation, automated CGST/SGST/IGST determination, HSN/SAC code mapping, and ITC reconciliation.", "BUILT & TESTED"),
        ("05 • Banking & Reconciliation", "Bank statement upload (OFX/CSV), automated transaction categorization, and 1-click reconciliation against general ledger.", "BUILT & TESTED"),
        ("06 • Four-Eyes Period Lock", "Maker-checker approval queue, mandatory rejection reasons, and hard fiscal period lock preventing retroactive alterations.", "BUILT & TESTED")
    ]

    gx = 0.8
    gy = 1.8
    for i, (title, desc, badge) in enumerate(showcase_grid):
        card = slide5.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(gx), Inches(gy), Inches(3.64), Inches(2.25))
        card.fill.solid()
        card.fill.fore_color.rgb = CARD_WHITE
        card.line.color.rgb = CARD_BORDER

        tf = card.text_frame
        tf.word_wrap = True
        p = tf.paragraphs[0]
        p.text = badge
        p.font.size = Pt(8)
        p.font.bold = True
        p.font.color.rgb = ACCENT_EMERALD

        p2 = tf.add_paragraph()
        p2.text = title
        p2.font.size = Pt(12)
        p2.font.bold = True
        p2.font.color.rgb = TEXT_MAIN
        p2.space_before = Pt(4)

        p3 = tf.add_paragraph()
        p3.text = desc
        p3.font.size = Pt(9.5)
        p3.font.color.rgb = TEXT_MUTED
        p3.space_before = Pt(6)

        gx += 3.9
        if (i + 1) % 3 == 0:
            gx = 0.8
            gy += 2.55

    # Bottom proof
    b_bot = slide5.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(6.65), Inches(11.7), Inches(0.45))
    b_bot.fill.solid()
    b_bot.fill.fore_color.rgb = RGBColor(241, 245, 249)
    b_bot.line.color.rgb = CARD_BORDER
    p = b_bot.text_frame.paragraphs[0]
    p.text = "⚡ Built on FastAPI + PostgreSQL + React • 48 Automated Tests Passing • Zero Mathematical Imbalance Drift"
    p.alignment = PP_ALIGN.CENTER
    p.font.size = Pt(9.5)
    p.font.bold = True
    p.font.color.rgb = TEXT_MAIN

    # ==========================================
    # SLIDE 6: FINANCIAL GOVERNANCE & INTERNAL CONTROLS
    # ==========================================
    slide6 = prs.slides.add_slide(blank_layout)
    set_slide_bg(slide6, BG_LIGHT)
    add_header(slide6, "05 — FINANCIAL GOVERNANCE", "Accounting with", "Built-In Internal Controls")

    gov_cards = [
        ("Four-Eyes Maker-Checker", "Enforces strict segregation of duties. Junior accountants draft vouchers, but cannot post directly to the ledger. Senior Reviewers or CFOs verify and approve or reject with mandatory reasons.", "Segregation of Duties", [
            "Accountant prepares draft voucher",
            "Reviewer inspects line narrations",
            "Approved: Immutable ledger posting",
            "Rejected: Reason logged for revision"
        ]),
        ("Fiscal Period Close Lock", "Prevents accidental or unauthorized retroactive modifications to accounting records once closed. Once a period (e.g. August 2026) is locked, all backdated entries are strictly rejected at the database level.", "Tamper-Proof Lock", [
            "Monthly & quarterly close checklists",
            "Hard database-level entry block",
            "Cryptographic sign-off stamp",
            "Complies with statutory tax audits"
        ]),
        ("Controlled Emergency Reopening", "In statutory audit scenarios requiring retroactive adjustments, only authorized Administrators can reopen a closed period, requiring a mandatory justification note and recording permanent audit trails.", "Audited Exceptions", [
            "Admin-only permission barrier",
            "Mandatory justification reason",
            "Immutable audit log generated",
            "Signed reversing entry workflow"
        ])
    ]

    gx = 0.8
    for title, desc, tag, bullets in gov_cards:
        card = slide6.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(gx), Inches(1.8), Inches(3.64), Inches(4.5))
        card.fill.solid()
        card.fill.fore_color.rgb = CARD_WHITE
        card.line.color.rgb = CARD_BORDER

        tf = card.text_frame
        tf.word_wrap = True
        p = tf.paragraphs[0]
        p.text = tag.upper()
        p.font.size = Pt(8.5)
        p.font.bold = True
        p.font.color.rgb = ACCENT_BURGUNDY

        p2 = tf.add_paragraph()
        p2.text = title
        p2.font.size = Pt(14)
        p2.font.bold = True
        p2.font.color.rgb = TEXT_MAIN
        p2.space_before = Pt(6)

        p3 = tf.add_paragraph()
        p3.text = desc
        p3.font.size = Pt(10)
        p3.font.color.rgb = TEXT_MUTED
        p3.space_before = Pt(8)

        for b in bullets:
            pb = tf.add_paragraph()
            pb.text = "• " + b
            pb.font.size = Pt(9.5)
            pb.font.color.rgb = TEXT_MAIN
            pb.space_before = Pt(4)

        gx += 3.9

    bot = slide6.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(6.5), Inches(11.7), Inches(0.55))
    bot.fill.solid()
    bot.fill.fore_color.rgb = RGBColor(238, 242, 255)
    bot.line.color.rgb = ACCENT_INDIGO
    p = bot.text_frame.paragraphs[0]
    p.text = "🛡️ Designed for high-integrity enterprises preparing for external audit, bank financing, and statutory GST compliance."
    p.alignment = PP_ALIGN.CENTER
    p.font.size = Pt(10.5)
    p.font.bold = True
    p.font.color.rgb = RGBColor(49, 46, 129)

    # ==========================================
    # SLIDE 7: VALUE & CAPABILITY MATRIX
    # ==========================================
    slide7 = prs.slides.add_slide(blank_layout)
    set_slide_bg(slide7, BG_LIGHT)
    add_header(slide7, "06 — VALUE & CAPABILITY", "From Bookkeeping to", "Enterprise Financial Control")

    table_shape = slide7.shapes.add_table(8, 3, Inches(0.8), Inches(1.8), Inches(11.73), Inches(4.8))
    table = table_shape.table
    table.columns[0].width = Inches(3.2)
    table.columns[1].width = Inches(2.2)
    table.columns[2].width = Inches(6.33)

    headers = ["Platform Capability", "RicozBooks Status", "Architectural Implementation"]
    for i, h in enumerate(headers):
        cell = table.cell(0, i)
        cell.text = h
        cell.fill.solid()
        cell.fill.fore_color.rgb = RGBColor(241, 245, 249)
        p = cell.text_frame.paragraphs[0]
        p.font.bold = True
        p.font.size = Pt(11)
        p.font.color.rgb = TEXT_MAIN

    rows = [
        ("Multi-Entity & Multi-Currency", "✓ Fully Supported & Live", "Central organization umbrella managing isolated subsidiaries, base currencies (INR/USD/EUR/GBP), and FX."),
        ("Strict Double-Entry Core", "✓ Fully Supported & Live", "Debit-equals-credit invariant validated at DB level; impossible to commit unbalanced journals."),
        ("Four-Eyes Approval Workflow", "✓ Fully Supported & Live", "Maker-checker verification decoupling draft entry preparation from ledger posting with reasons."),
        ("Commercial Sales & Procurement", "✓ Fully Supported & Live", "Complete lifecycle: Estimates &rarr; Orders &rarr; Invoices &rarr; Credit Notes; POs &rarr; Bills &rarr; Debit Notes."),
        ("Indian GST & E-Invoicing Engine", "✓ Fully Supported & Live", "Automated GSTR-1 & 3B calculation, intra/inter-state tax splitting, and Input Tax Credit (ITC) checks."),
        ("Perpetual Stock Valuation", "✓ Fully Supported & Live", "FIFO & Weighted Average costing, reorder level alerts, and automated COGS ledger bookings."),
        ("Developer API & Outbound Webhooks", "✓ Fully Supported & Live", "RESTful API with OpenAPI/Swagger, Bearer authentication, and event webhooks for payment gateways.")
    ]

    for r_idx, (cap, stat, impl) in enumerate(rows, start=1):
        c0 = table.cell(r_idx, 0)
        c0.text = cap
        c0.text_frame.paragraphs[0].font.bold = True
        c0.text_frame.paragraphs[0].font.size = Pt(10)
        c0.text_frame.paragraphs[0].font.color.rgb = TEXT_MAIN

        c1 = table.cell(r_idx, 1)
        c1.text = stat
        c1.text_frame.paragraphs[0].font.bold = True
        c1.text_frame.paragraphs[0].font.size = Pt(10)
        c1.text_frame.paragraphs[0].font.color.rgb = ACCENT_EMERALD

        c2 = table.cell(r_idx, 2)
        c2.text = impl
        c2.text_frame.paragraphs[0].font.size = Pt(9.5)
        c2.text_frame.paragraphs[0].font.color.rgb = TEXT_MUTED

    # ==========================================
    # SLIDE 8: TECHNOLOGY ARCHITECTURE
    # ==========================================
    slide8 = prs.slides.add_slide(blank_layout)
    set_slide_bg(slide8, BG_LIGHT)
    add_header(slide8, "07 — TECHNOLOGY ARCHITECTURE", "High-Performance", "Full-Stack Architecture")

    # Security Ribbon
    ribbon = slide8.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(1.8), Inches(11.7), Inches(0.55))
    ribbon.fill.solid()
    ribbon.fill.fore_color.rgb = BG_DARK
    p = ribbon.text_frame.paragraphs[0]
    p.text = "🔒 SECURITY & GOVERNANCE: JWT Auth • RBAC Permissions • Multi-Tenant Isolation • Period Close Lock • Cryptographic Audit Trails"
    p.alignment = PP_ALIGN.CENTER
    p.font.size = Pt(10)
    p.font.bold = True
    p.font.color.rgb = RGBColor(238, 182, 118)

    # 4 Architecture Columns
    layers = [
        ("LAYER 01: Client Experience", "React 18 + Vite + Tailwind", [
            "Fast single-page application",
            "Interactive live ledger views",
            "Maker-checker approvals UI",
            "Mobile-responsive drawer nav",
            "Client-side CSV/PDF exports"
        ]),
        ("LAYER 02: REST API Engine", "Python 3.14 + FastAPI", [
            "Asynchronous request routing",
            "Auto-generated Swagger / OpenAPI",
            "Bearer token authentication",
            "Granular permission dependencies",
            "Real-time event webhooks"
        ]),
        ("LAYER 03: Financial Business Logic", "SQLAlchemy ORM + Domain Rules", [
            "Strict Debit = Credit validation",
            "FIFO perpetual inventory engine",
            "Indian GST tax computation",
            "Multi-currency FX revaluation",
            "Hard period lock enforcement"
        ]),
        ("LAYER 04: Database Storage", "PostgreSQL Relational DB", [
            "Multi-tenant schema boundaries",
            "Foreign key constraint integrity",
            "ACID transactional guarantees",
            "Automated continuous backups",
            "Full relational audit logs"
        ])
    ]

    lx = 0.8
    for title, tech, points in layers:
        card = slide8.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(lx), Inches(2.55), Inches(2.72), Inches(4.35))
        card.fill.solid()
        card.fill.fore_color.rgb = CARD_WHITE
        card.line.color.rgb = CARD_BORDER

        tf = card.text_frame
        tf.word_wrap = True
        p = tf.paragraphs[0]
        p.text = title
        p.font.size = Pt(11)
        p.font.bold = True
        p.font.color.rgb = ACCENT_INDIGO

        p2 = tf.add_paragraph()
        p2.text = tech
        p2.font.size = Pt(9.5)
        p2.font.bold = True
        p2.font.color.rgb = ACCENT_BURGUNDY
        p2.space_before = Pt(4)

        for pt in points:
            pi = tf.add_paragraph()
            pi.text = "• " + pt
            pi.font.size = Pt(9)
            pi.font.color.rgb = TEXT_MUTED
            pi.space_before = Pt(6)

        lx += 2.98

    # ==========================================
    # SLIDE 9: TARGET MARKET
    # ==========================================
    slide9 = prs.slides.add_slide(blank_layout)
    set_slide_bg(slide9, BG_LIGHT)
    add_header(slide9, "08 — TARGET MARKET", "Serving India's Booming", "SME Economy")

    # Left Card
    c_left = slide9.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(1.8), Inches(5.6), Inches(4.8))
    c_left.fill.solid()
    c_left.fill.fore_color.rgb = CARD_WHITE
    c_left.line.color.rgb = CARD_BORDER
    tf = c_left.text_frame
    tf.word_wrap = True

    p = tf.paragraphs[0]
    p.text = "MARKET LANDSCAPE"
    p.font.size = Pt(10)
    p.font.bold = True
    p.font.color.rgb = ACCENT_INDIGO

    p2 = tf.add_paragraph()
    p2.text = "India's Cloud Accounting Inflection"
    p2.font.size = Pt(18)
    p2.font.bold = True
    p2.font.color.rgb = TEXT_MAIN
    p2.space_before = Pt(6)

    p3 = tf.add_paragraph()
    p3.text = "Millions of Indian small and medium enterprises are transitioning from offline desktop software (e.g. Tally, Busy) to modern cloud financial platforms.\n\nKey Market Drivers:\n• Mandatory GST e-invoicing and digital compliance mandates\n• Proliferation of multi-branch & multi-subsidiary corporate structures\n• Need for remote founder, CFO, and CA collaboration\n• Rising demand for automated internal controls and audit-readiness"
    p3.font.size = Pt(11)
    p3.font.color.rgb = TEXT_MUTED
    p3.space_before = Pt(12)

    # Right Card
    c_right = slide9.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(6.8), Inches(1.8), Inches(5.7), Inches(4.8))
    c_right.fill.solid()
    c_right.fill.fore_color.rgb = CARD_WHITE
    c_right.line.color.rgb = CARD_BORDER
    tf = c_right.text_frame
    tf.word_wrap = True

    p = tf.paragraphs[0]
    p.text = "CUSTOMER SEGMENTS & MULTIPLIERS"
    p.font.size = Pt(10)
    p.font.bold = True
    p.font.color.rgb = ACCENT_INDIGO

    p2 = tf.add_paragraph()
    p2.text = "High-Growth Commercial Segments"
    p2.font.size = Pt(18)
    p2.font.bold = True
    p2.font.color.rgb = TEXT_MAIN
    p2.space_before = Pt(6)

    p3 = tf.add_paragraph()
    p3.text = "1. Trading & Distribution Businesses\nMulti-warehouse inventory, high transaction volumes, complex intra/inter-state GST rules.\n\n2. Professional Services & Tech Startups\nMulti-currency contracts (USD/INR), recurring billing, project profitability tracking.\n\n3. Chartered Accountant (CA) Advisory Firms\nOur ultimate growth multiplier: one CA firm manages 20 to 100+ SME client entities on RicozBooks with unified review dashboards."
    p3.font.size = Pt(11)
    p3.font.color.rgb = TEXT_MUTED
    p3.space_before = Pt(12)

    # ==========================================
    # SLIDE 10: BUSINESS MODEL & PRICING
    # ==========================================
    slide10 = prs.slides.add_slide(blank_layout)
    set_slide_bg(slide10, BG_LIGHT)
    add_header(slide10, "09 — BUSINESS MODEL", "Predictable B2B", "SaaS Subscription Model")

    tiers = [
        ("Starter", "₹ 999 / mo", "For single-entity small businesses needing core double-entry accounting.", [
            "1 Legal Business Entity",
            "Single-user bookkeeping",
            "Standard Chart of Accounts",
            "Basic Invoicing & Expenses",
            "Standard Trial Balance & P&L"
        ], False),
        ("Professional", "₹ 2,499 / mo", "For growing businesses requiring multi-user controls and GST compliance.", [
            "Up to 3 Legal Entities",
            "Up to 5 Users with RBAC",
            "Four-Eyes Approval Workflow",
            "Indian GST Returns (GSTR-1, 3B)",
            "FIFO Inventory & COGS Sync",
            "Bank Statement Reconciliation"
        ], True),
        ("Enterprise", "₹ 5,999 / mo", "For multi-entity corporations needing complete governance and custom APIs.", [
            "Unlimited Legal Entities",
            "Unlimited Users & Custom Roles",
            "Hard Period Close Locks",
            "Multi-Currency FX Revaluation",
            "Developer API & Webhooks",
            "Dedicated CA SLA & Support"
        ], False)
    ]

    tx = 0.8
    for name, price, desc, feats, is_pop in tiers:
        card = slide10.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(tx), Inches(1.8), Inches(3.64), Inches(4.3))
        card.fill.solid()
        card.fill.fore_color.rgb = CARD_WHITE
        card.line.color.rgb = ACCENT_INDIGO if is_pop else CARD_BORDER

        tf = card.text_frame
        tf.word_wrap = True

        p = tf.paragraphs[0]
        p.text = "MOST POPULAR" if is_pop else "PLANS"
        p.font.size = Pt(8.5)
        p.font.bold = True
        p.font.color.rgb = ACCENT_INDIGO if is_pop else TEXT_MUTED

        p2 = tf.add_paragraph()
        p2.text = name
        p2.font.size = Pt(18)
        p2.font.bold = True
        p2.font.color.rgb = TEXT_MAIN

        p3 = tf.add_paragraph()
        p3.text = price
        p3.font.size = Pt(15)
        p3.font.bold = True
        p3.font.color.rgb = ACCENT_BURGUNDY

        p4 = tf.add_paragraph()
        p4.text = desc
        p4.font.size = Pt(9.5)
        p4.font.color.rgb = TEXT_MUTED
        p4.space_before = Pt(4)

        for f in feats:
            pf = tf.add_paragraph()
            pf.text = "✓ " + f
            pf.font.size = Pt(9)
            pf.font.color.rgb = TEXT_MAIN
            pf.space_before = Pt(4)

        tx += 3.9

    bot = slide10.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(6.3), Inches(11.7), Inches(0.65))
    bot.fill.solid()
    bot.fill.fore_color.rgb = RGBColor(241, 245, 249)
    bot.line.color.rgb = CARD_BORDER
    p = bot.text_frame.paragraphs[0]
    p.text = "Expansion Revenue Opportunities: Additional entity packs, custom webhook volume, CA firm enterprise seat bundles, and automated bank feeds."
    p.alignment = PP_ALIGN.CENTER
    p.font.size = Pt(10)
    p.font.color.rgb = TEXT_MUTED

    # ==========================================
    # SLIDE 11: GO-TO-MARKET PLAN
    # ==========================================
    slide11 = prs.slides.add_slide(blank_layout)
    set_slide_bg(slide11, BG_LIGHT)
    add_header(slide11, "10 — GO-TO-MARKET PLAN", "How RicozBooks Will", "Scale Customer Acquisition")

    gtm_channels = [
        ("1. CA Firm Partnerships", "Partnering with Chartered Accountants and tax consultants as channel partners. CAs mandate RicozBooks to their clients to streamline review workflows.", "High LTV / Zero CAC"),
        ("2. Direct SME Outbound", "Targeting multi-entity and trading businesses through targeted LinkedIn outreach, CFO roundtables, and localized SME community demonstrations.", "Focused Accounts"),
        ("3. Product-Led Virality", "When users send Invoices, Estimates, and POs to counterparties, each PDF document features 'Powered by RicozBooks' viral loops driving organic signups.", "Organic Referral Loop"),
        ("4. Digital Inbound & SEO", "High-intent organic content around Indian GST compliance, GSTR-1 preparation, period close governance, and Tally cloud alternatives.", "Search Engine Moat")
    ]

    gx = 0.8
    for title, desc, badge in gtm_channels:
        card = slide11.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(gx), Inches(1.8), Inches(2.72), Inches(3.6))
        card.fill.solid()
        card.fill.fore_color.rgb = CARD_WHITE
        card.line.color.rgb = CARD_BORDER
        tf = card.text_frame
        tf.word_wrap = True

        p = tf.paragraphs[0]
        p.text = badge.upper()
        p.font.size = Pt(8.5)
        p.font.bold = True
        p.font.color.rgb = ACCENT_INDIGO

        p2 = tf.add_paragraph()
        p2.text = title
        p2.font.size = Pt(13)
        p2.font.bold = True
        p2.font.color.rgb = TEXT_MAIN
        p2.space_before = Pt(6)

        p3 = tf.add_paragraph()
        p3.text = desc
        p3.font.size = Pt(9.5)
        p3.font.color.rgb = TEXT_MUTED
        p3.space_before = Pt(8)

        gx += 2.98

    # Bottom Funnel Bar
    funnel = slide11.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(5.7), Inches(11.7), Inches(1.2))
    funnel.fill.solid()
    funnel.fill.fore_color.rgb = CARD_WHITE
    funnel.line.color.rgb = CARD_BORDER
    tf = funnel.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = "SALES CONVERSION FUNNEL"
    p.font.size = Pt(9)
    p.font.bold = True
    p.font.color.rgb = ACCENT_INDIGO
    p2 = tf.add_paragraph()
    p2.text = "1. Targeted Lead  &rarr;  2. Interactive Live Sandbox  &rarr;  3. 14-Day Full Access Trial  &rarr;  4. Team Onboarding  &rarr;  5. Paid Annual Subscription"
    p2.font.size = Pt(12)
    p2.font.bold = True
    p2.font.color.rgb = TEXT_MAIN
    p2.space_before = Pt(8)

    # ==========================================
    # SLIDE 12: CURRENT PRODUCT READINESS (UPDATED!)
    # ==========================================
    slide12 = prs.slides.add_slide(blank_layout)
    set_slide_bg(slide12, BG_LIGHT)
    add_header(slide12, "11 — PRODUCT SCOPE & READINESS", "Proven Engineering Execution", "— 22 Modules Live")

    c1 = slide12.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(1.8), Inches(5.7), Inches(5.1))
    c1.fill.solid()
    c1.fill.fore_color.rgb = CARD_WHITE
    c1.line.color.rgb = ACCENT_EMERALD
    tf = c1.text_frame
    tf.word_wrap = True

    p = tf.paragraphs[0]
    p.text = "CORE PLATFORM: FULLY BUILT & DEPLOYED (100%)"
    p.font.size = Pt(11)
    p.font.bold = True
    p.font.color.rgb = ACCENT_EMERALD

    built_items = [
        "Authentication: Secure JWT auth, bcrypt hashing & RBAC permissions",
        "Multi-Entity Hub: Isolated charts, currencies, and tenant scoping",
        "General Ledger: Debit=Credit validation with zero balance drift",
        "Sales Lifecycle: Estimates &rarr; Orders &rarr; Invoices &rarr; Credit Notes",
        "Procurement Hub: POs &rarr; Vendor Bills &rarr; Debit Notes (1-click convert)",
        "Indian GST Suite: GSTR-1, GSTR-3B, B2B/B2C & ITC reconciliation",
        "Perpetual Inventory: FIFO valuation, stock ledger & auto COGS",
        "Banking & Recon: OFX/CSV statement import & GL reconciliation",
        "Four-Eyes Governance: Maker-checker approval queues & rejection notes",
        "Period Close Lock: Hard freeze on audited fiscal periods"
    ]
    for itm in built_items:
        pi = tf.add_paragraph()
        pi.text = "✓ " + itm
        pi.font.size = Pt(9.5)
        pi.font.color.rgb = TEXT_MAIN
        pi.space_before = Pt(4)

    c2 = slide12.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(6.8), Inches(1.8), Inches(5.7), Inches(5.1))
    c2.fill.solid()
    c2.fill.fore_color.rgb = CARD_WHITE
    c2.line.color.rgb = ACCENT_INDIGO
    tf = c2.text_frame
    tf.word_wrap = True

    p = tf.paragraphs[0]
    p.text = "ACTIVE HORIZON: AI INTELLIGENCE & ECOSYSTEM (Q3-Q4)"
    p.font.size = Pt(11)
    p.font.bold = True
    p.font.color.rgb = ACCENT_INDIGO

    next_items = [
        "AI Financial Assistant: Natural language queries on ledger balances",
        "Transaction Auto-Categorization: ML classification of bank feeds",
        "Financial Anomaly Detection: Automated flagging of unusual entries",
        "Direct Bank APIs: ICICI / HDFC / Razorpay automated bank settlement feeds",
        "Automated E-Way Bill Sync: Direct GSTN portal filing API bridge",
        "Payroll Automation Module: Indian TDS & PF salary disbursement sync",
        "Native iOS & Android Mobile Companion: Expense scanning & approvals"
    ]
    for itm in next_items:
        pi = tf.add_paragraph()
        pi.text = "→ " + itm
        pi.font.size = Pt(10)
        pi.font.color.rgb = TEXT_MUTED
        pi.space_before = Pt(8)

    # ==========================================
    # SLIDE 13: PRODUCT ROADMAP (UPDATED!)
    # ==========================================
    slide13 = prs.slides.add_slide(blank_layout)
    set_slide_bg(slide13, BG_LIGHT)
    add_header(slide13, "12 — PRODUCT ROADMAP", "From Precision Accounting to", "Financial Intelligence")

    phases = [
        ("Phase 1: Foundation", "COMPLETED", BADGE_GREEN_BG, BADGE_GREEN_TXT, [
            "Double-Entry Core Engine",
            "Multi-Entity Scoping",
            "Hierarchical COA",
            "JWT & RBAC Security"
        ]),
        ("Phase 2: Operations", "COMPLETED", BADGE_GREEN_BG, BADGE_GREEN_TXT, [
            "Sales: Quotes to Invoices",
            "Purchases: POs to Bills",
            "Bank Statement Recon",
            "Full P&L & Balance Sheet"
        ]),
        ("Phase 3: Governance & GST", "COMPLETED", BADGE_GREEN_BG, BADGE_GREEN_TXT, [
            "Indian GST (GSTR-1/3B)",
            "FIFO Inventory & COGS",
            "Four-Eyes Maker-Checker",
            "Period Close Hard Locks"
        ]),
        ("Phase 4: AI Intelligence", "CURRENT FRONTIER", BADGE_BLUE_BG, BADGE_BLUE_TXT, [
            "AI Ledger Assistant",
            "Bank Feed Categorization",
            "Cash Flow Predictive Insights",
            "GSTN Direct API Bridge"
        ])
    ]

    px = 0.8
    for name, stat, b_bg, b_txt, pts in phases:
        card = slide13.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(px), Inches(1.8), Inches(2.72), Inches(5.1))
        card.fill.solid()
        card.fill.fore_color.rgb = CARD_WHITE
        card.line.color.rgb = CARD_BORDER

        tf = card.text_frame
        tf.word_wrap = True

        p = tf.paragraphs[0]
        p.text = stat
        p.font.size = Pt(8.5)
        p.font.bold = True
        p.font.color.rgb = b_txt

        p2 = tf.add_paragraph()
        p2.text = name
        p2.font.size = Pt(13)
        p2.font.bold = True
        p2.font.color.rgb = TEXT_MAIN
        p2.space_before = Pt(6)

        for pt in pts:
            pi = tf.add_paragraph()
            pi.text = ("✓ " if "COMPLETED" in stat else "→ ") + pt
            pi.font.size = Pt(9.5)
            pi.font.color.rgb = TEXT_MAIN if "COMPLETED" in stat else TEXT_MUTED
            pi.space_before = Pt(8)

        px += 2.98

    # ==========================================
    # SLIDE 14: LEADERSHIP & EXECUTION TEAM
    # ==========================================
    slide14 = prs.slides.add_slide(blank_layout)
    set_slide_bg(slide14, BG_LIGHT)
    add_header(slide14, "13 — LEADERSHIP & TEAM", "The Team Behind", "RicozBooks")

    team = [
        ("Product & Vision Lead", "Founder & Platform Architect", "Responsible for overall platform roadmap, accounting business logic, and customer problem validation with scaling Indian SMEs.", [
            "Product design & market positioning",
            "Financial workflow architecture",
            "Customer discovery & sales execution"
        ]),
        ("Engineering & Security Lead", "Technical Architecture Team", "Leading core FastAPI backend services, PostgreSQL transactional integrity, double-entry mathematical invariants, and React web apps.", [
            "Distributed systems architecture",
            "Double-entry database verification",
            "Security, encryption & JWT controls"
        ]),
        ("Operations & CA Advisory", "Statutory Accounting Partner", "Guiding Indian GSTN compliance specifications, period closing governance, Four-Eyes maker-checker protocols, and CA partnerships.", [
            "Chartered Accountant industry network",
            "Statutory audit workflow validation",
            "GST filing schema precision"
        ])
    ]

    tx = 0.8
    for title, role, desc, bullets in team:
        card = slide14.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(tx), Inches(1.8), Inches(3.64), Inches(4.5))
        card.fill.solid()
        card.fill.fore_color.rgb = CARD_WHITE
        card.line.color.rgb = CARD_BORDER

        tf = card.text_frame
        tf.word_wrap = True
        p = tf.paragraphs[0]
        p.text = role.upper()
        p.font.size = Pt(8.5)
        p.font.bold = True
        p.font.color.rgb = ACCENT_INDIGO

        p2 = tf.add_paragraph()
        p2.text = title
        p2.font.size = Pt(15)
        p2.font.bold = True
        p2.font.color.rgb = TEXT_MAIN
        p2.space_before = Pt(6)

        p3 = tf.add_paragraph()
        p3.text = desc
        p3.font.size = Pt(10)
        p3.font.color.rgb = TEXT_MUTED
        p3.space_before = Pt(8)

        for b in bullets:
            pb = tf.add_paragraph()
            pb.text = "• " + b
            pb.font.size = Pt(9.5)
            pb.font.color.rgb = TEXT_MAIN
            pb.space_before = Pt(4)

        tx += 3.9

    bot = slide14.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(6.5), Inches(11.7), Inches(0.55))
    bot.fill.solid()
    bot.fill.fore_color.rgb = RGBColor(238, 242, 255)
    bot.line.color.rgb = ACCENT_INDIGO
    p = bot.text_frame.paragraphs[0]
    p.text = "👥 Core team dedicated to building high-integrity, mathematically verified financial operating systems."
    p.alignment = PP_ALIGN.CENTER
    p.font.size = Pt(10.5)
    p.font.bold = True
    p.font.color.rgb = RGBColor(49, 46, 129)

    # ==========================================
    # SLIDE 15: INVESTMENT OPPORTUNITY & METRICS
    # ==========================================
    slide15 = prs.slides.add_slide(blank_layout)
    set_slide_bg(slide15, BG_LIGHT)
    add_header(slide15, "14 — INVESTMENT OPPORTUNITY", "Accelerating Commercial Growth", "in Indian Enterprise Tech")

    # Left: Funding Request Card
    c_fund = slide15.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(1.8), Inches(5.6), Inches(5.0))
    c_fund.fill.solid()
    c_fund.fill.fore_color.rgb = CARD_WHITE
    c_fund.line.color.rgb = CARD_BORDER
    tf = c_fund.text_frame
    tf.word_wrap = True

    p = tf.paragraphs[0]
    p.text = "CAPITAL ALLOCATION"
    p.font.size = Pt(10)
    p.font.bold = True
    p.font.color.rgb = ACCENT_INDIGO

    p2 = tf.add_paragraph()
    p2.text = "Seed Round Investment"
    p2.font.size = Pt(20)
    p2.font.bold = True
    p2.font.color.rgb = TEXT_MAIN
    p2.space_before = Pt(6)

    p3 = tf.add_paragraph()
    p3.text = "Allocation of Funds:\n• 40% — Sales & GTM (Direct SME acquisition & CA firm partnerships)\n• 30% — Product & AI Intelligence (ML classification, anomaly detection)\n• 20% — Security, Cloud SLA & GSTN Direct API certification\n• 10% — Operations, Legal & Regulatory Compliance"
    p3.font.size = Pt(11)
    p3.font.color.rgb = TEXT_MUTED
    p3.space_before = Pt(12)

    # Right: 18-24 Month Milestones
    c_milest = slide15.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(6.8), Inches(1.8), Inches(5.7), Inches(5.0))
    c_milest.fill.solid()
    c_milest.fill.fore_color.rgb = CARD_WHITE
    c_milest.line.color.rgb = CARD_BORDER
    tf = c_milest.text_frame
    tf.word_wrap = True

    p = tf.paragraphs[0]
    p.text = "KEY STRATEGIC OBJECTIVES"
    p.font.size = Pt(10)
    p.font.bold = True
    p.font.color.rgb = ACCENT_INDIGO

    p2 = tf.add_paragraph()
    p2.text = "18–24 Month Targets"
    p2.font.size = Pt(20)
    p2.font.bold = True
    p2.font.color.rgb = TEXT_MAIN
    p2.space_before = Pt(6)

    targets = [
        "Acquire initial cohort of 500+ paying SME entities across India",
        "Establish ₹1.5 Cr+ in Annual Recurring Revenue (ARR)",
        "Onboard 50+ CA firms managing multi-tenant client portfolios",
        "Launch AI-driven Automated Bookkeeping & Bank Feeds",
        "Maintain 99.99% Cloud Service Level Agreement (SLA)"
    ]
    for t in targets:
        pt = tf.add_paragraph()
        pt.text = "✓ " + t
        pt.font.size = Pt(11)
        pt.font.color.rgb = TEXT_MAIN
        pt.space_before = Pt(8)

    # ==========================================
    # SLIDE 16: CONCLUSION & LIVE ACCESS (Dark Theme)
    # ==========================================
    slide16 = prs.slides.add_slide(blank_layout)
    set_slide_bg(slide16, BG_DARK)

    tb = slide16.shapes.add_textbox(Inches(1.5), Inches(1.8), Inches(10.33), Inches(0.5))
    p = tb.text_frame.paragraphs[0]
    p.text = "RICOZ INNOVATION • RICOZBOOKS CLOUD"
    p.alignment = PP_ALIGN.CENTER
    p.font.size = Pt(11)
    p.font.bold = True
    p.font.color.rgb = ACCENT_INDIGO

    tb = slide16.shapes.add_textbox(Inches(1.5), Inches(2.4), Inches(10.33), Inches(1.2))
    p = tb.text_frame.paragraphs[0]
    r1 = p.add_run()
    r1.text = "Ricoz"
    r1.font.size = Pt(50)
    r1.font.bold = True
    r1.font.color.rgb = TEXT_WHITE
    r2 = p.add_run()
    r2.text = "Books"
    r2.font.size = Pt(50)
    r2.font.bold = True
    r2.font.color.rgb = ACCENT_INDIGO
    p.alignment = PP_ALIGN.CENTER

    tb = slide16.shapes.add_textbox(Inches(1.5), Inches(3.6), Inches(10.33), Inches(0.6))
    p = tb.text_frame.paragraphs[0]
    p.text = "Accounting. Control. Intelligence."
    p.alignment = PP_ALIGN.CENTER
    p.font.size = Pt(22)
    p.font.bold = True
    p.font.color.rgb = TEXT_WHITE

    tb = slide16.shapes.add_textbox(Inches(1.5), Inches(4.2), Inches(10.33), Inches(0.5))
    p = tb.text_frame.paragraphs[0]
    p.text = "Building the next generation of financial operations for growing businesses."
    p.alignment = PP_ALIGN.CENTER
    p.font.size = Pt(13)
    p.font.color.rgb = TEXT_LIGHT_MUTED

    # Live Access Box
    acc_box = slide16.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(2.5), Inches(5.0), Inches(8.33), Inches(1.6))
    acc_box.fill.solid()
    acc_box.fill.fore_color.rgb = BG_CARD
    acc_box.line.color.rgb = ACCENT_INDIGO
    tf = acc_box.text_frame
    tf.word_wrap = True

    p = tf.paragraphs[0]
    p.text = "EXPERIENCE THE LIVE PRODUCT IN ACTION"
    p.alignment = PP_ALIGN.CENTER
    p.font.size = Pt(11)
    p.font.bold = True
    p.font.color.rgb = ACCENT_INDIGO

    p2 = tf.add_paragraph()
    p2.text = "Web Application: https://ricozbooks-web.onrender.com\nREST API Engine: https://ricozbooks-api.onrender.com\n1-Click Role Sandboxes: Admin / Accountant / Reviewer"
    p2.alignment = PP_ALIGN.CENTER
    p2.font.size = Pt(12)
    p2.font.color.rgb = TEXT_WHITE
    p2.space_before = Pt(6)

    # Output save
    out_path = r"C:\Users\hp\Documents\RicozBooks\RicozBooks_Investor_Presentation_2026.pptx"
    prs.save(out_path)
    print(f"Presentation successfully saved to: {out_path}")

if __name__ == '__main__':
    create_deck()

