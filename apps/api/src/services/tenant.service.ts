import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Organization, Entity } from '../models/Organization';
import { User } from '../models/User';
import { Account } from '../models/Account';
import { FiscalPeriod } from '../models/FiscalPeriod';
import { hashPassword, generateToken } from '../utils/security';
import { AuditService } from './audit.service';
import { AccountType, NormalBalance } from '@ricozbooks/shared';

export class TenantService {
  /**
   * Registers a new organization workspace atomically:
   * 1. Validates inputs across legacy and modern schema conventions
   * 2. Performs duplicate validation on company name and email
   * 3. Creates Organization and primary operating Entity
   * 4. Provisions 13 standard GAAP/IFRS Chart of Accounts
   * 5. Provisions 12-month fiscal calendar
   * 6. Provisions initial Organization Administrator with ORG_ADMIN role
   * 7. Logs audit event and issues session JWT
   */
  public static async registerCompany(req: Request, res: Response) {
    const body = req.body || {};
    const company_name = String(body.company_name || '').trim();
    const admin_email = String(body.admin_email || body.email || '').toLowerCase().trim();
    const admin_name = String(body.admin_name || body.full_name || '').trim();
    const password = body.password;
    const business_email = String(body.business_email || admin_email).toLowerCase().trim();
    const legal_name = String(body.legal_name || company_name).trim();
    const country = String(body.country || 'India').trim();
    const base_currency = String(body.base_currency || body.currency || 'INR').toUpperCase().trim();
    const timezone = String(body.timezone || 'Asia/Kolkata').trim();
    const tax_identifier = String(body.tax_identifier || body.gstin || '').trim();
    const phone_number = body.phone_number ? String(body.phone_number).trim() : null;
    const address = body.address ? String(body.address).trim() : null;
    const city = body.city ? String(body.city).trim() : null;
    const state = body.state ? String(body.state).trim() : null;
    const postal_code = body.postal_code ? String(body.postal_code).trim() : null;

    // Field-specific validation
    if (!company_name) {
      return res.status(400).json({ detail: 'Company name is required.' });
    }
    if (!admin_name) {
      return res.status(400).json({ detail: 'Administrator full name is required.' });
    }
    if (!admin_email || !admin_email.includes('@')) {
      return res.status(400).json({ detail: 'A valid administrator email address is required.' });
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ detail: 'Password is required and must be at least 6 characters long.' });
    }

    // Duplicate account validation
    const existingUser = await User.findOne({ email: admin_email });
    if (existingUser) {
      return res.status(400).json({
        detail: `An account with email '${admin_email}' already exists. Please sign in instead.`,
      });
    }

    // Duplicate organization validation (case-insensitive)
    const escapedName = company_name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const existingCompany = await Organization.findOne({
      name: { $regex: new RegExp(`^${escapedName}$`, 'i') },
    });
    if (existingCompany) {
      return res.status(400).json({
        detail: `An organization with name '${company_name}' is already registered.`,
      });
    }

    // Slugify unique company code
    const cleaned = company_name.toUpperCase().replace(/[^A-Z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
    const baseCode = cleaned.substring(0, 20) || 'CORP';
    let companyCode = baseCode;
    let counter = 1;
    while (await Organization.findOne({ code: companyCode })) {
      companyCode = `${baseCode}_${counter}`;
      counter++;
    }
    const entityCode = `${companyCode}_HQ`;

    // Initialize session for atomic MongoDB transaction if available
    let session: mongoose.ClientSession | null = null;
    let useTransaction = false;
    try {
      session = await mongoose.startSession();
      session.startTransaction();
      useTransaction = true;
    } catch {
      session = null;
      useTransaction = false;
    }

    try {
      const sessionOpt = session ? { session } : {};

      // 1. Create Organization
      const orgDocs = await Organization.create(
        [
          {
            name: company_name,
            code: companyCode,
            legal_name,
            business_email,
            phone_number,
            country,
            address,
            city,
            state,
            postal_code,
            currency: base_currency,
            timezone,
            tax_identifier: tax_identifier || null,
            is_active: true,
          },
        ],
        sessionOpt
      );
      const organization = orgDocs[0];

      // 2. Create Primary Operating Entity
      const currentYear = new Date().getFullYear();
      const entityDocs = await Entity.create(
        [
          {
            company_id: organization._id,
            name: `${company_name} - Head Office`,
            code: entityCode,
            legal_name,
            country,
            address,
            city,
            state,
            currency: base_currency,
            base_currency,
            tax_identifier: tax_identifier || 'UNREGISTERED',
            gstin: tax_identifier || null,
            financial_year: `${currentYear}-${(currentYear + 1).toString().slice(-2)}`,
            status: 'ACTIVE',
            is_active: true,
          },
        ],
        sessionOpt
      );
      const entity = entityDocs[0];

      // 3. Provision 13 Standard Accounts (GAAP / IFRS Chart of Accounts)
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

      const accountDocs = standardAccounts.map((a) => ({
        entity_id: entity._id,
        code: a.code,
        name: a.name,
        account_type: a.type,
        normal_balance: a.norm,
        currency: base_currency,
        description: a.desc,
        is_active: true,
      }));
      await Account.insertMany(accountDocs, sessionOpt);

      // 4. Provision 12-Month Fiscal Schedule
      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December',
      ];
      const fiscalDocs = [];
      for (let m = 0; m < 12; m++) {
        const start = new Date(Date.UTC(currentYear, m, 1));
        const end = new Date(Date.UTC(currentYear, m + 1, 0, 23, 59, 59, 999));
        fiscalDocs.push({
          entity_id: entity._id,
          fiscal_year: `${currentYear}`,
          period_number: m + 1,
          name: `${monthNames[m]} ${currentYear}`,
          start_date: start,
          end_date: end,
          is_closed: false,
        });
      }
      await FiscalPeriod.insertMany(fiscalDocs, sessionOpt);

      // 5. Create Initial Organization Administrator
      const nameParts = admin_name.split(' ');
      const firstName = nameParts[0] || admin_email.split('@')[0];
      const lastName = nameParts.slice(1).join(' ') || '';
      const password_hash = await hashPassword(password);

      const userDocs = await User.create(
        [
          {
            email: admin_email,
            password_hash,
            full_name: admin_name,
            role: 'ORG_ADMIN',
            job_title: 'Organization Admin / Finance Head',
            default_company_id: organization._id,
            default_entity_id: entity._id,
            companies: [organization._id],
            entities: [entity._id],
            is_active: true,
            is_superuser: false,
          },
        ],
        sessionOpt
      );
      const user = userDocs[0];

      // Commit transaction if active
      if (session && useTransaction) {
        await session.commitTransaction();
      }

      // 6. Generate Session Token & Record Audit Log
      const token = generateToken({
        sub: String(user._id),
        email: user.email,
        role: user.role,
        company_id: String(organization._id),
        entity_id: String(entity._id),
      });

      await AuditService.logEvent({
        req,
        userId: user._id,
        userEmail: user.email,
        companyId: organization._id,
        entityId: entity._id,
        action: 'COMPANY_REGISTERED',
        recordType: 'Organization',
        recordId: String(organization._id),
        details: {
          company_name: organization.name,
          company_code: organization.code,
          primary_entity: entity.name,
          base_currency: organization.currency,
          admin_email: user.email,
        },
      });

      return res.status(201).json({
        access_token: token,
        token_type: 'bearer',
        company_id: organization._id,
        company_name: organization.name,
        company_code: organization.code,
        entity_id: entity._id,
        entity_name: entity.name,
        user: {
          id: user._id,
          email: user.email,
          full_name: user.full_name,
          first_name: firstName,
          last_name: lastName,
          role: user.role,
          roles: ['ORG_ADMIN', 'ADMIN'],
          job_title: user.job_title,
          profile_photo_url: null,
          is_superuser: false,
          default_company_id: organization._id,
          default_entity_id: entity._id,
        },
      });
    } catch (err: any) {
      if (session && useTransaction) {
        try {
          await session.abortTransaction();
        } catch {
          // ignore rollback error
        }
      }
      return res.status(500).json({ detail: err.message || 'Failed to provision organization workspace.' });
    } finally {
      if (session) {
        session.endSession();
      }
    }
  }

  /**
   * Retrieves organization details for the authenticated user
   */
  public static async getTenantCompany(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      let companyId = user?.default_company_id;
      if (!companyId) {
        const defaultOrg = await Organization.findOne({ is_active: true });
        companyId = defaultOrg?._id;
      }
      const company = await Organization.findById(companyId);
      if (!company) {
        return res.status(404).json({ detail: 'Organization not found' });
      }
      return res.json({
        id: company._id,
        name: company.name,
        code: company.code || company.name.substring(0, 4).toUpperCase(),
        legal_name: company.legal_name,
        tax_identifier: company.tax_identifier || null,
        base_currency: company.currency || 'INR',
        currency: company.currency || 'INR',
        business_email: company.business_email,
        phone_number: company.phone_number,
        country: company.country,
        address: company.address,
        city: company.city,
        state: company.state,
        postal_code: company.postal_code,
        timezone: company.timezone,
      });
    } catch (err: any) {
      return res.status(err.statusCode || 500).json({ detail: err.message });
    }
  }
}

