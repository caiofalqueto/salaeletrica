// ==================== CUSTOM DROPDOWN ====================
// Mostra apenas a sigla no fechado; ao abrir, mostra opções completas
let _ddOpen=null;let _ddJustOpened=false;
function ddToggle(el,ev){if(ev){ev.stopPropagation();ev.preventDefault();}
const i=parseInt(el.getAttribute('data-i'));const field=el.getAttribute('data-field');const optsKey=el.getAttribute('data-opts');
const wasOpen=_ddOpen&&_ddOpen.i===i&&_ddOpen.field===field;
closeDD();
if(wasOpen)return;// clicar de novo no mesmo fecha
const opts=optsKey==='SIT'?SIT_OPTS:optsKey==='FUNC'?FUNC_OPTS:optsKey==='CLASSE'?CLASSE_OPTS:optsKey==='MOTOR'?MOTOR_OPTS:[];
const cur=el.querySelector('.dd-cur')?.textContent||'';
const menu=document.createElement('div');menu.className='dd-menu-float';menu.id='ddFloatMenu';
menu.innerHTML=opts.map(o=>'<div class="dd-opt'+(X(o[0])===cur?' sel':'')+'" data-i="'+i+'" data-field="'+field+'" data-val="'+X(o[0])+'">'+X(o[1])+'</div>').join('');
document.body.appendChild(menu);
const rect=el.getBoundingClientRect();
menu.style.position='fixed';menu.style.top=(rect.bottom+2)+'px';menu.style.left=rect.left+'px';menu.style.minWidth=Math.max(rect.width,220)+'px';menu.style.zIndex='2147483647';
const menuRect=menu.getBoundingClientRect();
if(menuRect.bottom>window.innerHeight-10)menu.style.top=Math.max(4,rect.top-menuRect.height-2)+'px';
if(menuRect.right>window.innerWidth-10)menu.style.left=Math.max(4,window.innerWidth-menuRect.width-10)+'px';
// Cada opção: pointerdown captura a seleção antes de qualquer blur/click
menu.querySelectorAll('.dd-opt').forEach(opt=>{
opt.addEventListener('pointerdown',function(e){e.preventDefault();e.stopPropagation();
const oi=parseInt(this.getAttribute('data-i'));const ofield=this.getAttribute('data-field');const oval=this.getAttribute('data-val');
ddApply(oi,ofield,oval)})});
_ddOpen={i,field};_ddJustOpened=true;setTimeout(()=>{_ddJustOpened=false},0)}
function closeDD(){const m=document.getElementById('ddFloatMenu');if(m)m.remove();_ddOpen=null}
// Inversor de frequência: rendimento 1,00 e cosφ 0,95, com prioridade sobre classificação/motor
const INV_REND=1.00;
const INV_FP=0.95;
function isInversor(m){return m&&m.funcionamento==='INV'}
// Aplica a regra do inversor por último, sobrepondo o que classe/motor tiverem definido
function aplicarRegraInversor(m){if(!m)return;if(isInversor(m)){m.rend=INV_REND;m.fp=INV_FP;
if(!isMotorClass(m)){const fp=m.fp||INV_FP;m.kva=fp>0?(m.kw||0)/fp:0}}}
function ddApply(i,field,val){if(isNaN(i)||!S.confirmed[i])return;S.confirmed[i][field]=val;closeDD();
if(field==='classe')S.confirmed[i].classeManual=true;// escolha do usuário prevalece
if(field==='classe'){
if(val==='M'||val==='MB'){if(!S.confirmed[i].motorTipo)S.confirmed[i].motorTipo='Weg W22';
const mrfp=getMotorRendFP(S.confirmed[i].kw,S.confirmed[i].motorTipo);
if(mrfp&&S.confirmed[i].motorTipo!=='Personalizado'){S.confirmed[i].rend=mrfp.rend;S.confirmed[i].fp=mrfp.fp}}
else{S.confirmed[i].rend=DEFAULT_REND_NAO_MOTOR;S.confirmed[i].fp=DEFAULT_FP_NAO_MOTOR;
S.confirmed[i].kva=S.confirmed[i].kw/(DEFAULT_FP_NAO_MOTOR);
S.confirmed[i].motorTipo=''}}
else if(field==='motorTipo'){if(val!=='Personalizado'){const mrfp=getMotorRendFP(S.confirmed[i].kw,val);if(mrfp){S.confirmed[i].rend=mrfp.rend;S.confirmed[i].fp=mrfp.fp}}}
else if(field==='funcionamento'&&val==='R'){
// Carga reserva: fator de demanda zero por padrão (continua editável)
if(!S.confirmed[i].fdManual)S.confirmed[i].fd=0;}
else if(field==='funcionamento'&&val!=='INV'){
// Saiu do inversor: restaura os valores conforme a classificação
const m=S.confirmed[i];
if(isMotorClass(m)&&m.motorTipo&&m.motorTipo!=='Personalizado'){const mrfp=getMotorRendFP(m.kw,m.motorTipo);if(mrfp){m.rend=mrfp.rend;m.fp=mrfp.fp}}
else if(!isMotorClass(m)){m.rend=DEFAULT_REND_NAO_MOTOR;m.fp=DEFAULT_FP_NAO_MOTOR;m.kva=m.fp>0?(m.kw||0)/m.fp:0}}
aplicarRegraInversor(S.confirmed[i]);
if(S.confirmed[i].isCustom)syncCustomLoads();
rConf()}
document.addEventListener('pointerdown',function(e){if(_ddJustOpened)return;if(e.target.closest&&e.target.closest('.dd-menu-float'))return;if(e.target.closest&&e.target.closest('.dd'))return;closeDD()});
function makeDD(i,field,opts,curVal,optsKey){
// SIT/FUNC/CLASSE: select NATIVO (seleção sempre confiável) + sobreposição que mostra só a sigla quando fechado.
// Aberto: o navegador mostra a descrição completa de cada opção. Fechado: a sobreposição cobre com a sigla.
if(optsKey==='SIT'||optsKey==='FUNC'||optsKey==='CLASSE'){
const o=opts.map(op=>'<option value="'+X(op[0])+'"'+(String(op[0])===String(curVal)?' selected':'')+'>'+X(op[1])+'</option>').join('');
return '<span class="dd-ovw"><select class="dd-native dd-ovs" data-field="'+field+'" onchange="ddApply('+i+',\''+field+'\',this.value)">'+o+'</select><span class="dd-ovsig">'+X(curVal)+'</span></span>'}
// MOTOR: select nativo (mostra o modelo do motor)
const o=opts.map(op=>'<option value="'+X(op[0])+'"'+(String(op[0])===String(curVal)?' selected':'')+'>'+X(op[1])+'</option>').join('');
return '<select class="dd-native" data-field="'+field+'" onchange="ddApply('+i+',\''+field+'\',this.value)">'+o+'</select>'}

// ==================== MOTOR TABLES (WEG) ====================
// Potências padronizadas WEG por modelo.
// Baixa tensão (W22 BT; de 590 kW em diante a linha é W50 BT):
const KW_PADRAO_BT=[0.12,0.18,0.25,0.37,0.55,0.75,1.1,1.5,2.2,3,3.7,4.5,5.5,7.5,9.2,11,15,18.5,22,30,37,45,55,75,90,110,132,150,185,220,260,300,330,370,400,440,480,515,560,
590,630,660,700,710,750,800,900,1600];
// Média tensão (W50 MT):
const KW_PADRAO_MT=[132,150,160,185,200,220,250,260,280,300,315,330,370,400,440,450,480,515,560,590,630,660,700,710,750,800,900,1000,1100,1600];
// Mantido por compatibilidade com o restante do código
const KW_PADRAO_MOTORES=KW_PADRAO_BT;
function listaKwPadrao(motorTipo){return motorTipo==='Weg W50'?KW_PADRAO_MT:KW_PADRAO_BT}
// A potência é padrão dentro da lista do modelo escolhido
function isKwPadrao(kw,motorTipo){return listaKwPadrao(motorTipo).some(p=>Math.abs(p-kw)<0.001)}
// Format kW value with standard decimal places (no trailing zeros, comma separator)
function fmtStd(n){if(n===0||n==null)return'0';const s=n.toFixed(2).replace(/\.?0+$/,'').replace('.',',');return s}
// Opções de dropdowns (SEMPRE EM CAIXA ALTA)
const SIT_OPTS=[['N','N - NOVA'],['E','E - EXISTENTE'],['D','D - A SER DESATIVADO'],['RP','RP - REPOTENCIADA'],['RL','RL - REALOCADO'],['P','P - PROVISÓRIO'],['T','T - TRANSFERIDA'],['F','F - FUTURA']];
const FUNC_OPTS=[['N','N - NORMAL'],['S','S - REVERSÍVEL'],['INV','INV - INVERSOR DE FREQUÊNCIA'],['SS','SS - SOFT START'],['O','O - CARGAS OCASIONAIS'],['RG','RG - CARGAS REGENERATIVAS'],['R','R - RESERVA']];
const CLASSE_OPTS=[['M','M - MOTOR DE INDUÇÃO COM ROTOR DE GAIOLA'],['P','P - PAINEL DE ÁREA DE PRODUÇÃO OU GRUPO DE MOTORES'],['I','I - TOMADAS E EQUIPAMENTOS AUXILIARES'],['MB','MB - MOTOR PARA BOMBA'],['C','C - BANCO DE CAPACITORES'],['TF','TF - TRANSFORMADOR']];
// Valores padrão quando a classificação NÃO é motor (diferente de M e MB)
const DEFAULT_REND_NAO_MOTOR=1.00;
const DEFAULT_FP_NAO_MOTOR=0.80;
// Número de espaços (colunas) por linha do diagrama de blocos
const BASE_COLS=8;
function isMotorClass(m){const c=m?.classe;return c==='M'||c==='MB'||c==='Motor'}// 'Motor' legado
function migrateClasse(m){if(isMotorClass(m))m.classe='M';else if(!isMotorClass(m))m.classe='P';return m}
const MOTOR_OPTS=[['Weg W22','W22 BT'],['Weg W50','W50 MT'],['Personalizado','Person.']];
const MOTOR_W22=[[0.12,0.660,0.66],[0.18,0.695,0.70],[0.25,0.734,0.66],[0.37,0.782,0.70],[0.55,0.790,0.66],[0.75,0.830,0.82],[1.10,0.840,0.80],[1.50,0.865,0.80],[2.20,0.875,0.80],[3.00,0.895,0.77],[3.70,0.895,0.77],[4.50,0.895,0.80],[5.50,0.910,0.77],[7.50,0.917,0.84],[9.20,0.924,0.84],[11.00,0.924,0.83],[15.00,0.930,0.81],[18.50,0.936,0.81],[22.00,0.936,0.81],[30.00,0.941,0.84],[37.00,0.945,0.84],[45.00,0.950,0.85],[55.00,0.954,0.85],[75.00,0.954,0.85],[90.00,0.954,0.85],[110.00,0.958,0.86],[132.00,0.962,0.86],[150.00,0.962,0.86],[185.00,0.962,0.86],[220.00,0.962,0.85],[260.00,0.962,0.87],[300.00,0.962,0.86],[330.00,0.962,0.86],[370.00,0.962,0.86],[400.00,0.966,0.86],[440.00,0.966,0.85],[480.00,0.966,0.85],[515.00,0.966,0.85],[560.00,0.966,0.85]];
const MOTOR_W50=[[132.00,0.927,0.75],[150.00,0.930,0.75],[160.00,0.930,0.75],[185.00,0.935,0.85],[200.00,0.935,0.85],[220.00,0.939,0.85],[250.00,0.943,0.85],[260.00,0.943,0.85],[280.00,0.944,0.83],[300.00,0.944,0.83],[315.00,0.950,0.85],[330.00,0.950,0.85],[370.00,0.952,0.85],[400.00,0.953,0.85],[440.00,0.957,0.84],[450.00,0.957,0.84],[480.00,0.957,0.83],[515.00,0.958,0.84],[560.00,0.958,0.84],[590.00,0.958,0.84],[630.00,0.959,0.84],[660.00,0.959,0.84],[700.00,0.959,0.84],[710.00,0.959,0.84],[750.00,0.959,0.84],[800.00,0.961,0.87],[900.00,0.963,0.87],[1000.00,0.964,0.87],[1100.00,0.965,0.86],[1600.00,0.965,0.86]];
function findMotor(kw,table){const entry=table.find(m=>m[0]>=kw);return entry||table[table.length-1]}
function getMotorRendFP(kw,tipo){if(tipo==='Weg W22'){const m=findMotor(kw,MOTOR_W22);return{rend:m[1],fp:m[2]}}if(tipo==='Weg W50'){const m=findMotor(kw,MOTOR_W50);return{rend:m[1],fp:m[2]}}return null}

// ==================== STATE ====================
// Ícone de lápis (SVG) para edição
const ICON_PENCIL='<svg width="11" height="11" viewBox="0 0 16 16" style="vertical-align:middle"><path d="M11.5 1.5l3 3L5 14l-3.5.5L2 11 11.5 1.5z" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/><path d="M10 3l3 3" stroke="currentColor" stroke-width="1.3"/></svg>';

const S={wb:null,sd:[],hd:[],rw:[],rwOrig:[],startRow:2,hdStart:1,hdEnd:1,tc:[],ts:'-',dc:'',df:'original',pc:'',extras:[],
vl:[{vs:480,vm:440},{vs:4160,vm:4000},{vs:13800,vm:13800}],
sel:new Set,selInit:false,fdRegras:null,ses:[],raw:[],abas:[],abasDisp:[],sdPorAba:{},rwAba:[],mp:[],confirmed:[],origMap:[],srcSig:null,
blocks:[],conns:[],customLoads:[],hiddenCols:new Set,currentSE:null};
let pi=0,sei=0,bki=0,dupSeq=0,dragIdxs=[],dragSrc=null,lastCI=-1,selUA=new Set,selCL=new Set,lastCL=-1,curPage=1;
const MX=8;

// ==================== NAV ====================
function go(p){curPage=p;for(let i=1;i<=MX;i++){document.getElementById('p'+i).classList.toggle('hd',i!==p);const e=document.getElementById('s'+i);e.classList.remove('a','d');if(i===p)e.classList.add('a');else if(i<p)e.classList.add('d')}
document.getElementById('navBack').style.visibility=p===1?'hidden':'visible';
document.getElementById('navNext').style.visibility=p===MX?'hidden':'visible';
document.getElementById('navLabel').textContent='Etapa '+p+' de '+MX;
if(p===2)iP2();if(p===3)iP5();if(p===4)iP3();if(p===5)rVL();if(p===6)iP6();if(p===7)iP7();if(p===8)iP8();window.scrollTo(0,0);agendarSalvamento()}
function goBack(){if(curPage>1)go(curPage-1)}
function goNext(){if(curPage<MX)go(curPage+1)}

// ==================== UTILS ====================
function cL(i){let s='',n=i;while(n>=0){s=String.fromCharCode(65+n%26)+s;n=Math.floor(n/26)-1}return s}
function X(s){const d=document.createElement('div');d.textContent=String(s??'');return d.innerHTML}
function trn(s,n){return s.length>n?s.substring(0,n)+'…':s}
function fmt(n,d=2){return n.toFixed(d).replace('.',',')}
function fmtKw(n){if(n===0||n==null)return'0';if(Number.isInteger(n))return String(n).replace('.',',');
// Preserva casas decimais até 4, mínimo 2
const s=n.toString();const dp=s.includes('.')?s.split('.')[1].length:0;
return n.toFixed(Math.max(2,Math.min(dp,4))).replace('.',',')}
function parseComma(s){return parseFloat(String(s).replace(',','.'))||0}
// Aceita fórmulas simples digitadas pelo usuário: =2+2, =3*3, =(10+5)/2, =12,5*2
// Avaliador próprio (sem eval) — entende + - * / parênteses e vírgula decimal.
function avaliarFormula(txt){
let s=String(txt).trim();
if(s[0]!=='=')return null;
s=s.slice(1).replace(/\s+/g,'').replace(/,/g,'.');
if(!s||!/^[0-9.+\-*/()]+$/.test(s))return NaN;
let i=0;
function expr(){let v=termo();
while(i<s.length&&(s[i]==='+'||s[i]==='-')){const op=s[i++];const d=termo();v=op==='+'?v+d:v-d}
return v}
function termo(){let v=fator();
while(i<s.length&&(s[i]==='*'||s[i]==='/')){const op=s[i++];const d=fator();
if(op==='*')v*=d;else{if(d===0)throw new Error('divisão por zero');v/=d}}
return v}
function fator(){
if(s[i]==='+'){i++;return fator()}
if(s[i]==='-'){i++;return -fator()}
if(s[i]==='('){i++;const v=expr();if(s[i]!==')')throw new Error('parêntese');i++;return v}
let ini=i;while(i<s.length&&/[0-9.]/.test(s[i]))i++;
if(ini===i)throw new Error('número esperado');
const n=parseFloat(s.slice(ini,i));
if(isNaN(n))throw new Error('número inválido');
return n}
try{const v=expr();if(i!==s.length)return NaN;return isFinite(v)?v:NaN}catch(e){return NaN}}
// Lê um campo numérico aceitando número comum ou fórmula iniciada por "="
function parseNum(txt,atual){
const s=String(txt).trim();
if(s[0]==='='){const v=avaliarFormula(s);
if(v===null||isNaN(v)){alert('Fórmula inválida: '+s+'\n\nUse apenas números e os sinais + - * / e parênteses.\nExemplos: =2+2   =3*3   =(10+5)/2');
return atual}
return v}
return parseComma(s)}
function getRawCell(rowIdx,colIdx){
const ws=S.wb.Sheets[S.rwAba?.[rowIdx]||abaAtualPv()];
if(!ws||rowIdx>=S.rwOrig.length)return String(S.rw[rowIdx]?.[colIdx]??'');
const exRow=S.rwOrig[rowIdx]+1;const addr=cL(colIdx)+exRow;const cell=ws[addr];
if(!cell)return'';if(cell.w!==undefined)return String(cell.w);return String(cell.v??'')}
function pP(raw){const s=String(raw).trim();if(s==='')return{v:0,c:true,r:''};
const n=parseFloat(s);if(!isNaN(n)&&/^[\d.]+$/.test(s))return{v:n,c:true,r:s};
const matches=[...s.matchAll(/[\d]+[.,]?[\d]*/g)];if(matches.length){
const nums=matches.map(m=>parseFloat(m[0].replace(',','.'))).filter(n=>!isNaN(n)&&n>0);
if(nums.length){return{v:Math.min(...nums),c:false,r:s}}}return{v:0,c:false,r:s}}
function fD(v,f){const s=String(v);if(f==='upper')return s.toUpperCase();if(f==='title')return s.replace(/\S+/g,w=>w.charAt(0).toUpperCase()+w.slice(1).toLowerCase());return s}
function getVisibleCols(){const ws=S.wb.Sheets[abaGridAtual()];if(!ws||!ws['!cols'])return null;const h=new Set;
ws['!cols'].forEach((c,i)=>{if(c&&c.hidden){
// Só oculta a coluna se ela estiver totalmente vazia — colunas ocultas COM dados são mantidas
let hasData=false;for(let r=0;r<S.sd.length;r++){const v=S.sd[r]?.[i];if(v!==''&&v!=null){hasData=true;break}}
if(!hasData)h.add(i)}});
return h.size?h:null}
// Extrai larguras das colunas do Excel (em unidades de caractere → px aproximado)
function getColWidths(){const ws=S.wb.Sheets[abaGridAtual()];if(!ws)return{};const widths={};
if(ws['!cols']){ws['!cols'].forEach((c,i)=>{if(c){let wch=c.wch||(c.wpx?c.wpx/7:null)||(c.width?c.width:null);if(wch){widths[i]=Math.max(24,Math.min(300,Math.round(wch*7)))}}})}
return widths}
function colWidthStyle(c,widths){const w=widths[c]||90;return 'style="min-width:'+Math.min(w,60)+'px;max-width:'+w+'px;width:'+w+'px;white-space:normal;word-break:break-word;overflow-wrap:break-word;vertical-align:top"'}
// Limita texto a 60 caracteres para prévias (Upload/Mapeamento)
function cap60(v){const s=String(v??'');return s.length>60?s.slice(0,60)+'…':s}

