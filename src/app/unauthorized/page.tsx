import Link from "next/link";
import { getTranslations } from "next-intl/server";

export default async function Unauthorized() {
  const t = await getTranslations("Authentication");
  return <main className="mx-auto grid min-h-dvh max-w-lg content-center gap-5 px-6">
    <h1 className="text-3xl font-semibold">{t("deniedTitle")}</h1>
    <p>{t("deniedDescription")}</p>
    <Link href="/" className="min-h-12 rounded-xl bg-indigo-700 p-3 text-center text-white focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-indigo-700">{t("back")}</Link>
  </main>;
}
