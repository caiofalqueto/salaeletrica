#!/usr/bin/env python3
"""
Gera o índice de busca do site (busca.json).

Percorre as páginas estáticas, separa o conteúdo por seção, garante que cada
seção tenha uma âncora (criando o id quando falta) e grava um índice enxuto.
O conteúdo que só existe em JavaScript — calculadoras, tabelas e o mapa de
concessionárias — é lido das próprias fontes de dados.

Rode este script sempre que o conteúdo do site mudar:
    python3 gerar-busca.py
"""

from html.parser import HTMLParser
import json
import re
import subprocess
import unicodedata
from pathlib import Path

RAIZ = Path(__file__).parent

PAGINAS = [
    ("index.html", "/", "Início"),
    ("calculadoras.html", "/calculadoras", "Calculadoras"),
    ("ferramentas.html", "/ferramentas", "Ferramentas"),
    ("downloads.html", "/downloads", "Downloads"),
    ("concessionarias.html", "/concessionarias", "Concessionárias"),
    ("termos.html", "/termos", "Termos de uso"),
    ("privacidade.html", "/privacidade", "Privacidade"),
]

IGNORAR = {"script", "style", "head", "header", "footer", "nav", "svg", "select", "option"}
TITULOS = {"h1", "h2", "h3"}
LIMITE = 420


def slug(texto):
    t = unicodedata.normalize("NFD", texto.lower())
    t = "".join(c for c in t if unicodedata.category(c) != "Mn")
    t = re.sub(r"[^a-z0-9]+", "-", t).strip("-")
    return t[:48] or "secao"


class Leitor(HTMLParser):
    """Separa o conteúdo visível por seção, guardando o id de âncora."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.secoes = []
        self.ignorando = 0
        self.no_titulo = None
        self.ancora_atual = None
        self.faltando = []          # (posição, título) de títulos sem id
        self._buf = []
        self._pos_tag = None

    def _nova(self, titulo, ancora):
        self.secoes.append({"titulo": titulo, "ancora": ancora, "texto": []})

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag in IGNORAR:
            self.ignorando += 1
            return
        if self.ignorando:
            return
        if a.get("id"):
            self.ancora_atual = a["id"]
        if tag in TITULOS:
            self.no_titulo = {"tag": tag, "id": a.get("id"), "pos": self.getpos()}
            self._buf = []

    def handle_endtag(self, tag):
        if tag in IGNORAR:
            self.ignorando = max(0, self.ignorando - 1)
            return
        if self.ignorando:
            return
        if self.no_titulo and tag == self.no_titulo["tag"]:
            titulo = " ".join("".join(self._buf).split())
            if titulo:
                ancora = self.no_titulo["id"]
                if not ancora:
                    ancora = slug(titulo)
                    self.faltando.append((self.no_titulo["pos"], self.no_titulo["tag"], ancora))
                self._nova(titulo, ancora)
            self.no_titulo = None
            self._buf = []

    def handle_data(self, dados):
        if self.ignorando:
            return
        if self.no_titulo is not None:
            self._buf.append(dados)
        elif self.secoes:
            self.secoes[-1]["texto"].append(dados)


def anotar_ancoras(caminho, faltando):
    """Escreve os ids gerados nos títulos que não tinham âncora."""
    if not faltando:
        return 0
    linhas = caminho.read_text(encoding="utf-8").split("\n")
    for (linha, col), tag, ancora in sorted(faltando, reverse=True):
        i = linha - 1
        alvo = f"<{tag}"
        pos = linhas[i].find(alvo, col)
        if pos < 0 or "id=" in linhas[i][pos:pos + len(alvo) + 60]:
            continue
        linhas[i] = linhas[i][:pos + len(alvo)] + f' id="{ancora}"' + linhas[i][pos + len(alvo):]
    caminho.write_text("\n".join(linhas), encoding="utf-8")
    return len(faltando)


def das_paginas():
    itens, criadas = [], 0
    for arquivo, url, pagina in PAGINAS:
        caminho = RAIZ / arquivo
        leitor = Leitor()
        leitor.feed(caminho.read_text(encoding="utf-8"))
        criadas += anotar_ancoras(caminho, leitor.faltando)
        for s in leitor.secoes:
            texto = " ".join("".join(s["texto"]).split())
            if len(texto) < 15 and len(s["titulo"]) < 4:
                continue
            itens.append({
                "t": s["titulo"],
                "p": pagina,
                "u": url + ("#" + s["ancora"] if s["ancora"] else ""),
                "c": texto[:LIMITE],
            })
    return itens, criadas


def das_calculadoras():
    """Lê os dados direto de calculadoras.js, para não duplicar conteúdo."""
    saida = subprocess.run(
        ["node", "-e", """
        const C = require('./calculadoras.js');
        const itens = [];
        for (const c of C.CALCULADORAS) itens.push({
          t: c.titulo, p: 'Calculadoras', u: '/calculadoras#' + c.id,
          c: [c.resumo, c.norma || '', ...c.campos.map(f => f.rotulo)].join(' ')
        });
        for (const t of C.TABELAS) itens.push({
          t: t.titulo, p: 'Tabelas', u: '/calculadoras#' + t.id,
          c: [t.resumo, t.nota || '', ...t.blocos.map(b => b.titulo + ' ' + b.linhas.slice(0, 40).map(l => l.join(' ')).join(' '))].join(' ')
        });
        process.stdout.write(JSON.stringify(itens));
        """],
        cwd=RAIZ, capture_output=True, text=True, check=True)
    itens = json.loads(saida.stdout)
    for i in itens:
        i["c"] = " ".join(i["c"].split())[:LIMITE]
    return itens


def das_concessionarias():
    """Extrai estados e distribuidoras do mapa."""
    texto = (RAIZ / "concessionarias.html").read_text(encoding="utf-8")
    bruto = re.search(r"const DADOS = (\{.*?\});\n", texto, re.S)
    if not bruto:
        return []
    dados = json.loads(bruto.group(1))
    itens = []
    for uf, d in dados.items():
        nomes = ", ".join(x["n"] for x in d["dist"])
        itens.append({
            "t": d["nome"],
            "p": "Concessionárias",
            "u": "/concessionarias",
            "c": f"{uf.upper()} — distribuidoras de energia: {nomes}. Região {d['regiao']}.",
        })
    return itens


def main():
    paginas, criadas = das_paginas()
    itens = paginas + das_calculadoras() + das_concessionarias()

    vistos, unicos = set(), []
    for i in itens:
        chave = (i["t"], i["u"])
        if chave not in vistos:
            vistos.add(chave)
            unicos.append(i)

    destino = RAIZ / "busca.json"
    destino.write_text(json.dumps(unicos, ensure_ascii=False, separators=(",", ":")),
                       encoding="utf-8")
    print(f"busca.json: {len(unicos)} entradas, {destino.stat().st_size / 1024:.1f} kB")
    print(f"âncoras criadas nas páginas: {criadas}")
    por_pagina = {}
    for i in unicos:
        por_pagina[i["p"]] = por_pagina.get(i["p"], 0) + 1
    for p, n in sorted(por_pagina.items(), key=lambda x: -x[1]):
        print(f"  {p:20} {n}")


if __name__ == "__main__":
    main()
