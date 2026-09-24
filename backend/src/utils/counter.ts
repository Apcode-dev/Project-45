import { CounterModel } from "../database/models/Counter.js";

export async function generateNextSequenceNumber(prefix: string, session?: any): Promise<string> {
  const currentYear = new Date().getFullYear();
  const counterName = `${prefix}_${currentYear}`;

  const counter = await CounterModel.findOneAndUpdate(
    { name: counterName },
    { $inc: { seq: 1 } },
    { new: true, upsert: true, session: session || null }
  );

  const paddedSeq = String(counter.seq).padStart(6, "0");
  return `${prefix}-${currentYear}-${paddedSeq}`;
}
