'use-strinct'
const companieReport = require('./management/managementReport');

/** VARIABLES DE PARÁMETROS. */
const arBusiness = [0, 1];
const arCountries = ['CL', 'PE', 'AR', 'CO'];

/**
 * Genera reporte de empresas.
 * @param {json} event: Variable que contiene country y business.
 * @return {json}: Respuesta de la función con la información procesada en la function, incluye respuesta satisfactoria o fallo.
 */
module.exports.getReport = async (event) => {

    try {

        /** DESTRUCTURACIÓN DE PARÁMETROS DE ENTRADA. */
        const { business, country } = event;

        /** VALIDAR QUE BUSINESS SEA TIPO NUMÉRICO Y ESTE DENTRO DE LOS VALORES PERMITIDOS. */
        if (typeof business != 'number' || !arBusiness.includes(business))
            return { status: 400, body: { error: `Parámetro business debe ser numérico y estar en el rango ${arBusiness}.` } };

        /** VALIDAR QUE COUNTRY ESTE DENTRO DE LOS VALORES PERMITIDOS. */
        if (country.length == 0 || !arCountries.includes(country))
            return { status: 400, body: { error: `Parámetro country debe contener uno de los siguientes country_codes ${arCountries}.` } };

        /** OBTENER DATOS DE COMPANIES. */
        let data = await companieReport.getDataCompanies(business, country);
        if (data.error !== undefined)
            return data;

        /** EXPORTAR DATA A ARCHIVO XLSX. */
        // data = await companieReport.exportToXlsxFromObject(data, `${process.env.PROYECT}_${process.env.N_COMPANIE_REPORT}_${country}`);
        // if (data.error !== undefined || data.warn !== undefined)
        //     return data;

        /** EXPORTAR DATA A ARCHIVO CSV. */
        data = await companieReport.exportToCSV(data, `${process.env.PROYECT}_${process.env.N_COMPANIE_REPORT}_${country}`);
        if (data.error !== undefined || data.warn !== undefined)
            return data;

        /** ENVIAR EMAIL CON ENLACE DE DESCARGA DEL ARCHIVO. */
        const resultSendEmail = await companieReport.sendEmail(business, country, data.fileName)
        if (resultSendEmail.error !== undefined)
            return resultSendEmail;

        /** ELIMINAR DIRECTORIO PARA ARCHIVOS TEMPORALES. */
        const resultDeleteFile = await companieReport.deleteFile()
        if (resultDeleteFile.error !== undefined)
            return resultDeleteFile;

        /** RETORNO DE RESPUESTA EXITOSA. */
        // return { body: { message: 'Reporte generado y enviado por correo correctamente.', data }};
        return { body: { message: 'Reporte generado y enviado por correo correctamente.', data, resultSendEmail }};

    } catch (error) {

        /** CAPTURA ERROR. */
        console.log(error);
        return error;

    }

};