"use strict";

const App = {

    archivos: [],
    datosUnificados: [],
    excelGenerado: null,

    columnasObjetivo: [
        "Numero de Chasis",
        "Playa",
        "Bloque",
        "Carril",
        "Posicion",
        "Ubicacion",
        "Codigo de Barras",
        "Observacion",
        "Estado"
    ],

    aliases: {

        chasis: [
            "numero de chasis",
            "número de chasis",
            "nro de chasis",
            "nro chasis",
            "n° chasis",
            "nº chasis",
            "numero chasis",
            "número chasis",
            "chasis"
        ],

        playa: [
            "playa"
        ],

        bloque: [
            "bloque"
        ],

        carril: [
            "carril"
        ],

        posicion: [
            "posicion",
            "posición"
        ],

        ubicacion: [
            "ubicacion",
            "ubicación"
        ],

        observacion: [
            "observacion",
            "observación",
            "obs",
            "observaciones"
        ]

    },

    init() {

        this.cacheDOM();
        this.bindEvents();

        document.getElementById("appVersion").textContent =
            window.APP_VERSION || "desconocida";

    },


    cacheDOM() {

        this.inicio =
            document.getElementById("inicio");

        this.moduloUnificador =
            document.getElementById("moduloUnificador");

        this.btnUnificador =
            document.getElementById("btnUnificador");

        this.btnVolverInicio =
            document.getElementById("btnVolverInicio");

        this.fileInput =
            document.getElementById("fileInput");

        this.btnSeleccionarArchivos =
            document.getElementById("btnSeleccionarArchivos");

        this.dropZone =
            document.getElementById("dropZone");

        this.archivosSeleccionados =
            document.getElementById("archivosSeleccionados");

        this.listaArchivos =
            document.getElementById("listaArchivos");

        this.btnLimpiarArchivos =
            document.getElementById("btnLimpiarArchivos");

        this.accionesUnificador =
            document.getElementById("accionesUnificador");

        this.btnUnificar =
            document.getElementById("btnUnificar");

        this.procesando =
            document.getElementById("procesando");

        this.resultado =
            document.getElementById("resultado");

        this.btnDescargarExcel =
            document.getElementById("btnDescargarExcel");

        this.btnAbrirGestion =
            document.getElementById("btnAbrirGestion");

        this.tablaResultadoBody =
            document.getElementById("tablaResultadoBody");

    },


    bindEvents() {

        this.btnUnificador.addEventListener(
            "click",
            () => this.mostrarUnificador()
        );

        this.btnVolverInicio.addEventListener(
            "click",
            () => this.mostrarInicio()
        );

        this.btnSeleccionarArchivos.addEventListener(
            "click",
            () => this.fileInput.click()
        );

        this.fileInput.addEventListener(
            "change",
            event => this.agregarArchivos(event.target.files)
        );

        this.btnLimpiarArchivos.addEventListener(
            "click",
            () => this.limpiarArchivos()
        );

        this.btnUnificar.addEventListener(
            "click",
            () => this.unificar()
        );

        this.btnDescargarExcel.addEventListener(
            "click",
            () => this.descargarExcel()
        );

        this.btnAbrirGestion.addEventListener(
            "click",
            () => this.abrirGestion()
        );

        this.configurarDragAndDrop();

    },


    configurarDragAndDrop() {

        ["dragenter", "dragover"].forEach(eventName => {

            this.dropZone.addEventListener(
                eventName,
                event => {

                    event.preventDefault();
                    event.stopPropagation();

                    this.dropZone.classList.add("drag-over");

                }
            );

        });


        ["dragleave", "drop"].forEach(eventName => {

            this.dropZone.addEventListener(
                eventName,
                event => {

                    event.preventDefault();
                    event.stopPropagation();

                    this.dropZone.classList.remove("drag-over");

                }
            );

        });


        this.dropZone.addEventListener(
            "drop",
            event => {

                const files = event.dataTransfer.files;

                this.agregarArchivos(files);

            }
        );

    },


    mostrarInicio() {

        this.inicio.classList.remove("oculto");
        this.moduloUnificador.classList.add("oculto");

    },


    mostrarUnificador() {

        this.inicio.classList.add("oculto");
        this.moduloUnificador.classList.remove("oculto");

    },


    agregarArchivos(fileList) {

        const nuevos = Array.from(fileList);

        nuevos.forEach(file => {

            const existe = this.archivos.some(
                f =>
                    f.name === file.name &&
                    f.size === file.size &&
                    f.lastModified === file.lastModified
            );

            if (!existe) {
                this.archivos.push(file);
            }

        });

        this.renderArchivos();

    },


    renderArchivos() {

        this.listaArchivos.innerHTML = "";

        if (this.archivos.length === 0) {

            this.archivosSeleccionados.classList.add("oculto");
            this.accionesUnificador.classList.add("oculto");

            return;
        }


        this.archivosSeleccionados.classList.remove("oculto");
        this.accionesUnificador.classList.remove("oculto");


        this.archivos.forEach((file, index) => {

            const div = document.createElement("div");

            div.className = "archivo-item";

            div.innerHTML = `
                <div class="archivo-icono">📄</div>

                <div class="archivo-info">
                    <strong>${this.escapeHTML(file.name)}</strong>
                    <span>${this.formatearTamano(file.size)}</span>
                </div>

                <button
                    class="btn-eliminar-archivo"
                    data-index="${index}"
                    title="Eliminar"
                >
                    ×
                </button>
            `;

            div.querySelector(".btn-eliminar-archivo")
                .addEventListener(
                    "click",
                    () => this.eliminarArchivo(index)
                );

            this.listaArchivos.appendChild(div);

        });

    },


    eliminarArchivo(index) {

        this.archivos.splice(index, 1);

        this.renderArchivos();

    },


    limpiarArchivos() {

        this.archivos = [];

        this.fileInput.value = "";

        this.resultado.classList.add("oculto");

        this.renderArchivos();

    },


    async unificar() {

        if (this.archivos.length === 0) {
            this.mostrarToast("Seleccioná al menos un archivo.");
            return;
        }


        this.procesando.classList.remove("oculto");

        this.resultado.classList.add("oculto");

        this.btnUnificar.disabled = true;


        try {

            const todasLasFilas = [];

            for (let i = 0; i < this.archivos.length; i++) {

                this.actualizarProceso(
                    `Leyendo archivo ${i + 1} de ${this.archivos.length}`
                );

                const filas =
                    await this.leerExcel(this.archivos[i]);

                filas.forEach(fila => {

                    const normalizada =
                        this.normalizarFila(fila);

                    if (normalizada) {
                        todasLasFilas.push(normalizada);
                    }

                });

            }


            this.actualizarProceso(
                "Analizando duplicaciones e inconsistencias..."
            );


            this.datosUnificados =
                this.detectarConflictos(todasLasFilas);


            this.actualizarProceso(
                "Generando códigos de barras..."
            );


            await this.generarCodigosDeBarras();


            this.actualizarProceso(
                "Preparando resultado..."
            );


            this.renderResultado();

            this.procesando.classList.add("oculto");

            this.resultado.classList.remove("oculto");

        } catch (error) {

            console.error(error);

            this.procesando.classList.add("oculto");

            this.mostrarToast(
                "Error al procesar los archivos: " +
                error.message
            );

        } finally {

            this.btnUnificar.disabled = false;

        }

    },


    actualizarProceso(texto) {

        document.getElementById("textoProceso").textContent =
            texto;

    },


    async leerExcel(file) {

        const buffer =
            await file.arrayBuffer();

        const workbook =
            XLSX.read(buffer, {
                type: "array",
                cellDates: true
            });


        const resultado = [];


        workbook.SheetNames.forEach(sheetName => {

            const sheet =
                workbook.Sheets[sheetName];

            const filas =
                XLSX.utils.sheet_to_json(
                    sheet,
                    {
                        defval: "",
                        raw: false
                    }
                );


            filas.forEach(fila => {

                resultado.push(fila);

            });

        });


        return resultado;

    },


    normalizarNombre(nombre) {

        return String(nombre || "")
            .trim()
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[°ºª.]/g, "")
            .replace(/\s+/g, " ");

    },


    detectarTipoColumna(nombre) {

        const normalizado =
            this.normalizarNombre(nombre);


        for (const tipo in this.aliases) {

            const aliases =
                this.aliases[tipo];

            for (const alias of aliases) {

                const aliasNormalizado =
                    this.normalizarNombre(alias);

                if (
                    normalizado === aliasNormalizado
                ) {
                    return tipo;
                }

            }

        }


        if (normalizado.includes("chasis")) {
            return "chasis";
        }

        if (normalizado.includes("playa")) {
            return "playa";
        }

        if (normalizado.includes("bloque")) {
            return "bloque";
        }

        if (normalizado.includes("carril")) {
            return "carril";
        }

        if (normalizado.includes("posicion")) {
            return "posicion";
        }

        if (normalizado.includes("ubicacion")) {
            return "ubicacion";
        }

        if (
            normalizado.includes("observacion") ||
            normalizado.includes("observaciones")
        ) {
            return "observacion";
        }


        return null;

    },


    normalizarFila(fila) {

        const resultado = {

            chasis: "",
            playa: "",
            bloque: "",
            carril: "",
            posicion: "",
            ubicacion: "",
            observacion: "",
            estado: "OK",
            codigoBarras: ""

        };


        let encontrada = false;


        Object.keys(fila).forEach(nombre => {

            const tipo =
                this.detectarTipoColumna(nombre);

            if (!tipo) return;

            encontrada = true;

            const valor =
                fila[nombre] === null ||
                fila[nombre] === undefined
                    ? ""
                    : String(fila[nombre]).trim();


            if (tipo === "chasis") {
                resultado.chasis = valor;
            }

            else if (tipo === "playa") {
                resultado.playa = valor;
            }

            else if (tipo === "bloque") {
                resultado.bloque = valor;
            }

            else if (tipo === "carril") {
                resultado.carril = valor;
            }

            else if (tipo === "posicion") {
                resultado.posicion = valor;
            }

            else if (tipo === "ubicacion") {
                resultado.ubicacion = valor;
            }

            else if (tipo === "observacion") {
                resultado.observacion = valor;
            }

        });


        if (!encontrada) {
            return null;
        }


        if (!resultado.chasis) {
            return null;
        }


        return resultado;

    },


    detectarConflictos(filas) {

        const porChasis = new Map();
        const porUbicacion = new Map();


        filas.forEach((fila, index) => {

            fila._index = index;

            const chasis =
                this.normalizarClave(fila.chasis);

            const ubicacion =
                this.obtenerClaveUbicacion(fila);


            if (chasis) {

                if (!porChasis.has(chasis)) {
                    porChasis.set(chasis, []);
                }

                porChasis.get(chasis).push(fila);

            }


            if (ubicacion) {

                if (!porUbicacion.has(ubicacion)) {
                    porUbicacion.set(ubicacion, []);
                }

                porUbicacion.get(ubicacion).push(fila);

            }

        });


        porChasis.forEach(grupo => {

            if (grupo.length <= 1) return;


            const ubicaciones =
                new Set(
                    grupo.map(
                        fila =>
                            this.obtenerClaveUbicacion(fila)
                    )
                );


            if (ubicaciones.size > 1) {

                grupo.forEach(fila => {

                    this.agregarObservacion(
                        fila,
                        "Chasis Duplicado"
                    );

                    fila.estado = "REVISAR";

                });

            }

        });


        porUbicacion.forEach(grupo => {

            if (grupo.length <= 1) return;


            const chasis =
                new Set(
                    grupo.map(
                        fila =>
                            this.normalizarClave(
                                fila.chasis
                            )
                    )
                );


            if (chasis.size > 1) {

                grupo.forEach(fila => {

                    this.agregarObservacion(
                        fila,
                        "Comparten la misma Ubicacion"
                    );

                    fila.estado = "REVISAR";

                });

            }

        });


        return filas;

    },


    obtenerClaveUbicacion(fila) {

        const playa =
            this.normalizarClave(fila.playa);

        const bloque =
            this.normalizarClave(fila.bloque);

        const carril =
            this.normalizarClave(fila.carril);

        const posicion =
            this.normalizarClave(fila.posicion);


        if (!playa || !bloque || !carril || !posicion) {

            return this.normalizarClave(
                fila.ubicacion
            );

        }


        return [
            playa,
            bloque,
            carril,
            posicion
        ].join("|");

    },


    normalizarClave(valor) {

        return String(valor || "")
            .trim()
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/\s+/g, "");

    },


    agregarObservacion(fila, nueva) {

        const actual =
            String(fila.observacion || "").trim();


        if (!actual) {

            fila.observacion = nueva;
            return;

        }


        const partes =
            actual
                .split("|")
                .map(x => x.trim())
                .filter(Boolean);


        if (
            !partes.some(
                x =>
                    this.normalizarClave(x) ===
                    this.normalizarClave(nueva)
            )
        ) {

            partes.push(nueva);

        }


        fila.observacion =
            partes.join(" | ");

    },


    async generarCodigosDeBarras() {

        for (const fila of this.datosUnificados) {

            if (!fila.chasis) continue;

            fila.codigoBarras =
                await this.generarImagenBarcode(
                    fila.chasis
                );

        }

    },


    generarImagenBarcode(texto) {

        return new Promise((resolve, reject) => {

            try {

                const canvas =
                    document.createElement("canvas");


                JsBarcode(canvas, texto, {

                    format: "CODE128",

                    width: 2,

                    height: 40,

                    displayValue: true,

                    fontSize: 12,

                    margin: 2,

                    background: "#ffffff",

                    lineColor: "#000000"

                });


                resolve(canvas.toDataURL("image/png"));

            } catch (error) {

                reject(error);

            }

        });

    },


    renderResultado() {

        this.tablaResultadoBody.innerHTML = "";


        let conflictos = 0;


        this.datosUnificados.forEach(fila => {

            const tr =
                document.createElement("tr");


            if (fila.estado === "REVISAR") {

                tr.classList.add("fila-conflicto");

                conflictos++;

            }


            tr.innerHTML = `

                <td class="chasis-cell">
                    ${this.escapeHTML(fila.chasis)}
                </td>

                <td>${this.escapeHTML(fila.playa)}</td>

                <td>${this.escapeHTML(fila.bloque)}</td>

                <td>${this.escapeHTML(fila.carril)}</td>

                <td>${this.escapeHTML(fila.posicion)}</td>

                <td>${this.escapeHTML(fila.ubicacion)}</td>

                <td class="barcode-cell">
                    <img
                        src="${fila.codigoBarras}"
                        alt="Código de barras"
                    >
                </td>

                <td>
                    ${this.escapeHTML(fila.observacion)}
                </td>

                <td>
                    <span class="estado ${fila.estado === "REVISAR"
                        ? "estado-revisar"
                        : "estado-ok"
                    }">
                        ${fila.estado}
                    </span>
                </td>

            `;


            this.tablaResultadoBody.appendChild(tr);

        });


        const total =
            this.datosUnificados.length;


        const chasisUnicos =
            new Set(
                this.datosUnificados.map(
                    fila =>
                        this.normalizarClave(
                            fila.chasis
                        )
                )
            );


        document.getElementById(
            "statVehiculos"
        ).textContent =
            chasisUnicos.size;


        document.getElementById(
            "statFilas"
        ).textContent =
            total;


        document.getElementById(
            "statConflictos"
        ).textContent =
            conflictos;


        document.getElementById(
            "resumenResultado"
        ).textContent =
            `${total} filas procesadas correctamente.`;


        const alerta =
            document.getElementById(
                "alertaConflictos"
            );


        if (conflictos > 0) {

            alerta.classList.remove("oculto");

            document.getElementById(
                "resultadoEstado"
            ).textContent =
                "⚠ REVISAR";

            document.getElementById(
                "resultadoEstado"
            ).className =
                "estado-revisar";

        } else {

            alerta.classList.add("oculto");

            document.getElementById(
                "resultadoEstado"
            ).textContent =
                "OK";

            document.getElementById(
                "resultadoEstado"
            ).className =
                "estado-ok";

        }

    },


    async descargarExcel() {

        if (!this.datosUnificados.length) {
            return;
        }


        const workbook =
            new ExcelJS.Workbook();


        workbook.creator =
            "Gestión de Playas";

        workbook.created =
            new Date();


        const worksheet =
            workbook.addWorksheet(
                "Planilla Unificada"
            );


        worksheet.columns = [

            {
                header: "Numero de Chasis",
                key: "chasis",
                width: 24
            },

            {
                header: "Playa",
                key: "playa",
                width: 12
            },

            {
                header: "Bloque",
                key: "bloque",
                width: 12
            },

            {
                header: "Carril",
                key: "carril",
                width: 12
            },

            {
                header: "Posicion",
                key: "posicion",
                width: 12
            },

            {
                header: "Ubicacion",
                key: "ubicacion",
                width: 20
            },

            {
                header: "Codigo de Barras",
                key: "codigoBarras",
                width: 38
            },

            {
                header: "Observacion",
                key: "observacion",
                width: 42
            },

            {
                header: "Estado",
                key: "estado",
                width: 16
            }

        ];


        const header =
            worksheet.getRow(1);


        header.height = 24;


        header.eachCell(cell => {

            cell.font = {
                bold: true,
                color: {
                    argb: "FFFFFFFF"
                }
            };

            cell.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: {
                    argb: "1F4E78"
                }
            };

            cell.alignment = {
                vertical: "middle",
                horizontal: "center"
            };

            cell.border = {
                bottom: {
                    style: "thin",
                    color: {
                        argb: "FFFFFFFF"
                    }
                }
            };

        });


        worksheet.autoFilter = {
            from: "A1",
            to: "I1"
        };


        worksheet.views = [
            {
                state: "frozen",
                ySplit: 1
            }
        ];


        for (const fila of this.datosUnificados) {

            const row =
                worksheet.addRow({

                    chasis: fila.chasis,

                    playa: fila.playa,

                    bloque: fila.bloque,

                    carril: fila.carril,

                    posicion: fila.posicion,

                    ubicacion: fila.ubicacion,

                    codigoBarras: "",

                    observacion: fila.observacion,

                    estado: fila.estado

                });


            row.height = 45;


            row.alignment = {
                vertical: "middle"
            };


            if (fila.estado === "REVISAR") {

                row.eachCell(cell => {

                    cell.fill = {
                        type: "pattern",
                        pattern: "solid",
                        fgColor: {
                            argb: "FCE4D6"
                        }
                    };

                });

            }


            const barcodeImageId =
                workbook.addImage({

                    base64: fila.codigoBarras,

                    extension: "png"

                });


            worksheet.addImage(
                barcodeImageId,
                {
                    tl: {
                        col: 6.05,
                        row: row.number - 0.85
                    },

                    ext: {
                        width: 270,
                        height: 40
                    }
                }
            );


            row.getCell(7).alignment = {
                vertical: "middle",
                horizontal: "center"
            };


            const estadoCell =
                row.getCell(9);


            estadoCell.alignment = {
                vertical: "middle",
                horizontal: "center"
            };


            if (fila.estado === "REVISAR") {

                estadoCell.font = {
                    bold: true,
                    color: {
                        argb: "9C0006"
                    }
                };

                estadoCell.fill = {
                    type: "pattern",
                    pattern: "solid",
                    fgColor: {
                        argb: "FFC7CE"
                    }
                };

            } else {

                estadoCell.font = {
                    bold: true,
                    color: {
                        argb: "006100"
                    }
                };

                estadoCell.fill = {
                    type: "pattern",
                    pattern: "solid",
                    fgColor: {
                        argb: "C6EFCE"
                    }
                };

            }

        }


        worksheet.getColumn(7).width = 40;


        worksheet.eachRow(row => {

            row.eachCell(cell => {

                cell.border = {

                    top: {
                        style: "thin",
                        color: {
                            argb: "D9E1F2"
                        }
                    },

                    bottom: {
                        style: "thin",
                        color: {
                            argb: "D9E1F2"
                        }
                    },

                    left: {
                        style: "thin",
                        color: {
                            argb: "D9E1F2"
                        }
                    },

                    right: {
                        style: "thin",
                        color: {
                            argb: "D9E1F2"
                        }
                    }

                };

            });

        });


        const buffer =
            await workbook.xlsx.writeBuffer();


        const blob =
            new Blob(
                [buffer],
                {
                    type:
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                }
            );


        const url =
            URL.createObjectURL(blob);


        const fecha =
            new Date()
                .toISOString()
                .slice(0, 10);


        const link =
            document.createElement("a");


        link.href = url;

        link.download =
            `Planilla_Unificada_${fecha}.xlsx`;


        document.body.appendChild(link);

        link.click();

        link.remove();

        URL.revokeObjectURL(url);

    },


    abrirGestion() {

        this.mostrarToast(
            "Módulo de gestión interactiva preparado para la siguiente etapa."
        );

    },


    formatearTamano(bytes) {

        if (bytes < 1024) {
            return bytes + " B";
        }

        if (bytes < 1024 * 1024) {
            return (
                (bytes / 102
