import { Logger } from "../core/logger.js";
import { safeSendMessage } from "../core/chromeMessaging.js";
import { NotificationService } from "../bsit/notificationService.js";
import {
    renderizarAnalises,
    mostrarMensagem,
    traduzirErro,
    contarPorResponsavel
} from "./analisesView.js";
import {
    renderizarNotificacoes,
    carregarNotificacoes,
    sincronizarNotificacoesEmSegundoPlano
} from "./notificacoesView.js";

let ultimasAnalises = [];
let notificacoesCarregadas = false;

const estado = {
    gruposNotificacoes: [],
    ultimaAtualizacaoTexto: "Ultima atualizacao",
    totalNovos: 0
};

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

async function enviarAcao(acao) {
    Logger.info("ACAO ENVIADA:", acao);
    let tab = null;
    try {
        [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    } catch (erro) {
        Logger.error("Falha ao localizar aba ativa.", erro);
        mostrarMensagem("Nao foi possivel localizar a aba ativa.");
        return;
    }
    if (!tab) {
        Logger.error("Nenhuma aba ativa.");
        mostrarMensagem("Nenhuma aba ativa encontrada.");
        return;
    }
    if (typeof tab.id !== "number") {
        Logger.warn("Aba ativa sem id valido.", tab);
        mostrarMensagem("Nao foi possivel comunicar com a aba ativa.");
        return;
    }
    const resposta = await safeSendMessage(tab, { action: acao });
    if (!resposta) {
        mostrarMensagem("Nao foi possivel obter resposta da pagina do BSIT.");
        return;
    }
    if (resposta.erro) {
        mostrarMensagem(traduzirErro(resposta.erro));
        return;
    }
    const analises = Array.isArray(resposta.analises) ? resposta.analises : [];
    const totaisPorResponsavel = contarPorResponsavel(analises);
    const totalPendentes = document.getElementById("totalPendentes");
    const totalDouglas = document.getElementById("totalDouglas");
    const totalGabriel = document.getElementById("totalGabriel");
    if (totalPendentes) {
        totalPendentes.textContent = resposta.resumo?.semAnalise || 0;
    }
    if (totalDouglas) {
        totalDouglas.textContent = totaisPorResponsavel.Douglas || 0;
    }
    if (totalGabriel) {
        totalGabriel.textContent = totaisPorResponsavel.Gabriel || 0;
    }
    ultimasAnalises = analises;
    renderizarAnalises(ultimasAnalises);
}

function iniciarSincronizacaoAutomaticaLocal() {
    window.setInterval(
        () => sincronizarNotificacoesEmSegundoPlano(estado, mostrarMensagem),
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
    adicionarEvento("btnTabela", "click", () => enviarAcao("analisarTabela"));
    adicionarEvento("filtroAnalista", "change", () => renderizarAnalises(ultimasAnalises));
    adicionarEvento("abaAnalises", "click", () => alternarAba("analises"));
    adicionarEvento("abaNotificacoes", "click", async () => {
        alternarAba("notificacoes");
        if (!notificacoesCarregadas) {
            notificacoesCarregadas = true;
            await carregarNotificacoes(estado, mostrarMensagem);
        }
    });
    adicionarEvento("btnBuscarNotificacoes", "click",
        () => sincronizarNotificacoesEmSegundoPlano(estado, mostrarMensagem));
    adicionarEvento("filtroStatusNotificacoes", "change",
        () => renderizarNotificacoes(estado.gruposNotificacoes, estado));
}