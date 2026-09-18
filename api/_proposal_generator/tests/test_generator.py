"""Testes do gerador de proposta em produção (generator.py).

Cobre: geração com dados demonstrativos e realistas, campo obrigatório
ausente, texto longo demais (overflow), dado interno proibido, texto
demonstrativo fora do modo demo, e geração concorrente seguindo o requisito
de nomes/diretórios temporários exclusivos por requisição.
"""

from __future__ import annotations

import copy
import json
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from generator import (  # noqa: E402
    LayoutOverflowError,
    ProposalValidationError,
    generate_proposal,
)

FIXTURES = Path(__file__).resolve().parent / "fixtures"


def load(name: str) -> dict:
    return json.loads((FIXTURES / name).read_text(encoding="utf-8"))


def test_generate_demo_data_produces_six_page_pdf():
    result = generate_proposal(load("demo-data.json"))
    assert result.pages == 6
    assert result.size_bytes > 0
    assert len(result.sha256) == 64
    assert result.template_version == "2.0.0"


def test_generate_realistic_data_with_fewer_items():
    data = load("realistic-data.json")
    assert len(data["equipment"]["rows"]) == 3
    assert len(data["payment_options"]) == 2
    result = generate_proposal(data)
    assert result.pages == 6


def test_missing_required_field_raises_with_field_name():
    data = load("realistic-data.json")
    del data["project"]["installed_power_kwp"]
    with pytest.raises(ProposalValidationError) as excinfo:
        generate_proposal(data)
    assert "project.installed_power_kwp" in str(excinfo.value)


def test_missing_client_name_raises():
    data = load("realistic-data.json")
    data["client"]["name"] = ""
    with pytest.raises(ProposalValidationError) as excinfo:
        generate_proposal(data)
    assert "client.name" in str(excinfo.value)


def test_long_text_overflow_raises():
    data = load("realistic-data.json")
    data["pages"]["2"]["solution_text"] = "Texto muito longo. " * 200
    with pytest.raises(LayoutOverflowError):
        generate_proposal(data)


def test_internal_cost_term_is_rejected():
    data = load("realistic-data.json")
    data["financial"]["note"] += " (margem aplicada de 20%)"
    with pytest.raises(ProposalValidationError) as excinfo:
        generate_proposal(data)
    assert "margem" in str(excinfo.value).lower()


def test_internal_acronym_vpl_is_rejected():
    data = load("realistic-data.json")
    data["financial"]["note"] += " VPL positivo."
    with pytest.raises(ProposalValidationError) as excinfo:
        generate_proposal(data)
    assert "VPL" in str(excinfo.value)


def test_demo_disclaimer_rejected_outside_demo_mode():
    data = load("realistic-data.json")
    data["meta"]["disclaimer"] = "MODELO DEMONSTRATIVO — SEM VALIDADE COMERCIAL"
    with pytest.raises(ProposalValidationError) as excinfo:
        generate_proposal(data)
    assert "demonstrativo" in str(excinfo.value).lower()


def test_demo_mode_allows_demo_disclaimer():
    data = load("demo-data.json")
    assert data["meta"]["demo_mode"] is True
    result = generate_proposal(data)
    assert result.pages == 6


def test_payment_options_above_three_are_rejected():
    data = load("realistic-data.json")
    data["payment_options"] = data["payment_options"] * 2
    with pytest.raises(ProposalValidationError):
        generate_proposal(data)


def test_validity_days_mismatch_is_rejected():
    data = load("realistic-data.json")
    data["meta"]["validity_days"] = 30
    with pytest.raises(ProposalValidationError):
        generate_proposal(data)


def test_concurrent_generation_is_safe():
    """Cada chamada usa diretório/arquivo temporário exclusivo (uuid4) — chamadas
    concorrentes não podem colidir nem se corromper mutuamente."""
    base = load("realistic-data.json")
    variants = []
    for i in range(4):
        variant = copy.deepcopy(base)
        nome_cliente = f"Cliente de Teste Concorrente {i}"
        variant["meta"]["proposal_number"] = f"AS-2026-{1000 + i}"
        variant["client"]["name"] = nome_cliente
        variant["header"]["client_line"] = nome_cliente
        variants.append(variant)

    with ThreadPoolExecutor(max_workers=4) as pool:
        results = list(pool.map(generate_proposal, variants))

    assert len(results) == 4
    hashes = {r.sha256 for r in results}
    # Cada variante tem um número de proposta diferente embutido no PDF (código
    # aparece no cabeçalho), então os bytes — e os hashes — devem divergir.
    assert len(hashes) == 4
    for result in results:
        assert result.pages == 6
