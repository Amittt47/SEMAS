import { Response, NextFunction } from "express";
import { Report } from "../models/Report.model";
import { Alert } from "../models/Alert.model";
import { Log } from "../models/Log.model";
import { AppError } from "../middleware/errorHandler";
import { AuthRequest } from "../middleware/auth.middleware";

function genId() {
  return `RPT-${String(Math.floor(Math.random() * 9000) + 1000)}`;
}

export async function getReports(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const reports = await Report.find().sort({ createdAt: -1 });
    res.json({ data: reports });
  } catch (err) { next(err); }
}

export async function getReportById(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const report = await Report.findOne({ reportId: req.params.id });
    if (!report) throw new AppError(404, "Report not found");
    res.json({ data: report });
  } catch (err) { next(err); }
}

export async function generateReport(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { name, type, periodStart, periodEnd } = req.body;
    const start = new Date(periodStart);
    const end   = new Date(periodEnd);

    const report = await Report.create({
      reportId: genId(),
      name,
      type: type || "custom",
      period: `${start.toDateString()} – ${end.toDateString()}`,
      periodStart: start,
      periodEnd: end,
      status: "generating",
      generatedBy: req.user!.email,
    });

    // Async simulation of report generation
    setTimeout(async () => {
      try {
        const [totalAlerts, criticalAlerts, totalLogs] = await Promise.all([
          Alert.countDocuments({ createdAt: { $gte: start, $lte: end } }),
          Alert.countDocuments({ severity: "critical", createdAt: { $gte: start, $lte: end } }),
          Log.countDocuments({ timestamp: { $gte: start, $lte: end } }),
        ]);

        const topSourcesAgg = await Alert.aggregate([
          { $match: { createdAt: { $gte: start, $lte: end } } },
          { $group: { _id: "$sourceIp", count: { $sum: 1 } } },
          { $sort: { count: -1 } }, { $limit: 5 },
        ]);
        const topRulesAgg = await Alert.aggregate([
          { $match: { createdAt: { $gte: start, $lte: end } } },
          { $group: { _id: "$rule", count: { $sum: 1 } } },
          { $sort: { count: -1 } }, { $limit: 5 },
        ]);

        const sizeKb = Math.floor(Math.random() * 2000 + 300);
        await Report.findByIdAndUpdate(report._id, {
          status: "ready",
          size: sizeKb > 1024 ? `${(sizeKb / 1024).toFixed(1)} MB` : `${sizeKb} KB`,
          summary: {
            totalAlerts, criticalAlerts, totalLogs,
            topSources: topSourcesAgg.map(x => x._id),
            topRules:   topRulesAgg.map(x => x._id),
          },
        });
      } catch { /* non-fatal */ }
    }, 3000);

    res.status(202).json({ data: report, message: "Report generation queued" });
  } catch (err) { next(err); }
}

export async function deleteReport(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const report = await Report.findOneAndDelete({ reportId: req.params.id });
    if (!report) throw new AppError(404, "Report not found");
    res.json({ message: "Report deleted" });
  } catch (err) { next(err); }
}
