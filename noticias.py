"""
Últimas manchetes de O Setor Elétrico, para o quadro "No setor" da home.

Roda como função serverless na Vercel e responde em /api/noticias.
Devolve apenas título, data e link de cada matéria — nunca o texto —,
sempre com crédito à fonte. A resposta fica em cache na borda da Vercel
por 3 horas, para não sobrecarregar o site deles.

Usa só a biblioteca padrão do Python: não precisa de requirements.txt.
"""

from http.server import BaseHTTPRequestHandler
from email.utils import parsedate_to_datetime
import html
import json
import urllib.request
import xml.etree.ElementTree as ET

FEED = "https://www.osetoreletrico.com.br/category/noticias-do-setor/feed/"
DOMINIO = "https://www.osetoreletrico.com.br/"
QUANTIDADE = 3
MESES = ["jan", "fev", "mar", "abr", "mai", "jun",
         "jul", "ago", "set", "out", "nov", "dez"]


def rotulo_data(texto):
    """'Fri, 18 Sep 2026 12:00:00 +0000' -> '18 set'."""
    try:
        d = parsedate_to_datetime(texto)
        return f"{d.day:02d} {MESES[d.month - 1]}"
    except Exception:
        return ""


def ler_feed(xml_bruto, quantidade=QUANTIDADE):
    raiz = ET.fromstring(xml_bruto)
    itens = []
    for item in raiz.iter("item"):
        titulo = html.unescape((item.findtext("title") or "").strip())
        link = (item.findtext("link") or "").strip()
        # Só aceita links do próprio site da fonte
        if not titulo or not link.startswith(DOMINIO):
            continue
        itens.append({
            "titulo": titulo,
            "link": link,
            "data": rotulo_data(item.findtext("pubDate") or ""),
        })
        if len(itens) >= quantidade:
            break
    return itens


def buscar():
    pedido = urllib.request.Request(FEED, headers={
        "User-Agent": "SalaEletrica/1.0 (+https://salaeletrica.com.br)",
        "Accept": "application/rss+xml, application/xml;q=0.9",
    })
    with urllib.request.urlopen(pedido, timeout=8) as resposta:
        return ler_feed(resposta.read())


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        try:
            corpo = {"fonte": "O Setor Elétrico", "site": DOMINIO, "itens": buscar()}
            cache = "public, s-maxage=10800, stale-while-revalidate=86400"
        except Exception:
            # Falhou: a home mostra um link para o site da fonte no lugar
            corpo = {"fonte": "O Setor Elétrico", "site": DOMINIO, "itens": []}
            cache = "public, s-maxage=300"

        dados = json.dumps(corpo, ensure_ascii=False).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", cache)
        self.end_headers()
        self.wfile.write(dados)
