import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; versionId: string }> }
) {
  const { id, versionId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const { data: versao } = await supabase
    .from("proposal_versions")
    .select("pdf_path, proposal_id")
    .eq("id", versionId)
    .eq("proposal_id", id)
    .maybeSingle();

  if (!versao?.pdf_path) {
    return NextResponse.json({ erro: "Versão não encontrada." }, { status: 404 });
  }

  const { data: signed, error } = await supabase.storage
    .from("propostas-geradas")
    .createSignedUrl(versao.pdf_path, 60 * 5);

  if (error || !signed) {
    return NextResponse.json({ erro: "Não foi possível gerar o link de download." }, { status: 500 });
  }

  return NextResponse.redirect(signed.signedUrl);
}
