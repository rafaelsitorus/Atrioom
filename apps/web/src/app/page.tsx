// Root entry — redirect ke dashboard (middleware akan mengarahkan ke /login bila belum auth).
import { redirect } from "next/navigation";

export default function RootPage() {
  redirect("/dashboard");
}