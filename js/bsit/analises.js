import { Analysis } from "../models/Analysis.js";
import { BSIT_SELECTORS } from "./selectors.js";
import { TableReader } from "./tableReader.js";

export class BSITAnalises {

    /**
     * Retorna todas as análises da tabela.
     */
    static listar() {

        const linhas = TableReader.lerTabela(
            BSIT_SELECTORS.TABLE_ANALISES
        );

        return linhas
            .filter(colunas => colunas.length >= 11)
            .map(colunas => {

                return new Analysis({

                    codigoImovel: colunas[0],

                    endereco: colunas[1],

                    proprietario: colunas[2],

                    documento: colunas[3],

                    tipoObra: colunas[4],

                    area: Number(
                        colunas[5]
                            .replace(/\./g, "")
                            .replace(",", ".")
                    ) || 0,

                    categoria: colunas[6],

                    situacao: colunas[7],

                    tipoAnalise: colunas[9],

                    analista: colunas[10],

                    possuiAcoes: true

                });

            });

    }

    /**
     * Busca por código do imóvel.
     */
    static buscarPorCodigo(codigo) {

        return this.listar().find(
            item => item.codigoImovel === codigo
        );

    }

    /**
     * Retorna somente análises sem análise.
     */
    static semAnalise() {

        return this.listar().filter(
            item => item.estaSemAnalise()
        );

    }

    /**
     * Retorna análises de um analista.
     */
    static porAnalista(nome) {

        return this.listar().filter(
            item => item.analista === nome
        );

    }

}