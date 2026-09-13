import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import english from "../../locales/en/common.json";
import thai from "../../locales/th/common.json";
import { withFallback } from "./messages";

const locales = ["th", "en"] as const;

export default getRequestConfig(async () => {
  const requested = (await cookies()).get("locale")?.value;
  const locale = locales.find((candidate) => candidate === requested) ?? "th";

  return {
    locale,
    messages: locale === "th" ? withFallback(english, thai) : english,
  };
});
