import { Department } from '../models/Department';
import { Role, Permission } from '../models/Role';
import { DemoAdminUser } from '../models/DemoAdminUser';
import { User } from '../models/User';
import { Organization, Entity } from '../models/Organization';
import { Account } from '../models/Account';
import { FiscalPeriod } from '../models/FiscalPeriod';
import { hashPassword } from '../utils/security';
import { GRANULAR_PERMISSIONS_CATALOG, AccountType, NormalBalance } from '@ricozbooks/shared';

export class SeedService {
  static async seedAll(): Promise<void> {
    await this.seedDepartments();
    await this.seedPermissionsAndRoles();
    await this.seedDefaultWorkspace();
    await this.seedSuperAdmin();
    await this.seedDemoUsers();
  }

  static async seedDepartments(): Promise<void> {
    const defaultDepts = [
      {
        code: 'FINANCE_ACCOUNTING',
        name: 'Finance & Accounting',
        description: 'Financial ledger integrity, bookkeeping, reporting, cash management, and compliance.',
      },
      {
        code: 'OPERATIONS',
        name: 'Operations',
        description: 'Customer onboarding, operational task coordination, workflow monitoring, and period-end coordination.',
      },
      {
        code: 'TECHNICAL_ENGINEERING',
        name: 'Technical & Engineering',
        description: 'Software stability, API monitoring, infrastructure incidents, and engineering task coordination.',
      },
      {
        code: 'SALES_DEMO',
        name: 'Sales & Demo Management',
        description: 'Demo requests, prospect scheduling, lead follow-ups, and sales coordination.',
      },
      {
        code: 'CUSTOMER_SUPPORT',
        name: 'Customer Support',
        description: 'Customer support tickets, inquiry triage, issue resolution tracking, and client communication.',
      },
    ];

    for (const d of defaultDepts) {
      const exists = await Department.findOne({ code: d.code });
      if (!exists) {
        await Department.create({ ...d, is_active: true });
      }
    }
    console.log('[OK] 5 canonical departments verified/seeded in MongoDB.');
  }

  static async seedPermissionsAndRoles(): Promise<void> {
    // 1. Seed 47 granular permissions
    for (const p of GRANULAR_PERMISSIONS_CATALOG) {
      await Permission.updateOne(
        { code: p.code },
        { $set: { name: p.name, module: p.module, description: p.description } },
        { upsert: true }
      );
    }

    const allPermCodes = GRANULAR_PERMISSIONS_CATALOG.map((p) => p.code);

    // 2. Seed Standard Roles
    const rolesData: Record<string, { desc: string; perms: string[]; is_system?: boolean }> = {
      SUPER_ADMIN: {
        desc: 'Platform Super Administrator with complete system authority across all modules and tenants',
        perms: allPermCodes,
        is_system: true,
      },
      ADMIN: {
        desc: 'Full system administrator access across all legal entities and operational modules',
        perms: allPermCodes.filter((c) => !c.startsWith('developer:')),
        is_system: true,
      },
      ORG_ADMIN: {
        desc: 'Organization Admin / Owner: full control over company workspace, team, settings, and financial operations',
        perms: allPermCodes.filter((c) => !c.startsWith('developer:')),
        is_system: true,
      },
      FINANCE_HEAD: {
        desc: 'Head of Finance & Accounting: full authority over financial ledgers, approvals, close, and tax',
        perms: allPermCodes.filter((c) => ['accounts', 'journals', 'ledger', 'reports', 'close', 'banking', 'gst', 'audit'].includes(c.split(':')[0])),
        is_system: true,
      },
      OPERATIONS_HEAD: {
        desc: 'Head of Operations: oversight of customer accounts, inventory, sales, and purchasing workflows',
        perms: allPermCodes.filter((c) => ['sales', 'purchases', 'inventory', 'reports'].includes(c.split(':')[0])),
        is_system: true,
      },
      TECH_HEAD: {
        desc: 'Head of Technical & Engineering: system diagnostics, audit log inspection, and configuration',
        perms: ['developer:administer', 'audit:read', 'audit:export'],
        is_system: true,
      },
      SALES_HEAD: {
        desc: 'Head of Sales & Demo: oversight over customer relations, sales invoicing, and demo leads',
        perms: allPermCodes.filter((c) => c.startsWith('sales:')),
        is_system: true,
      },
      SUPPORT_HEAD: {
        desc: 'Head of Customer Support: client assistance, customer profile view, and invoice inquiry',
        perms: ['sales:customers:read', 'sales:invoice:create', 'audit:read'],
        is_system: true,
      },
      ACCOUNTANT: {
        desc: 'Operational accounting access: create & submit journals, view ledgers & reports',
        perms: ['journals:create', 'journals:edit_draft', 'journals:submit', 'ledger:view', 'reports:view', 'accounts:read'],
        is_system: true,
      },
      MANAGER: {
        desc: 'Finance Manager: approvals, period close, account governance, and reports',
        perms: ['journals:review', 'journals:approve', 'journals:reject', 'journals:post', 'close:manage', 'ledger:view', 'reports:view', 'accounts:read'],
        is_system: true,
      },
      REVIEWER: {
        desc: 'Supervisory review access: review, approve, reject journals and close tasks',
        perms: ['journals:review', 'journals:approve', 'journals:reject', 'ledger:view', 'reports:view'],
        is_system: true,
      },
      AUDITOR: {
        desc: 'Read-only financial auditor: inspect general ledger, trial balance, and audit trail',
        perms: ['ledger:view', 'reports:view', 'audit:read', 'accounts:read'],
        is_system: true,
      },
      MEMBER: {
        desc: 'General team member: view company workspace and permitted operational items',
        perms: ['reports:view'],
        is_system: true,
      },
    };

    for (const [name, meta] of Object.entries(rolesData)) {
      await Role.updateOne(
        { name },
        {
          $set: {
            description: meta.desc,
            permissions: meta.perms,
            is_system: meta.is_system ?? false,
          },
        },
        { upsert: true }
      );
    }
    console.log('[OK] 47 granular permissions and role matrix seeded in MongoDB.');
  }

