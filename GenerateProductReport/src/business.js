'use strict';
const MySQL = require('../../libs/mySQL');
const fs = require('fs');
const FileManager = require('../../libs/fileManager');
const DateFormat = require('dateformat');
const BlobStorage = require('../../libs/blobStorage');

/**
 * Obtiene la información de productos.
 * @param {String} business: String que contiene el código del negocio.
 * @param {String} country: String que contiene el código del país.
 * @return {[Json]}: Retorna data y nombre en un objeto, si falla retorna excepción.
 */
module.exports.getDataProducts = async (business, country) => {

    try {

        console.log('OBTENIENDO INFORMACIÓN DE PRODUCTOS');

        let precioProducto = '';
        let costoProducto = '';

        if (country != 'CL')
            precioProducto = `CAST(convert(numeric(15,2), prod_var.price_cents/100.00) as varchar) 'Precio_Actual'`
        else
            precioProducto = `(prod_var.price_cents/100) AS 'Precio_Actual'`

        if (country == 'AR')
            costoProducto = `CAST(convert(decimal(15,2), prod_var.cost_cents/100.00) as varchar) 'Costo_actual_del_producto',`

        /** QUERY. */
        let query = `
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
        let data = await MySQL.getDataProducts(query)
        if (data.error)
            throw data.error;

        /** CERRAR CONEXIÓN A SQL. */
        let con = MySQL.closeConnection();
        if (con.error)
            throw con.error;

        /** ALMACENAR SOLO ID COMPANIES DE LA RESPUESTA DE LA BASE DE DATOS. */
        let companies = data.map(product => product.Company_Id)

        /** QUITAR COMPANIES DUPLICADAS. */
        companies = [...new Set(companies)];

        /** RETORNO RESPUESTA. */
        return { products: data, companies };

    } catch (error) {

        /** CAPTURA EXCEPCIÓN. */
        return { error };

    }

};

/**
 * Obtiene la información de companies.
 * @param {String} business: String que contiene el código del negocio.
 * @param {String} country: String que contiene el código del país.
 * @return {[Json]}: Retorna data y nombre en un objeto, si falla retorna excepción.
 */
module.exports.getDataCompanies = async (business, country, companies) => {

    try {

        console.log('OBTENIENDO INFORMACIÓN DE COMPANIES');

        /** QUERY. */
        let query = `
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
        let data = await MySQL.getDataUsers(query);
        if (data.error)
            throw data.error;

        /** CERRAR CONEXIÓN A SQL. */
        let con = MySQL.closeConnection();
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
 * Mapea datos de productos y companies.
 * @param {[Json]} products: Arreglo de objetos de productos.
 * @param {[Json]} companies: Arreglo de objetos de companies.
 * @return {Json}: Retorna arreglo de objetos de data mapeada, si falla retorna excepción.
 */
module.exports.mapData = async (products, companies) => {

    try {

        console.log('MAPEANDO DATA DE PRODUCTOS Y COMPANIES');

        /** ITERAR DATA DE PRIDUCTOS Y COMPANIES. */
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

        /** RETORNO RESPUESTA. */
        return report

    } catch (error) {

        /** CAPTURA EXCEPCIÓN. */
        return { error };

    }

};

/**
 * Exportar los datos a un archivo csv. Este es almacenado en la carpeta temporal tmp ubicada en la raíz del proyecto.
 * @param {[Json]} data: Arreglo de objetos que contiene la data.
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
        let result = await FileManager.exportDataToCSV(data, fullFileName);
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
 * Subir archivo a Azure Blob Storage.
 * @param {String} fullFileName: Nombre del archivo a subir.
 * @return {json}: Respuesta JSON de la función que retorna el resultado del upload del archivo (incluye URL), incluye respuesta satisfactoria o fallo.
 */
module.exports.uploadFileFromPath = async (fullFileName) => {

    try {

        console.log('SUBIENDO ARCHIVO A BLOB STORAGE');

        /** ENVIAR A SUBIR ARCHIVO AL BLOB STORAGE. */
        let result = await BlobStorage.uploadFileFromLocal(process.env.AZURE_BLOBSTORAGE_NAME_PRODUCTS, fullFileName.name, fullFileName.path);
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