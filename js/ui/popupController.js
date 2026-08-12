import { Logger } from "../core/logger.js";
import { safeSendMessage } from "../core/chromeMessaging.js";
import { NotificationService } from "../bsit/notificationService.js";
import {
    renderizarAnalises,
    mostrarMensagem,
    traduzirErro,
    contarPorResponsavel,
    popularFiltroAnalistas,
    popularLegendaAnalistas,
    popularDashboardAnalistas,
    atualizarDashboard
} from "./analisesView.js";
import {
    renderizarNotificacoes,
    carregarNotificacoes,
    sincronizarNotificacoesEmSegundoPlano
} from "./notificacoesView.js";

let ultimasAnalises = [];
let notificacoesCarregadas = false;
let analistasAtuais = ["Douglas", "Gabriel"];

const estado = {
    gruposNotificacoes: [],
    ultimaAtualizacaoTexto: "Ultima atualizacao",
    totalNovos: 0
};

function alternarAba(novaAba) {
    const abas = ["analises", "notificacoes"];
    abas.forEach(aba => {
        const botao = document.getElementById(`aba${aba.charAt(0).toUpperCase() + aba.slice(1)}`);
        const view = document.getElementById(`view${aba.charAt(0).toUpperCase() + aba.slice(1)}`);
        if (botao) botao.classList.toggle("ativa", novaAba === aba);
        if (view) {
            view.classList.toggle("visivel", novaAba === aba);
            view.classList.toggle("oculto", novaAba !== aba);
        }
    });
    const viewConfig = document.getElementById("viewConfiguracoes");
    if (viewConfig) {
        viewConfig.classList.add("oculto");
        viewConfig.classList.remove("visivel");
    }
}

function mostrarConfiguracoes() {
    ["analises", "notificacoes"].forEach(aba => {
        const view = document.getElementById(`view${aba.charAt(0).toUpperCase() + aba.slice(1)}`);
        if (view) {
            view.classList.remove("visivel");
            view.classList.add("oculto");
        }
        const botao = document.getElementById(`aba${aba.charAt(0).toUpperCase() + aba.slice(1)}`);
        if (botao) botao.classList.remove("ativa");
    });
    const viewConfig = document.getElementById("viewConfiguracoes");
    if (viewConfig) {
        viewConfig.classList.remove("oculto");
        viewConfig.classList.add("visivel");
    }
    carregarAnalistas();
    carregarEstadoDebug();
    carregarHistorico();
}

