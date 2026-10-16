import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Indicaciones } from './indicaciones';
import { PopUps } from '../../../shared/popUps/popUpsService';

describe('Indicaciones', () => {
  let component: Indicaciones;
  let fixture: ComponentFixture<Indicaciones>;
  const popUps = {
    confirmarToast: vi.fn(),
    advertencia: vi.fn(),
  };

  beforeEach(async () => {
    vi.resetAllMocks();
    popUps.confirmarToast.mockResolvedValue(true);

    await TestBed.configureTestingModule({
      imports: [Indicaciones],
      providers: [{ provide: PopUps, useValue: popUps }],
    }).compileComponents();

    fixture = TestBed.createComponent(Indicaciones);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  const elementos = <T extends Element>(selector: string): NodeListOf<T> =>
    fixture.nativeElement.querySelectorAll(selector);

  const elemento = <T extends Element>(selector: string): T =>
    fixture.nativeElement.querySelector(selector);

  // Selectores semánticos: los botones usan las clases globales de src/styles/botonesStyle.scss
  // y las tarjetas del rail las de src/styles/tarjetaStyle.scss
  const tarjetas = (): NodeListOf<HTMLElement> => elementos<HTMLElement>('.indicacion-card');

  // Insignias de la tarjeta: cantidad, frecuencia y duración de la indicación
  const insignias = (indice: number): string[] =>
    [...tarjetas()[indice].querySelectorAll<HTMLElement>('.indicacion-badges li')].map(
      (insignia) => insignia.textContent?.trim() ?? '',
    );

  const botonGuardar = (): HTMLButtonElement =>
    elemento<HTMLButtonElement>('.indicacion-acciones button[type="submit"]');

  const botonCancelar = (): HTMLButtonElement =>
    elemento<HTMLButtonElement>('.indicacion-acciones button[type="button"]');

  const escribir = async (selector: string, valor: string): Promise<void> => {
    const control = elemento<HTMLInputElement>(selector);
    control.value = valor;
    control.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  };

  const elegir = async (selector: string, valor: string): Promise<void> => {
    const control = elemento<HTMLSelectElement>(selector);
    control.value = valor;
    control.dispatchEvent(new Event('change'));
    await fixture.whenStable();
  };

  // Archivo del examen: se elige en el input o se suelta sobre la zona de carga
  const archivoDePrueba = (nombre: string, tipo: string, peso?: number): File => {
    const archivo = new File(['contenido'], nombre, { type: tipo });

    if (peso !== undefined) {
      Object.defineProperty(archivo, 'size', { value: peso });
    }

    return archivo;
  };

  const elegirArchivo = async (archivo: File): Promise<void> => {
    const input = elemento<HTMLInputElement>('#archivoExamen');
    Object.defineProperty(input, 'files', { value: [archivo], configurable: true });
    // jsdom no refleja el archivo elegido en el value del input: se simula para comprobar su vaciado
    Object.defineProperty(input, 'value', {
      value: `C:\\fakepath\\${archivo.name}`,
      writable: true,
      configurable: true,
    });
    input.dispatchEvent(new Event('change'));
    await fixture.whenStable();
  };

  const soltarArchivo = async (archivo: File): Promise<void> => {
    const evento = new Event('drop', { bubbles: true, cancelable: true });
    Object.defineProperty(evento, 'dataTransfer', { value: { files: [archivo] } });
    elemento<HTMLElement>('.carga-archivo').dispatchEvent(evento);
    await fixture.whenStable();
  };

  const adjuntoDelFormulario = (): HTMLElement | null =>
    elemento<HTMLElement>('.archivo-seleccionado');

  const botonQuitarArchivo = (): HTMLButtonElement =>
    elemento<HTMLButtonElement>('.archivo-seleccionado button');

  // Menú de opciones de cada tarjeta (mismo patrón del listado de camas)
  const disparadoresMenu = (): NodeListOf<HTMLButtonElement> =>
    elementos<HTMLButtonElement>('.indicacion-menu-trigger');

  const abrirMenu = async (indice: number): Promise<void> => {
    disparadoresMenu()[indice].click();
    await fixture.whenStable();
  };

  const botonEditarDelMenu = (): HTMLButtonElement =>
    elemento<HTMLButtonElement>('.indicacion-menu .iconEditar');

  const botonEliminarDelMenu = (): HTMLButtonElement =>
    elemento<HTMLButtonElement>('.indicacion-menu .iconQuitar');

  // Filtros del listado: estados en las indicaciones y disponibilidad en los exámenes
  const filtrosIndicados = (): NodeListOf<HTMLButtonElement> =>
    elementos<HTMLButtonElement>('.indicados-filtro');

  const filtroActivo = (): HTMLButtonElement =>
    elemento<HTMLButtonElement>('.indicados-filtro--activo');

  const elegirFiltro = async (etiqueta: string): Promise<void> => {
    const boton = [...filtrosIndicados()].find((filtro) => filtro.textContent?.trim() === etiqueta);

    expect(boton).toBeDefined();
    boton?.click();
    await fixture.whenStable();
  };

  // Tarjetas del rail: las tres secciones conmutan el área central de la pantalla
  const tarjetaDelRail = (titulo: string): HTMLButtonElement | undefined =>
    [...elementos<HTMLButtonElement>('.panel-secciones .tarjeta')].find((tarjeta) =>
      tarjeta.textContent?.includes(titulo),
    );

  const irASeccion = async (titulo: string): Promise<void> => {
    const boton = tarjetaDelRail(titulo);

    expect(boton).toBeDefined();
    boton?.click();
    await fixture.whenStable();
  };

  // Tabla de resultados de la búsqueda de medicamentos: la lupa del buscador, sus filas y su pie
  const botonBuscar = (): HTMLButtonElement =>
    elemento<HTMLButtonElement>('.indicacion-buscador .btnLupa');

  const filasResultados = (): NodeListOf<HTMLTableRowElement> =>
    elementos<HTMLTableRowElement>('.indicacion-resultados tbody tr.fila-seleccionable');

  const pieDeResultados = (): HTMLElement => elemento<HTMLElement>('.indicacion-resultados tfoot');

  const paginaSiguiente = async (): Promise<void> => {
    elemento<HTMLButtonElement>('.indicacion-resultados tfoot .derecha').click();
    await fixture.whenStable();
  };

  const buscarMedicamento = async (texto: string): Promise<void> => {
    await escribir('#medicamentoIndicado', texto);
    botonBuscar().click();
    await fixture.whenStable();
  };

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('ubica las acciones del formulario en la fila compartida y con los estilos globales', () => {
    const acciones = elemento<HTMLElement>('.indicacion-acciones');

    expect(acciones.classList.contains('acciones-formulario')).toBe(true);
    expect(botonGuardar().classList.contains('_guardar')).toBe(true);
    expect(botonCancelar().classList.contains('_cancelar')).toBe(true);
    expect(botonGuardar().textContent?.trim()).toBe('Guardar');
    expect(botonCancelar().textContent?.trim()).toBe('Cancelar');
  });

  it('mantiene el rail, el formulario y el listado en paneles independientes', () => {
    expect(elementos<HTMLElement>('.panel-secciones .tarjeta').length).toBe(3);
    expect(elemento('.panel-secciones .indicacion-form')).toBeNull();
    expect(elemento('.panel-indicados .indicacion-card')?.closest('.panel-seccion')).toBeNull();
  });

  it('muestra las tres secciones del rail con la de Medicamentos activa', () => {
    expect(elementos<HTMLElement>('.panel-secciones .tarjeta').length).toBe(3);
    expect(elementos<HTMLElement>('.panel-secciones .tarjeta_icono i').length).toBe(3);
    expect(elemento<HTMLElement>('.tarjeta--activa').textContent).toContain('Medicamentos');
  });

  it('asigna a cada sección del rail un icono acorde', () => {
    const iconos = elementos<HTMLElement>('.panel-secciones .tarjeta_icono i');

    expect(iconos[0].classList.contains('bi-capsule')).toBe(true);
    expect(iconos[1].classList.contains('bi-clipboard2-pulse')).toBe(true);
    expect(iconos[2].classList.contains('bi-heart-pulse')).toBe(true);
  });

  it('conmuta el área central al pulsar otra sección del rail', async () => {
    await irASeccion('Exámenes');

    expect(component.seccionActiva).toBe('examenes');
    expect(elemento<HTMLElement>('.tarjeta--activa').textContent).toContain('Exámenes');
    expect(elemento('#nombreExamen')).not.toBeNull();
    expect(elemento('#medicamentoIndicado')).toBeNull();

    await irASeccion('Medicamentos');

    expect(component.seccionActiva).toBe('medicamentos');
    expect(elemento<HTMLElement>('.tarjeta--activa').textContent).toContain('Medicamentos');
    expect(elemento('#medicamentoIndicado')).not.toBeNull();
    expect(elemento('#nombreExamen')).toBeNull();
  });

  it('abre la sección de Cuidados desde su tarjeta del rail', async () => {
    expect(elementos<HTMLElement>('.panel-secciones .tarjeta').length).toBe(3);
    expect(tarjetaDelRail('Medicamentos')?.disabled).toBe(false);
    expect(tarjetaDelRail('Exámenes')?.disabled).toBe(false);
    expect(tarjetaDelRail('Cuidados')?.disabled).toBe(false);

    await irASeccion('Cuidados');

    expect(component.seccionActiva).toBe('cuidados');
    expect(elemento<HTMLElement>('.tarjeta--activa').textContent).toContain('Cuidados');
    expect(elemento('#nombreCuidado')).not.toBeNull();
    expect(elemento('#medicamentoIndicado')).toBeNull();
    expect(elemento('#nombreExamen')).toBeNull();
  });

  it('abre la pantalla con las indicaciones registradas y el formulario deshabilitado', () => {
    expect(tarjetas().length).toBe(4);
    expect(tarjetas()[0].textContent).toContain('Paracetamol 500 mg');
    expect(tarjetas()[0].textContent).toContain('Dr. Gómez');
    expect(component.hayMedicamento).toBe(false);
    expect(botonGuardar().disabled).toBe(true);
    expect(elemento('.indicacion-vacio')).toBeNull();
  });

  it('habilita Guardar en cuanto se escribe un medicamento', async () => {
    await escribir('#medicamentoIndicado', 'Ibuprofeno 400 mg');

    expect(component.hayMedicamento).toBe(true);
    expect(botonGuardar().disabled).toBe(false);
  });

  it('agrega la indicación con la cantidad, la frecuencia y la duración elegidas', async () => {
    await escribir('#medicamentoIndicado', 'Ibuprofeno 400 mg');
    await escribir('#cantidadIndicada', '400 mg');
    await escribir('#frecuenciaIndicada', '8');
    await elegir('#duracionTipoIndicada', 'dias');
    await escribir('#duracionCantidadIndicada', '5');
    await escribir('#observacionesIndicadas', 'Después de los alimentos.');

    botonGuardar().click();
    await fixture.whenStable();

    expect(tarjetas().length).toBe(5);
    expect(tarjetas()[4].textContent).toContain('Ibuprofeno 400 mg');
    expect(insignias(4)).toEqual(['400 mg', '8', '5 días']);
    expect(tarjetas()[4].textContent).toContain('Después de los alimentos.');

    // El formulario queda listo para la siguiente captura
    expect(component.medicamento).toBe('');
    expect(elemento<HTMLInputElement>('#medicamentoIndicado').value).toBe('');
    expect(botonGuardar().disabled).toBe(true);
  });

  it('no agrega nada cuando el medicamento está vacío', async () => {
    await escribir('#medicamentoIndicado', '   ');

    component.agregarIndicacion();
    await fixture.whenStable();

    expect(tarjetas().length).toBe(4);
    expect(component.medicamento).toBe('   ');
  });

  it('exige la cantidad de días cuando la duración se marca en días', async () => {
    await escribir('#medicamentoIndicado', 'Ibuprofeno 400 mg');
    await escribir('#cantidadIndicada', '400 mg');
    await elegir('#duracionTipoIndicada', 'dias');

    expect(component.faltaDuracionEnDias).toBe(true);
    expect(botonGuardar().disabled).toBe(true);

    // Tampoco se registra si el formulario se envía sin la cantidad de días
    component.agregarIndicacion();
    await fixture.whenStable();

    expect(tarjetas().length).toBe(4);

    await escribir('#duracionCantidadIndicada', '5');

    expect(component.faltaDuracionEnDias).toBe(false);
    expect(botonGuardar().disabled).toBe(false);

    botonGuardar().click();
    await fixture.whenStable();

    expect(insignias(4)).toEqual(['400 mg', '5 días']);
  });

  it('cancela la captura sin registrar ninguna indicación', async () => {
    await escribir('#medicamentoIndicado', 'Ibuprofeno 400 mg');
    await escribir('#cantidadIndicada', '400 mg');
    await escribir('#frecuenciaIndicada', '8');

    botonCancelar().click();
    await fixture.whenStable();

    expect(tarjetas().length).toBe(4);
    expect(component.medicamento).toBe('');
    expect(component.cantidad).toBe('');
    expect(component.frecuencia).toBeNull();
  });

  // ------------------- RESULTADOS DE LA BÚSQUEDA DE MEDICAMENTOS -------------------
  it('muestra la tabla de resultados con No., Descripción y Administración al buscar', async () => {
    // La tabla aparece solo después de buscar en el catálogo
    expect(elemento('.indicacion-resultados')).toBeNull();

    await buscarMedicamento('amoxicilina');

    const encabezados = [...elementos<HTMLTableCellElement>('.indicacion-resultados thead th')].map(
      (encabezado) => encabezado.textContent?.trim(),
    );

    expect(encabezados).toEqual(['No.', 'Descripción', 'Administración']);
    expect(filasResultados().length).toBe(2);
    expect(filasResultados()[0].textContent).toContain('1');
    expect(filasResultados()[0].textContent).toContain('Amoxicilina Bayer tabletas de 500 mg');
    expect(filasResultados()[0].textContent).toContain('Oral');
    expect(filasResultados()[1].textContent).toContain('2');
    expect(filasResultados()[1].textContent).toContain('Amoxicilina Bayer suspensión inyectable');
    expect(filasResultados()[1].textContent).toContain('Intravenosa');
    // Cada fila se elige con el ratón o con el teclado
    expect(filasResultados()[1].tabIndex).toBe(0);
  });

  it('deja el medicamento elegido en el lugar del buscador y de la tabla', async () => {
    await buscarMedicamento('amoxicilina');

    filasResultados()[1].click();
    await fixture.whenStable();

    // La tabla con su buscador desaparecen y en su sitio queda el medicamento elegido
    expect(elemento('.indicacion-resultados')).toBeNull();
    expect(elemento('#medicamentoIndicado')).toBeNull();
    expect(component.medicamento).toBe('Amoxicilina Bayer suspensión inyectable de 500 mg');
    expect(component.medicamentoElegido?.id).toBe(2);
    expect(elemento<HTMLElement>('.medicamento-elegido-texto').textContent?.trim()).toBe(
      'Amoxicilina Bayer, suspensión inyectable de 500 mg, administración intravenosa',
    );
    expect(botonGuardar().disabled).toBe(false);
  });

  it('oculta el resto del formulario mientras la tabla de resultados está desplegada', async () => {
    expect(elemento('#cantidadIndicada')).not.toBeNull();

    await buscarMedicamento('amoxicilina');

    // Solo quedan el buscador y su tabla: la captura espera al medicamento elegido
    expect(elemento<HTMLInputElement>('#medicamentoIndicado').value).toBe('amoxicilina');
    expect(elemento('.indicacion-resultados')).not.toBeNull();
    expect(elemento('#cantidadIndicada')).toBeNull();
    expect(elemento('#frecuenciaIndicada')).toBeNull();
    expect(elemento('#duracionCantidadIndicada')).toBeNull();
    expect(elemento('#duracionTipoIndicada')).toBeNull();
    expect(elemento('#observacionesIndicadas')).toBeNull();
    // Sin medicamento elegido todavía no hay nada que guardar
    expect(botonGuardar().disabled).toBe(true);

    filasResultados()[0].click();
    await fixture.whenStable();

    expect(elemento('#cantidadIndicada')).not.toBeNull();
    expect(elemento('#frecuenciaIndicada')).not.toBeNull();
    expect(elemento('#duracionCantidadIndicada')).not.toBeNull();
    expect(elemento('#duracionTipoIndicada')).not.toBeNull();
    expect(elemento('#observacionesIndicadas')).not.toBeNull();
  });

  it('reparte los resultados en páginas de cinco medicamentos desde el pie de la tabla', async () => {
    // La búsqueda sin texto lista el catálogo completo, de cinco en cinco
    await buscarMedicamento('');

    expect(component.medicamentosEncontrados.length).toBe(8);
    expect(filasResultados().length).toBe(5);
    expect(filasResultados()[0].textContent).toContain('1');
    expect(filasResultados()[4].textContent).toContain('5');
    expect(filasResultados()[4].textContent).toContain('Omeprazol La Santé');
    expect(pieDeResultados().textContent).toContain('Mostrando 5 de 8 resultados');
    expect(pieDeResultados().textContent).toContain('Seleccione un medicamento');

    await paginaSiguiente();

    // La página siguiente continúa la numeración y solo muestra los tres que quedan
    expect(filasResultados().length).toBe(3);
    expect(filasResultados()[0].textContent).toContain('6');
    expect(filasResultados()[0].textContent).toContain('Metoclopramida Genfar');
    expect(pieDeResultados().textContent).toContain('Mostrando 3 de 8 resultados');
  });

  it('vuelve al buscador al cambiar el medicamento elegido', async () => {
    await buscarMedicamento('amoxicilina');
    filasResultados()[0].click();
    await fixture.whenStable();

    elemento<HTMLButtonElement>('.medicamento-elegido-cambiar').click();
    await fixture.whenStable();

    // El medicamento elegido suelta su sitio y la búsqueda vuelve con el catálogo completo
    expect(elemento('.medicamento-elegido')).toBeNull();
    expect(elemento<HTMLInputElement>('#medicamentoIndicado').value).toBe('');
    expect(component.medicamento).toBe('');
    expect(component.medicamentoElegido).toBeNull();
    expect(filasResultados().length).toBe(5);
  });

  it('no registra la indicación mientras la tabla de resultados esté desplegada', async () => {
    await buscarMedicamento('amoxicilina');

    // Aunque se envíe el formulario, el texto escrito es solo la búsqueda
    component.agregarIndicacion();
    await fixture.whenStable();

    expect(tarjetas().length).toBe(4);
    expect(component.medicamentosEncontrados.length).toBe(2);
  });

  it('informa cuando la búsqueda no encuentra medicamentos en el catálogo', async () => {
    await buscarMedicamento('ranitidina');

    expect(filasResultados().length).toBe(0);
    expect(
      elemento<HTMLElement>('.indicacion-resultados .indicacion-vacio').textContent,
    ).toContain('No se encontraron medicamentos que coincidan con «ranitidina»');
  });

  it('cierra la tabla de resultados al cancelar la captura', async () => {
    await buscarMedicamento('amoxicilina');

    expect(elemento('.indicacion-resultados')).not.toBeNull();

    botonCancelar().click();
    await fixture.whenStable();

    expect(elemento('.indicacion-resultados')).toBeNull();
    expect(component.medicamentosEncontrados.length).toBe(0);
    expect(component.medicamentoElegido).toBeNull();
  });

  it('reemplaza el botón de eliminar del pie por un menú de opciones en cada tarjeta', () => {
    expect(elemento('.indicacion-eliminar')).toBeNull();
    expect(elementos<HTMLElement>('.indicacion-meta button').length).toBe(0);
    expect(disparadoresMenu().length).toBe(4);
    expect(
      disparadoresMenu()[0].querySelector('i')?.classList.contains('bi-three-dots-vertical'),
    ).toBe(true);
    expect(elemento('.indicacion-menu')).toBeNull();
  });

  it('despliega el menú de la tarjeta pulsada y lo repliega al volver a pulsarla', async () => {
    await abrirMenu(1);

    expect(component.menuIndicacionAbierta).toBe(2);
    expect(tarjetas()[1].querySelector('.indicacion-menu')).not.toBeNull();
    expect(tarjetas()[1].classList.contains('indicacion-card--menu-abierto')).toBe(true);
    expect(disparadoresMenu()[1].getAttribute('aria-expanded')).toBe('true');
    expect(elementos('.indicacion-menu').length).toBe(1);

    await abrirMenu(1);

    expect(component.menuIndicacionAbierta).toBeNull();
    expect(elemento('.indicacion-menu')).toBeNull();
    expect(disparadoresMenu()[1].getAttribute('aria-expanded')).toBe('false');
  });

  it('solo mantiene un menú abierto a la vez', async () => {
    await abrirMenu(0);
    await abrirMenu(2);

    expect(component.menuIndicacionAbierta).toBe(3);
    expect(elementos('.indicacion-menu').length).toBe(1);
    expect(tarjetas()[2].querySelector('.indicacion-menu')).not.toBeNull();
  });

  it('cierra el menú al pulsar fuera de la tarjeta que lo tiene abierto', async () => {
    await abrirMenu(0);

    // El panel del listado no está dentro de ninguna tarjeta
    elemento<HTMLElement>('.panel-indicados').dispatchEvent(new Event('click', { bubbles: true }));
    await fixture.whenStable();

    expect(component.menuIndicacionAbierta).toBeNull();
    expect(elemento('.indicacion-menu')).toBeNull();
  });

  it('mantiene el menú abierto al pulsar dentro de la misma tarjeta', async () => {
    await abrirMenu(0);

    tarjetas()[0]
      .querySelector('.indicacion-nombre')
      ?.dispatchEvent(new Event('click', { bubbles: true }));
    await fixture.whenStable();

    expect(component.menuIndicacionAbierta).toBe(1);
    expect(elementos('.indicacion-menu').length).toBe(1);
  });

  it('carga en el formulario la indicación elegida al editar', async () => {
    await abrirMenu(1);
    botonEditarDelMenu().click();
    await fixture.whenStable();

    expect(component.indicacionEnEdicion).toBe(2);
    expect(component.medicamento).toBe('Omeprazol 40 mg');
    expect(component.cantidad).toBe('40 mg');
    expect(component.frecuencia).toBe(24);
    expect(component.duracionTipo).toBe('dias');
    expect(component.duracionCantidad).toBe(7);
    expect(component.observaciones).toBe('Administrar 30 minutos antes del desayuno.');
    expect(elemento<HTMLInputElement>('#medicamentoIndicado').value).toBe('Omeprazol 40 mg');
    expect(elemento<HTMLInputElement>('#frecuenciaIndicada').value).toBe('24');
    expect(elemento<HTMLSelectElement>('#duracionTipoIndicada').value).toBe('dias');
    expect(elemento<HTMLInputElement>('#duracionCantidadIndicada').value).toBe('7');
    expect(tarjetas()[1].classList.contains('indicacion-card--edicion')).toBe(true);
    expect(elemento('.indicacion-menu')).toBeNull();
  });

  it('guarda los cambios sobre la misma tarjeta y conserva fecha, hora y médico', async () => {
    await abrirMenu(1);
    botonEditarDelMenu().click();
    await fixture.whenStable();

    await escribir('#medicamentoIndicado', 'Omeprazol 20 mg');
    await escribir('#frecuenciaIndicada', '12');

    botonGuardar().click();
    await fixture.whenStable();

    expect(tarjetas().length).toBe(4);
    expect(tarjetas()[1].textContent).toContain('Omeprazol 20 mg');
    expect(insignias(1)).toEqual(['40 mg', '12', '7 días']);
    expect(tarjetas()[1].textContent).toContain('10/10/2026');
    expect(tarjetas()[1].textContent).toContain('09:20');
    expect(tarjetas()[1].textContent).toContain('Dr. Gómez');

    // El formulario queda libre y ninguna tarjeta sigue marcada como edición
    expect(component.indicacionEnEdicion).toBeNull();
    expect(component.medicamento).toBe('');
    expect(elemento('.indicacion-card--edicion')).toBeNull();
  });

  it('vuelve a agregar al final del listado después de limpiar la edición', async () => {
    await abrirMenu(1);
    botonEditarDelMenu().click();
    await fixture.whenStable();

    botonCancelar().click();
    await fixture.whenStable();

    expect(component.indicacionEnEdicion).toBeNull();

    await escribir('#medicamentoIndicado', 'Ibuprofeno 400 mg');
    botonGuardar().click();
    await fixture.whenStable();

    expect(tarjetas().length).toBe(5);
    expect(tarjetas()[4].textContent).toContain('Ibuprofeno 400 mg');
    expect(tarjetas()[1].textContent).toContain('Omeprazol 40 mg');
  });

  it('libera el formulario cuando se elimina la indicación en edición', async () => {
    await abrirMenu(1);
    botonEditarDelMenu().click();
    await fixture.whenStable();

    await abrirMenu(1);
    botonEliminarDelMenu().click();
    await fixture.whenStable();

    expect(tarjetas().length).toBe(3);
    expect(component.indicacionEnEdicion).toBeNull();
    expect(component.medicamento).toBe('');
    expect(elemento('.indicacion-card--edicion')).toBeNull();
  });

  it('despliega el menú fuera del flujo para no alterar el tamaño de la tarjeta', async () => {
    const contenidoEnFlujo = (): string[] =>
      [...tarjetas()[0].children]
        .filter((hijo) => !hijo.classList.contains('indicacion-menu'))
        .map((hijo) => `${hijo.tagName}.${hijo.className}`);

    const antes = contenidoEnFlujo();

    await abrirMenu(0);

    const tarjeta = tarjetas()[0];
    const menu = elemento<HTMLElement>('.indicacion-menu');

    // El menú cuelga de la tarjeta, no del contenido que fluye dentro de ella
    expect(menu.parentElement).toBe(tarjeta);
    expect(contenidoEnFlujo()).toEqual(antes);

    // Se posiciona de forma absoluta y la tarjeta es su punto de referencia
    expect(getComputedStyle(menu).position).toBe('absolute');
    expect(getComputedStyle(tarjeta).position).toBe('relative');

    await abrirMenu(0);

    expect(contenidoEnFlujo()).toEqual(antes);
  });

  it('elimina la indicación desde el menú de la tarjeta', async () => {
    await abrirMenu(0);
    botonEliminarDelMenu().click();
    await fixture.whenStable();

    expect(popUps.confirmarToast).toHaveBeenCalledWith(
      expect.stringContaining('Paracetamol 500 mg'),
    );
    expect(tarjetas().length).toBe(3);
    expect(tarjetas()[0].textContent).toContain('Omeprazol 40 mg');
  });

  it('conserva la indicación si la confirmación se cancela', async () => {
    popUps.confirmarToast.mockResolvedValue(false);

    await abrirMenu(0);
    botonEliminarDelMenu().click();
    await fixture.whenStable();

    expect(tarjetas().length).toBe(4);
    expect(elemento('.indicacion-menu')).toBeNull();
  });

  it('muestra el estado vacío cuando no quedan indicaciones', async () => {
    for (let indice = 0; indice < 4; indice++) {
      await abrirMenu(0);
      botonEliminarDelMenu().click();
      await fixture.whenStable();
    }

    expect(tarjetas().length).toBe(0);
    expect(elemento<HTMLElement>('.indicacion-vacio').textContent).toContain(
      'Aún no hay medicamentos',
    );
  });

  it('abre el listado con el filtro Todas y deja fuera las indicaciones eliminadas', () => {
    expect([...filtrosIndicados()].map((filtro) => filtro.textContent?.trim())).toEqual([
      'Todas',
      'Activas',
      'Finalizadas',
      'Eliminadas',
    ]);
    expect(filtroActivo().textContent?.trim()).toBe('Todas');
    expect(filtroActivo().getAttribute('aria-pressed')).toBe('true');
    expect(elementos<HTMLElement>('.indicados-filtro[aria-pressed="true"]').length).toBe(1);

    // El MOCK guarda una indicación eliminada que no se lista entre las vigentes
    expect(tarjetas().length).toBe(4);
    expect(tarjetas()[3].textContent).toContain('Suero fisiológico 0.9%');
  });

  it('muestra solo las indicaciones del estado elegido', async () => {
    await elegirFiltro('Activas');

    expect(filtroActivo().textContent?.trim()).toBe('Activas');
    expect(tarjetas().length).toBe(3);
    expect(tarjetas()[0].textContent).toContain('Paracetamol 500 mg');

    await elegirFiltro('Finalizadas');

    expect(tarjetas().length).toBe(1);
    expect(tarjetas()[0].textContent).toContain('Metoclopramida 10 mg');

    await elegirFiltro('Eliminadas');

    expect(tarjetas().length).toBe(1);
    expect(tarjetas()[0].textContent).toContain('Ketorolaco 30 mg');

    await elegirFiltro('Todas');

    expect(tarjetas().length).toBe(4);
  });

  it('registra la indicación nueva como activa y la lista con ese filtro', async () => {
    await elegirFiltro('Activas');

    await escribir('#medicamentoIndicado', 'Ibuprofeno 400 mg');
    botonGuardar().click();
    await fixture.whenStable();

    expect(tarjetas().length).toBe(4);
    expect(tarjetas()[3].textContent).toContain('Ibuprofeno 400 mg');
  });

  it('pasa la indicación eliminada al filtro Eliminadas', async () => {
    await abrirMenu(0);
    botonEliminarDelMenu().click();
    await fixture.whenStable();

    expect(tarjetas().length).toBe(3);

    await elegirFiltro('Eliminadas');

    expect(tarjetas().length).toBe(2);
    expect(tarjetas()[0].textContent).toContain('Paracetamol 500 mg');
  });

  it('muestra el estado vacío del filtro cuando no hay indicaciones en ese estado', async () => {
    await elegirFiltro('Finalizadas');

    await abrirMenu(0);
    botonEliminarDelMenu().click();
    await fixture.whenStable();

    expect(tarjetas().length).toBe(0);
    expect(elemento<HTMLElement>('.indicacion-vacio').textContent).toContain(
      'No hay indicaciones finalizadas',
    );
  });

  it('cierra el menú y suelta la indicación en edición al cambiar de filtro', async () => {
    await abrirMenu(0);

    await elegirFiltro('Activas');

    expect(component.menuIndicacionAbierta).toBeNull();

    await abrirMenu(0);
    botonEditarDelMenu().click();
    await fixture.whenStable();

    // La indicación sigue en el listado: la edición continúa
    await elegirFiltro('Todas');

    expect(component.indicacionEnEdicion).toBe(1);
    expect(component.medicamento).toBe('Paracetamol 500 mg');

    // Al quedar fuera del listado, el formulario se libera
    await elegirFiltro('Eliminadas');

    expect(component.indicacionEnEdicion).toBeNull();
    expect(component.medicamento).toBe('');
    expect(elemento('.indicacion-card--edicion')).toBeNull();
  });

  it('ajusta el alto del formulario a su contenido sin crecer con el listado', async () => {
    // El formulario de la sección que abre la pantalla también es independiente de su listado
    expect(getComputedStyle(elemento<HTMLElement>('.panel-seccion')).alignSelf).toBe('start');

    await irASeccion('Exámenes');

    expect(getComputedStyle(elemento<HTMLElement>('.panel-seccion')).alignSelf).toBe('start');
  });

  it('deja el desplazamiento del listado solo para las tarjetas, bajo el título y los filtros', async () => {
    const panel = elemento<HTMLElement>('.panel-indicados');
    const filtros = elemento<HTMLElement>('.indicados-filtros');
    const listado = elemento<HTMLElement>('.indicados-lista');

    // El título y los filtros quedan fuera de la pista del desplazamiento, que los sucede en el panel
    expect(panel.firstElementChild?.classList.contains('panel-titulo')).toBe(true);
    expect(filtros.closest('.indicados-lista')).toBeNull();
    expect(filtros.nextElementSibling?.classList.contains('indicados-lista')).toBe(true);
    expect(listado.closest('.panel-indicados')).toBe(panel);
    expect(listado.querySelectorAll('.indicacion-card').length).toBe(4);
    expect(getComputedStyle(listado).overflowY).toBe('auto');

    // El listado de exámenes repite el mismo desplazamiento interno
    await irASeccion('Exámenes');

    const listadoExamenes = elemento<HTMLElement>('.indicados-lista');

    expect(listadoExamenes.querySelectorAll('.indicacion-card').length).toBe(4);
    expect(getComputedStyle(listadoExamenes).overflowY).toBe('auto');
  });

  // ------------------- EXÁMENES INDICADOS -------------------
  it('muestra el registro del examen con sus campos, su adjunto y solo el nombre obligatorio', async () => {
    await irASeccion('Exámenes');

    const etiquetas = [...elementos<HTMLElement>('.panel-seccion .indicacion-etiqueta')].map(
      (etiqueta) => etiqueta.textContent?.trim(),
    );
    const obligatorio = elemento<HTMLElement>('.indicacion-obligatorio');

    expect(etiquetas.length).toBe(3);
    expect(etiquetas[0]).toContain('Nombre de examen');
    expect(etiquetas[1]).toBe('Observación');
    expect(etiquetas[2]).toBe('Archivo o imagen');
    // Solo el nombre del examen es obligatorio
    expect(elementos<HTMLElement>('.indicacion-obligatorio').length).toBe(1);
    expect(obligatorio.closest('label')?.textContent).toContain('Nombre de examen');
    expect(botonGuardar().disabled).toBe(true);
  });

  it('habilita Guardar con el nombre del examen y lo registra con su observación', async () => {
    await irASeccion('Exámenes');

    await escribir('#nombreExamen', 'Perfil lipídico');

    expect(botonGuardar().disabled).toBe(false);

    await escribir('#observacionExamen', 'Repetir en 3 meses.');
    botonGuardar().click();
    await fixture.whenStable();

    expect(tarjetas().length).toBe(5);
    expect(tarjetas()[4].textContent).toContain('Perfil lipídico');
    expect(tarjetas()[4].textContent).toContain('Repetir en 3 meses.');
    // El formulario queda listo para la siguiente captura
    expect(component.nombreExamen).toBe('');
    expect(component.observacionExamen).toBe('');
  });

  it('no registra el examen cuando el nombre está vacío', async () => {
    await irASeccion('Exámenes');

    await escribir('#observacionExamen', 'Examen sin nombre.');

    expect(botonGuardar().disabled).toBe(true);

    botonGuardar().click();
    await fixture.whenStable();

    expect(tarjetas().length).toBe(4);
  });

  it('cancela la captura del examen sin registrarlo', async () => {
    await irASeccion('Exámenes');

    await escribir('#nombreExamen', 'Perfil lipídico');
    botonCancelar().click();
    await fixture.whenStable();

    expect(tarjetas().length).toBe(4);
    expect(component.nombreExamen).toBe('');
  });

  it('abre el listado de exámenes con el filtro Todas', async () => {
    await irASeccion('Exámenes');

    expect([...filtrosIndicados()].map((filtro) => filtro.textContent?.trim())).toEqual([
      'Todas',
      'Disponibles',
      'No disponibles',
      'Eliminados',
    ]);
    expect(filtroActivo().textContent?.trim()).toBe('Todas');
    expect(tarjetas().length).toBe(4);
  });

  it('marca la disponibilidad del examen con el borde y el ojo de la esquina inferior derecha', async () => {
    await irASeccion('Exámenes');

    const disponibles = elementos<HTMLElement>('.indicacion-card--verde');
    const noDisponibles = elementos<HTMLElement>('.indicacion-card--rojo');

    expect(disponibles.length).toBe(2);
    expect(noDisponibles.length).toBe(2);
    expect(disponibles[0].textContent).toContain('Hemograma completo');
    expect(disponibles[0].querySelector('.examen-ojo')).not.toBeNull();
    expect(noDisponibles[0].textContent).toContain('Radiografía de tórax');
    expect(noDisponibles[0].textContent).toContain('Adjuntar la placa anterior');
    // El examen no disponible no lleva el ojo, y ninguna tarjeta de examen lleva el pie de la indicación
    expect(noDisponibles[0].querySelector('.examen-ojo')).toBeNull();
    expect(elementos<HTMLElement>('.indicacion-meta').length).toBe(0);

    // Cada tarjeta de examen lleva el menú de opciones de las tarjetas de medicamentos
    expect(disparadoresMenu().length).toBe(4);
    expect(
      disparadoresMenu()[0].querySelector('i')?.classList.contains('bi-three-dots-vertical'),
    ).toBe(true);
  });

  it('deja el ojo del examen como botón flotante de la esquina inferior derecha, sin agrandar la tarjeta', async () => {
    await irASeccion('Exámenes');

    const tarjeta = elemento<HTMLElement>('.indicacion-card--verde');
    const ojo = elemento<HTMLButtonElement>('.examen-ojo');
    const observaciones = elemento<HTMLElement>(
      '.indicacion-card--verde .indicacion-observaciones',
    );

    // El ojo cuelga directamente de la tarjeta: no hay fila propia que le sume alto
    expect(ojo.parentElement).toBe(tarjeta);
    expect(elementos<HTMLElement>('.examen-pie').length).toBe(0);
    expect(getComputedStyle(ojo).position).toBe('absolute');
    expect(getComputedStyle(ojo).bottom).toBe('0.4rem');
    expect(getComputedStyle(ojo).right).toBe('0.5rem');

    // La última línea del texto le reserva la esquina para no pasar por debajo del icono
    expect(getComputedStyle(observaciones).paddingRight).toBe('2.6rem');

    // El ojo es un botón y responde al puntero
    expect(ojo.tagName).toBe('BUTTON');
    expect(getComputedStyle(ojo).cursor).toBe('pointer');
    expect(ojo.getAttribute('aria-label')).toContain('Hemograma completo');

    // El examen no disponible no dibuja el ojo
    expect(elementos<HTMLElement>('.indicacion-card--rojo .examen-ojo').length).toBe(0);
  });

  it('avisa al pulsar el ojo cuando el examen no lleva un adjunto', async () => {
    await irASeccion('Exámenes');

    elemento<HTMLButtonElement>('.examen-ojo').click();
    await fixture.whenStable();

    expect(popUps.advertencia).toHaveBeenCalledWith(
      'El examen "Hemograma completo" no tiene un archivo adjunto.',
    );
  });

  it('abre en otra pestaña el adjunto del examen al pulsar el ojo', async () => {
    const placa = archivoDePrueba('placa.png', 'image/png');
    const direccion = 'blob:placa';

    // jsdom no implementa ni las direcciones de objeto de los archivos ni la apertura de pestañas
    const crearDireccion = vi.fn(() => direccion);

    Object.defineProperty(URL, 'createObjectURL', { value: crearDireccion, configurable: true });
    Object.defineProperty(URL, 'revokeObjectURL', { value: vi.fn(), configurable: true });

    const abrirPestana = vi.fn(() => null);

    Object.defineProperty(window, 'open', { value: abrirPestana, configurable: true });

    component.examenes = component.examenes.map((examen) =>
      examen.id === 1
        ? {
            ...examen,
            archivo: {
              archivo: placa,
              nombre: placa.name,
              peso: '1 KB',
              extension: 'png',
              esImagen: true,
              icono: 'bi-file-earmark-image',
            },
          }
        : examen,
    );
    await irASeccion('Exámenes');

    elemento<HTMLButtonElement>('.examen-ojo').click();
    await fixture.whenStable();

    expect(crearDireccion).toHaveBeenCalledWith(placa);
    expect(abrirPestana).toHaveBeenCalledWith(direccion, '_blank', 'noopener');
    expect(popUps.advertencia).not.toHaveBeenCalled();
  });

  it('muestra solo los exámenes de la disponibilidad elegida', async () => {
    await irASeccion('Exámenes');

    await elegirFiltro('Disponibles');

    expect(filtroActivo().textContent?.trim()).toBe('Disponibles');
    expect(tarjetas().length).toBe(2);
    expect(tarjetas()[0].textContent).toContain('Hemograma completo');

    await elegirFiltro('No disponibles');

    expect(tarjetas().length).toBe(2);
    expect(tarjetas()[0].textContent).toContain('Radiografía de tórax');
    expect(elementos<HTMLElement>('.examen-ojo').length).toBe(0);

    await elegirFiltro('Todas');

    expect(tarjetas().length).toBe(4);
  });

  it('registra el examen nuevo como disponible y lo lista con ese filtro', async () => {
    await irASeccion('Exámenes');
    await elegirFiltro('Disponibles');
    await escribir('#nombreExamen', 'Perfil lipídico');

    botonGuardar().click();
    await fixture.whenStable();

    expect(tarjetas().length).toBe(3);
    expect(tarjetas()[2].textContent).toContain('Perfil lipídico');
    expect(tarjetas()[2].classList.contains('indicacion-card--verde')).toBe(true);
  });

  it('carga en el formulario el examen elegido al editar y guarda sobre la misma tarjeta', async () => {
    await irASeccion('Exámenes');

    await abrirMenu(0);
    botonEditarDelMenu().click();
    await fixture.whenStable();

    expect(component.examenEnEdicion).toBe(1);
    expect(component.nombreExamen).toBe('Hemograma completo');
    expect(component.observacionExamen).toBe('Tomar la muestra en ayunas.');
    expect(tarjetas()[0].classList.contains('indicacion-card--edicion')).toBe(true);

    await escribir('#nombreExamen', 'Hemograma completo y coagulación');
    botonGuardar().click();
    await fixture.whenStable();

    // Los cambios se guardan en la misma tarjeta y el formulario queda libre para otra captura
    expect(tarjetas().length).toBe(4);
    expect(tarjetas()[0].textContent).toContain('Hemograma completo y coagulación');
    expect(component.examenEnEdicion).toBeNull();
    expect(component.nombreExamen).toBe('');
  });

  it('cierra el menú del examen al pulsar fuera de su tarjeta', async () => {
    await irASeccion('Exámenes');

    await abrirMenu(0);

    expect(component.menuIndicacionAbierta).toBe(1);

    elemento<HTMLElement>('.panel-indicados').dispatchEvent(new Event('click', { bubbles: true }));
    await fixture.whenStable();

    expect(component.menuIndicacionAbierta).toBeNull();
  });

  it('pasa el examen eliminado al filtro Eliminados con el borde gris', async () => {
    await irASeccion('Exámenes');

    await abrirMenu(0);
    botonEliminarDelMenu().click();
    await fixture.whenStable();

    expect(popUps.confirmarToast).toHaveBeenCalledWith(
      '¿Está seguro de eliminar el examen "Hemograma completo"?',
    );

    // El examen eliminado sale del listado vigente
    expect(tarjetas().length).toBe(3);

    await elegirFiltro('Eliminados');

    expect(filtroActivo().textContent?.trim()).toBe('Eliminados');
    expect(tarjetas().length).toBe(2);
    expect(tarjetas()[0].textContent).toContain('Hemograma completo');
    expect(tarjetas()[0].classList.contains('indicacion-card--eliminada')).toBe(true);
    expect(tarjetas()[0].classList.contains('indicacion-card--verde')).toBe(false);
  });

  it('muestra el estado vacío cuando el filtro de exámenes no tiene coincidencias', async () => {
    component.examenes = component.examenes.map((examen) => ({ ...examen, disponible: true }));
    await irASeccion('Exámenes');
    await elegirFiltro('No disponibles');

    expect(tarjetas().length).toBe(0);
    expect(elemento<HTMLElement>('.indicacion-vacio').textContent).toContain(
      'No hay exámenes no disponibles.',
    );
  });

  // ------------------- ARCHIVO DEL EXAMEN (IMAGEN O PDF) -------------------
  it('ofrece cargar una imagen o un PDF dentro del registro del examen', async () => {
    await irASeccion('Exámenes');

    const input = elemento<HTMLInputElement>('#archivoExamen');

    expect(input.type).toBe('file');
    // El formato y el peso admitidos los publica el servicio global de archivos
    expect(input.getAttribute('accept')).toBe('.pdf,.jpg,.jpeg,.png');
    expect(elemento<HTMLElement>('.zona-carga').textContent).toContain('máximo 10 MB');
    expect(elemento<HTMLElement>('.carga-archivo').closest('.indicacion-form')).not.toBeNull();
    // Sin adjunto solo se muestra la zona de carga
    expect(adjuntoDelFormulario()).toBeNull();
  });

  it('adjunta la imagen elegida y la guarda junto al examen', async () => {
    await irASeccion('Exámenes');

    await elegirArchivo(archivoDePrueba('radiografia.png', 'image/png', 1.5 * 1024 * 1024));

    expect(adjuntoDelFormulario()?.textContent).toContain('radiografia.png');
    expect(adjuntoDelFormulario()?.textContent).toContain('1.5 MB');
    expect(
      elemento<HTMLElement>('.archivo-seleccionado i').classList.contains('bi-file-earmark-image'),
    ).toBe(true);
    // Elegir el archivo no habilita por sí solo el registro: el nombre sigue siendo obligatorio
    expect(botonGuardar().disabled).toBe(true);

    await escribir('#nombreExamen', 'Radiografía de rodilla');
    await escribir('#observacionExamen', 'Comparar con la placa anterior.');
    botonGuardar().click();
    await fixture.whenStable();

    expect(tarjetas().length).toBe(5);
    expect(tarjetas()[4].querySelector('.examen-adjunto')?.textContent).toContain(
      'radiografia.png',
    );
    // El formulario queda listo para la siguiente captura, sin el adjunto anterior
    expect(component.archivoExamen).toBeNull();
    expect(adjuntoDelFormulario()).toBeNull();
    expect(elemento<HTMLInputElement>('#archivoExamen').value).toBe('');
  });

  it('adjunta el PDF que se suelta sobre la zona de carga', async () => {
    await irASeccion('Exámenes');

    await soltarArchivo(archivoDePrueba('resultado.pdf', 'application/pdf'));

    expect(component.archivoExamen?.nombre).toBe('resultado.pdf');
    expect(adjuntoDelFormulario()?.textContent).toContain('resultado.pdf');
    expect(
      elemento<HTMLElement>('.archivo-seleccionado i').classList.contains('bi-file-earmark-pdf'),
    ).toBe(true);
  });

  it('rechaza el archivo que no es una imagen ni un PDF', async () => {
    await irASeccion('Exámenes');

    await elegirArchivo(
      archivoDePrueba(
        'informe.docx',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ),
    );

    expect(popUps.advertencia).toHaveBeenCalledWith(
      'Formato no permitido. Solo se admiten imágenes JPG o PNG y documentos PDF.',
    );
    expect(component.archivoExamen).toBeNull();
    expect(adjuntoDelFormulario()).toBeNull();
    // El input queda vacío para poder elegir otro archivo
    expect(elemento<HTMLInputElement>('#archivoExamen').value).toBe('');
  });

  it('rechaza el archivo que supera el peso máximo', async () => {
    await irASeccion('Exámenes');

    await elegirArchivo(archivoDePrueba('informe.pdf', 'application/pdf', 11 * 1024 * 1024));

    expect(popUps.advertencia).toHaveBeenCalledWith('El archivo supera el tamaño máximo de 10 MB.');
    expect(component.archivoExamen).toBeNull();
    expect(adjuntoDelFormulario()).toBeNull();
  });

  it('quita el adjunto del examen sin tocar el resto del formulario', async () => {
    await irASeccion('Exámenes');
    await escribir('#nombreExamen', 'Perfil lipídico');
    await elegirArchivo(archivoDePrueba('resultado.pdf', 'application/pdf'));

    botonQuitarArchivo().click();
    await fixture.whenStable();

    expect(component.archivoExamen).toBeNull();
    expect(adjuntoDelFormulario()).toBeNull();
    expect(elemento<HTMLInputElement>('#archivoExamen').value).toBe('');
    // Lo escrito en el formulario se conserva
    expect(component.nombreExamen).toBe('Perfil lipídico');
  });

  it('registra el examen sin adjunto cuando no se carga ningún archivo', async () => {
    await irASeccion('Exámenes');
    await escribir('#nombreExamen', 'Perfil lipídico');
    botonGuardar().click();
    await fixture.whenStable();

    expect(tarjetas().length).toBe(5);
    expect(tarjetas()[4].querySelector('.examen-adjunto')).toBeNull();
  });

  // ------------------- CUIDADOS INDICADOS -------------------
  it('muestra el registro del cuidado con sus cuatro campos y solo el nombre obligatorio', async () => {
    await irASeccion('Cuidados');

    const etiquetas = [...elementos<HTMLElement>('.panel-seccion .indicacion-etiqueta')].map(
      (etiqueta) => etiqueta.textContent?.trim(),
    );
    const obligatorio = elemento<HTMLElement>('.indicacion-obligatorio');

    expect(etiquetas.length).toBe(5);
    expect(etiquetas[0]).toContain('Nombre de cuidado');
    expect(etiquetas[1]).toContain('Frecuencia');
    expect(etiquetas[2]).toBe('Duración');
    expect(etiquetas[3]).toBe('Tipo de duración');
    expect(etiquetas[4]).toBe('Observaciones');

    // Los cuatro campos del cuidado están en el formulario
    expect(elemento('#nombreCuidado')).not.toBeNull();
    expect(elemento('#frecuenciaCuidado')).not.toBeNull();
    expect(elemento('#duracionCuidado')).not.toBeNull();
    expect(elemento('#observacionesCuidado')).not.toBeNull();

    // El nombre y la frecuencia son obligatorios; la cantidad de días solo lo es con el tipo «Días»
    expect(elementos<HTMLElement>('.indicacion-obligatorio').length).toBe(2);
    expect(obligatorio.closest('label')?.textContent).toContain('Nombre de cuidado');
    expect(botonGuardar().disabled).toBe(true);
  });

  it('habilita Guardar con el nombre del cuidado y lo registra con sus datos', async () => {
    await irASeccion('Cuidados');

    await escribir('#nombreCuidado', 'Dieta blanda');

    expect(component.hayCuidado).toBe(true);
    expect(botonGuardar().disabled).toBe(false);

    await escribir('#frecuenciaCuidado', '6');
    await elegir('#duracionTipoCuidado', 'dias');
    await escribir('#duracionCuidado', '4');
    await escribir('#observacionesCuidado', 'Sin residuos y en porciones pequeñas.');

    botonGuardar().click();
    await fixture.whenStable();

    expect(tarjetas().length).toBe(5);
    expect(tarjetas()[4].textContent).toContain('Dieta blanda');
    expect(insignias(4)).toEqual(['6', '4 días']);
    expect(tarjetas()[4].textContent).toContain('Sin residuos y en porciones pequeñas.');

    // El formulario queda listo para la siguiente captura
    expect(component.nombreCuidado).toBe('');
    expect(elemento<HTMLInputElement>('#nombreCuidado').value).toBe('');
    expect(botonGuardar().disabled).toBe(true);
  });

  it('exige la cantidad de días cuando la duración del cuidado se marca en días', async () => {
    await irASeccion('Cuidados');

    await escribir('#nombreCuidado', 'Dieta blanda');
    await elegir('#duracionTipoCuidado', 'dias');

    expect(component.faltaDuracionEnDiasCuidado).toBe(true);
    expect(botonGuardar().disabled).toBe(true);

    // Tampoco se registra si el formulario se envía sin la cantidad de días
    component.agregarCuidado();
    await fixture.whenStable();

    expect(tarjetas().length).toBe(4);

    await escribir('#duracionCuidado', '4');

    expect(component.faltaDuracionEnDiasCuidado).toBe(false);
    expect(botonGuardar().disabled).toBe(false);

    botonGuardar().click();
    await fixture.whenStable();

    // La frecuencia es opcional: sin ella la tarjeta solo muestra la duración
    expect(insignias(4)).toEqual(['4 días']);
  });

  it('no agrega nada cuando el nombre del cuidado está vacío', async () => {
    await irASeccion('Cuidados');

    await escribir('#nombreCuidado', '   ');

    component.agregarCuidado();
    await fixture.whenStable();

    expect(tarjetas().length).toBe(4);
    expect(component.nombreCuidado).toBe('   ');
  });

  it('cancela la captura del cuidado sin registrar nada', async () => {
    await irASeccion('Cuidados');

    await escribir('#nombreCuidado', 'Dieta blanda');
    await escribir('#frecuenciaCuidado', '6');
    await elegir('#duracionTipoCuidado', 'dias');
    await escribir('#duracionCuidado', '4');

    botonCancelar().click();
    await fixture.whenStable();

    expect(tarjetas().length).toBe(4);
    expect(component.nombreCuidado).toBe('');
    expect(component.frecuenciaCuidado).toBeNull();
    expect(component.duracionTipoCuidado).toBe('');
    expect(component.duracionCantidadCuidado).toBeNull();
  });

  it('abre el listado de cuidados con el filtro Todas y deja fuera los eliminados', async () => {
    await irASeccion('Cuidados');

    expect([...filtrosIndicados()].map((filtro) => filtro.textContent?.trim())).toEqual([
      'Todas',
      'Completadas',
      'En proceso',
      'Eliminadas',
    ]);
    expect(filtroActivo().textContent?.trim()).toBe('Todas');
    expect(filtroActivo().getAttribute('aria-pressed')).toBe('true');
    expect(elementos<HTMLElement>('.indicados-filtro[aria-pressed="true"]').length).toBe(1);

    // El MOCK guarda un cuidado eliminado que no se lista entre los vigentes
    expect(tarjetas().length).toBe(4);
    expect(tarjetas()[0].textContent).toContain('Cambio de posición');
    expect(tarjetas()[3].textContent).toContain('Curación de herida');
  });

  it('muestra solo los cuidados del estado elegido', async () => {
    await irASeccion('Cuidados');

    await elegirFiltro('Completadas');

    expect(filtroActivo().textContent?.trim()).toBe('Completadas');
    expect(tarjetas().length).toBe(1);
    expect(tarjetas()[0].textContent).toContain('Curación de herida');

    await elegirFiltro('En proceso');

    expect(tarjetas().length).toBe(3);
    expect(tarjetas()[0].textContent).toContain('Cambio de posición');

    await elegirFiltro('Eliminadas');

    expect(tarjetas().length).toBe(1);
    expect(tarjetas()[0].textContent).toContain('Vigilancia de diuresis');

    await elegirFiltro('Todas');

    expect(tarjetas().length).toBe(4);
  });

  it('pinta el borde izquierdo de cada cuidado con el color de su estado', async () => {
    await irASeccion('Cuidados');

    // En proceso en naranja, completado en verde y ningún cuidado con el gris de lo eliminado
    expect(elementos<HTMLElement>('.indicacion-card--naranja').length).toBe(3);
    expect(elementos<HTMLElement>('.indicacion-card--verde').length).toBe(1);
    expect(elementos<HTMLElement>('.indicacion-card--eliminada').length).toBe(0);

    const completado = elemento<HTMLElement>('.indicacion-card--verde');

    expect(completado.textContent).toContain('Curación de herida');
    expect(getComputedStyle(completado).borderLeftColor).toBe('rgb(34, 197, 94)');
    expect(
      getComputedStyle(elemento<HTMLElement>('.indicacion-card--naranja')).borderLeftColor,
    ).toBe('rgb(255, 146, 28)');

    await elegirFiltro('Eliminadas');

    const eliminado = elemento<HTMLElement>('.indicacion-card--rojo');

    expect(eliminado.textContent).toContain('Vigilancia de diuresis');
    expect(getComputedStyle(eliminado).borderLeftColor).toBe('rgb(237, 26, 15)');
  });

  it('registra el cuidado nuevo en proceso y lo lista con ese filtro', async () => {
    await irASeccion('Cuidados');
    await elegirFiltro('En proceso');

    await escribir('#nombreCuidado', 'Dieta blanda');
    botonGuardar().click();
    await fixture.whenStable();

    expect(tarjetas().length).toBe(4);
    expect(tarjetas()[3].textContent).toContain('Dieta blanda');
    expect(tarjetas()[3].classList.contains('indicacion-card--naranja')).toBe(true);
  });

  it('pasa el cuidado eliminado al filtro Eliminadas con el borde rojo', async () => {
    await irASeccion('Cuidados');

    await abrirMenu(0);
    botonEliminarDelMenu().click();
    await fixture.whenStable();

    expect(popUps.confirmarToast).toHaveBeenCalledWith(
      '¿Está seguro de eliminar el cuidado "Cambio de posición"?',
    );

    // El cuidado eliminado sale del listado vigente
    expect(tarjetas().length).toBe(3);

    await elegirFiltro('Eliminadas');

    expect(filtroActivo().textContent?.trim()).toBe('Eliminadas');
    expect(tarjetas().length).toBe(2);
    expect(tarjetas()[0].textContent).toContain('Cambio de posición');
    expect(tarjetas()[0].classList.contains('indicacion-card--rojo')).toBe(true);
    expect(tarjetas()[0].classList.contains('indicacion-card--eliminada')).toBe(false);
  });

  it('conserva el cuidado si la confirmación de la eliminación se cancela', async () => {
    await irASeccion('Cuidados');
    popUps.confirmarToast.mockResolvedValue(false);

    await abrirMenu(0);
    botonEliminarDelMenu().click();
    await fixture.whenStable();

    expect(tarjetas().length).toBe(4);
    expect(elemento('.indicacion-menu')).toBeNull();
  });

  it('muestra el estado vacío del filtro cuando no hay cuidados en ese estado', async () => {
    await irASeccion('Cuidados');
    await elegirFiltro('Completadas');

    await abrirMenu(0);
    botonEliminarDelMenu().click();
    await fixture.whenStable();

    expect(tarjetas().length).toBe(0);
    expect(elemento<HTMLElement>('.indicacion-vacio').textContent).toContain(
      'No hay cuidados con el filtro «Completadas»',
    );
  });

  it('detalla el cuidado en su tarjeta con las insignias, las observaciones y el pie', async () => {
    await irASeccion('Cuidados');

    const tarjeta = tarjetas()[0];
    const pie = tarjeta.querySelector<HTMLElement>('.indicacion-meta');

    expect(insignias(0)).toEqual(['2', '5 días']);
    expect(tarjeta.querySelector('.indicacion-observaciones')?.textContent).toContain(
      'Alternar decúbito lateral',
    );
    expect(pie?.textContent).toContain('10/10/2026');
    expect(pie?.textContent).toContain('09:15');
    expect(pie?.textContent).toContain('Dr. Gómez');
    expect([...(pie?.querySelectorAll('i') ?? [])].map((icono) => icono.className)).toEqual([
      'bi bi-calendar3',
      'bi bi-clock',
      'bi bi-person',
    ]);

    // Cada tarjeta de cuidado lleva el menú de opciones de las otras tarjetas del listado
    expect(disparadoresMenu().length).toBe(4);
    expect(tarjeta.querySelector('.indicacion-menu-trigger')).not.toBeNull();

    // El tipo de duración distinto de «días» se muestra con su nombre
    await elegirFiltro('Eliminadas');

    expect(insignias(0)).toEqual(['8', 'Por tiempo indefinido']);
  });

  it('despliega el menú del cuidado y lo cierra al pulsar fuera de su tarjeta', async () => {
    await irASeccion('Cuidados');

    await abrirMenu(0);

    expect(component.menuIndicacionAbierta).toBe(1);
    expect(elementos('.indicacion-menu').length).toBe(1);

    elemento<HTMLElement>('.panel-indicados').dispatchEvent(new Event('click', { bubbles: true }));
    await fixture.whenStable();

    expect(component.menuIndicacionAbierta).toBeNull();
    expect(elemento('.indicacion-menu')).toBeNull();
  });

  it('carga en el formulario el cuidado elegido y guarda sobre la misma tarjeta', async () => {
    await irASeccion('Cuidados');

    await abrirMenu(0);
    botonEditarDelMenu().click();
    await fixture.whenStable();

    expect(component.cuidadoEnEdicion).toBe(1);
    expect(component.nombreCuidado).toBe('Cambio de posición');
    expect(component.frecuenciaCuidado).toBe(2);
    expect(component.duracionTipoCuidado).toBe('dias');
    expect(component.duracionCantidadCuidado).toBe(5);
    expect(component.observacionesCuidado).toBe(
      'Alternar decúbito lateral y evitar apoyar la zona de la úlcera.',
    );
    expect(elemento<HTMLInputElement>('#frecuenciaCuidado').value).toBe('2');
    expect(elemento<HTMLInputElement>('#duracionCuidado').value).toBe('5');
    expect(tarjetas()[0].classList.contains('indicacion-card--edicion')).toBe(true);
    expect(elemento('.indicacion-menu')).toBeNull();

    await escribir('#nombreCuidado', 'Cambio de posición cada 4 horas');
    await escribir('#frecuenciaCuidado', '4');
    botonGuardar().click();
    await fixture.whenStable();

    // Los cambios se guardan en la misma tarjeta, que conserva su fecha, hora, médico y estado
    expect(tarjetas().length).toBe(4);
    expect(tarjetas()[0].textContent).toContain('Cambio de posición cada 4 horas');
    expect(insignias(0)).toEqual(['4', '5 días']);
    expect(tarjetas()[0].textContent).toContain('10/10/2026');
    expect(tarjetas()[0].classList.contains('indicacion-card--naranja')).toBe(true);
    expect(component.cuidadoEnEdicion).toBeNull();
    expect(component.nombreCuidado).toBe('');
  });

  it('libera el formulario cuando se elimina el cuidado en edición', async () => {
    await irASeccion('Cuidados');

    await abrirMenu(0);
    botonEditarDelMenu().click();
    await fixture.whenStable();

    await abrirMenu(0);
    botonEliminarDelMenu().click();
    await fixture.whenStable();

    expect(tarjetas().length).toBe(3);
    expect(component.cuidadoEnEdicion).toBeNull();
    expect(component.nombreCuidado).toBe('');
    expect(elemento('.indicacion-card--edicion')).toBeNull();
  });

  it('cierra el menú del cuidado y suelta su edición al cambiar de filtro', async () => {
    await irASeccion('Cuidados');

    await abrirMenu(0);

    await elegirFiltro('En proceso');

    expect(component.menuIndicacionAbierta).toBeNull();

    await abrirMenu(0);
    botonEditarDelMenu().click();
    await fixture.whenStable();

    // El cuidado sigue en el listado: la edición continúa
    await elegirFiltro('Todas');

    expect(component.cuidadoEnEdicion).toBe(1);
    expect(component.nombreCuidado).toBe('Cambio de posición');

    // Al quedar fuera del listado, el formulario se libera
    await elegirFiltro('Completadas');

    expect(component.cuidadoEnEdicion).toBeNull();
    expect(component.nombreCuidado).toBe('');
    expect(elemento('.indicacion-card--edicion')).toBeNull();
  });

  // Ficha con los datos del paciente: el mismo bloque compartido que usa evaluación clínica
  const botonPestanaPaciente = (): HTMLButtonElement =>
    elemento<HTMLButtonElement>('.ficha-pestana');

  const botonPlegarFicha = (): HTMLButtonElement => elemento<HTMLButtonElement>('.ficha-plegar');

  const fichaPaciente = (): HTMLElement | null =>
    fixture.nativeElement.querySelector('app-datos-paciente .ficha');

  it('reutiliza el bloque de datos del paciente de evaluación clínica', () => {
    // La pantalla no duplica la ficha: se dibuja el bloque compartido, cerrado y con su pestaña
    expect(elemento<HTMLElement>('app-datos-paciente')).not.toBeNull();
    expect(elemento<HTMLElement>('app-datos-paciente .ficha-pestana')).not.toBeNull();
    expect(fichaPaciente()).toBeNull();
  });

  it('abre la ficha del paciente con la pestaña lateral y reserva su espacio', async () => {
    expect(component.pacienteAbierto).toBe(false);
    expect(botonPestanaPaciente().getAttribute('aria-expanded')).toBe('false');
    expect(
      elemento<HTMLElement>('.indicaciones').classList.contains('indicaciones--ficha-abierta'),
    ).toBe(false);

    botonPestanaPaciente().click();
    await fixture.whenStable();

    const rejilla = elemento<HTMLElement>('.indicaciones');
    expect(component.pacienteAbierto).toBe(true);
    expect(botonPestanaPaciente().getAttribute('aria-expanded')).toBe('true');
    expect(rejilla.classList.contains('indicaciones--ficha-abierta')).toBe(true);

    const ficha = fichaPaciente();
    expect(ficha).not.toBeNull();
    expect(elemento<HTMLElement>('.ficha-titulo').textContent?.trim()).toBe(
      'Información del paciente',
    );
    expect(ficha?.textContent).toContain('EXP-0241');
    expect(ficha?.textContent).toContain('Juan Pérez');

    botonPestanaPaciente().click();
    await fixture.whenStable();

    expect(component.pacienteAbierto).toBe(false);
    expect(fichaPaciente()).toBeNull();
    expect(rejilla.classList.contains('indicaciones--ficha-abierta')).toBe(false);
  });

  it('pliega el cuerpo de la ficha del paciente sin ocultar el título', async () => {
    botonPestanaPaciente().click();
    await fixture.whenStable();

    botonPlegarFicha().click();
    await fixture.whenStable();

    expect(component.datosPacienteVisibles).toBe(false);
    expect(botonPlegarFicha().getAttribute('aria-expanded')).toBe('false');
    expect(elemento<HTMLElement>('.ficha-titulo').textContent?.trim()).toBe(
      'Información del paciente',
    );
    expect(elemento<HTMLElement>('.ficha-cuerpo').classList.contains('ficha-cuerpo--plegado')).toBe(
      true,
    );
  });

  it('reabre la ficha del paciente con los datos completos tras plegarla', async () => {
    botonPestanaPaciente().click();
    await fixture.whenStable();
    botonPlegarFicha().click();
    await fixture.whenStable();

    botonPestanaPaciente().click();
    await fixture.whenStable();
    botonPestanaPaciente().click();
    await fixture.whenStable();

    expect(component.datosPacienteVisibles).toBe(true);
    expect(elemento<HTMLElement>('.ficha-cuerpo').classList.contains('ficha-cuerpo--plegado')).toBe(
      false,
    );
  });

  it('mantiene la ficha del paciente abierta al cambiar de sección', async () => {
    botonPestanaPaciente().click();
    await fixture.whenStable();

    await irASeccion('Cuidados');

    // La ficha es común a las tres secciones del rail: el cambio de sección no la repliega
    expect(component.seccionActiva).toBe('cuidados');
    expect(component.pacienteAbierto).toBe(true);
    expect(fichaPaciente()).not.toBeNull();
  });

  it('muestra en el rail solo el título de cada sección, con su icono alineado', () => {
    const titulos = elementos<HTMLElement>('.panel-secciones .tarjeta_titulo');

    // Las tarjetas del rail ya no llevan descripción: el icono queda alineado con el título
    expect(elemento('.panel-secciones .tarjeta_descripcion')).toBeNull();
    expect([...titulos].map((titulo) => titulo.textContent?.trim())).toEqual([
      'Medicamentos',
      'Exámenes',
      'Cuidados',
    ]);
    expect(elementos<HTMLElement>('.panel-secciones .tarjeta_icono i').length).toBe(3);
  });
});
