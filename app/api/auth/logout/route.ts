import { endSession, handle } from "@/lib/auth";

export async function POST() {
  return handle(async () => {
    await endSession();
    return { ok: true };
  });
}
