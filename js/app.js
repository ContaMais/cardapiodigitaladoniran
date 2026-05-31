// Variáveis para armazenar os dados
let grupos = {};
let itens = {};
let viewMode = 'list'; // Estado de visualização: lista ou grid

const cardapioContainer = document.getElementById('container-cardapio');
const splashBg = document.getElementById('splash-bg');
const splashBands = document.getElementById('splash-bands');

// Estado inicial de carregamento
function mostrarMensagemCarregando() {
    if (cardapioContainer) {
        cardapioContainer.innerHTML = `<div class="cardapio-loading">Carregando cardápio...</div>`;
    }
}

function ocultarSplash() {
    if (splashBg) {
        splashBg.style.opacity = '0';
        splashBg.style.display = 'none';
    }
    if (splashBands) {
        splashBands.style.display = 'none';
    }
}

// MAPA DE PALAVRAS-CHAVE PARA ÍCONES (Para combinar com os nomes dos grupos)
const iconesPorPalavraChave = {
    'CERVEJA': 'ph ph-beer-mug',
    'CHOPP': 'ph ph-beer-stein',
    'DRINK': 'ph ph-cocktail',
    'COQUETEL': 'ph ph-martini-glass',
    'VINHO': 'ph ph-wine-glass',
    'WHISKY': 'ph ph-whiskey-glass',
    'ENTRADA': 'ph ph-chats-circle',
    'PETISCO': 'ph ph-cookie',
    'PORÇÃO': 'ph ph-tray',
    'BURGER': 'ph ph-hamburger',
    'LANCHE': 'ph ph-sandwich',
    'REFEIÇÃO': 'ph ph-fork-knife',
    'COMIDA': 'ph ph-pizza-slice',
    'SOBREMESA': 'ph ph-cake',
    'SUCO': 'ph ph-drop',
    'REFRIGERANTE': 'ph ph-soda-bottle',
    'DIVERSOS': 'ph ph-confetti',
    // Padrão caso não ache palavra-chave
    'DEFAULT': 'ph ph-circles-four'
};

// Conjunto para rastrear ícones usados e evitar repetição direta
let iconesUsados = new Set();

// FUNÇÃO PARA DETERMINAR O ÍCONE DO GRUPO (Tenta não repetir)
function obterIconeDoGrupo(nomeGrupo) {
    const nomeUp = (nomeGrupo || '').toUpperCase();
    let classIcone = '';

    // Tenta achar palavra-chave no nome do grupo
    for (const [palavra, icone] of Object.entries(iconesPorPalavraChave)) {
        if (nomeUp.includes(palavra)) {
            classIcone = icone;
            break; // Achou o primeiro que combina, para
        }
    }

    // Se não achou em mapa, usa o padrão
    if (!classIcone) {
        classIcone = iconesPorPalavraChave.DEFAULT;
    }

    return `<i class="${classIcone}"></i>`;
}

// Conecta no Firebase na aba 'cardapio' (APENAS LEITURA)
db.ref('cardapio').on('value', snapshot => {
    const cardapio = snapshot.val() || {};
    grupos = cardapio.grupos || {};
    itens = cardapio.itens || {};
    renderizarCardapio();
    ocultarSplash();
});

