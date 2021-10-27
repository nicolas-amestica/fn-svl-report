# Generar reporte de companies

##### Objetivo:

Enviar información de companies actualizada.
Específicamente, obtiene la información de las companies según negocio y país para posterior
generar el reporte.

Finalmente, sube el reporte a un blob storage y envía email con enlace de descarga.

##### Utilización:
```sh

El endpoint tiene un header con clave 'code' y valor ''

{
    "country": "CL|PE|AR" (Según país que se requiera)
    "business": 0|1 (Según negocio que se requiera)
}

```