import { Request, Response, NextFunction } from 'express';
import { DemoAdminUser, DemoRequest, DemoScheduleHistory } from '../models/DemoAdminUser';
import { verifyPassword, generateToken, verifyToken } from '../utils/security';

export class InternalDemoController {
  // ==========================================
  // Public Booking
  // ==========================================
  public static async submitPublicDemo(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { full_name, work_email, phone, company, role, entities_count, interest_area, preferred_date, preferred_time } = req.body;

      let code = '';
      while (true) {
        code = `DEMO-${Math.floor(100000 + Math.random() * 900000)}`;
        const exists = await DemoRequest.findOne({ reference_code: code });
        if (!exists) break;
      }

      const demo = await DemoRequest.create({
        reference_code: code,
        full_name,
        work_email,
        phone,
        company,
        role,
        entities_count: entities_count || '1',
        interest_area: interest_area || 'Complete Platform Demo',
        preferred_date: preferred_date ? new Date(preferred_date) : null,
        preferred_time: preferred_time || null,
        status: 'NEW',
      });

      res.status(201).json({
        reference_code: demo.reference_code,
        status: demo.status,
        message: 'Your product demo has been successfully requested. Our enterprise specialist will confirm your session shortly.',
        customer_name: demo.full_name,
        company: demo.company,
        preferred_date: demo.preferred_date,
        preferred_time: demo.preferred_time,
      });
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // Internal Auth
  // ==========================================
  public static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body;
      const user = await DemoAdminUser.findOne({ email: String(email).toLowerCase().trim() });
      if (!user) {
        res.status(401).json({ detail: 'Invalid internal credentials' });
        return;
      }

      const isMatch = await verifyPassword(password, user.password_hash);
      if (!isMatch) {
        res.status(401).json({ detail: 'Invalid internal credentials' });
        return;
      }

      const token = generateToken({
        sub: String(user._id),
        email: user.email,
        role: user.role,
      });

      res.json({
        access_token: token,
        token_type: 'bearer',
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          is_active: user.is_active,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  public static async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        res.status(401).json({ detail: 'Unauthorized' });
        return;
      }

      const token = authHeader.split(' ')[1];
      const payload = verifyToken(token);
      const user = await DemoAdminUser.findById(payload.sub);
      if (!user) {
        res.status(401).json({ detail: 'Unauthorized' });
        return;
      }

      res.json({
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        is_active: user.is_active,
      });
    } catch (err) {
      res.status(401).json({ detail: 'Unauthorized' });
    }
  }

  public static async logout(_req: Request, res: Response): Promise<void> {
    res.json({ message: 'Logged out successfully' });
  }

