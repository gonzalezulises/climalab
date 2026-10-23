import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

// La portada pública vive en otro proyecto (repo gonzalezulises/pulseorg-demo).
// Solo "/" se reescribe; login, encuestas y dashboard siguen aquí.
const LANDING_URL = "https://pulseorg-demo.vercel.app/";

const nextConfig: NextConfig = {
  rewrites: async () => ({
    beforeFiles: [{ source: "/", destination: LANDING_URL }],
    afterFiles: [],
    fallback: [],
  }),
  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      ],
    },
  ],
};

export default withNextIntl(nextConfig);
