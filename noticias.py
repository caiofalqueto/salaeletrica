"""
Últimas manchetes do setor para o quadro "No setor" da home.

Fontes:
  - O Setor Elétrico      (feed RSS do WordPress, categoria Notícias)
  - Eletricidade Moderna  (Aranda Editora; sem feed, a página de notícias é lida)
  - Potência              (feed RSS do WordPress)

Roda como função serverless na Vercel e responde em /api/noticias.
Devolve apenas título, data e link de cada matéria, sempre com o nome da
fonte, nunca o texto. Cada fonte é buscada em paralelo e falha sozinha:
se uma sair do ar ou mudar de formato, as outras continuam aparecendo.
A resposta fica em cache na borda da Vercel por 3 horas.

Usa só a biblioteca padrão do Python: não precisa de requirements.txt.
"""

from http.server import BaseHTTPRequestHandler
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from html.parser import HTMLParser
from urllib.parse import urljoin, quote
import html
import json
import re
import urllib.request
import xml.etree.ElementTree as ET

POR_FONTE = 2
MESES = ["jan", "fev", "mar", "abr", "mai", "jun",
         "jul", "ago", "set", "out", "nov", "dez"]

FONTES = [
    {"id": "ose", "nome": "O Setor Elétrico", "sigla": "OSE", "tipo": "rss",
     "url": "https://www.osetoreletrico.com.br/category/noticias-do-setor/feed/",
     "dominio": "https://www.osetoreletrico.com.br/",
     "pagina": "https://www.osetoreletrico.com.br/category/noticias-do-setor"},
    {"id": "em", "nome": "Eletricidade Moderna", "sigla": "EM", "tipo": "aranda",
     "url": "https://www.arandanet.com.br/revista/em/noticias",
     "dominio": "https://www.arandanet.com.br/",
     "pagina": "https://www.arandanet.com.br/revista/em/noticias"},
    {"id": "potencia", "nome": "Potência", "sigla": "Potência", "tipo": "rss",
     "url": "https://revistapotencia.com.br/feed/",
     "dominio": "https://revistapotencia.com.br/",
     "pagina": "https://revistapotencia.com.br/ultimas-noticias/"},
]


def rotulo(d):
    return f"{d.day:02d} {MESES[d.month - 1]}" if d else ""


def baixar(url):
    pedido = urllib.request.Request(url, headers={
        "User-Agent": "SalaEletrica/1.0 (+https://salaeletrica.com.br)",
        "Accept": "application/rss+xml, application/xml, text/html;q=0.9",
    })
    with urllib.request.urlopen(pedido, timeout=6) as resposta:
        return resposta.read()


def link_seguro(href, fonte):
    """Torna o link absoluto, codifica espaços e exige o domínio da fonte."""
    url = quote(urljoin(fonte["dominio"], href.strip()),
                safe=":/?#[]@!$&'()*+,;=%-._~")
    return url if url.startswith(fonte["dominio"]) else None


# ---------------------------------------------------------------- RSS
def ler_rss(bruto, fonte, quantidade=POR_FONTE):
    itens = []
    for item in ET.fromstring(bruto).iter("item"):
        titulo = html.unescape((item.findtext("title") or "").strip())
        link = link_seguro(item.findtext("link") or "", fonte)
        if not titulo or not link:
            continue
        try:
            data = parsedate_to_datetime(item.findtext("pubDate") or "")
        except Exception:
            data = None
        itens.append({"titulo": titulo, "link": link, "data": data})
        if len(itens) >= quantidade:
            break
    return itens


# ---------------------------------------------------------------- Aranda
class LeitorAranda(HTMLParser):
    """Recolhe as notícias pelo padrão de endereço /revista/em/noticia/<id>-...

    Cada notícia tem três links (imagem, título, 'Leia mais'); o título é o
    link com texto. A data dd/mm/aaaa que aparece em seguida é dela.
    """
    PADRAO = re.compile(r"/revista/em/noticia/(\d+)-")
    DATA = re.compile(r"\b(\d{2})/(\d{2})/(\d{4})\b")

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.noticias = {}
        self._href = None
        self._id = None
        self._texto = []
        self._ultimo = None

    def handle_starttag(self, tag, attrs):
        if tag == "a":
            href = dict(attrs).get("href") or ""
            m = self.PADRAO.search(href)
            self._href, self._id = (href, int(m.group(1))) if m else (None, None)
            self._texto = []

    def handle_data(self, dados):
        if self._id is not None:
            self._texto.append(dados)
        elif self._ultimo is not None:
            m = self.DATA.search(dados)
            atual = self.noticias.get(self._ultimo)
            if m and atual is not None and atual["data"] is None:
                d, mes, a = map(int, m.groups())
                try:
                    atual["data"] = datetime(a, mes, d, 12, tzinfo=timezone.utc)
                except ValueError:
                    pass

    def handle_endtag(self, tag):
        if tag != "a" or self._id is None:
            return
        texto = " ".join("".join(self._texto).split())
        if texto and texto.lower() != "leia mais" and self._id not in self.noticias:
            self.noticias[self._id] = {"titulo": texto, "href": self._href, "data": None}
            self._ultimo = self._id
        self._href, self._id, self._texto = None, None, []


def ler_aranda(bruto, fonte, quantidade=POR_FONTE):
    leitor = LeitorAranda()
    leitor.feed(bruto.decode("utf-8", errors="replace"))
    itens = []
    for nid in sorted(leitor.noticias, reverse=True):   # id maior = mais recente
        n = leitor.noticias[nid]
        link = link_seguro(n["href"], fonte)
        if link:
            itens.append({"titulo": n["titulo"], "link": link, "data": n["data"]})
        if len(itens) >= quantidade:
            break
    return itens


LEITORES = {"rss": ler_rss, "aranda": ler_aranda}


def buscar_fonte(fonte):
    try:
        itens = LEITORES[fonte["tipo"]](baixar(fonte["url"]), fonte)
        return fonte, itens, True
    except Exception:
        return fonte, [], False


def buscar_todas(buscador=buscar_fonte):
    with ThreadPoolExecutor(max_workers=len(FONTES)) as pool:
        resultados = list(pool.map(buscador, FONTES))

    itens, situacao = [], []
    for fonte, lista, ok in resultados:
        situacao.append({"nome": fonte["nome"], "pagina": fonte["pagina"], "ok": ok})
        for n in lista:
            itens.append({**n, "fonte": fonte["nome"], "sigla": fonte["sigla"]})

    vazio = datetime.min.replace(tzinfo=timezone.utc)
    itens.sort(key=lambda n: n["data"] or vazio, reverse=True)
    for n in itens:
        n["data"] = rotulo(n["data"])
    return {"itens": itens, "fontes": situacao}


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        corpo = buscar_todas()
        algum = any(f["ok"] for f in corpo["fontes"])
        cache = ("public, s-maxage=10800, stale-while-revalidate=86400"
                 if algum else "public, s-maxage=300")
        dados = json.dumps(corpo, ensure_ascii=False).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", cache)
        self.end_headers()
        self.wfile.write(dados)
