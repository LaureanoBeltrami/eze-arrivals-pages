# Catálogo local de aeropuertos

`airports.json` es un índice IATA/ICAO derivado de los CSV de [OurAirports](https://ourairports.com/data/), descargados el 11 de septiembre de 2026. Datos de dominio público, sin garantía de exactitud.

Fuentes: https://davidmegginson.github.io/ourairports-data/airports.csv y https://davidmegginson.github.io/ourairports-data/countries.csv.

Se excluyen aeropuertos cerrados y registros sin IATA ni ICAO. Cada entrada conserva IATA, ICAO, municipio, país y código ISO del país. Las claves usan los prefijos `iata:` e `icao:`. Se carga una vez por instancia del proveedor; no hay consultas HTTP de metadatos ni consultas SQL por origen. Los aeropuertos desconocidos se ignoran y contabilizan; nunca se suponen internacionales.

Para actualizarlo, descargar manualmente ambos CSV, unir `iso_country` con `countries.code`, conservar esos seis atributos y regenerar el índice. Revisar cambios de códigos antes de sustituirlo: la identidad de los vuelos usa el código de origen. No hay actualización automática del catálogo.
