'use strict';
const { Responses } = require('../../libs/responses')
const mySQL = require('../../libs/mySQL');
const sql = require("mssql");
const fs = require('fs');
const fileManager = require('../../libs/fileManager');
const dateFormat = require('dateformat');
const blobStorage = require('../../libs/blobStorage');
const path = require("path");
const email = require('../../libs/email');

/**
 * Obtiene los folios pendientes de finanzas.
 * @return {Json}: Retorna data y nombre en un objeto, si falla retorna excepción.
 */
module.exports.getDataProducts = async (business, country) => {

    try {

        /** CREAR CONEXIÓN A BASE DE DATOS MYSQL. */
        let valida = await mySQL.validarConexionProductos();
        if (valida.length > 0) throw 'No se pudo validar la conexión a productos.';
        let pool = await sql.connect(mySQL.configProductos);

        let precioProducto = '';
        let costoProducto = '';

        if (country != 'CL')
            precioProducto = `CAST(convert(numeric(15,2), prod_var.price_cents/100.00) as varchar) 'Precio_Actual'`
        else
            precioProducto = `(prod_var.price_cents/100) AS 'Precio_Actual'`

        if (country == 'AR')
            costoProducto = `CAST(convert(decimal(15,2), prod_var.cost_cents/100.00) as varchar) 'Costo_actual_del_producto',`

        /** QUERY. */
        const query = `
            SELECT
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
                REPLACE(REPLACE(REPLACE(CAST(CAST(prod.updated_at AS date) AS varchar), CHAR(9), ''), CHAR(10), ''), CHAR(13), '') AS Fecha_Ultima_Actualizacion,
                prod.created_at AS Fecha_Creacion,
                prod.sodimac_clacom_id AS Codigo_CLACOM,
                cat.code AS Codigo_GPC,
                prod_var.stock AS Stock_Actual_Del_Producto,
                ${costoProducto} ${precioProducto}
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
            throw 'No se pudo consultar los productos.';

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
        return { error };

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
        if (valida.length > 0) throw 'No se pudo validar la conexión a usuarios.';
        let pool = await sql.connect(mySQL.configUsuarios);

        /** QUERY. */
        const query = `
            SELECT
                com.id AS Company_Id,
                com.brand_name AS Nombre_Seller,
                REPLACE(REPLACE(REPLACE(CAST(CAST(com.created_at AS date) AS varchar), CHAR(9), ''), CHAR(10), ''), CHAR(13), '') AS Fecha_Creacion,
                REPLACE(REPLACE(REPLACE(CAST(CAST(com.enabled_date AS date) AS varchar), CHAR(9), ''), CHAR(10), ''), CHAR(13), '') AS Fecha_Habilitacion
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
            throw 'No se pudo consultar las companies.';

        /** CERRAR CONEXIÓN A SQL. */
        sql.close();

        /** RETORNO RESPUESTA. */
        return data.recordset;

    } catch (error) {

        /** CAPTURA ERROR. */
        return { error };

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

        return report

    } catch (error) {

        /** CAPTURA ERROR. */
        return { error };

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
            throw 'No existen datos a exportar.'

        /** CREAR CARPETA TEMPORAL. */
        const dir = './tmp';
        if (!fs.existsSync(dir))
            fs.mkdirSync(dir);

        /** CREAR NOMBRE DEL ARCHIVO A BASE DE FECHA NUMÉRICA. */
        const fullFileName = `${fileName}_${dateFormat(new Date(), "yymmddHMM")}`;

        /** ENVIAR A EXPORTAR DATA A UN ARCHIVO XLSX. */
        const resultado = await fileManager.exportToXlsxFromObject(data, fullFileName);
        if (resultado.error)
            throw 'No se ha podido generar archivo xlsx.'

        /** RETORNO RESPUESTA. */
        return resultado;

    } catch (error) {

        /** CAPTURA ERROR. */
        return { error };

    }

}

/**
 * Exportar los datos de finanzas a un archivo csv. Este es almacenado en la carpeta temporal tmp ubicada en la raíz del proyecto.
 * @param {[Json]} data: Arreglo de objetos.
 * @param {String} fileName: Nombre del archivo a generar.
 * @return {[Json]}: Respuesta de la función con la información procesada en la function, incluye respuesta satisfactoria o fallo.
 */
