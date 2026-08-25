import mongoose, { Schema, Document } from "mongoose";

export type ReportStatus = "pending" | "generating" | "ready" | "failed";
export type ReportType = "weekly_threat" | "incident_response" | "compliance" | "network_baseline" | "custom";

export interface IReport extends Document {
  reportId: string;
  name: string;
  type: ReportType;
  period: string;
  periodStart: Date;
  periodEnd: Date;
  status: ReportStatus;
  size?: string;
  generatedBy: string;
  filePath?: string;
  summary?: {
    totalAlerts: number;
    criticalAlerts: number;
    totalLogs: number;
    topSources: string[];
    topRules: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}

const ReportSchema = new Schema<IReport>(
  {
    reportId:    { type: String, required: true, unique: true, index: true },
    name:        { type: String, required: true },
    type:        { type: String, enum: ["weekly_threat","incident_response","compliance","network_baseline","custom"], required: true },
    period:      { type: String, required: true },
    periodStart: { type: Date, required: true },
    periodEnd:   { type: Date, required: true },
    status:      { type: String, enum: ["pending","generating","ready","failed"], default: "pending" },
    size:        { type: String },
    generatedBy: { type: String, required: true },
    filePath:    { type: String },
    summary: {
      totalAlerts:   { type: Number },
      criticalAlerts:{ type: Number },
      totalLogs:     { type: Number },
      topSources:    [{ type: String }],
      topRules:      [{ type: String }],
    },
  },
  { timestamps: true }
);

export const Report = mongoose.model<IReport>("Report", ReportSchema);
