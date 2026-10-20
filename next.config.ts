import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Bundle the access-controlled APK with traced server deployments.
  outputFileTracingIncludes: {
    "/api/software/hemox/download": ["./assets/software/HEMOXV1.3.7.1.apk"],
  },
};

export default nextConfig;
