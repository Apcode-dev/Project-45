import mongoose, { Schema, Document } from "mongoose";

export interface ICounter extends Document {
  name: string;
  seq: number;
}

const CounterSchema: Schema = new Schema({
  name: { type: String, required: true, unique: true },
  seq: { type: Number, default: 0 },
});

export const CounterModel =
  mongoose.models.Counter || mongoose.model<ICounter>("Counter", CounterSchema);
