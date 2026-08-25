import { Response, NextFunction } from "express";
import { Settings } from "../models/Settings.model";
import { AuthRequest } from "../middleware/auth.middleware";

export async function getSettings(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    let settings = await Settings.findOne({ key: "global" });
    if (!settings) settings = await Settings.create({ key: "global" });
    res.json({ data: settings });
  } catch (err) { next(err); }
}

export async function updateSettings(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const settings = await Settings.findOneAndUpdate(
      { key: "global" },
      { $set: req.body },
      { new: true, upsert: true, runValidators: true }
    );
    res.json({ data: settings, message: "Settings saved" });
  } catch (err) { next(err); }
}
