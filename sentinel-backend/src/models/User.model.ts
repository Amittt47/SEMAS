import mongoose, { Schema, Document } from "mongoose";
import bcrypt from "bcryptjs";

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string; 
  role: "admin" | "analyst" | "viewer";
  lastLogin?: Date;
  createdAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
  {
    name:      { type: String, required: true, trim: true },
    email:     { type: String, required: true, unique: true, lowercase: true, trim: true },
    password:  { type: String, required: true, minlength: 8 },
    role:      { type: String, enum: ["admin", "analyst", "viewer"], default: "analyst" },
    lastLogin: { type: Date },
  },
  { timestamps: true }
);

// Hash password before save
UserSchema.pre<IUser>("save", async function (next) {
  const user = this as IUser & { password: string }; // Tell TS password exists here
  if (!user.isModified("password")) return next();
  user.password = await bcrypt.hash(user.password, 12);
  next();
});

UserSchema.methods.comparePassword = function (candidate: string) {
  return bcrypt.compare(candidate, (this as any).password);
};

// Never expose password or version key in JSON
UserSchema.set("toJSON", {
  transform: (_doc, ret) => {
    const data = ret as any;
    delete data.password;
    delete data.__v;
    return data;
  },
});

export const User = mongoose.model<IUser>("User", UserSchema);