import { NextResponse } from "next/server";
import { addStudentGrade, getGradeReport, parseGradeInput } from "@/lib/grades";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const report = await getGradeReport();
    return NextResponse.json(report);
  } catch (error) {
    console.error("Failed to load grade report", error);
    return NextResponse.json({ error: "Unable to load the grade report." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as Parameters<typeof parseGradeInput>[0];
    const parsed = parseGradeInput(payload);

    if (!parsed.data) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const grade = await addStudentGrade(parsed.data);
    return NextResponse.json({ grade }, { status: 201 });
  } catch (error) {
    console.error("Failed to add grade", error);
    return NextResponse.json({ error: "Unable to add the student grade." }, { status: 500 });
  }
}
