import mongoose, { Schema, Document } from "mongoose";

export type Severity = "critical" | "high" | "medium" | "low";
export type AlertStatus = "open" | "acknowledged" | "suppressed" | "resolved";

export interface IAlert extends Document {
  alertId: string;
  message: string;
  severity: Severity;
  status: AlertStatus;
  sourceIp: string;
  destinationIp?: string;
  rule: string;
  ruleCategory: string;
  protocol?: string;
  port?: number;
  agentId?: string;
  rawLog?: string;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

const AlertSchema = new Schema<IAlert>(
  {
    alertId:        { type: String, required: true, unique: true, index: true },
    message:        { type: String, required: true },
    severity:       { type: String, enum: ["critical","high","medium","low"], required: true, index: true },
    status:         { type: String, enum: ["open","acknowledged","suppressed","resolved"], default: "open", index: true },
    sourceIp:       { type: String, required: true, index: true },
    destinationIp:  { type: String },
    rule:           { type: String, required: true },
    ruleCategory:   { type: String, default: "GENERAL" },
    protocol:       { type: String },
    port:           { type: Number },
    agentId:        { type: String },
    rawLog:         { type: String },
    acknowledgedBy: { type: String },
    acknowledgedAt: { type: Date },
    tags:           [{ type: String }],
  },
  { timestamps: true }
);

// Compound index for common dashboard query
AlertSchema.index({ severity: 1, status: 1, createdAt: -1 });

export const Alert = mongoose.model<IAlert>("Alert", AlertSchema);