// ===== Visualizador estilo Excel =====
// Mapa de células mescladas: âncora (top-left) recebe colspan/rowspan; demais são cobertas (puladas)
function getMerges(){const ws=S.wb.Sheets[abaGridAtual()];const anchor={},covered=new Set();
if(ws&&ws['!merges']){ws['!merges'].forEach(m=>{const rs=m.e.r-m.s.r+1,cs=m.e.c-m.s.c+1;anchor[m.s.r+'_'+m.s.c]={rs,cs};
for(let r=m.s.r;r<=m.e.r;r++)for(let c=m.s.c;c<=m.e.c;c++){if(!(r===m.s.r&&c===m.s.c))covered.add(r+'_'+c)}})}
return{anchor,covered}}
// Valor formatado da célula (usa cell.w = texto como aparece no Excel; fallback para valor bruto)
function cellFmt(r,c,sd){const ws=S.wb.Sheets[abaGridAtual()];const addr=cL(c)+(r+1);const cell=ws?ws[addr]:null;
if(cell){if(cell.w!==undefined)return{v:String(cell.w),t:cell.t||'s'};if(cell.v!==undefined){let v=cell.v;if(v instanceof Date)v=v.toLocaleDateString('pt-BR');return{v:String(v),t:cell.t||'s'}}}
return{v:String((sd||S.sd)[r]?.[c]??''),t:'s'}}
// Constrói a grade estilo planilha no elemento alvo
function buildExcelGrid(targetId,aba){
_abaGrid=aba||null;
const sd=aba?(S.sdPorAba[aba]||[]):S.sd;
// Última coluna e última linha com dados reais (ignora área vazia além dos dados / fora de impressão)
let lastRow=-1,lastCol=-1;
for(let r=0;r<sd.length;r++){const row=sd[r];if(!row)continue;for(let c=0;c<row.length;c++){const v=row[c];if(v!==''&&v!=null){if(r>lastRow)lastRow=r;if(c>lastCol)lastCol=c}}}
if(lastRow<0){document.getElementById(targetId).innerHTML='<tbody><tr><td style="padding:8px;color:var(--mu);font-size:9px">Aba sem dados.</td></tr></tbody>';_abaGrid=null;return}
// Garante mostrar ao menos até a linha inicial de dados escolhida
const ts=Math.max(lastRow+1,S.startRow);const mc=lastCol+1;
const widths=getColWidths();const{anchor,covered}=getMerges();
// Colunas visíveis dentro da área ativa
const cols=[];for(let c=0;c<mc;c++){if(!S.hiddenCols.has(c))cols.push(c)}
let cg='<colgroup><col style="width:38px">';cols.forEach(c=>{const w=widths[c]||90;cg+='<col style="width:'+w+'px">'});cg+='</colgroup>';
let h=cg+'<thead><tr><th class="xl-corner"></th>';cols.forEach(c=>{h+='<th class="xl-colh">'+cL(c)+'</th>'});h+='</tr></thead><tbody>';
for(let r=0;r<ts;r++){const ex=r+1,isS=ex===S.startRow,isB=ex<S.startRow;
const isHdr=(S.hdStart&&S.hdEnd)?(ex>=S.hdStart&&ex<=S.hdEnd):false;
let rc='xl-row';if(isB&&!isHdr)rc+=' xl-before';if(isHdr)rc+=' xl-hdr';if(isS)rc+=' xl-start';
h+='<tr class="'+rc+'"><td class="xl-rowh'+(isS?' xl-rowh-start':'')+'">'+ex+'</td>';
cols.forEach(c=>{if(covered.has(r+'_'+c))return;const a=anchor[r+'_'+c];let sp='';if(a){if(a.rs>1)sp+=' rowspan="'+a.rs+'"';if(a.cs>1)sp+=' colspan="'+a.cs+'"'}
const cf=cellFmt(r,c,sd);const isNum=cf.t==='n';
h+='<td'+sp+' class="xl-cell'+(isNum?' xl-num':'')+'">'+X(cap60(cf.v))+'</td>'});
h+='</tr>'}
document.getElementById(targetId).innerHTML=h+'</tbody>';_abaGrid=null}

// ==================== P1 ====================
const uz=document.getElementById('uz');
uz.addEventListener('dragover',e=>{e.preventDefault();uz.classList.add('dv')});
uz.addEventListener('dragleave',()=>uz.classList.remove('dv'));
uz.addEventListener('drop',e=>{e.preventDefault();uz.classList.remove('dv');if(e.dataTransfer.files.length)pF(e.dataTransfer.files[0])});
function hF(e){if(e.target.files.length)pF(e.target.files[0])}

// ==================== PERSISTÊNCIA DO ESTUDO ====================
// O estudo é salvo automaticamente e fica atrelado ao arquivo Excel carregado
// (identificado por nome + tamanho + data de modificação).
const PREFIXO_SALVO='estudoDemanda:';
let _arquivoAtual=null,_saveTimer=null;
function impressaoArquivo(f){return f.name+'|'+f.size+'|'+(f.lastModified||0)}
function chaveSalva(){return _arquivoAtual?PREFIXO_SALVO+_arquivoAtual:null}
function temStorage(){try{localStorage.setItem('__t','1');localStorage.removeItem('__t');return true}catch(e){return false}}
// Monta o pacote do estudo (sem a planilha em si, que vem do arquivo)
function montarEstudo(){
return{v:1,ts:Date.now(),arquivo:_arquivoAtual,
cfg:{abas:S.abas,abasDisp:S.abasDisp,startRow:S.startRow,hdStart:S.hdStart,hdEnd:S.hdEnd,
tc:S.tc,ts:S.ts,dc:S.dc,df:S.df,pc:S.pc,extras:S.extras,hiddenCols:[...S.hiddenCols]},
selUids:[...S.sel].map(i=>S.raw[i]?.uid).filter(Boolean),selInit:S.selInit,fdRegras:S.fdRegras,
confirmed:S.confirmed,vl:S.vl,ses:S.ses,blocks:S.blocks,conns:S.conns,customLoads:S.customLoads,
currentSE:S.currentSE,etapa:curPage,
cont:{pi,sei,bki,dupSeq,uidSeq}}}
function salvarEstudo(){if(!_arquivoAtual||!temStorage())return;
try{localStorage.setItem(chaveSalva(),JSON.stringify(montarEstudo()));atualizarAvisoSalvo()}catch(e){console.warn('salvar:',e)}}
// Salvamento com atraso, para não pesar durante a digitação
function agendarSalvamento(){if(!_arquivoAtual)return;clearTimeout(_saveTimer);_saveTimer=setTimeout(salvarEstudo,600)}
function estudoSalvo(){if(!_arquivoAtual||!temStorage())return null;
try{const s=localStorage.getItem(chaveSalva());return s?JSON.parse(s):null}catch(e){return null}}
function aplicarEstudo(d){if(!d)return false;
try{
const c=d.cfg||{};
S.abasDisp=c.abasDisp||S.abasDisp;S.abas=(c.abas&&c.abas.length)?c.abas:S.abas;
S.startRow=c.startRow||2;S.hdStart=c.hdStart||1;S.hdEnd=c.hdEnd||1;
const sr=document.getElementById('sr');if(sr)sr.value=S.startRow;
const hs=document.getElementById('hrs');if(hs)hs.value=S.hdStart;
const he=document.getElementById('hre');if(he)he.value=S.hdEnd;
S.tc=c.tc||[];S.ts=c.ts||'-';S.dc=c.dc??'';S.df=c.df||'original';S.pc=c.pc??'';S.extras=c.extras||[];
S.sdPorAba={};S.abas.forEach(n=>{S.sdPorAba[n]=lerAba(n)});
rAbas();
S.hiddenCols=new Set(c.hiddenCols||[]);
oR();// recalcula S.hd, S.rw, S.rwOrig e a prévia
bM();S.origMap=S.raw.map(m=>({...m}));S.srcSig=srcSignature();
// Seleção da etapa 3 pelos identificadores
S.selInit=d.selInit===true;S.fdRegras=d.fdRegras||null;const su=new Set(d.selUids||[]);S.sel=new Set;S.raw.forEach((m,i)=>{if(su.has(m.uid))S.sel.add(i)});
// Estado das etapas seguintes
S.confirmed=d.confirmed||[];S.mp=S.confirmed;
S.vl=d.vl||S.vl;S.ses=d.ses||[];S.blocks=d.blocks||[];S.conns=d.conns||[];
S.customLoads=d.customLoads||[];S.currentSE=d.currentSE??null;
const k=d.cont||{};pi=k.pi||pi;sei=k.sei||sei;bki=k.bki||bki;dupSeq=k.dupSeq||dupSeq;uidSeq=k.uidSeq||uidSeq;
document.getElementById('pc').classList.remove('hd');
go(d.etapa&&d.etapa>=1&&d.etapa<=MX?d.etapa:1);
atualizarAvisoSalvo();
return true}catch(e){alert('Não foi possível retomar o estudo salvo: '+e.message);return false}}
// Recomeça do zero: apaga o estudo salvo deste arquivo e limpa tudo o que está em andamento
function descartarEstudo(){
if(!confirm('Começar um estudo novo?\n\nTudo o que foi feito com este arquivo (classificações, salas elétricas, painéis e diagramas) será apagado. Esta ação não pode ser desfeita.'))return;
try{if(chaveSalva())localStorage.removeItem(chaveSalva())}catch(e){}
_arquivoAtual=null;clearTimeout(_saveTimer);
location.reload()}
// Apaga TODOS os estudos guardados neste navegador
function limparTodosEstudos(){
if(!temStorage())return;
let n=0;
try{const chaves=[];
for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&k.indexOf(PREFIXO_SALVO)===0)chaves.push(k)}
chaves.forEach(k=>{localStorage.removeItem(k);n++})}catch(e){}
if(!n){alert('Não há estudos salvos neste navegador.');return}
alert(n+' estudo(s) apagado(s) deste navegador.');
_arquivoAtual=null;clearTimeout(_saveTimer);location.reload()}
function atualizarAvisoSalvo(){const el=document.getElementById('savedInfo');if(!el)return;
const d=estudoSalvo();
el.innerHTML=d
?'<span style="color:var(--ok)">✔ Estudo retomado — alterações salvas automaticamente</span>'
+' <button class="btn bsm" onclick="descartarEstudo()" style="margin-left:6px">↺ Começar novo estudo</button>'
:(_arquivoAtual?'<span style="color:var(--mu)">Alterações salvas automaticamente neste navegador.</span>':'');}
// Exportar / importar o estudo em arquivo (para levar para outra máquina ou guardar junto do projeto)
function baixarEstudo(){const d=montarEstudo();const blob=new Blob([JSON.stringify(d,null,1)],{type:'application/json'});
const a=document.createElement('a');a.href=URL.createObjectURL(blob);
a.download=(d.arquivo||'estudo').split('|')[0].replace(/\.[^.]+$/,'')+'_estudo.json';
document.body.appendChild(a);a.click();document.body.removeChild(a);setTimeout(()=>URL.revokeObjectURL(a.href),1000)}

