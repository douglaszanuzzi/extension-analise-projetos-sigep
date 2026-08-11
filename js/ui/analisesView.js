import { Logger } from "../core/logger.js";

const PALETA_CORES = [
    { bg: "#EBF5FB", text: "#1d4f8f", border: "#1d4f8f" },
    { bg: "#E0F2E0", text: "#0d9488", border: "#0d9488" },
    { bg: "#FEF3C7", text: "#b45309", border: "#b45309" },
    { bg: "#FCE7F3", text: "#be185d", border: "#be185d" },
    { bg: "#EDE9FE", text: "#6d28d9", border: "#6d28d9" }
];

function obterCorAnalista(indice) {
    return PALETA_CORES[(indice >= 0 ? indice : 0) % PALETA_CORES.length];
}

function obterAnalistaSelecionado() {
    const filtro = document.getElementById("filtroAnalista");
    return filtro?.value || "";
}

function mostrarMensagem(mensagem) {
    const msg = document.getElementById("mensagem");
    if (msg) {
        msg.textContent = mensagem;
        msg.classList.add("visivel");
    }
}

function traduzirErro(texto) {
    if (!texto) return "Erro desconhecido.";
    if (texto.includes("Nao foi possivel comunicar")) {
        return "Nao foi possivel comunicar com a pagina do SIGEP. Verifique se ela esta aberta e tente novamente.";
    }
    if (texto.includes("Tempo limite aguardando resposta")) {
        return "Tempo limite aguardando resposta do SIGEP. Tente novamente.";
    }
    if (texto.includes("Tabela de analises nao encontrada")) {
        return "Tabela de analises nao encontrada. Abra a tela da fila de analises de Obras do SIGEP.";
    }
    return texto || "Nao foi possivel concluir a acao. Tente novamente.";
}

function renderizarAnalises(analises, analistas = []) {
    const tbody = document.querySelector("#tblAnalises tbody");
    if (!tbody) {
        mostrarMensagem("Tabela da extensao nao encontrada.");
        return;
    }
    tbody.innerHTML = "";
    const analistaSelecionado = obterAnalistaSelecionado();
    const filtradas = analistaSelecionado
        ? analises.filter(item => item.responsavel === analistaSelecionado)
        : analises;

    if (filtradas.length === 0) {
        mostrarMensagem("Nenhuma analise encontrada para esse filtro.");
        return;
    }

    filtradas.forEach(item => {
        const tr = document.createElement("tr");
        if (item.responsavel) {
            const indice = analistas.indexOf(item.responsavel);
            const cor = obterCorAnalista(indice);
            tr.style.background = cor.bg;
        }

        [item.proprietario, item.area, item.usoImovel, item.tipo].forEach(valor => {
            const td = document.createElement("td");
            td.textContent = valor || "";
            tr.appendChild(td);
        });

        const tdResponsavel = document.createElement("td");
        tdResponsavel.textContent = item.responsavel || "";
        if (item.responsavel) {
            const indice = analistas.indexOf(item.responsavel);
            const cor = obterCorAnalista(indice);
            tdResponsavel.style.color = cor.text;
            tdResponsavel.style.fontWeight = "bold";
        }
        tr.appendChild(tdResponsavel);

        // Celula de acoes — apenas UMA declaracao de tdAcao e botaoAbrir
        const tdAcao = document.createElement("td");
        const botaoAbrir = document.createElement("button");
        botaoAbrir.type = "button";
        botaoAbrir.className = "btnAbrirObra";
        botaoAbrir.textContent = "Acessar";
        botaoAbrir.disabled = !item.urlObra;
        botaoAbrir.addEventListener("click", () => {
            if (!item.urlObra) return;
            try {
                const resultado = chrome.tabs.create({ url: item.urlObra });
                if (resultado?.catch) {
                    resultado.catch(erro => {
                        Logger.error("Falha ao abrir obra.", erro);
                        mostrarMensagem("Nao foi possivel abrir a analise.");
                    });
                }
            } catch (erro) {
                Logger.error("Falha ao abrir obra.", erro);
                mostrarMensagem("Nao foi possivel abrir a analise.");
            }
        });
        tdAcao.appendChild(botaoAbrir);
        tr.appendChild(tdAcao);
        tbody.appendChild(tr);
    });
}

function contarPorResponsavel(analises) {
    return analises.reduce((totais, item) => {
        const responsavel = item.responsavel || "Sem responsavel";
        totais[responsavel] = (totais[responsavel] || 0) + 1;
        return totais;
    }, {});
}

function popularFiltroAnalistas(analistas = []) {
    const select = document.getElementById("filtroAnalista");
    if (!select) return;
    const valorAtual = select.value;
    select.innerHTML = '<option value="">Todos</option>';
    analistas.forEach(nome => {
        const option = document.createElement("option");
        option.value = nome;
        option.textContent = nome;
        select.appendChild(option);
    });
    if (valorAtual && analistas.includes(valorAtual)) {
        select.value = valorAtual;
    }
}

function popularLegendaAnalistas(analistas = []) {
    const container = document.querySelector(".legenda");
    if (!container) return;
    container.innerHTML = "";
    analistas.forEach((nome, indice) => {
        const cor = obterCorAnalista(indice);
        const span = document.createElement("span");
        const marcador = document.createElement("i");
        marcador.className = "marcador";
        marcador.style.background = cor.bg;
        marcador.style.border = `1px solid ${cor.border}`;
        span.appendChild(marcador);
        span.appendChild(document.createTextNode(nome));
        container.appendChild(span);
    });
}

function popularDashboardAnalistas(analistas = []) {
    const container = document.querySelector(".resumo");
    if (!container) return;
    const primeiroFilho = container.firstElementChild;
    container.innerHTML = "";
    if (primeiroFilho) container.appendChild(primeiroFilho);
    analistas.forEach(nome => {
        const indice = analistas.indexOf(nome);
        const cor = obterCorAnalista(indice);
        const item = document.createElement("div");
        item.className = "resumoItem";
        item.style.borderColor = cor.border;
        const span = document.createElement("span");
        span.textContent = nome;
        const strong = document.createElement("strong");
        strong.id = `total${nome.replace(/\s+/g, "")}`;
        strong.textContent = "0";
        item.appendChild(span);
        item.appendChild(strong);
        container.appendChild(item);
    });
}

function atualizarDashboard(totaisPorResponsavel, totalSemAnalise) {
    const totalPendentes = document.getElementById("totalPendentes");
    if (totalPendentes) {
        totalPendentes.textContent = totalSemAnalise || 0;
    }
    Object.entries(totaisPorResponsavel).forEach(([nome, quantidade]) => {
        const elementoId = `total${nome.replace(/\s+/g, "")}`;
        const elemento = document.getElementById(elementoId);
        if (elemento) {
            elemento.textContent = quantidade;
        }
    });
}

export {
    obterAnalistaSelecionado,
    mostrarMensagem,
    traduzirErro,
    renderizarAnalises,
    contarPorResponsavel,
    popularFiltroAnalistas,
    popularLegendaAnalistas,
    popularDashboardAnalistas,
    atualizarDashboard
};