import type { OrcamentoExtraido } from "@/lib/gemini/schema";
import { calcularPotenciaTotalW, contaComoModuloFotovoltaico, divergePotencia } from "./potencia";
import { somarCentavos } from "./money";

export interface AlertaValidacao {
  campo: string;
  mensagem: string;
  severidade: "erro" | "aviso";
}

/**
 * Validações determinísticas executadas em código sobre a extração do Gemini.
 * A IA nunca valida matemática — isso é feito aqui, de forma determinística e testável.
 */
export function validarOrcamento(orcamento: OrcamentoExtraido): AlertaValidacao[] {
  const alertas: AlertaValidacao[] = [];

  const somaComponentes = somarCentavos(
    orcamento.valores.produtosCentavos,
    orcamento.valores.freteCentavos,
    orcamento.valores.seguroCentavos,
    orcamento.valores.icmsCentavos,
    orcamento.valores.ipiCentavos,
    orcamento.valores.stCentavos,
    orcamento.valores.diferencialAliquotaCentavos
  );

  if (somaComponentes !== orcamento.valores.totalCentavos) {
    alertas.push({
      campo: "valores.totalCentavos",
      mensagem: `A soma dos componentes (${somaComponentes} centavos) não confere com o total informado (${orcamento.valores.totalCentavos} centavos).`,
      severidade: "erro",
    });
  }

  if (orcamento.valores.totalCentavos <= 0) {
    alertas.push({
      campo: "valores.totalCentavos",
      mensagem: "O valor total deve ser maior que zero.",
      severidade: "erro",
    });
  }

  for (const [campo, valor] of Object.entries(orcamento.valores)) {
    if (typeof valor === "number" && valor < 0) {
      alertas.push({
        campo: `valores.${campo}`,
        mensagem: "Valor negativo não permitido.",
        severidade: "erro",
      });
    }
  }

  if (orcamento.itens.length === 0) {
    alertas.push({
      campo: "itens",
      mensagem: "Nenhum item foi identificado no orçamento.",
      severidade: "erro",
    });
  }

  const modulos = orcamento.itens.filter((item) =>
    contaComoModuloFotovoltaico(item.descricao, item.potenciaUnitariaW)
  );
  if (modulos.length === 0) {
    alertas.push({
      campo: "itens",
      mensagem: "Nenhum módulo fotovoltaico (item com potência unitária) foi identificado.",
      severidade: "aviso",
    });
  }

  const temInversor = orcamento.itens.some((item) =>
    /invers/i.test(item.descricao)
  );
  if (!temInversor) {
    alertas.push({
      campo: "itens",
      mensagem: "Nenhum inversor foi identificado nos itens do orçamento.",
      severidade: "aviso",
    });
  }

  orcamento.itens.forEach((item, indice) => {
    if (item.quantidade <= 0) {
      alertas.push({
        campo: `itens[${indice}].quantidade`,
        mensagem: `Item "${item.descricao}" com quantidade zerada ou inválida.`,
        severidade: "erro",
      });
    }
  });

  const chavesItens = orcamento.itens.map(
    (item) => `${item.codigo ?? ""}|${item.descricao.trim().toLowerCase()}`
  );
  const duplicados = chavesItens.filter(
    (chave, indice) => chavesItens.indexOf(chave) !== indice
  );
  if (duplicados.length > 0) {
    alertas.push({
      campo: "itens",
      mensagem: "Foram encontrados itens duplicados no orçamento.",
      severidade: "aviso",
    });
  }

  if (orcamento.potenciaWp > 0 && modulos.length > 0) {
    const potenciaCalculadaW = calcularPotenciaTotalW(
      modulos.map((m) => ({
        quantidade: m.quantidade,
        potenciaUnitariaW: m.potenciaUnitariaW ?? 0,
      }))
    );
    if (divergePotencia(orcamento.potenciaWp, potenciaCalculadaW)) {
      alertas.push({
        campo: "potenciaWp",
        mensagem: `Potência informada (${orcamento.potenciaWp} Wp) diverge da potência calculada pelos módulos (${potenciaCalculadaW} Wp).`,
        severidade: "aviso",
      });
    }
  }

  if (orcamento.emissao && orcamento.validade) {
    const emissao = new Date(orcamento.emissao);
    const validade = new Date(orcamento.validade);
    if (Number.isNaN(emissao.getTime()) || Number.isNaN(validade.getTime())) {
      alertas.push({
        campo: "emissao/validade",
        mensagem: "Data de emissão ou validade inválida.",
        severidade: "erro",
      });
    } else if (validade < emissao) {
      alertas.push({
        campo: "validade",
        mensagem: "A validade é anterior à data de emissão.",
        severidade: "erro",
      });
    }
  }

  return alertas;
}
