import { getCurrentUser, handle } from "@/lib/auth";

export async function GET() {
  return handle(async () => ({ user: await getCurrentUser() }));
}
