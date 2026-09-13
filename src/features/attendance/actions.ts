"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/server/auth/current-user";
import { checkIn, checkOut, toWorkSessionView } from "./work-session-service";
import type { AttendanceActionState } from "./types";

export async function updateWorkSessionAction(
  previousState: AttendanceActionState,
  formData: FormData,
): Promise<AttendanceActionState> {
  const serverNow = new Date().toISOString();
  try {
    const user = await getCurrentUser();
    if (!user) {
      return {
        ...previousState,
        revision: Date.now(),
        serverNow,
        session: null,
        event: null,
        error: "UNAUTHENTICATED",
      };
    }

    const intent = formData.get("intent");

    if (intent === "check-in") {
      const session = await checkIn(user.id);
      revalidatePath("/");
      return {
        revision: Date.now(),
        serverNow,
        session: toWorkSessionView(session),
        event: "CHECKED_IN",
        error: null,
      };
    }

    if (intent === "check-out") {
      await checkOut(user.id);
      revalidatePath("/");
      return {
        revision: Date.now(),
        serverNow,
        session: null,
        event: "CHECKED_OUT",
        error: null,
      };
    }

    return { ...previousState, revision: Date.now(), serverNow, error: "UPDATE_FAILED" };
  } catch (error) {
    console.error("Work session update failed", error);
    return { ...previousState, revision: Date.now(), serverNow, error: "UPDATE_FAILED" };
  }
}
