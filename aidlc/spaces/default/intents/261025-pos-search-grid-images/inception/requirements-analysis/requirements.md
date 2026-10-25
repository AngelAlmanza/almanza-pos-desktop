# Requisitos — Mejoras al módulo POS: sugerencias de búsqueda, vista de cuadrícula e imágenes de producto

## Análisis de la intención

Almanza POS es un punto de venta de escritorio para tiendas de abarrotes en México que ya funciona de punta a punta [desc]. Esta mejora busca que el cajero encuentre y agregue productos a la venta más rápido y de forma más visual, sin perder el flujo actual con lector de código de barras [desc]:

- **Encontrar más rápido**: ver sugerencias mientras escribe, en lugar de depender solo de Enter y del modal de coincidencias [desc].
- **Vender de forma visual**: una vista de cuadrícula con foto, agrupada por categoría y ordenable, útil cuando el cajero no recuerda el nombre exacto o el producto no tiene código [desc].
- **Reconocer productos por su imagen**: el catálogo podrá tener una imagen opcional por producto [desc].

Tipo de cambio: mejora (enhancement) de varios componentes en un sistema existente (brownfield). Toca el POS, el catálogo de productos y el backend de productos (`code-structure.md`, sección "Archivos relevantes para el intent activo"). Complejidad: estándar. Fase del producto: prueba de concepto, sin despliegue [desc].

Actores (de `business-overview.md`):
- **Cajero** y **Administrador**: usan el POS (sugerencias y cuadrícula).
- **Administrador**: es el único que crea y edita productos, incluida su imagen, porque la página de productos ya está restringida a administradores.

## Requisitos funcionales

### FR1 — Sugerencias de búsqueda en vivo en el POS

- **FR1.1** Mientras el cajero escribe en la barra de búsqueda del POS, el sistema mostrará una lista de sugerencias justo debajo de la barra cuando el texto, sin espacios al inicio ni al final, tenga **3 caracteres o más** [desc] [Q3].
- **FR1.2** Una sugerencia es un producto **activo** cuyo nombre o código de barras **contiene** el texto escrito en cualquier posición. La comparación ignora mayúsculas y acentos: "jamon" encuentra "Jamón" y "LECHE" encuentra "leche" [Q1] [Q2].
- **FR1.3** La lista mostrará **como máximo 10** sugerencias. Solo **3** son visibles a la vez y el resto se alcanza con desplazamiento (scroll) dentro de la lista [Q3].
- **FR1.4** Cada sugerencia mostrará como mínimo el nombre, el código de barras, el precio y el stock actual del producto [assumption].
- **FR1.5** Navegación con teclado [Q4]:
  - ↑/↓ mueven el resaltado entre las sugerencias y la lista se desplaza para mantener visible la resaltada.
  - **Enter con una sugerencia resaltada** agrega ese producto a la venta.
  - **Enter sin sugerencia resaltada** ejecuta exactamente el flujo actual: código exacto, luego búsqueda de coincidencias, luego agregar o abrir el modal, o mostrar el error.
  - **Esc** cierra la lista sin borrar el texto.
  - Un **clic** en una sugerencia la agrega a la venta.
- **FR1.6** El resaltado se reinicia (ninguna sugerencia resaltada) cada vez que cambia el texto. Así, un escaneo de código de barras, que escribe y presiona Enter seguido, siempre usa el flujo actual de Enter [Q4] [desc].
- **FR1.7** Al agregar un producto desde una sugerencia, el sistema aplica las mismas reglas que el flujo actual [Q4]:
  - un producto a granel abre el diálogo de cantidad a granel existente;
  - uno que no es a granel se agrega con cantidad 1;
  - se valida el stock disponible.

  Después se limpia la barra, se cierra la lista y el foco vuelve a la barra de búsqueda.
- **FR1.8** Una sugerencia de un producto con stock 0 se mostrará marcada como "Agotado" y no se podrá agregar. Elegirla muestra el mensaje de falta de stock que ya existe y no modifica la venta [assumption, por consistencia con Q6].
- **FR1.9** Si el texto tiene 3 caracteres o más y no hay productos que coincidan, la lista mostrará el mensaje "Sin coincidencias" [assumption].
- **FR1.10** Cuando el texto baja de 3 caracteres, la barra pierde el foco o se agrega un producto, la lista se cierra [assumption].
- **FR1.11** Si llegan resultados de una búsqueda anterior después de los de una más reciente, el sistema mostrará solo los del texto actual [assumption, corner-checklist "Older response arrives last"].
- **FR1.12** El comportamiento actual de Enter, el modal de selección con varias coincidencias y el mensaje de "producto no encontrado" se conservan sin cambios [desc].

