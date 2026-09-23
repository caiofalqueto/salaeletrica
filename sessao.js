/* =============================================================================
   Sala Elétrica — estado de acesso no cabeçalho
   Troca o botão "Entrar" pelo menu do usuário em qualquer página do site.
   Carregado em todas as páginas; não faz nada se não houver sessão ativa.
   ========================================================================== */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://kahbgjwwqsejocmseegc.supabase.co';
const SUPABASE_KEY = 'sb_publishable_g2opUBjSqj6hXZ2HDsAMhQ_jfMVARqX';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function primeiroNome(sessao) {
  const u = sessao.user.user_metadata || {};
  const nome = u.full_name || u.name || '';
  return nome ? nome.split(' ')[0] : sessao.user.email.split('@')[0];
}

function desenharMenu(caixa, sessao) {
  const u = sessao.user.user_metadata || {};
  const nome = u.full_name || u.name || sessao.user.email;
  const foto = u.avatar_url;
  const iniciais = nome.trim().split(/\s+/).slice(0, 2).map(p => p[0]).join('').toUpperCase();

  caixa.innerHTML = `
    <div class="usuario-menu">
      <button class="usuario-botao" id="usuarioBotao" aria-haspopup="true" aria-expanded="false">
        ${foto ? `<img src="${esc(foto)}" alt="" referrerpolicy="no-referrer">`
               : `<span class="avatar-letras">${esc(iniciais)}</span>`}
        <span class="usuario-nome">${esc(primeiroNome(sessao))}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="M6 9l6 6 6-6" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
      <div class="usuario-lista" id="usuarioLista" hidden>
        <div class="usuario-cabeca">
          <strong>${esc(nome)}</strong>
          <span>${esc(sessao.user.email)}</span>
        </div>
        <a href="/app">Área de membros</a>
        <a href="/perfil">Meu perfil</a>
        <button type="button" id="sairBotao">Sair</button>
      </div>
    </div>`;

  const botao = caixa.querySelector('#usuarioBotao');
  const lista = caixa.querySelector('#usuarioLista');
  const alternar = abrir => {
    lista.hidden = !abrir;
    botao.setAttribute('aria-expanded', String(abrir));
  };
  botao.addEventListener('click', e => { e.stopPropagation(); alternar(lista.hidden); });
  document.addEventListener('click', e => { if (!caixa.contains(e.target)) alternar(false); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') alternar(false); });
  caixa.querySelector('#sairBotao').addEventListener('click', async () => {
    await supabase.auth.signOut();
    location.href = '/';
  });
}

async function aplicar() {
  const caixa = document.getElementById('acesso');
  if (!caixa) return;
  const { data: { session } } = await supabase.auth.getSession();
  if (session) desenharMenu(caixa, session);
  caixa.classList.add('acesso-pronto');
}

aplicar();
supabase.auth.onAuthStateChange(() => aplicar());
