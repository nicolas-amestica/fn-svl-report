'use strict';
const mySQL = require('../../../common/mySQL');
const sql = require("mssql");
const fs = require('fs');
const fileManager = require('../../../common/fileManager');
const dateFormat = require('dateformat');
// const blobStorage = require('../../../common/blobStorage');
// const email = require('../../../common/email');
// const path = require("path");

/**
 * Obtiene los folios pendientes de finanzas.
 * @return {Json}: Retorna data y nombre en un objeto, si falla retorna excepción.
 */
module.exports.getDataProducts = async (business, country) => {

    try {

        /** CREAR CONEXIÓN A BASE DE DATOS MYSQL. */
        let valida = await mySQL.validarConexionProductos();
        if (valida.length > 0) return { status: 400, body: { error: 'No se pudo validar la conexión a productos.' }, error: {} };
        let pool = await sql.connect(mySQL.configProductos);

        /** QUERY. */
        const query = `
            SELECT
                TOP 100
                prod.id AS Id_SVL,
                prod_var.sku AS SKU,
                prod_var.id AS ID_Variante,
                prod.name AS Nombre_Producto,
                prod_var.seller_sku AS SKU_Seller,
                prod.company_id AS Company_Id,
                '' AS Nombre_Seller,
                '' AS Fecha_Creacion,
                '' AS Fecha_Habilitacion,
                prod.state AS Estado_Actual_Del_Producto,
                prod.updated_at AS Fecha_Ultima_Actualizacion,
                prod.created_at AS Fecha_Creacion,
                prod.sodimac_clacom_id AS Codigo_CLACOM,
                cat.code AS Codigo_GPC,
                prod_var.stock AS Stock_Actual_Del_Producto,
                (prod_var.price_cents/100) AS Precio_Actual
            FROM
                Products prod
                INNER JOIN product_variants prod_var ON prod.id = prod_var.product_id
                INNER JOIN categories cat ON prod.category_id = cat.id
            WHERE
                prod.deleted_at IS NULL
                AND prod.business = ${business}
                AND prod.svl_country_id = (
                    SELECT
                        TOP 1 id
                    FROM
                        countries
                    WHERE
                        abbreviation = '${country}'
                )
        `;

        /** EJECUCIÓN DE QUERY. */
        const data = await pool.request().query(query);
        if (!data)
            return { status: 400, body: { error: 'No se pudo consultar los productos.' }, error: {} };

        /** CERRAR CONEXIÓN A SQL. */
        sql.close();

        /** ALMACENAR SOLO ID COMPANIES DE LA RESPUESTA DE LA BASE DE DATOS. */
        let companies = data.recordset.map(product => product.Company_Id)

        /** QUITAR COMPANIES DUPLICADAS. */
        companies = [...new Set(companies)];

        /** RETORNO RESPUESTA. */
        return { products: data.recordset, companies };

    } catch (error) {

        /** CAPTURA ERROR. */
        console.log(error);
        return { status: 400, body: { error: 'No se pudo consultar los productos.', detalle: error }, error: {} };

    }

};

/**
 * Obtiene los folios pendientes de finanzas.
 * @return {Json}: Retorna data y nombre en un objeto, si falla retorna excepción.
 */
module.exports.getDataCompanies = async (business, country, companies) => {

    try {

        /** CREAR CONEXIÓN A BASE DE DATOS MYSQL. */
        let valida = await mySQL.validarConexionUsuarios();
        if (valida.length > 0) return { status: 400, body: { error: 'No se pudo validar la conexión a usuarios.' }, error: {} };
        let pool = await sql.connect(mySQL.configUsuarios);

        /** QUERY. */
        const query = `
            SELECT
                com.id AS Company_Id,
                com.brand_name AS Nombre_Seller,
                com.created_at AS Fecha_Creacion,
                com.enabled_date AS Fecha_Habilitacion
            FROM
                companies com
            WHERE
                com.business = ${business}
                AND com.legal_name not like '%\"%'
                AND com.id in (${companies})
                AND com.svl_country_id = (
                    SELECT
                        TOP 1 id
                    FROM
                        countries
                    WHERE
                        abbreviation = '${country}'
                )
        `;

        /** EJECUCIÓN DE QUERY. */
        const data = await pool.request().query(query);
        if (!data)
            return { status: 400, body: { error: 'No se pudo consultar las companies.' }, error: {} };

        /** CERRAR CONEXIÓN A SQL. */
        sql.close();

        /** RETORNO RESPUESTA. */
        return data.recordset;

    } catch (error) {

        /** CAPTURA ERROR. */
        console.log(error);
        return { status: 400, body: { error: 'No se pudo consultar las companies.', detalle: error }, error: {} };

    }

};

/**
 * Obtiene los folios pendientes de finanzas.
 * @return {Json}: Retorna data y nombre en un objeto, si falla retorna excepción.
 */
module.exports.mapData = async (products, companies) => {

    try {

        let report = products.map(product => {
            companies.find(companie => {
                if (product.Company_Id == companie.Company_Id) {
                    product.Nombre_Seller = companie.Nombre_Seller
                    product.Fecha_Creacion = companie.Fecha_Creacion
                    product.Fecha_Habilitacion = companie.Fecha_Habilitacion
		            return true;
                }
            });
            return product
        })

        return [{
            name: `Products_${dateFormat(new Date(), "yymmddHMM")}`,
            data: report
        }]

    } catch (error) {

        /** CAPTURA ERROR. */
        console.log(error);
        return { status: 400, body: { error: 'No se pudo indexar los datos.', detalle: error }, error: {} };

    }

};

