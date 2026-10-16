import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PopUps } from '../../../shared/popUps/popUpsService';
import { Evolucion } from './evolucion';

describe('Evolucion', () => {
  let component: Evolucion;
  let fixture: ComponentFixture<Evolucion>;

  // El popup global se simula: la eliminación solo necesita saber si el usuario confirmó
  const popUps = {
    confirmarToast: vi.fn(),
  };

  beforeEach(async () => {
    vi.resetAllMocks();
    popUps.confirmarToast.mockResolvedValue(true);

    await TestBed.configureTestingModule({
      imports: [Evolucion],
      providers: [{ provide: PopUps, useValue: popUps }],
    }).compileComponents();

    fixture = TestBed.createComponent(Evolucion);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  const elementos = <T extends Element>(selector: string): NodeListOf<T> =>
    fixture.nativeElement.querySelectorAll(selector);

  const elemento = <T extends Element>(selector: string): T =>
    fixture.nativeElement.querySelector(selector);

  // Selectores semánticos: los botones y la fila de acciones usan las clases globales de
  // src/styles/botonesStyle.scss
  const botonGuardar = (): HTMLButtonElement =>
    elemento<HTMLButtonElement>('.evolucion-acciones button[type="submit"]');

  const botonCancelar = (): HTMLButtonElement =>
    elemento<HTMLButtonElement>('.evolucion-acciones button._cancelar');

  const campos = (): NodeListOf<HTMLTextAreaElement> =>
    elementos<HTMLTextAreaElement>('.evolucion-campo');

  const tarjetas = (): NodeListOf<HTMLElement> => elementos<HTMLElement>('.evolucion-card');

  const disparadoresMenu = (): NodeListOf<HTMLButtonElement> =>
    elementos<HTMLButtonElement>('.evolucion-menu-trigger');

  const botonEditarDelMenu = (): HTMLButtonElement =>
    elemento<HTMLButtonElement>('.evolucion-menu .iconEditar');

  const botonEliminarDelMenu = (): HTMLButtonElement =>
    elemento<HTMLButtonElement>('.evolucion-menu .iconQuitar');

  // Filtros del historial: las evoluciones vigentes y las dadas de baja
  const filtrosHistorial = (): NodeListOf<HTMLButtonElement> =>
    elementos<HTMLButtonElement>('.historial-filtro');

  const filtroActivo = (): HTMLButtonElement =>
    elemento<HTMLButtonElement>('.historial-filtro--activo');

  const elegirFiltro = async (etiqueta: string): Promise<void> => {
    const boton = [...filtrosHistorial()].find((filtro) => filtro.textContent?.trim() === etiqueta);

    expect(boton).toBeDefined();
    boton?.click();
    await fixture.whenStable();
  };

  const escribir = async (selector: string, valor: string): Promise<void> => {
    const control = elemento<HTMLTextAreaElement>(selector);
    control.value = valor;
    control.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  };

  // Despliega el menú de opciones de la tarjeta ubicada en la posición indicada del historial
  const abrirMenu = async (indice: number): Promise<void> => {
    disparadoresMenu()[indice].click();
    await fixture.whenStable();
  };

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('ubica el registro y el historial en los dos paneles del módulo', () => {
    const registro = elemento<HTMLElement>('.panel-registro');
    const historial = elemento<HTMLElement>('.panel-historial');

    expect(elemento<HTMLElement>('.evolucion')).not.toBeNull();
    expect(registro.classList.contains('panel')).toBe(true);
    expect(historial.classList.contains('panel')).toBe(true);
    expect(registro.querySelector<HTMLElement>('.panel-titulo')?.textContent).toContain(
      'Registrar evolución',
    );
    expect(historial.querySelector<HTMLElement>('.panel-titulo')?.textContent).toContain(
      'Historial de evoluciones',
    );
    // El historial ya no muestra la insignia con la cantidad de registros
    expect(elemento('.historial-badge')).toBeNull();
    expect(elemento('.historial-encabezado')).toBeNull();
  });

  it('mantiene el registro antes que el historial', () => {
    const registro = elemento<HTMLElement>('.panel-registro');
    const historial = elemento<HTMLElement>('.panel-historial');

    expect(
      registro.compareDocumentPosition(historial) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('pide la evolución clínica y el plan médico en cuadros de texto con su límite de caracteres', () => {
    expect(campos().length).toBe(2);
    expect(elementos<HTMLLabelElement>('.evolucion-etiqueta').length).toBe(2);
    expect(campos()[0].id).toBe('evolucionClinica');
    expect(campos()[1].id).toBe('planMedico');
    expect(campos()[0].maxLength).toBe(component.maxCaracteres);
    expect(campos()[1].maxLength).toBe(component.maxCaracteres);
  });

  it('mantiene el guardado inhabilitado hasta capturar la evolución y el plan', async () => {
    expect(botonGuardar().type).toBe('submit');
    expect(botonGuardar().classList.contains('_guardar')).toBe(true);
    expect(botonGuardar().disabled).toBe(true);

    await escribir('#evolucionClinica', 'Paciente con mejoría clínica.');

    expect(component.puedeGuardar).toBe(false);
    expect(botonGuardar().disabled).toBe(true);

    await escribir('#planMedico', 'Continuar con el esquema indicado.');

    expect(component.puedeGuardar).toBe(true);
    expect(botonGuardar().disabled).toBe(false);
  });

  it('ofrece cancelar y guardar la evolución con botones del tamaño normal', () => {
    const acciones = elemento<HTMLElement>('.evolucion-acciones');

    expect(acciones.classList.contains('acciones-formulario')).toBe(true);
    expect(acciones.querySelectorAll('button.btn').length).toBe(2);
    // Mismo orden que en los demás formularios del módulo: cancelar antes de guardar
    expect(acciones.querySelectorAll('button.btn')[0]).toBe(botonCancelar());
    expect(botonCancelar().type).toBe('button');
    expect(botonCancelar().classList.contains('_cancelar')).toBe(true);
    expect(botonCancelar().textContent?.trim()).toBe('Cancelar');
    expect(botonGuardar().textContent?.trim()).toBe('Guardar evolución');
  });

  it('descarta lo capturado al cancelar y deja el registro vacío', async () => {
    await escribir('#evolucionClinica', 'Paciente con dolor abdominal en descenso.');
    await escribir('#planMedico', 'Mantener analgesia y control de signos vitales.');

    expect(component.puedeGuardar).toBe(true);

    botonCancelar().click();
    await fixture.whenStable();

    expect(component.evolucionClinica).toBe('');
    expect(component.planMedico).toBe('');
    expect(campos()[0].value).toBe('');
    expect(campos()[1].value).toBe('');
    expect(botonGuardar().disabled).toBe(true);
  });

  it('abre el historial con el filtro Activas y sus dos opciones de filtrado', () => {
    expect([...filtrosHistorial()].map((filtro) => filtro.textContent?.trim())).toEqual([
      'Activas',
      'Eliminadas',
    ]);
    expect(component.filtroEvolucion).toBe('activas');
    expect(filtroActivo().textContent?.trim()).toBe('Activas');
    expect(filtroActivo().getAttribute('aria-pressed')).toBe('true');
    expect(elementos<HTMLElement>('.historial-filtro[aria-pressed="true"]').length).toBe(1);

    // El MOCK guarda una evolución eliminada que no se lista entre las vigentes
    expect(tarjetas().length).toBe(component.evolucionesFiltradas.length);
    expect(tarjetas().length).toBe(2);
  });

  it('muestra solo las evoluciones del estado elegido', async () => {
    await elegirFiltro('Eliminadas');

    expect(component.filtroEvolucion).toBe('eliminadas');
    expect(filtroActivo().textContent?.trim()).toBe('Eliminadas');
    expect(tarjetas().length).toBe(1);
    expect(tarjetas()[0].textContent).toContain('Paciente ingresa con dolor abdominal');
    // La tarjeta de una evolución dada de baja lleva su acento gris
    expect(tarjetas()[0].classList.contains('evolucion-card--eliminada')).toBe(true);

    await elegirFiltro('Activas');

    expect(tarjetas().length).toBe(2);
    expect(elemento('.evolucion-card--eliminada')).toBeNull();
  });

  it('lista cada evolución como una tarjeta del historial con su acento de color', () => {
    expect(tarjetas().length).toBe(component.evolucionesFiltradas.length);
    expect(disparadoresMenu().length).toBe(component.evolucionesFiltradas.length);
    // El botón de editar solo vive dentro del menú, no suelto en la tarjeta
    expect(elementos<HTMLButtonElement>('.evolucion-card button.iconEditar').length).toBe(0);
    expect(elemento('.evolucion-menu')).toBeNull();

    component.evolucionesFiltradas.forEach((evolucion, indice) => {
      const tarjeta = tarjetas()[indice];

      expect(tarjeta.classList.contains(`evolucion-card--${evolucion.tono}`)).toBe(true);
      expect(tarjeta.querySelector<HTMLElement>('.evolucion-fecha')?.textContent).toContain(
        `${evolucion.fecha} · ${evolucion.hora}`,
      );
      expect(tarjeta.querySelector<HTMLElement>('.evolucion-medico')?.textContent).toContain(
        evolucion.medico,
      );
      // El médico y su fecha con hora comparten la misma línea de la cabecera
      const datos = tarjeta.querySelector<HTMLElement>('.evolucion-datos');

      expect(datos?.querySelector('.evolucion-medico')).not.toBeNull();
      expect(datos?.querySelector('.evolucion-fecha')).not.toBeNull();
      expect(
        tarjeta
          .querySelector<HTMLElement>('.evolucion-menu-trigger i')
          ?.classList.contains('bi-three-dots-vertical'),
      ).toBe(true);
    });
  });

  it('muestra en cada tarjeta la evolución clínica y el plan médico con su rótulo', () => {
    component.evolucionesFiltradas.forEach((evolucion, indice) => {
      const tarjeta = tarjetas()[indice];
      const rotulos = tarjeta.querySelectorAll<HTMLElement>('.evolucion-detalle-etiqueta');

      expect(rotulos.length).toBe(2);
      expect(rotulos[0].textContent?.trim()).toBe('Evolución clínica');
      expect(rotulos[1].textContent?.trim()).toBe('Plan médico');
      expect(tarjeta.querySelector<HTMLElement>('.evolucion-clinica')?.textContent).toContain(
        evolucion.evolucionClinica,
      );
      expect(tarjeta.querySelector<HTMLElement>('.evolucion-plan')?.textContent).toContain(
        evolucion.planMedico,
      );
    });
  });

  it('no ofrece el ojo de ver ni el enlace de la evolución completa en las tarjetas', () => {
    expect(elemento('.evolucion-card .bi-eye')).toBeNull();
    expect(elemento('.evolucion-card .historial-enlace')).toBeNull();
    expect(elemento('.historial-punto')).toBeNull();
    expect(tarjetas()[0].textContent).not.toContain('Ver evolución completa');
  });

  it('despliega el menú de opciones de la tarjeta pulsada y lo repliega al volver a pulsarla', async () => {
    await abrirMenu(0);

    expect(component.menuEvolucionAbierta).toBe(component.evoluciones[0].id);
    expect(tarjetas()[0].querySelector('.evolucion-menu')).not.toBeNull();
    expect(tarjetas()[0].classList.contains('evolucion-card--menu-abierto')).toBe(true);
    expect(disparadoresMenu()[0].getAttribute('aria-expanded')).toBe('true');
    expect(elementos('.evolucion-menu').length).toBe(1);
    // El menú ofrece editar y eliminar la evolución
    expect(elemento<HTMLElement>('.evolucion-menu').textContent).toContain('Editar');
    expect(elemento<HTMLElement>('.evolucion-menu').textContent).toContain('Eliminar');

    await abrirMenu(0);

    expect(component.menuEvolucionAbierta).toBeNull();
    expect(elemento('.evolucion-menu')).toBeNull();
    expect(disparadoresMenu()[0].getAttribute('aria-expanded')).toBe('false');
  });

  it('mantiene un solo menú abierto a la vez', async () => {
    await abrirMenu(0);
    await abrirMenu(1);

    expect(component.menuEvolucionAbierta).toBe(component.evoluciones[1].id);
    expect(elementos('.evolucion-menu').length).toBe(1);
    expect(tarjetas()[1].querySelector('.evolucion-menu')).not.toBeNull();
  });

  it('cierra el menú al pulsar fuera de la tarjeta que lo tiene abierto', async () => {
    await abrirMenu(0);

    // El panel del historial no está dentro de ninguna tarjeta
    elemento<HTMLElement>('.panel-historial').dispatchEvent(new Event('click', { bubbles: true }));
    await fixture.whenStable();

    expect(component.menuEvolucionAbierta).toBeNull();
    expect(elemento('.evolucion-menu')).toBeNull();
  });

  it('mantiene el menú abierto al pulsar dentro de la misma tarjeta', async () => {
    await abrirMenu(0);

    tarjetas()[0]
      .querySelector('.evolucion-medico')
      ?.dispatchEvent(new Event('click', { bubbles: true }));
    await fixture.whenStable();

    expect(component.menuEvolucionAbierta).toBe(component.evoluciones[0].id);
    expect(elementos('.evolucion-menu').length).toBe(1);
  });

  it('carga en el registro la evolución elegida al editar', async () => {
    const elegida = component.evoluciones[1];

    await abrirMenu(1);
    botonEditarDelMenu().click();
    await fixture.whenStable();

    expect(component.evolucionEnEdicion).toBe(elegida.id);
    expect(component.evolucionClinica).toBe(elegida.evolucionClinica);
    expect(component.planMedico).toBe(elegida.planMedico);
    expect(campos()[0].value).toBe(elegida.evolucionClinica);
    expect(campos()[1].value).toBe(elegida.planMedico);
    expect(tarjetas()[1].classList.contains('evolucion-card--edicion')).toBe(true);
    // El menú se cierra al elegir la opción
    expect(elemento('.evolucion-menu')).toBeNull();
  });

  it('guarda los cambios sobre la misma tarjeta y conserva fecha, hora, médico y color', async () => {
    const elegida = component.evoluciones[1];
    const total = component.evoluciones.length;

    await abrirMenu(1);
    botonEditarDelMenu().click();
    await fixture.whenStable();

    await escribir('#evolucionClinica', 'Paciente estable, sin dolor abdominal.');
    await escribir('#planMedico', 'Alta con control en consulta externa.');

    botonGuardar().click();
    await fixture.whenStable();

    expect(component.evoluciones.length).toBe(total);
    expect(tarjetas()[1].textContent).toContain('Paciente estable, sin dolor abdominal.');
    expect(tarjetas()[1].textContent).toContain(`${elegida.fecha} · ${elegida.hora}`);
    expect(tarjetas()[1].textContent).toContain(elegida.medico);
    expect(tarjetas()[1].classList.contains(`evolucion-card--${elegida.tono}`)).toBe(true);

    // El registro queda libre y ninguna tarjeta sigue marcada como edición
    expect(component.evolucionEnEdicion).toBeNull();
    expect(component.evolucionClinica).toBe('');
    expect(elemento('.evolucion-card--edicion')).toBeNull();
  });

  it('vuelve a agregar al inicio del historial después de cancelar la edición', async () => {
    await abrirMenu(0);
    botonEditarDelMenu().click();
    await fixture.whenStable();

    expect(component.evolucionEnEdicion).toBe(component.evoluciones[0].id);

    botonCancelar().click();
    await fixture.whenStable();

    expect(component.evolucionEnEdicion).toBeNull();
    expect(elemento('.evolucion-card--edicion')).toBeNull();

    const total = component.evoluciones.length;

    await escribir('#evolucionClinica', 'Nueva evolución de control.');
    await escribir('#planMedico', 'Continuar con el plan indicado.');

    botonGuardar().click();
    await fixture.whenStable();

    expect(component.evoluciones.length).toBe(total + 1);
    expect(tarjetas()[0].textContent).toContain('Nueva evolución de control.');
  });

  it('da de baja la evolución confirmada en el popup y la deja entre las eliminadas', async () => {
    const eliminada = component.evoluciones[0];
    const restante = component.evoluciones[1];
    const total = component.evoluciones.length;
    const vigentes = component.evolucionesFiltradas.length;

    await abrirMenu(0);
    botonEliminarDelMenu().click();
    await fixture.whenStable();

    expect(popUps.confirmarToast).toHaveBeenCalledWith(expect.stringContaining(eliminada.fecha));
    expect(component.menuEvolucionAbierta).toBeNull();
    // La baja es lógica: el registro no se borra del historial
    expect(component.evoluciones.length).toBe(total);
    expect(component.evoluciones.find((registrada) => registrada.id === eliminada.id)?.estado).toBe(
      'eliminada',
    );
    expect(tarjetas().length).toBe(vigentes - 1);
    expect(tarjetas()[0].textContent).toContain(restante.medico);

    await elegirFiltro('Eliminadas');

    expect(tarjetas().length).toBe(2);
    expect(tarjetas()[0].textContent).toContain(eliminada.evolucionClinica);
    expect(tarjetas()[0].classList.contains('evolucion-card--eliminada')).toBe(true);
  });

  it('conserva la evolución si la confirmación se cancela', async () => {
    popUps.confirmarToast.mockResolvedValue(false);
    const vigentes = component.evolucionesFiltradas.length;

    await abrirMenu(0);
    botonEliminarDelMenu().click();
    await fixture.whenStable();

    expect(component.evolucionesFiltradas.length).toBe(vigentes);
    expect(tarjetas().length).toBe(vigentes);
    expect(component.evolucionesFiltradas.every((evolucion) => evolucion.estado === 'activa')).toBe(
      true,
    );
  });

  it('libera el registro cuando se elimina la evolución que estaba en edición', async () => {
    const elegida = component.evoluciones[1];
    const vigentes = component.evolucionesFiltradas.length;

    await abrirMenu(1);
    botonEditarDelMenu().click();
    await fixture.whenStable();

    expect(component.evolucionEnEdicion).toBe(elegida.id);

    await abrirMenu(1);
    botonEliminarDelMenu().click();
    await fixture.whenStable();

    expect(component.evolucionEnEdicion).toBeNull();
    expect(component.evolucionClinica).toBe('');
    expect(component.planMedico).toBe('');
    // La evolución dada de baja sale del listado de activas
    expect(tarjetas().length).toBe(vigentes - 1);
    expect(tarjetas()[0].textContent).toContain(component.evoluciones[0].medico);
  });

  it('guarda la evolución escrita al inicio del historial y limpia el formulario', async () => {
    const total = component.evoluciones.length;
    const vigentes = component.evolucionesFiltradas.length;
    // La evolución registrada antes de guardar pasa a ser la segunda tarjeta del historial
    const anterior = component.evolucionesFiltradas[0].evolucionClinica;

    await escribir('#evolucionClinica', 'Sin fiebre y con tolerancia a la vía oral.');
    await escribir('#planMedico', 'Alta con control en consulta externa.');

    botonGuardar().click();
    await fixture.whenStable();

    expect(component.evoluciones.length).toBe(total + 1);
    expect(component.evolucionesFiltradas.length).toBe(vigentes + 1);
    expect(tarjetas().length).toBe(vigentes + 1);
    expect(tarjetas()[0].textContent).toContain('Sin fiebre y con tolerancia a la vía oral.');
    expect(tarjetas()[1].textContent).toContain(anterior);

    // La captura queda limpia y el guardado vuelve a quedar inhabilitado
    expect(component.evolucionClinica).toBe('');
    expect(component.planMedico).toBe('');
    expect(campos()[0].value).toBe('');
    expect(campos()[1].value).toBe('');
    expect(botonGuardar().disabled).toBe(true);
  });

  it('asigna a la evolución nueva uno de los acentos de color de las tarjetas', async () => {
    await escribir('#evolucionClinica', 'Evolución de control.');
    await escribir('#planMedico', 'Plan de seguimiento.');

    botonGuardar().click();
    await fixture.whenStable();

    expect(['verde', 'azul', 'naranja', 'morado']).toContain(component.evoluciones[0].tono);
    expect(
      tarjetas()[0].classList.contains(`evolucion-card--${component.evoluciones[0].tono}`),
    ).toBe(true);
  });

  it('no registra la evolución cuando falta la evolución clínica o el plan médico', async () => {
    const total = component.evoluciones.length;

    await escribir('#evolucionClinica', '   ');
    await escribir('#planMedico', 'Continuar con el tratamiento.');

    botonGuardar().click();
    await fixture.whenStable();

    expect(component.evoluciones.length).toBe(total);

    // El envío del formulario vacío tampoco registra nada
    component.limpiarFormulario();
    component.guardarEvolucion();
    await fixture.whenStable();

    expect(component.evoluciones.length).toBe(total);
  });

  it('avisa cuando el paciente aún no tiene evoluciones registradas', async () => {
    component.evoluciones = [];
    fixture.detectChanges();
    await fixture.whenStable();

    expect(tarjetas().length).toBe(0);
    expect(elemento('.evolucion-card')).toBeNull();
    expect(elementos<HTMLButtonElement>('.evolucion-menu-trigger').length).toBe(0);
    expect(elemento<HTMLElement>('.historial-vacio').textContent).toContain(
      'Aún no hay evoluciones registradas',
    );
  });

  it('avisa cuando el filtro de eliminadas no tiene evoluciones', async () => {
    // Sin evoluciones dadas de baja el listado queda vacío con su propio aviso
    component.evoluciones = component.evoluciones.filter(
      (evolucion) => evolucion.estado === 'activa',
    );

    await elegirFiltro('Eliminadas');

    expect(tarjetas().length).toBe(0);
    expect(elemento<HTMLElement>('.historial-vacio').textContent).toContain(
      'No hay evoluciones eliminadas',
    );
  });

  it('libera la edición cuando el filtro elegido deja fuera la evolución cargada', async () => {
    await abrirMenu(1);
    botonEditarDelMenu().click();
    await fixture.whenStable();

    expect(component.evolucionEnEdicion).toBe(component.evoluciones[1].id);

    await elegirFiltro('Eliminadas');

    expect(filtroActivo().textContent?.trim()).toBe('Eliminadas');
    expect(component.evolucionEnEdicion).toBeNull();
    expect(component.evolucionClinica).toBe('');
    expect(component.planMedico).toBe('');
    expect(elemento('.evolucion-card--edicion')).toBeNull();
    expect(botonGuardar().disabled).toBe(true);
  });

  it('vuelve a las activas al guardar para dejar a la vista la evolución registrada', async () => {
    await elegirFiltro('Eliminadas');

    await escribir('#evolucionClinica', 'Evolución registrada desde el filtro de eliminadas.');
    await escribir('#planMedico', 'Continuar con el plan indicado.');

    botonGuardar().click();
    await fixture.whenStable();

    expect(component.filtroEvolucion).toBe('activas');
    expect(filtroActivo().textContent?.trim()).toBe('Activas');
    expect(tarjetas()[0].textContent).toContain(
      'Evolución registrada desde el filtro de eliminadas.',
    );
  });
});
