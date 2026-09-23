/* =============================================================================
   Sala Elétrica — busca do site
   Lê o índice gerado por gerar-busca.py e mostra os resultados com a página e a
   seção onde o termo aparece. Tudo roda no navegador; nada é enviado a lugar
   nenhum. O índice só é baixado quando o usuário mexe no campo pela primeira vez.
   ========================================================================== */
(() => {
  'use strict';

  const LIMITE = 8;
  let indice = null, carregando = null;

  const semAcento = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function carregar() {
    if (indice) return Promise.resolve(indice);
    if (!carregando) carregando = fetch('/busca.json')
      .then(r => r.json())
      .then(d => {
        indice = d.map(i => ({ ...i, n: semAcento(i.t + ' ' + i.p + ' ' + i.c) , nt: semAcento(i.t) }));
        return indice;
      })
      .catch(() => { indice = []; return indice; });
    return carregando;
  }

  function procurar(termo) {
    const termos = semAcento(termo).split(/\s+/).filter(Boolean);
    if (!termos.length) return [];
    return indice
      .map(i => {
        if (!termos.every(t => i.n.includes(t))) return null;
        let nota = 0;
        for (const t of termos) {
          if (i.nt.startsWith(t)) nota += 8;
          else if (new RegExp('\\b' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).test(i.nt)) nota += 5;
          else if (i.nt.includes(t)) nota += 3;
          else nota += 1;
        }
        return { i, nota };
      })
      .filter(Boolean)
      .sort((a, b) => b.nota - a.nota || a.i.t.length - b.i.t.length)
      .slice(0, LIMITE)
      .map(r => r.i);
  }

  /* Trecho do conteúdo em volta da primeira ocorrência, com o termo destacado. */
  function trecho(item, termos) {
    const bruto = item.c, normal = semAcento(bruto);
    let pos = -1;
    for (const t of termos) { const p = normal.indexOf(t); if (p >= 0 && (pos < 0 || p < pos)) pos = p; }
    if (pos < 0) return esc(bruto.slice(0, 110)) + (bruto.length > 110 ? '…' : '');
    const ini = Math.max(0, pos - 45), fim = Math.min(bruto.length, pos + 85);
    let texto = esc(bruto.slice(ini, fim));
    for (const t of termos) {
      const re = new RegExp('(' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').split('').join('[\\u0300-\\u036f]?') + ')', 'gi');
      texto = texto.replace(re, '<mark>$1</mark>');
    }
    return (ini > 0 ? '…' : '') + texto + (fim < bruto.length ? '…' : '');
  }

  function ligar(campo) {
    const caixa = campo.closest('.busca');
    if (!caixa) return;
    caixa.classList.add('busca-ativa');

    const painel = document.createElement('div');
    painel.className = 'resultados';
    painel.setAttribute('role', 'listbox');
    painel.hidden = true;
    caixa.appendChild(painel);

    let resultados = [], marcado = -1;

    const fechar = () => { painel.hidden = true; marcado = -1; };

    function desenhar(termo) {
      const termos = semAcento(termo).split(/\s+/).filter(Boolean);
      if (!resultados.length) {
        painel.innerHTML = `<p class="sem-resultado">Nada encontrado para <strong>${esc(termo)}</strong>.</p>`;
      } else {
        painel.innerHTML = resultados.map((r, k) => `
          <a class="resultado" role="option" href="${esc(r.u)}" data-k="${k}">
            <span class="r-titulo">${esc(r.t)}</span>
            <span class="r-onde">${esc(r.p)}</span>
            <span class="r-trecho">${trecho(r, termos)}</span>
          </a>`).join('');
      }
      painel.hidden = false;
      marcado = -1;
    }

    function marcar(n) {
      const itens = painel.querySelectorAll('.resultado');
      if (!itens.length) return;
      marcado = (n + itens.length) % itens.length;
      itens.forEach((el, k) => el.classList.toggle('marcado', k === marcado));
      itens[marcado].scrollIntoView({ block: 'nearest' });
    }

    async function buscar() {
      const termo = campo.value.trim();
      if (termo.length < 2) return fechar();
      await carregar();
      resultados = procurar(termo);
      desenhar(termo);
    }

    let atraso;
    campo.addEventListener('input', () => { clearTimeout(atraso); atraso = setTimeout(buscar, 120); });
    campo.addEventListener('focus', () => { carregar(); if (campo.value.trim().length >= 2) buscar(); });
    campo.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown') { e.preventDefault(); marcar(marcado + 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); marcar(marcado - 1); }
      else if (e.key === 'Escape') { fechar(); campo.blur(); }
      else if (e.key === 'Enter') {
        e.preventDefault();
        const alvo = painel.querySelector(marcado >= 0 ? `.resultado[data-k="${marcado}"]` : '.resultado');
        if (alvo) irPara(alvo.getAttribute('href'));
      }
    });

    painel.addEventListener('click', e => {
      const alvo = e.target.closest('.resultado');
      if (!alvo) return;
      e.preventDefault();
      irPara(alvo.getAttribute('href'));
    });

    function irPara(url) {
      fechar();
      campo.blur();
      const [caminho, ancora] = url.split('#');
      const aqui = location.pathname.replace(/\.html$/, '').replace(/\/$/, '') || '/';
      const la = caminho.replace(/\/$/, '') || '/';
      if (la === aqui && ancora) {
        location.hash = ancora;
        const el = document.getElementById(ancora);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        location.href = url;
      }
    }

    document.addEventListener('click', e => { if (!caixa.contains(e.target)) fechar(); });
  }

  document.querySelectorAll('.topo .busca input[type="search"]').forEach(ligar);
})();