**Criterios de aceptación FR1**
- **AC1.1** Dado un producto activo "Jamón de pavo" con código `7501000000011`, cuando el cajero escribe "jamo", entonces aparece en las sugerencias.
- **AC1.2** Dado el texto "ja" (2 caracteres), cuando el cajero deja de escribir, entonces no se muestra ninguna lista de sugerencias.
- **AC1.3** Dados 15 productos activos que contienen "leche", cuando el cajero escribe "leche", entonces la lista contiene exactamente 10 sugerencias, se ven 3 y las otras 7 se alcanzan con scroll.
- **AC1.4** Dada una lista de sugerencias visible, cuando el cajero presiona ↓ dos veces y luego Enter, entonces se agrega a la venta la segunda sugerencia, la barra queda vacía, la lista se cierra y el foco regresa a la barra.
- **AC1.5** Dado que el cajero escanea un código de barras existente (texto y Enter sin usar flechas), cuando se procesa el Enter, entonces el producto se agrega igual que hoy, aunque haya sugerencias visibles.
- **AC1.6** Dado el texto "refresco" con varias coincidencias y ninguna sugerencia resaltada, cuando el cajero presiona Enter, entonces se abre el modal de selección actual.
- **AC1.7** Dada una sugerencia de un producto a granel, cuando el cajero hace clic en ella, entonces se abre el diálogo de cantidad a granel existente.
- **AC1.8** Dada una sugerencia marcada "Agotado", cuando el cajero la elige, entonces la venta no cambia y se muestra el mensaje de falta de stock.
- **AC1.9** Dado el texto "zzzz" sin coincidencias, cuando el cajero deja de escribir, entonces la lista muestra "Sin coincidencias".
- **AC1.10** Dada una lista visible, cuando el cajero presiona Esc, entonces la lista se cierra y el texto se conserva.

### FR2 — Vista de cuadrícula de productos en el POS

- **FR2.1** El POS ofrecerá dos vistas para elegir productos: la **vista de lista** (la actual, basada en la barra de búsqueda) y la **vista de cuadrícula**. Un control visible en el POS permitirá cambiar entre ellas en cualquier momento [desc].
- **FR2.2** En ambas vistas, la barra de búsqueda, el carrito (partidas de la venta) y el resumen y cobro de la venta seguirán visibles y funcionando igual que hoy [desc] [assumption].
- **FR2.3** La cuadrícula mostrará solo productos **activos**, como tarjetas (cards) [desc] [assumption, consistente con la búsqueda actual]. Cada tarjeta muestra como mínimo:
  - la imagen del producto, o el placeholder si no tiene (FR4.10);
  - el nombre;
  - el código de barras;
  - el stock actual con su unidad;
  - el precio en formato de moneda MXN.
- **FR2.4** Las tarjetas se agruparán por **categoría**. Los grupos se ordenan alfabéticamente por nombre de categoría y los productos sin categoría van en un grupo **"Sin categoría"** al final. Cada grupo muestra su nombre como encabezado [desc] [assumption].
- **FR2.5** El usuario podrá ordenar las tarjetas **dentro de cada grupo** por **nombre**, **precio** o **stock**, en forma **ascendente o descendente**. El orden por defecto es nombre ascendente. Los empates se desempatan por nombre ascendente [desc] [assumption].
- **FR2.6** La cuadrícula se filtrará con el texto de la barra de búsqueda. Usa la misma regla de FR1.2 (contiene, en nombre o código, sin distinguir mayúsculas ni acentos) y se aplica desde el **primer carácter**; sin texto se muestran todos los productos activos [desc] [Q1] [Q2] [assumption sobre el mínimo de caracteres].
- **FR2.7** Los grupos sin productos que coincidan con el filtro no se mostrarán [assumption].
- **FR2.8** Hacer clic o tocar una tarjeta agrega el producto a la venta con las mismas reglas de FR1.7: diálogo de granel si aplica, cantidad 1 si no y validación de stock [desc].
- **FR2.9** Las tarjetas de productos con stock 0 se mostrarán **atenuadas** y con la etiqueta de texto **"Agotado"**, y no se podrán agregar [Q6].
- **FR2.10** La cuadrícula distinguirá tres estados: "cargando", "error al cargar productos" (con opción de reintentar) y vacío. El vacío tiene dos variantes: "No hay productos activos" y "Sin coincidencias para «texto»" [assumption, corner-checklist "Loading, empty, and error"].
- **FR2.11** Después de una venta cobrada, la cuadrícula reflejará el stock actualizado de los productos vendidos [assumption, corner-checklist "Same fact in two places"].
- **FR2.12** Mientras está activa la vista de cuadrícula, el escaneo de códigos de barras en la barra de búsqueda sigue agregando productos con el flujo actual de Enter [desc] [assumption].

