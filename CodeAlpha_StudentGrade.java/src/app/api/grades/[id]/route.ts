import { NextResponse } from "next/server";
import { deleteStudentGrade, parseGradeInput, updateStudentGrade } from "@/lib/grades";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function parseId(value: string) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const id = parseId((await context.params).id);

    if (!id) {
      return NextResponse.json({ error: "Invalid grade ID." }, { status: 400 });
    }

    const payload = (await request.json()) as Parameters<typeof parseGradeInput>[0];
    const parsed = parseGradeInput(payload);

    if (!parsed.data) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const grade = await updateStudentGrade(id, parsed.data);

    if (!grade) {
      return NextResponse.json({ error: "Grade record was not found." }, { status: 404 });
    }

    return NextResponse.json({ grade });
  } catch (error) {
    console.error("Failed to update grade", error);
    return NextResponse.json({ error: "Unable to update the grade." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const id = parseId((await context.params).id);

    if (!id) {
      return NextResponse.json({ error: "Invalid grade ID." }, { status: 400 });
    }

    const deleted = await deleteStudentGrade(id);

    if (!deleted) {
      return NextResponse.json({ error: "Grade record was not found." }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to delete grade", error);
    return NextResponse.json({ error: "Unable to delete the grade." }, { status: 500 });
  }
}
