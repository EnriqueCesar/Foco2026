# FOCO 2026

Versión: `v27-foco2026-data-update`

Actualización segura de datos a **Semana 27** usando como fuente `Foco 2026.xlsx`.

## Cambios realizados

- Se regeneró `data.js` desde el Excel actualizado.
- Se validó y leyó `CTC_Tienda` por encabezados con la estructura actual:
  - Año
  - Semana
  - Ceco
  - Tienda
  - Part FHW
- Se validó y leyó `CTC_DM` por encabezados con la estructura actual:
  - Año
  - Semana
  - DM
  - Part FHW
- Se mantuvo la estructura de datos que consume `app.js` para no romper la aplicación.
- Se agregó `updatedToWeek: 27` y `defaultMonth: Jul` dentro de `window.FOCO_DATA`.
- Se ajustó la lectura de semanas del mes para priorizar `Base_Mes_Semana` desde el Excel.
- Se actualizó el cache del Service Worker para evitar data anterior en navegador/PWA.

## Pestañas usadas

- Directorio
- Base_Mes_Semana
- OMT
- Segundas Cx
- IPLH_TPLH_Real
- Costo
- CTC_Tienda
- CTC_DM
- Base_Qualtrics

## Compatibilidad

- Compatible con GitHub Pages.
- Compatible con PWA / Service Worker.
- No se modificó la arquitectura visual ni funcional del proyecto.
- Ningún archivo final supera 20 MB.

## Validaciones realizadas

- Proyecto descomprimido y auditado.
- Pestañas necesarias presentes.
- Encabezados de `CTC_Tienda` presentes y validados.
- Encabezados de `CTC_DM` presentes y validados.
- Semana 27 encontrada en las pestañas fuente correspondientes.
- `data.js` regenerado en el formato actual de `window.FOCO_DATA`.
- Sintaxis JavaScript validada en `app.js`, `data.js` y `sw.js`.
- `manifest.webmanifest` validado como JSON.
- Rutas principales de PWA conservadas.
- ZIP final generado correctamente.

## Nota técnica

La actualización trabaja por nombre de encabezado, no por posición física de columna. Esto evita que la nueva columna `Año` en `CTC_Tienda` y `CTC_DM` desplace cálculos existentes.