/**
 * Exportar los datos de finanzas a un archivo csv. Este es almacenado en la carpeta temporal tmp ubicada en la raíz del proyecto.
 * @param {[Json]} data: Arreglo de objetos que contiene data, name y header.
 * @param {String} fileName: Nombre del archivo a generar.
 * @return {String}: Respuesta String que indica la ruta y nombre del archivo que se generó, si falla envía una expceción.
 */
module.exports.exportToXlsxFromObject = async (data, fileName) => {

    try {

        /** VALIDAR QUE LA VARIABLE DAT TENGA CONTENIDO. */
        if (data.length == 0)
            return { status: 200, body: { message: 'No existen datos a exportar.' }, warn: {} };

        /** CREAR CARPETA TEMPORAL. */
        const dir = './tmp';
        if (!fs.existsSync(dir))
            fs.mkdirSync(dir);

        /** CREAR NOMBRE DEL ARCHIVO A BASE DE FECHA NUMÉRICA. */
        const fullFileName = `${fileName}_${dateFormat(new Date(), "yymmddHMM")}`;

        /** ENVIAR A EXPORTAR DATA A UN ARCHIVO XLSX. */
        const resultado = await fileManager.exportToXlsxFromObject(data, fullFileName);
        if (resultado.error)
            return { status: 400, body: { error: 'No se ha podido generar archivo xlsx.', detalle: resultado.error }, error: {} };

        /** RETORNO RESPUESTA. */
        return resultado;

    } catch (error) {

        /** CAPTURA ERROR. */
        console.log(error);
        return { status: 400, body: { error: 'No se pudo exportar los datos.', detalle: error }, error: {} };

    }

}

/**
 * Subir archivo a Azure Blob Storage.
 * @param {String} fullFileName: Nombre del archivo a subir.
 * @return {json}: Respuesta JSON de la función que retorna el resultado del upload del archivo (incluye URL), incluye respuesta satisfactoria o fallo.
 */
module.exports.uploadFileFromPath = async (fullFileName) => {

    try {

        /** DEFINIR NOMBRE DEL ARCHIVO A GUARDAR. */
        let fileName = path.basename(fullFileName);

        /** ENVIAR A SUBIR ARCHIVO AL BLOB STORAGE. */
        let result = await blobStorage.uploadFileFromLocal('reports', fileName, `${process.env.TMP_FOLDER}${fileName}`);
        if (result.error)
            return { status: 400, body: { error: result.error }, error: {} };

        /** RETORNO RESPUESTA. */
        return result;

    } catch (error) {

        /** CAPTURA ERROR. */
        console.log(error);
        return { status: 400, body: { error: 'No se pudo subir el archivo.', detalle: error }, error: {} };

    }

}

/**
 * Función que envía email según los parámetros que se configuren.
 * @param {[Json]} urlFiles: Arreglo de objeto con los datos (incluyendo la url) subidos al Blob Storage.
 * @return {Json}: Respuesta JSON de la función que retorna el resultado del envío del email, incluye respuesta satisfactoria o fallo.
 */
module.exports.sendEmail = async (urlFiles) => {

    try {

        let urlTag = [];

        /** VALIDA QUE EL PARÁMETRO DE ENTRADA TENGA CONTENIDO. */
        if (Object.keys(urlFiles).length == 0)
            return { status: 400, body: { message: 'No se pudo enviar el email.', detalle: 'No se ha podido obtener la url del archivo.' }, error: {} };

        /** ITERAR ARREGLO DE OBJETO AGREGANDO URL Y NOMBRE A LA VARIABLE URLTAG. */
        for (const file of Object.keys(urlFiles)) {
            urlTag.push({url: urlFiles[file].url, name: (path.basename(urlFiles[file].url, '.xlsx')).toUpperCase() })
        }

        /** CONFIGURAR PARÁMETROS DEL EMAIL. */
        let configEmail = {
            from: process.env.GMAIL_AUTH_USER,
            to: process.env.SENDGRID_MAIL_TO,
            cc: process.env.SENDGRID_MAIL_CC,
            bcc: process.env.SENDGRID_MAIL_BCC,
            subject: `PROCESO LIQUIDACIÓN ${dateFormat(new Date(), "yyyy-mm-dd")}`,
            template: 'settlement',
            context: {
                dear: 'Estimados,',
                message: 'Se inicia proceso liquidación adjuntanto el informe inicial denominado InformeSKU:',
                urlTag: urlTag,
                greeting: 'Atte.',
                sender: 'Nicolás Améstica Vidal'
            }
        }

        /** CONFIGURAR PARÁMETROS DE HBS. */
        const optionsHBS = {
            partialsDir: 'shared/views/email',
            viewPath: '../shared/views/email'
        }

        /** LLAMADA A MÉTODO QUE ENVÍA EMAIL ENVIÁNDOLE DOS PARÁMETROS. */
        let result = await email.sendFromGmail(configEmail, optionsHBS);
        if (result.errno)
            return { status: 200, body: { message: 'No se pudo enviar el email.', detalle: result }};

        /** RETORNO RESPUESTA. */
        return result;

    } catch (error) {

        /** CAPTURA ERROR. */
        console.log(error);
        return { status: 400, body: { error: 'No se pudo enviar el mail.', detalle: error }, error: {} };

    }

}

/**
 * Eliminar directorio de carpeta temporal.
 * @return {boolean}: Respuesta de la función con la información procesada en la function, incluye respuesta satisfactoria o fallo.
 */
module.exports.deleteFile = async () => {

    try {

        /** ELIMINAR CARPETA TEMPORALES. */
        fs.rmdirSync(process.env.TMP_FOLDER, { recursive: true });

        return true;

    } catch (error) {

        /** CAPTURA ERROR. */
        console.log(error);
        return { status: 400, body: { error: `No se pudo eliminar el directorio ${process.env.TMP_FOLDER}.`, detalle: error }, error: {} };

    }

}