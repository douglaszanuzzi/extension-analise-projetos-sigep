import { Logger } from "../core/logger.js";

let ultimasAnalises = [];

function obterAnalistaSelecionado() {

    const filtro =
        document.getElementById("filtroAnalista");

    return filtro?.value || "";

}

function mostrarMensagem(mensagem) {

    const elementoMensagem =
        document.getElementById("mensagem");

    const tbody =
        document.querySelector(
            "#tblAnalises tbody"
        );

    elementoMensagem.textContent = mensagem;
    elementoMensagem.classList.add("visivel");

    tbody.innerHTML = "";

}

function esconderMensagem() {

    const elementoMensagem =
        document.getElementById("mensagem");

    elementoMensagem.textContent = "";
    elementoMensagem.classList.remove("visivel");

}

function traduzirErro(mensagem) {

    if (mensagem.includes("Receiving end does not exist")) {

        return "Abra a tela de analises do BSIT, recarregue a pagina e tente novamente.";

    }

    if (mensagem.includes("Tabela principal")) {

        return "Tabela de analises nao encontrada. Abra a tela da fila de analises do BSIT.";

    }

    return mensagem;

}

function renderizarAnalises(analises) {

    const tbody =
        document.querySelector(
            "#tblAnalises tbody"
        );

    tbody.innerHTML = "";

    const analistaSelecionado =
        obterAnalistaSelecionado();

    const filtradas = analistaSelecionado
        ? analises.filter(
            item => item.responsavel === analistaSelecionado
        )
        : analises;

    if (!filtradas.length) {

        mostrarMensagem(
            "Nenhuma analise encontrada para este filtro."
        );

        return;

    }

    esconderMensagem();

    filtradas.forEach(item => {

        const tr =
            document.createElement("tr");

        if (item.responsavel) {

            tr.classList.add(
                `linha-${item.responsavel.toLowerCase()}`
            );

        }

        [
            item.proprietario,
            item.area,
            item.usoImovel,
            item.tipo
        ].forEach(valor => {

            const td =
                document.createElement("td");

            td.textContent = valor || "";

            tr.appendChild(td);

        });

        const tdResponsavel =
            document.createElement("td");

        tdResponsavel.textContent = item.responsavel || "";

        if (item.responsavel) {

            tdResponsavel.classList.add("responsavel");

        }

        tr.appendChild(tdResponsavel);

        const tdAcao =
            document.createElement("td");

        const botaoAbrir =
            document.createElement("button");

        botaoAbrir.type = "button";
        botaoAbrir.className = "btnAbrirObra";
        botaoAbrir.textContent = "Acessar";
        botaoAbrir.disabled = !item.urlObra;

        botaoAbrir.addEventListener("click", () => {

            if (!item.urlObra) {
                return;
            }

            chrome.tabs.create({
                url: item.urlObra
            });

        });

        tdAcao.appendChild(botaoAbrir);

        tr.appendChild(tdAcao);

        tbody.appendChild(tr);

    });

}

function atualizarResumo(resumo, analises) {

    const totaisPorResponsavel =
        contarPorResponsavel(analises);

    document.getElementById("totalPendentes").textContent =
        resumo.semAnalise;

    document.getElementById("totalGeral").textContent =
        resumo.total;

    document.getElementById("totalDouglas").textContent =
        totaisPorResponsavel.Douglas || 0;

    document.getElementById("totalGabriel").textContent =
        totaisPorResponsavel.Gabriel || 0;

}

function contarPorResponsavel(analises) {

    return analises.reduce((totais, item) => {

        const responsavel = item.responsavel || "Sem responsavel";

        totais[responsavel] =
            (totais[responsavel] || 0) + 1;

        return totais;

    }, {});

}

async function enviarAcao(acao) {
    console.log("AÇÃO ENVIADA:", acao);
    const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true
    });

    if (!tab) {

        Logger.error("Nenhuma aba ativa.");

        mostrarMensagem(
            "Nenhuma aba ativa encontrada."
        );

        return;

    }

    chrome.tabs.sendMessage(

        tab.id,

        {
            action: acao
        },

        resposta => {
            console.log("--------------------------------");
            console.log("AÇÃO:", acao);
            console.log("RESPOSTA:", resposta);
            console.log("LAST ERROR:", chrome.runtime.lastError);

            if (chrome.runtime.lastError) {

                Logger.error(chrome.runtime.lastError.message);

                mostrarMensagem(
                    traduzirErro(chrome.runtime.lastError.message)
                );

                return;

            }

            if (!resposta) {

                console.error("Resposta veio undefined.");

                mostrarMensagem(
                    "Nao foi possivel obter resposta da pagina do BSIT."
                );

                return;

            }
            if (chrome.runtime.lastError) {

                Logger.error(
                    chrome.runtime.lastError.message
                );

                mostrarMensagem(
                    traduzirErro(chrome.runtime.lastError.message)
                );

                return;

            }
            if (acao === "testarAcoes") {
                return;
            }

            if (resposta.erro) {

                mostrarMensagem(
                    traduzirErro(resposta.erro)
                );

                return;

            }

            //-----------------------------------------

            atualizarResumo(
                resposta.resumo,
                resposta.analises
            );

            //-----------------------------------------

            ultimasAnalises = resposta.analises;

            renderizarAnalises(ultimasAnalises);

        }

    );

}

export async function iniciarPopup() {

    Logger.info("Popup iniciado.");

    document

        .getElementById("btnTabela")
        .addEventListener(

            "click",
            () => enviarAcao("analisarTabela")

    );
    document

        .getElementById("filtroAnalista")
        .addEventListener(

            "change",
            () => renderizarAnalises(ultimasAnalises)

    );

}
