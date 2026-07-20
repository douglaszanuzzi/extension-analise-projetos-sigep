export class Dom {

    static byId(id) {

        return document.getElementById(id);

    }

    static query(selector, root = document) {

        return root.querySelector(selector);

    }

    static queryAll(selector, root = document) {

        return [...root.querySelectorAll(selector)];

    }

    static texto(elemento) {

        if (!elemento) {

            return "";

        }

        return elemento.innerText.trim();

    }

    static html(elemento) {

        if (!elemento) {

            return "";

        }

        return elemento.innerHTML;

    }

    static existe(selector, root = document) {

        return root.querySelector(selector) !== null;

    }

    static esperar(ms) {

        return new Promise(resolve => setTimeout(resolve, ms));

    }

}