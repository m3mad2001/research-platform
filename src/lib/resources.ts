export const resourceOptions = [
  { key: "courses", label: "Courses" },
  { key: "hemox", label: "HEMOX Research Suite" },
  { key: "software", label: "Software & APK" },
  { key: "firmware", label: "Firmware" },
  { key: "explorers", label: "Interactive Explorers" },
  { key: "datasets", label: "Datasets" },
  { key: "silo", label: "SILO — Simulator-in-the-Loop Analog/RFIC Design" },
] as const;

export type ResourceKey = (typeof resourceOptions)[number]["key"];

export type ResourceVisibilityMode = "visible" | "locked" | "hidden";

export const defaultResourceVisibility: Record<ResourceKey, ResourceVisibilityMode> = Object.fromEntries(
  resourceOptions.map((resource) => [resource.key, "locked"]),
) as Record<ResourceKey, ResourceVisibilityMode>;
