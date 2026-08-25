import mongoose, { Schema, Document } from "mongoose";

export type LogLevel = "ERROR" | "WARN" | "INFO" | "DEBUG";

export interface ILog extends Document {
  logId: string;
  timestamp: Date;
  level: LogLevel;
  sourceIp: string;
  destinationIp?: string;
  protocol: string;
  port?: number;
  message: string;
  agentId?: string;
  hostname?: string;
  processName?: string;
  userId?: string;
  rawData?: string;
  parsedFields?: Record<string, unknown>;
  createdAt: Date;
}

const LogSchema = new Schema<ILog>(
  {
    logId:         { type: String, required: true, unique: true, index: true },
    timestamp:     { type: Date, required: true, index: true, default: Date.now },
    level:         { type: String, enum: ["ERROR","WARN","INFO","DEBUG"], required: true, index: true },
    sourceIp:      { type: String, required: true, index: true },
    destinationIp: { type: String },
    protocol:      { type: String, required: true },
    port:          { type: Number },
    message:       { type: String, required: true },
    agentId:       { type: String },
    hostname:      { type: String },
    processName:   { type: String },
    userId:        { type: String },
    rawData:       { type: String },
    parsedFields:  { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

LogSchema.index({ level: 1, timestamp: -1 });
LogSchema.index({ sourceIp: 1, timestamp: -1 });

// Auto-expire debug logs after 30 days, others per retention setting (TTL managed via cron/service)
// TTL index placeholder — real retention managed by RetentionService
export const Log = mongoose.model<ILog>("Log", LogSchema);