  // ==========================================
  // Dashboard Stats
  // ==========================================
  public static async getStats(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const allDemos = await DemoRequest.find();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      let newRequests = 0;
      let pendingRequests = 0;
      let scheduledDemos = 0;
      let todayDemos = 0;
      let completedDemos = 0;
      let cancelledDemos = 0;

      const statusDist: Record<string, number> = {};

      allDemos.forEach((d) => {
        const st = d.status.toUpperCase();
        statusDist[st] = (statusDist[st] || 0) + 1;

        if (st === 'NEW') newRequests++;
        if (st === 'UNDER REVIEW' || st === 'CONTACTED') pendingRequests++;
        if (st === 'SCHEDULED' || st === 'CONFIRMED') scheduledDemos++;
        if (st === 'COMPLETED' || st === 'CONVERTED') completedDemos++;
        if (st === 'CANCELLED' || st === 'REJECTED') cancelledDemos++;

        if (d.confirmed_date && d.confirmed_date >= today && d.confirmed_date < tomorrow) {
          todayDemos++;
        }
      });

      res.json({
        new_requests: newRequests,
        pending_requests: pendingRequests,
        scheduled_demos: scheduledDemos,
        today_demos: todayDemos,
        completed_demos: completedDemos,
        cancelled_demos: cancelledDemos,
        total_requests: allDemos.length,
        status_distribution: statusDist,
        requests_over_time: [],
      });
    } catch (err) {
      next(err);
    }
  }

  public static async getRecentDemos(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const demos = await DemoRequest.find().sort({ created_at: -1 }).limit(10).populate('assigned_to', 'name email');
      res.json(demos.map((d: any) => ({
        id: d._id,
        reference_code: d.reference_code,
        full_name: d.full_name,
        work_email: d.work_email,
        phone: d.phone,
        company: d.company,
        role: d.role,
        status: d.status,
        interest_area: d.interest_area,
        preferred_date: d.preferred_date,
        preferred_time: d.preferred_time,
        confirmed_date: d.confirmed_date,
        confirmed_time: d.confirmed_time,
        assigned_user_name: d.assigned_to?.name || null,
        created_at: d.created_at,
      })));
    } catch (err) {
      next(err);
    }
  }

  public static async getUpcomingDemos(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const demos = await DemoRequest.find({
        status: { $in: ['SCHEDULED', 'CONFIRMED'] },
        confirmed_date: { $gte: new Date() },
      })
        .sort({ confirmed_date: 1 })
        .limit(10)
        .populate('assigned_to', 'name email');

      res.json(demos.map((d: any) => ({
        id: d._id,
        reference_code: d.reference_code,
        full_name: d.full_name,
        company: d.company,
        status: d.status,
        confirmed_date: d.confirmed_date,
        confirmed_time: d.confirmed_time,
        duration: d.duration,
        meeting_link: d.meeting_link,
        assigned_user_name: d.assigned_to?.name || null,
      })));
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // Demo List & Management
  // ==========================================
  public static async listDemos(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const {
        search,
        status,
        interest_area,
        assigned_to,
        from_date,
        to_date,
        page = 1,
        limit = 20,
      } = req.query;

      const filter: any = {};
      if (status && status !== 'ALL') filter.status = status;
      if (interest_area && interest_area !== 'ALL') filter.interest_area = interest_area;
      if (assigned_to) filter.assigned_to = assigned_to;

      if (from_date || to_date) {
        filter.created_at = {};
        if (from_date) filter.created_at.$gte = new Date(from_date as string);
        if (to_date) filter.created_at.$lte = new Date(to_date as string);
      }

      if (search) {
        const s = String(search);
        filter.$or = [
          { reference_code: { $regex: s, $options: 'i' } },
          { full_name: { $regex: s, $options: 'i' } },
          { work_email: { $regex: s, $options: 'i' } },
          { company: { $regex: s, $options: 'i' } },
        ];
      }

      const total = await DemoRequest.countDocuments(filter);
      const effLimit = Number(limit);
      const effSkip = (Number(page) - 1) * effLimit;

      const demos = await DemoRequest.find(filter)
        .populate('assigned_to', 'name email')
        .sort({ created_at: -1 })
        .skip(effSkip)
        .limit(effLimit);

      const items = await Promise.all(
        demos.map(async (d: any) => {
          const history = await DemoScheduleHistory.find({ demo_request_id: d._id }).populate('changed_by_user_id', 'name');
          return {
            id: d._id,
            reference_code: d.reference_code,
            full_name: d.full_name,
            work_email: d.work_email,
            phone: d.phone,
            company: d.company,
            role: d.role,
            entities_count: d.entities_count,
            interest_area: d.interest_area,
            preferred_date: d.preferred_date,
            preferred_time: d.preferred_time,
            confirmed_date: d.confirmed_date,
            confirmed_time: d.confirmed_time,
            duration: d.duration,
            meeting_link: d.meeting_link,
            status: d.status,
            assigned_to: d.assigned_to?._id || null,
            assigned_user_name: d.assigned_to?.name || null,
            internal_notes: d.internal_notes,
            created_at: d.created_at,
            history: history.map((h: any) => ({
              id: h._id,
              demo_request_id: h.demo_request_id,
              old_date: h.old_date,
              old_time: h.old_time,
              new_date: h.new_date,
              new_time: h.new_time,
              changed_by_name: h.changed_by_user_id?.name || null,
              reason: h.reason,
              created_at: h.created_at,
            })),
          };
        })
      );

      res.json({
        total,
        page: Number(page),
        limit: effLimit,
        items,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async getDemoDetail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const demo = await DemoRequest.findById(id).populate('assigned_to', 'name email');
      if (!demo) {
        res.status(404).json({ detail: 'Demo request not found' });
        return;
      }

      const history = await DemoScheduleHistory.find({ demo_request_id: demo._id }).populate('changed_by_user_id', 'name');

      res.json({
        id: demo._id,
        reference_code: demo.reference_code,
        full_name: demo.full_name,
        work_email: demo.work_email,
        phone: demo.phone,
        company: demo.company,
        role: demo.role,
        entities_count: demo.entities_count,
        interest_area: demo.interest_area,
        preferred_date: demo.preferred_date,
        preferred_time: demo.preferred_time,
        confirmed_date: demo.confirmed_date,
        confirmed_time: demo.confirmed_time,
        duration: demo.duration,
        meeting_link: demo.meeting_link,
        status: demo.status,
        assigned_to: (demo as any).assigned_to?._id || null,
        assigned_user_name: (demo as any).assigned_to?.name || null,
        internal_notes: demo.internal_notes,
        created_at: demo.created_at,
        history: history.map((h: any) => ({
          id: h._id,
          demo_request_id: h.demo_request_id,
          old_date: h.old_date,
          old_time: h.old_time,
          new_date: h.new_date,
          new_time: h.new_time,
          changed_by_name: h.changed_by_user_id?.name || null,
          reason: h.reason,
          created_at: h.created_at,
        })),
      });
    } catch (err) {
      next(err);
    }
  }

  public static async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const demo = await DemoRequest.findByIdAndUpdate(id, { status }, { new: true });
      if (!demo) {
        res.status(404).json({ detail: 'Demo not found' });
        return;
      }
      res.json(demo);
    } catch (err) {
      next(err);
    }
  }

  public static async assignDemo(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { assigned_to } = req.body;
      const demo = await DemoRequest.findByIdAndUpdate(id, { assigned_to }, { new: true });
      if (!demo) {
        res.status(404).json({ detail: 'Demo not found' });
        return;
      }
      res.json(demo);
    } catch (err) {
      next(err);
    }
  }

  public static async rescheduleDemo(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { confirmed_date, confirmed_time, reason, duration, meeting_link } = req.body;

      const demo = await DemoRequest.findById(id);
      if (!demo) {
        res.status(404).json({ detail: 'Demo not found' });
        return;
      }

      await DemoScheduleHistory.create({
        demo_request_id: demo._id,
        old_date: demo.confirmed_date,
        old_time: demo.confirmed_time,
        new_date: confirmed_date ? new Date(confirmed_date) : null,
        new_time: confirmed_time,
        reason,
      });

      demo.confirmed_date = confirmed_date ? new Date(confirmed_date) : demo.confirmed_date;
      demo.confirmed_time = confirmed_time || demo.confirmed_time;
      if (duration) demo.duration = duration;
      if (meeting_link) demo.meeting_link = meeting_link;
      demo.status = 'RESCHEDULED';
      await demo.save();

      res.json(demo);
    } catch (err) {
      next(err);
    }
  }

  public static async getUsers(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const users = await DemoAdminUser.find({ is_active: true });
      const items = await Promise.all(
        users.map(async (u) => {
          const count = await DemoRequest.countDocuments({ assigned_to: u._id });
          return {
            id: u._id,
            name: u.name,
            email: u.email,
            role: u.role,
            is_active: u.is_active,
            assigned_count: count,
          };
        })
      );
      res.json(items);
    } catch (err) {
      next(err);
    }
  }
}
