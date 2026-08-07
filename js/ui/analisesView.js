import { Logger } from "../core/logger.js";
import { safeSendMessage } from "../core/chromeMessaging.js";

function obterAnalistaSelecionado() {
    const filtro = document.getElementById("filtroAnalista");
    return filtro?.value || "";
}

function mostrarMensagem(mensagem) {
    const tbody = document.querySelector("#tblAnalises tbody");
    const elementoMensagem = document.getElementById("mensagem");
    if (elementoMensagem) {
        elementoMensagem.textContent = mensagem;
        elementoMensagem.classList.add("visivel");
    }
    if (tbody) {
        tbody.innerHTML = "";
    }
}

function traduzirErro(mensagem = "") {
    const texto = String(mensagem || "");
    if (texto.includes("Receiving end does not exist") || texto.includes("Could not establish connection")) {
        return "Nao foi possivel comunicar com a pagina do BSIT. Verifique se ela esta aberta e tente novamente.";
    }
    if (texto.includes("Tempo limite aguardando resposta")) {
        return "A pagina do BSIT demorou para responder. Recarregue a pagina e tente novamente.";
    }
    if (texto.includes("nao pertence ao BSIT")) {
        return "Abra uma pagina do BSIT para executar esta acao.";
    }
    if (texto.includes("No tab with id") || texto.includes("Tabs cannot be edited")) {
        return "A aba do BSIT nao esta mais disponivel. Abra a pagina novamente e tente outra vez.";
    }
    if (texto.includes("Tabela principal")) {
        return "Tabela de analises nao encontrada. Abra a tela da fila de analises de Obras do SIGEP.";
    }
    return texto || "Nao foi possivel concluir a acao. Tente novamente.";
}

function renderizarAnalises(analises) {
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
    filtradas.forEach(item => {
        const tr = document.createElement("tr");
        if (item.responsavel) {
            tr.classList.add(`linha-${item.responsavel.toLowerCase()}`);
        }
        [item.proprietario, item.area, item.usoImovel, item.tipo].forEach(valor => {
            const td = document.createElement("td");
            td.textContent = valor || "";
            tr.appendChild(td);
        });
        const tdResponsavel = document.createElement("td");
        tdResponsavel.textContent = item.responsavel || "";
        if (item.responsavel) {
            tdResponsavel.classList.add("responsavel");
        }
        tr.appendChild(tdResponsavel);
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

export {
    obterAnalistaSelecionado,
    mostrarMensagem,
    traduzirErro,
    renderizarAnalises,
    contarPorResponsavel
};