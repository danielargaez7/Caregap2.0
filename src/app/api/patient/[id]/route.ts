import { NextResponse } from "next/server";
import { fetchPatientData } from "@/lib/fhir/fetch-patient";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const payload = await fetchPatientData(params.id);
    return NextResponse.json(payload);
  } catch (error) {
    console.error("[API] /api/patient/[id] error:", error);
    return NextResponse.json({ error: "Failed to fetch patient data" }, { status: 500 });
  }
}
