# Citifuel Tracker (MVP)

Aplicacion web sencilla para:

- Ver agentes de ventas.
- Ver la lista de clientes por agente.
- Abrir el detalle de cada cliente.
- Agregar agentes nuevos.
- Agregar clientes nuevos al agente seleccionado.
- Editar y eliminar clientes seleccionados.
- Ver KPI ticker en tiempo real (estilo barra de mercado).
- Alternar entre temas visuales (Ocean, Slate, Cyber y Light).
- Atajos de teclado: `Alt + Z` o `Ctrl + Alt + Z` abrir nuevo cliente, `Alt + C` o `Ctrl + Alt + C` abrir/cerrar checklist, `Alt + X` o `Esc` cerrar paneles.
- Fondo animado con particulas para profundidad visual.

Todo se guarda en modo local con `localStorage` del navegador.

## Como ejecutarlo

1. Abre una terminal en esta carpeta.
2. Ejecuta:

```bash
py -m http.server 5500
```

3. Entra a `http://localhost:5500`.

## Estructura

- `index.html`: layout principal.
- `styles.css`: estilos.
- `data.js`: datos iniciales (agentes y clientes).
- `app.js`: logica de seleccion y detalle.

## Modo local (persistencia)

- Los datos se almacenan en el navegador (`localStorage`).
- Si cierras y abres la pagina en el mismo navegador, los cambios siguen ahi.
- Si quieres reiniciar todo, borra los datos del sitio desde DevTools (Application > Local Storage).

## Flujo rapido

1. Selecciona un agente en la columna izquierda.
2. Agrega o importa clientes desde la columna principal.
3. Haz clic en un cliente para ver su ficha y su tracking de comunicacion.
4. Puedes eliminar cliente o agente desde sus formularios de gestion.

## Importacion de spreadsheet
Se removio del flujo actual para simplificar la operacion diaria.

## Proximo paso recomendado

Conectar la app a una base de datos (por ejemplo Supabase) para multiusuario y acceso desde cualquier equipo.
