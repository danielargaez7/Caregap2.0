import { EvalCase } from "../types";

export const utilityFunctionCases: EvalCase[] = [
  {
    id: "util-001",
    category: "utility_function",
    name: "Format 09:00 as 9:00 AM",
    description: "Should convert 24-hour time 09:00 to 12-hour format 9:00 AM.",
    input: { time: "09:00" },
    expected: { assertions: [{ field: "result", operator: "equals", value: "9:00 AM", description: "09:00 → 9:00 AM" }] },
    metadata: { severity: "low", clinical_domain: "Utility", tags: ["time-format", "am"] },
  },
  {
    id: "util-002",
    category: "utility_function",
    name: "Format 14:30 as 2:30 PM",
    description: "Should convert 24-hour time 14:30 to 12-hour format 2:30 PM.",
    input: { time: "14:30" },
    expected: { assertions: [{ field: "result", operator: "equals", value: "2:30 PM", description: "14:30 → 2:30 PM" }] },
    metadata: { severity: "low", clinical_domain: "Utility", tags: ["time-format", "pm"] },
  },
  {
    id: "util-003",
    category: "utility_function",
    name: "Format 12:00 as 12:00 PM",
    description: "Should correctly handle noon (12:00) as 12:00 PM, not 0:00 PM.",
    input: { time: "12:00" },
    expected: { assertions: [{ field: "result", operator: "equals", value: "12:00 PM", description: "12:00 → 12:00 PM" }] },
    metadata: { severity: "low", clinical_domain: "Utility", tags: ["time-format", "noon", "edge-case"] },
  },
];
