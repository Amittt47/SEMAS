import mongoose, { Schema, Document } from "mongoose";

export interface ISettings extends Document {
  key: "global";                // Singleton document
  detection: {
    alertThreshold: number;     // events per second
    mlAnomalyDetection: boolean;
    autoBlock: boolean;
  };
  retention: {
    logRetentionDays: number;
    realtimeStream: boolean;
  };
  notifications: {
    alertEmail: string;
    emailAlertsEnabled: boolean;
    minSeverityForEmail: string;
  };
  integrations: {
    splunk: boolean;
    pagerduty: boolean;
    slack: boolean;
    jira: boolean;
  };
  updatedAt: Date;
}

const SettingsSchema = new Schema<ISettings>(
  {
    key: { type: String, default: "global", unique: true },
    detection: {
      alertThreshold:      { type: Number, default: 500 },
      mlAnomalyDetection:  { type: Boolean, default: true },
      autoBlock:           { type: Boolean, default: false },
    },
    retention: {
      logRetentionDays: { type: Number, default: 90 },
      realtimeStream:   { type: Boolean, default: true },
    },
    notifications: {
      alertEmail:            { type: String, default: "soc@example.com" },
      emailAlertsEnabled:    { type: Boolean, default: true },
      minSeverityForEmail:   { type: String, default: "high" },
    },
    integrations: {
      splunk:    { type: Boolean, default: false },
      pagerduty: { type: Boolean, default: false },
      slack:     { type: Boolean, default: false },
      jira:      { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

export const Settings = mongoose.model<ISettings>("Settings", SettingsSchema);