module.exports.exportToCSV = async (data, fileName) => {

    try {

        /** VALIDAR QUE LA VARIABLE DAT TENGA CONTENIDO. */
        if (data.length == 0)
            throw "No existen datos a exportar.";

        /** CREAR CARPETA TEMPORAL. */
        const dir = './tmp';
        if (!fs.existsSync(dir))
            fs.mkdirSync(dir);

        /** CREAR NOMBRE DEL ARCHIVO A BASE DE FECHA NUMÉRICA. */
        const fullFileName = `${fileName}_${dateFormat(new Date(), "yyyymmddHMM")}`;

        /** ENVIAR A EXPORTAR DATA A UN ARCHIVO CSV. */
        const resultado = await fileManager.exportDataToCSV(data, fullFileName);
        if (resultado.error)
            throw "No existen datos a exportar.";

        /** RETORNO RESPUESTA. */
        return resultado;

    } catch (error) {

        /** CAPTURA ERROR. */
        return { error }

    }

}

/**
 * Subir archivo a Azure Blob Storage.
 * @param {String} fullFileName: Nombre del archivo a subir.
 * @return {json}: Respuesta JSON de la función que retorna el resultado del upload del archivo (incluye URL), incluye respuesta satisfactoria o fallo.
 */
module.exports.uploadFileFromPath = async (context, fullFileName) => {

    try {

        /** ENVIAR A SUBIR ARCHIVO AL BLOB STORAGE. */
        let result = await blobStorage.uploadFileFromLocal(process.env.AZURE_BLOBSTORAGE_NAME, fullFileName.name, fullFileName.path);
        if (result.error)
            throw result.error;

        /** RETORNO RESPUESTA. */
        return result;

    } catch (error) {

        /** CAPTURA ERROR. */
        return { error }

    }

}

/**
 * Función que envía email según los parámetros que se configuren.
 * @param {[Json]} urlFiles: Arreglo de objeto con los datos (incluyendo la url) subidos al Blob Storage.
 * @return {Json}: Respuesta JSON de la función que retorna el resultado del envío del email, incluye respuesta satisfactoria o fallo.
 */
module.exports.sendEmail = async (business, country, documento) => {

    try {

        if (!documento.url)
            throw 'No se ha podido obtener la url del documento.';

        let from = (business == 1 ? process.env.SENDGRID_MAIL_FROM_SODIMAC : process.env.SENDGRID_MAIL_FROM_FALABELLA);
        let to = (business == 1 ? process.env.SENDGRID_MAIL_TO_SODIMAC : process.env.SENDGRID_MAIL_TO_FALABELLA);
        let cc = (business == 1 ? process.env.SENDGRID_MAIL_CC_SODIMAC : process.env.SENDGRID_MAIL_CC_FALABELLA);
        let bcc = (business == 1 ? process.env.SENDGRID_MAIL_BCC_SODIMAC : process.env.SENDGRID_MAIL_BCC_FALABELLA);

        business = (business == 1 ? 'SO' : 'FA');

        /** CONFIGURAR PARÁMETROS DEL EMAIL. */
        const message = {
            from: from,
            to: to.split(','),
            // cc: cc.split(','),
            // bcc: bc.split(','),
            subject: `Reporte products ${country}`,
            html: `Estimados,<br><br>
            En el siguiente enlace podrá descargar el reporte Products ${business}${country}<br><br>
            <a href='${documento.url}'>DESCARGAR</a><br><br>
            Atte.<br>
            ${process.env.REPORTA}`,
        }

        /** LLAMADA A MÉTODO QUE ENVÍA EMAIL ENVIÁNDOLE DOS PARÁMETROS. */
        let result = await email.sendFromSendgrid(message);
        if (result.error)
            throw result;

        /** RETORNO RESPUESTA. */
        return result;

    } catch (error) {

        /** CAPTURA ERROR. */
        return { error };

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
        return { error: 'No se pudo eliminar el directorio temporal.' + error}

    }

}