export interface PermissionDefinition {
  code: string;
  name: string;
  module: string;
  description: string;
}

export const GRANULAR_PERMISSIONS_CATALOG: PermissionDefinition[] = [
  // Platform & Developer Console
  { code: 'developer:administer', name: 'Platform Administration', module: 'developer', description: 'Full platform administration, security management, and console access' },
  { code: 'roles:read', name: 'View Roles & Permissions', module: 'roles', description: 'View platform roles and role-permission matrix' },
  { code: 'roles:manage', name: 'Manage Roles & Permissions', module: 'roles', description: 'Create custom roles and modify role-permission mappings' },
  { code: 'users:read', name: 'View Platform Users', module: 'users', description: 'View platform-wide user accounts and metadata' },
  { code: 'users:manage', name: 'Manage Users & Assignments', module: 'users', description: 'Manage platform user lifecycle, assign roles, and allocate departments' },
  { code: 'users:suspend', name: 'Suspend Platform Users', module: 'users', description: 'Deactivate user accounts and revoke active platform sessions' },
  { code: 'audit:read', name: 'View Platform Audit Trail', module: 'audit', description: 'Access immutable platform-wide audit log trail and inspector' },
  { code: 'audit:export', name: 'Export Audit Logs', module: 'audit', description: 'Export platform audit events to CSV format' },
  { code: 'departments:read', name: 'View Departments', module: 'departments', description: 'View 5 canonical departments, department heads, and members' },
  { code: 'departments:manage', name: 'Manage Departments', module: 'departments', description: 'Configure department descriptions and assign department heads' },
  { code: 'invitations:manage', name: 'Manage Departmental Invitations', module: 'invitations', description: 'Issue, resend, and revoke departmental invitations' },
  
  // Organization & Tenant Administration
  { code: 'tenants:manage', name: 'Manage Organization Settings', module: 'tenants', description: 'Update organization profile, timezone, currency, and company defaults' },
  { code: 'entities:read', name: 'View Legal Entities', module: 'entities', description: 'View legal entities, GSTIN, PAN, and address configuration' },
  { code: 'entities:manage', name: 'Manage Legal Entities', module: 'entities', description: 'Create and update legal entities, fiscal years, and payment gateway keys' },
  
  // Accounting, Chart of Accounts & General Ledger
  { code: 'accounts:read', name: 'View Chart of Accounts', module: 'accounts', description: 'View chart of accounts, codes, types, and running balances' },
  { code: 'accounts:manage', name: 'Manage Accounts', module: 'accounts', description: 'Create, edit, and deactivate accounts and dimension mappings' },
  { code: 'journals:create', name: 'Create Journal Entries', module: 'journals', description: 'Create and edit draft double-entry journal entries' },
  { code: 'journals:edit_draft', name: 'Edit Draft Journals', module: 'journals', description: 'Modify journal entries in DRAFT status' },
  { code: 'journals:submit', name: 'Submit Journals for Review', module: 'journals', description: 'Submit draft journal entries into approval workflow' },
  { code: 'journals:review', name: 'Review Submitted Journals', module: 'journals', description: 'Review submitted journals in maker-checker queue' },
  { code: 'journals:approve', name: 'Approve Journals', module: 'journals', description: 'Approve reviewed journal entries for general ledger posting' },
  { code: 'journals:reject', name: 'Reject Journals', module: 'journals', description: 'Reject submitted journal entries back to draft with comments' },
  { code: 'journals:post', name: 'Post Journals to Ledger', module: 'journals', description: 'Commit approved journals to General Ledger' },
  { code: 'journals:reverse', name: 'Reverse Posted Journals', module: 'journals', description: 'Execute immutable journal reversal generating offsetting entries' },
  { code: 'ledger:view', name: 'View General Ledger', module: 'ledger', description: 'Inspect general ledger transactions and running balances' },
  { code: 'reports:view', name: 'View Financial Statements', module: 'reports', description: 'Access Balance Sheet, Profit & Loss, Trial Balance, and Cash Flow' },
  { code: 'close:manage', name: 'Manage Period-End Close', module: 'close', description: 'Execute period close checklists and lock fiscal periods' },
  
  // Sales, Invoicing & Receivables
  { code: 'sales:customers:read', name: 'View Customers', module: 'sales', description: 'Browse customer list, contact details, and outstanding balances' },
  { code: 'sales:customers:manage', name: 'Manage Customers', module: 'sales', description: 'Create and update customer profiles, GSTIN, and credit terms' },
  { code: 'sales:invoice:create', name: 'Create Sales Invoices', module: 'sales', description: 'Draft sales invoices, line items, and pricing' },
  { code: 'sales:invoice:post', name: 'Post Sales Invoices', module: 'sales', description: 'Post invoices to ledger, trigger inventory decrement and COGS' },
  { code: 'sales:payments:record', name: 'Record Customer Payments', module: 'sales', description: 'Record customer payment receipts and reconcile invoices' },
  { code: 'sales:estimates:manage', name: 'Manage Estimates & Orders', module: 'sales', description: 'Create and convert sales estimates and orders' },
  
  // Purchases, Bills & Payables
  { code: 'purchases:vendors:read', name: 'View Vendors', module: 'purchases', description: 'View vendor records, payment terms, and balances' },
  { code: 'purchases:vendors:manage', name: 'Manage Vendors', module: 'purchases', description: 'Create and edit vendor master records' },
  { code: 'purchases:bills:create', name: 'Create Purchase Bills', module: 'purchases', description: 'Draft vendor bills and purchase order matching' },
  { code: 'purchases:bills:post', name: 'Post Purchase Bills', module: 'purchases', description: 'Post vendor bills to accounts payable ledger' },
  { code: 'purchases:payments:record', name: 'Record Vendor Payments', module: 'purchases', description: 'Disburse vendor payments and update cash/bank ledgers' },
  
  // Inventory, Products & Stock Ledger
  { code: 'inventory:products:read', name: 'View Product Master', module: 'inventory', description: 'View catalog items, SKU, HSN codes, and pricing' },
  { code: 'inventory:products:manage', name: 'Manage Products', module: 'inventory', description: 'Create and edit products, inventory valuation, and tax rates' },
  { code: 'inventory:stock:adjust', name: 'Adjust Stock Levels', module: 'inventory', description: 'Perform stock adjustments and physical count reconciliations' },
  { code: 'inventory:movements:view', name: 'View Stock Movements', module: 'inventory', description: 'Audit inventory movement ledger and transaction logs' },
  
  // Banking & Reconciliation
  { code: 'banking:accounts:read', name: 'View Bank Accounts', module: 'banking', description: 'View bank account balances and linked general ledger accounts' },
  { code: 'banking:accounts:manage', name: 'Manage Bank Accounts', module: 'banking', description: 'Configure bank accounts, credit cards, and transfer funds' },
  { code: 'banking:reconcile', name: 'Reconcile Bank Statements', module: 'banking', description: 'Upload CSV statements and execute transaction matching' },
  
  // GST & Compliance
  { code: 'gst:returns:view', name: 'View GST Returns', module: 'gst', description: 'Inspect GSTR-1, GSTR-3B summaries and tax liability calculations' },
  { code: 'gst:returns:file', name: 'File GST Returns', module: 'gst', description: 'Record return filing status and post tax liability settlement entries' },
];

export const MANDATORY_SUPER_ADMIN_PERMISSIONS = [
  'developer:administer',
  'roles:manage',
  'audit:read',
  'users:manage',
];

