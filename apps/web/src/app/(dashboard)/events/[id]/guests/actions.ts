"use server";

import { revalidatePath } from "next/cache";
import { api } from "@/lib/api-client";

const walkInSchema = {
  fullName: (v: FormDataEntryValue | null) => String(v ?? "").trim(),
  category: (v: FormDataEntryValue | null) => String(v ?? "REGULER"),
  email: (v: FormDataEntryValue | null) => String(v ?? "").trim(),
  phone: (v: FormDataEntryValue | null) => String(v ?? "").trim(),
  plusOne: (v: FormDataEntryValue | null) => Number(v ?? 0),
  diet: (v: FormDataEntryValue | null) => String(v ?? "").trim(),
};

export async function addWalkInAction(eventId: string, formData: FormData): Promise<void> {
  const body = {
    fullName: walkInSchema.fullName(formData.get("fullName")),
    category: walkInSchema.category(formData.get("category")),
    email: walkInSchema.email(formData.get("email")) || undefined,
    phone: walkInSchema.phone(formData.get("phone")) || undefined,
    plusOneCount: walkInSchema.plusOne(formData.get("plusOneCount")),
    dietNotes: walkInSchema.diet(formData.get("dietNotes")) || undefined,
    source: "WALK_IN" as const,
  };
  await api.post(`/v1/events/${eventId}/guests`, body);
  revalidatePath(`/events/${eventId}/guests`);
}

export async function deleteGuestAction(eventId: string, guestId: string): Promise<void> {
  await api.delete(`/v1/guests/${guestId}`);
  revalidatePath(`/events/${eventId}/guests`);
}