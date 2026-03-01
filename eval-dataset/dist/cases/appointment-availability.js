"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.appointmentAvailabilityCases = void 0;
exports.appointmentAvailabilityCases = [
    {
        id: "appt-001",
        category: "appointment_availability",
        name: "Available slots for Dr. Patel",
        description: "Should return available appointment slots for Dr. Patel on a weekday.",
        input: { provider_name: "Patel", start_date: "2026-02-24", end_date: "2026-02-24" },
        expected: {
            assertions: [
                { field: "data.provider", operator: "contains", value: "Patel", description: "Correct provider" },
                { field: "data.available_slots.length", operator: "greater_than", value: 0, description: "Slots available" },
            ],
        },
        metadata: { severity: "low", clinical_domain: "Scheduling", tags: ["availability", "weekday"] },
    },
    {
        id: "appt-002",
        category: "appointment_availability",
        name: "Exclude booked appointment times",
        description: "Should exclude 9:00 AM on 2026-02-24 which is already booked for Jane Doe with Dr. Patel.",
        input: { provider_name: "Patel", start_date: "2026-02-24", end_date: "2026-02-24" },
        expected: {
            assertions: [
                { field: "data.available_slots", operator: "every_item_satisfies", value: "time_not_0900", description: "9:00 AM slot excluded (already booked)" },
            ],
        },
        metadata: { severity: "medium", clinical_domain: "Scheduling", tags: ["booking-conflict", "exclusion"] },
    },
    {
        id: "appt-003",
        category: "appointment_availability",
        name: "Skip weekends",
        description: "Should return zero available slots when the date range falls on a weekend.",
        input: { provider_name: "Patel", start_date: "2026-02-28", end_date: "2026-03-01" },
        expected: {
            assertions: [
                { field: "data.available_slots.length", operator: "equals", value: 0, description: "No weekend slots" },
            ],
        },
        metadata: { severity: "low", clinical_domain: "Scheduling", tags: ["weekend", "no-availability"] },
    },
    {
        id: "appt-004",
        category: "appointment_availability",
        name: "Unknown provider fails domain constraints",
        description: "Should fail verification when searching for a provider not in the system.",
        input: { provider_name: "Dr. FakeName", start_date: "2026-02-24", end_date: "2026-02-24" },
        expected: {
            assertions: [
                { field: "verification.passed", operator: "is_false", description: "Verification fails" },
                { field: "verification.errors", operator: "includes_item", value: "DOMAIN RULE", description: "Domain rule violation" },
            ],
        },
        metadata: { severity: "medium", clinical_domain: "Scheduling", tags: ["unknown-provider", "domain-constraint", "negative-test"] },
    },
];
