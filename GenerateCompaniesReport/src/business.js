'use strict';
const MySQL = require('../../libs/mySQL');
const fs = require('fs');
const FileManager = require('../../libs/fileManager');
const DateFormat = require('dateformat');
const BlobStorage = require('../../libs/blobStorage');

/**
 * Obtiene los datos de las empresas de la base de datos de usuarios.
 * @return {Json}: Retorna data en un objeto, si falla retorna excepción.
 */
module.exports.getDataCompanies = async (business, country) => {

    try {

        console.log('OBTENIENDO INFORMACIÓN DE USUARIOS');

        /** QUERY. */
        let query = `
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
        let data = await MySQL.getDataUsers(query);
        if (data.error)
            throw data.error;

        /** CERRAR CONEXIÓN A SQL. */
        let con = await MySQL.closeConnection();
        if (con.error)
            throw con.error;

        /** RETORNO RESPUESTA. */
        return data;

    } catch (error) {

        /** CAPTURA EXCEPCIÓN. */
        return { error };

    }

};

/**
 * Exportar los datos de finanzas a un archivo csv. Este es almacenado en la carpeta temporal tmp ubicada en la raíz del proyecto.
 * @param {[Json]} data: Arreglo de objetos que contiene la data a exportar.
 * @param {String} fileName: Nombre del archivo a generar.
 * @return {[Json]}: Respuesta de la función con la información procesada en la function, incluye respuesta satisfactoria o fallo.
 */
module.exports.exportToCSV = async (data, fileName) => {

    try {

        console.log('EXPORTANDO DATOS A ARCHIVO CSV');

        /** VALIDAR QUE LA VARIABLE DAT TENGA CONTENIDO. */
        if (data.length == 0)
            throw 'No existen datos a exportar.';

        /** CREAR CARPETA TEMPORAL. */
        const dir = `./${process.env.TMP_FOLDER}`;
        if (!fs.existsSync(dir))
            fs.mkdirSync(dir);

        /** CREAR NOMBRE DEL ARCHIVO A BASE DE FECHA NUMÉRICA. */
        const fullFileName = `${fileName}_${DateFormat(new Date(), "yyyymmddHMM")}`;

        /** ENVIAR A EXPORTAR DATA A UN ARCHIVO CSV. */
        let resultado = await FileManager.exportDataToCSV(data, fullFileName);
        if (resultado.error)
            throw resultado.error;

        /** RETORNO RESPUESTA. */
        return resultado;

    } catch (error) {

        /** CAPTURA EXCEPCIÓN. */
        return { error }

    }

}

/**
 * Subir archivo a Azure Blob Storage.
 * @param {String} fullFileName: Nombre del archivo a subir.
 * @return {json}: Respuesta JSON de la función que retorna el resultado del upload del archivo (incluye URL), incluye respuesta satisfactoria o fallo.
 */
module.exports.uploadFileFromPath = async (fullFileName) => {

    try {

        console.log('SUBIENDO ARCHIVO A BLOB STORAGE');

        /** ENVIAR A SUBIR ARCHIVO AL BLOB STORAGE. */
        let result = await BlobStorage.uploadFileFromLocal(process.env.AZURE_BLOBSTORAGE_NAME_COMPANIES, fullFileName.name, fullFileName.path);
        if (result.error)
            throw result.error;

        /** RETORNO RESPUESTA. */
        return result;

    } catch (error) {

        /** CAPTURA EXCEPCIÓN. */
        return { error }

    }

}

/**
 * Eliminar directorio de carpeta temporal.
 * @return {boolean}: Respuesta de la función con la información procesada en la function, incluye respuesta satisfactoria o fallo.
 */
module.exports.deleteFolder = async () => {

    try {

        console.log('ELIMINANDO DIRECTORIO TEMPORAL');

        /** ELIMINAR CARPETA TEMPORALES. */
        fs.rmdirSync(process.env.TMP_FOLDER, { recursive: true });

        /** RETORNO RESPUESTA. */
        return true;

    } catch (error) {

        /** RETORNO EXCEPCIÓN. */
        return { error }

    }

}