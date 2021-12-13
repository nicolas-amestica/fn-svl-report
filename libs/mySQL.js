'use strict';
const sql = require('mssql')

/** VARIABLE QUE CONFIGURA LAS VARIABLES DE CONEXIÓN. */
let configUsuarios = {
    server: process.env.DB_HOST_USERS_HOST,
    database: process.env.DB_HOST_USERS_DBNAME,
    user: process.env.DB_HOST_USERS_USER,
    password: process.env.DB_HOST_USERS_PASSWORD,
    multipleStatements: true,
    requestTimeout: 180000,
    options: {
        encrypt: true,
        enableArithAbort: true
    }
};

/** VARIABLE QUE CONFIGURA LAS VARIABLES DE CONEXIÓN. */
let configProductos = {
    server: process.env.DB_HOST_PRODUCTS_HOST,
    database: process.env.DB_HOST_PRODUCTS_DBNAME,
    user: process.env.DB_HOST_PRODUCTS_USER,
    password: process.env.DB_HOST_PRODUCTS_PASSWORD,
    multipleStatements: true,
    requestTimeout: 180000,
    options: {
        encrypt: true,
        enableArithAbort: true
    }
};

/**
 * Función que ejecuta la consulta sql que se ingrese.
 * @param {String} query: String que contiene la query a ejecutar.
 * @return {String}: Respuesta de la función con la información procesada en la function, incluye respuesta satisfactoria o fallo.
 */
module.exports.getDataProducts = async (query) => {

    try {

        const conn = await sql.connect(configProductos);

        const result = await conn.request().query(query);

        return result.recordset;

    } catch (error) {

        return { error: error.originalError }

    }

};

/**
 * Función que ejecuta la consulta sql que se ingrese.
 * @param {String} query: String que contiene la query a ejecutar.
 * @return {String}: Respuesta de la función con la información procesada en la function, incluye respuesta satisfactoria o fallo.
 */
module.exports.getDataUsers = async (query) => {

    try {

        const conn = await sql.connect(configUsuarios);

        const result = await conn.request().query(query);

        return result.recordset;

    } catch (error) {

        return { error: error.originalError }

    }

};

/**
 * Función que ejecuta la consulta sql que se ingrese.
 * @param {String} query: String que contiene la query a ejecutar.
 * @return {String}: Respuesta de la función con la información procesada en la function, incluye respuesta satisfactoria o fallo.
 */
module.exports.closeConnection = async () => {

    try {

        await sql.close();

        return 1;

    } catch (error) {

        return { error }

    }

};

/** EXPONER VARIABLES DE CONFIGURACIÓN DE LA CONEXIÓN A LA BASE DE DATOS. */
exports.configUsuarios = configUsuarios;
exports.configProductos = configProductos;