'use-strinct'
const productReport = require('./management/managementReport');

/** VARIABLES DE PARÁMETROS. */
const arBusiness = [0, 1];
const arCountries = ['CL', 'PE', 'AR', 'CO'];

/**
 * Itera los folios ingresados y los mapea con los existentes en la base de datos. Los parámetros de entrada vienen en tipo raw json.
 * @param {json} event: Variable que contiene arreglo de folios, country y business.
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

        /** OBTENER DATOS DE GOOGLE CLOUD PLATFORM. */
        let data = await productReport.getDataProducts(business, country);
        if (data.error !== undefined)
            return data;

        /** OBTENER DATOS DE GOOGLE CLOUD PLATFORM. */
        let companies = await productReport.getDataCompanies(business, country, data.companies);
        if (companies.error !== undefined)
            return companies;

        /** OBTENER DATOS DE GOOGLE CLOUD PLATFORM. */
        data = await productReport.mapData(data.products, companies);
        if (data.error !== undefined)
            return data;

        /** EXPORTAR DATA A ARCHIVO XLSX. */
        data = await productReport.exportToXlsxFromObject(data, process.env.N_PRODUCT_REPORT);
        if (data.error !== undefined || data.warn !== undefined)
            return data;

        // /** SUBIR ARCHIVO CSV AL BLOB STORAGE. */
        // const resultUploadFile = await productReport.uploadFileFromPath(data)
        // if (resultUploadFile.error !== undefined || resultUploadFile.warn !== undefined)
        //     return resultUploadFile;

        // /** ENVIAR EMAIL CON ENLACE DE DESCARGA DEL ARCHIVO. */
        // const resultSendEmail = await productReport.sendEmail({ resultUploadFile })
        // if (resultSendEmail.error !== undefined)
        //     return resultSendEmail;

        // /** ELIMINAR DIRECTORIO PARA ARCHIVOS TEMPORALES. */
        // const resultDeleteFile = await productReport.deleteFile()
        // if (resultDeleteFile.error !== undefined)
        //     return resultDeleteFile;

        /** RETORNO DE RESPUESTA EXITOSA. */
        // return { body: { message: 'Reporte generado y enviado por correo correctamente.', data }};
        return { body: { message: 'Reporte generado y enviado por correo correctamente.', data }};

    } catch (error) {

        /** CAPTURA ERROR. */
        console.log(error);
        return error;

    }

};