import { BSITAnalises } from "./analises.js";
import { BSIT_SELECTORS } from "./selectors.js";
import { TableReader } from "./tableReader.js";

window.Habitese ??= {};

window.Habitese.debug = {

    listarAnalises() {

        const lista = BSITAnalises.listar();

        console.table(lista);

        return lista;

    },

    tabela() {

        return TableReader.obterTabela(
            BSIT_SELECTORS.TABLE_ANALISES
        );

    },

    linhas() {

        const tabela = this.tabela();

        return TableReader.obterLinhas(tabela);

    },

    primeiraLinha() {

        const linhas = this.linhas();

        if (!linhas.length) {

            return null;

        }

        return TableReader.lerLinha(linhas[0]);

    },

    seletores() {

        return BSIT_SELECTORS;

    },

    estatisticas() {

        const lista = BSITAnalises.listar();

        return {

            total: lista.length,

            semAnalise: lista.filter(
                a => a.estaSemAnalise()
            ).length,

            comAnalista: lista.filter(
                a => a.possuiAnalista()
            ).length

        };

    }

};

console.log("=======================================");
console.log(" Habitese Debug habilitado");
console.log("=======================================");
console.log("Habitese.debug.listarAnalises()");
console.log("Habitese.debug.estatisticas()");
console.log("Habitese.debug.tabela()");
console.log("Habitese.debug.linhas()");
console.log("Habitese.debug.primeiraLinha()");
console.log("Habitese.debug.seletores()");
console.log("=======================================");