// MOTOR DE RENDERIZAÇÃO MASTER DO CARDÁPIO DIGITAL (CLIENTE)
function renderizarCardapio() {
    const container = document.getElementById('container-cardapio');
    if(!container) return;
    const chavesGrupos = Object.keys(grupos);
    const itensPorGrupo = Object.keys(itens).reduce((acum, ik) => {
        const item = itens[ik];
        if (!item || !item.idGrupo || item.oculto) return acum;
        if (!acum[item.idGrupo]) acum[item.idGrupo] = [];
        acum[item.idGrupo].push({ ...item, id: ik });
        return acum;
    }, {});

    // Reseta ícones usados a cada renderização
    iconesUsados.clear();

    const toolbarHTML = `
        <div class="cardapio-controls">
            <button id="toggleViewBtn" class="btn-toggle-view" type="button" onclick="toggleViewMode()">${viewMode === 'list' ? 'Alternar Visualização' : 'Voltar para Lista'}</button>
            <span id="viewModeLabel">Modo: ${viewMode === 'list' ? 'Lista' : 'Cards'}</span>
        </div>
    `;

    if (chavesGrupos.length === 0) {
        container.innerHTML = toolbarHTML + `<div style="text-align:center; padding: 40px; color: #64748b; font-style:italic;">Nenhum item disponível no momento.</div>`;
        return;
    }

    let html = '';

    // Organiza os grupos pela ORDEM (peso numérico) em vez de ordem alfabética
    chavesGrupos.sort((a,b) => {
        let ordemA = grupos[a].ordem || 0;
        let ordemB = grupos[b].ordem || 0;
        if (ordemA === ordemB) {
            let nomeA = grupos[a].nome || '';
            let nomeB = grupos[b].nome || '';
            return nomeA.localeCompare(nomeB);
        }
        return ordemA - ordemB;
    }).forEach(gk => {
        const grupo = grupos[gk];
        
        // Pega os itens desse grupo
        const itensDoGrupo = itensPorGrupo[gk] || [];
        
        // Só desenha o grupo se ele tiver pelo menos 1 item cadastrado
        if (itensDoGrupo.length > 0) {
            
            // Pega o ícone que combina (Traz bold e sem repetição direta se possível)
            const iconeHTML = obterIconeDoGrupo(grupo.nome);

            // A JANELA QUADRADA DO GRUPO (Cartão Principal Escuro)
            html += `
                <div class="grupo-container">
                    
                    <div class="grupo-header">
                        ${iconeHTML}
                        <span class="grupo-titulo-texto">${grupo.nome}</span>
                    </div>

                    <div class="produtos-lista ${viewMode === 'grid' ? 'grid-view' : 'list-view'}">
            `;

            // Organiza os itens pela ORDEM (peso numérico) em vez de ordem alfabética
            itensDoGrupo.sort((a,b) => {
                let ordemA = a.ordem || 0;
                let ordemB = b.ordem || 0;
                if (ordemA === ordemB) {
                    return (a.nome || '').localeCompare(b.nome || '');
                }
                return ordemA - ordemB;
            }).forEach(item => {
                
                // Trata a imagem (Se não tiver foto, não mostra o espaço vazio)
                let fotoHTML = item.foto 
                    ? `<img src="${item.foto}" class="produto-foto" alt="${item.nome}" loading="lazy">` 
                    : '';

                // A JANELINHA DO PRODUTO (Fina e escura adaptada para a nova classe)
                const cardFoto = item.foto ? `<img src="${item.foto}" class="produto-foto" alt="${item.nome}" loading="lazy">` : '';
                const cardInfo = `
                    <div class="produto-info">
                        <div>
                            <div class="produto-nome">${item.nome}</div>
                            ${item.descricao ? `<div class="produto-desc">${item.descricao}</div>` : ''}
                        </div>
                        <div class="produto-preco">R$ ${Number(item.preco || 0).toFixed(2).replace('.', ',')}</div>
                    </div>
                `;

                html += `
                    <div class="produto-card${viewMode === 'grid' ? ' card-grid' : ''}" onclick="abrirDetalheProduto('${item.id}')" style="cursor: pointer;">
                        ${cardFoto}
                        ${cardInfo}
                    </div>
                `;
            });

            // Fecha as divs do grupo
            html += `
                    </div> </div> `;
        }
    });

    container.innerHTML = toolbarHTML + html;
}

function toggleViewMode() {
    viewMode = viewMode === 'list' ? 'grid' : 'list';
    renderizarCardapio();
}

// ==========================================
// TELA DE DETALHE DO PRODUTO
// ==========================================
function abrirDetalheProduto(ik) {
    const item = itens[ik];
    if(!item) return;

    // 1. Lógica de fotos: Usa a Exibição, se não existir usa a Miniatura
    const fotoParaExibir = item.fotoExibicao || item.foto;
    const fotoContainer = document.getElementById('detalhe-foto-container');
    
    if (fotoParaExibir) {
        fotoContainer.innerHTML = `
            <img src="${fotoParaExibir}" class="detalhe-foto" loading="lazy">
            <div class="foto-overlay-gradient"></div>
        `;
    } else {
        fotoContainer.innerHTML = `
            <div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center;">
                <i class="ph ph-image" style="font-size: 5rem; color: rgba(251, 238, 227, 0.1);"></i>
            </div>
            <div class="foto-overlay-gradient"></div>
        `;
    }

    // 2. Preenche os textos com proteção contra campos vazios
    document.getElementById('detalhe-nome').innerText = item.nome || '';
    document.getElementById('detalhe-preco').innerText = `R$ ${Number(item.preco || 0).toFixed(2).replace('.', ',')}`;
    document.getElementById('detalhe-desc').innerText = item.descricao || "Sem descrição adicional.";

    // 3. Oculta o cardápio e mostra a nova tela
    document.querySelector('.header-topo').style.display = 'none';
    document.getElementById('container-cardapio').style.display = 'none';
    document.getElementById('tela-detalhe-produto').style.display = 'flex';
    window.scrollTo(0, 0);
}

function fecharDetalheProduto() {
    // Esconde a tela de detalhes
    document.getElementById('tela-detalhe-produto').style.display = 'none';
    
    // Devolve o cardápio para a tela
    document.querySelector('.header-topo').style.display = 'flex';
    document.getElementById('container-cardapio').style.display = 'block';
}

// ==========================================
// CONTROLE DO SPLASH SCREEN
// ==========================================
window.addEventListener('load', () => {
    mostrarMensagemCarregando();

    // Deixa a logo aparecer e estabilizar (1.2s de tempo). Dispara as faixas depois disso.
    setTimeout(() => {
        if (splashBands) splashBands.classList.add('bands-animate');
    }, 1200);

    // Desvanece o fundo do splash depois da animação.
    setTimeout(() => {
        if (splashBg) splashBg.style.opacity = '0';
    }, 1920);
});