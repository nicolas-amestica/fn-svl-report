# FN-SVL-REPORT
## Proyecto Azure Serverless con Nodejs que genera reporte de productos y compañias.
### Las tecnologías utilizadas son:
- Azure function core tools v3.
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

#### Nodejs
Requiere [Node.js](https://nodejs.org/) v14.157.3.
```sh
- npm install
```
Iniciar proyecto

```sh
npm start
```

#### Azure Functions Core Tools
Requiere [Azure Function Core Tools] (https://docs.microsoft.com/en-us/azure/azure-functions/functions-run-local?tabs=v4%2Cmacos%2Ccsharp%2Cportal%2Cbash%2Ckeda) v3
```sh
- brew tap azure/functions
```
```sh
- brew install azure-functions-core-tools@3
```
Si estás subiendo de versión desde la 2.0x instala lo siguiente:
```sh
- brew link --overwrite azure-functions-core-tools@3
```