  static async seedDefaultWorkspace(): Promise<{ organization: any; entity: any }> {
    let org = await Organization.findOne({ is_active: true });
    if (!org) {
      org = await Organization.create({
        name: 'Ricoz Technologies Pvt Ltd',
        legal_name: 'Ricoz Technologies Private Limited',
        business_email: 'finance@ricozbooks.com',
        phone_number: '+91 98765 43210',
        country: 'India',
        currency: 'INR',
        address: 'MG Road, Bangalore',
        city: 'Bangalore',
        state: 'Karnataka',
        postal_code: '560001',
        timezone: 'Asia/Kolkata',
        is_active: true,
      });
      console.log('[OK] Default Organization created:', org.name);
    }

    let entity = await Entity.findOne({ company_id: org._id, is_active: true });
    if (!entity) {
      entity = await Entity.create({
        company_id: org._id,
        name: 'Ricoz Technologies (HQ)',
        legal_name: 'Ricoz Technologies Private Limited (Bangalore HQ)',
        tax_identifier: '29ABCDE1234F1Z5',
        gstin: '29ABCDE1234F1Z5',
        pan: 'ABCDE1234F',
        currency: 'INR',
        financial_year: '2025-26',
        city: 'Bangalore',
        state: 'Karnataka',
        status: 'ACTIVE',
        is_active: true,
      });
      console.log('[OK] Default Entity created:', entity.name);
    }

    // Standard GAAP / IFRS Chart of Accounts
    const standardAccounts = [
      { code: '1000', name: 'Cash on Hand', type: AccountType.ASSET, norm: NormalBalance.DEBIT, desc: 'Liquid petty cash and vault reserves' },
      { code: '1100', name: 'Operating Bank Account', type: AccountType.ASSET, norm: NormalBalance.DEBIT, desc: 'Primary corporate checking account' },
      { code: '1200', name: 'Accounts Receivable (AR)', type: AccountType.ASSET, norm: NormalBalance.DEBIT, desc: 'Customer trade receivables' },
      { code: '1300', name: 'Merchandise Inventory', type: AccountType.ASSET, norm: NormalBalance.DEBIT, desc: 'Current trading inventory asset' },
      { code: '2000', name: 'Accounts Payable (AP)', type: AccountType.LIABILITY, norm: NormalBalance.CREDIT, desc: 'Trade payables to suppliers' },
      { code: '2100', name: 'Statutory Tax / GST Output', type: AccountType.LIABILITY, norm: NormalBalance.CREDIT, desc: 'Statutory tax and GST liability' },
      { code: '3000', name: 'Paid-in Share Capital', type: AccountType.EQUITY, norm: NormalBalance.CREDIT, desc: 'Common stock paid-in capital' },
      { code: '3100', name: 'Retained Earnings', type: AccountType.EQUITY, norm: NormalBalance.CREDIT, desc: 'Accumulated operational profits' },
      { code: '4000', name: 'Operating Sales Revenue', type: AccountType.REVENUE, norm: NormalBalance.CREDIT, desc: 'Primary operating software and service income' },
      { code: '5000', name: 'Salary & Payroll Expense', type: AccountType.EXPENSE, norm: NormalBalance.DEBIT, desc: 'Wages and employee payroll expense' },
      { code: '5100', name: 'Office Rent Expense', type: AccountType.EXPENSE, norm: NormalBalance.DEBIT, desc: 'Commercial real estate lease expense' },
      { code: '5200', name: 'Utilities & Software Expense', type: AccountType.EXPENSE, norm: NormalBalance.DEBIT, desc: 'Cloud infrastructure, SaaS, and utilities' },
      { code: '5700', name: 'Cost of Goods Sold (COGS)', type: AccountType.EXPENSE, norm: NormalBalance.DEBIT, desc: 'Cost of inventory and merchandise sold' },
    ];

    for (const a of standardAccounts) {
      const exists = await Account.findOne({ entity_id: entity._id, code: a.code });
      if (!exists) {
        await Account.create({
          entity_id: entity._id,
          code: a.code,
          name: a.name,
          account_type: a.type,
          normal_balance: a.norm,
          currency: entity.currency,
          description: a.desc,
          is_active: true,
        });
      }
    }
    console.log('[OK] Standard Chart of Accounts verified/seeded in MongoDB.');

    // 12-Month Fiscal Periods
    const currentYear = new Date().getFullYear();
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    for (let m = 0; m < 12; m++) {
      const start = new Date(currentYear, m, 1);
      const end = new Date(currentYear, m + 1, 0);
      const exists = await FiscalPeriod.findOne({ entity_id: entity._id, fiscal_year: `${currentYear}`, period_number: m + 1 });
      if (!exists) {
        await FiscalPeriod.create({
          entity_id: entity._id,
          fiscal_year: `${currentYear}`,
          period_number: m + 1,
          name: `${monthNames[m]} ${currentYear}`,
          start_date: start,
          end_date: end,
          is_closed: false,
        });
      }
    }

    return { organization: org, entity };
  }

