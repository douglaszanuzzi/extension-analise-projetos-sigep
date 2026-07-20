const BSITInspector = {

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

        const tabela = document.getElementById(
            "formBuildingAnalisys:buildings"
        );

        if (!tabela) {

            return {
                erro: "Tabela principal não encontrada."
            };

        }

        //------------------------------------------------------

        const linhas = tabela.querySelectorAll(
            "tbody tr.rich-table-row"
        );

        // Todos os menus "Acessar Obra"
        const menus = document.querySelectorAll(
            '[onclick*="buildingConstruction-id"]'
        );

        const analises = [];

        let total = 0;

        let semAnalise = 0;

        let taxaPagamento = 0;

        let rejeitados = 0;

        //------------------------------------------------------

        linhas.forEach((linha, indice) => {

        const td = linha.querySelectorAll("td");

        if (td.length < 11) {
            return;
        }

        total++;

        const status = td[7].innerText.trim();

        // ==========================================
        // Extrai o buildingConstruction-id
        // ==========================================

        let buildingConstructionId = null;

        const menu = menus[indice];

        if (menu) {
            const onclick = menu.getAttribute("onclick");

            const match = onclick.match(
                /buildingConstruction-id=(\d+)/
            );

            if (match) {
                buildingConstructionId = match[1];
            }
        }

        // ==========================================

        if (status === "Sem Análise") {

            semAnalise++;

            analises.push({
                buildingConstructionId,
                urlObra: buildingConstructionId
                    ? `${window.location.origin}/manager/tax-management/register/building-construction.jsf?buildingConstruction-id=${buildingConstructionId}`
                    : "",
                proprietario: td[2].innerText.trim(),
                area: td[5].innerText.trim(),
                usoImovel: td[6].innerText.trim(),
                status,
                tipo: td[9].innerText.trim(),
                analista: td[10].innerText.trim()
            });

        } else if (status === "Taxa para Pagamento") {

            taxaPagamento++;

        } else if (status === "Rejeitado") {

            rejeitados++;

        }

    });

        await Distribution.distribuir(analises);

        return {

            resumo: {

                total,

                semAnalise,

                taxaPagamento,

                rejeitados

            },

            analises

        };

    },

    analisarPrimeiraLinha() {

        const tabela =
            document.getElementById(
                "formBuildingAnalisys:buildings"
            );

        if (!tabela)

            return {

                erro: "Tabela não encontrada."

            };

        const linha = tabela.querySelector("tr.rich-table-row");

        if (!linha)

            return {

                erro: "Nenhuma linha encontrada."

            };

        const resultado = {

            classe: linha.className,

            id: linha.id,

            tds: []

        };

        linha.querySelectorAll("td").forEach((td, indice) => {

            resultado.tds.push({

                indice,

                texto: td.innerText.trim(),

                html: td.innerHTML.substring(0,300),

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

        const tabela = document.getElementById(
            "formBuildingAnalisys:buildings"
        );

        if (!tabela) {

            return {

                erro: "Tabela não encontrada."

            };

        }

        const primeiraLinha =
            tabela.querySelector(
                "tbody tr.rich-table-row"
            );

        if (!primeiraLinha) {

            return {

                erro: "Nenhuma linha encontrada."

            };

        }

        const botao = primeiraLinha.querySelector("a");

        if (!botao) {

            return {

                erro: "Botão Ações não encontrado."

            };

        }

        botao.click();

        return {

            sucesso: true,

            mensagem: "Clique executado."

        };

    }

};
