import { Department } from '../models/Department';
import { Role, Permission } from '../models/Role';
import { DemoAdminUser } from '../models/DemoAdminUser';
import { hashPassword } from '../utils/security';
import { GRANULAR_PERMISSIONS_CATALOG } from '@ricozbooks/shared';

export class SeedService {
  static async seedAll(): Promise<void> {
    await this.seedDepartments();
    await this.seedPermissionsAndRoles();
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