  static async seedSuperAdmin(email?: string, password?: string, fullName?: string): Promise<any> {
    const superAdminEmail = (email || process.env.SUPERADMIN_EMAIL || 'admin@ricoz.in').toLowerCase().trim();
    const superAdminPassword = password || process.env.SUPERADMIN_PASSWORD || 'RicozAdmin2026!';
    const name = fullName || 'Platform Super Admin';

    let user = await User.findOne({ email: superAdminEmail });
    const org = await Organization.findOne({ is_active: true });
    const entity = await Entity.findOne({ is_active: true });
    const dept = await Department.findOne({ code: 'TECHNICAL_ENGINEERING' });

    if (!user) {
      const password_hash = await hashPassword(superAdminPassword);
      user = await User.create({
        email: superAdminEmail,
        password_hash,
        full_name: name,
        role: 'SUPER_ADMIN',
        is_active: true,
        is_superuser: true,
        department_id: dept?._id || null,
        default_company_id: org?._id || null,
        default_entity_id: entity?._id || null,
        companies: org ? [org._id] : [],
        entities: entity ? [entity._id] : [],
      });
      console.log(`[OK] Super Admin provisioned: ${superAdminEmail}`);
    } else {
      user.is_superuser = true;
      user.role = 'SUPER_ADMIN';
      if (org && (!user.companies || user.companies.length === 0)) {
        user.default_company_id = org._id;
        user.companies = [org._id];
      }
      if (entity && (!user.entities || user.entities.length === 0)) {
        user.default_entity_id = entity._id;
        user.entities = [entity._id];
      }
      await user.save();
      console.log(`[OK] Existing user verified as Super Admin: ${superAdminEmail}`);
    }

    return user;
  }

  static async seedDemoUsers(): Promise<void> {
    const demoUsers = [
      { name: 'Ricoz Admin', email: 'admin@ricozbooks.com', pwd: 'admin123', role: 'DEMO_ADMIN' },
      { name: 'Vikram Malhotra', email: 'sales@ricozbooks.com', pwd: 'sales123', role: 'SALES_TEAM' },
      { name: 'Pooja Sharma', email: 'coordinator@ricozbooks.com', pwd: 'coord123', role: 'DEMO_COORDINATOR' },
    ];

    for (const u of demoUsers) {
      const exists = await DemoAdminUser.findOne({ email: u.email });
      if (!exists) {
        const password_hash = await hashPassword(u.pwd);
        await DemoAdminUser.create({
          name: u.name,
          email: u.email,
          password_hash,
          role: u.role,
          is_active: true,
        });
      }
    }
    console.log('[OK] Internal demo portal coordinators verified/seeded in MongoDB.');
  }
}