**Criterios de aceptación FR2**
- **AC2.1** Dado el POS en vista de lista, cuando el usuario activa la vista de cuadrícula, entonces se muestran tarjetas agrupadas por categoría y el carrito sigue visible.
- **AC2.2** Dados los productos "Arroz" (categoría Abarrotes), "Coca-Cola" (categoría Bebidas) y "Vela" (sin categoría), cuando se abre la cuadrícula, entonces aparecen los grupos Abarrotes, Bebidas y "Sin categoría", en ese orden.
- **AC2.3** Dado un grupo con precios 10.00, 25.50 y 8.00, cuando el usuario elige ordenar por precio descendente, entonces el orden dentro del grupo es 25.50, 10.00, 8.00.
- **AC2.4** Dada la cuadrícula visible, cuando el usuario escribe "alimento" en la barra, entonces solo se muestran productos cuyo nombre o código contiene "alimento" (sin distinguir mayúsculas ni acentos) y desaparecen los grupos sin coincidencias.
- **AC2.5** Dada una tarjeta de un producto no a granel con stock 5, cuando el usuario la toca, entonces se agrega una partida con cantidad 1 a la venta.
- **AC2.6** Dada una tarjeta de un producto con stock 0, cuando se muestra la cuadrícula, entonces aparece atenuada con la etiqueta "Agotado" y tocarla no modifica la venta.
- **AC2.7** Dado un producto sin imagen, cuando se muestra su tarjeta, entonces se ve el placeholder.
- **AC2.8** Dado un texto sin coincidencias, cuando se filtra la cuadrícula, entonces se muestra "Sin coincidencias para «texto»".
- **AC2.9** Dada la cuadrícula visible, cuando se cobra una venta que incluía 2 unidades de un producto con stock 5, entonces su tarjeta muestra stock 3.

### FR3 — Preferencia de vista por sesión de usuario

- **FR3.1** El sistema recordará la **última vista elegida** (lista o cuadrícula) mientras dure la **sesión de usuario** (login). Al volver al POS dentro de la misma sesión, se abre en esa vista [desc] [Q5].
- **FR3.2** La preferencia **no** se guardará en la base de datos [desc].
- **FR3.3** Si el usuario no ha elegido ninguna vista en su sesión, el POS se abrirá en la **vista de lista** (la actual) [desc] [assumption].
- **FR3.4** Al **cerrar sesión**, la preferencia se olvida. Un usuario que inicia sesión después, sea el mismo u otro, empieza en la vista de lista [Q5].
- **FR3.5** Si la preferencia guardada falta, es ilegible o el almacenamiento no está disponible, el POS usará la vista de lista sin mostrar error [assumption, corner-checklist "Missing or invalid setting"].

**Criterios de aceptación FR3**
- **AC3.1** Dado un usuario que eligió la cuadrícula, cuando navega a Ventas y regresa al POS, entonces el POS se abre en cuadrícula.
- **AC3.2** Dado un usuario que eligió la cuadrícula, cuando cierra sesión y vuelve a iniciar sesión, entonces el POS se abre en lista.
- **AC3.3** Dado el usuario A que eligió la cuadrícula, cuando cierra sesión e inicia sesión el usuario B, entonces el POS de B se abre en lista.
- **AC3.4** Dado un valor de preferencia inválido guardado, cuando se abre el POS, entonces se muestra la vista de lista.

### FR4 — Imagen opcional de producto

