import { Response, NextFunction } from "express";
import { Alert } from "../models/Alert.model";
import { Log } from "../models/Log.model";
import { AuthRequest } from "../middleware/auth.middleware";

export async function getDashboard(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const now   = new Date();
    const h24   = new Date(now.getTime() - 86400000);
    const h1    = new Date(now.getTime() - 3600000);

    const [
      totalAlerts,
      criticalAlerts,
      openAlerts,
      alertsLast24h,
      totalLogs,
      logsLastHour,
      alertsBySeverity,
      alertsOverTime,
      topSources,
      topRules,
      recentAlerts,
    ] = await Promise.all([
      Alert.countDocuments({}),
      Alert.countDocuments({ severity: "critical", status: "open" }),
      Alert.countDocuments({ status: "open" }),
      Alert.countDocuments({ createdAt: { $gte: h24 } }),
      Log.countDocuments({}),
      Log.countDocuments({ timestamp: { $gte: h1 } }),

      // Severity breakdown
      Alert.aggregate([
        { $group: { _id: "$severity", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),

      // Alerts over last 24 h grouped by hour
      Alert.aggregate([
        { $match: { createdAt: { $gte: h24 } } },
        { $group: {
          _id: { $dateToString: { format: "%Y-%m-%dT%H:00:00Z", date: "$createdAt" } },
          count: { $sum: 1 },
        }},
        { $sort: { _id: 1 } },
      ]),

      // Top attacking IPs
      Alert.aggregate([
        { $match: { status: "open" } },
        { $group: { _id: "$sourceIp", count: { $sum: 1 }, severity: { $first: "$severity" } } },
        { $sort: { count: -1 } },
        { $limit: 8 },
      ]),

      // Top triggered rules
      Alert.aggregate([
        { $group: { _id: "$rule", count: { $sum: 1 }, category: { $first: "$ruleCategory" } } },
        { $sort: { count: -1 } },
        { $limit: 8 },
      ]),

      // Most recent open alerts
      Alert.find({ status: "open" })
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
    ]);

    res.json({
      data: {
        counters: {
          totalAlerts,
          criticalAlerts,
          openAlerts,
          alertsLast24h,
          totalLogs,
          logsLastHour,
        },
        charts: {
          alertsBySeverity,
          alertsOverTime,
        },
        tables: {
          topSources,
          topRules,
          recentAlerts,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}
