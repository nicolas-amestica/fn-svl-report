'use strict';
const ObjectsToCsv = require('objects-to-csv-file');

/**
 * Exportar datos a un archivo csv.
 * @param {Json} data: Objeto que contiene la data a exportar.
 * @param {String} fileName: Nombre del archivo que se quiere generar.
 * @return {Json}: Retorna objeto JSON con nombre del archivo y ruta, si falla retorna expceción.
 */
module.exports.exportDataToCSV = async (data, fileName) => {

    try {

        /** CREAR LA RUTA COMPLETA DE LA UBICACIÓN DEL ARCHIVO CSV. */
        const fullPathFile = `${process.env.TMP_FOLDER}${fileName}.csv`;

        /** CASTEAR DATA A CSV. */
        const csv = new ObjectsToCsv(data);
        if (!csv)
            throw 'No se pudieron serializar los datos.';

        /** GUARDAR DATA QUE ESTÁ EN LA VARIABLE CSV A UN ARCHIVO CSV. */
        const result = await csv.toDisk(fullPathFile, { header: true, delimiter: ';' });
        if (!result)
            throw 'No se pudo generar el archivo CSV.';

        /** RETORNA RESPUESTA. */
        return { name: `${fileName}.csv`, path: fullPathFile };

    } catch (error) {

        /** CAPTURA EXCEPCIÓN. */
        return { error };

    }

};