- **FR4.1** Al **crear** o **editar** un producto, el administrador podrá asignarle una imagen **opcional**. Un producto puede guardarse sin imagen [desc].
- **FR4.2** La imagen se elige con el selector de archivos nativo del sistema operativo, **solo de archivos que ya estén en el equipo**. El selector filtra los formatos permitidos [desc] [Q7].
- **FR4.3** Formatos permitidos: **PNG, JPG/JPEG y WebP**. Tamaño máximo: **5 MB** [Q7].
- **FR4.4** El sistema rechazará:
  - un archivo cuyo contenido real no sea uno de los formatos permitidos, aunque la extensión lo sea;
  - un archivo de más de 5 MB;
  - un archivo inexistente o sin permiso de lectura.

  El mensaje dirá el motivo y el formulario conservará todo lo demás que se haya capturado [Q7] [assumption, corner-checklist "Invalid input"].
- **FR4.5** El formulario mostrará una **vista previa** de la imagen elegida o actual, y un botón para **quitarla** [desc].
- **FR4.6** Al **guardar** el producto, el sistema copiará la imagen a una carpeta de imágenes de producto dentro de la carpeta de datos de la aplicación, con un nombre de archivo único, y asociará el producto a esa copia [desc].
- **FR4.7** Si el administrador **cancela** el formulario, no se copia ni se borra ningún archivo y el producto no cambia [assumption].
- **FR4.8** Al **quitar** la imagen de un producto existente y guardar, el producto queda **sin imagen** y la copia anterior se **borra** de la carpeta de la app [desc] [Q8].
- **FR4.9** Al **reemplazar** la imagen y guardar, el producto queda asociado a la nueva copia y la copia anterior se borra. Si falla el guardado, el producto conserva su imagen anterior y no queda una copia nueva huérfana [Q8] [assumption, corner-checklist "Multi-step write interrupted"].
- **FR4.10** Al **eliminar** un producto, su copia de imagen se borra de la carpeta de la app [Q8].
- **FR4.11** El archivo **original** del usuario nunca se modifica, mueve ni borra [Q8].
- **FR4.12** Los productos sin imagen, y los productos cuya copia ya no existe o no se puede leer, mostrarán un **icono o imagen placeholder** en la cuadrícula del POS y en la vista previa del formulario [desc] [assumption sobre el archivo faltante].
- **FR4.13** Todos los productos existentes antes de este cambio quedan **sin imagen** y conservan intactos sus demás datos [assumption, corner-checklist "Migration and upgrade"].
- **FR4.14** Las imágenes de producto se mostrarán en la cuadrícula del POS y en el formulario de producto. No se mostrarán en tickets, reportes ni en la tabla del catálogo [desc] [assumption].

**Criterios de aceptación FR4**
- **AC4.1** Dado el formulario de nuevo producto, cuando el administrador elige un archivo PNG de 1 MB y guarda, entonces el producto queda con imagen, la vista previa la muestra y existe una copia en la carpeta de imágenes de la app.
- **AC4.2** Dado un archivo JPG de 6 MB, cuando el administrador lo elige, entonces se muestra un error de tamaño máximo de 5 MB y los demás campos del formulario se conservan.
- **AC4.3** Dado un archivo de texto renombrado a `.png`, cuando el administrador lo elige o guarda, entonces se rechaza por formato no válido.
- **AC4.4** Dado un producto con imagen, cuando el administrador pulsa "Quitar imagen" y guarda, entonces el producto queda sin imagen, su tarjeta muestra el placeholder y la copia anterior ya no existe en la carpeta de la app.
- **AC4.5** Dado un producto con imagen, cuando el administrador elige otra imagen y guarda, entonces el producto muestra la nueva y la copia anterior se borra.
- **AC4.6** Dado un producto con imagen, cuando el administrador abre editar, cambia la imagen y cancela, entonces el producto conserva su imagen original y no hay copias nuevas.
- **AC4.7** Dado un producto con imagen cuya copia fue borrada manualmente de la carpeta, cuando se muestra en la cuadrícula, entonces se ve el placeholder y no aparece ningún error bloqueante.
- **AC4.8** Dado un producto con imagen y sin ventas, cuando el administrador lo elimina, entonces su copia de imagen se borra.
- **AC4.9** Dado cualquier flujo de imagen, cuando termina, entonces el archivo original del usuario sigue existiendo sin cambios.

