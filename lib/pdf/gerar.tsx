import { renderToBuffer } from "@react-pdf/renderer";
import { PropostaDocument } from "./PropostaDocument";
import type { PropostaPdfData } from "./types";

export async function gerarPdfProposta(dados: PropostaPdfData): Promise<Buffer> {
  return renderToBuffer(<PropostaDocument dados={dados} />);
}
