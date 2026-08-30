import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import type { PropostaPdfData } from "./types";
import { centavosParaBRL } from "@/lib/domain/money";
import { wattsParaKwp } from "@/lib/domain/potencia";
import { formatarDataBR } from "@/lib/format";

const CORES = {
  azulEscuro: "#0B2540",
  ciano: "#00AFFF",
  amarelo: "#FFA500",
  texto: "#1F2937",
  textoClaro: "#6B7280",
  linha: "#E5E7EB",
  fundoClaro: "#F8FAFC",
};

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    color: CORES.texto,
    paddingTop: 70,
    paddingBottom: 56,
    paddingHorizontal: 40,
    backgroundColor: "#FFFFFF",
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 40,
    borderBottomWidth: 2,
    borderBottomColor: CORES.ciano,
  },
  headerTitulo: { fontSize: 9, color: CORES.azulEscuro, fontFamily: "Helvetica-Bold" },
  headerMeta: { fontSize: 8, color: CORES.textoClaro },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 40,
    borderTopWidth: 0.5,
    borderTopColor: CORES.linha,
  },
  footerTexto: { fontSize: 7.5, color: CORES.textoClaro },
  h1: { fontSize: 20, fontFamily: "Helvetica-Bold", color: CORES.azulEscuro, marginBottom: 6 },
  h2: { fontSize: 14, fontFamily: "Helvetica-Bold", color: CORES.azulEscuro, marginBottom: 10 },
  h3: { fontSize: 11, fontFamily: "Helvetica-Bold", color: CORES.azulEscuro, marginBottom: 6 },
  paragrafo: { fontSize: 10, color: CORES.texto, lineHeight: 1.5, marginBottom: 8 },
  secao: { marginBottom: 18 },
  card: {
    backgroundColor: CORES.fundoClaro,
    borderRadius: 6,
    padding: 12,
    marginBottom: 10,
  },
  linhaTabela: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: CORES.linha,
    paddingVertical: 6,
  },
  linhaTabelaHeader: {
    flexDirection: "row",
    backgroundColor: CORES.azulEscuro,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  celulaHeader: { fontSize: 8.5, color: "#FFFFFF", fontFamily: "Helvetica-Bold" },
  celula: { fontSize: 9, color: CORES.texto, paddingHorizontal: 4 },
});

function Cabecalho({ codigo, versao }: { codigo: string; versao: number }) {
  return (
    <View style={styles.header} fixed>
      <Text style={styles.headerTitulo}>ALTO SOLAR — PROPOSTA COMERCIAL</Text>
      <Text style={styles.headerMeta}>
        {codigo} · v{versao}
      </Text>
    </View>
  );
}