## Requisitos no funcionales

- **NFR1 — Respuesta de las sugerencias**: con un catálogo de hasta 5 000 productos activos, la lista de sugerencias aparecerá en **300 ms o menos** desde que el cajero deja de escribir. Se mide en el equipo de desarrollo con una base de prueba de 5 000 productos [assumption sobre el tamaño de catálogo].
- **NFR2 — Respuesta de la cuadrícula**: con 1 000 productos activos, de los cuales 500 tienen imagen de hasta 5 MB, la cuadrícula mostrará sus primeras tarjetas en **2 segundos o menos** al activarse. Filtrar u ordenar actualizará la vista en **500 ms o menos**. Las imágenes no deben cargarse todas al mismo tiempo en memoria como texto base64 [assumption] (`architecture.md`, decisión "Imágenes como data URL base64").
- **NFR3 — Compatibilidad con el lector de código de barras**: escanear un código existente seguirá agregando el producto en un solo paso, en ambas vistas, con o sin sugerencias visibles. Se verifica con pruebas de regresión del flujo de Enter [desc].
- **NFR4 — Seguridad de archivos**:
  - las operaciones de imagen solo leerán el archivo que el administrador eligió;
  - solo escribirán y borrarán dentro de la carpeta de imágenes de producto de la app;
  - una referencia de imagen guardada no podrá apuntar fuera de esa carpeta (sin `..`, rutas absolutas ajenas ni enlaces simbólicos).

  Se verifica con pruebas unitarias del almacenamiento [assumption, corner-checklist "Escaping the root"] (`architecture.md`, oportunidad "Validar rol/usuario en backend").
- **NFR5 — Integridad de datos**:
  - la migración de esquema conservará el 100 % de los productos existentes y sus datos;
  - los montos y cantidades mostrados en tarjetas y sugerencias usarán los helpers de precisión existentes (`decimal.js` en frontend, `money.rs` en backend) [assumption] (`code-structure.md`, patrones).
- **NFR6 — Accesibilidad básica**:
  - sugerencias y cuadrícula se pueden operar con teclado (FR1.5; tarjetas enfocables y activables con Enter o Espacio);
  - el estado "Agotado" se comunica con texto y no solo con color o atenuación [assumption, corner-checklist "Keyboard, screen reader, contrast"].
- **NFR7 — Calidad y pruebas**:
  - las suites existentes (`npm test` y `cargo test`) seguirán en verde;
  - habrá pruebas nuevas para la normalización y coincidencia de texto, el agrupamiento y orden de la cuadrícula, la preferencia de vista, y el almacenamiento, validación y borrado de imágenes, incluida la migración [assumption] (`code-quality-assessment.md`).

## Restricciones

- **Stack existente** (`technology-stack.md`, `architecture.md`):
  - Tauri 2 (Rust), React 19 + MUI 7 (TypeScript, sin `any`) y SQLite local;
  - backend hexagonal por slices, con caso de uso, puerto y adaptadores;
  - cambios de esquema solo mediante una nueva migración versionada; nunca se editan las migraciones ya aplicadas.
- **Preferencia de vista** fuera de la base de datos [desc].
- **Origen de imágenes**: solo archivos locales ya existentes en el equipo, sin cámara ni URL [desc].
- **Fase**: prueba de concepto, sin despliegue, sin CI y sin pipelines [desc].
- **Comportamiento actual de búsqueda con Enter** y del modal de coincidencias: se conserva [desc].

## Supuestos

