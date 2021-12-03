'use-strinct'
const productReport = require('./src/business');
const { Responses } = require('../libs/responses')

/** VARIABLES DE PARÁMETROS. */
const arBusiness = [0, 1];
const arCountries = ['CL', 'PE', 'AR', 'CO'];

/**
 * Función de inicio. Recibe los parámetros de entrada que vienen de http request de tipo raw/json.
 * @param {json} context: Variable de conexto, retorna resultados.
 * @param {json} req: Variable de entrada. Contiene el conexto de la petición.
 * @return {json}: Respuesta de la función con la información procesada en la function, incluye respuesta satisfactoria o fallo.
 */
module.exports = async function (context, req) {

    try {
    
        /** DESTRUCTURACIÓN DE PARÁMETROS DE ENTRADA. */
        const { business, country } = req.body;
    
        /** VALIDAR QUE BUSINESS SEA TIPO NUMÉRICO Y ESTE DENTRO DE LOS VALORES PERMITIDOS. */
        if (typeof business != 'number' || !arBusiness.includes(business))
            throw `Parámetro business debe ser numérico y estar en el rango ${arBusiness}.`
    
        /** VALIDAR QUE COUNTRY ESTE DENTRO DE LOS VALORES PERMITIDOS. */
        if (country.length == 0 || !arCountries.includes(country))
            throw `Parámetro country debe contener uno de los siguientes country_codes ${arCountries}.`
        
        /** OBTENER DATOS DE BD. */
        let data = await productReport.getDataProducts(business, country);
        if (data.error)
            throw data;
    
        /** OBTENER DATOS DE BD. */
        let companies = await productReport.getDataCompanies(business, country, data.companies);
        if (companies.error !== undefined)
            throw companies;
    
        /** MAPEAR DATOS OBTENIDOS. */
        data = await productReport.mapData(data.products, companies);
        if (data.error)
            throw data;
    
        /** EXPORTAR DATA A ARCHIVO XLSX. */
        data = await productReport.exportToCSV(data, `${process.env.PROYECT}_${process.env.N_PRODUCT_REPORT}_${country}`);
        if (data.error !== undefined || data.warn !== undefined)
            throw data;

        /** SUBIR ARCHIVO CSV AL BLOB STORAGE. */
        const resultUploadFile = await productReport.uploadFileFromPath(context, data)
        if (resultUploadFile.error)
            throw resultUploadFile

        /** ENVIAR EMAIL CON ENLACE DE DESCARGA DEL ARCHIVO. */
        const resultSendEmail = await productReport.sendEmail(business, country, resultUploadFile)
        if (resultSendEmail.error !== undefined)
            throw resultSendEmail;

        /** ELIMINAR DIRECTORIO PARA ARCHIVOS TEMPORALES. */
        const resultDeleteFile = await productReport.deleteFile()
        if (resultDeleteFile.error)
            throw resultDeleteFile;

        data.url = resultUploadFile.url;
            
        /** RETORNO DE RESPUESTA. */
        context.res = Responses._200({
            message: "Reporte generado correctamente.",
            data
        });

    } catch (error) {

        /** RETORNO DE EXCEPCIÓN. */
        context.res = Responses._400({
            error
        })

    }

}