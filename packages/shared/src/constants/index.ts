export const LICENSE_CODES = ["personal", "commercial", "extended"] as const;

export const LICENSES: Record<
  (typeof LICENSE_CODES)[number],
  { name: string; summary: string }
> = {
  personal: {
    name: "Personal Use",
    summary:
      "Use in personal, non-commercial projects. No redistribution or resale.",
  },
  commercial: {
    name: "Commercial Use",
    summary:
      "Use in commercial projects for yourself or one client. No resale as-is.",
  },
  extended: {
    name: "Extended Commercial",
    summary:
      "Use in unlimited commercial projects and templates. Includes broader resale rights.",
  },
};

export const DEFAULT_PLATFORM_FEE_PERCENT = 10;

export const SUPPORTED_CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD"] as const;

export const DEFAULT_CURRENCY: (typeof SUPPORTED_CURRENCIES)[number] = "USD";

export const MAX_UPLOAD_SIZE_BYTES = 500 * 1024 * 1024; // 500 MB

export const DOWNLOAD_GRANT_TTL_MINUTES = 15;
export const DOWNLOAD_GRANT_MAX_DOWNLOADS = 5;
