'use strict';
const mySQL = require('../../../common/mySQL');
const sql = require("mssql");
const fs = require('fs');
const fileManager = require('../../../common/fileManager');
const dateFormat = require('dateformat');
// const blobStorage = require('../../../common/blobStorage');
const email = require('../../../common/email');
// const path = require("path");

/**
 * Obtiene los datos de las empresas de la base de datos de usuarios.
 * @return {Json}: Retorna data en un objeto, si falla retorna excepción.
 */
module.exports.getDataCompanies = async (business, country) => {

    try {

        /** CREAR CONEXIÓN A BASE DE DATOS MYSQL. */
        let valida = await mySQL.validarConexionUsuarios();
        if (valida.length > 0) return { status: 400, body: { error: 'No se pudo validar la conexión a usuarios.' }, error: {} };
        let pool = await sql.connect(mySQL.configUsuarios);

        /** QUERY. */
        const query = `
            SELECT
                com.id 'ID SVL: Company ID',
                com.rut 'RUT',
                com.external_reference_id 'Codigo de proveedor: External reference id',
                com.legal_name 'Razon Social',
                com.brand_name 'Nombre Fantasia',
                case
                    com.status 
                    when 0 then
                    case
                        com.external_reference_id when 0 then 'Inicial'
                        else 'Habilitada'
                    end
                    when 1 then 'Creada en OMS'
                    when 2 then 'Creacion finalizada'
                    else cast(com.status as varchar)
                end 'Estado',
                REPLACE(REPLACE(REPLACE(CAST(CAST(com.created_at AS date) AS varchar), CHAR(9), ''), CHAR(10), ''), CHAR(13), '') AS 'Fecha Creacion',
                REPLACE(REPLACE(REPLACE(CAST(CAST(com.enabled_date AS date) AS varchar), CHAR(9), ''), CHAR(10), ''), CHAR(13), '') AS 'Fecha de habilitacion',
                case
                    com.prefered_dispatch_type 
                    when 0 then 'Despacho directo a cliente (DD)'
                    when 1 then 'Despacho directo a Sodimac (XDock)'
                    when 4 then 'Fulfilled by Sodimac (FBS)'
                    when 6 then 'Recepcion Express'
                    when 7 then 'Retiro a proveedor por Sodimac'
                    else ''
                end 'Modelo Logistico',
                REPLACE((SELECT 'Nombre Completo: ' + first_name + ' ' + last_name + ' Correo: ' + email + ' | ' FROM users WHERE company_id = com.id FOR XML PATH('')), ';', ',') AS 'Usuarios'
            FROM
                companies com
            WHERE
                com.business = ${business}
                AND com.legal_name not like '%\\%'
                AND com.deleted_at is null
                AND com.svl_country_id = (
                SELECT
                    TOP 1 id
                FROM
                    countries
                WHERE
                    abbreviation = '${country}')
        `;

        /** EJECUCIÓN DE QUERY. */
        const data = await pool.request().query(query);
        if (!data)
            return { status: 400, body: { error: 'No se pudo consultar las companies.' }, error: {} };

        /** CERRAR CONEXIÓN A SQL. */
        sql.close();

        /** RETORNO RESPUESTA. */
        return data.recordset;
        // return [{
        //     data: data.recordset,
        //     name: 'companies'
        // }];

    } catch (error) {

        /** CAPTURA ERROR. */
        console.log(error);
        return { status: 400, body: { error: 'No se pudo consultar las companies.', detalle: error }, error: {} };

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
 * Exportar los datos de finanzas a un archivo csv. Este es almacenado en la carpeta temporal tmp ubicada en la raíz del proyecto.
 * @param {[Json]} data: Arreglo de objetos.
 * @param {String} fileName: Nombre del archivo a generar.
 * @return {[Json]}: Respuesta de la función con la información procesada en la function, incluye respuesta satisfactoria o fallo.
 */
module.exports.exportToCSV = async (data, fileName) => {

    try {

        /** VALIDAR QUE LA VARIABLE DAT TENGA CONTENIDO. */
        if (data.length == 0)
            return { status: 201, body: { message: 'No existen datos a exportar.' }, warn: {} };

        /** CREAR CARPETA TEMPORAL. */
        const dir = './tmp';
        if (!fs.existsSync(dir))
            fs.mkdirSync(dir);

        /** CREAR NOMBRE DEL ARCHIVO A BASE DE FECHA NUMÉRICA. */
        const fullFileName = `${fileName}_${dateFormat(new Date(), "yyyymmddHMM")}`;

        /** ENVIAR A EXPORTAR DATA A UN ARCHIVO CSV. */
        const resultado = await fileManager.exportDataToCSV(data, fullFileName);
        if (resultado.error)
            return { status: 400, body: { error: 'No existen datos a exportar.' }, error: {} };

        /** RETORNO RESPUESTA. */
        return { data: resultado, fileName: fullFileName };

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
module.exports.sendEmail = async (business, country, fileName) => {

    try {

        /** VALIDA QUE EL PARÁMETRO DE ENTRADA TENGA CONTENIDO. */
        // if (Object.keys(urlFiles).length == 0)
        //     return { status: 400, body: { message: 'No se pudo enviar el email.', detalle: 'No se ha podido obtener la url del archivo.' }, error: {} };

        /** ITERAR ARREGLO DE OBJETO AGREGANDO URL Y NOMBRE A LA VARIABLE URLTAG. */
        // for (const file of Object.keys(urlFiles)) {
        //     urlTag.push({url: urlFiles[file].url, name: (path.basename(urlFiles[file].url, '.xlsx')).toUpperCase() })
        // }

        /** CONFIGURAR PARÁMETROS DEL EMAIL. */
        // let configEmail = {
        //     from: process.env.GMAIL_AUTH_USER,
        //     to: process.env.SENDGRID_MAIL_TO,
        //     cc: process.env.SENDGRID_MAIL_CC,
        //     bcc: process.env.SENDGRID_MAIL_BCC,
        //     subject: `PROCESO LIQUIDACIÓN ${dateFormat(new Date(), "yyyy-mm-dd")}`,
        //     template: 'settlement',
        //     context: {
        //         dear: 'Estimados,',
        //         message: 'Se inicia proceso liquidación adjuntanto el informe inicial denominado InformeSKU:',
        //         urlTag: urlTag,
        //         greeting: 'Atte.',
        //         sender: 'Nicolás Améstica Vidal'
        //     }
        // }

        /** CONFIGURAR PARÁMETROS DE HBS. */
        // const optionsHBS = {
        //     partialsDir: 'shared/views/email',
        //     viewPath: '../shared/views/email'
        // }

        // var data = fs.readFileSync(`${process.env.TMP_FOLDER}${fileName}.csv`, { encoding: 'utf-8'}).toString('base64');



        // console.log('FILE:', `${process.env.TMP_FOLDER}${fileName}.csv`);
        // console.log('BASE64:', data);

        // const attachment = {
        //     content: fs.readFileSync(`${process.env.TMP_FOLDER}${fileName}.csv`, { encoding: 'utf-8'}).toString('base64'),
        //     filename: `${fileName}.csv`,
        //     type: 'text/csv',
        //     disposition: 'attachment',
        //     content_id: 'mytext'
        // }

        let from = (business == 1 ? process.env.SENDGRID_MAIL_FROM_SODIMAC : process.env.SENDGRID_MAIL_FROM_FALABELLA);
        let to = (business == 1 ? process.env.SENDGRID_MAIL_TO_SODIMAC : process.env.SENDGRID_MAIL_TO_FALABELLA);
        let cc = (business == 1 ? process.env.SENDGRID_MAIL_CC_SODIMAC : process.env.SENDGRID_MAIL_CC_FALABELLA);
        let bcc = (business == 1 ? process.env.SENDGRID_MAIL_BCC_SODIMAC : process.env.SENDGRID_MAIL_BCC_FALABELLA);

        const message = {
            from,
            to: to.split(','),
            cc: cc.split(','),
            bcc: bcc.split(','),
            subject: `Reporte companies ${country}`,
            text: `Se adjunta reporte companies ${country}`,
        }

        const attachment = {
            content: await fileManager.base64_encode(`${process.env.TMP_FOLDER}${fileName}.csv`),
            filename: `${fileName}.csv`,
            type: 'text/csv',
            disposition: 'attachment',
            content_id: 'id_238695'
        }

        /** LLAMADA A MÉTODO QUE ENVÍA EMAIL ENVIÁNDOLE DOS PARÁMETROS. */
        let result = email.sendFromSendgrid(message, attachment);
        // let result = await email.sendFromGmail(configEmail, optionsHBS);
        if (result.error)
            return { status: 400, body: { message: 'No se pudo enviar el email.', detalle: result }};

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