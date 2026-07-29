import { Logger } from "../core/logger.js";
import { safeSendMessage } from "../core/chromeMessaging.js";
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

    const texto = String(mensagem || "");

    if (
        texto.includes("Receiving end does not exist")
        || texto.includes("Could not establish connection")
    ) {

        return "Nao foi possivel comunicar com a pagina do BSIT. Verifique se ela esta aberta e tente novamente.";

    }

    if (texto.includes("Tempo limite aguardando resposta")) {

        return "A pagina do BSIT demorou para responder. Recarregue a pagina e tente novamente.";

    }

    if (texto.includes("nao pertence ao BSIT")) {

        return "Abra uma pagina do BSIT para executar esta acao.";

    }

    if (
        texto.includes("No tab with id")
        || texto.includes("Tabs cannot be edited")
    ) {

        return "A aba do BSIT nao esta mais disponivel. Abra a pagina novamente e tente outra vez.";

    }

    if (texto.includes("Tabela principal")) {

        return "Tabela de analises nao encontrada. Abra a tela da fila de analises de Obras do SIGEP.";

    }

    return texto || "Nao foi possivel concluir a acao. Tente novamente.";

}

function renderizarAnalises(analises) {

    const tbody =
        document.querySelector(
            "#tblAnalises tbody"
        );

    if (!tbody) {
        mostrarMensagem("Tabela da extensao nao encontrada.");
        return;
    }

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

            try {

                const resultado = chrome.tabs.create({
                    url: item.urlObra
                });

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

    try {

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

    } catch (erro) {

        Logger.error("Falha ao marcar grupo como visto.", erro);

    }

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

    try {

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

    } catch (erro) {

        Logger.error("Falha ao atualizar status do grupo.", erro);
        mostrarMensagem("Nao foi possivel atualizar a notificacao.");

    }

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

    try {

        const inbox = await NotificationService.carregarInbox();

        gruposNotificacoes = inbox.grupos || [];
        totalNovos = contarGruposNaoVistos(gruposNotificacoes);
        ultimaAtualizacaoTexto =
            inbox.ultimaAtualizacaoTexto || "Ultima atualizacao";

        renderizarNotificacoes(gruposNotificacoes);

        sincronizarNotificacoesEmSegundoPlano();

    } catch (erro) {

        Logger.error("Falha ao carregar notificacoes.", erro);
        mostrarMensagem("Nao foi possivel carregar as notificacoes salvas.");

    }

}

async function sincronizarNotificacoesEmSegundoPlano() {

    try {

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

    } catch (erro) {

        Logger.error("Falha na sincronizacao de notificacoes.", erro);
        atualizarIndicadoresSincronizacao();

    }

}

async function enviarAcao(acao) {

    Logger.info("ACAO ENVIADA:", acao);

    let tab = null;

    try {

        [tab] = await chrome.tabs.query({
            active: true,
            currentWindow: true
        });

    } catch (erro) {

        Logger.error("Falha ao localizar aba ativa.", erro);
        mostrarMensagem("Nao foi possivel localizar a aba ativa.");
        return;

    }

    if (!tab) {

        Logger.error("Nenhuma aba ativa.");

        mostrarMensagem(
            "Nenhuma aba ativa encontrada."
        );

        return;

    }

    if (typeof tab.id !== "number") {

        Logger.warn("Aba ativa sem id valido.", tab);

        mostrarMensagem(
            "Nao foi possivel comunicar com a aba ativa."
        );

        return;

    }

    const resposta = await safeSendMessage(
        tab,
        {
            action: acao
        }
    );

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

    const analises = Array.isArray(resposta.analises)
        ? resposta.analises
        : [];

    const totaisPorResponsavel =
        contarPorResponsavel(analises);

    const totalPendentes =
        document.getElementById("totalPendentes");
    const totalDouglas =
        document.getElementById("totalDouglas");
    const totalGabriel =
        document.getElementById("totalGabriel");

    if (totalPendentes) {
        totalPendentes.textContent =
            resposta.resumo?.semAnalise || 0;
    }

    if (totalDouglas) {
        totalDouglas.textContent =
            totaisPorResponsavel.Douglas || 0;
    }

    if (totalGabriel) {
        totalGabriel.textContent =
            totaisPorResponsavel.Gabriel || 0;
    }

    ultimasAnalises = analises;

    renderizarAnalises(ultimasAnalises);

}

function iniciarSincronizacaoAutomaticaLocal() {

    window.setInterval(
        () => sincronizarNotificacoesEmSegundoPlano(),
        NotificationService.INTERVALO_MINUTOS * 60 * 1000
    );

}

function adicionarEvento(id, evento, manipulador) {

    const elemento = document.getElementById(id);

    if (!elemento) {
        Logger.warn(`Elemento nao encontrado: ${id}`);
        return;
    }

    elemento.addEventListener(evento, manipulador);

}

export async function iniciarPopup() {

    Logger.info("Popup iniciado.");

    alternarAba("analises");
    iniciarSincronizacaoAutomaticaLocal();

    adicionarEvento(
        "btnTabela",
        "click",
        () => enviarAcao("analisarTabela")
    );

    adicionarEvento(
        "filtroAnalista",
        "change",
        () => renderizarAnalises(ultimasAnalises)
    );

    adicionarEvento(
        "abaAnalises",
        "click",
        () => alternarAba("analises")
    );

    adicionarEvento(
        "abaNotificacoes",
        "click",
        async () => {

            alternarAba("notificacoes");

            if (!notificacoesCarregadas) {
                notificacoesCarregadas = true;
                await carregarNotificacoes();
            }

        }
    );

    adicionarEvento(
        "btnBuscarNotificacoes",
        "click",
        sincronizarNotificacoesEmSegundoPlano
    );

    adicionarEvento(
        "filtroStatusNotificacoes",
        "change",
        () => renderizarNotificacoes(gruposNotificacoes)
    );

}
