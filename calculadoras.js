/* =============================================================================
   Sala Elétrica — calculadoras abertas
   Toda a conta roda no navegador; nada do que o usuário digita sai daqui.

   Fontes dos dados:
   - Capacidade de condução (cobre): NBR 5410:2004, tabelas 36 (PVC) e 37 (EPR/XLPE)
   - Fatores de temperatura: NBR 5410, tabela 40
   - Fatores de agrupamento: NBR 5410, tabela 42
   - Seções mínimas: NBR 5410, tabela 47
   - Limites de queda de tensão: NBR 5410, 6.2.7
   - Taxa de ocupação de eletrodutos: NBR 5410, 6.2.11.1.6
   ========================================================================== */
(function (raiz) {
  'use strict';

  /* ------------------------------------------------------------ utilidades */
  const R3 = Math.sqrt(3);
  const CV = 735.49875, HP = 745.69987, BTU_W = 0.29307107;

  function num(texto) {
    if (texto === undefined || texto === null) return NaN;
    let s = String(texto).trim().replace(/\s/g, '');
    if (s === '') return NaN;
    if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
    const v = Number(s);
    return Number.isFinite(v) ? v : NaN;
  }
  const ok = x => Number.isFinite(x);
  const pos = x => ok(x) && x > 0;
  function fmt(x, casas = 2) {
    if (!ok(x)) return '—';
    return x.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: casas });
  }
  function fmtFixo(x, casas = 2) {
    if (!ok(x)) return '—';
    return x.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });
  }
  const erro = texto => ({ situacao: { tipo: 'erro', texto } });
  const espera = texto => ({ situacao: { tipo: 'espera', texto } });

  /* Converte uma potência qualquer em potência aparente (VA) e ativa elétrica (W). */
  function potencias(valor, unidade, fp, rend) {
    const r = { P: NaN, S: NaN, mecanica: false };
    if (unidade === 'W' || unidade === 'kW') {
      r.P = unidade === 'kW' ? valor * 1000 : valor;
      r.S = r.P / fp;
    } else if (unidade === 'VA' || unidade === 'kVA') {
      r.S = unidade === 'kVA' ? valor * 1000 : valor;
      r.P = r.S * fp;
    } else {
      const Pm = valor * (unidade === 'cv' ? CV : HP);
      r.mecanica = true;
      r.Peixo = Pm;
      r.P = Pm / (rend / 100);
      r.S = r.P / fp;
    }
    r.Q = Math.sqrt(Math.max(r.S * r.S - r.P * r.P, 0));
    return r;
  }

  const UNIDADES_POT = [['W', 'W'], ['kW', 'kW'], ['VA', 'VA'], ['kVA', 'kVA'], ['cv', 'cv'], ['hp', 'hp']];
  const eMotor = v => v.unidade === 'cv' || v.unidade === 'hp';

  /* ----------------------------------------------------- tabelas NBR 5410 */
  const SECOES = [1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120, 150, 185, 240, 300];

  const AMPACIDADE = {
    pvc: {
      A1: { 2: [14.5, 19.5, 26, 34, 46, 61, 80, 99, 119, 151, 182, 210, 240, 273, 321, 367],
            3: [13.5, 18, 24, 31, 42, 56, 73, 89, 108, 136, 164, 188, 216, 245, 286, 328] },
      A2: { 2: [14, 18.5, 25, 32, 43, 57, 75, 92, 110, 139, 167, 192, 219, 248, 291, 334],
            3: [13, 17.5, 23, 29, 39, 52, 68, 83, 99, 125, 150, 172, 196, 223, 261, 298] },
      B1: { 2: [17.5, 24, 32, 41, 57, 76, 101, 125, 151, 192, 232, 269, 309, 353, 415, 477],
            3: [15.5, 21, 28, 36, 50, 68, 89, 110, 134, 171, 207, 239, 275, 314, 370, 426] },
      B2: { 2: [16.5, 23, 30, 38, 52, 69, 90, 111, 133, 168, 201, 232, 258, 294, 344, 394],
            3: [15, 20, 27, 34, 46, 62, 80, 99, 118, 149, 179, 206, 225, 255, 297, 339] },
      C:  { 2: [19.5, 27, 36, 46, 63, 85, 112, 138, 168, 213, 258, 299, 344, 392, 461, 530],
            3: [17.5, 24, 32, 41, 57, 76, 96, 119, 144, 184, 223, 259, 299, 341, 403, 464] },
      D:  { 2: [22, 29, 38, 47, 63, 81, 104, 125, 148, 183, 216, 246, 278, 312, 361, 408],
            3: [18, 24, 31, 39, 52, 67, 86, 103, 122, 151, 179, 203, 230, 258, 297, 336] }
    },
    epr: {
      A1: { 2: [19, 26, 35, 45, 61, 81, 106, 131, 158, 200, 241, 278, 318, 362, 424, 486],
            3: [17, 23, 31, 40, 54, 73, 95, 117, 141, 179, 216, 249, 285, 324, 380, 435] },
      A2: { 2: [18.5, 25, 33, 42, 57, 76, 99, 121, 145, 183, 220, 253, 290, 329, 386, 442],
            3: [16.5, 22, 30, 38, 51, 68, 89, 109, 130, 164, 197, 227, 259, 295, 346, 396] },
      B1: { 2: [23, 31, 42, 54, 75, 100, 133, 164, 198, 253, 306, 354, 407, 464, 546, 628],
            3: [20, 28, 37, 48, 66, 88, 117, 144, 175, 222, 269, 312, 358, 408, 481, 553] },
      B2: { 2: [22, 30, 40, 51, 69, 91, 119, 146, 175, 221, 265, 305, 334, 384, 459, 532],
            3: [19.5, 26, 35, 44, 60, 80, 105, 128, 154, 194, 233, 268, 300, 340, 398, 455] },
      C:  { 2: [24, 33, 45, 58, 80, 107, 138, 171, 209, 269, 328, 382, 441, 506, 599, 693],
            3: [22, 30, 40, 52, 71, 96, 119, 147, 179, 229, 278, 322, 371, 424, 500, 576] },
      D:  { 2: [26, 34, 44, 56, 73, 95, 121, 146, 173, 213, 252, 287, 324, 363, 419, 474],
            3: [22, 29, 37, 46, 61, 79, 101, 122, 144, 178, 211, 240, 271, 304, 351, 396] }
    }
  };

  const FCT = {
    pvc: { ar:   { 10: 1.22, 15: 1.17, 20: 1.12, 25: 1.06, 30: 1.00, 35: 0.94, 40: 0.87, 45: 0.79, 50: 0.71, 55: 0.61, 60: 0.50 },
           solo: { 10: 1.10, 15: 1.05, 20: 1.00, 25: 0.95, 30: 0.89, 35: 0.84, 40: 0.77, 45: 0.71, 50: 0.63, 55: 0.55, 60: 0.45 } },
    epr: { ar:   { 10: 1.15, 15: 1.12, 20: 1.08, 25: 1.04, 30: 1.00, 35: 0.96, 40: 0.91, 45: 0.87, 50: 0.82, 55: 0.76, 60: 0.71, 65: 0.65, 70: 0.58, 75: 0.50, 80: 0.41 },
           solo: { 10: 1.07, 15: 1.04, 20: 1.00, 25: 0.96, 30: 0.93, 35: 0.89, 40: 0.85, 45: 0.80, 50: 0.76, 55: 0.71, 60: 0.65, 65: 0.60, 70: 0.53, 75: 0.46, 80: 0.38 } }
  };

  /* Temperatura fora dos degraus de 5 °C usa o degrau acima: lado seguro. */
  function fatorTemperatura(isolacao, meio, t) {
    const tab = FCT[isolacao][meio];
    const degraus = Object.keys(tab).map(Number).sort((a, b) => a - b);
    if (t <= degraus[0]) return { fator: tab[degraus[0]], usado: degraus[0] };
    const d = degraus.find(x => x >= t);
    return d === undefined ? null : { fator: tab[d], usado: d };
  }

  /* Tabela 42. Na disposição em feixe, as colunas finais são faixas. */
  const FCA = {
    feixe:    { rotulo: 'Em feixe ou em conduto fechado', n: [1, 2, 3, 4, 5, 6, 7, 8, 9, 12, 16, 20],
                f: [1.00, 0.80, 0.70, 0.65, 0.60, 0.57, 0.54, 0.52, 0.50, 0.45, 0.41, 0.38] },
    parede:   { rotulo: 'Camada única sobre parede, piso ou bandeja não perfurada', n: [1, 2, 3, 4, 5, 6, 7, 8, 9],
                f: [1.00, 0.85, 0.79, 0.75, 0.73, 0.72, 0.72, 0.71, 0.70] },
    teto:     { rotulo: 'Camada única no teto', n: [1, 2, 3, 4, 5, 6, 7, 8, 9],
                f: [0.95, 0.81, 0.72, 0.68, 0.66, 0.64, 0.63, 0.62, 0.61] },
    perfurada:{ rotulo: 'Camada única em bandeja perfurada', n: [1, 2, 3, 4, 5, 6, 7, 8, 9],
                f: [1.00, 0.88, 0.82, 0.77, 0.75, 0.73, 0.73, 0.72, 0.72] },
    leito:    { rotulo: 'Camada única em leito ou suporte', n: [1, 2, 3, 4, 5, 6, 7, 8, 9],
                f: [1.00, 0.87, 0.82, 0.80, 0.80, 0.79, 0.79, 0.78, 0.78] }
  };

  function fatorAgrupamento(tipo, n) {
    const t = FCA[tipo];
    let i = t.n.length - 1;
    for (let k = 0; k < t.n.length; k++) {
      const proximo = t.n[k + 1];
      if (proximo === undefined || n < proximo) { i = k; break; }
    }
    return t.f[i];
  }

  const RHO20 = { cu: 0.017241, al: 0.028264 };  /* Ω·mm²/m a 20 °C */
  const ALFA = { cu: 0.00393, al: 0.00403 };
  const TMAX = { pvc: 70, epr: 90 };
  const resistividade = (mat, iso) => RHO20[mat] * (1 + ALFA[mat] * (TMAX[iso] - 20));

  /* Diâmetro externo típico de condutor isolado 750 V em PVC (mm). */
  const DIAM_750 = { 1.5: 3.0, 2.5: 3.6, 4: 4.2, 6: 4.8, 10: 6.1, 16: 7.3, 25: 8.9, 35: 10.2,
                     50: 12.2, 70: 14.1, 95: 16.2, 120: 18.0, 150: 20.1, 185: 22.4, 240: 25.6 };

  const CORRENTES_NOMINAIS = [6, 10, 16, 20, 25, 32, 40, 50, 63, 70, 80, 100, 125, 160, 200,
                              225, 250, 320, 400, 500, 630, 800, 1000, 1250, 1600];

  const TRAFOS = [15, 30, 45, 75, 112.5, 150, 225, 300, 500, 750, 1000, 1500, 2000, 2500, 3000];

  const opSecoes = SECOES.map(s => [String(s), fmt(s, 1) + ' mm²']);
  const METODOS = [
    ['A1', 'A1 — condutores isolados em eletroduto em parede termicamente isolante'],
    ['A2', 'A2 — cabo multipolar em eletroduto em parede termicamente isolante'],
    ['B1', 'B1 — condutores isolados em eletroduto sobre parede ou embutido em alvenaria'],
    ['B2', 'B2 — cabo multipolar em eletroduto sobre parede ou embutido em alvenaria'],
    ['C', 'C — cabos unipolares ou multipolares fixados diretamente em parede'],
    ['D', 'D — cabo em eletroduto enterrado no solo']
  ];

  /* ============================================================ calculadoras */
  const CALCULADORAS = [

    /* ------------------------------------------------------ FUNDAMENTOS */
    {
      id: 'lei-de-ohm', grupo: 'Fundamentos', titulo: 'Lei de Ohm e potência',
      resumo: 'Informe duas grandezas quaisquer — tensão, corrente, resistência ou potência — e obtenha as outras duas.',
      campos: [
        { id: 'V', rotulo: 'Tensão', unidade: 'V' },
        { id: 'I', rotulo: 'Corrente', unidade: 'A' },
        { id: 'R', rotulo: 'Resistência', unidade: 'Ω' },
        { id: 'P', rotulo: 'Potência', unidade: 'W' }
      ],
      calcular(v) {
        const dados = ['V', 'I', 'R', 'P'].filter(k => pos(v[k]));
        if (dados.length !== 2) return espera('Preencha exatamente dois dos quatro campos.');
        let { V, I, R, P } = v;
        const tem = k => dados.includes(k);
        if (tem('V') && tem('I')) { R = V / I; P = V * I; }
        else if (tem('V') && tem('R')) { I = V / R; P = V * V / R; }
        else if (tem('V') && tem('P')) { I = P / V; R = V * V / P; }
        else if (tem('I') && tem('R')) { V = I * R; P = I * I * R; }
        else if (tem('I') && tem('P')) { V = P / I; R = P / (I * I); }
        else { V = Math.sqrt(P * R); I = Math.sqrt(P / R); }
        const calc = ['V', 'I', 'R', 'P'].filter(k => !tem(k));
        const nomes = { V: ['Tensão', 'V'], I: ['Corrente', 'A'], R: ['Resistência', 'Ω'], P: ['Potência', 'W'] };
        const val = { V, I, R, P };
        return {
          principal: [nomes[calc[0]][0], fmt(val[calc[0]], 3), nomes[calc[0]][1]],
          linhas: [[nomes[calc[1]][0], fmt(val[calc[1]], 3) + ' ' + nomes[calc[1]][1]]]
        };
      },
      formula: '<p>V = R × I &nbsp;·&nbsp; P = V × I = R × I² = V² / R</p><p>Vale para circuitos em corrente contínua ou para cargas puramente resistivas em corrente alternada.</p>'
    },

    {
      id: 'conversao-de-potencia', grupo: 'Fundamentos', titulo: 'Conversão de potência',
      resumo: 'Converte entre potência ativa, aparente e mecânica — W, VA, cv e hp — com fator de potência e rendimento.',
      campos: [
        { id: 'valor', rotulo: 'Potência', padrao: '10' },
        { id: 'unidade', rotulo: 'Unidade', tipo: 'opcao', opcoes: UNIDADES_POT, padrao: 'kW' },
        { id: 'fp', rotulo: 'Fator de potência', padrao: '0,92' },
        { id: 'rend', rotulo: 'Rendimento do motor', unidade: '%', padrao: '90', visivel: eMotor,
          dica: 'Potência em cv ou hp é mecânica, no eixo. A potência elétrica absorvida é maior.' }
      ],
      calcular(v) {
        if (!pos(v.valor)) return espera('Informe a potência.');
        if (!(v.fp > 0 && v.fp <= 1)) return erro('O fator de potência deve estar entre 0 e 1.');
        if (eMotor(v) && !(v.rend > 0 && v.rend <= 100)) return erro('O rendimento deve estar entre 0 e 100 %.');
        const p = potencias(v.valor, v.unidade, v.fp, v.rend);
        const linhas = [
          ['Potência ativa', fmt(p.P / 1000, 3) + ' kW'],
          ['Potência reativa', fmt(p.Q / 1000, 3) + ' kVAr'],
          ['Equivalente em cv (elétrica)', fmt(p.P / CV, 2) + ' cv']
        ];
        if (p.mecanica) linhas.unshift(['Potência mecânica no eixo', fmt(p.Peixo / 1000, 3) + ' kW']);
        return { principal: ['Potência aparente', fmt(p.S / 1000, 3), 'kVA'], linhas };
      },
      formula: '<p>S = P / FP &nbsp;·&nbsp; Q = √(S² − P²)</p><p>1 cv = 735,5 W e 1 hp = 745,7 W, ambos mecânicos. Para motores, P elétrica = P eixo / η.</p>'
    },

    {
      id: 'corrente-de-projeto', grupo: 'Fundamentos', titulo: 'Corrente de projeto',
      resumo: 'Corrente absorvida pela carga a partir da potência, da tensão, do fator de potência e do sistema de ligação.',
      campos: [
        { id: 'sistema', rotulo: 'Sistema', tipo: 'opcao', padrao: 'tri',
          opcoes: [['mono', 'Monofásico (fase-neutro)'], ['bi', 'Bifásico (fase-fase)'], ['tri', 'Trifásico']] },
        { id: 'V', rotulo: 'Tensão', unidade: 'V', padrao: '380', dica: 'No trifásico e no bifásico, a tensão entre fases.' },
        { id: 'valor', rotulo: 'Potência', padrao: '15' },
        { id: 'unidade', rotulo: 'Unidade', tipo: 'opcao', opcoes: UNIDADES_POT, padrao: 'kW' },
        { id: 'fp', rotulo: 'Fator de potência', padrao: '0,92' },
        { id: 'rend', rotulo: 'Rendimento do motor', unidade: '%', padrao: '90', visivel: eMotor }
      ],
      calcular(v) {
        if (!pos(v.V) || !pos(v.valor)) return espera('Informe a tensão e a potência.');
        if (!(v.fp > 0 && v.fp <= 1)) return erro('O fator de potência deve estar entre 0 e 1.');
        if (eMotor(v) && !(v.rend > 0 && v.rend <= 100)) return erro('O rendimento deve estar entre 0 e 100 %.');
        const p = potencias(v.valor, v.unidade, v.fp, v.rend);
        const I = v.sistema === 'tri' ? p.S / (R3 * v.V) : p.S / v.V;
        return {
          principal: ['Corrente de projeto (Ib)', fmt(I, 2), 'A'],
          linhas: [['Potência ativa', fmt(p.P / 1000, 3) + ' kW'], ['Potência aparente', fmt(p.S / 1000, 3) + ' kVA']]
        };
      },
      formula: '<p>Monofásico e bifásico: I = S / V &nbsp;·&nbsp; Trifásico: I = S / (√3 × V)</p><p>Com S = P / FP. Para motores, P elétrica = P eixo / η.</p>'
    },

    {
      id: 'consumo-de-energia', grupo: 'Fundamentos', titulo: 'Consumo de energia',
      resumo: 'Energia consumida por um equipamento no dia, no mês e no ano, e o custo correspondente.',
      campos: [
        { id: 'P', rotulo: 'Potência do equipamento', unidade: 'W', padrao: '1500' },
        { id: 'q', rotulo: 'Quantidade', padrao: '1' },
        { id: 'h', rotulo: 'Uso por dia', unidade: 'h', padrao: '8' },
        { id: 'd', rotulo: 'Dias de uso no mês', padrao: '22' },
        { id: 'tarifa', rotulo: 'Tarifa', unidade: 'R$/kWh', dica: 'Opcional. Está na conta de energia, com impostos.' }
      ],
      calcular(v) {
        if (!pos(v.P) || !pos(v.q) || !pos(v.h) || !pos(v.d)) return espera('Informe potência, quantidade, horas e dias.');
        if (v.h > 24) return erro('O uso diário não pode passar de 24 horas.');
        if (v.d > 31) return erro('O mês tem no máximo 31 dias.');
        const dia = v.P * v.q * v.h / 1000, mes = dia * v.d;
        const linhas = [['Por dia de uso', fmt(dia, 2) + ' kWh'], ['Por ano', fmt(mes * 12, 1) + ' kWh']];
        if (pos(v.tarifa)) linhas.push(['Custo mensal', 'R$ ' + fmtFixo(mes * v.tarifa, 2)],
                                       ['Custo anual', 'R$ ' + fmtFixo(mes * 12 * v.tarifa, 2)]);
        return { principal: ['Consumo mensal', fmt(mes, 1), 'kWh'], linhas };
      },
      formula: '<p>E (kWh) = P (W) × quantidade × horas / 1000</p><p>Para motores e equipamentos com carga variável, use a potência média absorvida, não a nominal.</p>'
    },

    /* ------------------------------------------ CONDUTORES E PROTEÇÃO */
    {
      id: 'secao-de-condutor', grupo: 'Condutores e proteção', titulo: 'Seção de condutor',
      norma: 'NBR 5410',
      resumo: 'Seção mínima de condutor de cobre pelo critério da capacidade de condução de corrente, com correção de temperatura e de agrupamento.',
      campos: [
        { id: 'Ib', rotulo: 'Corrente de projeto (Ib)', unidade: 'A', padrao: '100' },
        { id: 'iso', rotulo: 'Isolação', tipo: 'opcao', padrao: 'pvc',
          opcoes: [['pvc', 'PVC — 70 °C'], ['epr', 'EPR ou XLPE — 90 °C']] },
        { id: 'metodo', rotulo: 'Método de instalação', tipo: 'opcao', opcoes: METODOS, padrao: 'B1', largo: true },
        { id: 'carregados', rotulo: 'Condutores carregados', tipo: 'opcao', padrao: '3',
          opcoes: [['2', '2 — monofásico ou bifásico'], ['3', '3 — trifásico']] },
        { id: 'tAr', rotulo: 'Temperatura ambiente', unidade: '°C', padrao: '30', visivel: v => v.metodo !== 'D' },
        { id: 'tSolo', rotulo: 'Temperatura do solo', unidade: '°C', padrao: '20', visivel: v => v.metodo === 'D' },
        { id: 'agrup', rotulo: 'Disposição dos circuitos', tipo: 'opcao', padrao: 'feixe', largo: true,
          opcoes: Object.entries(FCA).map(([k, t]) => [k, t.rotulo]), visivel: v => v.metodo !== 'D' },
        { id: 'n', rotulo: 'Circuitos agrupados', padrao: '1', visivel: v => v.metodo !== 'D',
          dica: 'Inclua o próprio circuito.' },
        { id: 'fcaD', rotulo: 'Fator de agrupamento', padrao: '1', visivel: v => v.metodo === 'D',
          dica: 'Cabos enterrados: use as tabelas 44 e 45 da NBR 5410, conforme o espaçamento.' },
        { id: 'uso', rotulo: 'Tipo de circuito', tipo: 'opcao', padrao: 'forca',
          opcoes: [['forca', 'Força — mínimo 2,5 mm²'], ['ilum', 'Iluminação — mínimo 1,5 mm²']] }
      ],
      calcular(v) {
        if (!pos(v.Ib)) return espera('Informe a corrente de projeto.');
        const solo = v.metodo === 'D';
        const t = solo ? v.tSolo : v.tAr;
        if (!ok(t)) return espera('Informe a temperatura.');
        const ft = fatorTemperatura(v.iso, solo ? 'solo' : 'ar', t);
        if (!ft) return erro('Temperatura acima do limite suportado por esta isolação.');
        let fca;
        if (solo) {
          if (!(v.fcaD > 0 && v.fcaD <= 1)) return erro('O fator de agrupamento deve estar entre 0 e 1.');
          fca = v.fcaD;
        } else {
          if (!(v.n >= 1) || !Number.isInteger(v.n)) return erro('O número de circuitos deve ser inteiro, a partir de 1.');
          fca = fatorAgrupamento(v.agrup, v.n);
        }
        const tabela = AMPACIDADE[v.iso][v.metodo][v.carregados];
        const minimo = v.uso === 'ilum' ? 1.5 : 2.5;
        const IzMin = v.Ib / (ft.fator * fca);
        const i = SECOES.findIndex((s, k) => s >= minimo && tabela[k] >= IzMin);
        if (i < 0) return erro('A corrente exige seção acima de 300 mm². Considere condutores em paralelo.');
        const Iz = tabela[i] * ft.fator * fca;
        const pelaMinima = SECOES[i] === minimo && tabela[SECOES.indexOf(minimo) - 1] >= IzMin;
        return {
          principal: ['Seção mínima', fmt(SECOES[i], 1), 'mm²'],
          linhas: [
            ['Capacidade tabelada', fmt(tabela[i], 1) + ' A'],
            ['Fator de temperatura', fmtFixo(ft.fator, 2) + (ft.usado !== t ? ` (degrau de ${ft.usado} °C)` : '')],
            ['Fator de agrupamento', fmtFixo(fca, 2)],
            ['Capacidade corrigida (Iz)', fmt(Iz, 1) + ' A'],
            ['Folga sobre Ib', fmt((Iz - v.Ib) / Iz * 100, 1) + ' %']
          ],
          situacao: { tipo: 'ok', texto: (pelaMinima ? 'Seção definida pelo mínimo da norma para o tipo de circuito. ' : '') +
            'Atende à capacidade de condução. Verifique também a queda de tensão e a proteção contra sobrecorrente e curto-circuito.' }
        };
      },
      formula: '<p>Iz necessária = Ib / (FCT × FCA). Escolhe-se a menor seção cuja capacidade tabelada supere esse valor, respeitado o mínimo da tabela 47.</p><p>Valores de capacidade para condutores de cobre (tabelas 36 e 37 da NBR 5410). Temperaturas fora dos degraus de 5 °C usam o degrau acima, a favor da segurança. Este é apenas um dos critérios de dimensionamento.</p>'
    },

    {
      id: 'queda-de-tensao', grupo: 'Condutores e proteção', titulo: 'Queda de tensão',
      norma: 'NBR 5410',
      resumo: 'Queda de tensão no trecho, considerando resistência na temperatura de operação e reatância do cabo, com a seção mínima para atender ao limite.',
      campos: [
        { id: 'sistema', rotulo: 'Sistema', tipo: 'opcao', padrao: 'tri',
          opcoes: [['mono', 'Monofásico ou bifásico (2 condutores)'], ['tri', 'Trifásico equilibrado']] },
        { id: 'V', rotulo: 'Tensão', unidade: 'V', padrao: '380', dica: 'Tensão entre os condutores do circuito.' },
        { id: 'I', rotulo: 'Corrente', unidade: 'A', padrao: '100' },
        { id: 'L', rotulo: 'Comprimento do trecho', unidade: 'm', padrao: '50', dica: 'Distância da origem à carga, só ida.' },
        { id: 'S', rotulo: 'Seção do condutor', tipo: 'opcao', opcoes: opSecoes, padrao: '35' },
        { id: 'mat', rotulo: 'Material', tipo: 'opcao', padrao: 'cu', opcoes: [['cu', 'Cobre'], ['al', 'Alumínio']] },
        { id: 'iso', rotulo: 'Isolação', tipo: 'opcao', padrao: 'pvc',
          opcoes: [['pvc', 'PVC — 70 °C'], ['epr', 'EPR ou XLPE — 90 °C']] },
        { id: 'fp', rotulo: 'Fator de potência', padrao: '0,92' },
        { id: 'X', rotulo: 'Reatância do cabo', unidade: 'Ω/km', padrao: '0,10',
          dica: 'Valor típico em baixa tensão. Confira no catálogo do fabricante.' },
        { id: 'lim', rotulo: 'Limite de referência', tipo: 'opcao', padrao: '4', largo: true,
          opcoes: [['4', '4 % — circuito terminal'],
                   ['5', '5 % — total, a partir do ponto de entrega em baixa tensão'],
                   ['7', '7 % — total, a partir do transformador ou gerador próprio']] }
      ],
      calcular(v) {
        if (!pos(v.V) || !pos(v.I) || !pos(v.L)) return espera('Informe tensão, corrente e comprimento.');
        if (!(v.fp > 0 && v.fp <= 1)) return erro('O fator de potência deve estar entre 0 e 1.');
        if (!(v.X >= 0)) return erro('A reatância não pode ser negativa.');
        const k = v.sistema === 'tri' ? R3 : 2;
        const rho = resistividade(v.mat, v.iso);
        const R = rho / v.S, X = v.X / 1000, sen = Math.sqrt(1 - v.fp * v.fp);
        const dV = k * v.L * v.I * (R * v.fp + X * sen);
        const pct = dV / v.V * 100, lim = Number(v.lim);

        /* Seção mínima: k·L·I·(ρ·cosφ/S + X·senφ) ≤ lim·V */
        const folga = lim / 100 * v.V / (k * v.L * v.I) - X * sen;
        let minima = '—';
        if (folga > 0) {
          const s = SECOES.find(x => x >= rho * v.fp / folga);
          minima = s ? fmt(s, 1) + ' mm²' : 'acima de 300 mm²';
        } else minima = 'inatingível só pela seção';

        return {
          principal: ['Queda de tensão', fmtFixo(pct, 2), '%'],
          linhas: [
            ['Queda em volts', fmt(dV, 2) + ' V'],
            ['Tensão na carga', fmt(v.V - dV, 1) + ' V'],
            ['Resistência a ' + TMAX[v.iso] + ' °C', fmt(R * 1000, 4) + ' Ω/km'],
            ['Seção mínima para ' + lim + ' %', minima]
          ],
          situacao: pct <= lim
            ? { tipo: 'ok', texto: `Dentro do limite de ${lim} %.` }
            : { tipo: 'alerta', texto: `Acima do limite de ${lim} %. Aumente a seção ou reduza o comprimento.` }
        };
      },
      formula: '<p>ΔV = k × L × I × (R cos φ + X sen φ), com k = 2 no monofásico e √3 no trifásico.</p><p>R na temperatura máxima da isolação: ρ₂₀ × [1 + α (θ − 20)], com ρ₂₀ = 0,017241 Ω·mm²/m (cobre) e 0,028264 (alumínio). Despreza o efeito pelicular, relevante apenas nas seções maiores. Os limites seguem o item 6.2.7 da NBR 5410.</p>'
    },

    {
      id: 'disjuntor', grupo: 'Condutores e proteção', titulo: 'Disjuntor e proteção',
      norma: 'NBR 5410',
      resumo: 'Corrente nominal do disjuntor coordenada com a carga e com o condutor, e a curva de disparo indicada para o tipo de carga.',
      campos: [
        { id: 'Ib', rotulo: 'Corrente de projeto (Ib)', unidade: 'A', padrao: '28' },
        { id: 'Iz', rotulo: 'Capacidade do condutor (Iz)', unidade: 'A', padrao: '36',
          dica: 'Já corrigida por temperatura e agrupamento. Use a calculadora de seção de condutor.' },
        { id: 'carga', rotulo: 'Tipo de carga', tipo: 'opcao', padrao: 'C', largo: true,
          opcoes: [['B', 'Resistiva — aquecimento, iluminação incandescente'],
                   ['C', 'Uso geral — tomadas, iluminação, cargas mistas'],
                   ['D', 'Alta corrente de partida — motores, transformadores']] },
        { id: 'tipo', rotulo: 'Norma do disjuntor', tipo: 'opcao', padrao: '60898', largo: true,
          opcoes: [['60898', 'IEC 60898 — uso residencial e predial'], ['60947', 'IEC 60947-2 — uso industrial']] }
      ],
      calcular(v) {
        if (!pos(v.Ib) || !pos(v.Iz)) return espera('Informe Ib e Iz.');
        if (v.Ib > v.Iz) return erro('Ib maior que Iz: o condutor não suporta a carga. Aumente a seção.');
        const In = CORRENTES_NOMINAIS.find(x => x >= v.Ib);
        if (!In) return erro('Corrente acima de 1600 A. Consulte o fabricante.');
        const k2 = v.tipo === '60898' ? 1.45 : 1.30;
        const I2 = k2 * In;
        const condA = In <= v.Iz, condB = I2 <= 1.45 * v.Iz;
        const faixa = { B: '3 a 5 × In', C: '5 a 10 × In', D: '10 a 20 × In' }[v.carga];
        const res = {
          principal: ['Disjuntor', 'Curva ' + v.carga + ' — ' + In, 'A'],
          linhas: [
            ['Ib ≤ In ≤ Iz', `${fmt(v.Ib, 1)} ≤ ${In} ≤ ${fmt(v.Iz, 1)} A — ` + (condA ? 'atende' : 'não atende')],
            ['I₂ ≤ 1,45 × Iz', `${fmt(I2, 1)} ≤ ${fmt(1.45 * v.Iz, 1)} A — ` + (condB ? 'atende' : 'não atende')],
            ['Disparo magnético', faixa]
          ]
        };
        res.situacao = condA && condB
          ? { tipo: 'ok', texto: 'Proteção contra sobrecarga coordenada. Verifique também a capacidade de interrupção e a proteção contra curto-circuito.' }
          : { tipo: 'alerta', texto: 'Não existe corrente nominal comercial entre Ib e Iz. Aumente a seção do condutor.' };
        return res;
      },
      formula: '<p>NBR 5410, 5.3.4: Ib ≤ In ≤ Iz e I₂ ≤ 1,45 × Iz, onde I₂ é a corrente de atuação convencional — 1,45 × In pela IEC 60898 e 1,30 × In pela IEC 60947-2.</p><p>Confira no catálogo as correntes nominais disponíveis em cada linha de produto.</p>'
    },

    {
      id: 'eletroduto', grupo: 'Condutores e proteção', titulo: 'Eletroduto',
      norma: 'NBR 5410',
      resumo: 'Diâmetro interno mínimo do eletroduto pela taxa de ocupação, ou verificação de um eletroduto já escolhido.',
      campos: [
        { id: 's1', rotulo: 'Seção — grupo 1', tipo: 'opcao', opcoes: opSecoes.slice(0, 15), padrao: '2.5' },
        { id: 'q1', rotulo: 'Quantidade', padrao: '3' },
        { id: 'd1', rotulo: 'Diâmetro externo', unidade: 'mm', dica: 'Opcional. Em branco, usa o valor típico.' },
        { id: 's2', rotulo: 'Seção — grupo 2', tipo: 'opcao', opcoes: opSecoes.slice(0, 15), padrao: '1.5' },
        { id: 'q2', rotulo: 'Quantidade', padrao: '0' },
        { id: 'd2', rotulo: 'Diâmetro externo', unidade: 'mm' },
        { id: 's3', rotulo: 'Seção — grupo 3', tipo: 'opcao', opcoes: opSecoes.slice(0, 15), padrao: '4' },
        { id: 'q3', rotulo: 'Quantidade', padrao: '0' },
        { id: 'd3', rotulo: 'Diâmetro externo', unidade: 'mm' },
        { id: 'Di', rotulo: 'Diâmetro interno do eletroduto', unidade: 'mm', largo: true,
          dica: 'Opcional, do catálogo do fabricante, para verificar a ocupação.' }
      ],
      calcular(v) {
        let area = 0, n = 0;
        for (const g of [1, 2, 3]) {
          const q = v['q' + g];
          if (!ok(q) || q === 0) continue;
          if (q < 0 || !Number.isInteger(q)) return erro('As quantidades devem ser inteiras.');
          const d = pos(v['d' + g]) ? v['d' + g] : DIAM_750[Number(v['s' + g])];
          area += q * Math.PI * d * d / 4;
          n += q;
        }
        if (n === 0) return espera('Informe ao menos um grupo de condutores.');
        const taxa = n === 1 ? 0.53 : n === 2 ? 0.31 : 0.40;
        const Dmin = Math.sqrt(4 * area / (Math.PI * taxa));
        const linhas = [
          ['Condutores', String(n)],
          ['Área ocupada pelos condutores', fmt(area, 1) + ' mm²'],
          ['Taxa máxima de ocupação', fmt(taxa * 100, 0) + ' %']
        ];
        let situacao;
        if (pos(v.Di)) {
          const occ = area / (Math.PI * v.Di * v.Di / 4) * 100;
          linhas.push(['Ocupação do eletroduto informado', fmt(occ, 1) + ' %']);
          situacao = occ <= taxa * 100
            ? { tipo: 'ok', texto: 'O eletroduto informado atende à taxa de ocupação.' }
            : { tipo: 'alerta', texto: 'O eletroduto informado excede a taxa de ocupação. Use um diâmetro maior.' };
        }
        return { principal: ['Diâmetro interno mínimo', fmt(Dmin, 1), 'mm'], linhas, situacao };
      },
      formula: '<p>Taxa máxima de ocupação: 53 % com um condutor, 31 % com dois e 40 % com três ou mais (NBR 5410, 6.2.11.1.6).</p><p>Diâmetros externos típicos de condutor isolado 750 V em PVC. Variam entre fabricantes: confirme no catálogo.</p>'
    },

    /* ------------------------------------------------------ EQUIPAMENTOS */
    {
      id: 'correcao-fator-de-potencia', grupo: 'Equipamentos', titulo: 'Correção do fator de potência',
      resumo: 'Potência reativa do banco de capacitores para levar a instalação ao fator de potência desejado.',
      campos: [
        { id: 'P', rotulo: 'Potência ativa', unidade: 'kW', padrao: '500' },
        { id: 'fp1', rotulo: 'Fator de potência atual', padrao: '0,80' },
        { id: 'fp2', rotulo: 'Fator de potência desejado', padrao: '0,95',
          dica: 'A referência regulatória da ANEEL é 0,92.' },
        { id: 'V', rotulo: 'Tensão trifásica', unidade: 'V', padrao: '380', dica: 'Opcional, para calcular as correntes.' }
      ],
      calcular(v) {
        if (!pos(v.P)) return espera('Informe a potência ativa.');
        if (!(v.fp1 > 0 && v.fp1 <= 1) || !(v.fp2 > 0 && v.fp2 <= 1)) return erro('Os fatores de potência devem estar entre 0 e 1.');
        if (v.fp2 <= v.fp1) return { situacao: { tipo: 'ok', texto: 'O fator de potência atual já é igual ou maior que o desejado.' } };
        const t1 = Math.tan(Math.acos(v.fp1)), t2 = Math.tan(Math.acos(v.fp2));
        const Qc = v.P * (t1 - t2), S1 = v.P / v.fp1, S2 = v.P / v.fp2;
        const linhas = [
          ['Reativo antes', fmt(v.P * t1, 1) + ' kVAr'],
          ['Reativo depois', fmt(v.P * t2, 1) + ' kVAr'],
          ['Potência aparente', fmt(S1, 1) + ' → ' + fmt(S2, 1) + ' kVA'],
          ['Redução da corrente', fmt((1 - S2 / S1) * 100, 1) + ' %']
        ];
        if (pos(v.V)) linhas.push(['Corrente', fmt(S1 * 1000 / (R3 * v.V), 0) + ' → ' + fmt(S2 * 1000 / (R3 * v.V), 0) + ' A']);
        return { principal: ['Banco de capacitores', fmt(Qc, 1), 'kVAr'], linhas,
                 situacao: { tipo: 'ok', texto: 'Adote o valor comercial imediatamente superior e avalie a presença de harmônicas antes de especificar o banco.' } };
      },
      formula: '<p>Qc = P × (tg φ₁ − tg φ₂), com φ = arccos(FP).</p>'
    },

    {
      id: 'transformador', grupo: 'Equipamentos', titulo: 'Transformador',
      resumo: 'Potência nominal padronizada do transformador a partir da demanda, com reserva, e as correntes nominais nos dois lados.',
      campos: [
        { id: 'D', rotulo: 'Demanda', padrao: '420' },
        { id: 'un', rotulo: 'Unidade', tipo: 'opcao', padrao: 'kVA', opcoes: [['kVA', 'kVA'], ['kW', 'kW']] },
        { id: 'fp', rotulo: 'Fator de potência', padrao: '0,92', visivel: v => v.un === 'kW' },
        { id: 'res', rotulo: 'Reserva para expansão', unidade: '%', padrao: '20' },
        { id: 'Vp', rotulo: 'Tensão primária', unidade: 'kV', padrao: '13,8' },
        { id: 'Vs', rotulo: 'Tensão secundária', unidade: 'V', padrao: '380' }
      ],
      calcular(v) {
        if (!pos(v.D) || !pos(v.Vp) || !pos(v.Vs)) return espera('Informe a demanda e as tensões.');
        if (v.un === 'kW' && !(v.fp > 0 && v.fp <= 1)) return erro('O fator de potência deve estar entre 0 e 1.');
        if (!(v.res >= 0)) return erro('A reserva não pode ser negativa.');
        const S = (v.un === 'kW' ? v.D / v.fp : v.D) * (1 + v.res / 100);
        const Sn = TRAFOS.find(x => x >= S);
        if (!Sn) return erro('Acima de 3.000 kVA: considere dividir a carga em mais de um transformador.');
        return {
          principal: ['Potência nominal', fmt(Sn, 1), 'kVA'],
          linhas: [
            ['Potência necessária', fmt(S, 1) + ' kVA'],
            ['Carregamento previsto', fmt(S / Sn * 100, 1) + ' %'],
            ['Corrente nominal primária', fmt(Sn / (R3 * v.Vp), 2) + ' A'],
            ['Corrente nominal secundária', fmt(Sn * 1000 / (R3 * v.Vs), 1) + ' A']
          ]
        };
      },
      formula: '<p>S necessária = demanda × (1 + reserva). In = Sn / (√3 × V).</p><p>Potências padronizadas usuais: 15 a 3.000 kVA. Confirme a disponibilidade com o fabricante.</p>'
    },

    {
      id: 'ar-condicionado', grupo: 'Equipamentos', titulo: 'Ar-condicionado',
      resumo: 'Potência elétrica e corrente de um aparelho a partir da capacidade de refrigeração em BTU/h.',
      campos: [
        { id: 'btu', rotulo: 'Capacidade', unidade: 'BTU/h', padrao: '12000' },
        { id: 'cop', rotulo: 'Coeficiente de eficiência', unidade: 'W/W', padrao: '3,2',
          dica: 'Na etiqueta do Inmetro. Se ela informar a potência elétrica, prefira esse valor.' },
        { id: 'fp', rotulo: 'Fator de potência', padrao: '0,95' },
        { id: 'sistema', rotulo: 'Sistema', tipo: 'opcao', padrao: 'bi',
          opcoes: [['mono', 'Monofásico'], ['bi', 'Bifásico'], ['tri', 'Trifásico']] },
        { id: 'V', rotulo: 'Tensão', unidade: 'V', padrao: '220' }
      ],
      calcular(v) {
        if (!pos(v.btu) || !pos(v.cop) || !pos(v.V)) return espera('Informe capacidade, eficiência e tensão.');
        if (!(v.fp > 0 && v.fp <= 1)) return erro('O fator de potência deve estar entre 0 e 1.');
        const Qt = v.btu * BTU_W, P = Qt / v.cop, S = P / v.fp;
        const I = v.sistema === 'tri' ? S / (R3 * v.V) : S / v.V;
        return {
          principal: ['Potência elétrica', fmt(P, 0), 'W'],
          linhas: [
            ['Capacidade térmica', fmt(Qt / 1000, 2) + ' kW (' + fmt(v.btu / 12000, 2) + ' TR)'],
            ['Potência aparente', fmt(S, 0) + ' VA'],
            ['Corrente', fmt(I, 2) + ' A']
          ]
        };
      },
      formula: '<p>1 BTU/h = 0,29307 W térmicos; 12.000 BTU/h = 1 TR.</p><p>P elétrica = capacidade térmica / coeficiente de eficiência. Estimativa: a potência de placa do fabricante sempre prevalece.</p>'
    },

    /* ----------------------------------------------------------- PROJETO */
    {
      id: 'iluminacao', grupo: 'Projeto', titulo: 'Iluminação',
      norma: 'Método dos lúmens',
      resumo: 'Quantidade de luminárias para atingir a iluminância média desejada em um ambiente retangular.',
      campos: [
        { id: 'C', rotulo: 'Comprimento', unidade: 'm', padrao: '20' },
        { id: 'Lg', rotulo: 'Largura', unidade: 'm', padrao: '10' },
        { id: 'h', rotulo: 'Altura útil', unidade: 'm', padrao: '3',
          dica: 'Da luminária ao plano de trabalho.' },
        { id: 'E', rotulo: 'Iluminância desejada', unidade: 'lux', padrao: '500',
          dica: 'Conforme a tarefa, pela NBR ISO/CIE 8995-1.' },
        { id: 'fluxo', rotulo: 'Fluxo por luminária', unidade: 'lm', padrao: '4000' },
        { id: 'u', rotulo: 'Fator de utilização', padrao: '0,60',
          dica: 'Da tabela fotométrica da luminária, para o índice do local.' },
        { id: 'fm', rotulo: 'Fator de manutenção', padrao: '0,80' }
      ],
      calcular(v) {
        if (![v.C, v.Lg, v.h, v.E, v.fluxo].every(pos)) return espera('Preencha as dimensões, a iluminância e o fluxo.');
        if (!(v.u > 0 && v.u <= 1) || !(v.fm > 0 && v.fm <= 1)) return erro('Os fatores devem estar entre 0 e 1.');
        const A = v.C * v.Lg, K = A / (v.h * (v.C + v.Lg));
        const N = Math.ceil(v.E * A / (v.fluxo * v.u * v.fm));
        return {
          principal: ['Luminárias', String(N), ''],
          linhas: [
            ['Área', fmt(A, 1) + ' m²'],
            ['Índice do local (K)', fmtFixo(K, 2)],
            ['Iluminância média resultante', fmt(N * v.fluxo * v.u * v.fm / A, 0) + ' lux']
          ],
          situacao: { tipo: 'ok', texto: 'Use o índice do local para ler o fator de utilização na tabela do fabricante e recalcule, se necessário. Distribua as luminárias de forma uniforme.' }
        };
      },
      formula: '<p>N = E × A / (Φ × u × FM) &nbsp;·&nbsp; K = C × L / [h × (C + L)]</p>'
    },

    {
      id: 'geometria', grupo: 'Projeto', titulo: 'Geometria',
      resumo: 'Área, perímetro e volume de ambientes e trechos, para estimativa de carga e de quantitativo de material.',
      campos: [
        { id: 'forma', rotulo: 'Forma', tipo: 'opcao', padrao: 'ret', largo: true,
          opcoes: [['ret', 'Retângulo — área e perímetro'], ['circ', 'Círculo — área e circunferência'], ['vol', 'Volume de um ambiente']] },
        { id: 'a', rotulo: 'Comprimento', unidade: 'm', padrao: '12', visivel: v => v.forma !== 'circ' },
        { id: 'b', rotulo: 'Largura', unidade: 'm', padrao: '8', visivel: v => v.forma !== 'circ' },
        { id: 'c', rotulo: 'Altura', unidade: 'm', padrao: '3', visivel: v => v.forma === 'vol' },
        { id: 'd', rotulo: 'Diâmetro', unidade: 'm', padrao: '5', visivel: v => v.forma === 'circ' }
      ],
      calcular(v) {
        if (v.forma === 'circ') {
          if (!pos(v.d)) return espera('Informe o diâmetro.');
          return { principal: ['Área', fmt(Math.PI * v.d * v.d / 4, 2), 'm²'],
                   linhas: [['Circunferência', fmt(Math.PI * v.d, 2) + ' m']] };
        }
        if (!pos(v.a) || !pos(v.b)) return espera('Informe comprimento e largura.');
        if (v.forma === 'ret') return {
          principal: ['Área', fmt(v.a * v.b, 2), 'm²'],
          linhas: [['Perímetro', fmt(2 * (v.a + v.b), 2) + ' m'], ['Diagonal', fmt(Math.hypot(v.a, v.b), 2) + ' m']]
        };
        if (!pos(v.c)) return espera('Informe a altura.');
        return {
          principal: ['Volume', fmt(v.a * v.b * v.c, 2), 'm³'],
          linhas: [['Área de piso', fmt(v.a * v.b, 2) + ' m²'], ['Área das paredes', fmt(2 * (v.a + v.b) * v.c, 2) + ' m²']]
        };
      },
      formula: '<p>Retângulo: A = a × b · Círculo: A = π d² / 4 · Volume: V = a × b × h</p>'
    }
  ];


  /* ================================================================ tabelas */
  const COMERCIAIS = [1, 1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120, 150, 185, 240, 300, 400, 500, 630];
  const proxima = a => {
    if (a < 1) return '—';
    const c = COMERCIAIS.reduce((m, x) => Math.abs(x - a) < Math.abs(m - a) ? x : m);
    return fmt(c, 1);
  };
  /* AWG: d = 0,127 mm × 92^((36−n)/39). 4/0 = −3, 3/0 = −2, 2/0 = −1, 1/0 = 0. */
  const diamAWG = n => 0.127 * Math.pow(92, (36 - n) / 39);
  const nomeAWG = n => n <= 0 ? `${1 - n}/0` : String(n);
  const linhasAWG = [];
  for (let n = -3; n <= 40; n++) {
    const d = diamAWG(n), a = Math.PI * d * d / 4;
    linhasAWG.push([nomeAWG(n), fmtFixo(d, 3), a >= 1 ? fmtFixo(a, 2) : fmtFixo(a, 4), proxima(a)]);
  }
  const MM2_POR_KCMIL = 0.5067075;
  const linhasMCM = [250, 300, 350, 400, 500, 600, 700, 750, 800, 900, 1000]
    .map(k => [fmt(k, 0), fmtFixo(k * MM2_POR_KCMIL, 1), proxima(k * MM2_POR_KCMIL)]);

  /* Corrente estimada de motor trifásico, com premissas explícitas. */
  const FP_MOTOR = 0.85, REND_MOTOR = 0.88;
  const linhasMotor = [1, 2, 3, 5, 7.5, 10, 15, 20, 25, 30, 40, 50, 60, 75, 100, 125, 150, 200].map(cv => {
    const P = cv * CV / REND_MOTOR;
    const I = V => fmt(P / (FP_MOTOR * R3 * V), 1);
    return [fmt(cv, 1) + ' cv', fmt(cv * CV / 1000, 1), I(220), I(380), I(440)];
  });

  const linhasRotacao = [2, 4, 6, 8, 10, 12].map(p =>
    [String(p), fmt(120 * 60 / p, 0), fmt(120 * 50 / p, 0)]);


  const TABELAS = [
    {
      id: 'tabela-bitolas', grupo: 'Tabelas', titulo: 'AWG, MCM e mm²',
      resumo: 'Equivalência entre as bitolas americanas e a seção em milímetros quadrados, para leitura de catálogos e projetos importados.',
      busca: true,
      blocos: [
        { titulo: 'Bitolas AWG', colunas: ['AWG', 'Diâmetro (mm)', 'Seção (mm²)', 'Seção comercial próxima'], linhas: linhasAWG },
        { titulo: 'Bitolas MCM (kcmil)', colunas: ['MCM', 'Seção (mm²)', 'Seção comercial próxima'], linhas: linhasMCM }
      ],
      nota: 'Valores calculados: d = 0,127 mm × 92^((36 − n)/39) e 1 kcmil = 0,50671 mm². A coluna de seção comercial é a bitola métrica mais próxima em área — serve para leitura, não substitui o dimensionamento: a capacidade de condução precisa ser verificada para a seção efetivamente adotada.'
    },
    {
      id: 'tabela-unidades', grupo: 'Tabelas', titulo: 'Conversão de unidades',
      resumo: 'As conversões que mais aparecem em dado de placa, catálogo de fornecedor e documento importado.',
      busca: true,
      blocos: [
        { titulo: 'Potência', colunas: ['Unidade', 'Equivale a'], linhas: [
          ['1 cv', '735,5 W'], ['1 hp', '745,7 W'], ['1 cv', '0,9863 hp'], ['1 hp', '1,0139 cv'],
          ['1 kW', '1,3596 cv'], ['1 kW', '1,3410 hp'],
          ['1 TR (tonelada de refrigeração)', '3.516,85 W'], ['1 BTU/h', '0,29307 W'], ['12.000 BTU/h', '1 TR']] },
        { titulo: 'Energia', colunas: ['Unidade', 'Equivale a'], linhas: [
          ['1 kWh', '3,6 MJ'], ['1 BTU', '1.055,06 J'], ['1 kcal', '4.186,8 J'], ['1 kWh', '859,8 kcal']] },
        { titulo: 'Pressão', colunas: ['Unidade', 'Equivale a'], linhas: [
          ['1 bar', '14,5038 psi'], ['1 psi', '0,068948 bar'], ['1 kgf/cm²', '0,980665 bar'],
          ['1 kgf/cm²', '14,2233 psi'], ['1 atm', '1,01325 bar'], ['1 mca (metro de coluna d\u2019água)', '0,0980665 bar']] },
        { titulo: 'Vazão', colunas: ['Unidade', 'Equivale a'], linhas: [
          ['1 m³/h', '0,5886 cfm'], ['1 cfm', '1,6990 m³/h'], ['1 cfm', '28,317 L/min'], ['1 L/s', '3,6 m³/h']] },
        { titulo: 'Comprimento e volume', colunas: ['Unidade', 'Equivale a'], linhas: [
          ['1 pol', '25,4 mm'], ['1 m', '39,370 pol'], ['1 pé', '0,3048 m'], ['1 milha', '1.609,34 m'],
          ['1 m³', '1.000 L'], ['1 ft³', '28,3168 L']] },
        { titulo: 'Massa e torque', colunas: ['Unidade', 'Equivale a'], linhas: [
          ['1 lb', '0,45359 kg'], ['1 kg', '2,2046 lb'], ['1 kgf·m', '9,80665 N·m'], ['1 lbf·ft', '1,3558 N·m']] }
      ]
    },
    {
      id: 'tabela-rotacao', grupo: 'Tabelas', titulo: 'Rotação de motores',
      resumo: 'Rotação síncrona do motor de indução conforme o número de polos, em 60 Hz e em 50 Hz.',
      blocos: [{ titulo: 'Rotação síncrona', colunas: ['Polos', '60 Hz (rpm)', '50 Hz (rpm)'], linhas: linhasRotacao }],
      nota: 'n = 120 × f / número de polos. A rotação nominal em carga é menor que a síncrona por causa do escorregamento — em geral de 2 % a 5 %. Um motor de 4 polos em 60 Hz, por exemplo, costuma girar entre 1.700 e 1.760 rpm. O valor de placa prevalece.'
    },
    {
      id: 'tabela-corrente-motores', grupo: 'Tabelas', titulo: 'Corrente de motores trifásicos',
      resumo: 'Ordem de grandeza da corrente nominal de motores de indução trifásicos, para conferência rápida.',
      blocos: [{ titulo: 'Corrente estimada a plena carga',
                 colunas: ['Potência', 'kW no eixo', '220 V (A)', '380 V (A)', '440 V (A)'], linhas: linhasMotor }],
      nota: 'Estimativa calculada com fator de potência 0,85 e rendimento 88 %, iguais para toda a faixa. Na prática os dois variam com a potência e com a linha do fabricante, sobretudo abaixo de 5 cv, onde a corrente real costuma ser maior que a da tabela. Use sempre os dados de placa no projeto; esta tabela serve para conferir se uma ordem de grandeza está coerente.'
    }
  ];

  const API = { CALCULADORAS, TABELAS, num, fmt, fatorTemperatura, fatorAgrupamento, AMPACIDADE, SECOES, resistividade };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else raiz.SalaCalc = API;
})(typeof window !== 'undefined' ? window : globalThis);
