import { Router } from 'express';
import mongoose from 'mongoose';
import { requireAuth, asyncHandler } from '../auth.js';
import { Ticket, User } from '../models.js';

const router = Router();
router.use(requireAuth);

/**
 * Dashboard statistics computed from ACTUAL ticket data.
 * Role-aware: customers see their own numbers, agents/admins see the desk.
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { user } = req;
    const userOid = new mongoose.Types.ObjectId(user.id);
    const scope = user.role === 'customer' ? { customer: userOid } : {};

    const [total, newCount, assigned, inProgress, resolved] = await Promise.all([
      Ticket.countDocuments(scope),
      Ticket.countDocuments({ ...scope, status: 'new' }),
      Ticket.countDocuments({ ...scope, status: 'assigned' }),
      Ticket.countDocuments({ ...scope, status: 'in_progress' }),
      Ticket.countDocuments({ ...scope, status: 'resolved' }),
    ]);

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const today = await Ticket.countDocuments({ ...scope, createdAt: { $gte: startOfDay } });

    // Average resolution time (hours) over actually resolved tickets
    const resolutionAgg = await Ticket.aggregate([
      { $match: { ...scope, resolvedAt: { $ne: null } } },
      {
        $group: {
          _id: null,
          avgHours: { $avg: { $divide: [{ $subtract: ['$resolvedAt', '$createdAt'] }, 3600000] } },
          count: { $sum: 1 },
        },
      },
    ]);

    const byCategoryAgg = await Ticket.aggregate([
      { $match: scope },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    const byPriorityAgg = await Ticket.aggregate([
      { $match: scope },
      { $group: { _id: '$priority', count: { $sum: 1 } } },
    ]);

    const stats = {
      total,
      new: newCount,
      assigned,
      inProgress,
      resolved,
      today,
      open: newCount + assigned + inProgress,
      resolutionRate: total ? Math.round((resolved / total) * 100) : 0,
      avgResolutionHours:
        resolutionAgg.length && resolutionAgg[0].avgHours != null
          ? Math.round(resolutionAgg[0].avgHours * 10) / 10
          : null,
      byCategory: byCategoryAgg.map((row) => ({ category: row._id, count: row.count })),
      byPriority: byPriorityAgg.map((row) => ({ priority: row._id, count: row.count })),
    };

    if (user.role !== 'customer') {
      // Agent leaderboard (agent sees peers, admin sees everyone)
      const agentScope = user.role === 'agent' ? { assignedAgent: userOid } : {};
      const leaderAgg = await Ticket.aggregate([
        { $match: { ...agentScope, resolvedAt: { $ne: null } } },
        { $group: { _id: '$assignedAgent', resolved: { $sum: 1 } } },
        { $sort: { resolved: -1 } },
      ]);
      const agentIds = leaderAgg.map((row) => row._id).filter(Boolean);
      const agents = await User.find({ _id: { $in: agentIds } });
      const nameMap = new Map(agents.map((a) => [a._id.toString(), a]));
      stats.leaderboard = leaderAgg
        .filter((row) => nameMap.has(row._id?.toString()))
        .map((row) => ({
          agent: nameMap.get(row._id.toString()).name,
          resolved: row.resolved,
        }));
    }

    res.json({ stats });
  })
);

export default router;
