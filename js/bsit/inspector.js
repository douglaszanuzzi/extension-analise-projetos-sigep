globalThis.HabiteseApp = globalThis.HabiteseApp || {};

async function inspectorInfo(...args) {
    const ativo = await isDebugAtivo();
    if (ativo) {
        console.info("[Inspector]", ...args);
    }
}
async function isDebugAtivo() {
    try {
        const dados = await chrome.storage.local.get("debugAtivo");
        return dados.debugAtivo === true;
    } catch {
        return false;
    }
}
globalThis.HabiteseApp.BSITInspector = {

    textoCelula(celulas, indice) {
        return celulas[indice]?.innerText?.trim() || "";
    },

    inspecionarPagina() {
        return {
            url: window.location.href,
            titulo: document.title,
            tabelas: document.querySelectorAll("table").length,
            formularios: document.querySelectorAll("form").length,
            iframes: document.querySelectorAll("iframe").length,
            elementosComId: document.querySelectorAll("[id]").length
        };
    },

    async analisarTabelaPrincipal() {
    const tabela = document.getElementById("formBuildingAnalisys:buildings");

    if (!tabela) {
        return { erro: "Tabela principal não encontrada." };
    }

    const linhas = tabela.querySelectorAll("tbody tr.rich-table-row");
    const totalLinhasDomNoMomento = linhas.length;

    const menus = document.querySelectorAll('[onclick*="buildingConstruction-id"]');

    const analises = [];
    let total = 0;
    let semAnalise = 0;
    let taxaPagamento = 0;
    let rejeitados = 0;

    linhas.forEach((linha, indice) => {
        const td = linha.querySelectorAll("td");
        if (td.length < 11) return;
        total++;

        const status = this.textoCelula(td, 7);

        let buildingConstructionId = null;
        const menu = menus[indice];
        if (menu) {
            const onclick = menu.getAttribute("onclick");
            const match = onclick.match(/buildingConstruction-id=(\d+)/);
            if (match) buildingConstructionId = match[1];
        }

        if (status === "Sem Análise") {
            semAnalise++;
            analises.push({
                buildingConstructionId,
                urlObra: buildingConstructionId
                    ? `${window.location.origin}/manager/tax-management/register/building-construction.jsf?buildingConstruction-id=${buildingConstructionId}`
                    : "",
                proprietario: this.textoCelula(td, 2),
                area: this.textoCelula(td, 5),
                usoImovel: this.textoCelula(td, 6),
                status,
                tipo: this.textoCelula(td, 9),
                analista: this.textoCelula(td, 10)
            });
        } else if (status === "Taxa para Pagamento") {
            taxaPagamento++;
        } else if (status === "Rejeitado") {
            rejeitados++;
        }
    });

    inspectorInfo("[DEBUG DISTRIBUICAO] Hipotese 1 - leitura inicial da tabela", {
        quantidadeLinhasDom: totalLinhasDomNoMomento,
        quantidadeProcessosLidos: total,
        quantidadeSemAnalise: semAnalise,
        quantidadeEnviadaAoDistribution: analises.length,
        idsEnviadosAoDistribution: analises.map(item => item.buildingConstructionId)
    });

    window.setTimeout(() => {
        const tabelaAtualizada = document.getElementById("formBuildingAnalisys:buildings");
        const linhasDepois = tabelaAtualizada
            ? tabelaAtualizada.querySelectorAll("tbody tr.rich-table-row")
            : [];
        inspectorInfo("[DEBUG DISTRIBUICAO] Hipotese 1 - tabela apos 3 segundos", {
            quantidadeLinhasDomInicial: totalLinhasDomNoMomento,
            quantidadeLinhasDomDepois: linhasDepois.length,
            houveMudancaQuantidadeLinhas: linhasDepois.length !== totalLinhasDomNoMomento
        });
    }, 3000);

    // REMOVIDO: await globalThis.HabiteseApp.Distribution.distribuir(analises);
    // A distribuição agora acontece apenas no popup (popupController.js → enviarAcao)

    return { resumo: { total, semAnalise, taxaPagamento, rejeitados }, analises };
},
    analisarPrimeiraLinha() {
        const tabela = document.getElementById("formBuildingAnalisys:buildings");
        if (!tabela) return { erro: "Tabela não encontrada." };

        const linha = tabela.querySelector("tr.rich-table-row");
        if (!linha) return { erro: "Nenhuma linha encontrada." };

        const resultado = { classe: linha.className, id: linha.id, tds: [] };

        linha.querySelectorAll("td").forEach((td, indice) => {
            resultado.tds.push({
                indice,
                texto: td.innerText?.trim() || "",
                html: td.innerHTML.substring(0, 300),
                links: td.querySelectorAll("a").length,
                inputs: td.querySelectorAll("input").length,
                botoes: td.querySelectorAll("button").length,
                imagens: td.querySelectorAll("img").length,
                spans: td.querySelectorAll("span").length,
                classes: td.className
            });
        });

        return resultado;
    },

    testarAcoes() {
        const tabela = document.getElementById("formBuildingAnalisys:buildings");
        if (!tabela) return { erro: "Tabela não encontrada." };

        const primeiraLinha = tabela.querySelector("tbody tr.rich-table-row");
        if (!primeiraLinha) return { erro: "Nenhuma linha encontrada." };

        const botao = primeiraLinha.querySelector("a");
        if (!botao) return { erro: "Botão Ações não encontrado." };

        botao.click();
        return { sucesso: true, mensagem: "Clique executado." };
    }
};