- **Actores**: solo el administrador gestiona las imágenes, porque la página de productos ya es solo para administradores (`business-overview.md`).
- **Tamaño del catálogo**: una tienda de abarrotes típica tiene menos de 5 000 productos activos. Es la base de NFR1 y NFR2.
- **Contenido de las sugerencias** (FR1.4): nombre, código, precio y stock, en una versión compacta de la tarjeta.
- **Mínimo de caracteres en la cuadrícula** (FR2.6): filtra desde el primer carácter. El mínimo de 3 de Q3 aplica solo a la lista de sugerencias, que puede estorbar al escanear; la cuadrícula ya está visible y filtrarla no estorba.
- **Grupos y orden** (FR2.4, FR2.5): grupos alfabéticos con "Sin categoría" al final; orden por defecto nombre ascendente; desempate por nombre.
- **Orden elegido en la cuadrícula**: no se recuerda entre visitas al POS; vuelve a nombre ascendente. Solo la vista lista/cuadrícula se recuerda (FR3).
- **"Sesión de usuario"** (Q5): la sesión de login actual vive en el almacenamiento local de la app y sobrevive a reinicios hasta que el usuario cierra sesión. La preferencia de vista sigue el mismo ciclo de vida: dura lo que dura el login y se borra al cerrar sesión.
- **Productos inactivos**: no aparecen ni en sugerencias ni en la cuadrícula, igual que en la búsqueda actual.
- **Agotados en sugerencias** (FR1.8): se marcan igual que en la cuadrícula, por consistencia con Q6.
- **Ubicación de las copias**: una carpeta dedicada a imágenes de producto dentro de la carpeta de datos de la app, separada de la del logotipo.

## Fuera de alcance

- Tomar fotos con cámara, descargar imágenes desde una URL o pegar desde el portapapeles.
- Varias imágenes por producto, recorte, rotación o edición de imágenes.
- Mostrar imágenes en tickets, reportes, la tabla del catálogo o la página de inventario.
- Formatos GIF y SVG para productos (el logotipo conserva sus formatos actuales).
- Guardar la preferencia de vista o el orden de la cuadrícula en la base de datos.
- Autorización por rol en el backend para los comandos de producto e imagen. Hoy ningún comando la tiene; es un riesgo aceptado en la PoC (`architecture.md`).
- Despliegue, CI e instaladores.
- Corregir la documentación desactualizada de `AGENTS.md`. Se registra como deuda, pero no forma parte de este trabajo.

## Preguntas abiertas para etapas posteriores

- **Cómo servir las imágenes** a la WebView para cumplir NFR2: protocolo de assets de Tauri con alcance limitado, miniaturas generadas o carga diferida. Se decide en Functional Design.
- **Dónde filtrar sugerencias y cuadrícula**: con un comando del backend que normalice acentos o en el cliente sobre la lista de productos activos ya cargada. Se decide en Functional Design, respetando NFR1 y la regla de FR1.2.
- **Distribución visual del POS en vista de cuadrícula** (posición del carrito, del control de vista y del selector de orden): se define en Refined Mockups.

## Sources

- `[desc]` Initial description: la descripción original del usuario (`project-description.json`).
- `[Q1]`–`[Q8]` Respuestas en `requirements-analysis-questions.md`: Q1 = C (contiene), Q2 = A (ignorar mayúsculas y acentos), Q3 = 3 caracteres, máximo 10, 3 visibles y el resto con scroll, Q4 = A (flechas y Enter agregan; Enter sin resaltado = flujo actual), Q5 = B (sesión de usuario), Q6 = A (atenuados "Agotado"), Q7 = A (png/jpg/jpeg/webp, 5 MB), Q8 = A (borrar la copia anterior).
- `[scope]` Workflow-selected scope: plan a la medida basado en refactor; prueba de concepto sin despliegue.
- `[assumption]` Supuestos propios, listados en "Supuestos" y en "Assumptions & Open Questions".
- Código existente: `aidlc/spaces/default/codekb/almanza-pos-desktop/business-overview.md`, `architecture.md`, `code-structure.md`, `technology-stack.md`, `code-quality-assessment.md`.
- `.claude/knowledge/aidlc-product-agent/corner-checklist.md` para el barrido de casos límite.

## Assumptions & Open Questions

- [assumption] Catálogo de hasta 5 000 productos activos (base de NFR1 y NFR2).
- [assumption] La cuadrícula filtra desde el primer carácter; el mínimo de 3 aplica solo a las sugerencias.
- [assumption] Grupos alfabéticos con "Sin categoría" al final; orden por defecto nombre ascendente, que no se recuerda.
- [assumption] La preferencia de vista sigue el ciclo de vida del login, que sobrevive a reinicios hasta cerrar sesión.
- [assumption] Las sugerencias de productos agotados se marcan "Agotado" y no se agregan.
- [assumption] Las imágenes solo se muestran en la cuadrícula del POS y en el formulario de producto.
- Abiertas: cómo servir las imágenes, dónde filtrar (backend o cliente) y la distribución visual. Ver "Preguntas abiertas para etapas posteriores".
