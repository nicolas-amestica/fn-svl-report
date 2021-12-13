'use-strinct'
const productReport = require('./src/business');
const { Responses } = require('../libs/responses')

/** VARIABLES DE PARÁMETROS. */
// const arBusiness = [0, 1];
// const arCountries = ['CL', 'PE', 'AR', 'CO'];

/**
 * Función de inicio. Recibe los parámetros de entrada que vienen de http request de tipo raw/json.
 * @param {json} context: Variable de conexto, retorna resultados.
 * @param {json} req: Variable de entrada. Contiene el conexto de la petición.
 * @return {json}: Respuesta de la función con la información procesada en la function, incluye respuesta satisfactoria o fallo.
 */
module.exports = async function (context, timerProductsReport) {

    /** DESTRUCTURACIÓN DE PARÁMETROS DE ENTRADA. */
    // const { business, country } = req.body;

    /** VALIDAR QUE BUSINESS SEA TIPO NUMÉRICO Y ESTE DENTRO DE LOS VALORES PERMITIDOS. */
    // if (typeof business != 'number' || !arBusiness.includes(business))
    //     return context.res = Responses._400({ error: `Parámetro business debe ser numérico y estar en el rango ${arBusiness}.` });

    /** VALIDAR QUE COUNTRY ESTE DENTRO DE LOS VALORES PERMITIDOS. */
    // if (country.length == 0 || !arCountries.includes(country))
    //     return context.res = Responses._400({ error: `Parámetro country debe contener uno de los siguientes country_codes ${arCountries}.` });

    const business = 1;
    const country = 'CL';
    
    /** OBTENER DATOS DE BD. */
    let data = await productReport.getDataProducts(business, country);
    if (data.error)
        return context.res = Responses._400({ error: data.error } );

    /** OBTENER DATOS DE BD. */
    let companies = await productReport.getDataCompanies(business, country, data.companies);
    if (companies.error !== undefined)
        throw companies;

    /** MAPEAR DATOS OBTENIDOS. */
    data = await productReport.mapData(data.products, companies);
    if (data.error)
        throw data.error;

    /** EXPORTAR DATA A ARCHIVO CSV. */
    data = await productReport.exportToCSV(data, `${process.env.PROYECT}_${process.env.N_PRODUCT_REPORT}_${country}`);
    if (data.error)
        throw data.error;

    /** SUBIR ARCHIVO CSV AL BLOB STORAGE. */
    let resultUploadFile = await productReport.uploadFileFromPath(data)
    if (resultUploadFile.error)
        throw resultUploadFile.error;

    /** ELIMINAR DIRECTORIO PARA ARCHIVOS TEMPORALES. */
    let resultDeleteFile = await productReport.deleteFolder()
    if (resultDeleteFile.error)
        throw resultDeleteFile.error;

    data.url = resultUploadFile.url;

    /** RETORNO DE RESPUESTA. */
    context.res = Responses._200({
        message: "Reporte generado correctamente.",
        data
    });

}