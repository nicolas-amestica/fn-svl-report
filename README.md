# FN-SVL-REPORT
## Proyecto Azure Serverless con Nodejs que genera reporte de productos.
### Las tecnologías utilizadas son:
- Azure function core tools.
- Nodejs v14.17.3
### Endpoints:
El proyecto contiene los siguientes endpoints:
#### I.- POST: {host}/reports/products/allProductsByCountry
Obtiene información de productos según negocio y país, y genera reporte que se debe enviar diariamente.
Debe tener conexión a la base de datos de productos y usuarios.
```sh

El endpoint tiene un header con clave 'code' y valor ''

{
    "country": "CL|PE|AR" (Según país que se requiera)
    "business": 0|1 (Según negocio que se requiera)
}

```

## INSTALACIÓN
### Instalar las siguientes dependencias:
Requiere [Node.js](https://nodejs.org/) v14.157.3.
```sh
- npm install
```
Iniciar proyecto

```sh
npm start
```