function Rodape({ geradoEmISO }: { geradoEmISO: string }) {
  return (
    <View style={styles.footer} fixed>
      <Text style={styles.footerTexto}>Gerado em {formatarDataBR(geradoEmISO.slice(0, 10))}</Text>
      <Text
        style={styles.footerTexto}
        render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`}
      />
    </View>
  );
}

function BarraComparativa({ label, valor, max, cor }: { label: string; valor: number; max: number; cor: string }) {
  const largura = max > 0 ? Math.max(4, Math.round((valor / max) * 100)) : 0;
  return (
    <View style={{ marginBottom: 8 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 3 }}>
        <Text style={{ fontSize: 8.5, color: CORES.textoClaro }}>{label}</Text>
        <Text style={{ fontSize: 8.5, fontFamily: "Helvetica-Bold" }}>{valor.toLocaleString("pt-BR")} kWh</Text>
      </View>
      <View style={{ height: 10, backgroundColor: CORES.linha, borderRadius: 4 }}>
        <View style={{ height: 10, width: `${largura}%`, backgroundColor: cor, borderRadius: 4 }} />
      </View>
    </View>
  );
}

export function PropostaDocument({ dados }: { dados: PropostaPdfData }) {
  const potenciaKwp = wattsParaKwp(dados.projeto.potenciaWp);
  const maxKwh = Math.max(dados.projeto.consumoMedioKwh, dados.projeto.geracaoMensalKwh);

  const garantiasLista = Object.entries({
    "Instalação": dados.garantias.instalacao,
    "Módulos": dados.garantias.modulos,
    "Performance": dados.garantias.performance,
    "Inversor": dados.garantias.inversor,
    "Microinversor": dados.garantias.microinversor,
    "Outras": dados.garantias.outras,
  }).filter(([, v]) => v && v.trim() !== "");

  const servicosIncluidos = dados.servicos.filter((s) => s.incluido);

  return (
    <Document title={`Proposta ${dados.codigo}`} author="Alto Solar">
      {/* Página 1 — Capa */}
      <Page size="A4" style={{ ...styles.page, paddingTop: 0 }}>
        <View
          style={{
            height: "100%",
            backgroundColor: CORES.azulEscuro,
            paddingHorizontal: 48,
            paddingVertical: 64,
            justifyContent: "space-between",
          }}
        >
          <View>
            {dados.empresa.logoDataUrl ? (
              // eslint-disable-next-line jsx-a11y/alt-text -- Image aqui é o componente do @react-pdf/renderer, não <img> HTML
              <Image src={dados.empresa.logoDataUrl} style={{ width: 120, height: "auto" }} />
            ) : (
              <Text style={{ fontSize: 22, color: "#FFFFFF", fontFamily: "Helvetica-Bold" }}>
                {dados.empresa.nomeFantasia}
              </Text>
            )}
          </View>

          <View>
            <Text style={{ fontSize: 11, color: CORES.ciano, marginBottom: 8, letterSpacing: 1 }}>
              PROPOSTA COMERCIAL
            </Text>
            <Text style={{ fontSize: 30, color: "#FFFFFF", fontFamily: "Helvetica-Bold", marginBottom: 18 }}>
              {dados.cliente.nome}
            </Text>
            {dados.cliente.cidade && (
              <Text style={{ fontSize: 12, color: "#CBD5E1", marginBottom: 24 }}>
                {dados.cliente.cidade}
                {dados.cliente.estado ? ` / ${dados.cliente.estado}` : ""}
              </Text>
            )}

            <View style={{ flexDirection: "row", gap: 24 }}>
              <View>
                <Text style={{ fontSize: 9, color: "#94A3B8" }}>POTÊNCIA PROPOSTA</Text>
                <Text style={{ fontSize: 16, color: CORES.amarelo, fontFamily: "Helvetica-Bold" }}>
                  {potenciaKwp.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kWp
                </Text>
              </View>
              <View>
                <Text style={{ fontSize: 9, color: "#94A3B8" }}>VENDEDOR</Text>
                <Text style={{ fontSize: 12, color: "#FFFFFF" }}>{dados.vendedor.nome}</Text>
              </View>
            </View>
          </View>

          <View style={{ borderTopWidth: 0.5, borderTopColor: "#334155", paddingTop: 12 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 9, color: "#94A3B8" }}>Proposta {dados.codigo} · Versão {dados.versao}</Text>
              <Text style={{ fontSize: 9, color: "#94A3B8" }}>{formatarDataBR(dados.geradoEmISO.slice(0, 10))}</Text>
            </View>
          </View>
        </View>
      </Page>

      {/* Página 2 — Solução Alto Solar */}
      <Page size="A4" style={styles.page}>
        <Cabecalho codigo={dados.codigo} versao={dados.versao} />
        <Rodape geradoEmISO={dados.geradoEmISO} />

        <Text style={styles.h1}>A solução Alto Solar</Text>
        {dados.empresa.textoInstitucional && (
          <Text style={styles.paragrafo}>{dados.empresa.textoInstitucional}</Text>
        )}

        <View style={styles.secao}>
          <Text style={styles.h3}>Como funciona a energia solar</Text>
          <Text style={styles.paragrafo}>
            Os módulos fotovoltaicos captam a luz do sol e a convertem em energia elétrica. O inversor
            transforma essa energia para o padrão utilizado na sua instalação, e o excedente gerado é
            injetado na rede da concessionária, gerando créditos que abatem o consumo da unidade.
          </Text>
        </View>

        <View style={styles.secao}>
          <Text style={styles.h3}>Resumo do projeto</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            <ResumoItem label="Potência" valor={`${potenciaKwp.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} kWp`} />
            <ResumoItem label="Geração estimada" valor={`${dados.projeto.geracaoMensalKwh.toLocaleString("pt-BR")} kWh/mês`} />
            <ResumoItem label="Consumo médio" valor={`${dados.projeto.consumoMedioKwh.toLocaleString("pt-BR")} kWh/mês`} />
            {dados.projeto.areaUtilM2 != null && (
              <ResumoItem label="Área necessária" valor={`${dados.projeto.areaUtilM2.toLocaleString("pt-BR")} m²`} />
            )}
          </View>
        </View>
      </Page>

      {/* Página 3 — Equipamentos e diferenciais */}
      <Page size="A4" style={styles.page}>
        <Cabecalho codigo={dados.codigo} versao={dados.versao} />
        <Rodape geradoEmISO={dados.geradoEmISO} />

        <Text style={styles.h1}>Equipamentos e diferenciais</Text>

        <View style={styles.secao}>
          <Text style={styles.h3}>Equipamentos</Text>
          <View style={styles.linhaTabelaHeader}>
            <Text style={[styles.celulaHeader, { flex: 3 }]}>Descrição</Text>
            <Text style={[styles.celulaHeader, { flex: 1.5 }]}>Fabricante</Text>
            <Text style={[styles.celulaHeader, { flex: 1, textAlign: "right" }]}>Qtd.</Text>
            <Text style={[styles.celulaHeader, { flex: 1.3, textAlign: "right" }]}>Potência</Text>
          </View>
          {dados.equipamentos.map((eq, i) => (
            <View key={i} style={styles.linhaTabela}>
              <Text style={[styles.celula, { flex: 3 }]}>{eq.descricao}</Text>
              <Text style={[styles.celula, { flex: 1.5 }]}>{eq.fabricante ?? "—"}</Text>
              <Text style={[styles.celula, { flex: 1, textAlign: "right" }]}>
                {eq.quantidade} {eq.unidade ?? ""}
              </Text>
              <Text style={[styles.celula, { flex: 1.3, textAlign: "right" }]}>
                {eq.potenciaUnitariaW ? `${eq.potenciaUnitariaW} W` : "—"}
              </Text>
            </View>
          ))}
        </View>

        {servicosIncluidos.length > 0 && (
          <View style={styles.secao}>
            <Text style={styles.h3}>Serviços incluídos</Text>
            {servicosIncluidos.map((s, i) => (
              <Text key={i} style={{ fontSize: 9.5, marginBottom: 3 }}>• {s.label}</Text>
            ))}
          </View>
        )}

        {garantiasLista.length > 0 && (
          <View style={styles.secao}>
            <Text style={styles.h3}>Garantias</Text>
            {garantiasLista.map(([label, valor], i) => (
              <Text key={i} style={{ fontSize: 9.5, marginBottom: 3 }}>
                <Text style={{ fontFamily: "Helvetica-Bold" }}>{label}: </Text>
                {valor}
              </Text>
            ))}
          </View>
        )}

        {dados.diferenciais.length > 0 && (
          <View style={styles.secao}>
            <Text style={styles.h3}>Diferenciais Alto Solar</Text>
            {dados.diferenciais.map((d, i) => (
              <Text key={i} style={{ fontSize: 9.5, marginBottom: 3 }}>• {d}</Text>
            ))}
          </View>
        )}
      </Page>

      {/* Página 4 — Consumo e geração */}
      <Page size="A4" style={styles.page}>
        <Cabecalho codigo={dados.codigo} versao={dados.versao} />
        <Rodape geradoEmISO={dados.geradoEmISO} />

        <Text style={styles.h1}>Consumo e geração</Text>

        <View style={styles.card}>
          <Text style={styles.h3}>Consumo médio vs. geração estimada (mensal)</Text>
          <BarraComparativa label="Consumo médio" valor={dados.projeto.consumoMedioKwh} max={maxKwh} cor={CORES.azulEscuro} />
          <BarraComparativa label="Geração estimada" valor={dados.projeto.geracaoMensalKwh} max={maxKwh} cor={CORES.ciano} />
        </View>

        <View style={styles.secao}>
          <Text style={styles.h3}>Economia estimada</Text>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <ResumoItem label="Economia mensal" valor={centavosParaBRL(dados.simulacao.economiaMensalCentavos)} destaque />
            <ResumoItem label="Economia no 1º ano" valor={centavosParaBRL(dados.simulacao.economiaPrimeiroAnoCentavos)} destaque />
            {dados.projeto.percentualCompensacao != null && (
              <ResumoItem label="Compensação estimada" valor={`${dados.projeto.percentualCompensacao}%`} />
            )}
          </View>
        </View>

        <View style={styles.secao}>
          <Text style={styles.h3}>Premissas utilizadas</Text>
          <Text style={styles.paragrafo}>
            Tarifa considerada: {centavosParaBRL(dados.simulacao.premissas.tarifaCentavosKwh)}/kWh.
            {dados.simulacao.premissas.reajusteAnualPercentual != null &&
              ` Reajuste anual estimado da tarifa: ${dados.simulacao.premissas.reajusteAnualPercentual}%.`}
            {dados.simulacao.premissas.degradacaoAnualPercentual != null &&
              ` Degradação anual estimada dos módulos: ${dados.simulacao.premissas.degradacaoAnualPercentual}%.`}
          </Text>
          <Text style={{ fontSize: 8, color: CORES.textoClaro, fontStyle: "italic" }}>
            A geração real pode variar conforme condições climáticas, sombreamento e manutenção do sistema.
          </Text>
        </View>
      </Page>

      {/* Página 5 — Investimento */}
      <Page size="A4" style={styles.page}>
        <Cabecalho codigo={dados.codigo} versao={dados.versao} />
        <Rodape geradoEmISO={dados.geradoEmISO} />

        <Text style={styles.h1}>Investimento</Text>

        <View style={{ ...styles.card, backgroundColor: CORES.azulEscuro, alignItems: "center", paddingVertical: 20 }}>
          <Text style={{ fontSize: 9, color: "#94A3B8" }}>VALOR DO INVESTIMENTO</Text>
          <Text style={{ fontSize: 26, color: "#FFFFFF", fontFamily: "Helvetica-Bold", marginTop: 4 }}>
            {centavosParaBRL(dados.investimento.valorFinalCentavos)}
          </Text>
        </View>

        <View style={styles.secao}>
          <Text style={styles.h3}>Formas de pagamento</Text>
          {dados.investimento.formasPagamento.map((f, i) => (
            <View key={i} style={{ ...styles.card, marginBottom: 8 }}>
              <Text style={{ fontSize: 10, fontFamily: "Helvetica-Bold", marginBottom: 3 }}>{f.descricao}</Text>
              {f.numeroParcelas && f.valorParcelaCentavos && (
                <Text style={{ fontSize: 9 }}>
                  {f.numeroParcelas}x de {centavosParaBRL(f.valorParcelaCentavos)}
                  {f.valorEntradaCentavos ? ` + entrada de ${centavosParaBRL(f.valorEntradaCentavos)}` : ""}
                </Text>
              )}
              {f.observacoes && <Text style={{ fontSize: 8.5, color: CORES.textoClaro }}>{f.observacoes}</Text>}
            </View>
          ))}
        </View>

        <View style={styles.secao}>
          <Text style={styles.h3}>Retorno do investimento</Text>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <ResumoItem label="Economia no 1º ano" valor={centavosParaBRL(dados.simulacao.economiaPrimeiroAnoCentavos)} />
            <ResumoItem
              label="Payback simples"
              valor={dados.simulacao.paybackMeses ? `${dados.simulacao.paybackMeses} meses` : "—"}
              destaque
            />
          </View>
        </View>

        {dados.simulacao.projecaoAnual.length > 0 && (
          <View style={styles.secao}>
            <Text style={styles.h3}>Projeção de economia acumulada</Text>
            <View style={styles.linhaTabelaHeader}>
              <Text style={[styles.celulaHeader, { flex: 1 }]}>Ano</Text>
              <Text style={[styles.celulaHeader, { flex: 2, textAlign: "right" }]}>Economia no ano</Text>
              <Text style={[styles.celulaHeader, { flex: 2, textAlign: "right" }]}>Acumulado</Text>
            </View>
            {dados.simulacao.projecaoAnual
              .filter((_, i) => i % 5 === 0 || i === dados.simulacao.projecaoAnual.length - 1)
              .map((p) => (
                <View key={p.ano} style={styles.linhaTabela}>
                  <Text style={[styles.celula, { flex: 1 }]}>{p.ano}</Text>
                  <Text style={[styles.celula, { flex: 2, textAlign: "right" }]}>
                    {centavosParaBRL(p.economiaAnualCentavos)}
                  </Text>
                  <Text style={[styles.celula, { flex: 2, textAlign: "right" }]}>
                    {centavosParaBRL(p.economiaAcumuladaCentavos)}
                  </Text>
                </View>
              ))}
          </View>
        )}
      </Page>

      {/* Página 6 — Condições e aceite */}
      <Page size="A4" style={styles.page}>
        <Cabecalho codigo={dados.codigo} versao={dados.versao} />
        <Rodape geradoEmISO={dados.geradoEmISO} />

        <Text style={styles.h1}>Condições comerciais</Text>

        <View style={{ flexDirection: "row", gap: 10, marginBottom: 14 }}>
          <ResumoItem label="Validade da proposta" valor={dados.condicoes.validade} />
          {dados.condicoes.prazoEstimadoDias != null && (
            <ResumoItem label="Prazo estimado" valor={`${dados.condicoes.prazoEstimadoDias} dias`} />
          )}
        </View>

        {dados.condicoes.itensIncluidos.length > 0 && (
          <View style={styles.secao}>
            <Text style={styles.h3}>Itens incluídos</Text>
            {dados.condicoes.itensIncluidos.map((item, i) => (
              <Text key={i} style={{ fontSize: 9.5, marginBottom: 3 }}>• {item}</Text>
            ))}
          </View>
        )}

        {dados.condicoes.itensNaoIncluidos.length > 0 && (
          <View style={styles.secao}>
            <Text style={styles.h3}>Itens não incluídos</Text>
            {dados.condicoes.itensNaoIncluidos.map((item, i) => (
              <Text key={i} style={{ fontSize: 9.5, marginBottom: 3 }}>• {item}</Text>
            ))}
          </View>
        )}

        {dados.condicoes.responsabilidadesCliente.length > 0 && (
          <View style={styles.secao}>
            <Text style={styles.h3}>Responsabilidades do cliente</Text>
            {dados.condicoes.responsabilidadesCliente.map((item, i) => (
              <Text key={i} style={{ fontSize: 9.5, marginBottom: 3 }}>• {item}</Text>
            ))}
          </View>
        )}

        {dados.condicoes.observacoesComerciais && (
          <View style={styles.secao}>
            <Text style={styles.h3}>Observações</Text>
            <Text style={styles.paragrafo}>{dados.condicoes.observacoesComerciais}</Text>
          </View>
        )}

        <View style={{ marginTop: 30, flexDirection: "row", justifyContent: "space-between" }}>
          <View style={{ width: "45%", borderTopWidth: 0.5, borderTopColor: CORES.texto, paddingTop: 6 }}>
            <Text style={{ fontSize: 9 }}>{dados.cliente.nome}</Text>
            <Text style={{ fontSize: 8, color: CORES.textoClaro }}>Cliente</Text>
          </View>
          <View style={{ width: "45%", borderTopWidth: 0.5, borderTopColor: CORES.texto, paddingTop: 6 }}>
            <Text style={{ fontSize: 9 }}>{dados.empresa.nomeFantasia}</Text>
            <Text style={{ fontSize: 8, color: CORES.textoClaro }}>Alto Solar</Text>
          </View>
        </View>

        <View style={{ marginTop: 20 }}>
          <Text style={{ fontSize: 8.5, color: CORES.textoClaro }}>
            Vendedor responsável: {dados.vendedor.nome}
            {dados.vendedor.telefone ? ` · ${dados.vendedor.telefone}` : ""}
            {dados.vendedor.email ? ` · ${dados.vendedor.email}` : ""}
          </Text>
        </View>
      </Page>
    </Document>
  );
}

function ResumoItem({ label, valor, destaque }: { label: string; valor: string; destaque?: boolean }) {
  return (
    <View style={{ flex: 1, minWidth: 110 }}>
      <Text style={{ fontSize: 8, color: CORES.textoClaro }}>{label}</Text>
      <Text
        style={{
          fontSize: destaque ? 13 : 11,
          fontFamily: "Helvetica-Bold",
          color: destaque ? CORES.ciano : CORES.texto,
          marginTop: 2,
        }}
      >
        {valor}
      </Text>
    </View>
  );
}
