import { Request, Response, NextFunction } from 'express';
import { Notification } from '../models/Notification';
import { Invoice } from '../models/Invoice';
import { Product } from '../models/Product';

export class NotificationController {
  public static async getNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { entity_id, limit = 20 } = req.query;
      if (!entity_id) {
        res.status(400).json({ detail: 'entity_id is required' });
        return;
      }

      const unreadCount = await Notification.countDocuments({ entity_id, is_read: false });
      const totalCount = await Notification.countDocuments({ entity_id });

      const notifications = await Notification.find({ entity_id })
        .sort({ created_at: -1 })
        .limit(Number(limit));

      const items = notifications.map((n) => ({
        id: n._id,
        entity_id: n.entity_id,
        title: n.title,
        message: n.message,
        notification_type: n.notification_type,
        link_url: n.link_url,
        is_read: n.is_read,
        read_at: n.read_at,
        created_at: n.created_at,
      }));

      res.json({
        unread_count: unreadCount,
        total_count: totalCount,
        notifications: items,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async markAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const notif = await Notification.findByIdAndUpdate(
        id,
        { is_read: true, read_at: new Date() },
        { new: true }
      );
      if (!notif) {
        res.status(404).json({ detail: 'Notification not found' });
        return;
      }

      res.json({
        id: notif._id,
        entity_id: notif.entity_id,
        title: notif.title,
        message: notif.message,
        is_read: notif.is_read,
        read_at: notif.read_at,
        created_at: notif.created_at,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async markAllAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { entity_id } = req.query;
      if (!entity_id) {
        res.status(400).json({ detail: 'entity_id is required' });
        return;
      }

      await Notification.updateMany({ entity_id, is_read: false }, { is_read: true, read_at: new Date() });
      res.json({ message: 'All notifications marked as read' });
    } catch (err) {
      next(err);
    }
  }

  public static async triggerChecks(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { entity_id } = req.query;
      if (!entity_id) {
        res.status(400).json({ detail: 'entity_id is required' });
        return;
      }

      let alertsCount = 0;

      // 1. Check overdue invoices
      const overdueInvoices = await Invoice.find({
        entity_id,
        due_date: { $lt: new Date() },
        status: { $in: ['POSTED', 'PARTIALLY_PAID', 'SENT'] },
      });

      for (const inv of overdueInvoices) {
        const existingAlert = await Notification.findOne({
          entity_id,
          notification_type: 'OVERDUE_INVOICE',
          title: `Overdue: Invoice #${inv.invoice_number}`,
        });
        if (!existingAlert) {
          await Notification.create({
            entity_id,
            notification_type: 'OVERDUE_INVOICE',
            title: `Overdue: Invoice #${inv.invoice_number}`,
            message: `Invoice #${inv.invoice_number} is past due date. Balance due: ₹${inv.balance_due}`,
            link_url: `/invoices/${inv._id}`,
          });
          alertsCount++;
        }
      }

      // 2. Check low stock items
      const lowStockProducts = await Product.find({
        entity_id,
        is_active: true,
        $expr: { $lte: ['$current_stock', '$min_stock_alert'] },
      });

      for (const prod of lowStockProducts) {
        const existingAlert = await Notification.findOne({
          entity_id,
          notification_type: 'LOW_STOCK',
          title: `Low Stock: ${prod.name}`,
        });
        if (!existingAlert) {
          await Notification.create({
            entity_id,
            notification_type: 'LOW_STOCK',
            title: `Low Stock: ${prod.name}`,
            message: `Current stock of ${prod.name} (${prod.current_stock}) is below threshold (${prod.min_stock_alert}).`,
            link_url: `/inventory`,
          });
          alertsCount++;
        }
      }

      res.json({
        message: 'Automation cycle completed successfully',
        new_alerts_count: alertsCount,
        recurring_invoices_generated: 0,
      });
    } catch (err) {
      next(err);
    }
  }
}