async function enviarAcao(acao) {
    Logger.info("ACAO ENVIADA:", acao);
    mostrarLoading("Buscando analises...");
    let tab = null;
    try {
        [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    } catch (erro) {
        Logger.error("Falha ao localizar aba ativa.", erro);
        mostrarMensagem("Nao foi possivel localizar a aba ativa.");
        esconderLoading();
        return;
    }
    if (!tab) {
        mostrarMensagem("Nenhuma aba ativa encontrada.");
        esconderLoading();
        return;
    }
    if (typeof tab.id !== "number") {
        mostrarMensagem("Nao foi possivel comunicar com a aba ativa.");
        esconderLoading();
        return;
    }

    mostrarLoading("Sincronizando distribuicao...");
    let resposta;
    try {
        resposta = await safeSendMessage(tab, { action: acao });
    } catch (erro) {
        Logger.error("Falha ao enviar acao.", erro);
        mostrarMensagem("Erro ao comunicar com a pagina do SIGEP.");
        esconderLoading();
        return;
    }

    if (!resposta) {
        mostrarMensagem("Nao foi possivel obter resposta da pagina do SIGEP.");
        esconderLoading();
        return;
    }
    if (resposta.erro) {
        mostrarMensagem(traduzirErro(resposta.erro));
        esconderLoading();
        return;
    }

    let analises = Array.isArray(resposta.analises) ? resposta.analises : [];

    // Sincronizar com a planilha e aplicar distribuicao
    if (acao === "analisarTabela" && analises.length > 0) {
        mostrarLoading("Distribuindo processos...");
        try {
            const Distribution = globalThis.HabiteseApp.Distribution;
            if (Distribution && typeof Distribution.distribuir === "function") {
                analises = await Distribution.distribuir(analises);
            }
        } catch (erro) {
            Logger.error("Falha na distribuicao.", erro);
        }
    }

    const totaisPorResponsavel = contarPorResponsavel(analises);
    atualizarDashboard(totaisPorResponsavel, resposta.resumo?.semAnalise);
    ultimasAnalises = analises;
    renderizarAnalises(ultimasAnalises, analistasAtuais);
    esconderLoading();
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

// 
// Gestao de Analistas
// 
async function carregarAnalistas() {
    try {
        const dados = await chrome.storage.local.get("analistas");
        const salvos = dados.analistas;
        let lista;
        if (Array.isArray(salvos) && salvos.length > 0) {
            lista = salvos;
        } else {
            lista = ["Douglas", "Gabriel"];
            await chrome.storage.local.set({ analistas: lista });
        }
        analistasAtuais = lista;
        renderizarAnalistas(lista);
        popularFiltroAnalistas(lista);
        popularLegendaAnalistas(lista);
        popularDashboardAnalistas(lista);
    } catch (erro) {
        Logger.error("Falha ao carregar analistas.", erro);
    }
}

async function adicionarAnalista() {
    const input = document.getElementById("inputNovoAnalista");
    if (!input || !input.value.trim()) return;
    const nome = input.value.trim();
    try {
        const dados = await chrome.storage.local.get("analistas");
        const lista = Array.isArray(dados.analistas) && dados.analistas.length > 0
            ? dados.analistas
            : ["Douglas", "Gabriel"];
        if (lista.includes(nome)) {
            mostrarErroConfig(`Analista "${nome}" ja existe.`);
            return;
        }
        lista.push(nome);
        await chrome.storage.local.set({ analistas: lista });
        input.value = "";
        analistasAtuais = lista;
        renderizarAnalistas(lista);
        popularFiltroAnalistas(lista);
        popularLegendaAnalistas(lista);
        popularDashboardAnalistas(lista);
    } catch (erro) {
        Logger.error("Falha ao adicionar analista.", erro);
        mostrarErroConfig("Nao foi possivel adicionar o analista.");
    }
}

async function removerAnalista(nome) {
    try {
        const dados = await chrome.storage.local.get("analistas");
        const lista = Array.isArray(dados.analistas) && dados.analistas.length > 0
            ? dados.analistas
            : ["Douglas", "Gabriel"];
        const novaLista = lista.filter(item => item !== nome);
        if (novaLista.length === 0) {
            mostrarErroConfig("Deve existir pelo menos um analista.");
            renderizarAnalistas(lista);
            return;
        }
        await chrome.storage.local.set({ analistas: novaLista });
        analistasAtuais = novaLista;
        renderizarAnalistas(novaLista);
        popularFiltroAnalistas(novaLista);
        popularLegendaAnalistas(novaLista);
        popularDashboardAnalistas(novaLista);
    } catch (erro) {
        Logger.error("Falha ao remover analista.", erro);
        mostrarErroConfig("Nao foi possivel remover o analista.");
    }
}

function renderizarAnalistas(lista) {
    const container = document.getElementById("listaAnalistas");
    if (!container) return;
    container.innerHTML = "";
    lista.forEach(nome => {
        const item = document.createElement("div");
        item.className = "listaAnalistas-item";
        const span = document.createElement("span");
        span.textContent = nome;
        const botao = document.createElement("button");
        botao.type = "button";
        botao.textContent = "Remover";
        botao.addEventListener("click", () => removerAnalista(nome));
        item.appendChild(span);
        item.appendChild(botao);
        container.appendChild(item);
    });
}

function mostrarErroConfig(mensagem) {
    const elemento = document.getElementById("mensagemConfiguracoes");
    if (elemento) {
        elemento.textContent = mensagem;
        elemento.classList.add("visivel");
        setTimeout(() => elemento.classList.remove("visivel"), 3000);
    }
}

// 
// Sistema de Senha
// 
async function abrirConfig() {
    try {
        const dados = await chrome.storage.local.get("configSenha");
        if (!dados.configSenha || dados.configSenha === "") {
            mostrarModalCriarSenha();
        } else {
            mostrarModalSenha();
        }
    } catch (erro) {
        Logger.error("Falha ao verificar senha.", erro);
    }
}

function mostrarModalSenha(mensagemInfo = "") {
    const modal = document.getElementById("modalSenha");
    const input = document.getElementById("inputSenha");
    const erro = document.getElementById("erroSenha");
    const desc = document.getElementById("descModalSenha");
    if (!modal || !input || !erro) return;
    input.value = "";
    erro.classList.add("oculto");
    desc.textContent = mensagemInfo || "Digite a senha para acessar as configuracoes.";
    modal.classList.remove("oculto");
    input.focus();
}

function fecharModalSenha() {
    const modal = document.getElementById("modalSenha");
    if (modal) modal.classList.add("oculto");
}

async function confirmarSenha() {
    const input = document.getElementById("inputSenha");
    const erro = document.getElementById("erroSenha");
    if (!input || !erro) return;
    const senha = input.value.trim();
    if (!senha) {
        erro.textContent = "Digite a senha.";
        erro.classList.remove("oculto");
        return;
    }
    try {
        const dados = await chrome.storage.local.get("configSenha");
        if (senha === dados.configSenha) {
            fecharModalSenha();
            mostrarConfiguracoes();
        } else {
            erro.textContent = "Senha incorreta.";
            erro.classList.remove("oculto");
        }
    } catch (erroCatch) {
        Logger.error("Falha ao verificar senha.", erroCatch);
        erro.textContent = "Erro ao verificar senha.";
        erro.classList.remove("oculto");
    }
}

function mostrarModalCriarSenha() {
    const modal = document.getElementById("modalCriarSenha");
    if (!modal) return;
    ["inputNovaSenha", "inputConfirmarNovaSenha", "inputPerguntaRecuperacao", "inputRespostaRecuperacao"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = "";
    });
    const erro = document.getElementById("erroCriarSenha");
    if (erro) erro.classList.add("oculto");
    modal.classList.remove("oculto");
    document.getElementById("inputNovaSenha")?.focus();
}

function fecharModalCriarSenha() {
    const modal = document.getElementById("modalCriarSenha");
    if (modal) modal.classList.add("oculto");
}

async function salvarNovaSenha() {
    const senha = document.getElementById("inputNovaSenha")?.value.trim() || "";
    const confirmar = document.getElementById("inputConfirmarNovaSenha")?.value.trim() || "";
    const pergunta = document.getElementById("inputPerguntaRecuperacao")?.value.trim() || "";
    const resposta = document.getElementById("inputRespostaRecuperacao")?.value.trim() || "";
    const erro = document.getElementById("erroCriarSenha");
    if (!erro) return;

    if (!senha || senha.length < 3) {
        erro.textContent = "Senha deve ter pelo menos 3 caracteres.";
        erro.classList.remove("oculto");
        return;
    }
    if (senha !== confirmar) {
        erro.textContent = "As senhas nao coincidem.";
        erro.classList.remove("oculto");
        return;
    }
    if (!pergunta || !resposta) {
        erro.textContent = "Pergunta e resposta de seguranca sao obrigatorias.";
        erro.classList.remove("oculto");
        return;
    }

    try {
        await chrome.storage.local.set({
            configSenha: senha,
            perguntaRecuperacao: pergunta,
            respostaRecuperacao: resposta.toLowerCase()
        });
        fecharModalCriarSenha();
        mostrarConfiguracoes();
    } catch (erroSave) {
        Logger.error("Falha ao salvar senha.", erroSave);
        erro.textContent = "Erro ao salvar. Tente novamente.";
        erro.classList.remove("oculto");
    }
}

async function mostrarModalRecuperacao() {
    fecharModalSenha();
    const modal = document.getElementById("modalRecuperacao");
    const perguntaEl = document.getElementById("perguntaRecuperacaoTexto");
    const erro = document.getElementById("erroRecuperacao");
    const input = document.getElementById("inputRespostaRecuperacaoModal");
    if (!modal || !perguntaEl) return;

    try {
        const dados = await chrome.storage.local.get(["perguntaRecuperacao", "respostaRecuperacao"]);
        if (!dados.perguntaRecuperacao) {
            perguntaEl.textContent = "Nenhuma pergunta de seguranca configurada. Recrie a senha.";
        } else {
            perguntaEl.textContent = dados.perguntaRecuperacao;
        }
    } catch (erroLoad) {
        Logger.error("Falha ao carregar pergunta de recuperacao.", erroLoad);
        perguntaEl.textContent = "Erro ao carregar pergunta. Tente novamente.";
    }
    if (erro) erro.classList.add("oculto");
    if (input) input.value = "";
    modal.classList.remove("oculto");
    input?.focus();
}

function fecharModalRecuperacao() {
    const modal = document.getElementById("modalRecuperacao");
    if (modal) modal.classList.add("oculto");
}

async function confirmarRecuperacao() {
    const resposta = document.getElementById("inputRespostaRecuperacaoModal")?.value?.toLowerCase().trim() || "";
    const erro = document.getElementById("erroRecuperacao");
    if (!erro) return;

    try {
        const dados = await chrome.storage.local.get(["respostaRecuperacao", "configSenha"]);

        if (!dados.respostaRecuperacao) {
            erro.textContent = "Nenhuma resposta de seguranca encontrada. Recrie a senha.";
            erro.classList.remove("oculto");
            return;
        }

        if (resposta && resposta === dados.respostaRecuperacao) {
            await chrome.storage.local.set({ configSenha: "" });
            fecharModalRecuperacao();
            mostrarModalCriarSenha();
        } else {
            erro.textContent = "Resposta incorreta.";
            erro.classList.remove("oculto");
        }
    } catch (erroRec) {
        Logger.error("Falha na recuperacao.", erroRec);
        erro.textContent = "Erro ao verificar resposta. Tente novamente.";
        erro.classList.remove("oculto");
    }
}

// 
// Debug
// 
async function carregarEstadoDebug() {
    try {
        const dados = await chrome.storage.local.get("debugAtivo");
        const checkbox = document.getElementById("toggleDebug");
        if (checkbox) {
            checkbox.checked = dados.debugAtivo === true;
        }
    } catch (erro) {
        Logger.error("Falha ao carregar estado de debug.", erro);
    }
}

async function alternarDebug() {
    const checkbox = document.getElementById("toggleDebug");
    if (!checkbox) return;
    try {
        await chrome.storage.local.set({ debugAtivo: checkbox.checked });
    } catch (erro) {
        Logger.error("Falha ao salvar estado de debug.", erro);
    }
}

// 
// Historico de Distribuicao
// 
async function carregarHistorico() {
    const container = document.getElementById("listaHistorico");
    const resumo = document.getElementById("resumoHistorico");
    if (!container || !resumo) return;
    try {
        const dados = await chrome.storage.local.get("historicoDistribuicao");
        const historico = Array.isArray(dados.historicoDistribuicao) ? dados.historicoDistribuicao : [];

        container.innerHTML = "";
        resumo.innerHTML = "";

        if (historico.length === 0) {
            container.innerHTML = '<p style="font-size:12px;color:#687487;">Nenhuma distribuicao registrada.</p>';
            return;
        }

        const contagem = {};
        historico.forEach(entry => {
            contagem[entry.analista] = (contagem[entry.analista] || 0) + 1;
        });

        Object.entries(contagem).forEach(([nome, total]) => {
            const item = document.createElement("div");
            item.className = "resumoHistorico-item";
            item.innerHTML = `<strong>${total}</strong> ${nome}`;
            resumo.appendChild(item);
        });

        const recentes = [...historico].reverse().slice(0, 50);
        recentes.forEach(entry => {
            const item = document.createElement("div");
            item.className = "historico-item";
            const data = new Date(entry.data);
            const dataFmt = data.toLocaleDateString("pt-BR") + " " +
                data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

            const spanAnalista = document.createElement("span");
            spanAnalista.className = "historico-item-analista";
            spanAnalista.textContent = entry.analista;

            const spanData = document.createElement("span");
            spanData.className = "historico-item-data";
            spanData.textContent = dataFmt;

            const spanDetalhes = document.createElement("span");
            spanDetalhes.className = "historico-item-detalhes";
            spanDetalhes.textContent = [
                entry.proprietario || "Sem proprietario",
                entry.area || "",
                entry.usoImovel || "",
                entry.tipo || ""
            ].filter(Boolean).join(" - ");

            item.appendChild(spanAnalista);
            item.appendChild(spanData);
            item.appendChild(spanDetalhes);
            container.appendChild(item);
        });
    } catch (erro) {
        Logger.error("Falha ao carregar historico.", erro);
    }
}

function exportarHistoricoCSV() {
    chrome.storage.local.get("historicoDistribuicao").then(dados => {
        const historico = Array.isArray(dados.historicoDistribuicao) ? dados.historicoDistribuicao : [];
        if (historico.length === 0) {
            mostrarErroConfig("Nao ha historico para exportar.");
            return;
        }
        const cabecalho = "Data,Analista,Processo,Proprietario,Area,Uso,Tipo\n";
        const linhas = historico.map(e => {
            return [
                e.data || "",
                `"${(e.analista || "").replace(/"/g, '""')}"`,
                `"${(e.buildingConstructionId || "").replace(/"/g, '""')}"`,
                `"${(e.proprietario || "").replace(/"/g, '""')}"`,
                `"${(e.area || "").replace(/"/g, '""')}"`,
                `"${(e.usoImovel || "").replace(/"/g, '""')}"`,
                `"${(e.tipo || "").replace(/"/g, '""')}"`
            ].join(",");
        }).join("\n");

        const csv = cabecalho + linhas;
        const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `historico-distribuicao-${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    }).catch(erro => {
        Logger.error("Falha ao exportar historico.", erro);
        mostrarErroConfig("Nao foi possivel exportar o historico.");
    });
}

async function limparHistorico() {
    try {
        await chrome.storage.local.set({ historicoDistribuicao: [] });
        await carregarHistorico();
        mostrarErroConfig("Historico limpo.");
    } catch (erro) {
        Logger.error("Falha ao limpar historico.", erro);
        mostrarErroConfig("Nao foi possivel limpar o historico.");
    }
}

// 
// Loading
// 
function mostrarLoading(texto = "Buscando analises...") {
    const overlay = document.getElementById("loadingOverlay");
    const textoEl = overlay?.querySelector(".loading-texto");
    if (textoEl) textoEl.textContent = texto;
    if (overlay) overlay.classList.remove("oculto");
}

function esconderLoading() {
    const overlay = document.getElementById("loadingOverlay");
    if (overlay) overlay.classList.add("oculto");
}

// 
// Inicializacao
// 
export async function iniciarPopup() {
    Logger.info("Popup iniciado.");
    alternarAba("analises");
    iniciarSincronizacaoAutomaticaLocal();
    await carregarAnalistas();

    adicionarEvento("btnTabela", "click", () => enviarAcao("analisarTabela"));
    adicionarEvento("filtroAnalista", "change", () => renderizarAnalises(ultimasAnalises, analistasAtuais));
    adicionarEvento("abaAnalises", "click", () => alternarAba("analises"));
    adicionarEvento("abaNotificacoes", "click", async () => {
        alternarAba("notificacoes");
        if (!notificacoesCarregadas) {
            notificacoesCarregadas = true;
            await carregarNotificacoes(estado, mostrarMensagem);
        }
    });
    adicionarEvento("btnBuscarNotificacoes", "click", () => sincronizarNotificacoesEmSegundoPlano(estado, mostrarMensagem));
    adicionarEvento("filtroStatusNotificacoes", "change", () => renderizarNotificacoes(estado.gruposNotificacoes, estado));
    adicionarEvento("btnConfig", "click", abrirConfig);
    adicionarEvento("btnConfirmarSenha", "click", confirmarSenha);
    adicionarEvento("btnFecharModalSenha", "click", fecharModalSenha);
    adicionarEvento("btnEsqueciSenha", "click", mostrarModalRecuperacao);
    adicionarEvento("btnConfirmarRecuperacao", "click", confirmarRecuperacao);
    adicionarEvento("btnFecharModalRecuperacao", "click", fecharModalRecuperacao);
    adicionarEvento("btnSalvarNovaSenha", "click", salvarNovaSenha);
    adicionarEvento("btnFecharModalCriarSenha", "click", fecharModalCriarSenha);
    adicionarEvento("btnAdicionarAnalista", "click", adicionarAnalista);
    adicionarEvento("inputNovoAnalista", "keydown", (e) => {
        if (e.key === "Enter") adicionarAnalista();
    });
    adicionarEvento("toggleDebug", "change", alternarDebug);
    adicionarEvento("btnExportarHistorico", "click", exportarHistoricoCSV);
    adicionarEvento("btnLimparHistorico", "click", limparHistorico);
    adicionarEvento("btnPopout", "click", async () => {
        await chrome.windows.create({
            url: chrome.runtime.getURL("popup/popup.html"),
            type: "popup",
            width: 420,
            height: 700
        });
        window.close();
    });
}