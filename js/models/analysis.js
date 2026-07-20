export class Analysis {

    constructor(data = {}) {

        this.codigoImovel = data.codigoImovel ?? "";

        this.endereco = data.endereco ?? "";

        this.proprietario = data.proprietario ?? "";

        this.documento = data.documento ?? "";

        this.tipoObra = data.tipoObra ?? "";

        this.area = Number(data.area ?? 0);

        this.categoria = data.categoria ?? "";

        this.situacao = data.situacao ?? "";

        this.tipoAnalise = data.tipoAnalise ?? "";

        this.analista = data.analista ?? "";

        this.possuiAcoes = data.possuiAcoes ?? false;

    }

    estaSemAnalise() {

        return this.situacao === "Sem Análise";

    }

    possuiAnalista() {

        return this.analista !== ""

            && this.analista !== "Sem Usuário";

    }

    areaFormatada() {

        return this.area.toLocaleString(

            "pt-BR",

            {

                minimumFractionDigits: 2,

                maximumFractionDigits: 2

            }

        );

    }

    toJSON() {

        return {

            codigoImovel: this.codigoImovel,

            endereco: this.endereco,

            proprietario: this.proprietario,

            documento: this.documento,

            tipoObra: this.tipoObra,

            area: this.area,

            categoria: this.categoria,

            situacao: this.situacao,

            tipoAnalise: this.tipoAnalise,

            analista: this.analista,

            possuiAcoes: this.possuiAcoes

        };

    }

}