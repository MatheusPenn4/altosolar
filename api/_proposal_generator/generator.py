#!/usr/bin/env python3
"""Renderer de produção da proposta comercial Alto Solar (template 2.0.0).

Gera um PDF de seis páginas A4 a partir de dados normalizados (já validados e
calculados no backend Next.js — este módulo não inventa nem recalcula preço,
potência ou economia, apenas desenha o que recebe). É usado de duas formas:

1. Como biblioteca, pela função HTTP da Vercel (`api/gerar-proposta-pdf.py`),
   que chama `generate_proposal(...)` e recebe os bytes do PDF em memória.
2. Como CLI, para testes locais e validação do pacote de assets/layout:

   python generator.py --data proposta.json --output proposta.pdf
   python generator.py --validate --data proposta.json

Este arquivo roda em uma função serverless (filesystem somente leitura, exceto
`/tmp`): nunca escreve fora de um diretório temporário exclusivo por requisição,
e limpa esse diretório mesmo quando a geração falha.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import re
import sys
import tempfile
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
from pathlib import Path
from zoneinfo import ZoneInfo

from PIL import Image
from reportlab.graphics.barcode import qr
from reportlab.graphics.shapes import Drawing
from reportlab.lib.colors import Color, HexColor, white
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from pypdf import PdfReader


PAGE_W, PAGE_H = A4
SOURCE_W, SOURCE_H = 2480.0, 3508.0
SX, SY = PAGE_W / SOURCE_W, PAGE_H / SOURCE_H

NAVY = HexColor("#001A33")
NAVY_2 = HexColor("#062743")
CYAN = HexColor("#00BFEA")
CYAN_DARK = HexColor("#008FB9")
YELLOW = HexColor("#FFC400")
INK = HexColor("#172B3A")
MUTED = HexColor("#607282")
LIGHT = HexColor("#E8EFF4")
CONSUMPTION = HexColor("#7894A8")

TEMPLATE_DIR = Path(__file__).resolve().parent
DEFAULT_LAYOUT_PATH = TEMPLATE_DIR / "layout" / "proposal-layout-map.json"
EXPECTED_BACKGROUND_SIZE = (2480, 3508)
MAIN_BACKGROUND_SIZE = (1654, 2339)
MAX_PDF_SIZE_BYTES = 10 * 1024 * 1024
TIMEZONE_COMERCIAL = ZoneInfo("America/Cuiaba")

# Frases e valores que nunca podem aparecer em uma proposta real (não demonstrativa).
# O modo demonstrativo (`meta.demo_mode: true`) é a única exceção, usado só para testes.
FRASES_DEMONSTRATIVAS_PROIBIDAS = (
    "MODELO DEMONSTRATIVO",
    "SEM VALIDADE COMERCIAL",
)

# Informação interna do orçamento/precificação que jamais pode vazar para o cliente.
TERMOS_INTERNOS_PROIBIDOS = (
    "custo da fábrica",
    "custo de fábrica",
    "custo interno",
    "margem",
    "lucro",
    "markup",
    "orçamento do fornecedor",
)
ACRONIMOS_INTERNOS_PROIBIDOS = ("VPL", "TIR")


class ProposalValidationError(ValueError):
    """Dados, assets ou layout inconsistentes — a geração não deve prosseguir."""


class LayoutOverflowError(ValueError):
    """Conteúdo real não coube no espaço reservado pelo layout do template."""


@dataclass
class GeneratedProposalResult:
    pdf_bytes: bytes
    sha256: str
    size_bytes: int
    pages: int
    template_version: str
    manifest: dict
    warnings: list[str] = field(default_factory=list)


def register_fonts() -> None:
    regular = TEMPLATE_DIR / "assets/fonts/DejaVuSans.ttf"
    bold = TEMPLATE_DIR / "assets/fonts/DejaVuSans-Bold.ttf"
    if not regular.exists() or not bold.exists():
        raise FileNotFoundError("Fontes DejaVu Sans incorporadas não foram encontradas")
    # registerFont é idempotente no reportlab — seguro chamar em toda invocação,
    # inclusive quando o mesmo processo da função serverless atende várias requisições.
    pdfmetrics.registerFont(TTFont("ProposalSans", str(regular)))
    pdfmetrics.registerFont(TTFont("ProposalSans-Bold", str(bold)))


def rect_px(field: dict) -> tuple[float, float, float, float]:
    x = field["x"] * SX
    w = field["width"] * SX
    h = field["height"] * SY
    y = PAGE_H - (field["y"] + field["height"]) * SY
    return x, y, w, h


def build_field_index(layout: dict) -> dict[tuple[int, str], dict]:
    return {(entry["page"], entry["field"]): entry for entry in layout["fields"]}


def wrap_text(text: str, font: str, size: float, max_width: float) -> list[str]:
    lines: list[str] = []
    for paragraph in text.split("\n"):
        words = paragraph.split()
        if not words:
            lines.append("")
            continue
        current = words[0]
        for word in words[1:]:
            trial = f"{current} {word}"
            if pdfmetrics.stringWidth(trial, font, size) <= max_width:
                current = trial
            else:
                lines.append(current)
                current = word
        lines.append(current)
    return lines


def draw_wrapped(
    c: canvas.Canvas,
    text: str,
    x: float,
    top: float,
    width: float,
    font: str,
    size: float,
    color=INK,
    leading: float | None = None,
    align: str = "left",
    max_lines: int | None = None,
    min_size: float = 6.5,
    max_height: float | None = None,
    field_name: str = "text_field",
) -> float:
    if not isinstance(text, str) or not text.strip():
        raise LayoutOverflowError(f"{field_name}: texto vazio ou inválido")
    start_size = max(float(size), float(min_size))
    leading_ratio = (leading / size) if leading and size else 1.34
    fitted = None
    candidate = start_size
    while candidate >= min_size - 0.001:
        candidate_leading = candidate * leading_ratio
        candidate_lines = wrap_text(text, font, candidate, width)
        used_height = candidate + max(0, len(candidate_lines) - 1) * candidate_leading
        line_ok = max_lines is None or len(candidate_lines) <= max_lines
        height_ok = max_height is None or used_height <= max_height
        if line_ok and height_ok:
            fitted = (candidate, candidate_leading, candidate_lines)
            break
        candidate = round(candidate - 0.25, 2)
    if fitted is None:
        lines_at_min = wrap_text(text, font, min_size, width)
        message = (
            f"{field_name}: conteúdo não cabe; largura={width:.1f} pt, "
            f"linhas={len(lines_at_min)}, limite_linhas={max_lines}, "
            f"altura_limite={max_height}, fonte_mínima={min_size} pt"
        )
        raise LayoutOverflowError(message)
    fitted_size, fitted_leading, lines = fitted
    c.setFont(font, fitted_size)
    c.setFillColor(color)
    baseline = top - fitted_size
    for line in lines:
        if align == "center":
            c.drawCentredString(x + width / 2, baseline, line)
        elif align == "right":
            c.drawRightString(x + width, baseline, line)
        else:
            c.drawString(x, baseline, line)
        baseline -= fitted_leading
    return baseline


def draw_single_line(
    c: canvas.Canvas,
    text: str,
    x: float,
    baseline: float,
    width: float,
    font: str,
    size: float,
    color,
    align: str = "left",
    min_size: float = 7,
    field_name: str = "single_line_field",
) -> float:
    if not isinstance(text, str) or not text.strip():
        raise LayoutOverflowError(f"{field_name}: texto vazio ou inválido")
    candidate = max(float(size), float(min_size))
    while candidate >= min_size - 0.001:
        if pdfmetrics.stringWidth(text, font, candidate) <= width:
            c.setFont(font, candidate)
            c.setFillColor(color)
            if align == "center":
                c.drawCentredString(x + width / 2, baseline, text)
            elif align == "right":
                c.drawRightString(x + width, baseline, text)
            else:
                c.drawString(x, baseline, text)
            return candidate
        candidate = round(candidate - 0.25, 2)
    raise LayoutOverflowError(
        f"{field_name}: valor não cabe em uma linha com fonte mínima de {min_size} pt"
    )


def draw_background(c: canvas.Canvas, image_path: Path) -> None:
    image = ImageReader(str(image_path))
    iw, ih = image.getSize()
    scale = min(PAGE_W / iw, PAGE_H / ih)
    width, height = iw * scale, ih * scale
    x, y = (PAGE_W - width) / 2, (PAGE_H - height) / 2
    c.setFillColor(white)
    c.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    c.drawImage(image, x, y, width, height, preserveAspectRatio=True, anchor="c")


def create_optimized_backgrounds(backgrounds: list[Path], target_dir: Path) -> list[Path]:
    """Cria cópias JPEG otimizadas dos fundos, exclusivas desta requisição."""
    optimized: list[Path] = []
    target_dir.mkdir(parents=True, exist_ok=True)
    for index, source in enumerate(backgrounds, 1):
        destination = target_dir / f"background-{index:02d}.jpg"
        with Image.open(source) as original:
            if original.mode in ("RGBA", "LA"):
                canvas_bg = Image.new("RGB", original.size, "white")
                alpha = original.getchannel("A")
                canvas_bg.paste(original.convert("RGB"), mask=alpha)
                rgb = canvas_bg
            else:
                rgb = original.convert("RGB")
            rgb = rgb.resize(MAIN_BACKGROUND_SIZE, Image.Resampling.LANCZOS)
            rgb.save(destination, "JPEG", quality=88, optimize=True, progressive=True, subsampling=0)
        optimized.append(destination)
    return optimized


def draw_logo(c: canvas.Canvas, path: Path, x: float, y: float, w: float, h: float) -> None:
    image = ImageReader(str(path))
    iw, ih = image.getSize()
    scale = min(w / iw, h / ih)
    dw, dh = iw * scale, ih * scale
    c.drawImage(image, x, y + (h - dh) / 2, dw, dh, mask="auto", preserveAspectRatio=True)


def field_rect(fields: dict, page: int, name: str) -> tuple[float, float, float, float, dict]:
    item = fields[(page, name)]
    return (*rect_px(item), item)


def draw_header(c: canvas.Canvas, data: dict, fields: dict, page: int, logo_path: Path) -> None:
    x, y, w, h, item = field_rect(fields, page, "header")
    draw_logo(c, logo_path, x, y + h * 0.05, h * 0.9, h * 0.9)
    size = item["fontSize"]
    c.setFillColor(NAVY)
    c.setFont("ProposalSans-Bold", size)
    c.drawRightString(x + w, y + h * 0.58, data["header"]["proposal_line"])
    c.setFillColor(MUTED)
    c.setFont("ProposalSans", size - 0.5)
    c.drawRightString(x + w, y + h * 0.26, data["header"]["client_line"])


def draw_footer(c: canvas.Canvas, data: dict, fields: dict, page: int) -> None:
    x, y, w, h, item = field_rect(fields, page, "footer")
    color = white if page == 6 else MUTED
    size = item["fontSize"]
    left = f'{data["footer"]["company_line"]}  •  {data["footer"]["phone_line"]}'
    center = data["meta"]["disclaimer"]
    right = f'{data["footer"]["proposal_line"]}  •  {data["meta"]["page_label"]} {page}/{data["meta"]["page_total"]}'
    c.setFont("ProposalSans", size)
    c.setFillColor(color)
    c.drawString(x, y + h * 0.42, left)
    if center:
        c.drawCentredString(x + w / 2, y + h * 0.42, center)
    c.drawRightString(x + w, y + h * 0.42, right)


def draw_page_heading(c: canvas.Canvas, data: dict, fields: dict, page: int, title: str, subtitle: str | None = None) -> None:
    x, y, w, h, item = field_rect(fields, page, "page_title")
    draw_wrapped(c, title, x, y + h, w, "ProposalSans-Bold", item["fontSize"], NAVY, leading=item["fontSize"] * 1.15, max_lines=2)
    if subtitle and (page, "page_subtitle") in fields:
        x, y, w, h, item = field_rect(fields, page, "page_subtitle")
        draw_wrapped(c, subtitle, x, y + h, w, "ProposalSans", item["fontSize"], MUTED)


def draw_bullet(c: canvas.Canvas, x: float, y: float, radius: float = 2.2, color=CYAN) -> None:
    c.setFillColor(color)
    c.circle(x, y, radius, fill=1, stroke=0)


def draw_timeline_icon(c: canvas.Canvas, icon: str, cx: float, cy: float, size: float) -> None:
    """Desenha um pictograma vetorial compacto, centralizado no círculo da linha do tempo."""
    s = size
    c.saveState()
    c.setStrokeColor(CYAN_DARK)
    c.setFillColor(CYAN_DARK)
    c.setLineWidth(max(1.15, size * 0.095))
    c.setLineCap(1)
    c.setLineJoin(1)

    if icon == "accept":
        c.circle(cx, cy, s * 0.43, fill=0, stroke=1)
        path = c.beginPath()
        path.moveTo(cx - s * 0.23, cy)
        path.lineTo(cx - s * 0.06, cy - s * 0.18)
        path.lineTo(cx + s * 0.27, cy + s * 0.20)
        c.drawPath(path, fill=0, stroke=1)
    elif icon == "validation":
        c.circle(cx - s * 0.10, cy + s * 0.08, s * 0.28, fill=0, stroke=1)
        c.line(cx + s * 0.10, cy - s * 0.13, cx + s * 0.34, cy - s * 0.36)
        path = c.beginPath()
        path.moveTo(cx - s * 0.22, cy + s * 0.07)
        path.lineTo(cx - s * 0.11, cy - s * 0.05)
        path.lineTo(cx + s * 0.08, cy + s * 0.16)
        c.drawPath(path, fill=0, stroke=1)
    elif icon == "project":
        left, bottom = cx - s * 0.31, cy - s * 0.38
        width, height = s * 0.62, s * 0.76
        c.roundRect(left, bottom, width, height, s * 0.05, fill=0, stroke=1)
        c.line(cx - s * 0.18, cy + s * 0.17, cx + s * 0.18, cy + s * 0.17)
        c.line(cx - s * 0.18, cy, cx + s * 0.18, cy)
        c.line(cx - s * 0.18, cy - s * 0.17, cx + s * 0.08, cy - s * 0.17)
    elif icon == "installation":
        left, bottom = cx - s * 0.38, cy - s * 0.20
        width, height = s * 0.76, s * 0.46
        panel = c.beginPath()
        panel.moveTo(left + s * 0.08, bottom)
        panel.lineTo(left, bottom + height)
        panel.lineTo(left + width - s * 0.08, bottom + height)
        panel.lineTo(left + width, bottom)
        panel.close()
        c.drawPath(panel, fill=0, stroke=1)
        c.line(cx, bottom, cx, bottom + height)
        c.line(left + s * 0.04, bottom + height * 0.5, left + width - s * 0.04, bottom + height * 0.5)
        c.line(cx, bottom, cx, cy - s * 0.34)
        c.line(cx - s * 0.18, cy - s * 0.34, cx + s * 0.18, cy - s * 0.34)
    elif icon == "activation":
        bolt = c.beginPath()
        bolt.moveTo(cx + s * 0.05, cy + s * 0.42)
        bolt.lineTo(cx - s * 0.24, cy - s * 0.02)
        bolt.lineTo(cx - s * 0.02, cy - s * 0.02)
        bolt.lineTo(cx - s * 0.10, cy - s * 0.42)
        bolt.lineTo(cx + s * 0.28, cy + s * 0.10)
        bolt.lineTo(cx + s * 0.05, cy + s * 0.10)
        bolt.close()
        c.drawPath(bolt, fill=1, stroke=0)
    else:
        raise ProposalValidationError(f"Ícone de linha do tempo desconhecido: {icon}")
    c.setFillColor(YELLOW)
    c.circle(cx + s * 0.38, cy + s * 0.34, max(1.1, s * 0.075), fill=1, stroke=0)
    c.restoreState()


def draw_cover(c: canvas.Canvas, data: dict, fields: dict, logo_path: Path) -> None:
    x, y, w, h, _ = field_rect(fields, 1, "cover_logo")
    draw_logo(c, logo_path, x, y, w, h)

    page = data["pages"]["1"]
    x, y, w, h, item = field_rect(fields, 1, "cover_title")
    top = y + h
    for index, line in enumerate(page["title_lines"]):
        color = white if index == 0 else CYAN
        c.setFillColor(color)
        c.setFont("ProposalSans-Bold", item["fontSize"])
        c.drawString(x, top - item["fontSize"] - index * item["fontSize"] * 1.22, line)
    x, y, w, h, item = field_rect(fields, 1, "cover_subtitle")
    draw_wrapped(c, page["subtitle"], x, y + h, w, "ProposalSans", item["fontSize"], white, leading=item["fontSize"] * 1.3, max_lines=2)

    x, y, w, h, item = field_rect(fields, 1, "cover_client")
    c.setFont("ProposalSans", 10)
    c.setFillColor(CYAN)
    c.drawString(x, y + h - 10, page["prepared_for_label"])
    draw_wrapped(c, data["client"]["name"], x, y + h - 30, w, "ProposalSans-Bold", item["fontSize"], white, leading=item["fontSize"] * 1.2, max_lines=2)

    x, y, w, h, item = field_rect(fields, 1, "cover_system")
    c.setFillColor(YELLOW)
    c.roundRect(x, y + h - 20, 5, 5, 2.5, fill=1, stroke=0)
    draw_wrapped(c, page["system_label"], x + 15, y + h, w - 15, "ProposalSans-Bold", item["fontSize"], white, max_lines=1)

    x, y, w, h, item = field_rect(fields, 1, "cover_footer")
    c.setFillColor(Color(0, 0.75, 0.92, alpha=0.18))
    c.roundRect(x - 12, y - 8, w + 24, h + 16, 8, fill=1, stroke=0)
    c.setFont("ProposalSans-Bold", item["fontSize"])
    c.setFillColor(white)
    c.drawString(x, y + h - 18, page["footer_line"])
    c.setFont("ProposalSans", item["fontSize"] - 0.5)
    c.setFillColor(CYAN)
    c.drawString(x, y + h - 42, page["consultant_line"])


def draw_page_2(c: canvas.Canvas, data: dict, fields: dict, logo_path: Path) -> None:
    page = data["pages"]["2"]
    draw_header(c, data, fields, 2, logo_path)
    draw_page_heading(c, data, fields, 2, page["title"])

    x, y, w, h, item = field_rect(fields, 2, "page_intro")
    draw_wrapped(c, page["institutional"], x, y + h, w, "ProposalSans", item["fontSize"], MUTED, max_lines=3)

    x, y, w, h, item = field_rect(fields, 2, "solution_panel")
    c.setFont("ProposalSans-Bold", 16)
    c.setFillColor(NAVY)
    c.drawString(x, y + h - 22, page["solution_title"])
    c.setStrokeColor(CYAN)
    c.setLineWidth(2)
    c.line(x, y + h - 38, x + w * 0.18, y + h - 38)
    draw_wrapped(c, page["solution_text"], x, y + h - 68, w * 0.9, "ProposalSans", 10.4, INK, leading=15.2, max_lines=8)

    start_y = y + h - 270
    for i, fact in enumerate(page["project_facts"]):
        value = data["project"][fact["value_field"]]
        label = fact["label"]
        row_y = start_y - i * 58
        draw_bullet(c, x + 3, row_y + 4, 2.7, YELLOW if i % 2 else CYAN)
        draw_single_line(
            c, value, x + 16, row_y, w - 32,
            "ProposalSans-Bold", 10.5, NAVY, min_size=8,
            field_name=f"page_2.project_fact_{i + 1}.value",
        )
        draw_single_line(
            c, label, x + 16, row_y - 14, w - 32,
            "ProposalSans", 7.7, MUTED, min_size=7,
            field_name=f"page_2.project_fact_{i + 1}.label",
        )

    x, y, w, h, item = field_rect(fields, 2, "flow_steps")
    step_gap = h / 5
    for index, step in enumerate(page["flow_steps"], 1):
        cy = y + h - (index - 0.5) * step_gap
        c.setFillColor(NAVY)
        c.circle(x + 12, cy, 8, fill=1, stroke=0)
        c.setFillColor(white)
        c.setFont("ProposalSans-Bold", 6.3)
        c.drawCentredString(x + 12, cy - 2.2, step["number"])
        c.setFillColor(INK)
        c.setFont("ProposalSans-Bold", item["fontSize"])
        c.drawString(x + 30, cy - 2.8, step["label"])

    for index, benefit in enumerate(page["benefits"], 1):
        x, y, w, h, item = field_rect(fields, 2, f"benefit_{index}")
        c.setFillColor(CYAN if index % 2 else YELLOW)
        c.roundRect(x, y + h - 8, 26, 3, 1.5, fill=1, stroke=0)
        draw_wrapped(c, benefit["title"], x, y + h - 18, w, "ProposalSans-Bold", item["fontSize"], NAVY, leading=11.5, max_lines=2)
        draw_wrapped(c, benefit["text"], x, y + h - 62, w, "ProposalSans", 6.7, MUTED, leading=9.4, max_lines=4)

    for index, card in enumerate(page["bottom_cards"], 1):
        x, y, w, h, item = field_rect(fields, 2, f"bottom_card_{index}")
        draw_wrapped(c, card["title"], x, y + h, w, "ProposalSans-Bold", 12, NAVY, max_lines=2)
        draw_wrapped(c, card["text"], x, y + h - 50, w, "ProposalSans", 8.2, MUTED, leading=11.8, max_lines=5)
    draw_footer(c, data, fields, 2)


def draw_metric_cards(c: canvas.Canvas, cards: list[dict], rect: tuple[float, float, float, float], count: int) -> None:
    x, y, w, h = rect
    gap = 14 * SX
    card_w = (w - gap * (count - 1)) / count
    for index, card in enumerate(cards):
        cx = x + index * (card_w + gap)
        draw_single_line(
            c, card["value"], cx + 5, y + h * 0.56, card_w - 10,
            "ProposalSans-Bold", 12 if count == 5 else 13, NAVY,
            align="center", min_size=9,
            field_name=f"metric_card_{index + 1}.value",
        )
        draw_single_line(
            c, card["label"], cx + 5, y + h * 0.36, card_w - 10,
            "ProposalSans", 7 if count == 5 else 7.4, MUTED,
            align="center", min_size=7,
            field_name=f"metric_card_{index + 1}.label",
        )


def draw_consumption_chart(c: canvas.Canvas, profile: dict, rect: tuple[float, float, float, float]) -> None:
    x, y, w, h = rect
    c.setFont("ProposalSans-Bold", 11)
    c.setFillColor(NAVY)
    c.drawString(x, y + h - 12, profile["title"])
    legend_y = y + h - 14
    c.setFillColor(CONSUMPTION)
    c.rect(x + w - 130, legend_y - 2, 8, 8, fill=1, stroke=0)
    c.setFillColor(MUTED)
    c.setFont("ProposalSans", 6.5)
    c.drawString(x + w - 117, legend_y, profile["consumption_label"])
    c.setFillColor(CYAN)
    c.rect(x + w - 60, legend_y - 2, 8, 8, fill=1, stroke=0)
    c.setFillColor(MUTED)
    c.drawString(x + w - 47, legend_y, profile["generation_label"])

    chart_x, chart_y = x + 28, y + 34
    chart_w, chart_h = w - 38, h - 78
    rows = profile["rows"]
    maximum = math.ceil(max(max(r["consumption"], r["generation"]) for r in rows) / 500) * 500
    maximum = max(maximum, 500)
    for tick in range(0, maximum + 1, 500):
        ty = chart_y + chart_h * tick / maximum
        c.setStrokeColor(LIGHT)
        c.setLineWidth(0.45)
        c.line(chart_x, ty, chart_x + chart_w, ty)
        c.setFillColor(MUTED)
        c.setFont("ProposalSans", 5.2)
        c.drawRightString(chart_x - 5, ty - 1.8, f"{tick:,}".replace(",", "."))

    group_w = chart_w / len(rows)
    bar_w = group_w * 0.27
    for index, row in enumerate(rows):
        gx = chart_x + index * group_w + group_w * 0.18
        ch = chart_h * row["consumption"] / maximum
        gh = chart_h * row["generation"] / maximum
        c.setFillColor(CONSUMPTION)
        c.roundRect(gx, chart_y, bar_w, ch, 1.2, fill=1, stroke=0)
        c.setFillColor(CYAN)
        c.roundRect(gx + bar_w + 2, chart_y, bar_w, gh, 1.2, fill=1, stroke=0)
        c.setFillColor(MUTED)
        c.setFont("ProposalSans", 5.6)
        c.drawCentredString(gx + bar_w + 1, chart_y - 12, row["month"])


def draw_equipment_table(
    c: canvas.Canvas,
    equipment: dict,
    rect: tuple[float, float, float, float],
    layout: dict,
) -> None:
    x, y, w, h = rect
    title_inset = layout.get("titleInsetPt", 12)
    table_inset = layout.get("tableInsetPt", 32)
    title_size = layout.get("titleFontSize", 10.5)
    header_size = layout.get("headerFontSize", 7)
    row_size = layout.get("rowFontSize", 6.5)
    area_size = layout.get("areaFontSize", 7)
    draw_wrapped(
        c, equipment["title"], x, y + h - title_inset + title_size, w,
        "ProposalSans-Bold", title_size, NAVY, max_lines=1,
        min_size=9, field_name="page_3.equipment_table.title",
    )
    top = y + h - table_inset
    col_widths = [w * 0.29, w * 0.52, w * 0.19]
    num_rows = len(equipment["rows"])
    lowest_allowed = y + 5

    # Orçamentos reais podem ter bem mais itens do que a demonstração original
    # (que assumia sempre 6). Em vez de falhar sempre que a lista é maior,
    # encolhe a altura de linha/cabeçalho (e a fonte, proporcionalmente) até
    # um mínimo legível antes de desistir e sinalizar overflow de verdade.
    DEFAULT_HEADER_H, DEFAULT_ROW_H = 20.0, 20.0
    MIN_HEADER_H, MIN_ROW_H = 14.0, 9.0
    available = (top - lowest_allowed) - area_size - 9
    if DEFAULT_HEADER_H + num_rows * DEFAULT_ROW_H <= available:
        header_h, row_h = DEFAULT_HEADER_H, DEFAULT_ROW_H
    else:
        header_h = MIN_HEADER_H
        row_h = (available - header_h) / num_rows if num_rows > 0 else 0
        if row_h < MIN_ROW_H:
            raise LayoutOverflowError(
                f"page_3.equipment_table: {num_rows} linhas ultrapassam o container "
                f"mesmo no tamanho mínimo de linha ({MIN_ROW_H} pt)"
            )
    header_size = header_size if header_h >= 18 else max(6.0, header_size * (header_h / DEFAULT_HEADER_H))
    row_size = row_size if row_h >= 18 else max(5.5, row_size * (row_h / DEFAULT_ROW_H))
    row_max_lines = 2 if row_h >= 16 else 1

    c.setFillColor(NAVY)
    c.roundRect(x, top - header_h, w, header_h, 3, fill=1, stroke=0)
    cursor = x
    for header, col_w in zip(equipment["headers"], col_widths):
        c.setFillColor(white)
        draw_wrapped(
            c, header, cursor + 6, top - min(6.0, header_h * 0.35), col_w - 12,
            "ProposalSans-Bold", header_size, white, max_lines=1,
            min_size=6.0, field_name=f"page_3.equipment_table.header.{header}",
        )
        cursor += col_w
    for index, row in enumerate(equipment["rows"]):
        row_top = top - header_h - index * row_h
        if index % 2 == 0:
            c.setFillColor(Color(0.91, 0.95, 0.97, alpha=0.75))
            c.rect(x, row_top - row_h, w, row_h, fill=1, stroke=0)
        cursor = x
        for column_index, (value, col_w) in enumerate(zip(row, col_widths), 1):
            draw_wrapped(
                c, value, cursor + 6, row_top - min(3.0, row_h * 0.25), col_w - 12,
                "ProposalSans", row_size, INK, leading=row_size * 1.15, max_lines=row_max_lines,
                min_size=5.0,
                field_name=f"page_3.equipment_table.row_{index + 1}.column_{column_index}",
            )
            cursor += col_w
        c.setStrokeColor(LIGHT)
        c.setLineWidth(0.35)
        c.line(x, row_top - row_h, x + w, row_top - row_h)
    c.setFillColor(CYAN_DARK)
    c.setFont("ProposalSans-Bold", area_size)
    c.drawString(x + 6, top - header_h - num_rows * row_h - 8, equipment["area_label"])


def draw_page_3(c: canvas.Canvas, data: dict, fields: dict, logo_path: Path) -> None:
    page = data["pages"]["3"]
    draw_header(c, data, fields, 3, logo_path)
    draw_page_heading(c, data, fields, 3, page["title"], page["subtitle"])
    x, y, w, h, item = field_rect(fields, 3, "project_summary")
    c.setFillColor(Color(0, 0.75, 0.92, alpha=0.08))
    c.roundRect(x, y, w, h, 8, fill=1, stroke=0)
    draw_wrapped(c, page["summary_line"], x + 12, y + h * 0.68, w - 24, "ProposalSans-Bold", item["fontSize"], NAVY, max_lines=2)

    x, y, w, h, _ = field_rect(fields, 3, "metric_cards")
    draw_metric_cards(c, page["metric_cards"], (x, y, w, h), 5)

    x, y, w, h, _ = field_rect(fields, 3, "consumption_chart")
    draw_consumption_chart(c, data["monthly_profile"], (x, y, w, h))

    x, y, w, h, item = field_rect(fields, 3, "equipment_table")
    draw_equipment_table(c, data["equipment"], (x, y, w, h), item)

    x, y, w, h, item = field_rect(fields, 3, "technical_note")
    draw_wrapped(
        c, data["project"]["generation_note"], x, y + h, w,
        "ProposalSans", item["fontSize"], MUTED, leading=8.0, max_lines=3,
        min_size=6.5, max_height=h,
        field_name="page_3.technical_note",
    )
    draw_footer(c, data, fields, 3)


def draw_page_4(c: canvas.Canvas, data: dict, fields: dict, logo_path: Path) -> None:
    page = data["pages"]["4"]
    draw_header(c, data, fields, 4, logo_path)
    draw_page_heading(c, data, fields, 4, page["title"], page["subtitle"])

    x, y, w, h, item = field_rect(fields, 4, "warranty_general_note")
    c.setFillColor(Color(0, 0.75, 0.92, alpha=0.08))
    c.roundRect(x, y, w, h, 6, fill=1, stroke=0)
    draw_wrapped(
        c, data["warranty_note"], x + 12, y + h * 0.68, w - 24,
        "ProposalSans", item["fontSize"], MUTED, leading=8.4, max_lines=2,
        min_size=6.5, field_name="page_4.warranty_general_note",
    )

    x, y, w, h, item = field_rect(fields, 4, "services_panel")
    c.setFillColor(NAVY)
    c.setFont("ProposalSans-Bold", 14)
    c.drawString(x, y + h - 18, page["services_title"])
    c.setStrokeColor(CYAN)
    c.setLineWidth(2)
    c.line(x, y + h - 34, x + w * 0.22, y + h - 34)
    services = data["services"]
    columns = [services[:7], services[7:]]
    col_w = w * 0.47
    for col_index, items in enumerate(columns):
        cx = x + col_index * w * 0.52
        top = y + h - 78
        for row_index, service in enumerate(items):
            baseline = top - row_index * 47
            draw_bullet(c, cx + 3, baseline + 3, 2.5, CYAN if row_index % 2 == 0 else YELLOW)
            draw_wrapped(c, service, cx + 14, baseline + 9, col_w - 14, "ProposalSans", item["fontSize"], INK, leading=11.5, max_lines=2)

    for index, warranty in enumerate(data["warranties"], 1):
        x, y, w, h, item = field_rect(fields, 4, f"warranty_card_{index}")
        c.setFillColor(CYAN if index != 2 else YELLOW)
        c.roundRect(x, y + h - 8, 32, 3, 1.5, fill=1, stroke=0)
        draw_wrapped(c, warranty["title"], x, y + h - 20, w, "ProposalSans-Bold", 9.2, NAVY, max_lines=2)
        draw_wrapped(c, warranty["value"], x, y + h - 54, w, "ProposalSans-Bold", 12.5, CYAN_DARK if index != 2 else NAVY, leading=15, max_lines=2)

    x, y, w, h, item = field_rect(fields, 4, "warranty_note")
    draw_wrapped(c, page["warranty_note_title"], x, y + h - 4, w, "ProposalSans-Bold", 8.2, NAVY, max_lines=2)
    cursor = y + h - 30
    for detail_index, detail in enumerate(data["warranty_details"], 1):
        draw_bullet(c, x + 2, cursor - 1, 1.35, CYAN)
        cursor = draw_wrapped(
            c, detail, x + 9, cursor + 4, w - 9,
            "ProposalSans", item["fontSize"], INK, leading=7.6, max_lines=2,
            min_size=6.5, field_name=f"page_4.warranty_detail_{detail_index}",
        ) - 1.0

    x, y, w, h, item = field_rect(fields, 4, "timeline")
    labels = page["timeline"]
    gap = w / len(labels)
    for index, label in enumerate(labels):
        cx = x + gap * (index + 0.5)
        draw_wrapped(c, label, cx - gap * 0.43, y + 17, gap * 0.86, "ProposalSans-Bold", item["fontSize"], NAVY, leading=7.1, align="center", max_lines=2)

    x, y, w, h, item = field_rect(fields, 4, "differentials_panel")
    c.setFont("ProposalSans-Bold", 12)
    c.setFillColor(NAVY)
    c.drawString(x, y + h - 15, page["differentials_title"])
    items = data["differentials"]
    for index, text in enumerate(items):
        col = index % 2
        row = index // 2
        cx = x + col * w * 0.5
        cy = y + h - 39 - row * 15.5
        draw_bullet(c, cx + 3, cy + 2, 2.0, CYAN if row % 2 == 0 else YELLOW)
        draw_wrapped(c, text, cx + 13, cy + 7, w * 0.46, "ProposalSans", item["fontSize"], INK, leading=7.8, max_lines=2)
    draw_footer(c, data, fields, 4)


def draw_savings_chart(c: canvas.Canvas, page: dict, financial: dict, rect: tuple[float, float, float, float]) -> None:
    x, y, w, h = rect
    c.setFont("ProposalSans-Bold", 10.5)
    c.setFillColor(NAVY)
    c.drawString(x, y + h - 12, page["projection_title"])
    chart_x, chart_y = x + 15, y + 35
    chart_w, chart_h = w - 30, h - 75
    projection = financial["projection"]
    maximum = max(point["value"] for point in projection) or 1
    points = []
    denominator = max(len(projection) - 1, 1)
    for index, point in enumerate(projection):
        px = chart_x + chart_w * index / denominator
        py = chart_y + chart_h * point["value"] / maximum
        points.append((px, py, point))
    c.setFillColor(Color(0, 0.75, 0.92, alpha=0.11))
    path = c.beginPath()
    path.moveTo(points[0][0], chart_y)
    for px, py, _ in points:
        path.lineTo(px, py)
    path.lineTo(points[-1][0], chart_y)
    path.close()
    c.drawPath(path, fill=1, stroke=0)
    c.setStrokeColor(CYAN)
    c.setLineWidth(2.0)
    line = c.beginPath()
    line.moveTo(points[0][0], points[0][1])
    for px, py, _ in points[1:]:
        line.lineTo(px, py)
    c.drawPath(line, fill=0, stroke=1)
    for index, (px, py, point) in enumerate(points):
        c.setFillColor(YELLOW if index in (0, len(points) - 1) else CYAN)
        c.circle(px, py, 3.2, fill=1, stroke=0)
        c.setFillColor(MUTED)
        c.setFont("ProposalSans", 6.5)
        c.drawCentredString(px, chart_y - 13, point["label"])
        c.setFont("ProposalSans-Bold", 6.5)
        label_y = min(py + 11, y + h - 32)
        c.drawCentredString(px, label_y, point["display"])


def draw_page_5(c: canvas.Canvas, data: dict, fields: dict, logo_path: Path) -> None:
    page = data["pages"]["5"]
    financial = data["financial"]
    draw_header(c, data, fields, 5, logo_path)
    draw_page_heading(c, data, fields, 5, page["page_title"], page["page_subtitle"])

    x, y, w, h, _ = field_rect(fields, 5, "investment_card")
    draw_single_line(
        c, page["investment_title"], x, y + h - 18, w * 0.7,
        "ProposalSans-Bold", 10.5, CYAN, min_size=8,
        field_name="page_5.investment_title",
    )
    draw_single_line(
        c, financial["investment"], x, y + h - 58, w * 0.7,
        "ProposalSans-Bold", 28, white, min_size=18,
        field_name="page_5.investment_value",
    )
    c.setFillColor(YELLOW)
    c.roundRect(x, y + h - 76, w * 0.19, 3, 1.5, fill=1, stroke=0)
    draw_wrapped(c, page["investment_complement"], x, y + h - 91, w * 0.72, "ProposalSans", 9.2, HexColor("#D6EEF7"), max_lines=2)

    x, y, w, h, _ = field_rect(fields, 5, "financial_metrics")
    draw_metric_cards(c, page["metric_cards"], (x, y, w, h), 3)

    x, y, w, h, _ = field_rect(fields, 5, "savings_chart")
    draw_savings_chart(c, page, financial, (x, y, w, h))

    x, y, w, h, item = field_rect(fields, 5, "payment_panel")
    c.setFont("ProposalSans-Bold", 10.5)
    c.setFillColor(NAVY)
    c.drawString(x, y + h - 12, page["payment_title"])
    cursor_top = y + h - 34
    for option in data["payment_options"]:
        cursor_top = draw_wrapped(
            c, option["title"], x, cursor_top, w,
            "ProposalSans-Bold", 7, NAVY, leading=8.3, max_lines=2,
            min_size=7, field_name=f"page_5.payment.{option['title']}.title",
        )
        for line_index, line in enumerate(option["lines"], 1):
            draw_bullet(c, x + 2, cursor_top + 1, 1.45, CYAN)
            cursor_top = draw_wrapped(
                c, line, x + 9, cursor_top + 6, w - 9,
                "ProposalSans", 6.5, MUTED, leading=7.8, max_lines=2,
                min_size=6.5,
                field_name=f"page_5.payment.{option['title']}.line_{line_index}",
            )
        cursor_top -= 1
    note_first_baseline = y + 18 - 6.5
    last_content_baseline = cursor_top + 7.8
    if last_content_baseline - note_first_baseline < 3:
        raise LayoutOverflowError("page_5.payment_panel: opções ultrapassam o espaço disponível")
    draw_wrapped(
        c, data["payment_note"], x, y + 18, w,
        "ProposalSans", 6.5, MUTED, leading=7.8, max_lines=2,
        min_size=6.5, field_name="page_5.payment_note",
    )

    x, y, w, h, item = field_rect(fields, 5, "assumptions_panel")
    c.setFont("ProposalSans-Bold", 10)
    c.setFillColor(NAVY)
    c.drawString(x, y + h - 12, page["assumptions_title"])
    assumptions = page["assumptions"]
    for index, text in enumerate(assumptions):
        col = index
        cx = x + col * w / 5
        cy = y + h - 40
        draw_bullet(c, cx + 2, cy + 3, 1.8, CYAN if col % 2 == 0 else YELLOW)
        draw_wrapped(
            c, text, cx + 9, cy + 8, w / 5 - 14,
            "ProposalSans", 7, INK, leading=8.2, max_lines=3,
            min_size=7, field_name=f"page_5.assumption_{index + 1}",
        )

    x, y, w, h, item = field_rect(fields, 5, "financial_note")
    draw_wrapped(
        c, financial["note"], x, y + h, w,
        "ProposalSans", item["fontSize"], MUTED, leading=8.0, max_lines=3,
        min_size=6.5, max_height=h, field_name="page_5.financial_note",
    )

    for index, card in enumerate(page["bottom_cards"], 1):
        x, y, w, h, item = field_rect(fields, 5, f"bottom_card_{index}")
        draw_wrapped(c, card["title"], x, y + h, w, "ProposalSans-Bold", 8.2, NAVY, max_lines=2)
        draw_wrapped(c, card["value"], x, y + h - 36, w, "ProposalSans-Bold", 13.5, CYAN_DARK if index == 1 else NAVY, max_lines=2)
    draw_footer(c, data, fields, 5)


def draw_list_panel(c: canvas.Canvas, title: str, lines: list[str], rect: tuple[float, float, float, float], size: float) -> None:
    x, y, w, h = rect
    c.setFont("ProposalSans-Bold", 12)
    c.setFillColor(NAVY)
    c.drawString(x, y + h - 15, title)
    c.setFillColor(CYAN)
    c.roundRect(x, y + h - 29, w * 0.22, 3, 1.5, fill=1, stroke=0)
    top = y + h - 42
    step = min(25, (h - 48) / max(len(lines), 1))
    for index, line in enumerate(lines):
        cy = top - index * step
        draw_bullet(c, x + 3, cy + 2, 2.2, CYAN if index % 2 == 0 else YELLOW)
        draw_wrapped(c, line, x + 15, cy + 9, w - 15, "ProposalSans", size, INK, leading=size * 1.25, max_lines=2)


def draw_qr_or_placeholder(c: canvas.Canvas, data: dict, rect: tuple[float, float, float, float], size: float) -> None:
    x, y, w, h = rect
    if data["qr"]["available"] and data["qr"]["url"]:
        widget = qr.QrCodeWidget(data["qr"]["url"])
        bounds = widget.getBounds()
        qr_size = min(w, h) * 0.72
        drawing = Drawing(qr_size, qr_size, transform=[qr_size / (bounds[2] - bounds[0]), 0, 0, qr_size / (bounds[3] - bounds[1]), 0, 0])
        drawing.add(widget)
        drawing.drawOn(c, x + (w - qr_size) / 2, y + (h - qr_size) / 2)
    else:
        c.setStrokeColor(CYAN)
        c.setDash(3, 2)
        c.roundRect(x + w * 0.25, y + h * 0.36, w * 0.5, h * 0.45, 6, fill=0, stroke=1)
        c.setDash()
        draw_wrapped(c, data["pages"]["6"]["qr_placeholder"], x + w * 0.08, y + h * 0.28, w * 0.84, "ProposalSans", size, MUTED, align="center", max_lines=3)


def draw_page_6(c: canvas.Canvas, data: dict, fields: dict, logo_path: Path) -> None:
    page = data["pages"]["6"]
    draw_header(c, data, fields, 6, logo_path)
    draw_page_heading(c, data, fields, 6, page["title"], page["subtitle"])

    x, y, w, h, item = field_rect(fields, 6, "commercial_panel")
    draw_list_panel(c, page["commercial_title"], page["commercial_lines"], (x, y, w, h), item["fontSize"])
    x, y, w, h, item = field_rect(fields, 6, "included_panel")
    draw_list_panel(c, page["included_title"], page["included_lines"], (x, y, w, h), item["fontSize"])

    x, y, w, h, item = field_rect(fields, 6, "timeline")
    timeline_items = page["timeline"]
    gap = w / len(timeline_items)
    for index, timeline_item in enumerate(timeline_items):
        label = timeline_item["label"]
        cx = x + gap * (index + 0.5)
        icon_x, icon_y, icon_w, icon_h, _ = field_rect(fields, 6, f"timeline_icon_{index + 1}")
        draw_timeline_icon(
            c, timeline_item["icon"], icon_x + icon_w / 2, icon_y + icon_h / 2,
            min(icon_w, icon_h) * 0.64,
        )
        draw_wrapped(c, label, cx - gap * 0.44, y + 16, gap * 0.88, "ProposalSans-Bold", item["fontSize"], NAVY, leading=7.2, align="center", max_lines=2)

    x, y, w, h, item = field_rect(fields, 6, "conditions_panel")
    c.setFont("ProposalSans-Bold", 11)
    c.setFillColor(NAVY)
    c.drawString(x, y + h - 14, page["conditions_title"])
    draw_wrapped(c, page["conditions_text"], x, y + h - 45, w, "ProposalSans", item["fontSize"], MUTED, leading=11.2, max_lines=7)

    x, y, w, h, item = field_rect(fields, 6, "contact_panel")
    draw_list_panel(c, page["contact_title"], page["contact_lines"], (x, y, w, h), item["fontSize"])
    x, y, w, h, item = field_rect(fields, 6, "qr_panel")
    draw_qr_or_placeholder(c, data, (x, y, w, h), item["fontSize"])

    x, y, w, h, item = field_rect(fields, 6, "signatures")
    labels = page["signatures"]
    positions = [x + w * 0.24, x + w * 0.76]
    for cx, label in zip(positions, labels):
        c.setFillColor(MUTED)
        c.setFont("ProposalSans", item["fontSize"])
        c.drawCentredString(cx, y + h * 0.31, label)

    x, y, w, h, item = field_rect(fields, 6, "final_message")
    draw_wrapped(c, page["final_message"], x, y + h, w, "ProposalSans-Bold", item["fontSize"], NAVY, align="center", max_lines=3)
    draw_footer(c, data, fields, 6)


def nested_value(data: dict, path: str):
    value = data
    for part in path.split("."):
        if not isinstance(value, dict) or part not in value:
            raise KeyError(path)
        value = value[part]
    return value


def parse_brl(value: str) -> Decimal:
    normalized = re.sub(r"[^0-9,.-]", "", value).replace(".", "").replace(",", ".")
    try:
        return Decimal(normalized)
    except InvalidOperation as exc:
        raise ValueError(f"Valor monetário inválido: {value!r}") from exc


def resolve_assets(data: dict) -> tuple[Path, list[Path], list[Path]]:
    logo = (TEMPLATE_DIR / data["assets"]["logo"]).resolve()
    backgrounds = [(TEMPLATE_DIR / path).resolve() for path in data["assets"]["backgrounds"]]
    fonts = [
        (TEMPLATE_DIR / "assets/fonts/DejaVuSans.ttf").resolve(),
        (TEMPLATE_DIR / "assets/fonts/DejaVuSans-Bold.ttf").resolve(),
    ]
    return logo, backgrounds, fonts


def validate_package(data: dict, layout: dict) -> tuple[dict, dict, Path, list[Path]]:
    """Valida dados + layout + assets. Levanta ProposalValidationError com todos
    os problemas encontrados de uma vez (não interrompe no primeiro erro)."""
    errors: list[str] = []
    demo_mode = bool(nested_value(data, "meta.demo_mode")) if _has_path(data, "meta.demo_mode") else False

    required_paths = [
        "meta.template_version", "meta.document_title", "meta.proposal_number",
        "meta.issue_date", "meta.valid_until", "meta.commercial_validity",
        "meta.validity_days", "meta.page_total", "assets.logo", "assets.backgrounds",
        "company.name", "company.commercial_contact", "company.phone", "company.cnpj",
        "client.name", "client.installation_type", "client.utility", "client.consultant",
        "project.installed_power_kwp", "project.module_quantity", "project.module_power_w",
        "project.monthly_generation_kwh", "project.annual_generation_kwh",
        "project.monthly_consumption_kwh", "project.annual_consumption_kwh",
        "project.compensation_percent", "monthly_profile.rows", "equipment.rows",
        "financial.investment", "financial.first_year_savings",
        "financial.savings_25_years", "financial.energy_25_years",
        "payment_options", "pages.2.project_facts", "pages.6.timeline",
    ]
    for path in required_paths:
        try:
            value = nested_value(data, path)
            if value is None or value == "" or value == []:
                errors.append(f"Campo obrigatório vazio: {path}")
        except KeyError:
            errors.append(f"Campo obrigatório ausente: {path}")

    if errors:
        raise ProposalValidationError("\n".join(errors))

    if data["meta"]["page_total"] != 6 or set(data["pages"].keys()) != set("123456"):
        errors.append("A proposta deve conter dados para exatamente seis páginas")

    asset_values = [data["assets"]["logo"], *data["assets"]["backgrounds"]]
    for relative in asset_values:
        candidate = Path(relative)
        if candidate.is_absolute() or ".." in candidate.parts:
            errors.append(f"Asset deve usar caminho relativo interno: {relative}")
    if len(data["assets"]["backgrounds"]) != 6:
        errors.append("Devem existir exatamente seis fundos")

    logo, backgrounds, fonts = resolve_assets(data)
    for asset in [logo, *backgrounds, *fonts]:
        if not asset.is_file():
            errors.append(f"Arquivo obrigatório ausente: {asset.relative_to(TEMPLATE_DIR) if asset.is_relative_to(TEMPLATE_DIR) else asset}")
    if logo.is_file():
        try:
            with Image.open(logo) as image:
                image.verify()
        except Exception as exc:
            errors.append(f"Logo inválida: {exc}")
    for index, background in enumerate(backgrounds, 1):
        if background.is_file():
            try:
                with Image.open(background) as image:
                    if image.size != EXPECTED_BACKGROUND_SIZE:
                        errors.append(f"Fundo {index} deve medir 2480 x 3508 px; encontrado {image.size}")
                    if image.format != "PNG":
                        errors.append(f"Fundo {index} não está em PNG")
            except Exception as exc:
                errors.append(f"Fundo {index} inválido: {exc}")

    project = data["project"]
    numeric_fields = [
        "installed_power_kwp", "module_quantity", "module_power_w",
        "monthly_generation_kwh", "annual_generation_kwh",
        "monthly_consumption_kwh", "annual_consumption_kwh", "compensation_percent",
    ]
    for field_name in numeric_fields:
        value = project[field_name]
        if not isinstance(value, (int, float)) or value <= 0:
            errors.append(f"Valor técnico inválido: project.{field_name}")
    if all(isinstance(project.get(k), (int, float)) for k in ("module_quantity", "module_power_w", "installed_power_kwp")):
        calculated_w = project["module_quantity"] * project["module_power_w"]
        if abs(calculated_w / 1000 - project["installed_power_kwp"]) > 0.05:
            errors.append("Potência instalada diverge de quantidade x potência dos módulos")

    rows = data["monthly_profile"]["rows"]
    if len(rows) != 12:
        errors.append("O gráfico mensal deve conter 12 meses")
    if any(row.get("consumption", 0) < 0 or row.get("generation", 0) < 0 for row in rows):
        errors.append("Consumo e geração mensais não podem ser negativos")

    if len(data["equipment"]["rows"]) == 0:
        errors.append("A tabela de equipamentos precisa de ao menos um item")
    if not (1 <= len(data["payment_options"]) <= 3):
        errors.append("Devem existir entre uma e três formas de pagamento")

    try:
        investment = parse_brl(data["financial"]["investment"])
        first_year = parse_brl(data["financial"]["first_year_savings"])
        savings_period = parse_brl(data["financial"]["savings_25_years"])
        if investment <= 0:
            errors.append("O investimento (valor comercial final) deve ser positivo")
        projection = data["financial"].get("projection") or []
        if len(projection) < 2:
            errors.append("A projeção financeira precisa de ao menos dois pontos")
        else:
            anos_ordenados = [point["year"] for point in projection]
            if anos_ordenados != sorted(anos_ordenados):
                errors.append("A projeção financeira deve estar em ordem crescente de ano")
            ultimo_ponto = projection[-1]
            if Decimal(str(ultimo_ponto["value"])) != savings_period:
                errors.append("O último ponto da projeção deve corresponder à economia do período analisado")
    except (ValueError, ArithmeticError, KeyError) as exc:
        errors.append(f"Valor financeiro inválido: {exc}")

    try:
        issue = datetime.strptime(data["meta"]["issue_date"], "%d/%m/%Y").date()
        valid_until = datetime.strptime(data["meta"]["valid_until"], "%d/%m/%Y").date()
        validity_days = int(data["meta"]["validity_days"])
        if (valid_until - issue).days != validity_days:
            errors.append("Validade final não corresponde ao prazo de validade informado")
    except (ValueError, KeyError) as exc:
        errors.append(f"Data inválida: {exc}")

    expected_fact_labels = ["Potência instalada", "Geração anual", "Compensação estimada"]
    if [fact.get("label") for fact in data["pages"]["2"]["project_facts"]] != expected_fact_labels:
        errors.append("Os três rótulos da página 2 estão incorretos ou fora de ordem")
    expected_icons = ["accept", "validation", "project", "installation", "activation"]
    if [item.get("icon") for item in data["pages"]["6"]["timeline"]] != expected_icons:
        errors.append("A linha do tempo da página 6 deve definir os cinco ícones esperados")

    # Conteúdo interno/confidencial nunca pode ser enviado ao gerador — é uma
    # segunda barreira, além do normalizador do backend já não incluí-lo.
    serialized_data = json.dumps(data, ensure_ascii=False)
    lowered = serialized_data.lower()
    for termo in TERMOS_INTERNOS_PROIBIDOS:
        if termo.lower() in lowered:
            errors.append(f"Dado interno não pode ser enviado ao gerador: {termo}")
    for acronimo in ACRONIMOS_INTERNOS_PROIBIDOS:
        if re.search(rf"\b{acronimo}\b", serialized_data, re.IGNORECASE):
            errors.append(f"Dado interno não pode ser enviado ao gerador: {acronimo}")

    if not demo_mode:
        for frase in FRASES_DEMONSTRATIVAS_PROIBIDAS:
            if frase in serialized_data:
                errors.append(f"Proposta real não pode conter texto demonstrativo: {frase}")

    required_layout_fields = {
        (1, "cover_logo"), (1, "cover_client"), (1, "cover_system"),
        (2, "header"), (2, "footer"), (2, "solution_panel"), (2, "flow_steps"),
        (3, "metric_cards"), (3, "consumption_chart"), (3, "equipment_table"), (3, "technical_note"),
        (4, "services_panel"), (4, "warranty_note"), (4, "timeline"), (4, "differentials_panel"),
        (5, "financial_metrics"), (5, "savings_chart"), (5, "payment_panel"), (5, "financial_note"),
        (6, "contact_panel"), (6, "qr_panel"), (6, "signatures"), (6, "timeline"),
        *((6, f"timeline_icon_{index}") for index in range(1, 6)),
    }
    field_keys: set[tuple[int, str]] = set()
    for entry in layout.get("fields", []):
        key = (entry.get("page"), entry.get("field"))
        if key in field_keys:
            errors.append(f"Campo de layout duplicado: {key}")
        field_keys.add(key)
        if not 1 <= entry.get("page", 0) <= 6:
            errors.append(f"Página inválida no layout: {key}")
        for dimension in ("x", "y", "width", "height"):
            if not isinstance(entry.get(dimension), (int, float)) or entry[dimension] < 0:
                errors.append(f"Coordenada inválida em {key}: {dimension}")
        if entry.get("x", 0) + entry.get("width", 0) > SOURCE_W or entry.get("y", 0) + entry.get("height", 0) > SOURCE_H:
            errors.append(f"Campo ultrapassa a página: {key}")
    missing_layout = required_layout_fields - field_keys
    if missing_layout:
        errors.append(f"Campos ausentes no layout: {sorted(missing_layout)}")
    field_index = build_field_index(layout)
    minimums = {
        (3, "technical_note"): 6.5,
        (4, "warranty_note"): 6.5,
        (4, "timeline"): 7,
        (5, "payment_panel"): 7,
        (5, "financial_note"): 6.5,
        (6, "timeline"): 7,
    }
    for key, minimum in minimums.items():
        if key in field_index and field_index[key].get("fontSize", 0) < minimum:
            errors.append(f"Fonte abaixo do mínimo em {key}: {field_index[key].get('fontSize')} pt")
    for page_number in range(2, 7):
        footer = field_index.get((page_number, "footer"))
        if not footer or footer.get("fontSize", 0) < 6.5:
            errors.append(f"Rodapé da página {page_number} deve usar no mínimo 6,5 pt")

    if errors:
        raise ProposalValidationError("Falha na validação:\n- " + "\n- ".join(errors))
    return data, layout, logo, backgrounds


def _has_path(data: dict, path: str) -> bool:
    try:
        nested_value(data, path)
        return True
    except KeyError:
        return False


def validate_generated_pdf(output_path: Path, expected_pages: int, disclaimer: str, demo_mode: bool) -> None:
    reader = PdfReader(str(output_path))
    if len(reader.pages) != expected_pages:
        raise ProposalValidationError(f"PDF gerado possui {len(reader.pages)} páginas; esperado: {expected_pages}")
    text = "\n".join(page.extract_text() or "" for page in reader.pages)
    for index, page in enumerate(reader.pages, 1):
        width, height = float(page.mediabox.width), float(page.mediabox.height)
        if abs(width - PAGE_W) > 0.1 or abs(height - PAGE_H) > 0.1:
            raise ProposalValidationError(f"Página {index} não está em A4")
    if len(text) < 4000:
        raise ProposalValidationError("Texto selecionável ausente ou incompleto")
    if disclaimer and text.count(disclaimer) != expected_pages - 1:
        raise ProposalValidationError("Aviso não aparece nas cinco páginas internas")
    for required in ("Equipamentos e escopo técnico",):
        if required not in text:
            raise ProposalValidationError(f"Texto obrigatório ausente no PDF: {required}")
    lowered_text = text.lower()
    for forbidden in TERMOS_INTERNOS_PROIBIDOS:
        if forbidden.lower() in lowered_text:
            raise ProposalValidationError(f"Conteúdo proibido encontrado no PDF: {forbidden}")
    for forbidden_acronym in ACRONIMOS_INTERNOS_PROIBIDOS:
        if re.search(rf"\b{forbidden_acronym}\b", text, re.IGNORECASE):
            raise ProposalValidationError(f"Conteúdo proibido encontrado no PDF: {forbidden_acronym}")
    if not demo_mode:
        for frase in FRASES_DEMONSTRATIVAS_PROIBIDAS:
            if frase in text:
                raise ProposalValidationError(f"Proposta real não pode conter texto demonstrativo: {frase}")
    if output_path.stat().st_size > MAX_PDF_SIZE_BYTES:
        raise ProposalValidationError(
            f"PDF principal excede {MAX_PDF_SIZE_BYTES / 1024 / 1024:.0f} MB: "
            f"{output_path.stat().st_size / 1024 / 1024:.2f} MB"
        )


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _render_pdf(data: dict, layout: dict, logo_path: Path, backgrounds: list[Path], output_path: Path) -> None:
    register_fonts()
    fields = build_field_index(layout)
    with tempfile.TemporaryDirectory(prefix=f"alto-solar-pdf-{uuid.uuid4().hex}-") as temporary_dir:
        optimized_backgrounds = create_optimized_backgrounds(backgrounds, Path(temporary_dir))
        c = canvas.Canvas(
            str(output_path),
            pagesize=A4,
            pageCompression=1,
            initialFontName="ProposalSans",
            initialFontSize=10,
        )
        c.setTitle(data["meta"]["document_title"])
        c.setAuthor(data["company"]["name"])
        c.setSubject(data["meta"]["status"])

        page_drawers = [draw_cover, draw_page_2, draw_page_3, draw_page_4, draw_page_5, draw_page_6]
        for background, drawer in zip(optimized_backgrounds, page_drawers):
            draw_background(c, background)
            drawer(c, data, fields, logo_path)
            c.showPage()
        c.save()


def generate_proposal(
    proposal_data: dict,
    output_path: Path | None = None,
    layout_path: Path | None = None,
) -> GeneratedProposalResult:
    """Gera o PDF de seis páginas a partir de dados já normalizados.

    `output_path`, se informado, deve ser exclusivo desta chamada (nome único
    por requisição) — a função escreve nele e o remove ao final, mesmo em caso
    de erro. Sem `output_path`, um arquivo temporário exclusivo é criado em
    `/tmp` (ou no diretório de temporários do sistema local).
    """
    layout_path = layout_path or DEFAULT_LAYOUT_PATH
    layout = json.loads(layout_path.read_text(encoding="utf-8"))
    data, layout, logo_path, backgrounds = validate_package(proposal_data, layout)

    own_temp_file = output_path is None
    if own_temp_file:
        output_path = Path(tempfile.gettempdir()) / f"alto-solar-proposta-{uuid.uuid4().hex}.pdf"
    output_path.parent.mkdir(parents=True, exist_ok=True)

    try:
        _render_pdf(data, layout, logo_path, backgrounds, output_path)
        demo_mode = bool(data.get("meta", {}).get("demo_mode", False))
        validate_generated_pdf(output_path, data["meta"]["page_total"], data["meta"]["disclaimer"], demo_mode)
        pdf_bytes = output_path.read_bytes()
    finally:
        if own_temp_file:
            output_path.unlink(missing_ok=True)

    digest = sha256_bytes(pdf_bytes)
    manifest = {
        "template_version": data["meta"]["template_version"],
        "generated_at": datetime.now(TIMEZONE_COMERCIAL).isoformat(timespec="seconds"),
        "proposal_number": data["meta"]["proposal_number"],
        "pdf_sha256": digest,
        "pdf_size_bytes": len(pdf_bytes),
    }

    return GeneratedProposalResult(
        pdf_bytes=pdf_bytes,
        sha256=digest,
        size_bytes=len(pdf_bytes),
        pages=data["meta"]["page_total"],
        template_version=data["meta"]["template_version"],
        manifest=manifest,
        warnings=[],
    )


def generate_proposal_file(data_path: Path, layout_path: Path, output_path: Path) -> GeneratedProposalResult:
    """Wrapper de conveniência para a CLI: lê `data_path` do disco e grava o
    PDF final em `output_path` (persistente — usado só para testes locais).
    A renderização em si sempre usa um arquivo temporário exclusivo (ver
    `generate_proposal`), removido automaticamente ao final."""
    data = json.loads(data_path.read_text(encoding="utf-8"))
    result = generate_proposal(data, output_path=None, layout_path=layout_path)
    output_path.write_bytes(result.pdf_bytes)
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data", type=Path, required=True, help="JSON com os dados normalizados da proposta")
    parser.add_argument("--layout", type=Path, default=DEFAULT_LAYOUT_PATH)
    parser.add_argument("--output", type=Path, default=Path("proposta-gerada.pdf"))
    parser.add_argument("--validate", action="store_true", help="Valida dados, assets e layout sem gerar o PDF")
    args = parser.parse_args()
    try:
        if args.validate:
            data = json.loads(args.data.resolve().read_text(encoding="utf-8"))
            layout = json.loads(args.layout.resolve().read_text(encoding="utf-8"))
            validated, _, _, _ = validate_package(data, layout)
            print(
                f"VALIDATION OK - template {validated['meta']['template_version']}; "
                f"6 páginas; assets, dados e layout consistentes"
            )
            return
        result = generate_proposal_file(args.data.resolve(), args.layout.resolve(), args.output.resolve())
        print(
            f"PDF gerado e validado: {args.output.resolve()} "
            f"({result.size_bytes / 1024:.0f} KB, sha256={result.sha256[:12]}…)"
        )
    except (ProposalValidationError, LayoutOverflowError, FileNotFoundError) as exc:
        print(f"ERRO: {exc}", file=sys.stderr)
        raise SystemExit(2) from exc


if __name__ == "__main__":
    main()
