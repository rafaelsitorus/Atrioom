"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { serverApi } from "@/lib/server-api";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { EventRow } from "@/lib/types";

const createEventSchema = z.object({
  name: z.string().min(1, "Nama event wajib diisi.").max(200),
  venue: z.string().max(200).optional(),
  capacity: z.coerce.number().int().positive().optional(),
  startsAt: z.string().min(1, "Tanggal mulai wajib diisi."),
  endsAt: z.string().optional(),
});

export type CreateEventState = {
  error?: string;
  fieldErrors?: { name?: string; venue?: string; capacity?: string; startsAt?: string; endsAt?: string };
};

export async function createEventAction(
  _prev: CreateEventState,
  formData: FormData,
): Promise<CreateEventState> {
  const parsed = createEventSchema.safeParse({
    name: formData.get("name"),
    venue: formData.get("venue") || undefined,
    capacity: formData.get("capacity") || undefined,
    startsAt: formData.get("startsAt"),
    endsAt: formData.get("endsAt") || undefined,
  });

  if (!parsed.success) {
    const fe = parsed.error.flatten().fieldErrors;
    return {
      error: "Periksa kembali isian Anda.",
      fieldErrors: {
        name: fe.name?.[0],
        venue: fe.venue?.[0],
        capacity: fe.capacity?.[0],
        startsAt: fe.startsAt?.[0],
        endsAt: fe.endsAt?.[0],
      },
    };
  }

  // Ambil org_id dari Supabase — untuk sekarang default ke user.id (single-org mode).
  // Multi-org akan datang di EPIC00 lanjutan (event_members.org_id).
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sesi habis. Silakan login ulang." };

  const created = await serverApi.post<EventRow>("/v1/events", {
    orgId: user.id,        // sementara single-tenant
    name: parsed.data.name,
    venue: parsed.data.venue,
    capacity: parsed.data.capacity,
    startsAt: new Date(parsed.data.startsAt).toISOString(),
    endsAt: parsed.data.endsAt ? new Date(parsed.data.endsAt).toISOString() : undefined,
  });

  revalidatePath("/events");
  redirect(`/events/${created.id}/guests`);
}

export async function archiveEventAction(id: string): Promise<void> {
  await serverApi.post(`/v1/events/${id}/archive`);
  revalidatePath("/events");
}

export async function duplicateEventAction(id: string, newName: string): Promise<void> {
  await serverApi.post(`/v1/events/${id}/duplicate`, { newName });
  revalidatePath("/events");
}