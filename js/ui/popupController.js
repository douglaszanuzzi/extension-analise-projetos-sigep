import { Logger } from "../core/logger.js";
import {
    NotificationGroupingService,
    NOTIFICATION_GROUP_STATUS
} from "../bsit/notificationGroupingService.js";

let ultimasAnalises = [];
let abaAtiva = "analises";
let gruposNotificacoes = [];

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

async function atualizarStatusGrupo(grupoId, status) {

    const grupoSelecionado = gruposNotificacoes.find(grupo => grupo.id === grupoId);

    if (!grupoSelecionado) {
        return;
    }

    await NotificationGroupingService.atualizarStatus(grupoSelecionado.id, status);
    grupoSelecionado.status = status;
    renderizarNotificacoes(gruposNotificacoes);

}

function obterFiltroStatusNotificacoes() {

    const filtro = document.getElementById("filtroStatusNotificacoes");
    return filtro?.value || "ALL";

}

function classStatus(status = NOTIFICATION_GROUP_STATUS.NEW) {

    if (status === NOTIFICATION_GROUP_STATUS.PENDING) {
        return "aguardando";
    }

    if (status === NOTIFICATION_GROUP_STATUS.DONE) {
        return "concluido";
    }

    if (status === NOTIFICATION_GROUP_STATUS.ARCHIVED) {
        return "arquivado";
    }

    return "novo";

}

function formatarPeriodo(grupo) {

    if (!grupo.dataInicio || !grupo.dataFim) {
        return "";
    }

    return `${grupo.dataInicio} às ${grupo.dataFim}`;

}

function criarBotaoAcao(texto, status, grupoId) {

    const botao = document.createElement("button");
    botao.type = "button";
    botao.textContent = texto;
    botao.dataset.grupoId = grupoId;
    botao.addEventListener("click", async () => {
        await atualizarStatusGrupo(grupoId, status);
    });

    return botao;

}

function renderizarNotificacoes(grupos = []) {

    gruposNotificacoes = grupos;

    const container = document.getElementById("listaGruposNotificacoes");

    if (!container) {
        return;
    }

    container.innerHTML = "";

    const filtro = obterFiltroStatusNotificacoes();

    const gruposVisiveis = grupos.filter(grupo => {

        if (filtro === "ALL") {
            return grupo.status !== NOTIFICATION_GROUP_STATUS.ARCHIVED;
        }

        return grupo.status === filtro;

    });

    if (!gruposVisiveis.length) {

        const mensagem = document.createElement("p");
        mensagem.className = "mensagem visivel";
        mensagem.textContent = "Nenhum grupo encontrado para esse filtro.";
        container.appendChild(mensagem);
        return;

    }

    gruposVisiveis.forEach(grupo => {

        const card = document.createElement("article");
        card.className = "grupoNotificacao";

        const cabecalho = document.createElement("div");
        cabecalho.className = "grupoCabecalho";

        const titulo = document.createElement("h3");
        titulo.className = "grupoTitulo";
        titulo.textContent = `📁 CCI ${grupo.cci || "-"}`;

        const statusBadge = document.createElement("span");
        statusBadge.className = `grupoStatusBadge ${classStatus(grupo.status)}`;
        statusBadge.textContent = NotificationGroupingService.statusTexto(grupo.status);

        const meta = document.createElement("div");
        meta.className = "grupoMeta";
        meta.textContent = `${grupo.proprietario || "-"} · ${formatarPeriodo(grupo)}`;

        const arquivos = document.createElement("div");
        arquivos.className = "grupoArquivos";
        arquivos.textContent = `${NotificationGroupingService.contarArquivos(grupo)} arquivos`;

        const lista = document.createElement("ul");
        lista.className = "grupoLista";

        (grupo.notificacoes || []).forEach(notificacao => {

            const item = document.createElement("li");
            item.textContent = notificacao.arquivo || notificacao.titulo || "Notificação";
            lista.appendChild(item);

        });

        const acoes = document.createElement("div");
        acoes.className = "grupoAcoes";

        acoes.appendChild(criarBotaoAcao("✔ Concluir", NOTIFICATION_GROUP_STATUS.DONE, grupo.id));
        acoes.appendChild(criarBotaoAcao("⏳ Aguardar", NOTIFICATION_GROUP_STATUS.PENDING, grupo.id));
        acoes.appendChild(criarBotaoAcao("↩ Não lido", NOTIFICATION_GROUP_STATUS.NEW, grupo.id));
        acoes.appendChild(criarBotaoAcao("📦 Arquivar", NOTIFICATION_GROUP_STATUS.ARCHIVED, grupo.id));

        cabecalho.appendChild(titulo);
        cabecalho.appendChild(statusBadge);

        card.appendChild(cabecalho);
        card.appendChild(meta);
        card.appendChild(arquivos);
        card.appendChild(lista);
        card.appendChild(acoes);

        container.appendChild(card);

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

        async resposta => {

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

            const grupos = await NotificationGroupingService.sincronizarGrupos(resposta.notificacoes || []);
            renderizarNotificacoes(grupos);

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

    document

        .getElementById("filtroStatusNotificacoes")
        .addEventListener(

            "change",
            () => renderizarNotificacoes(gruposNotificacoes)

    );

}
