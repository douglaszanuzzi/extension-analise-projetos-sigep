import { Dom } from "../core/dom.js";

export class TableReader {

    /**
     * Obtém a tabela pelo ID.
     */
    static obterTabela(idTabela) {

        return Dom.byId(idTabela);

    }

    /**
     * Retorna todas as linhas da tabela.
     */
    static obterLinhas(tabela) {

        if (!tabela) {

            return [];

        }

        return Array.from(
            tabela.querySelectorAll("tbody tr")
        );

    }

    /**
     * Retorna todas as células de uma linha.
     */
    static obterCelulas(linha) {

        if (!linha) {

            return [];

        }

        return Array.from(linha.querySelectorAll("td"));

    }

    /**
     * Converte uma linha em um array de textos.
     */
    static lerLinha(linha) {

        return this.obterCelulas(linha)
            .map(td => Dom.texto(td));

    }

    /**
     * Lê toda a tabela.
     */
    static lerTabela(idTabela) {

        const tabela = this.obterTabela(idTabela);

        if (!tabela) {

            return [];

        }

        const linhas = this.obterLinhas(tabela);

        return linhas.map(linha => this.lerLinha(linha));

    }

}