import { Logger } from "../core/logger.js";

let ultimasAnalises = [];
let abaAtiva = "analises";

function obterAnalistaSelecionado() {

    const filtro =
        document.getElementById("filtroAnalista");

    return filtro?.value || "";

}

function mostrarMensagem(mensagem) {

    const tbody =
        document.querySelector(
            "#tblAnalises tbody"
        );

    // Mostrar mensagem em um elemento dedicado
    const elementoMensagem = 
        document.getElementById("mensagem");
    
    if (elementoMensagem) {
        elementoMensagem.textContent = mensagem;
        elementoMensagem.classList.add("visivel");
    }

    if (tbody) {
        tbody.innerHTML = "";
    }

}

function traduzirErro(mensagem) {

    if (mensagem.includes("Receiving end does not exist")) {s

        return "Abra a tela de analises de Obras do SIGEP, recarregue a pagina e tente novamente.";

    }

    if (mensagem.includes("Tabela principal")) {

        return "Tabela de analises nao encontrada. Abra a tela da fila de analises de Obras do SIGEP.";

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
        botaoAbrir.textContent = "Abrir";
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

function contarPorResponsavel(analises) {

    return analises.reduce((totais, item) => {

        const responsavel = item.responsavel || "Sem responsavel";

        totais[responsavel] =
            (totais[responsavel] || 0) + 1;

        return totais;

    }, {});

}

function alternarAba(novaAba) {

    abaAtiva = novaAba;

    const abaAnalises = document.getElementById("abaAnalises");
    const abaNotificacoes = document.getElementById("abaNotificacoes");
    const viewAnalises = document.getElementById("viewAnalises");
    const viewNotificacoes = document.getElementById("viewNotificacoes");

    if (abaAnalises) {
        abaAnalises.classList.toggle("ativa", novaAba === "analises");
    }

    if (abaNotificacoes) {
        abaNotificacoes.classList.toggle("ativa", novaAba === "notificacoes");
    }

    if (viewAnalises) {
        viewAnalises.classList.toggle("visivel", novaAba === "analises");
        viewAnalises.classList.toggle("oculto", novaAba !== "analises");
    }

    if (viewNotificacoes) {
        viewNotificacoes.classList.toggle("visivel", novaAba === "notificacoes");
        viewNotificacoes.classList.toggle("oculto", novaAba !== "notificacoes");
    }

}

function renderizarNotificacoes(notificacoes = []) {

    const tbody = document.querySelector("#tblNotificacoes tbody");

    if (!tbody) {
        return;
    }

    tbody.innerHTML = "";

    if (!notificacoes.length) {

        const tr = document.createElement("tr");
        const td = document.createElement("td");

        td.colSpan = 4;
        td.textContent = "Nenhuma notificação encontrada na popup aberta.";

        tr.appendChild(td);
        tbody.appendChild(tr);

        return;

    }

    notificacoes.forEach(item => {

        const tr = document.createElement("tr");

        const tdCci = document.createElement("td");
        tdCci.textContent = item.cci || "";

        const tdProprietario = document.createElement("td");
        tdProprietario.textContent = item.proprietario || "";

        const tdArquivo = document.createElement("td");
        tdArquivo.textContent = item.arquivo || "";

        const tdData = document.createElement("td");
        tdData.textContent = item.data || "";

        tr.appendChild(tdCci);
        tr.appendChild(tdProprietario);
        tr.appendChild(tdArquivo);
        tr.appendChild(tdData);

        tbody.appendChild(tr);

    });

}

async function carregarNotificacoes() {

    const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true
    });

    if (!tab) {
        Logger.error("Nenhuma aba ativa para notificações.");
        mostrarMensagem("Nenhuma aba ativa encontrada.");
        return;
    }

    chrome.tabs.sendMessage(

        tab.id,

        {
            action: "obterNotificacoes"
        },

        resposta => {

            if (chrome.runtime.lastError) {
                Logger.error(chrome.runtime.lastError.message);
                mostrarMensagem(traduzirErro(chrome.runtime.lastError.message));
                return;
            }

            if (!resposta) {
                mostrarMensagem("Não foi possível obter notificações da página do BSIT.");
                return;
            }

            if (resposta.erro) {
                mostrarMensagem(traduzirErro(resposta.erro));
                return;
            }

            renderizarNotificacoes(resposta.notificacoes || []);

        }

    );

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

            const totaisPorResponsavel =
                contarPorResponsavel(resposta.analises);

            // Atualizar valores nos elementos existentes
            document.getElementById("totalPendentes").textContent = 
                resposta.resumo.semAnalise;
            
            document.getElementById("totalDouglas").textContent = 
                totaisPorResponsavel.Douglas || 0;
            
            document.getElementById("totalGabriel").textContent = 
                totaisPorResponsavel.Gabriel || 0;

            //-----------------------------------------

            ultimasAnalises = resposta.analises;

            renderizarAnalises(ultimasAnalises);

        }

    );

}

export async function iniciarPopup() {

    Logger.info("Popup iniciado.");

    alternarAba("analises");

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

    document

        .getElementById("abaAnalises")
        .addEventListener(

            "click",
            () => alternarAba("analises")

    );

    document

        .getElementById("abaNotificacoes")
        .addEventListener(

            "click",
            async () => {

                alternarAba("notificacoes");
                await carregarNotificacoes();

            }

    );

}
