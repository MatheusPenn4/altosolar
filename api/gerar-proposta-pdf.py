"""Função serverless da Vercel (Python) que renderiza o PDF de seis páginas
da proposta comercial Alto Solar.

Único ponto de entrada HTTP para o gerador (`_proposal_generator/generator.py`).
Não acessa o Supabase nem conhece o schema do banco — recebe do backend
Next.js (`app/api/propostas/[id]/gerar-pdf/route.ts`) um JSON já normalizado e
validado, devolve os bytes do PDF em base64. Toda a lógica de negócio
(cálculo de preço, potência, simulação financeira, o que pode ou não aparecer
no documento) já aconteceu no Node — este módulo só desenha.

Protegido por um segredo compartilhado (`PROPOSAL_PDF_INTERNAL_SECRET`) via
header, porque uma função Python na Vercel roda fora do pipeline do
Next.js/middleware.ts: não há verificação de sessão do Supabase aqui.
"""

from __future__ import annotations

import json
import os
import sys
from base64 import b64encode
from http.server import BaseHTTPRequestHandler
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent / "_proposal_generator"))

from generator import (  # noqa: E402
    LayoutOverflowError,
    ProposalValidationError,
    generate_proposal,
)

MAX_BODY_BYTES = 2 * 1024 * 1024  # payload é só JSON normalizado, nunca um arquivo


class handler(BaseHTTPRequestHandler):
    def _send_json(self, status: int, payload: dict) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self) -> None:  # noqa: N802 (nome exigido pelo BaseHTTPRequestHandler)
        segredo_esperado = os.environ.get("PROPOSAL_PDF_INTERNAL_SECRET")
        segredo_recebido = self.headers.get("X-Internal-Secret")
        if not segredo_esperado or segredo_recebido != segredo_esperado:
            self._send_json(401, {"sucesso": False, "erro": "Não autorizado.", "tipo": "auth"})
            return

        content_length = int(self.headers.get("Content-Length", 0) or 0)
        if content_length <= 0:
            self._send_json(400, {"sucesso": False, "erro": "Corpo da requisição vazio.", "tipo": "validacao"})
            return
        if content_length > MAX_BODY_BYTES:
            self._send_json(413, {"sucesso": False, "erro": "Payload excede o limite permitido.", "tipo": "validacao"})
            return

        raw_body = self.rfile.read(content_length)
        try:
            payload = json.loads(raw_body)
        except json.JSONDecodeError:
            self._send_json(400, {"sucesso": False, "erro": "JSON inválido.", "tipo": "validacao"})
            return

        proposal_data = payload.get("proposalData") if isinstance(payload, dict) else None
        if not isinstance(proposal_data, dict):
            self._send_json(400, {"sucesso": False, "erro": "Campo 'proposalData' ausente ou inválido.", "tipo": "validacao"})
            return

        try:
            resultado = generate_proposal(proposal_data)
        except ProposalValidationError as exc:
            self._send_json(422, {"sucesso": False, "erro": str(exc), "tipo": "validacao"})
            return
        except LayoutOverflowError as exc:
            self._send_json(422, {"sucesso": False, "erro": str(exc), "tipo": "overflow"})
            return
        except Exception as exc:  # nunca deve vazar detalhe interno/stack trace ao cliente
            print(f"Erro inesperado ao gerar proposta: {type(exc).__name__}", file=sys.stderr)
            self._send_json(500, {"sucesso": False, "erro": "Falha interna ao gerar o PDF.", "tipo": "interno"})
            return

        self._send_json(
            200,
            {
                "sucesso": True,
                "pdfBase64": b64encode(resultado.pdf_bytes).decode("ascii"),
                "sha256": resultado.sha256,
                "tamanhoBytes": resultado.size_bytes,
                "paginas": resultado.pages,
                "versaoTemplate": resultado.template_version,
                "manifest": resultado.manifest,
            },
        )

    def do_GET(self) -> None:  # noqa: N802
        self._send_json(405, {"sucesso": False, "erro": "Use POST.", "tipo": "metodo"})
