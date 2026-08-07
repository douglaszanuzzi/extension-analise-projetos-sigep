import { Logger } from "../core/logger.js";
import { NotificationService } from "../bsit/notificationService.js";
import {
    NotificationGroupingService,
    NOTIFICATION_GROUP_STATUS
} from "../bsit/notificationGroupingService.js";
import { mostrarMensagem } from "./analisesView.js";

const temporizadoresVisualizacao = new Map();

function obterFiltroStatusNotificacoes() {
    const filtro = document.getElementById("filtroStatusNotificacoes");
    return filtro?.value || "ALL";
}

function classStatus(status = NOTIFICATION_GROUP_STATUS.NEW) {
    if (status === NOTIFICATION_GROUP_STATUS.PENDING) return "pending";
    if (status === NOTIFICATION_GROUP_STATUS.DONE) return "done";
    if (status === NOTIFICATION_GROUP_STATUS.ARCHIVED) return "archived";
    return "new";
}

function formatarPeriodo(grupo) {
    if (!grupo.dataInicio || !grupo.dataFim) return "";
    return `${grupo.dataInicio} as ${grupo.dataFim}`;
}

function atualizarIndicadoresSincronizacao(totalNovos, ultimaAtualizacaoTexto) {
    const contadorElement = document.getElementById("contadorNovosNotificacoes");
    const ultimaAtualizacaoElement = document.getElementById("ultimaAtualizacaoTexto");
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

async function marcarGrupoComoVisto(grupoId, estado) {
    try {
        const grupo = estado.gruposNotificacoes.find(item => item.id === grupoId);
        if (!grupo || grupo.visto) return;
        const inbox = await NotificationService.marcarComoVisto(grupoId);
        estado.gruposNotificacoes = inbox.grupos || [];
        estado.totalNovos = contarGruposNaoVistos(estado.gruposNotificacoes);
        estado.ultimaAtualizacaoTexto = inbox.ultimaAtualizacaoTexto || estado.ultimaAtualizacaoTexto;
        renderizarNotificacoes(estado.gruposNotificacoes, estado);
    } catch (erro) {
        Logger.error("Falha ao marcar grupo como visto.", erro);
    }
}

function observarVisualizacaoGrupo(card, grupo, estado) {
    if (grupo.visto) return;
    card.addEventListener("mouseenter", () => {
        const temporizador = window.setTimeout(() => marcarGrupoComoVisto(grupo.id, estado), 1000);
        temporizadoresVisualizacao.set(grupo.id, temporizador);
    });
    card.addEventListener("mouseleave", () => {
        const temporizador = temporizadoresVisualizacao.get(grupo.id);
        if (temporizador) {
            window.clearTimeout(temporizador);
            temporizadoresVisualizacao.delete(grupo.id);
        }
    });
    card.addEventListener("click", event => {
        if (event.target.closest("button")) return;
        marcarGrupoComoVisto(grupo.id, estado);
    });
}

async function atualizarStatusGrupo(grupoId, status, estado, mostrarMensagem) {
    try {
        const grupoSelecionado = estado.gruposNotificacoes.find(grupo => grupo.id === grupoId);
        if (!grupoSelecionado) return;
        const inbox = await NotificationService.atualizarStatus(grupoSelecionado.id, status);
        estado.gruposNotificacoes = inbox.grupos || [];
        estado.totalNovos = contarGruposNaoVistos(estado.gruposNotificacoes);
        estado.ultimaAtualizacaoTexto = inbox.ultimaAtualizacaoTexto || estado.ultimaAtualizacaoTexto;
        renderizarNotificacoes(estado.gruposNotificacoes, estado);
    } catch (erro) {
        Logger.error("Falha ao atualizar status do grupo.", erro);
        mostrarMensagem("Nao foi possivel atualizar a notificacao.");
    }
}

function criarBotaoAcao(texto, status, grupoId, estado, mostrarMensagem) {
    const botao = document.createElement("button");
    botao.type = "button";
    botao.textContent = texto;
    botao.dataset.grupoId = grupoId;
    botao.addEventListener("click", async () => {
        await atualizarStatusGrupo(grupoId, status, estado, mostrarMensagem);
    });
    return botao;
}

function renderizarNotificacoes(grupos = [], estado = {}) {
    estado.gruposNotificacoes = grupos;
    const container = document.getElementById("listaGruposNotificacoes");
    if (!container) return;
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
        atualizarIndicadoresSincronizacao(estado.totalNovos, estado.ultimaAtualizacaoTexto);
        return;
    }
    gruposVisiveis.forEach(grupo => {
        const card = document.createElement("article");
        card.className = `grupoNotificacao status-${classStatus(grupo.status)}`;
        if (!grupo.visto) {
            card.classList.add("grupoNaoVisto");
        }
        observarVisualizacaoGrupo(card, grupo, estado);
        const cabecalho = document.createElement("div");
        cabecalho.className = "grupoCabecalho";
        const titulo = document.createElement("h3");
        titulo.className = "grupoTitulo";
        titulo.textContent = `CCI ${grupo.cci || "-"}`;
        const statusBadge = document.createElement("span");
        statusBadge.className = `grupoStatusBadge ${classStatus(grupo.status)}`;
        statusBadge.textContent = NotificationGroupingService.statusTexto(grupo.status);
        const meta = document.createElement("div");
        meta.className = "grupoMeta";
        meta.textContent = `${grupo.proprietario || "-"} - ${formatarPeriodo(grupo)}`;
        const arquivos = document.createElement("div");
        arquivos.className = "grupoArquivos";
        arquivos.textContent = `${NotificationGroupingService.contarArquivos(grupo)} arquivos`;
        const lista = document.createElement("ul");
        lista.className = "grupoLista";
        (grupo.notificacoes || []).forEach(notificacao => {
            const item = document.createElement("li");
            item.textContent = notificacao.arquivo || notificacao.titulo || "Notificacao";
            lista.appendChild(item);
        });
        const acoes = document.createElement("div");
        acoes.className = "grupoAcoes";
        acoes.appendChild(criarBotaoAcao("Concluir", NOTIFICATION_GROUP_STATUS.DONE, grupo.id, estado, mostrarMensagem));
        acoes.appendChild(criarBotaoAcao("Aguardar", NOTIFICATION_GROUP_STATUS.PENDING, grupo.id, estado, mostrarMensagem));
        acoes.appendChild(criarBotaoAcao("Nao lido", NOTIFICATION_GROUP_STATUS.NEW, grupo.id, estado, mostrarMensagem));
        acoes.appendChild(criarBotaoAcao("Arquivar", NOTIFICATION_GROUP_STATUS.ARCHIVED, grupo.id, estado, mostrarMensagem));
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
    atualizarIndicadoresSincronizacao(estado.totalNovos, estado.ultimaAtualizacaoTexto);
}

async function carregarNotificacoes(estado, mostrarMensagem) {
    try {
        const inbox = await NotificationService.carregarInbox();
        estado.gruposNotificacoes = inbox.grupos || [];
        estado.totalNovos = contarGruposNaoVistos(estado.gruposNotificacoes);
        estado.ultimaAtualizacaoTexto = inbox.ultimaAtualizacaoTexto || "Ultima atualizacao";
        renderizarNotificacoes(estado.gruposNotificacoes, estado);
        sincronizarNotificacoesEmSegundoPlano(estado, mostrarMensagem);
    } catch (erro) {
        Logger.error("Falha ao carregar notificacoes.", erro);
        mostrarMensagem("Nao foi possivel carregar as notificacoes salvas.");
    }
}

async function sincronizarNotificacoesEmSegundoPlano(estado, mostrarMensagem) {
    try {
        const resultado = await NotificationService.sync();
        if (resultado.erro) {
            Logger.warn(resultado.erro);
            atualizarIndicadoresSincronizacao(estado.totalNovos, estado.ultimaAtualizacaoTexto);
            return;
        }
        estado.gruposNotificacoes = resultado.grupos || [];
        estado.totalNovos = contarGruposNaoVistos(estado.gruposNotificacoes);
        estado.ultimaAtualizacaoTexto = resultado.ultimaAtualizacaoTexto || "Ultima atualizacao";
        renderizarNotificacoes(estado.gruposNotificacoes, estado);
    } catch (erro) {
        Logger.error("Falha na sincronizacao de notificacoes.", erro);
        atualizarIndicadoresSincronizacao(estado.totalNovos, estado.ultimaAtualizacaoTexto);
    }
}

export {
    renderizarNotificacoes,
    carregarNotificacoes,
    sincronizarNotificacoesEmSegundoPlano
};