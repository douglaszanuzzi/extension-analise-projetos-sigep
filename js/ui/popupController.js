import { Logger } from "../core/logger.js";
import { NotificationService } from "../bsit/notificationService.js";
import {
    NotificationGroupingService,
    NOTIFICATION_GROUP_STATUS
} from "../bsit/notificationGroupingService.js";

let ultimasAnalises = [];
let gruposNotificacoes = [];
let ultimaAtualizacaoTexto = "Ultima atualizacao";
let totalNovos = 0;
let notificacoesCarregadas = false;
const temporizadoresVisualizacao = new Map();

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

function traduzirErro(mensagem = "") {

    if (mensagem.includes("Receiving end does not exist")) {

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

function contarPorResponsavel(analises) {

    return analises.reduce((totais, item) => {

        const responsavel = item.responsavel || "Sem responsavel";

        totais[responsavel] =
            (totais[responsavel] || 0) + 1;

        return totais;

    }, {});

}

function alternarAba(novaAba) {

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

function obterFiltroStatusNotificacoes() {

    const filtro =
        document.getElementById("filtroStatusNotificacoes");

    return filtro?.value || "ALL";

}

function classStatus(status = NOTIFICATION_GROUP_STATUS.NEW) {

    if (status === NOTIFICATION_GROUP_STATUS.PENDING) {
        return "pending";
    }

    if (status === NOTIFICATION_GROUP_STATUS.DONE) {
        return "done";
    }

    if (status === NOTIFICATION_GROUP_STATUS.ARCHIVED) {
        return "archived";
    }

    return "new";

}

function formatarPeriodo(grupo) {

    if (!grupo.dataInicio || !grupo.dataFim) {
        return "";
    }

    return `${grupo.dataInicio} as ${grupo.dataFim}`;

}

function atualizarIndicadoresSincronizacao() {

    const contadorElement =
        document.getElementById("contadorNovosNotificacoes");

    const ultimaAtualizacaoElement =
        document.getElementById("ultimaAtualizacaoTexto");

    if (contadorElement) {

        contadorElement.textContent =
            `${totalNovos} novo${totalNovos === 1 ? "" : "s"} grupo${totalNovos === 1 ? "" : "s"}`;

    }

    if (ultimaAtualizacaoElement) {
        ultimaAtualizacaoElement.textContent = ultimaAtualizacaoTexto;
    }

}

function contarGruposNaoVistos(grupos = []) {

    return grupos.filter(grupo => !grupo.visto).length;

}

async function marcarGrupoComoVisto(grupoId) {

    const grupo =
        gruposNotificacoes.find(item => item.id === grupoId);

    if (!grupo || grupo.visto) {
        return;
    }

    const inbox = await NotificationService.marcarComoVisto(grupoId);

    gruposNotificacoes = inbox.grupos || [];
    totalNovos = contarGruposNaoVistos(gruposNotificacoes);
    ultimaAtualizacaoTexto =
        inbox.ultimaAtualizacaoTexto || ultimaAtualizacaoTexto;

    renderizarNotificacoes(gruposNotificacoes);

}

function observarVisualizacaoGrupo(card, grupo) {

    if (grupo.visto) {
        return;
    }

    card.addEventListener("mouseenter", () => {

        const temporizador = window.setTimeout(
            () => marcarGrupoComoVisto(grupo.id),
            1000
        );

        temporizadoresVisualizacao.set(grupo.id, temporizador);

    });

    card.addEventListener("mouseleave", () => {

        const temporizador =
            temporizadoresVisualizacao.get(grupo.id);

        if (temporizador) {
            window.clearTimeout(temporizador);
            temporizadoresVisualizacao.delete(grupo.id);
        }

    });

    card.addEventListener("click", event => {

        if (event.target.closest("button")) {
            return;
        }

        marcarGrupoComoVisto(grupo.id);

    });

}

async function atualizarStatusGrupo(grupoId, status) {

    const grupoSelecionado =
        gruposNotificacoes.find(grupo => grupo.id === grupoId);

    if (!grupoSelecionado) {
        return;
    }

    const inbox = await NotificationService.atualizarStatus(
        grupoSelecionado.id,
        status
    );

    gruposNotificacoes = inbox.grupos || [];
    totalNovos = contarGruposNaoVistos(gruposNotificacoes);
    ultimaAtualizacaoTexto =
        inbox.ultimaAtualizacaoTexto || ultimaAtualizacaoTexto;

    renderizarNotificacoes(gruposNotificacoes);

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

    const container =
        document.getElementById("listaGruposNotificacoes");

    if (!container) {
        return;
    }

    container.innerHTML = "";

    const filtro = obterFiltroStatusNotificacoes();

    const gruposVisiveis = grupos.filter(grupo => {

        if (filtro === "ALL") {
            return true;
        }

        return grupo.status === filtro;

    });

    if (!gruposVisiveis.length) {

        const mensagem = document.createElement("p");
        mensagem.className = "mensagem visivel";
        mensagem.textContent = "Nenhum grupo encontrado para esse filtro.";
        container.appendChild(mensagem);
        atualizarIndicadoresSincronizacao();
        return;

    }

    gruposVisiveis.forEach(grupo => {

        const card = document.createElement("article");
        card.className = `grupoNotificacao status-${classStatus(grupo.status)}`;

        if (!grupo.visto) {
            card.classList.add("grupoNaoVisto");
        }

        observarVisualizacaoGrupo(card, grupo);

        const cabecalho = document.createElement("div");
        cabecalho.className = "grupoCabecalho";

        const titulo = document.createElement("h3");
        titulo.className = "grupoTitulo";
        titulo.textContent = `CCI ${grupo.cci || "-"}`;

        const statusBadge = document.createElement("span");
        statusBadge.className = `grupoStatusBadge ${classStatus(grupo.status)}`;
        statusBadge.textContent =
            NotificationGroupingService.statusTexto(grupo.status);

        const meta = document.createElement("div");
        meta.className = "grupoMeta";
        meta.textContent =
            `${grupo.proprietario || "-"} - ${formatarPeriodo(grupo)}`;

        const arquivos = document.createElement("div");
        arquivos.className = "grupoArquivos";
        arquivos.textContent =
            `${NotificationGroupingService.contarArquivos(grupo)} arquivos`;

        const lista = document.createElement("ul");
        lista.className = "grupoLista";

        (grupo.notificacoes || []).forEach(notificacao => {

            const item = document.createElement("li");
            item.textContent =
                notificacao.arquivo || notificacao.titulo || "Notificacao";
            lista.appendChild(item);

        });

        const acoes = document.createElement("div");
        acoes.className = "grupoAcoes";

        acoes.appendChild(criarBotaoAcao(
            "Concluir",
            NOTIFICATION_GROUP_STATUS.DONE,
            grupo.id
        ));

        acoes.appendChild(criarBotaoAcao(
            "Aguardar",
            NOTIFICATION_GROUP_STATUS.PENDING,
            grupo.id
        ));

        acoes.appendChild(criarBotaoAcao(
            "Nao lido",
            NOTIFICATION_GROUP_STATUS.NEW,
            grupo.id
        ));

        acoes.appendChild(criarBotaoAcao(
            "Arquivar",
            NOTIFICATION_GROUP_STATUS.ARCHIVED,
            grupo.id
        ));

        if (!grupo.visto) {

            const novoIndicador = document.createElement("span");
            novoIndicador.className = "grupoStatusBadge novo";
            novoIndicador.textContent = "NOVO";
            cabecalho.appendChild(novoIndicador);

        }

        cabecalho.appendChild(titulo);
        cabecalho.appendChild(statusBadge);

        card.appendChild(cabecalho);
        card.appendChild(meta);
        card.appendChild(arquivos);
        card.appendChild(lista);
        card.appendChild(acoes);

        container.appendChild(card);

    });

    atualizarIndicadoresSincronizacao();

}

async function carregarNotificacoes() {

    const inbox = await NotificationService.carregarInbox();

    gruposNotificacoes = inbox.grupos || [];
    totalNovos = contarGruposNaoVistos(gruposNotificacoes);
    ultimaAtualizacaoTexto =
        inbox.ultimaAtualizacaoTexto || "Ultima atualizacao";

    renderizarNotificacoes(gruposNotificacoes);

    sincronizarNotificacoesEmSegundoPlano();

}

async function sincronizarNotificacoesEmSegundoPlano() {

    const resultado = await NotificationService.sync();

    if (resultado.erro) {
        Logger.warn(resultado.erro);
        atualizarIndicadoresSincronizacao();
        return;
    }

    gruposNotificacoes = resultado.grupos || [];
    totalNovos = contarGruposNaoVistos(gruposNotificacoes);
    ultimaAtualizacaoTexto =
        resultado.ultimaAtualizacaoTexto || "Ultima atualizacao";

    renderizarNotificacoes(gruposNotificacoes);

}

async function enviarAcao(acao) {

    console.log("ACAO ENVIADA:", acao);

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

            if (chrome.runtime.lastError) {

                Logger.error(chrome.runtime.lastError.message);

                mostrarMensagem(
                    traduzirErro(chrome.runtime.lastError.message)
                );

                return;

            }

            if (!resposta) {

                mostrarMensagem(
                    "Nao foi possivel obter resposta da pagina do BSIT."
                );

                return;

            }

            if (resposta.erro) {

                mostrarMensagem(
                    traduzirErro(resposta.erro)
                );

                return;

            }

            const totaisPorResponsavel =
                contarPorResponsavel(resposta.analises);

            document.getElementById("totalPendentes").textContent =
                resposta.resumo.semAnalise;

            document.getElementById("totalDouglas").textContent =
                totaisPorResponsavel.Douglas || 0;

            document.getElementById("totalGabriel").textContent =
                totaisPorResponsavel.Gabriel || 0;

            ultimasAnalises = resposta.analises;

            renderizarAnalises(ultimasAnalises);

        }

    );

}

function iniciarSincronizacaoAutomaticaLocal() {

    window.setInterval(
        sincronizarNotificacoesEmSegundoPlano,
        NotificationService.INTERVALO_MINUTOS * 60 * 1000
    );

}

export async function iniciarPopup() {

    Logger.info("Popup iniciado.");

    alternarAba("analises");
    iniciarSincronizacaoAutomaticaLocal();

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

                if (!notificacoesCarregadas) {
                    notificacoesCarregadas = true;
                    await carregarNotificacoes();
                }

            }

    );

    document

        .getElementById("btnBuscarNotificacoes")
        .addEventListener(

            "click",
            sincronizarNotificacoesEmSegundoPlano

    );

    document

        .getElementById("filtroStatusNotificacoes")
        .addEventListener(

            "change",
            () => renderizarNotificacoes(gruposNotificacoes)

    );

}