function pF(f){_arquivoAtual=impressaoArquivo(f);const r=new FileReader;r.onload=e=>{try{S.wb=XLSX.read(e.target.result,{type:'array',cellStyles:true,cellNF:true,cellDates:true});
// Filtra apenas abas visíveis (Hidden===0 ou undefined; 1=hidden, 2=veryHidden)
let visibleSheets=S.wb.SheetNames;
if(S.wb.Workbook&&S.wb.Workbook.Sheets){visibleSheets=S.wb.SheetNames.filter((n,i)=>{const sh=S.wb.Workbook.Sheets[i];return!sh||!sh.Hidden})}
if(!visibleSheets.length)visibleSheets=S.wb.SheetNames;// fallback se todas ocultas
document.getElementById('fn').textContent=f.name;document.getElementById('fm').textContent=visibleSheets.length+' abas';document.getElementById('fib').classList.remove('hd');uz.classList.add('hd');
S.abasDisp=visibleSheets;S.abas=[visibleSheets[0]];
document.getElementById('sc').classList.remove('hd');
// Se houver estudo salvo para este arquivo, retoma em silêncio
const salvo=estudoSalvo();
if(salvo&&aplicarEstudo(salvo))return;
oS();atualizarAvisoSalvo()}catch(err){alert(err.message)}};r.readAsArrayBuffer(f)}
function rmF(){S.wb=null;_arquivoAtual=null;document.getElementById('fib').classList.add('hd');uz.classList.remove('hd');document.getElementById('sc').classList.add('hd');document.getElementById('fi').value='';const si=document.getElementById('savedInfo');if(si)si.innerHTML=''}
let _abaGrid=null;
function abaGridAtual(){return _abaGrid||abaAtualPv()}
function abaAtualPv(){const p=document.getElementById('pvAba');return p&&p.value?p.value:(S.abas[0]||'')}
// Lê uma aba respeitando a origem A1
function lerAba(nome){const w=S.wb.Sheets[nome];if(!w)return[];let opts={header:1,defval:''};
if(w['!ref']){try{const rng=XLSX.utils.decode_range(w['!ref']);rng.s.c=0;rng.s.r=0;opts.range=rng}catch(e){}}
return XLSX.utils.sheet_to_json(w,opts)}
// Colunas ocultas COM dados são mantidas; ocultas vazias são escondidas (considera todas as abas)
function colsOcultas(){const h=new Set;const cand={};
S.abas.forEach(nome=>{const ws=S.wb.Sheets[nome];if(!ws||!ws['!cols'])return;
ws['!cols'].forEach((c,i)=>{if(c&&c.hidden)cand[i]=true})});
Object.keys(cand).forEach(i=>{i=+i;let temDado=false;
S.abas.forEach(nome=>{const sd=S.sdPorAba[nome]||[];for(let r=0;r<sd.length;r++){const v=sd[r]?.[i];if(v!==''&&v!=null){temDado=true;break}}});
if(!temDado)h.add(i)});
return h}
function toggleAba(nome,marcado){
if(marcado){if(!S.abas.includes(nome))S.abas.push(nome)}
else{S.abas=S.abas.filter(a=>a!==nome)}
if(!S.abas.length){alert('Selecione pelo menos uma aba.');S.abas=[nome];rAbas();return}
oS()}
function rAbas(){const box=document.getElementById('abasBox');if(!box)return;
box.innerHTML=(S.abasDisp||[]).map(n=>'<label class="aba-item"><input type="checkbox" '+(S.abas.includes(n)?'checked':'')+' onchange="toggleAba(\''+n.replace(/'/g,"\\'")+'\',this.checked)"> '+X(n)+'</label>').join('');
const pv=document.getElementById('pvAba');
if(pv){const atual=pv.value;pv.innerHTML=S.abas.map(n=>'<option>'+X(n)+'</option>').join('');
if(S.abas.includes(atual))pv.value=atual}}
function oS(){
// Lê todas as abas selecionadas
S.sdPorAba={};S.abas.forEach(n=>{S.sdPorAba[n]=lerAba(n)});
S.sd=S.sdPorAba[abaAtualPv()]||[];
S.hiddenCols=colsOcultas();
rAbas();oR()}
function oR(){S.startRow=parseInt(document.getElementById('sr').value)||2;
const hEl=document.getElementById('hrs'),feEl=document.getElementById('hre');
let hStart=hEl?parseInt(hEl.value)||1:S.startRow-1;
let hEnd=feEl?parseInt(feEl.value)||hStart:hStart;
if(hEnd<hStart)hEnd=hStart;
S.hdStart=hStart;S.hdEnd=hEnd;
S.sd=S.sdPorAba[abaAtualPv()]||[];
// Cabeçalho: usa a aba mostrada na prévia (todas têm o mesmo formato)
const mc=S.sd.reduce((m,r)=>Math.max(m,r.length),0);
S.hd=[];for(let c=0;c<mc;c++){const parts=[];for(let r=hStart-1;r<=hEnd-1;r++){const v=S.sd[r]?.[c];if(v!==''&&v!=null)parts.push(String(v).trim())}S.hd[c]=parts.join(' ').trim()}
// Linhas de dados de TODAS as abas selecionadas, guardando de qual aba vieram
S.rw=[];S.rwOrig=[];S.rwAba=[];
S.abas.forEach(nome=>{const sd=S.sdPorAba[nome]||[];
for(let i=S.startRow-1;i<sd.length;i++){if(sd[i]&&sd[i].some(c=>c!==''&&c!=null)){S.rw.push(sd[i]);S.rwOrig.push(i);S.rwAba.push(nome)}}});
rPv();document.getElementById('pc').classList.remove('hd')}
function rPv(){buildExcelGrid('pv')}

// ==================== P2 ====================
function onPv2Aba(){const sel=document.getElementById('pv2Aba');buildExcelGrid('pv2',sel?sel.value:null)}
function iP2(){
// Seletor de aba da pré-visualização (independente da etapa 1)
const sel=document.getElementById('pv2Aba');
if(sel){const atual=sel.value;
sel.innerHTML=S.abas.map(n=>'<option>'+X(n)+'</option>').join('');
sel.value=S.abas.includes(atual)?atual:(S.abas[0]||'');
sel.parentElement.style.display=S.abas.length>1?'':'none'}
buildExcelGrid('pv2',sel?sel.value:null);
const o='<option value="">...</option>'+S.hd.map((h,i)=>{if(S.hiddenCols.has(i))return'';return'<option value="'+i+'">'+cL(i)+(h?' — '+X(h):'')+'</option>'}).join('');
['tc','md','mp','extraCol'].forEach(id=>document.getElementById(id).innerHTML=o);
if(S.dc!=='')document.getElementById('md').value=S.dc;if(S.pc!=='')document.getElementById('mp').value=S.pc;
document.getElementById('mdf').value=S.df;document.getElementById('tsp').value=S.ts;rT();rExtras();uP2()}
function aTC(){const v=parseInt(document.getElementById('tc').value);if(isNaN(v)||S.tc.includes(v))return;S.tc.push(v);document.getElementById('tc').value='';rT();uP2()}
function xTC(i){S.tc=S.tc.filter(c=>c!==i);rT();uP2()}
function rT(){S.ts=document.getElementById('tsp').value||'-';const c=document.getElementById('tB');if(!S.tc.length){c.innerHTML='<span style="color:var(--mu);font-size:8px">—</span>';return}
let h='';S.tc.forEach((ci,i)=>{if(i>0)h+='<span class="ts-sep">'+X(S.ts)+'</span>';h+='<span class="tp">'+cL(ci)+(S.hd[ci]?' ('+X(S.hd[ci])+')':'')+'<button class="rx" onclick="xTC('+ci+')">×</button></span>'});c.innerHTML=h}
function addExtra(){const name=document.getElementById('extraName').value.trim();const col=document.getElementById('extraCol').value;if(!name||col==='')return;S.extras.push({name,col:parseInt(col)});document.getElementById('extraName').value='';rExtras();uP2()}
function rmExtra(i){S.extras.splice(i,1);rExtras();uP2()}
function rExtras(){document.getElementById('extraList').innerHTML=S.extras.map((e,i)=>'<div style="font-size:8px;display:flex;gap:4px;align-items:center;margin-bottom:2px"><span style="font-weight:500">'+X(e.name)+'</span><span style="color:var(--mu)">← '+cL(e.col)+'</span><button class="ber" style="font-size:7px" onclick="rmExtra('+i+')">×</button></div>').join('')}
function uP2(){S.dc=document.getElementById('md').value;S.df=document.getElementById('mdf').value;S.pc=document.getElementById('mp').value;S.ts=document.getElementById('tsp').value||'-';
const n=S.rw.length;// mostra todas as linhas processadas
let hasW=false;const eH=S.extras.map(e=>'<th>'+X(e.name)+'</th>').join('');
let h='<thead><tr><th class="rn">Ln</th><th>TAG</th><th>DESC</th><th>kW orig.</th><th>kW</th>'+eH+'</tr></thead><tbody>';
for(let r=0;r<n;r++){const w=S.rw[r],exR=S.rwOrig[r]+1;const tg=S.tc.length?S.tc.map(c=>String(w?.[c]??'')).join(S.ts):'—';const ds=S.dc!==''?fD(w?.[parseInt(S.dc)]??'',S.df):'—';
const rawKw=S.pc!==''?getRawCell(r,parseInt(S.pc)):'';const pi=pP(rawKw);const cls=pi.v===0?' class="zero-kw"':'';const pc=!pi.c?' class="pot-warn"':'';if(!pi.c)hasW=true;
const eT=S.extras.map(e=>'<td>'+X(String(w?.[e.col]??''))+'</td>').join('');
h+='<tr'+cls+'><td class="rn">'+exR+'</td><td style="font-family:monospace;font-size:8px">'+X(tg)+'</td><td>'+X(ds)+'</td><td'+pc+'>'+X(rawKw)+'</td><td>'+fmt(pi.v,2)+'</td>'+eT+'</tr>'}
document.getElementById('mP').innerHTML=h+'</tbody>';
const qEl=document.getElementById('mPqtd');if(qEl)qEl.textContent=n;
document.getElementById('pwb').classList.toggle('hd',!hasW)}

// ==================== P3 ====================
function bM(){S.raw=S.rw.map((w,r)=>{const tg=S.tc.length?S.tc.map(c=>String(w?.[c]??'')).join(S.ts):'';const ds=S.dc!==''?fD(w?.[parseInt(S.dc)]??'',S.df):'';
const rawKw=S.pc!==''?getRawCell(r,parseInt(S.pc)):'';const pi=pP(rawKw);const extra={};S.extras.forEach(e=>{extra[e.name]=String(w?.[e.col]??'')});
const mrfp=getMotorRendFP(pi.v,'Weg W22')||{rend:0.9,fp:0.85};
const kva=mrfp.fp?pi.v/mrfp.fp:0;
// uid estável baseado na linha real do Excel — sobrevive a reconstruções
return{uid:'R'+(S.rwAba?.[r]||'')+'#'+(S.rwOrig[r]??r),aba:S.rwAba?.[r]||'',tag:tg,desc:ds,kw:pi.v,rawKw,cleanKw:pi.c,extra,classe:'M',motorTipo:'Weg W22',funcionamento:'N',rend:mrfp.rend,fp:mrfp.fp,situacao:'N',fd:0.80,kva:kva}})}

// ===== Preservação de estado entre etapas =====
// Assinatura da origem dos dados: só muda se o usuário realmente alterar aba/linhas/mapeamento
function srcSignature(){
return JSON.stringify({abas:[...S.abas].sort(),startRow:S.startRow,hdStart:S.hdStart,hdEnd:S.hdEnd,
tc:S.tc,ts:S.ts,dc:S.dc,df:S.df,pc:S.pc,extras:S.extras.map(e=>e.name+':'+e.col)})}
// Reconstrói a lista bruta só quando a origem mudou, preservando a seleção por uid
function rebuildRaw(sig){
const selUids=new Set([...S.sel].map(i=>S.raw[i]?.uid).filter(Boolean));
bM();S.origMap=S.raw.map(m=>({...m}));S.srcSig=sig;
const jaEscolheu=S.selInit===true;
S.sel=new Set;
if(selUids.size){S.raw.forEach((m,i)=>{if(selUids.has(m.uid))S.sel.add(i)})}
else if(!jaEscolheu){S.raw.forEach((m,i)=>{if(m.kw>0)S.sel.add(i)});S.selInit=true}}
// Guarda as cargas de cada painel por uid (antes de reconstruir a lista de trabalho)
// Guarda também TAG+descrição como reserva, caso o uid não resolva
function panelsToUids(){S.ses.forEach(se=>se.panels.forEach(p=>{
const lst=(p.loads||[]).map(i=>S.mp[i]).filter(Boolean);
p.loadUids=lst.map(m=>m.uid).filter(Boolean);
p.loadTags=lst.filter(m=>m.uid).map(m=>(m.tag||'')+'|'+(m.desc||''))}))}
// Restaura as cargas de cada painel a partir dos uids (depois de reconstruir)
// Rede de segurança: se um uid não resolver, tenta reencontrar a carga pelo TAG+descrição
function panelsFromUids(){const idx={},porTag={};
S.confirmed.forEach((m,i)=>{if(m.uid)idx[m.uid]=i;
const k=(m.tag||'')+'|'+(m.desc||'');if(k!=='|'&&porTag[k]===undefined)porTag[k]=i});
S.ses.forEach(se=>se.panels.forEach(p=>{if(!p.loadUids)return;
const usados=new Set();
p.loads=p.loadUids.map((u,pos)=>{
let i=idx[u];
if(i===undefined){// uid não encontrado: tenta pelo TAG guardado
const k=(p.loadTags||[])[pos];
if(k&&porTag[k]!==undefined&&!usados.has(porTag[k]))i=porTag[k]}
if(i!==undefined)usados.add(i);
return i}).filter(i=>i!==undefined)}))}
// Cálculos elétricos
// Potência ATIVA ABSORVIDA da rede.
// O kW da lista é a potência no eixo (padrão de catálogo), então o motor absorve kW/η.
// Cargas não-motoras não têm rendimento associado: absorvida = nominal.
function calcKwAbsorvido(m){const kw=m.kw||0;
if(!isMotorClass(m))return kw;
// Rendimento ausente ou inválido: considera 1 (sem perdas) para não zerar a carga
const rd=parseFloat(m.rend)>0?parseFloat(m.rend):1;
return kw/rd}
// Potência aparente: S = P_absorvida / cosφ
function calcKVA(m){if(!isMotorClass(m)){const k=parseFloat(m.kva)||0;if(k>0)return k;const fp=m.fp||0.80;return fp>0?(m.kw||0)/fp:0}
if(!m.fp||m.fp===0)return 0;return calcKwAbsorvido(m)/m.fp}
// Fator de demanda: respeita o valor 0 (cargas reserva) — só assume 1 quando não foi informado
function fdDe(m){const v=m&&m.fd;return(v===0||v==='0')?0:(v==null||v===''||isNaN(v)?1:Number(v))}
function calcKVADemandado(m){return calcKVA(m)*fdDe(m)}
// Tensão implícita da carga: baseada em classe e tipo de motor (sem coluna V na Confirmação)
// Tensão da carga considerando o painel em que ela está.
// Motores (M/MB) usam a tensão de motor do nível correspondente (definida na etapa 5).
// ===== Disjuntores padrão =====
// Escolhe o disjuntor imediatamente acima de In x 1,20
const DISJUNTORES=[16,25,32,40,50,63,80,100,125,160,250,300,400,630,800,1250,1600,2000,2500,3200,4000];
function disjuntorPara(inA){const alvo=(inA||0)*1.20;
if(alvo<=0)return null;
const d=DISJUNTORES.find(x=>x>=alvo);
return d!==undefined?d:null}
function tensaoNoPainel(m,voltStr){const vp=parseInt(voltStr)||0;
if(!isMotorClass(m))return vp||(S.vl[0]?.vs||480);
const nivel=S.vl.find(x=>(parseInt(x.vs)||0)===vp);
return (nivel&&(parseInt(nivel.vm)||0))||vp||(S.vl[0]?.vm||440)}
// Corrente nominal da carga dentro de um painel (só faz sentido com a tensão definida)
function calcIEmPainel(m,voltStr){const v=tensaoNoPainel(m,voltStr);if(!v)return 0;
// I = S / (raiz(3) x V) — coerente com o kVA calculado
const kva=calcKVA(m);return(kva*1000)/(1.732*v)}
function getLoadTensao(m){if(!isMotorClass(m))return S.vl[0]?.vs||480;if(m.motorTipo==='Weg W50')return S.vl[1]?.vm||S.vl[0]?.vm||4000;return S.vl[0]?.vm||440}
function calcI(m){const v=getLoadTensao(m);if(v===0)return 0;
const kva=calcKVA(m);return(kva*1000)/(1.732*v)}
// Traz do Excel os valores dos campos extras que ainda não existem na carga.
// Usado quando o usuário cria um campo extra novo na etapa 2 depois de já ter avançado.
function sincronizarExtras(){
if(!S.extras.length||!S.raw.length)return;
const porUid={};S.raw.forEach(m=>{porUid[m.uid]=m});
S.confirmed.forEach(m=>{
if(!m.extra)m.extra={};
// Cargas duplicadas herdam os dados da linha de origem
const ref=porUid[m.uid]||porUid[m.srcUid];
if(!ref)return;
S.extras.forEach(e=>{
// Só preenche o que falta — não sobrescreve o que o usuário editou
if(m.extra[e.name]===undefined||m.extra[e.name]===null)m.extra[e.name]=ref.extra?.[e.name]??''})})}
function iP3(){
const sig=srcSignature();
if(!S.raw.length||S.srcSig!==sig)rebuildRaw(sig);
// Guarda as cargas dos painéis por uid antes de reconstruir a lista
panelsToUids();
const uidsDoExcel=new Set(S.raw.map(m=>m.uid));
const uidsSelecionados=new Set();S.raw.forEach((m,i)=>{if(S.sel.has(i))uidsSelecionados.add(m.uid)});
const anterior=S.confirmed||[];
// Separa mecânicas e elétricas mantendo a ordem atual
const mec=[],ele=[];
anterior.forEach(m=>{(m.isCustom?ele:mec).push(m)});
// Mantém: cargas criadas pelo usuário (duplicadas/manuais) sempre;
// cargas vindas do Excel apenas enquanto continuarem selecionadas na etapa 3
const mecMantidas=mec.filter(m=>{
if(!m.uid||!uidsDoExcel.has(m.uid))return true;// duplicada ou inserida manualmente
return uidsSelecionados.has(m.uid)});
// Acrescenta as recém-selecionadas que ainda não estavam na lista
const jaTem=new Set(mecMantidas.map(m=>m.uid).filter(Boolean));
S.raw.forEach((m,i)=>{if(S.sel.has(i)&&!jaTem.has(m.uid))mecMantidas.push({...m})});
// Reordena seguindo a ordem do Excel; duplicadas ficam logo após a original;
// cargas mecânicas inseridas à mão vão para o fim
const posRaw={};S.raw.forEach((m,i)=>{posRaw[m.uid]=i});
mecMantidas.sort((a,b)=>{
const pa=posRaw[a.uid]??posRaw[a.srcUid],pb=posRaw[b.uid]??posRaw[b.srcUid];
if(pa===undefined&&pb===undefined)return 0;
if(pa===undefined)return 1;
if(pb===undefined)return -1;
if(pa!==pb)return pa-pb;
return (a.dupIdx||0)-(b.dupIdx||0)});
S.confirmed=[...mecMantidas,...ele];
sincronizarExtras();// traz do Excel os campos extras criados depois
aplicarClasseBomba();// cargas com "bomba" na descrição são classificadas como MB
aplicarTodasRegrasFd(false);// aplica as regras de fator de demanda (não sobrescreve o que foi digitado)
// Se os painéis já existem, a lista de trabalho acompanha e é remapeada
if(S.mp===anterior||S.ses.some(se=>se.panels.length)){S.mp=S.confirmed;panelsFromUids()}
rConf()}
function renderConfRow(m,i,localNum){const cls=m.kw===0?' class="zero-kw"':'';
if(!m.uid)m.uid=novoUid(m.isCustom?'C':'N');// segurança: toda carga precisa de identificador próprio
if(!m.extra)m.extra={};if(!m.classe)m.classe='M';
if(m.classe==='Motor')m.classe='M';if(m.classe==='Painel')m.classe='P';// compatibilidade com dados antigos
if(isMotorClass(m)&&!m.motorTipo)m.motorTipo='Weg W22';
if(!m.situacao)m.situacao='N';if(!m.funcionamento)m.funcionamento='N';if(m.fd===undefined||m.fd===null||isNaN(m.fd))m.fd=fdDeRegra(m);
if(m.rend==null||m.fp==null){const mrfp=getMotorRendFP(m.kw,m.motorTipo);if(mrfp){m.rend=mrfp.rend;m.fp=mrfp.fp}else{m.rend=0.9;m.fp=0.85}}
if(m.kva==null){m.kva=(m.fp&&isMotorClass(m))?m.kw/m.fp:0}
aplicarRegraInversor(m);// INV tem prioridade: rend 1,00 / cosφ 0,95

const isMotor=isMotorClass(m);const isPersonalizado=m.motorTipo==='Personalizado';
const kwFora=isMotor&&m.kw>0&&!isKwPadrao(m.kw,m.motorTipo);
const kwStyle=kwFora?' style="background:#fef3c7;color:var(--wn);font-weight:600" title="Potência fora do padrão '+(m.motorTipo==='Weg W50'?'W50 MT':'W22 BT')+'"':'';

const eT=S.extras.map(e=>'<td class="extra-col"><input value="'+X(m.extra?.[e.name]??'')+'" onchange="if(!S.confirmed['+i+'].extra)S.confirmed['+i+'].extra={};S.confirmed['+i+'].extra[\''+X(e.name)+'\']=this.value;if(S.confirmed['+i+'].isCustom)syncCustomLoads()" style="width:100%;min-width:80px"></td>').join('');

// Dropdowns customizados: sigla no fechado, menu flutuante no body
const sitDD=makeDD(i,'situacao',SIT_OPTS,m.situacao,'SIT');
const classCode=m.classe||'M';
const classDD=makeDD(i,'classe',CLASSE_OPTS,classCode,'CLASSE');
const motorCur=m.motorTipo==='Weg W22'?'Weg W22':m.motorTipo==='Weg W50'?'Weg W50':m.motorTipo==='Personalizado'?'Personalizado':'Weg W22';
const motorDD=isMotorClass(m)?makeDD(i,'motorTipo',MOTOR_OPTS,motorCur,'MOTOR'):'<span style="color:var(--mu);font-size:8px">—</span>';
const funcDD=makeDD(i,'funcionamento',FUNC_OPTS,m.funcionamento,'FUNC');

// readOnly de rend/fp: apenas quando é Motor com tipo W22/W50 (usa tabela WEG)
const readOnlyMotor=(isMotorClass(m)&&m.motorTipo&&m.motorTipo!=='Personalizado')||isInversor(m);
const roTitle=isInversor(m)?' title="Fixo pelo funcionamento INV (inversor de frequência)"':'';
const kva=calcKVA(m);
const kvaInput=!isMotorClass(m)?'<input type="text" inputmode="decimal" value="'+fmt(calcKVA(m),2)+'" onchange="onConfKvaChange('+i+',this.value)" title="Editável — kW se adequa">':'<span style="font-family:monospace;color:var(--mu);font-size:9px" title="Calculado: kW / (η × cosφ) — potência absorvida da rede">'+fmt(kva,2)+'</span>';
const rendInput='<input type="text" inputmode="decimal" value="'+fmt(m.rend,3)+'" onchange="S.confirmed['+i+'].rend=parseNum(this.value,S.confirmed['+i+'].rend);if(S.confirmed['+i+'].isCustom)syncCustomLoads();rConf()" '+(readOnlyMotor?'readonly style="background:#f9fafb;color:var(--mu)"'+roTitle:'')+'>';
const fpInput='<input type="text" inputmode="decimal" value="'+fmt(m.fp,3)+'" onchange="onConfFpChange('+i+',this.value)" '+(readOnlyMotor?'readonly style="background:#f9fafb;color:var(--mu)"'+roTitle:'')+'>';
const fdInput='<input type="text" inputmode="decimal" value="'+fmt(fdDe(m),2)+'" onchange="onConfFdChange('+i+',this.value)" title="Aceita 0 (cargas reserva)">';
const kvaDemCell='<span style="font-family:monospace;color:var(--ok);font-size:9px;font-weight:600">'+fmt(calcKVADemandado(m),2)+'</span>';

return'<tr'+cls+'>'+
'<td class="rn">'+localNum+'</td>'+
'<td class="tag-col"><input value="'+X(m.tag)+'" onchange="S.confirmed['+i+'].tag=this.value;if(S.confirmed['+i+'].isCustom)syncCustomLoads()" style="width:100%;min-width:90px"></td>'+
'<td class="col-desc"><input value="'+X(m.desc)+'" title="'+X(m.desc)+'" onchange="S.confirmed['+i+'].desc=this.value;if(S.confirmed['+i+'].isCustom)syncCustomLoads()"></td>'+
'<td class="col-sig">'+sitDD+'</td>'+
'<td class="col-sig">'+classDD+'</td>'+
'<td class="col-motor">'+motorDD+'</td>'+
'<td class="col-sig">'+funcDD+'</td>'+
eT+
'<td style="font-size:8px;color:var(--mu)">'+X(m.rawKw)+'</td>'+
'<td'+kwStyle+'><input type="text" inputmode="decimal" value="'+fmtStd(m.kw)+'" onchange="onConfKwChange('+i+',this.value)" title="Aceita fórmula: =2+2, =3*3, =(10+5)/2"'+(kwFora?' style="background:#fef3c7;font-weight:600"':'')+'></td>'+
'<td class="col-num">'+kvaInput+'</td>'+
'<td class="col-num">'+rendInput+'</td>'+
'<td class="col-num">'+fpInput+'</td>'+
'<td class="col-num">'+fdInput+'</td>'+
'<td>'+kvaDemCell+'</td>'+
'<td class="actions-cell"><button style="font-size:10px;border:1px solid var(--bd);background:var(--sf);border-radius:2px;cursor:pointer;padding:2px 5px" onclick="dupL('+i+')" title="Duplicar"><svg width="10" height="10" viewBox="0 0 16 16" style="vertical-align:middle"><rect x="1" y="4" width="9" height="10" fill="none" stroke="currentColor" stroke-width="1.5"/><rect x="6" y="1" width="9" height="10" fill="none" stroke="currentColor" stroke-width="1.5"/></svg></button><button style="font-size:10px;border:1px solid var(--bd);background:var(--sf);border-radius:2px;cursor:pointer;color:var(--er);padding:2px 5px" onclick="rmL('+i+')" title="Excluir">×</button></td>'+
'</tr>'}

function onConfClasseChange(i,v){S.confirmed[i].classe=v;
if(v==='Painel'&&!S.confirmed[i].kva){S.confirmed[i].kva=S.confirmed[i].kw/(S.confirmed[i].fp||0.85)}
if(S.confirmed[i].isCustom)syncCustomLoads();rConf()}
function onMotorTipoChange(i,tipo){S.confirmed[i].motorTipo=tipo;
if(tipo!=='Personalizado'){const mrfp=getMotorRendFP(S.confirmed[i].kw,tipo);if(mrfp){S.confirmed[i].rend=mrfp.rend;S.confirmed[i].fp=mrfp.fp}}
if(S.confirmed[i].isCustom)syncCustomLoads();rConf()}
// Fator de demanda editável, aceitando 0 (carga reserva)
function onConfFdChange(i,v){const m=S.confirmed[i];if(!m)return;
const s=String(v).trim();
const n=s===''?1:parseNum(s,m.fd);
m.fd=isNaN(n)?1:Math.max(0,n);
m.fdManual=true;// o usuário definiu — não sobrescrever mais
if(m.isCustom)syncCustomLoads();rConf()}
// ===== Regras de Fator de Demanda por palavra na descrição =====
// A primeira regra que casar com a descrição é a que vale — por isso RESERVA vem primeiro
const FD_REGRAS_PADRAO=[
{palavras:['RESERVA'],fd:0.00},
{palavras:['TALHA','PONTE ROLANTE','VÁLVULA'],fd:0.30},
{palavras:['BOMBA'],fd:0.90},
{palavras:['TRANSPORTADOR'],fd:0.90}];
// Cargas com "BOMBA" na descrição entram classificadas como MB (motor para bomba).
// Não sobrescreve a classificação que o usuário tenha escolhido manualmente.
// Classificação automática pela descrição da carga.
// A primeira regra que casar é a que vale; a escolha manual do usuário sempre prevalece.
const CLASSE_AUTO=[
{palavras:['TALHA','PONTE ROLANTE'],classe:'P'},
{palavras:['BOMBA'],classe:'MB'}];
function classeAutoDe(m){const d=normTxt(m&&m.desc);
const r=CLASSE_AUTO.find(x=>x.palavras.some(p=>d.includes(normTxt(p))));
return r?r.classe:null}
function aplicarClasseBomba(){S.confirmed.forEach(m=>{
if(m.classeManual||m.isCustom)return;
const nova=classeAutoDe(m);
if(!nova||m.classe===nova)return;
m.classe=nova;
if(isMotorClass(m)){if(!m.motorTipo)m.motorTipo='Weg W22';
const mrfp=getMotorRendFP(m.kw,m.motorTipo);
if(mrfp&&m.motorTipo!=='Personalizado'){m.rend=mrfp.rend;m.fp=mrfp.fp}}
else{m.motorTipo='';m.rend=DEFAULT_REND_NAO_MOTOR;m.fp=DEFAULT_FP_NAO_MOTOR;
if(!m.kva)m.kva=m.fp>0?(m.kw||0)/m.fp:0}
aplicarRegraInversor(m)})}
function fdDeRegra(m){if(m&&m.funcionamento==='R')return 0;const r=regrasFd().find(x=>cargaCasaRegra(m,x));return r?r.fd:0.80}
function normTxt(s){return String(s||'').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')}
function regrasFd(){if(!S.fdRegras||!S.fdRegras.length)S.fdRegras=FD_REGRAS_PADRAO.map(r=>({palavras:[...r.palavras],fd:r.fd}));return S.fdRegras}
// A carga casa com a regra se a descrição contiver qualquer uma das palavras
function cargaCasaRegra(m,regra){const d=normTxt(m&&m.desc);
return (regra.palavras||[]).some(p=>{const t=normTxt(p).trim();return t&&d.includes(t)})}
// Aplica UMA regra. Nunca sobrescreve fator que o usuário digitou na tabela.
function aplicarRegraFd(idx,avisar){const r=regrasFd()[idx];if(!r)return 0;
let n=0;S.confirmed.forEach(m=>{if(m.fdManual)return;
if(m.funcionamento==='R'){if(m.fd!==0){m.fd=0;n++}return}// reserva: sempre 0
if(cargaCasaRegra(m,r)){if(m.fd!==r.fd){m.fd=r.fd;n++}}});
if(avisar){rConf();alert(n+' carga(s) atualizada(s) com fator '+fmt(r.fd,2)+'.\n(Cargas com fator digitado manualmente foram preservadas.)')}
return n}
// Aplica todas as regras, na ordem da lista
function aplicarTodasRegrasFd(avisar){let n=0;
S.confirmed.forEach(m=>{if(m.fdManual)return;
const novo=fdDeRegra(m);if(m.fd!==novo){m.fd=novo;n++}});
if(avisar){rConf();alert(n+' carga(s) atualizada(s).\n(Cargas com fator digitado manualmente foram preservadas.)')}
return n}
function addRegraFd(){regrasFd().push({palavras:[''],fd:0.80});rFdRegras()}
function rmRegraFd(i){regrasFd().splice(i,1);rFdRegras()}
function setRegraPalavras(i,v){const r=regrasFd()[i];if(!r)return;
r.palavras=String(v).split(',').map(s=>s.trim()).filter(Boolean);agendarSalvamento()}
function setRegraFd(i,v){const r=regrasFd()[i];if(!r)return;
const n=parseComma(v);r.fd=isNaN(n)?0:Math.max(0,n);agendarSalvamento()}
function rFdRegras(){const el=document.getElementById('fdRegras');if(!el)return;
const rs=regrasFd();
let h='<table class="fd-table"><thead><tr><th>Textos na descrição</th><th style="width:70px">Fator</th><th style="width:150px">Ações</th></tr></thead><tbody>';
rs.forEach((r,i)=>{const qtd=S.confirmed?S.confirmed.filter(m=>cargaCasaRegra(m,r)).length:0;
h+='<tr><td><input type="text" value="'+X((r.palavras||[]).join(', '))+'" placeholder="Ex.: TALHA, PONTE ROLANTE" onchange="setRegraPalavras('+i+',this.value);rFdRegras()"></td>'+
'<td><input type="text" inputmode="decimal" value="'+fmt(r.fd,2)+'" onchange="setRegraFd('+i+',this.value);rFdRegras()"></td>'+
'<td class="fd-acts"><button class="btn bsm bok" onclick="aplicarRegraFd('+i+',true)" title="Aplicar somente esta regra">Aplicar</button>'+
'<span class="fd-qtd" title="Cargas que contêm estes textos">'+qtd+'</span>'+
'<button class="btn bsm" onclick="rmRegraFd('+i+')" title="Remover regra" style="color:var(--er)">×</button></td></tr>'});
h+='</tbody></table>';
if(!rs.length)h='<p style="font-size:8px;color:var(--mu)">Nenhuma regra. Use "+ Nova regra".</p>';
el.innerHTML=h}
function onConfKwChange(i,v){const m=S.confirmed[i];m.kw=parseNum(v,m.kw);
if(m.motorTipo!=='Personalizado'&&isMotorClass(m)){const mrfp=getMotorRendFP(m.kw,m.motorTipo);if(mrfp){m.rend=mrfp.rend;m.fp=mrfp.fp}}
aplicarRegraInversor(m);
// Não-motor: ao editar kW, kVA se adequa (kVA = kW / fp)
if(!isMotorClass(m)){const fp=m.fp||0.80;m.kva=fp>0?m.kw/fp:0}
if(m.isCustom)syncCustomLoads();rConf()}
function onConfKvaChange(i,v){const m=S.confirmed[i];m.kva=parseNum(v,m.kva);
// Não-motor: ao editar kVA, kW se adequa (kW = kVA * fp)
if(!isMotorClass(m)){const fp=m.fp||0.80;m.kw=m.kva*fp}
if(m.isCustom)syncCustomLoads();rConf()}
function onConfFpChange(i,v){const m=S.confirmed[i];m.fp=parseNum(v,m.fp);
// Não-motor: ao mudar cosφ, kVA se adequa mantendo kW
if(!isMotorClass(m)){const fp=m.fp||0.80;m.kva=fp>0?m.kw/fp:0}
if(m.isCustom)syncCustomLoads();rConf()}

function rConf(){try{rFdRegras()}catch(e){}
const eH=S.extras.map(e=>'<th class="extra-col">'+X(e.name).toUpperCase()+'</th>').join('');
// Cabeçalho com nomes COMPLETOS, TAG e Extras auto-ajustadas (width:1%)
const hdr='<thead><tr><th style="width:30px">#</th><th class="tag-col">TAG</th><th class="col-desc">DESCRIÇÃO</th><th class="col-sig">SITUAÇÃO</th><th class="col-sig">CLASSIF.</th><th class="col-motor">MOTOR</th><th class="col-sig">FUNCION.</th>'+eH+'<th class="col-kw">kW<br>ORIGINAL</th><th class="col-kw">kW<br>CONSIDERADO</th><th class="col-num">kVA</th><th class="col-num">η</th><th class="col-num">cosφ</th><th class="col-num">FATOR DE<br>DEMANDA</th><th class="col-kw">kVA<br>DEMANDADO</th><th style="width:60px">AÇÕES</th></tr></thead>';
const mecT=document.getElementById('cTMec');const eleT=document.getElementById('cTEle');
let mecBody='<tbody>';let eleBody='<tbody>';let mecCount=0,eleCount=0;let mecKVA=0,eleKVA=0;
// Totais reais (contam TODAS as linhas, inclusive as duplicadas)
let mecTotal=0,eleTotal=0;
// Numeração LOCAL por tabela; grupos de duplicação compartilham o número base + letra (A,B,C...)
const groupBase={};
S.confirmed.forEach((m,i)=>{const isEle=m.isCustom;let label;
if(m.dupGroup){
if(groupBase[m.dupGroup]==null){if(isEle){eleCount++;groupBase[m.dupGroup]=eleCount}else{mecCount++;groupBase[m.dupGroup]=mecCount}}
const letra=String.fromCharCode(64+(m.dupIdx||1));label=groupBase[m.dupGroup]+'.'+letra;
}else{if(isEle){eleCount++;label=String(eleCount)}else{mecCount++;label=String(mecCount)}}
if(isEle){eleTotal++;eleBody+=renderConfRow(m,i,label);eleKVA+=calcKVADemandado(m)}
else{mecTotal++;mecBody+=renderConfRow(m,i,label);mecKVA+=calcKVADemandado(m)}});
mecBody+='</tbody>';eleBody+='</tbody>';
if(mecT)mecT.innerHTML=hdr+mecBody;if(eleT)eleT.innerHTML=hdr+eleBody;
const mcEl=document.getElementById('cCMec');if(mcEl)mcEl.textContent=mecTotal+' cargas mecânicas — Total demandado: '+fmt(mecKVA,2)+' kVA';
const ecEl=document.getElementById('cCEle');if(ecEl)ecEl.textContent=eleTotal+' cargas elétricas/automação — Total demandado: '+fmt(eleKVA,2)+' kVA';
syncCustomLoads()}
function syncCustomLoads(){S.customLoads=S.confirmed.filter(m=>m.isCustom).map(m=>({tag:m.tag,desc:m.desc,kw:m.kw,extra:m.extra||{},classe:m.classe||'M',motorTipo:m.motorTipo,funcionamento:m.funcionamento,rend:m.rend,fp:m.fp,situacao:m.situacao,fd:m.fd,kva:m.kva}))}
// Insere/remove cargas mantendo intactos os vínculos com os painéis.
// Os painéis guardam índices da lista de trabalho; ao inserir uma carga no meio,
// esses índices deslocariam. Guardamos por uid antes e remapeamos depois.
function comVinculosPreservados(fn){
const temPaineis=S.ses.some(se=>se.panels.length);
if(temPaineis){S.mp=S.confirmed;panelsToUids()}
const r=fn();
if(temPaineis){S.mp=S.confirmed;panelsFromUids()}
return r}
function addCustomToConf(){const mrfp=getMotorRendFP(0,'Weg W22')||{rend:0.9,fp:0.85};
comVinculosPreservados(()=>{
S.confirmed.push({tag:'CARGA-'+(S.confirmed.filter(m=>m.isCustom).length+1),desc:'',kw:0,rawKw:'0',cleanKw:true,extra:{},classe:'M',motorTipo:'Weg W22',funcionamento:'N',rend:mrfp.rend,fp:mrfp.fp,situacao:'N',fd:0.80,kva:0,isCustom:true,uid:novoUid('C')})});syncCustomLoads();rConf()}
function addMecToConf(){const mrfp=getMotorRendFP(0,'Weg W22')||{rend:0.9,fp:0.85};
comVinculosPreservados(()=>{
const nMec=S.confirmed.filter(m=>!m.isCustom).length+1;
S.confirmed.push({tag:'CARGA-MEC-'+nMec,desc:'',kw:0,rawKw:'0',cleanKw:true,extra:{},classe:'M',motorTipo:'Weg W22',funcionamento:'N',rend:mrfp.rend,fp:mrfp.fp,situacao:'N',fd:0.80,kva:0,isCustom:false,isManualMec:true,uid:novoUid('N')})});rConf()}
function stripMSuffix(t){return String(t||'').replace(/-M\d+$/,'')}
// uid próprio para cargas criadas pelo usuário (duplicadas / manuais) — nunca colide com as do Excel
let uidSeq=0;
function novoUid(pref){return pref+(++uidSeq)+'_'+Date.now().toString(36)}
function dupL(i){const orig=S.confirmed[i];if(!orig)return;
comVinculosPreservados(()=>{
// Cria ou identifica o grupo de duplicação
let gid=orig.dupGroup;
if(!gid){gid='G'+(++dupSeq);orig.dupGroup=gid;orig.dupIdx=1;orig.dupBaseTag=stripMSuffix(orig.tag);orig.tag=orig.dupBaseTag+'-M1'}
const members=S.confirmed.filter(m=>m.dupGroup===gid);
const maxIdx=members.reduce((mx,m)=>Math.max(mx,m.dupIdx||1),1);
const newIdx=maxIdx+1;
const copy={...orig};copy.uid=novoUid('D');copy.srcUid=orig.srcUid||orig.uid;copy.dupGroup=gid;copy.dupIdx=newIdx;copy.dupBaseTag=orig.dupBaseTag;copy.tag=orig.dupBaseTag+'-M'+newIdx;
// A cópia nasce sem vínculo com painel — o usuário escolhe onde alocá-la
let lastPos=i;for(let k=0;k<S.confirmed.length;k++){if(S.confirmed[k].dupGroup===gid)lastPos=k}
S.confirmed.splice(lastPos+1,0,copy)});
syncCustomLoads();rConf();
// Atualiza as listas da etapa 6 para a nova carga aparecer como disponível
try{if(document.getElementById('pA')){rPN();rUA();rCL()}}catch(e){}}
function rmL(i){const m=S.confirmed[i];if(!m)return;
// Se a carga veio do Excel, desmarca também na etapa 3 para não reaparecer ao navegar
if(m.uid){const ri=S.raw.findIndex(r=>r.uid===m.uid);if(ri>=0)S.sel.delete(ri)}
// Tira a carga de qualquer painel antes de removê-la da lista
S.ses.forEach(se=>se.panels.forEach(p=>{p.loads=(p.loads||[]).filter(x=>x!==i)}));
comVinculosPreservados(()=>{S.confirmed.splice(i,1)});
if(m.isCustom)syncCustomLoads();rConf();
try{if(document.getElementById('pA')){rPN();rUA();rCL()}}catch(e){}}

// ==================== P4 ====================
// Monta "tensão de sistema / tensão de motor" a partir dos níveis do projeto
function voltStrDe(vs){const v=parseInt(vs)||0;
const n=S.vl.find(x=>(parseInt(x.vs)||0)===v);
const vm=n?(parseInt(n.vm)||v):v;
return v+'/'+vm}
// Propaga alterações dos níveis (etapa 5) para painéis, blocos e exportação
function propagarTensoes(vsAntigo,vsNovo){
S.ses.forEach(se=>se.panels.forEach(p=>{
const atual=parseInt(p.voltStr)||0;
if(vsAntigo!=null&&atual===vsAntigo){p.voltStr=voltStrDe(vsNovo)}
else{p.voltStr=voltStrDe(atual)}}));
S.blocks.forEach(b=>{
if(vsAntigo!=null){if((parseInt(b.v1)||0)===vsAntigo)b.v1=vsNovo;
if(b.type==='TRAFO'&&(parseInt(b.v2)||0)===vsAntigo)b.v2=vsNovo}});
try{if(document.getElementById('pA'))rPN()}catch(e){}
try{if(document.getElementById('dbCanvas'))iP7()}catch(e){}
try{if(curPage>=8)iP8()}catch(e){}
agendarSalvamento()}
function setVs(i,val){const n=S.vl[i];if(!n)return;const antigo=parseInt(n.vs)||0;const novo=parseInt(val)||0;
if(!novo||novo===antigo){rVL();return}
n.vs=novo;propagarTensoes(antigo,novo);rVL()}
function setVm(i,val){const n=S.vl[i];if(!n)return;n.vm=parseInt(val)||0;propagarTensoes(null,null);rVL()}
function rVL(){let h='';S.vl.forEach((v,i)=>{h+='<div class="vr"><label>Sistema:</label><input type="number" value="'+v.vs+'" onchange="setVs('+i+',this.value)"> V <label>Motor:</label><input type="number" value="'+v.vm+'" onchange="setVm('+i+',this.value)"> V <button class="vrm" onclick="xVL('+i+')">×</button></div>'});document.getElementById('vlL').innerHTML=h}
function aVL(){S.vl.push({vs:220,vm:220});rVL()}
function xVL(i){S.vl.splice(i,1);rVL()}

// ==================== P5 ====================
function isModified(i){if(i>=S.origMap.length)return false;const o=S.origMap[i],c=S.raw[i];return!c||c.tag!==o.tag||c.desc!==o.desc||c.kw!==o.kw}
// ===== Seleção múltipla na etapa 3 (marcar/desmarcar em lote) =====
let selL3=new Set,lastL3=-1;
// Clique na linha: seleciona; Shift = intervalo; Ctrl/Cmd = alterna
function cL3(e,i){e.stopPropagation();
if(e.shiftKey&&lastL3>=0){const lo=Math.min(lastL3,i),hi=Math.max(lastL3,i);
for(let k=lo;k<=hi;k++)selL3.add(k)}
else if(e.ctrlKey||e.metaKey){selL3.has(i)?selL3.delete(i):selL3.add(i)}
else{selL3=selL3.size===1&&selL3.has(i)?new Set():new Set([i])}
lastL3=i;pintarL3()}
function pintarL3(){document.querySelectorAll('#lL .li').forEach(el=>{
el.classList.toggle('marcada',selL3.has(parseInt(el.getAttribute('data-i'))))});
const n=selL3.size;const b=document.getElementById('l3Acoes');
if(b)b.innerHTML=n?('<span class="l3n">'+n+' selecionada'+(n>1?'s':'')+'</span>'+
'<button class="btn bok bsm" onclick="marcarSel(true)">✔ Incluir no estudo</button>'+
'<button class="btn bsm" onclick="marcarSel(false)">✕ Retirar do estudo</button>'+
'<button class="btn bsm" onclick="limparSelL3()">Limpar seleção</button>'):''}
// Marca/desmarca de uma vez todas as linhas selecionadas
function marcarSel(incluir){if(!selL3.size)return;
selL3.forEach(i=>{incluir?S.sel.add(i):S.sel.delete(i)});
S.selInit=true;iP5();pintarL3()}
function limparSelL3(){selL3=new Set;lastL3=-1;pintarL3()}
function iP5(){
// Etapa 3: cargas mecânicas do Excel. Só reconstrói se a origem dos dados mudou.
const sig=srcSignature();
if(!S.raw.length||S.srcSig!==sig)rebuildRaw(sig);
const l=document.getElementById('lL');
let h='<div class="lh"><span></span><span class="lt">TAG</span><span class="ld">DESCRIÇÃO</span><span class="lp">kW</span></div>';
S.raw.forEach((m,i)=>{
const ck=S.sel.has(i)?'checked':'';let cls='';if(m.kw===0)cls=' zero-kw';else if(isModified(i))cls=' modified';
if(selL3.has(i))cls+=' marcada';
h+='<div class="li'+cls+'" data-i="'+i+'" onclick="cL3(event,'+i+')"><input type="checkbox" '+ck+' onclick="event.stopPropagation()" onchange="tS('+i+',this.checked)"><span class="lt">'+X(m.tag)+'</span><span class="ld">'+X(m.desc)+'</span><span class="lp">'+fmt(m.kw,2)+'</span></div>'});
l.innerHTML=h;uSC();pintarL3()}
function tS(i,v){v?S.sel.add(i):S.sel.delete(i);S.selInit=true;uSC()}
function sA(v){S.selInit=true;S.raw.forEach((m,i)=>{v?S.sel.add(i):S.sel.delete(i)});document.querySelectorAll('#lL input[type=checkbox]').forEach(c=>c.checked=!!v);uSC()}
function dZ(){S.raw.forEach((m,i)=>{if(m.kw===0)S.sel.delete(i)});iP5()}
function uSC(){const mec=S.raw.length;const sel=S.sel.size;const cust=(S.confirmed||[]).filter(m=>m.isCustom).length;document.getElementById('sC').textContent=sel+'/'+mec+' mecânicas'+(cust?' + '+cust+' elétricas (auto)':'')}

// ==================== P6 ====================
function iP6(){
// A partir da etapa Painéis, S.mp = S.confirmed (lista de trabalho)
const eraOutra=S.mp!==S.confirmed;
if(eraOutra)panelsToUids();
S.mp=S.confirmed;
if(eraOutra)panelsFromUids();
document.getElementById('nv').innerHTML=S.vl.map(v=>'<option value="'+v.vs+'/'+v.vm+'">'+v.vs+'/'+v.vm+'V</option>').join('');
document.getElementById('pse').innerHTML=S.ses.map(s=>'<option value="'+s.id+'">'+X(s.name)+'</option>').join('');
syncCustomLoads();
updTP();selUA=new Set;lastCI=-1;rPN();rUA();rCL()}
// Sugere o prefixo do último item criado (ex.: "CCM-01" -> "CCM-")
function prefixoDe(nome){const m=String(nome||'').match(/^(.*?[^0-9])(\d+)\s*$/);return m?m[1]:''}
function aSE(){const n=document.getElementById('nsn').value.trim().toUpperCase();if(!n)return;if(S.ses.some(s=>s.name===n))return alert('Já existe');
const obs=document.getElementById('nsobs').value.trim();
S.ses.push({id:++sei,name:n,obs:obs,panels:[]});document.getElementById('nsn').value=prefixoDe(n);document.getElementById('nsobs').value='';
document.getElementById('pse').innerHTML=S.ses.map(s=>'<option value="'+s.id+'">'+X(s.name)+'</option>').join('');rPN()}
function editSE(id){const se=S.ses.find(s=>s.id===id);if(!se)return;const nn=prompt('Nome:',se.name);if(nn?.trim()){const nu=nn.trim().toUpperCase();if(!S.ses.some(s=>s.id!==id&&s.name===nu))se.name=nu}
const obs=prompt('Observação:',se.obs||'');if(obs!==null)se.obs=obs;
document.getElementById('pse').innerHTML=S.ses.map(s=>'<option value="'+s.id+'">'+X(s.name)+'</option>').join('');rPN()}
function xSE(id){if(!confirm('Remover?'))return;S.ses=S.ses.filter(s=>s.id!==id);document.getElementById('pse').innerHTML=S.ses.map(s=>'<option value="'+s.id+'">'+X(s.name)+'</option>').join('');updTP();rPN();rUA()}
function aP(){const seId=parseInt(document.getElementById('pse').value);const se=S.ses.find(s=>s.id===seId);if(!se)return alert('Crie uma SE primeiro');const n=document.getElementById('nn').value.trim().toUpperCase();if(!n)return;if(se.panels.some(p=>p.name===n))return alert('Já existe');
const obs=document.getElementById('nobs').value.trim();
se.panels.push({id:++pi,name:n,type:document.getElementById('nt').value,voltStr:document.getElementById('nv').value,obs:obs,loads:[]});
document.getElementById('nn').value=prefixoDe(n);document.getElementById('nobs').value='';updTP();rPN()}
// Próximo nome livre a partir do sufixo numérico (CCM-01 -> CCM-02 -> CCM-03).
// Considera todos os painéis da sala e os blocos do diagrama, para não colidir.
function proximoNomePainel(nome,se){
const usados=new Set();
se.panels.forEach(p=>usados.add(String(p.name).toUpperCase()));
S.blocks.filter(b=>b.seId===se.id).forEach(b=>usados.add(String(b.name).toUpperCase()));
const m=String(nome).match(/^(.*?)(\d+)(\D*)$/);
if(!m){let n=2;while(usados.has((nome+'-'+n).toUpperCase()))n++;return nome+'-'+n}
const pref=m[1],num=m[2],suf=m[3],larg=num.length;
let n=parseInt(num,10);
for(let t=0;t<1000;t++){n++;
const cand=pref+String(n).padStart(larg,'0')+suf;
if(!usados.has(cand.toUpperCase()))return cand}
return nome+'-COPIA'}
// Duplica o painel mantendo tipo, tensão e observação. As cargas NÃO são copiadas:
// cada carga só pode estar em um painel, então a cópia nasce vazia para ser preenchida.
function dupP(seId,pid){const se=S.ses.find(s=>s.id===seId);if(!se)return;
const p=se.panels.find(x=>x.id===pid);if(!p)return;
const novo=proximoNomePainel(p.name,se);
se.panels.push({id:++pi,name:novo,type:p.type,voltStr:p.voltStr,obs:p.obs||'',loads:[]});
// Cria o bloco correspondente no diagrama, na mesma tensão
const v=parseInt(p.voltStr)||0;
if(!S.blocks.some(b=>b.seId===seId&&b.name===novo))
S.blocks.push({id:'B'+(++bki),name:novo,type:'PAINEL',v1:v,v2:0,seId:seId,painelTipo:p.type});
updTP();rPN();rUA();rCL();
try{if(document.getElementById('dbCanvas'))iP7()}catch(e){}}
function editP(si,pid){const se=S.ses.find(s=>s.id===si);if(!se)return;const p=se.panels.find(p=>p.id===pid);if(!p)return;
// Nome
const nn=prompt('Nome do painel:',p.name);if(nn?.trim()){const nu=nn.trim().toUpperCase();if(!se.panels.some(pp=>pp.id!==pid&&pp.name===nu))p.name=nu;else alert('Já existe um painel com esse nome nesta SE.')}
// Tipo
const tp=prompt('Tipo (CCM / QD / INVERSOR):',p.type||'CCM');if(tp!==null){const tu=tp.trim().toUpperCase();if(['CCM','QD','INVERSOR'].includes(tu))p.type=tu;else if(tu)alert('Tipo inválido. Use CCM, QD ou INVERSOR.')}
// Tensão (usa a lista de níveis do projeto)
const vAtual=parseInt(p.voltStr)||0;const nv=askVoltage(vAtual);
if(nv&&nv!==vAtual){
// Cargas com motor incompatível com a nova tensão precisam sair do painel
const incompat=p.loads.filter(i=>{const m=S.mp[i];return m&&!motorCompativel(m,nv+'/'+nv).ok});
if(incompat.length){
const lista=incompat.map(i=>{const m=S.mp[i];return '• '+(m.tag||'(sem TAG)')+' — '+fmt(m.kw,2)+' kW'}).join('\n');
if(!confirm('Ao mudar para '+nv+' V, '+incompat.length+' carga(s) ficam com o modelo de motor incompatível:\n\n'+lista+
'\n\nElas serão retiradas deste painel e voltarão para a lista de cargas disponíveis. Continuar?'))return;
p.loads=p.loads.filter(i=>!incompat.includes(i))}
p.voltStr=voltStrDe(nv);
// Propaga para o diagrama de blocos (e, por consequência, para a exportação)
const blk=S.blocks.find(b=>b.type==='PAINEL'&&b.seId===se.id&&b.name===p.name);if(blk)blk.v1=nv}
// Sala elétrica (mover para outra SE)
if(S.ses.length>1){const lista=S.ses.map((s,idx)=>(idx+1)+') '+s.name).join('\n');
const resp=prompt('Mover para qual sala elétrica?\n'+lista+'\n\nDigite o número (ou deixe em branco para manter):');
if(resp&&/^\d+$/.test(resp.trim())){const idx=parseInt(resp)-1;if(idx>=0&&idx<S.ses.length&&S.ses[idx].id!==se.id){const dst=S.ses[idx];
if(dst.panels.some(pp=>pp.name===p.name)){alert('A SE de destino já tem um painel com esse nome. Movimentação cancelada.')}
else{se.panels=se.panels.filter(pp=>pp.id!==pid);dst.panels.push(p);
// Atualiza o bloco correspondente no diagrama
const blk=S.blocks.find(b=>b.type==='PAINEL'&&b.seId===se.id&&b.name===p.name);if(blk)blk.seId=dst.id}}}}
// Observação
const obs=prompt('Observação:',p.obs||'');if(obs!==null)p.obs=obs;
updTP();rPN();rUA();rCL();
// Atualiza diagrama e exportação com os novos dados
try{if(typeof iP7==='function'&&document.getElementById('dbCanvas'))iP7()}catch(e){}
try{if(curPage>=8&&typeof iP8==='function')iP8()}catch(e){}}
function xP(si,pid){const se=S.ses.find(s=>s.id===si);if(!se)return;se.panels=se.panels.filter(p=>p.id!==pid);updTP();rPN();rUA()}
function gA(){const s=new Set;S.ses.forEach(se=>se.panels.forEach(p=>p.loads.forEach(i=>s.add(i))));return s}
function updTP(){const t=document.getElementById('tp');let h='<option value="">Dest.</option>';S.ses.forEach(se=>{se.panels.forEach(p=>{h+='<option value="'+se.id+'-'+p.id+'">'+X(se.name)+'/'+X(p.name)+'</option>'})});t.innerHTML=h}
// Faixa de cor conforme o nível de tensão do painel (ajuda a localizar a baixa tensão)
function nivelTensao(voltStr){const v=parseInt(voltStr)||0;
const niveis=[...new Set(S.vl.map(x=>parseInt(x.vs)||0))].sort((a,b)=>a-b);
if(!niveis.length)return 0;
const i=niveis.indexOf(v);
if(i<0){// tensão fora da lista: encaixa pela proximidade
let melhor=0,dist=Infinity;niveis.forEach((n,k)=>{const d=Math.abs(n-v);if(d<dist){dist=d;melhor=k}});return melhor}
return i}
function classeTensao(voltStr){const i=nivelTensao(voltStr);
return i===0?'v-baixa':i===1?'v-media':i===2?'v-alta':'v-extra'}
// Minimizar/expandir salas e painéis (etapa 6)
function toggleMinSE(id){if(!window._minSE)window._minSE={};window._minSE[id]=!window._minSE[id];rPN()}
function toggleMinP(seId,pid){if(!window._minP)window._minP={};const k=seId+'|'+pid;window._minP[k]=!window._minP[k];rPN()}
function rPN(){const a=document.getElementById('pA');if(!S.ses.length){a.innerHTML='<div style="text-align:center;padding:12px;color:var(--mu);font-size:8px">Crie uma SE.</div>';return}
if(!window.selectedLoads)window.selectedLoads={};// key: se.id+'|'+p.id -> Set of load indexes
let h='';S.ses.forEach(se=>{
// kVA demandado da sala: soma de todos os painéis nela
const kvaSE=se.panels.reduce((s,p)=>s+p.loads.reduce((a,i)=>{const m=S.mp[i];return a+(calcKVA(m)*fdDe(m))},0),0);
const seMin=!!(window._minSE&&window._minSE[se.id]);
const qtdSE=se.panels.reduce((s,p)=>s+p.loads.length,0);
h+='<div class="se-box'+(seMin?' minimizado':'')+'"><div class="se-hdr">'+
'<button class="bmin" onclick="toggleMinSE('+se.id+')" title="'+(seMin?'Expandir':'Minimizar')+' sala">'+(seMin?'▸':'▾')+'</button>'+
'⚡ '+X(se.name)+
'<span class="se-qtd" title="Painéis / cargas nesta sala">'+se.panels.length+' painéis · '+qtdSE+' cargas</span>'+
'<span class="se-kva" title="Soma das cargas de todos os painéis desta sala">'+fmt(kvaSE,1)+' kVA dem.</span>'+
'<div class="se-acts"><button class="bedit" onclick="editSE('+se.id+')" title="Editar">'+ICON_PENCIL+'</button><button class="ber" onclick="xSE('+se.id+')">×</button></div></div>';
if(seMin){h+='</div>';return}
if(se.obs)h+='<div class="se-obs">'+X(se.obs)+'</div>';
h+='<div class="se-body">';
// Ordena painéis: tensão (decrescente) e depois nome (alfabética)
const panelsSorted=[...se.panels].sort((a,b)=>String(a.name).localeCompare(String(b.name),'pt',{numeric:true}));
panelsSorted.forEach(p=>{const tkVA=p.loads.reduce((s,i)=>{const m=S.mp[i];return s+(calcKVA(m)*fdDe(m))},0);
const selKey=se.id+'|'+p.id;const selSet=window.selectedLoads[selKey]||new Set;const selCount=selSet.size;
const clsV=classeTensao(p.voltStr);
const pMin=!!(window._minP&&window._minP[se.id+'|'+p.id]);
h+='<div class="pb '+clsV+(pMin?' minimizado':'')+'" ondragover="event.preventDefault();this.classList.add(\'dov\')" ondragleave="this.classList.remove(\'dov\')" ondrop="dP(event,'+se.id+','+p.id+')"><div class="phd">'+
'<button class="bmin" onclick="event.stopPropagation();toggleMinP('+se.id+','+p.id+')" title="'+(pMin?'Expandir':'Minimizar')+' painel">'+(pMin?'▸':'▾')+'</button>'+
'<span class="pht">'+X(p.type)+'</span><span class="phn">'+X(p.name)+'</span><span class="phv">'+X(p.voltStr)+'</span>'+
'<span class="phq" title="Cargas inseridas neste painel">'+p.loads.length+' carga'+(p.loads.length===1?'':'s')+'</span>'+
'<span class="phk">'+fmt(tkVA,1)+' kVA dem.</span><div class="ph-acts">'+(selCount>0?'<button class="ber" onclick="rmSelLoads('+se.id+','+p.id+')" title="Remover '+selCount+' selecionadas">🗑 '+selCount+'</button>':'')+'<button class="bdup" onclick="dupP('+se.id+','+p.id+')" title="Duplicar painel"><svg width="9" height="9" viewBox="0 0 16 16" style="vertical-align:middle"><rect x="1" y="4" width="9" height="10" fill="none" stroke="currentColor" stroke-width="1.8"/><rect x="6" y="1" width="9" height="10" fill="none" stroke="currentColor" stroke-width="1.8"/></svg></button><button class="bedit" onclick="editP('+se.id+','+p.id+')" title="Editar">'+ICON_PENCIL+'</button><button class="ber" onclick="xP('+se.id+','+p.id+')">×</button></div></div>';
if(pMin){h+='</div>';return}
if(p.obs)h+='<div class="p-obs">'+X(p.obs)+'</div>';
if(p.loads.length)h+='<div style="font-size:6px;color:var(--mu);padding:1px 3px">Clique = seleciona • Shift+clique = intervalo • Ctrl+clique = alterna</div>';
h+='<div class="pbd" style="display:grid;grid-template-columns:1fr 1fr;gap:2px;padding:3px">';if(!p.loads.length)h+='<div style="grid-column:1/-1;text-align:center;padding:2px;color:var(--mu);font-size:7px">↓</div>';
else{const subGridCols='minmax(40px,1fr) minmax(48px,1.2fr) 58px'+S.extras.map(()=>' 28px').join('')+' 40px 44px 14px';
p.loads.forEach((li,posIdx)=>{const m=S.mp[li];if(m){
const isSel=selSet.has(li);
h+='<div class="pl'+(isSel?' pl-sel':'')+'" draggable="true" ondragstart="dFP(event,['+li+'],'+se.id+','+p.id+')" onclick="clickLoad(event,'+se.id+','+p.id+','+li+','+posIdx+')" style="display:grid;grid-template-columns:'+subGridCols+';gap:2px;align-items:center;padding:2px 3px;background:'+(isSel?'#dbeafe':'var(--sf)')+';border:1px solid '+(isSel?'#2563eb':'var(--bl)')+';border-radius:2px;font-size:7px;cursor:pointer">';
h+='<span style="font-family:monospace;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+X(trn(m.tag,10))+'</span>';
h+='<span style="color:var(--mu);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+X(trn(m.desc,14))+'</span>';
h+='<span class="sig-box" title="Situação / Classificação / Funcionamento">'+
'<i class="sg sg-s">'+X(m.situacao||'-')+'</i>'+
'<i class="sg sg-c">'+X(m.classe||'-')+'</i>'+
'<i class="sg sg-f">'+X(m.funcionamento||'-')+'</i></span>';
S.extras.forEach(e=>{h+='<span style="font-size:6px;color:var(--mu);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:center">'+X(trn(m.extra?.[e.name]||'',5))+'</span>'});
h+='<span style="font-family:monospace;font-size:7px;text-align:right;white-space:nowrap" title="'+(!isMotorClass(m)?'kVA':'kW')+'">'+fmt(!isMotorClass(m)?calcKVA(m):m.kw,1)+' '+(!isMotorClass(m)?'kVA':'kW')+'</span>';
const inA=calcIEmPainel(m,p.voltStr);const dj=disjuntorPara(inA);
const dicaDj='In = '+fmt(inA,1)+' A  (em '+fmt(tensaoNoPainel(m,p.voltStr),0)+' V)\nIn x 1,20 = '+fmt(inA*1.2,1)+' A'+(dj?'\nDisjuntor: '+dj+' A':'\nAcima do maior disjuntor da tabela');
h+='<span class="dj-cell'+(dj?'':' dj-na')+'" title="'+X(dicaDj)+'">'+(dj?dj+' A':'—')+'</span>';
h+='<button onclick="event.stopPropagation();rLP('+se.id+','+p.id+','+li+')" style="background:none;border:none;color:var(--er);cursor:pointer;font-size:9px;padding:0">×</button></div>'}})}
h+='</div></div>'});if(!se.panels.length)h+='<div style="padding:4px;color:var(--mu);font-size:8px;text-align:center">—</div>';h+='</div></div>'});a.innerHTML=h}

let _lastClickPos={};// key -> última posição clicada (para shift-range)
function clickLoad(ev,seId,pid,li,posIdx){ev.stopPropagation();
const key=seId+'|'+pid;if(!window.selectedLoads[key])window.selectedLoads[key]=new Set;
const sels=window.selectedLoads[key];const se=S.ses.find(s=>s.id===seId);const p=se?.panels.find(pp=>pp.id===pid);if(!p)return;
if(ev.shiftKey&&_lastClickPos[key]!=null){
// Seleciona intervalo entre última posição e atual
const from=Math.min(_lastClickPos[key],posIdx),to=Math.max(_lastClickPos[key],posIdx);
for(let k=from;k<=to;k++){if(p.loads[k]!=null)sels.add(p.loads[k])}}
else if(ev.ctrlKey||ev.metaKey){
// Alterna individual
if(sels.has(li))sels.delete(li);else sels.add(li);_lastClickPos[key]=posIdx}
else{
// Clique simples: se já é o único selecionado, desmarca; senão seleciona só ele
if(sels.size===1&&sels.has(li)){sels.clear()}else{sels.clear();sels.add(li)}_lastClickPos[key]=posIdx}
rPN()}
function rmSelLoads(seId,pid){const key=seId+'|'+pid;const sels=window.selectedLoads[key];if(!sels||!sels.size)return;
if(!confirm('Retirar '+sels.size+' cargas selecionadas deste painel?'))return;
const se=S.ses.find(s=>s.id===seId);if(!se)return;const p=se.panels.find(pp=>pp.id===pid);if(!p)return;
p.loads=p.loads.filter(i=>!sels.has(i));window.selectedLoads[key]=new Set;rPN();rUA();rCL()}
function getUAL(){const as=gA();const arr=[];S.mp.forEach((m,i)=>{if(!as.has(i)&&!m.isCustom)arr.push(i)});return arr}
let sortField='orig',sortDir=1;
function sortBy(field){if(sortField===field)sortDir*=-1;else{sortField=field;sortDir=1}rUA();rCL()}
function sortUA(arr){if(sortField==='orig')return arr;
return[...arr].sort((a,b)=>{const ma=S.mp[a],mb=S.mp[b];if(!ma||!mb)return 0;
if(sortField==='kw')return(ma.kw-mb.kw)*sortDir;
if(sortField==='tag')return(ma.tag||'').localeCompare(mb.tag||'')*sortDir;
if(sortField==='desc')return(ma.desc||'').localeCompare(mb.desc||'')*sortDir;
// Extra columns
if(sortField.startsWith('extra_')){const eName=sortField.slice(6);
return(ma.extra?.[eName]||'').localeCompare(mb.extra?.[eName]||'')*sortDir}
return 0})}
function rUA(){const arr=sortUA(getUAL());const l=document.getElementById('uL');
const hdr=document.getElementById('uHdr');if(hdr){let hh='<span class="lh-tag" onclick="sortBy(\'tag\')">TAG ⇅</span><span class="lh-desc" onclick="sortBy(\'desc\')">DESC ⇅</span>';
S.extras.forEach(e=>{hh+='<span style="min-width:30px;font-size:6px;cursor:pointer" onclick="sortBy(\'extra_'+X(e.name)+'\')">'+X(e.name)+' ⇅</span>'});
hh+='<span class="lh-kw" onclick="sortBy(\'kw\')">kW / kVA ⇅</span>';hdr.innerHTML=hh}
let h='';
arr.forEach(i=>{const m=S.mp[i];const eInfo=S.extras.map(e=>'<span style="min-width:30px;font-size:7px;color:var(--mu)">'+X(trn(m.extra?.[e.name]||'',8))+'</span>').join('');
const val=!isMotorClass(m)?calcKVA(m):m.kw;const un=!isMotorClass(m)?'kVA':'kW';
h+='<div class="di'+(selUA.has(i)?' sel':'')+'" data-idx="'+i+'" onclick="cUA(event,'+i+')" draggable="true" ondragstart="dS(event)"><span class="dit">'+X(trn(m.tag,10))+'</span><span class="did">'+X(trn(m.desc,16))+'</span>'+eInfo+'<span class="dik" title="'+un+'">'+fmt(val,1)+' '+un+'</span></div>'});
if(!arr.length)h='<div style="text-align:center;padding:8px;color:var(--ok);font-size:8px">✓ Todas distribuídas</div>';l.innerHTML=h;document.getElementById('uC').textContent=arr.length;
document.getElementById('uB').style.maxHeight=Math.max(150,arr.length*20+60)+'px'}
function cUA(e,idx){e.stopPropagation();const arr=sortUA(getUAL());if(e.shiftKey&&lastCI>=0){const a=arr.indexOf(lastCI),b=arr.indexOf(idx);if(a>=0&&b>=0){const lo=Math.min(a,b),hi=Math.max(a,b);for(let i=lo;i<=hi;i++)selUA.add(arr[i])}}else if(e.ctrlKey||e.metaKey){selUA.has(idx)?selUA.delete(idx):selUA.add(idx)}else{selUA=new Set([idx])}lastCI=idx;
document.querySelectorAll('#uL .di').forEach(el=>{el.classList.toggle('sel',selUA.has(parseInt(el.getAttribute('data-idx'))))})}
function mvSel(){const tv=document.getElementById('tp').value;if(!tv)return;const[a,b]=tv.split('-').map(Number);const se=S.ses.find(s=>s.id===a);if(!se)return;const p=se.panels.find(p=>p.id===b);if(!p||!selUA.size)return;selUA.forEach(i=>{if(!p.loads.includes(i))p.loads.push(i)});selUA=new Set;rPN();rUA()}
function dS(e){const di=parseInt(e.target.closest('.di')?.getAttribute('data-idx'));if(selUA.size&&selUA.has(di))dragIdxs=[...selUA];else{dragIdxs=[di];selUA=new Set([di])}dragSrc=null;e.dataTransfer.effectAllowed='move'}
function dFP(e,idxs,si,pid){dragIdxs=idxs;dragSrc={si,pi:pid};e.dataTransfer.effectAllowed='move'}
// Limite entre baixa e alta tensão (NBR: acima de 1000 V é média/alta tensão)
const LIMITE_BT=1000;
// Verifica se a carga pode entrar no painel conforme o modelo de motor escolhido na etapa 4
function motorCompativel(m,voltStr){
if(!isMotorClass(m)||!m.motorTipo||m.motorTipo==='Personalizado')return {ok:true};
const v=parseInt(voltStr)||0;if(!v)return {ok:true};
const alta=v>LIMITE_BT;
if(m.motorTipo==='Weg W22'&&alta)return {ok:false,motivo:'motor W22 BT (baixa tensão) em painel de '+v+' V (alta tensão)'};
if(m.motorTipo==='Weg W50'&&!alta)return {ok:false,motivo:'motor W50 MT (média/alta tensão) em painel de '+v+' V (baixa tensão)'};
return {ok:true}}
function dP(e,si,pid){e.preventDefault();e.currentTarget.classList.remove('dov');if(!dragIdxs.length)return;
const se=S.ses.find(s=>s.id===si);if(!se)return;const p=se.panels.find(p=>p.id===pid);if(!p)return;
// Bloqueia cargas com modelo de motor incompatível com a tensão do painel
const recusadas=[];const aceitas=[];
dragIdxs.forEach(i=>{const m=S.mp[i];if(!m)return;
const r=motorCompativel(m,p.voltStr);
if(r.ok)aceitas.push(i);else recusadas.push({m,motivo:r.motivo})});
if(recusadas.length){
const lista=recusadas.map(r=>'• '+(r.m.tag||'(sem TAG)')+' — '+fmt(r.m.kw,2)+' kW\n   '+r.motivo).join('\n');
alert('Carga(s) não compatível(is) com o painel "'+p.name+'" ('+p.voltStr+'):\n\n'+lista+
'\n\nAjuste a classificação do motor na etapa "Classificação e Inserção de Cargas" antes de incluir aqui.')}
if(!aceitas.length){dragIdxs=[];dragSrc=null;return}
// Só remove da origem as cargas efetivamente aceitas
if(dragSrc){const ss=S.ses.find(s=>s.id===dragSrc.si);if(ss){const sp=ss.panels.find(p=>p.id===dragSrc.pi);if(sp)sp.loads=sp.loads.filter(i=>!aceitas.includes(i))}}
aceitas.forEach(i=>{if(!p.loads.includes(i))p.loads.push(i)});
dragIdxs=[];dragSrc=null;selUA=new Set;selCL=new Set;rPN();rUA();rCL()}
function rLP(si,pid,li){const se=S.ses.find(s=>s.id===si);if(!se)return;const p=se.panels.find(p=>p.id===pid);if(p)p.loads=p.loads.filter(i=>i!==li);rPN();rUA();rCL()}
function addCustomLoad(){alert('Adicione cargas elétricas/automação na aba Confirmação')}
function rmCL(i){S.customLoads.splice(i,1);rCL()}
function rCL(){const as=gA();const el=document.getElementById('customLoadsList');
// Update header with same structure as mechanical loads (with extras)
const hdr=document.getElementById('cHdr');if(hdr){let hh='<span class="lh-tag" onclick="sortBy(\'tag\')">TAG ⇅</span><span class="lh-desc" onclick="sortBy(\'desc\')">DESC ⇅</span>';
S.extras.forEach(e=>{hh+='<span style="min-width:30px;font-size:6px;cursor:pointer" onclick="sortBy(\'extra_'+X(e.name)+'\')">'+X(e.name)+' ⇅</span>'});
hh+='<span class="lh-kw" onclick="sortBy(\'kw\')">kW / kVA ⇅</span>';hdr.innerHTML=hh}
const assignedTags=new Set;S.mp.forEach((m,i)=>{if(m.isCustom&&as.has(i))assignedTags.add(m.tag+'|'+m.desc)});
let list=S.customLoads.map((c,i)=>({...c,origIdx:i})).filter(c=>!assignedTags.has(c.tag+'|'+c.desc));
if(sortField!=='orig'){list.sort((a,b)=>{
if(sortField==='kw'){const va=!isMotorClass(a)?calcKVA(a):a.kw;const vb=!isMotorClass(b)?calcKVA(b):b.kw;return(va-vb)*sortDir}
if(sortField==='tag')return(a.tag||'').localeCompare(b.tag||'')*sortDir;
if(sortField==='desc')return(a.desc||'').localeCompare(b.desc||'')*sortDir;
if(sortField.startsWith('extra_')){const en=sortField.slice(6);return(a.extra?.[en]||'').localeCompare(b.extra?.[en]||'')*sortDir}
return 0})}
el.innerHTML=list.map(c=>{const eTds=S.extras.map(e=>'<span style="min-width:30px;font-size:7px;color:var(--mu)">'+X(trn(c.extra?.[e.name]||'',8))+'</span>').join('');
const val=!isMotorClass(c)?calcKVA(c):c.kw;const un=!isMotorClass(c)?'kVA':'kW';
const ni=S.mp.findIndex(m=>m.isCustom&&m.tag===c.tag&&m.desc===c.desc);
return'<div class="di'+(selCL.has(ni)?' sel':'')+'" data-idx="'+ni+'" draggable="true" onclick="cCL(event,'+ni+')" ondragstart="dSCL(event)"><span class="dit">'+X(c.tag)+'</span><span class="did">'+X(c.desc)+'</span>'+eTds+'<span class="dik" title="'+un+'">'+fmt(val,1)+' '+un+'</span></div>'}).join('')}
// Índices (em S.mp) das cargas elétricas mostradas, na ordem da tela — base para o Shift
function listaCL(){return [...document.querySelectorAll('#customLoadsList .di')].map(el=>parseInt(el.getAttribute('data-idx'))).filter(i=>i>=0)}
// Seleção múltipla: clique = uma; Shift = intervalo; Ctrl/Cmd = alterna
function cCL(e,idx){e.stopPropagation();if(idx<0)return;const arr=listaCL();
if(e.shiftKey&&lastCL>=0){const a=arr.indexOf(lastCL),b=arr.indexOf(idx);
if(a>=0&&b>=0){const lo=Math.min(a,b),hi=Math.max(a,b);for(let i=lo;i<=hi;i++)selCL.add(arr[i])}}
else if(e.ctrlKey||e.metaKey){selCL.has(idx)?selCL.delete(idx):selCL.add(idx)}
else{selCL=new Set([idx])}
lastCL=idx;
document.querySelectorAll('#customLoadsList .di').forEach(el=>{el.classList.toggle('sel',selCL.has(parseInt(el.getAttribute('data-idx'))))})}
function dSCL(e){const di=parseInt(e.target.closest('.di')?.getAttribute('data-idx'));
if(isNaN(di)||di<0)return;
if(selCL.size&&selCL.has(di))dragIdxs=[...selCL];else{dragIdxs=[di];selCL=new Set([di])}
dragSrc=null;e.dataTransfer.effectAllowed='move'}

// ==================== P7: DIAGRAM ====================
function getVoltLevels(){return[...new Set(S.vl.map(v=>v.vs))].sort((a,b)=>b-a)}
function getPanelKw(name,seId){let kw=0;S.ses.forEach(se=>{if(seId!=null&&se.id!==seId)return;se.panels.forEach(p=>{if(p.name===name)kw+=p.loads.reduce((s,i)=>{const m=S.mp[i];return s+((m?.kw||0)*fdDe(m))},0)})});return kw}
function getPanelKVA(name,seId){let kva=0;S.ses.forEach(se=>{if(seId!=null&&se.id!==seId)return;se.panels.forEach(p=>{if(p.name===name)kva+=p.loads.reduce((s,i)=>{const m=S.mp[i];return s+(calcKVA(m)*fdDe(m))},0)})});return kva}
function getTotalKVA(blockId,visited){if(!visited)visited=new Set;if(visited.has(blockId))return 0;visited.add(blockId);
const block=S.blocks.find(b=>b.id===blockId);if(!block)return 0;
const own=block.type==='SAIDA'?(parseFloat(block.kvaSaida)||0):getPanelKVA(block.name,block.seId);
const dsIds=S.conns.filter(c=>c.src===blockId).map(c=>c.dst);
const ds=dsIds.reduce((s,id)=>s+getTotalKVA(id,visited),0);
return own+ds}
function iP7(){
if(!S.ses.length){S.ses.push({id:++sei,name:'SE-GERAL',panels:[]})}
const seSel=document.getElementById('seSelect');
if(seSel){seSel.innerHTML=S.ses.map(se=>'<option value="'+se.id+'">'+X(se.name)+'</option>').join('');
if(!S.currentSE||!S.ses.find(s=>s.id===S.currentSE))S.currentSE=S.ses[0].id;
seSel.value=S.currentSE}
// Sincroniza painéis criados na etapa anterior (por seId|name)
const panelKeys={};
S.ses.forEach(se=>se.panels.forEach(p=>{panelKeys[se.id+'|'+p.name]={seId:se.id,panelName:p.name,voltStr:p.voltStr,tipo:p.type}}));
S.blocks=S.blocks.filter(b=>b.type!=='PAINEL'||panelKeys[b.seId+'|'+b.name]);
Object.values(panelKeys).forEach(info=>{
const existing=S.blocks.find(b=>b.type==='PAINEL'&&b.seId===info.seId&&b.name===info.panelName);
const v=parseInt(info.voltStr)||0;
if(!existing){S.blocks.push({id:'B'+(++bki),name:info.panelName,type:'PAINEL',v1:v,v2:0,seId:info.seId,painelTipo:info.tipo})}
else if(v>0&&existing.v1!==v){existing.v1=v}// mantém o bloco alinhado à tensão declarada do painel
});
S.blocks.forEach(b=>{if(b.type!=='PAINEL'&&!b.seId)b.seId=S.currentSE});
rConnT2();rDiag()}
function onSEChange(id){S.currentSE=parseInt(id);rConnT2();rDiag()}

// ===== Paleta de blocos (drag & drop para criar) =====
let _paletteType=null;
function dragPalette(e,type){_paletteType=type;e.dataTransfer.effectAllowed='copy';e.dataTransfer.setData('text/plain','PALETTE:'+type)}
// Chamado ao soltar um bloco da paleta numa faixa de tensão
function dropPaletteBlock(v,col){const type=_paletteType;_paletteType=null;if(!type)return;
const tag=prompt('TAG do bloco '+type+':');if(!tag||!tag.trim())return;const nu=tag.trim().toUpperCase();
if(S.blocks.find(b=>b.name===nu&&b.seId===S.currentSE)){alert('Já existe "'+nu+'" nesta sala elétrica');return}
let blkType,painelTipo=null,v2=0,kvaNom=0,kvaSaida=0;
if(type==='CCM'||type==='QD'||type==='INVERSOR'){blkType='PAINEL';painelTipo=type}
else if(type==='TRAFO'){blkType='TRAFO';
const sec=askVoltage(0,'Informe a tensão SECUNDÁRIA:');
if(sec===null)return;v2=sec;
const r=prompt('Potência nominal do transformador (kVA):','500');kvaNom=parseComma(r)||0}
else if(type==='GERADOR'){blkType='GERADOR';const r=prompt('Potência nominal do gerador (kVA):','500');kvaNom=parseComma(r)||0}
else if(type==='CHEGADA'){blkType='RECEB'}
else if(type==='SAIDA'){blkType='SAIDA';const r=prompt('kVA demandado desta saída:','0');kvaSaida=parseComma(r)||0}
const blk={id:'B'+(++bki),name:nu,type:blkType,v1:v,v2,seId:S.currentSE,kvaNominal:kvaNom,kvaSaida:kvaSaida,gridPos:{col},lastMoved:Date.now()};
if(painelTipo)blk.painelTipo=painelTipo;
S.blocks.push(blk);
if(blkType==='PAINEL'){let se=S.ses.find(s=>s.id===S.currentSE)||S.ses[0];
if(!se){S.ses.push({id:++sei,name:'SE-GERAL',panels:[]});se=S.ses[0];S.currentSE=se.id}
if(!se.panels.find(p=>p.name===nu))se.panels.push({id:++pi,name:nu,type:painelTipo||'CCM',voltStr:voltStrDe(v),obs:'',loads:[]})}
rConnT2();rDiag()}

function getTotalKw(blockId,visited){if(!visited)visited=new Set;if(visited.has(blockId))return 0;visited.add(blockId);
const block=S.blocks.find(b=>b.id===blockId);if(!block)return 0;
const ownKw=getPanelKw(block.name,block.seId);
const dsIds=S.conns.filter(c=>c.src===blockId).map(c=>c.dst);
const dsKw=dsIds.reduce((s,id)=>s+getTotalKw(id,visited),0);
return ownKw+dsKw}

function getSpan(blkId){const ins=S.conns.filter(c=>c.dst===blkId).length;const outs=S.conns.filter(c=>c.src===blkId).length;const maxConn=Math.max(ins,outs);
// 0-1 conexões: 1 espaço; 2: 2 espaços; 3: 3 espaços; ... limitado ao grid (8)
if(maxConn<=1)return 1;return Math.min(maxConn,BASE_COLS)}

function calcDepths(){const depths={};const adj={};S.blocks.forEach(b=>{adj[b.id]=[];depths[b.id]=0});
S.conns.forEach(c=>{const sb=S.blocks.find(b=>b.id===c.src);const db=S.blocks.find(b=>b.id===c.dst);
if(sb&&db&&sb.v1===db.v1&&adj[c.src]!==undefined&&adj[c.dst]!==undefined)adj[c.src].push(c.dst)});
const cap=S.blocks.length;let chg=true,it=0;while(chg&&it<cap+2){chg=false;it++;Object.keys(adj).forEach(id=>{adj[id].forEach(did=>{if(depths[did]<=depths[id]&&depths[id]+1<=cap){depths[did]=depths[id]+1;chg=true}})})}return depths}
// Global depths considering ALL connections (used for export ordering)
function calcGlobalDepths(){const depths={};const adj={};S.blocks.forEach(b=>{adj[b.id]=[];depths[b.id]=0});
S.conns.forEach(c=>{if(adj[c.src]!==undefined&&adj[c.dst]!==undefined)adj[c.src].push(c.dst)});
const cap=S.blocks.length;let chg=true,it=0;while(chg&&it<cap+2){chg=false;it++;Object.keys(adj).forEach(id=>{adj[id].forEach(did=>{if(depths[did]<=depths[id]&&depths[id]+1<=cap){depths[did]=depths[id]+1;chg=true}})})}return depths}

function assignGridPos(){S.blocks.forEach(b=>{if(b.v1==null)b.v1=0});
const depths=calcDepths();
// Agrupa por (seId, voltage, depth) - blocos em SEs, tensões ou depths diferentes NUNCA conflitam
const groups={};S.blocks.forEach(b=>{const k=(b.seId||0)+'|'+b.v1+'|'+(depths[b.id]||0);if(!groups[k])groups[k]=[];groups[k].push(b)});
Object.values(groups).forEach(grp=>{
grp.sort((a,b)=>(b.lastMoved||0)-(a.lastMoved||0));
const used=new Set;
function free(col,span){for(let c=col;c<col+span;c++){if(used.has(c))return false}return true}
function reserve(col,span){for(let c=col;c<col+span;c++)used.add(c)}
const needCenter=[];
// Passada 1: reserva blocos movidos manualmente, considerando o SPAN de cada um
grp.forEach(b=>{const sp=Math.max(1,getSpan(b.id));
if(b.lastMoved&&b.gridPos?.col!==undefined&&b.gridPos.col<40&&free(b.gridPos.col,sp)){reserve(b.gridPos.col,sp)}
else needCenter.push(b)});
// Passada 2: centraliza os demais lado a lado, reservando o span de cada um (SEM sobreposição)
const totalSpan=needCenter.reduce((s,b)=>s+Math.max(1,getSpan(b.id)),0);
let start=Math.max(0,Math.floor((8-totalSpan)/2));
needCenter.forEach(b=>{const sp=Math.max(1,getSpan(b.id));
let col=start;let g=0;while(!free(col,sp)&&g<200){col++;g++}
b.gridPos={col};reserve(col,sp);start=col+sp});
})}

function _rDiagInner(){const cv=document.getElementById('dbCanvas');const vls=getVoltLevels();if(!vls.length){cv.innerHTML='<div style="padding:16px;text-align:center;color:var(--mu)">Defina tensões.</div>';return}
assignGridPos();
// Filter blocks by current SE
const seBlocks=S.blocks.filter(b=>b.seId===S.currentSE);
const allV=new Set(vls);seBlocks.forEach(b=>{if(b.v1>0)allV.add(b.v1)});const sortedV=[...allV].sort((a,b)=>b-a);
// Compute max col needed across all voltage-depth combinations
let maxColEnd=0;seBlocks.forEach(b=>{if(b.gridPos?.col!==undefined){const end=b.gridPos.col+Math.max(1,getSpan(b.id));if(end>maxColEnd)maxColEnd=end}});
const COLS=Math.max(BASE_COLS,maxColEnd);
function getDepth(blocks){const depths={};const adj={};blocks.forEach(b=>{adj[b.id]=[];depths[b.id]=0});
S.conns.forEach(c=>{const sb=S.blocks.find(b=>b.id===c.src);const db=S.blocks.find(b=>b.id===c.dst);
if(sb&&db&&sb.v1===db.v1&&adj[c.src]!==undefined&&adj[c.dst]!==undefined)adj[c.src].push(c.dst)});
const cap=blocks.length;let chg=true,it=0;while(chg&&it<cap+2){chg=false;it++;Object.keys(adj).forEach(id=>{adj[id].forEach(did=>{if(depths[did]<=depths[id]&&depths[id]+1<=cap){depths[did]=depths[id]+1;chg=true}})})}return depths}
let h='';
for(let vi=0;vi<sortedV.length;vi++){const vl=sortedV[vi];const vlInfo=S.vl.find(v=>v.vs===vl);
const vlBlocks=seBlocks.filter(b=>b.v1===vl);
const depths=getDepth(vlBlocks);const maxD=vlBlocks.length?Math.max(0,...Object.values(depths)):0;
for(let d=0;d<=maxD;d++){const rowBlks=vlBlocks.filter(b=>(depths[b.id]||0)===d);
if(!rowBlks.length&&d>0)continue;
h+='<div class="db-band">';
h+='<div class="db-band-label"><span>'+vl+'V</span>'+(vlInfo?'<span class="dbl-v">'+vlInfo.vm+'V</span>':'')+'</div>';
h+='<div class="db-grid-row" style="display:grid;grid-template-columns:repeat('+COLS+',130px);gap:10px;padding:8px;margin-left:82px;justify-content:center">';
// Iterate columns, skipping over span=2 blocks
let col=0,_guard=0;while(col<COLS){if(++_guard>1000)break;
const blk=rowBlks.find(b=>b.gridPos?.col===col);
if(blk){let span=getSpan(blk.id);if(span<1)span=1;if(col+span>COLS)span=1;
const cls=blk.type==='RECEB'?'receb':blk.type==='TRAFO'?'trafo':blk.type==='GERADOR'?'gerador':'';
const totalKw=getTotalKVA(blk.id);const hasConn=S.conns.some(c=>c.src===blk.id||c.dst===blk.id);const dcls=hasConn?'':' disconnected';
h+='<div class="db-cell" data-v="'+vl+'" data-col="'+col+'" style="grid-column:span '+span+';min-height:72px;border:2px dashed var(--bl);border-radius:5px;display:flex;align-items:center;justify-content:center;transition:.15s;padding:2px" ondragover="dragOverCell(event,'+vl+','+col+')" ondrop="dropBlk(event,'+vl+','+col+')">';
const hasNom=(blk.type==='TRAFO'||blk.type==='GERADOR')&&blk.kvaNominal>0;
h+='<div class="db-blk '+cls+dcls+'" id="blk-'+blk.id+'" draggable="true" ondragstart="dragBlk(event,\''+blk.id+'\')" ondragover="blkDragOver(event,\''+blk.id+'\')" ondragleave="blkDragLeave(event,\''+blk.id+'\')" ondrop="blkDrop(event,\''+blk.id+'\')" style="cursor:grab;position:relative;width:'+(span>=2?'95%':'auto')+(hasNom?';background:'+getTrafoLoadColor(totalKw/blk.kvaNominal)+'':'')+'">';
h+='<button class="db-plus top" onclick="addFromPlus(\''+blk.id+'\',\'top\')">+</button>';
h+='<button class="db-plus bot" onclick="addFromPlus(\''+blk.id+'\',\'bot\')">+</button>';
h+='<div class="dbn">'+X(blk.name)+'</div><div class="dbt">'+X(blk.type)+'</div>';
if(blk.type==='TRAFO'){h+='<div class="dbv">'+blk.v1+'V → '+blk.v2+'V</div>';
if(blk.kvaNominal>0)h+=barraCarregamento(totalKw,blk.kvaNominal);}
else if(blk.type==='GERADOR'){if(blk.v1)h+='<div class="dbv">'+blk.v1+'V</div>';
if(blk.kvaNominal>0)h+=barraCarregamento(totalKw,blk.kvaNominal);}
else if(blk.type==='SAIDA'){if(blk.v1)h+='<div class="dbv">'+blk.v1+'V</div>'}
else if(blk.v1)h+='<div class="dbv">'+blk.v1+'V</div>';
if(totalKw>0)h+='<div class="dbk" title="kVA demandado">'+fmt(totalKw,1)+' kVA dem.</div>';
h+='<div class="db-acts"><button class="bdup" onclick="dupBlk(\''+blk.id+'\')" title="Duplicar bloco"><svg width="9" height="9" viewBox="0 0 16 16" style="vertical-align:middle"><rect x="1" y="4" width="9" height="10" fill="none" stroke="currentColor" stroke-width="1.8"/><rect x="6" y="1" width="9" height="10" fill="none" stroke="currentColor" stroke-width="1.8"/></svg></button><button class="bedit" onclick="editBlk(\''+blk.id+'\')" title="Editar">'+ICON_PENCIL+'</button><button class="ber" onclick="rmBlk(\''+blk.id+'\')" title="Excluir">×</button></div></div>';
h+='</div>';col+=span}
else{h+='<div class="db-cell" data-v="'+vl+'" data-col="'+col+'" ondragover="dragOverCell(event,'+vl+','+col+')" ondrop="dropBlk(event,'+vl+','+col+')" style="min-height:72px;border:2px dashed var(--bl);border-radius:5px;display:flex;align-items:center;justify-content:center;transition:.15s"><div class="db-add-blk" onclick="addBlkToLevel('+vl+','+col+')" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:14px;color:var(--bl);cursor:pointer;border:none">+</div></div>';col++}}
h+='</div></div>'}
if(vi<sortedV.length-1)h+='<div class="conv-stripe"></div>'}
h+='<svg class="db-svg-overlay" id="dbSvg"></svg>';
cv.innerHTML=h;requestAnimationFrame(()=>{try{drawConnLines()}catch(e){console.warn('drawConnLines:',e)}})}
// Wrapper: se a renderização do diagrama falhar por algum motivo, não trava o app nem perde as conexões
// Barra de carregamento para transformador/gerador.
// Enche proporcionalmente e fica cheia a partir de 100%; o percentual aparece acima.
function barraCarregamento(demandado,nominal){
if(!nominal||nominal<=0)return'';
const frac=demandado/nominal;const pct=Math.round(frac*100);
const larg=Math.max(0,Math.min(frac,1))*100;// nunca passa de 100% da barra
const cls=frac>=1?'ex':frac>=0.8?'at':'ok';
return '<div class="carga-wrap">'+
'<div class="carga-top"><span class="carga-pct">'+pct+'%</span>'+
'<span class="carga-nom">'+fmt(demandado,0)+' / '+fmt(nominal,0)+' kVA</span></div>'+
'<div class="carga-bar '+(frac>=1?'ex':'')+'" title="Carregamento: '+pct+'%">'+
'<div class="carga-fill '+cls+'" style="width:'+larg.toFixed(1)+'%"></div>'+
'</div></div>'}
function rDiag(){try{_rDiagInner()}catch(e){console.warn('rDiag falhou:',e);const cv=document.getElementById('dbCanvas');if(cv)cv.innerHTML='<div style="padding:12px;color:var(--er);font-size:9px">Não foi possível desenhar o diagrama agora, mas as conexões foram salvas (veja a lista abaixo). Tente reposicionar os blocos.</div>'}}

let dragBlkId=null;
function dragBlk(e,id){dragBlkId=id;e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',id);e.stopPropagation()}
// Conexão por aproximação: arrastar um bloco sobre a metade (superior/inferior) de outro
function blkDragOver(e,targetId){if(!dragBlkId||dragBlkId===targetId)return;e.preventDefault();e.stopPropagation();
const el=document.getElementById('blk-'+targetId);if(!el)return;
const rect=el.getBoundingClientRect();const isBottom=(e.clientY-rect.top)>rect.height/2;
// Cria/atualiza overlay de indicação dentro do bloco
let ov=el.querySelector('.drop-indicator');
if(!ov){ov=document.createElement('div');ov.className='drop-indicator';el.appendChild(ov)}
if(isBottom){
ov.className='drop-indicator drop-bottom';
ov.innerHTML='<div class="di-top">▲ a montante</div><div class="di-bot active">▼ a jusante (aqui)</div>';
el.style.boxShadow='0 5px 0 -1px #16a34a, 0 0 0 2px #16a34a';
}else{
ov.className='drop-indicator drop-top';
ov.innerHTML='<div class="di-top active">▲ a montante (aqui)</div><div class="di-bot">▼ a jusante</div>';
el.style.boxShadow='0 -5px 0 -1px #2563eb, 0 0 0 2px #2563eb';
}
el.setAttribute('data-drop-side',isBottom?'bottom':'top')}
function blkDragLeave(e,targetId){const el=document.getElementById('blk-'+targetId);if(el){el.style.boxShadow='';el.removeAttribute('data-drop-side');const ov=el.querySelector('.drop-indicator');if(ov)ov.remove()}}
function blkDrop(e,targetId){e.preventDefault();e.stopPropagation();
const el=document.getElementById('blk-'+targetId);const side=el?.getAttribute('data-drop-side')||'bottom';
if(el){el.style.boxShadow='';el.removeAttribute('data-drop-side');const ov=el.querySelector('.drop-indicator');if(ov)ov.remove()}
if(!dragBlkId||dragBlkId===targetId){dragBlkId=null;return}
const src=dragBlkId;dragBlkId=null;
// side=top: bloco arrastado fica ACIMA (a montante) do target → src alimenta target (src → target)
// side=bottom: bloco arrastado fica ABAIXO (a jusante) do target → target alimenta src (target → src)
let a,b;if(side==='bottom'){a=targetId;b=src}else{a=src;b=targetId}
if(a===b)return;
if(S.conns.some(c=>c.src===a&&c.dst===b)){rConnT2();rDiag();return}
// Impede criação de CICLO (se o destino já alcança a fonte, conectar criaria um laço → trava o diagrama)
if(blockReaches(b,a)){alert('Essa conexão criaria um ciclo (o bloco de destino já alimenta, direta ou indiretamente, o bloco de origem). Conexão cancelada.');rConnT2();rDiag();return}
S.conns=S.conns.filter(c=>!(c.src===b&&c.dst===a));
S.conns.push({src:a,dst:b});
rConnT2();rDiag()}
// Retorna true se, partindo de `from`, é possível alcançar `to` seguindo as conexões (protegido contra ciclos)
function blockReaches(from,to,visited){if(from===to)return true;if(!visited)visited=new Set;if(visited.has(from))return false;visited.add(from);
const outs=S.conns.filter(c=>c.src===from).map(c=>c.dst);
for(const nxt of outs){if(nxt===to)return true;if(blockReaches(nxt,to,visited))return true}
return false}
function dropBlk(e,v,col){e.preventDefault();e.stopPropagation();
document.querySelectorAll('.db-cell').forEach(el=>{el.style.background='';el.style.borderColor=''});
// Se veio da paleta (não é reposicionamento de bloco existente)
if(!dragBlkId&&_paletteType){
// Verifica se a célula está livre
const newDepths=calcDepths();
// Considera depth 0 para novo bloco na célula
const occupied=S.blocks.find(b=>b.seId===S.currentSE&&b.v1===v&&b.gridPos?.col===col);
if(occupied){alert('Esta posição já está ocupada. Escolha uma célula livre.');return}
dropPaletteBlock(v,col);return}
if(!dragBlkId)return;const blk=S.blocks.find(b=>b.id===dragBlkId);if(!blk){dragBlkId=null;return}
const span=getSpan(blk.id);
const depths=calcDepths();
const savedV=blk.v1;const savedCol=blk.gridPos?.col;
blk.v1=v;blk.gridPos={col};
const newDepths=calcDepths();const targetDepth=newDepths[blk.id]||0;
blk.v1=savedV;if(savedCol!==undefined)blk.gridPos={col:savedCol};else delete blk.gridPos;
for(let c=col;c<col+span;c++){
const other=S.blocks.find(b=>b.id!==dragBlkId&&b.seId===S.currentSE&&b.v1===v&&(newDepths[b.id]||0)===targetDepth&&b.gridPos?.col!==undefined&&b.gridPos.col<=c&&(b.gridPos.col+getSpan(b.id))>c);
if(other){dragBlkId=null;return}}
blk.v1=v;blk.gridPos={col};blk.lastMoved=Date.now();
dragBlkId=null;rConnT2();rDiag()}

function dragOverCell(e,v,col){e.preventDefault();
if(!dragBlkId)return;const blk=S.blocks.find(b=>b.id===dragBlkId);if(!blk)return;
const span=getSpan(blk.id);
// Clear all previews first
document.querySelectorAll('.db-cell').forEach(el=>{el.style.background='';el.style.borderColor=''});
// Check if valid
const depths=calcDepths();const savedV=blk.v1;const savedCol=blk.gridPos?.col;
blk.v1=v;blk.gridPos={col};
const newDepths=calcDepths();const targetDepth=newDepths[blk.id]||0;
blk.v1=savedV;if(savedCol!==undefined)blk.gridPos={col:savedCol};else delete blk.gridPos;
let valid=true;
for(let c=col;c<col+span;c++){
const other=S.blocks.find(b=>b.id!==dragBlkId&&b.seId===S.currentSE&&b.v1===v&&(newDepths[b.id]||0)===targetDepth&&b.gridPos?.col!==undefined&&b.gridPos.col<=c&&(b.gridPos.col+getSpan(b.id))>c);
if(other||c>=20){valid=false;break}}
// Highlight cells in this band
const cells=document.querySelectorAll('.db-cell[data-v="'+v+'"]');
for(let c=col;c<col+span;c++){cells.forEach(el=>{if(parseInt(el.getAttribute('data-col'))===c){el.style.background=valid?'#dbeafe':'#fee2e2';el.style.borderColor=valid?'#2563eb':'#dc2626'}})}}

function drawConnLines(){const svg=document.getElementById('dbSvg');if(!svg)return;
const cv=document.getElementById('dbCanvas');const cvRect=cv.getBoundingClientRect();
svg.setAttribute('width',cv.scrollWidth);svg.setAttribute('height',cv.scrollHeight);
svg.style.width=cv.scrollWidth+'px';svg.style.height=cv.scrollHeight+'px';
let lines='';
S.conns.forEach((conn,ci)=>{const srcEl=document.getElementById('blk-'+conn.src);const dstEl=document.getElementById('blk-'+conn.dst);
if(!srcEl||!dstEl)return;
const sr=srcEl.getBoundingClientRect();const dr=dstEl.getBoundingClientRect();
// Compute attachment fraction for src (bottom side) — distribute if multiple outgoing
const srcOutgoing=S.conns.filter(c=>c.src===conn.src).sort((a,b)=>{const da=S.blocks.find(x=>x.id===a.dst);const db=S.blocks.find(x=>x.id===b.dst);return(da?.gridPos?.col||0)-(db?.gridPos?.col||0)});
const srcIdx=srcOutgoing.indexOf(conn);
const srcFrac=srcOutgoing.length>1?(srcIdx+0.5)/srcOutgoing.length:0.5;
// Compute attachment fraction for dst (top side) — distribute if multiple incoming
const dstIncoming=S.conns.filter(c=>c.dst===conn.dst).sort((a,b)=>{const sa=S.blocks.find(x=>x.id===a.src);const sb=S.blocks.find(x=>x.id===b.src);return(sa?.gridPos?.col||0)-(sb?.gridPos?.col||0)});
const dstIdx=dstIncoming.indexOf(conn);
const dstFrac=dstIncoming.length>1?(dstIdx+0.5)/dstIncoming.length:0.5;
const sx=sr.left+sr.width*srcFrac-cvRect.left+cv.scrollLeft;
const sy=sr.top+sr.height-cvRect.top+cv.scrollTop;
const dx=dr.left+dr.width*dstFrac-cvRect.left+cv.scrollLeft;
const dy=dr.top-cvRect.top+cv.scrollTop;
// Right-angle path: down from source, horizontal at mid, down to destination
const midY=(sy+dy)/2;
const pathD='M '+sx+' '+sy+' L '+sx+' '+midY+' L '+dx+' '+midY+' L '+dx+' '+dy;
lines+='<path d="'+pathD+'" stroke="#2563eb" stroke-width="1.5" fill="none" />';
// Botão no meio do segmento horizontal: × (excluir conexão)
const mx=(sx+dx)/2;
lines+='<foreignObject x="'+(mx-7)+'" y="'+(midY-7)+'" width="14" height="14" style="pointer-events:all">'+
'<button class="conn-mid-del" title="Excluir esta conexão" onclick="rmConn('+ci+')" style="width:14px;height:14px;border-radius:50%;background:#dc2626;color:#fff;border:none;cursor:pointer;font-size:8px;display:flex;align-items:center;justify-content:center;padding:0;line-height:1">×</button>'+
'</foreignObject>'});
svg.innerHTML=lines}

function addBlk(){const n=document.getElementById('abN').value.trim().toUpperCase();if(!n)return;const tp=document.getElementById('abT').value;const v1=parseInt(document.getElementById('abV1').value)||0;const v2=tp==='TRAFO'?(parseInt(document.getElementById('abV2').value)||0):0;
if(S.blocks.find(b=>b.name===n&&b.seId===S.currentSE))return alert('Já existe nesta SE');
// Trafo: pedir kVA nominal
let kvaNom=0;
if(tp==='TRAFO'){const r=prompt('Potência nominal do transformador (kVA):','500');kvaNom=parseComma(r)||0}
S.blocks.push({id:'B'+(++bki),name:n,type:tp,v1,v2,seId:S.currentSE,kvaNominal:kvaNom});document.getElementById('abN').value='';
if(tp==='PAINEL'){let se=S.ses.find(s=>s.id===S.currentSE)||S.ses[0];if(!se){S.ses.push({id:++sei,name:'SE-GERAL',panels:[]});se=S.ses[0];S.currentSE=se.id}if(!se.panels.find(p=>p.name===n))se.panels.push({id:++pi,name:n,type:'CCM',voltStr:voltStrDe(v1),obs:'',loads:[]})}
rConnT2();rDiag()}
// Cor de carregamento para trafo (gradiente verde -> laranja -> vermelho)
function getTrafoLoadColor(pct){
// Faixas: 0-80% verde, 80-99% laranja, >=100% vermelho — com gradiente e transparência (alpha 0.35)
const A=0.18;
if(pct<0.80){// verde (gradiente do verde claro ao verde forte)
const t=Math.max(0,pct)/0.80;return interpColorA([134,239,172],[34,197,94],t,A)}
if(pct<1.0){// 80-99%: laranja (gradiente)
const t=(pct-0.80)/0.20;return interpColorA([254,215,170],[249,115,22],t,A)}
// >=100%: vermelho
const t=Math.min((pct-1.0)/0.5,1);return interpColorA([252,165,165],[220,38,38],t,A)}
function interpColorA(a,b,t,alpha){const r=Math.round(a[0]+(b[0]-a[0])*t);const g=Math.round(a[1]+(b[1]-a[1])*t);const bl=Math.round(a[2]+(b[2]-a[2])*t);return'rgba('+r+','+g+','+bl+','+alpha+')'}
function interpColor(a,b,t){const r=Math.round(a[0]+(b[0]-a[0])*t);const g=Math.round(a[1]+(b[1]-a[1])*t);const bl=Math.round(a[2]+(b[2]-a[2])*t);return'rgb('+r+','+g+','+bl+')'}
function askVoltage(defaultV,rotulo){const vlist=S.vl.map((v,i)=>(i+1)+') '+v.vs+'V').join('\n');
const r=prompt((rotulo||'Escolha a tensão do sistema:')+'\n'+vlist+'\n\nNúmero ou valor em V:',String(defaultV||S.vl[0]?.vs||480));
if(!r)return null;const n=parseInt(r);if(n>=1&&n<=S.vl.length)return S.vl[n-1].vs;return n||defaultV}

function addBlkToLevel(v,preferCol){const n=prompt('Nome:');if(!n)return;const nu=n.toUpperCase();if(S.blocks.find(b=>b.name===nu&&b.seId===S.currentSE))return alert('Já existe nesta SE');
const tp=prompt('Tipo (RECEB/PAINEL/TRAFO/GERADOR):','PAINEL')?.toUpperCase()||'PAINEL';let v2=0;if(tp==='TRAFO'){v2=askVoltage(0,'Informe a tensão SECUNDÁRIA do transformador:');if(v2===null)return}
const newBlk={id:'B'+(++bki),name:nu,type:tp,v1:v,v2,seId:S.currentSE};if(preferCol!==undefined)newBlk.gridPos={col:preferCol};
S.blocks.push(newBlk);
if(tp==='PAINEL'){let se=S.ses.find(s=>s.id===S.currentSE)||S.ses[0];if(!se){S.ses.push({id:++sei,name:'SE-GERAL',panels:[]});se=S.ses[0];S.currentSE=se.id}if(!se.panels.find(p=>p.name===nu))se.panels.push({id:++pi,name:nu,type:'CCM',voltStr:voltStrDe(v),obs:'',loads:[]})}
rConnT2();rDiag()}
function addFromPlus(bId,side){const src=S.blocks.find(b=>b.id===bId);if(!src)return;
// Só permite conectar com blocos da MESMA SE
const seBlocks=S.blocks.filter(b=>b.seId===S.currentSE);
const list='Blocos existentes nesta sala elétrica:\n'+seBlocks.map((b,i)=>(i+1)+'. '+b.name).join('\n')+'\n\nDigite NÚMERO para conectar ou NOVO NOME para criar:';
const resp=prompt(list);if(!resp)return;let targetId;
if(/^\d+$/.test(resp.trim())){const idx=parseInt(resp)-1;if(idx>=0&&idx<seBlocks.length)targetId=seBlocks[idx].id;else return}
else{const nu=resp.trim().toUpperCase();const ex=S.blocks.find(b=>b.name===nu&&b.seId===S.currentSE);if(ex){targetId=ex.id}else{
const tp=prompt('Tipo (RECEB/PAINEL/TRAFO/GERADOR):','PAINEL')?.toUpperCase()||'PAINEL';const v=askVoltage(src.v1)||src.v1;let v2=0;if(tp==='TRAFO'){v2=askVoltage(0,'Informe a tensão SECUNDÁRIA do transformador:');if(v2===null)return}
let kvaNom=0;if(tp==='TRAFO'){const r=prompt('Potência nominal do transformador (kVA):','500');kvaNom=parseComma(r)||0}
S.blocks.push({id:'B'+(++bki),name:nu,type:tp,v1:v,v2,seId:S.currentSE,kvaNominal:kvaNom});targetId='B'+bki;
if(tp==='PAINEL'){let se=S.ses.find(s=>s.id===S.currentSE)||S.ses[0];if(!se){S.ses.push({id:++sei,name:'SE-GERAL',panels:[]});se=S.ses[0];S.currentSE=se.id}if(!se.panels.find(p=>p.name===nu))se.panels.push({id:++pi,name:nu,type:'CCM',voltStr:voltStrDe(v),obs:'',loads:[]})}}}
if(!targetId)return;
// side top: target alimenta bId; side bottom: bId alimenta target — impede ciclo em ambos
if(side==='top'||side==='lft'){if(blockReaches(bId,targetId)){alert('Essa conexão criaria um ciclo. Cancelada.');return}if(!S.conns.some(c=>c.src===targetId&&c.dst===bId))S.conns.push({src:targetId,dst:bId})}
else{if(blockReaches(targetId,bId)){alert('Essa conexão criaria um ciclo. Cancelada.');return}if(!S.conns.some(c=>c.src===bId&&c.dst===targetId))S.conns.push({src:bId,dst:targetId})}
rConnT2();rDiag()}
function editBlk(id){const b=S.blocks.find(b=>b.id===id);if(!b)return;const nn=prompt('Nome:',b.name);if(nn?.trim())b.name=nn.trim().toUpperCase();
if(b.type==='TRAFO'){const v1=askVoltage(b.v1,'Tensão PRIMÁRIA do transformador '+b.name+':');if(v1)b.v1=v1;
const v2=askVoltage(b.v2,'Tensão SECUNDÁRIA do transformador '+b.name+':');if(v2)b.v2=v2;
const nom=prompt('Potência nominal do transformador (kVA):',String(b.kvaNominal||0));if(nom!==null){const nv=parseComma(nom);if(!isNaN(nv))b.kvaNominal=nv}}
else if(b.type==='GERADOR'){const v=askVoltage(b.v1);if(v)b.v1=v;
const nom=prompt('Potência nominal do gerador (kVA):',String(b.kvaNominal||0));if(nom!==null){const nv=parseComma(nom);if(!isNaN(nv))b.kvaNominal=nv}}
else if(b.type==='SAIDA'){const v=askVoltage(b.v1);if(v)b.v1=v;
const s=prompt('kVA demandado desta saída:',String(b.kvaSaida||0));if(s!==null){const sv=parseComma(s);if(!isNaN(sv))b.kvaSaida=sv}}
else{const v=askVoltage(b.v1);if(v)b.v1=v}
rConnT2();rDiag()}
function rmBlk(id){S.blocks=S.blocks.filter(b=>b.id!==id);S.conns=S.conns.filter(c=>c.src!==id&&c.dst!==id);rConnT2();rDiag()}
// Gera o próximo TAG sequencial livre a partir de um nome base (QD-01 -> QD-02 -> QD-03...)
function proximoTag(nome){const m=String(nome).match(/^(.*?)(\d+)(\D*)$/);
if(!m){// Sem número no fim: acrescenta -2, -3...
let n=2;while(S.blocks.some(b=>b.seId===S.currentSE&&b.name===nome+'-'+n))n++;return nome+'-'+n}
const prefixo=m[1],num=m[2],sufixo=m[3];const largura=num.length;
let n=parseInt(num,10);
for(let tent=0;tent<1000;tent++){n++;
const cand=prefixo+String(n).padStart(largura,'0')+sufixo;
if(!S.blocks.some(b=>b.seId===S.currentSE&&b.name===cand))return cand}
return nome+'-COPIA'}
// Duplica um bloco mantendo as características, posicionando ao lado (direita, senão esquerda)
function dupBlk(id){const orig=S.blocks.find(b=>b.id===id);if(!orig)return;
const novoNome=proximoTag(orig.name);
// A cópia não herda as conexões, então ocupa 1 espaço
const span=1;
// Colunas ocupadas por blocos da mesma faixa (mesma SE, mesma tensão e mesma profundidade)
const depths=calcDepths();const d=depths[orig.id]||0;
const irmaos=S.blocks.filter(b=>b.seId===orig.seId&&b.v1===orig.v1&&(depths[b.id]||0)===d);
const ocupado=new Set();
irmaos.forEach(b=>{if(b.gridPos?.col!==undefined){const s=Math.max(1,getSpan(b.id));for(let c=b.gridPos.col;c<b.gridPos.col+s;c++)ocupado.add(c)}});
const base=orig.gridPos?.col??0;
function livre(col,n){if(col<0)return false;for(let c=col;c<col+n;c++){if(ocupado.has(c))return false}return true}
// Procura espaço: primeiro à direita, depois à esquerda; se não houver, primeira coluna livre
let col=-1;
for(let c=base+span;c<base+span+BASE_COLS*2;c++){if(livre(c,span)){col=c;break}}
if(col<0){for(let c=base-span;c>=0;c--){if(livre(c,span)){col=c;break}}}
if(col<0){for(let c=0;c<BASE_COLS*3;c++){if(livre(c,span)){col=c;break}}}
if(col<0)col=base+span;
// Cópia com as mesmas características
const copia={...orig,id:'B'+(++bki),name:novoNome,gridPos:{col},lastMoved:Date.now()};
S.blocks.push(copia);
// Se for painel, cria o painel correspondente na SE com as mesmas características
if(orig.type==='PAINEL'){const se=S.ses.find(s=>s.id===orig.seId);
if(se){const pOrig=se.panels.find(p=>p.name===orig.name);
if(pOrig&&!se.panels.find(p=>p.name===novoNome)){
se.panels.push({id:++pi,name:novoNome,type:pOrig.type,voltStr:pOrig.voltStr,obs:pOrig.obs||'',loads:[]})}}}
rConnT2();rDiag()}
function rConnT2(){const tb=document.getElementById('connB');let h='';S.conns.forEach((c,i)=>{const sb=S.blocks.find(b=>b.id===c.src);const db=S.blocks.find(b=>b.id===c.dst);
// Só mostra conexões onde AMBOS os blocos estão na SE atual
if(!sb||!db||sb.seId!==S.currentSE||db.seId!==S.currentSE)return;
h+='<tr><td>'+X(sb.name||'?')+'</td><td>→</td><td>'+X(db.name||'?')+'</td><td><button class="crm" onclick="rmConn('+i+')">×</button></td></tr>'});tb.innerHTML=h}
function rmConn(i){S.conns.splice(i,1);rConnT2();rDiag()}

// ==================== P8 ====================
function getSorted(){return S.ses.map(se=>({...se,panels:[...se.panels].sort((a,b)=>(parseInt(a.voltStr)||0)-(parseInt(b.voltStr)||0))})).sort((a,b)=>{const va=Math.max(...a.panels.map(p=>parseInt(p.voltStr)||0),0);const vb=Math.max(...b.panels.map(p=>parseInt(p.voltStr)||0),0);return va-vb})}
function getFeed(pName){const blk=S.blocks.find(b=>b.name===pName);if(!blk)return'—';return S.conns.filter(c=>c.dst===blk.id).map(c=>{const sb=S.blocks.find(b=>b.id===c.src);return sb?(sb.name+(sb.type==='TRAFO'?' ('+sb.v1+'→'+sb.v2+'V)':'')):'?'}).join(', ')||'—'}
// Get load voltage based on classification: Motor=vm, Painel=vs
function getLoadV(voltStr,classe){const parts=String(voltStr||'').split('/');const vs=parts[0]||'';const vm=parts[1]||vs;return classe==='Motor'?vm+'V':vs+'V'}
// Helpers para cálculos de exportação
function calcKwDem(m){return calcKwAbsorvido(m)*fdDe(m)}
function calcKVArDem(m){const kvaDem=calcKVA(m)*fdDe(m);const kwDem=calcKwDem(m);const s=kvaDem*kvaDem-kwDem*kwDem;return s>0?Math.sqrt(s):0}
function calcCosphiGeral(kwDemTotal,kvaDemTotal){return kvaDemTotal>0?kwDemTotal/kvaDemTotal:0}
const EXPORT_COLS=['TAG PAINEL','TAG CARGA','DESCRIÇÃO','SITUAÇÃO','CLASSIFICAÇÃO','FUNCIONAMENTO','kW','kVA','TENSÃO','η','cosφ','In (A)','FATOR DE DEMANDA','kW DEMANDADO','kVAr DEMANDADO','kVA DEMANDADO','cosφ GERAL'];
const EXPORT_N=EXPORT_COLS.length;
// Larguras por coluna (px): descrição larga; numéricas estreitas
const EXPORT_COLW=[70,90,220,55,60,60,50,50,55,45,45,50,55,60,65,65,55];

// Ordem na exportação: MENOR tensão no topo, MAIOR embaixo.
// Dentro da mesma tensão, quem está a jusante (mais longe da fonte) vem primeiro,
// então um gerador a montante aparece sempre abaixo do painel que ele alimenta.
// Ordem na exportação:
// 1) nível de tensão — menor no topo, maior embaixo
// 2) equipamentos do MESMO TIPO ficam juntos; grupos mais a jusante vêm antes
//    (assim um gerador a montante continua abaixo do painel que ele alimenta)
// 3) dentro do mesmo tipo e tensão: ordem ALFABÉTICA (CM-02, CM-03, CM-04)
// Ordem na exportação:
//  1) nível de tensão — menor no topo, maior embaixo;
//  2) tipo — painéis, depois transformadores, depois geradores (assim um gerador a montante
//     fica sempre abaixo do painel que ele alimenta);
//  3) ordem alfabética dentro do mesmo tipo (CM-02, CM-03, CM-04...).
const ORDEM_TIPO={PAINEL:0,TRAFO:1,GERADOR:2,SAIDA:3,RECEB:4};
// Tensão de referência do bloco para ordenação/agrupamento.
// Transformador: vale a tensão SECUNDÁRIA, que é a que ele entrega ao restante da instalação.
// Painel: vale a tensão declarada na Sala Elétrica — assim painéis do mesmo nível ficam
// juntos mesmo que o bloco do diagrama esteja divergente.
function tensaoDoBloco(b){
if(b.type==='TRAFO'){const v2=parseInt(b.v2)||0;if(v2>0)return v2;return parseInt(b.v1)||0}
if(b.type==='PAINEL'){const se=S.ses.find(s=>s.id===b.seId);
const p=se&&se.panels.find(pp=>pp.name===b.name);
const v=p?parseInt(p.voltStr):NaN;
if(!isNaN(v)&&v>0)return v}
return parseInt(b.v1)||0}
function ordenarBlocosExport(lista,gd){
const prof=gd||calcGlobalDepths();
return [...lista].sort((a,b)=>{
// 1) Nível de tensão: menor em cima
const va=tensaoDoBloco(a),vb=tensaoDoBloco(b);
if(va!==vb)return va-vb;
// 2) Mesma tensão: quem está a JUSANTE vem primeiro.
// Assim os transformadores alimentados por um QD ficam acima dele,
// e um gerador a montante de um painel fica abaixo dele.
const da=prof[a.id]||0,db=prof[b.id]||0;
if(da!==db)return db-da;
// 3) Empate: agrupa por tipo e ordena pelo nome
const ta=ORDEM_TIPO[a.type]??9,tb=ORDEM_TIPO[b.type]??9;
if(ta!==tb)return ta-tb;
return String(a.name||'').localeCompare(String(b.name||''),'pt',{numeric:true,sensitivity:'base'})})}
function iP8(){
// RESUMO GERAL (topo) - todas as salas
// Equipamentos que entram no resumo: CHEGADA (RECEB) e SAÍDA são apenas informativos
const ehInformativo=b=>b.type==='RECEB'||b.type==='SAIDA';
// Demanda total de uma sala: soma os blocos "raiz" (que não são alimentados por outro da mesma SE)
function kvaDaSala(se){const gd=calcGlobalDepths();
const daSala=S.blocks.filter(b=>b.seId===se.id&&!ehInformativo(b));
const raizes=daSala.filter(b=>!S.conns.some(c=>c.dst===b.id&&daSala.some(x=>x.id===c.src)));
return raizes.reduce((s,b)=>s+getTotalKVA(b.id),0)}
let h='<h3 style="font-size:10px;margin-bottom:3px">Resumo geral (potências em kVA)</h3>';
// Linha GERAL do projeto
const nomesSE=S.ses.map(s=>s.name);
const totalGeral=S.ses.reduce((s,se)=>s+kvaDaSala(se),0);
h+='<p class="res-geral">⚡ GERAL'+(nomesSE.length?' ('+X(nomesSE.join(' + '))+')':'')+' — '+fmt(totalGeral,1)+' kVA demandados</p>';
S.ses.forEach(se=>{h+='<p style="font-size:9px;font-weight:600;margin-top:4px">⚡ '+X(se.name)+' — '+fmt(kvaDaSala(se),1)+' kVA</p>';
const gd2=calcGlobalDepths();const seBlks=S.blocks.filter(b=>b.seId===se.id&&!ehInformativo(b)).sort((a,b)=>{const da=gd2[a.id]||0;const db=gd2[b.id]||0;if(da!==db)return db-da;return(parseInt(a.v1)||0)-(parseInt(b.v1)||0)});
if(!seBlks.length)h+='<p style="font-size:8px;color:var(--mu);margin-left:12px">• (sem equipamentos)</p>';
seBlks.forEach(blk=>{const tk=getTotalKVA(blk.id);const vt=blk.type==='TRAFO'?blk.v1+'V→'+blk.v2+'V':blk.v1+'V';h+='<p style="font-size:8px;color:var(--mu);margin-left:12px">• '+X(blk.type)+' '+X(blk.name)+' — '+vt+' — '+fmt(tk,1)+' kVA'+((blk.type==='TRAFO'||blk.type==='GERADOR')&&blk.kvaNominal>0?' / '+fmt(blk.kvaNominal,0)+' kVA nom. ('+Math.round(tk/blk.kvaNominal*100)+'%)':'')+'</p>'})});
document.getElementById('eS').innerHTML=h;

// Popular seletor de SE
const sel=document.getElementById('expSeSelect');
if(sel){sel.innerHTML=S.ses.map(se=>'<option value="'+se.id+'">'+X(se.name)+'</option>').join('');
if(!window._expSE||!S.ses.find(s=>s.id===window._expSE))window._expSE=S.ses[0]?.id;
sel.value=window._expSE}
renderExpSE()}

function onExpSEChange(id){window._expSE=parseInt(id);renderExpSE()}

function renderExpSE(){const se=S.ses.find(s=>s.id===window._expSE);if(!se){document.getElementById('ePrev').innerHTML='';return}
let pv='<div class="export-page" style="border:2px solid #4338ca;border-radius:6px;padding:12px;margin-bottom:16px;background:#fff">';
pv+='<h3 style="font-size:12px;margin:0 0 8px;padding:6px 10px;background:#eef2ff;color:#4338ca;border-radius:3px">📋 SALA ELÉTRICA: '+X(se.name)+(se.obs?' — '+X(se.obs):'')+'</h3>';
const gd=calcGlobalDepths();const seBlks=ordenarBlocosExport(S.blocks.filter(b=>b.seId===se.id&&b.type!=='RECEB'),gd);
if(!seBlks.length){pv+='<p style="font-size:9px;color:var(--mu);margin-left:8px">Nenhum equipamento nesta SE.</p></div>';document.getElementById('ePrev').innerHTML=pv;return}
// colgroup para larguras
const colGroup='<colgroup>'+EXPORT_COLW.map(w=>'<col style="width:'+w+'px">').join('')+'</colgroup>';
const totalW=EXPORT_COLW.reduce((a,b)=>a+b,0);
seBlks.forEach(blk=>{const tk=getTotalKVA(blk.id);const vt=blk.type==='TRAFO'?blk.v1+'V → '+blk.v2+'V':blk.v1+'V';
const feed=getFeed(blk.name);
const bgColor=blk.type==='TRAFO'?'#fffbeb':blk.type==='GERADOR'?'#ecfdf5':'#f5f3ff';
const txtColor=blk.type==='TRAFO'?'var(--wn)':blk.type==='GERADOR'?'var(--ok)':'#6d28d9';
pv+='<div class="pw" style="margin-bottom:6px;overflow-x:auto"><table class="pt exp-table" style="width:'+totalW+'px;table-layout:fixed">'+colGroup+'<thead><tr><th colspan="'+EXPORT_N+'" style="background:'+bgColor+';color:'+txtColor+'">'+X(blk.type)+': '+X(blk.name)+' — '+vt+(blk.type==='TRAFO'&&blk.kvaNominal>0?' — '+fmt(blk.kvaNominal,0)+' kVA nom.':'')+'</th></tr><tr>'+EXPORT_COLS.map(c=>'<th style="font-size:7px">'+c+'</th>').join('')+'</tr></thead><tbody>';
const rows=[];let totalKwDem=0,totalKvaDem=0,totalKvArDem=0;
if(blk.type==='PAINEL'){const p=se.panels.find(pp=>pp.name===blk.name);
if(p)p.loads.forEach(i=>{const m=S.mp[i];if(m){
const kva=calcKVA(m);const kwDem=calcKwDem(m);const kvaDem=kva*fdDe(m);const kvarDem=calcKVArDem(m);const iN=calcIEmPainel(m,p.voltStr);const vCarga=tensaoNoPainel(m,p.voltStr);
totalKwDem+=kwDem;totalKvaDem+=kvaDem;totalKvArDem+=kvarDem;
rows.push([blk.name,m.tag,m.desc,m.situacao||'N',m.classe||'M',m.funcionamento||'N',fmt(m.kw,2),fmt(kva,2),fmt(vCarga,0)+'V',fmt(m.rend||0,3),fmt(m.fp||0,3),fmt(iN,1),fmt(fdDe(m),2),fmt(kwDem,2),fmt(kvarDem,2),fmt(kvaDem,2),'-'])
}})}
const ds=S.conns.filter(c=>c.src===blk.id);
ds.forEach(c=>{const db=S.blocks.find(bb=>bb.id===c.dst);if(db){const dsKVA=getTotalKVA(db.id);const dsV=db.type==='TRAFO'?db.v1+'→'+db.v2+'V':db.v1+'V';
totalKvaDem+=dsKVA;const estKwDem=dsKVA*0.85;totalKwDem+=estKwDem;const estKvarDem=Math.sqrt(Math.max(0,dsKVA*dsKVA-estKwDem*estKwDem));totalKvArDem+=estKvarDem;
rows.push([blk.name,db.name,db.type,'-','P','-','-','-',dsV,'-','-','-','-',fmt(estKwDem,2),fmt(estKvarDem,2),fmt(dsKVA,2),'-'])}});
rows.forEach(r=>{pv+='<tr>'+r.map((c,ci)=>'<td'+(ci===2?' class="desc-cell"':'')+'>'+X(String(c))+'</td>').join('')+'</tr>'});
const cosG=calcCosphiGeral(totalKwDem,totalKvaDem);
pv+='<tr style="font-weight:600;background:#f1f3f7"><td></td><td></td><td>Total '+X(blk.name)+'</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td><td>'+fmt(totalKwDem,2)+'</td><td>'+fmt(totalKvArDem,2)+'</td><td>'+fmt(totalKvaDem,2)+'</td><td style="color:var(--ac);font-weight:700">'+fmt(cosG,3)+'</td></tr>';
pv+='<tr style="background:#e0e7ff;font-weight:600;color:#3730a3"><td colspan="'+EXPORT_N+'" style="text-align:left;padding:4px">⚡ ALIMENTAÇÃO: '+X(feed)+'</td></tr>';
pv+='</tbody></table></div>'});
pv+='</div>';
document.getElementById('ePrev').innerHTML=pv}

function autoWidths(data,minW,maxW){const widths=[];data.forEach(row=>{if(!Array.isArray(row))return;row.forEach((cell,i)=>{const len=String(cell??'').length;if(!widths[i]||len>widths[i])widths[i]=len})});return widths.map(w=>({wch:Math.min(Math.max((w||0)+2,minW||8),maxW||60)}))}

function eX(){const wb=XLSX.utils.book_new();
// Aba Diagrama
const connData=[['DIAGRAMA DE BLOCOS'],[],['SE','BLOCO','TIPO','TENSÃO','ALIMENTADO POR','ALIMENTA','kVA dem. ACUMULADO','kVA NOMINAL','CARREGAMENTO %']];
const sortedBlks=[...S.blocks].sort((a,b)=>{const sa=S.ses.find(s=>s.id===a.seId);const sb=S.ses.find(s=>s.id===b.seId);const na=sa?sa.name:'';const nb=sb?sb.name:'';if(na!==nb)return na.localeCompare(nb);return(a.v1||0)-(b.v1||0)});
sortedBlks.forEach(blk=>{const se=S.ses.find(s=>s.id===blk.seId);const seName=se?se.name:'—';
const feedNames=S.conns.filter(c=>c.dst===blk.id).map(c=>{const sb=S.blocks.find(b=>b.id===c.src);return sb?sb.name:'?'}).join(', ');
const outNames=S.conns.filter(c=>c.src===blk.id).map(c=>{const db=S.blocks.find(b=>b.id===c.dst);return db?db.name:'?'}).join(', ');
const vTxt=blk.type==='TRAFO'?blk.v1+'V → '+blk.v2+'V':blk.v1+'V';const tk=getTotalKVA(blk.id);
const nom=blk.kvaNominal||'';const carga=blk.kvaNominal>0?Math.round((tk/blk.kvaNominal)*100)+'%':'';
connData.push([seName,blk.name,blk.type,vTxt,feedNames||'—',outNames||'—',tk,nom,carga])});
const connWs=XLSX.utils.aoa_to_sheet(connData);connWs['!cols']=autoWidths(connData,10,40);
XLSX.utils.book_append_sheet(wb,connWs,'Diagrama');

// Uma aba por SE — ordem definitiva de colunas
S.ses.forEach(se=>{const d=[[se.name+(se.obs?' — '+se.obs:'')],[]];
const gd=calcGlobalDepths();const seBlks=ordenarBlocosExport(S.blocks.filter(b=>b.seId===se.id&&b.type!=='RECEB'),gd);
if(!seBlks.length){d.push(['(Nenhum equipamento)'])}
seBlks.forEach(blk=>{const feed=getFeed(blk.name);const tk=getTotalKVA(blk.id);const vTxt=blk.type==='TRAFO'?blk.v1+'V → '+blk.v2+'V':blk.v1+'V';
// Cabeçalho do bloco
const hdrExtra=blk.type==='TRAFO'&&blk.kvaNominal>0?(' — '+blk.kvaNominal+' kVA nom.'):'';
d.push([blk.type+': '+blk.name,'TIPO: '+blk.type,'TENSÃO: '+vTxt+hdrExtra]);
d.push(EXPORT_COLS);

let totalKwDem=0,totalKvaDem=0,totalKvArDem=0;
if(blk.type==='PAINEL'){const p=se.panels.find(pp=>pp.name===blk.name);
if(p)p.loads.forEach(i=>{const m=S.mp[i];if(m){
const kva=calcKVA(m);const kwDem=calcKwDem(m);const kvaDem=kva*fdDe(m);const kvarDem=calcKVArDem(m);const iN=calcIEmPainel(m,p.voltStr);const vCarga=tensaoNoPainel(m,p.voltStr);
totalKwDem+=kwDem;totalKvaDem+=kvaDem;totalKvArDem+=kvarDem;
d.push([blk.name,m.tag,m.desc,m.situacao||'N',m.classe||'M',m.funcionamento||'N',m.kw,kva,vCarga+'V',m.rend||0,m.fp||0,iN,fdDe(m),kwDem,kvarDem,kvaDem,'-'])
}})}
const ds=S.conns.filter(c=>c.src===blk.id);
ds.forEach(c=>{const db=S.blocks.find(bb=>bb.id===c.dst);if(db){const dsKVA=getTotalKVA(db.id);const dsV=db.type==='TRAFO'?db.v1+'→'+db.v2+'V':db.v1+'V';
totalKvaDem+=dsKVA;const estKwDem=dsKVA*0.85;totalKwDem+=estKwDem;const estKvarDem=Math.sqrt(Math.max(0,dsKVA*dsKVA-estKwDem*estKwDem));totalKvArDem+=estKvarDem;
d.push([blk.name,db.name,db.type,'-','P','-','-','-',dsV,'-','-','-','-',estKwDem,estKvarDem,dsKVA,'-'])}});
// TOTAL com cosφ GERAL
const cosG=calcCosphiGeral(totalKwDem,totalKvaDem);
d.push(['','','Total '+blk.name,'-','-','-','-','-','-','-','-','-','-',totalKwDem,totalKvArDem,totalKvaDem,cosG]);
// Alimentador
d.push(['⚡ ALIMENTAÇÃO: '+feed]);
d.push([])});
const ws=XLSX.utils.aoa_to_sheet(d);ws['!cols']=autoWidths(d,10,25);
XLSX.utils.book_append_sheet(wb,ws,se.name.replace(/[\\\/\*\?\[\]:]/g,'_').substring(0,31))});

XLSX.writeFile(wb,'Estudo_de_Demanda.xlsx')}

// ===== Salvamento automático: envolve as funções que alteram o estudo =====
(function(){
const alvos=['rConf','rPN','rDiag','rConnT2','rVL','rCL'];
alvos.forEach(nome=>{const orig=window[nome];
if(typeof orig!=='function')return;
window[nome]=function(){const r=orig.apply(this,arguments);agendarSalvamento();return r}});
})();
