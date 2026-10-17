import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { Subject } from 'rxjs';

import { Atencion } from './atencion';
import { PacienteService } from '../../Pacientes/paciente/data/paciente-service';
import { PacienteResumido } from '../../Pacientes/paciente/data/pacienteInterfaz';

describe('Atencion', () => {
  let component: Atencion;
  let fixture: ComponentFixture<Atencion>;
  let respuesta: Subject<PacienteResumido[]>;

  const pacientes: PacienteResumido[] = [
    {
      codigoExpediente: 'EXP-001',
      nombreCompleto: 'Juan Pérez',
      telefono: '70000001',
      tipoTratamiento: 'HOSPITALIZACION',
      estado: true,
    },
    {
      codigoExpediente: 'EXP-002',
      nombreCompleto: 'María López',
      telefono: '70000002',
      tipoTratamiento: 'EMERGENCIA',
      estado: true,
    },
    {
      codigoExpediente: 'EXP-003',
      nombreCompleto: 'Carlos Méndez',
      telefono: '70000003',
      tipoTratamiento: 'HOSPITALIZACION',
      estado: true,
    },
    {
      codigoExpediente: 'EXP-004',
      nombreCompleto: 'Ana Rodríguez',
      telefono: '70000004',
      tipoTratamiento: 'EMERGENCIA',
      estado: true,
    },
  ];

  const servicio = { listarPacientes: vi.fn() };

  beforeEach(async () => {
    vi.resetAllMocks();
    respuesta = new Subject<PacienteResumido[]>();
    servicio.listarPacientes.mockReturnValue(respuesta.asObservable());

    await TestBed.configureTestingModule({
      imports: [Atencion],
      providers: [{ provide: PacienteService, useValue: servicio }, provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(Atencion);
    component = fixture.componentInstance;
  });

  /** Carga el listado con la respuesta del backend y espera a que la pantalla quede estable. */
  const render = async (): Promise<void> => {
    fixture.detectChanges();
    respuesta.next(pacientes);
    respuesta.complete();
    fixture.detectChanges();
    await fixture.whenStable();
  };

  const tarjetas = (): HTMLElement[] =>
    Array.from(fixture.nativeElement.querySelectorAll('.paciente-card'));

  const elemento = <T extends Element>(selector: string): T =>
    fixture.nativeElement.querySelector(selector);

  const elementos = <T extends Element>(selector: string): NodeListOf<T> =>
    fixture.nativeElement.querySelectorAll(selector);

  /** Hojas de estilo del componente tal como se inyectan en el documento durante las pruebas. */
  const estilos = (): string =>
    Array.from(document.querySelectorAll('style'))
      .map((hoja) => hoja.textContent ?? '')
      .join('\n')
      .replace(/\s+/g, '');

  /** Declaraciones de una regla del componente, sin espacios, para comprobar sus valores. */
  const regla = (selector: string): string => {
    const hoja = estilos();
    const inicio = hoja.indexOf(selector);

    return inicio < 0 ? '' : hoja.slice(inicio, hoja.indexOf('}', inicio));
  };

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('muestra el aviso de carga mientras espera la respuesta', () => {
    fixture.detectChanges();

    expect(component.cargando).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Cargando pacientes');
  });

  it('selecciona el primer paciente de la lista y muestra su información', async () => {
    await render();

    expect(component.pacienteSeleccionado?.nombre).toBe('Juan Pérez');
    expect(component.pacienteSeleccionado?.expediente).toBe('EXP-001');

    const pantalla: string = fixture.nativeElement.textContent;
    expect(pantalla).toContain('Juan Pérez');
    expect(pantalla).toContain('Gastroenteritis aguda');
    expect(pantalla).toContain('Cama A-105');
    expect(pantalla).toContain('Últimos signos vitales');
  });

  it('lista los pacientes recibidos y titula los filtros sin contadores', async () => {
    await render();

    expect(tarjetas().length).toBe(4);

    // Los botones de filtro no repiten el número de pacientes de cada grupo
    const etiquetas = Array.from(elementos<HTMLElement>('.chip')).map((chip) =>
      (chip.textContent ?? '').trim(),
    );
    expect(etiquetas).toEqual(['Todos', 'Emergencia', 'Hospitalización']);
  });

  it('filtra los pacientes por tipo de atención', async () => {
    await render();

    const chips = Array.from(fixture.nativeElement.querySelectorAll('.chip')) as HTMLElement[];
    chips[1].click();
    fixture.detectChanges();

    expect(component.filtroActivo).toBe('emergencia');
    expect(tarjetas().length).toBe(2);
    expect(fixture.nativeElement.textContent).toContain('María López');
    expect(fixture.nativeElement.textContent).not.toContain('Juan Pérez');
  });

  it('cambia el paciente del panel al elegir otra tarjeta', async () => {
    await render();

    tarjetas()[1].click();
    fixture.detectChanges();

    expect(component.pacienteSeleccionado?.nombre).toBe('María López');
    // La emergencia no muestra destino: ni box en la tarjeta ni dato de cama en el detalle
    expect(fixture.nativeElement.textContent).not.toContain('Box');
    expect(elementos<HTMLElement>('.paciente-ubicacion').length).toBe(2);
    expect(elementos<HTMLElement>('.seleccionado-datos .dato').length).toBe(2);
  });

  it('busca pacientes por el nombre escrito en el buscador', async () => {
    await render();

    const buscador = fixture.nativeElement.querySelector('.inputB') as HTMLInputElement;
    buscador.value = 'carlos';
    buscador.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(tarjetas().length).toBe(1);
    expect(component.pacienteSeleccionado?.nombre).toBe('Carlos Méndez');
  });

  it('abre el episodio del paciente en la evaluación clínica', async () => {
    await render();

    const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    component.abrirEpisodio();

    expect(navegar).toHaveBeenCalledWith(['/medica', 'evaluacion']);
  });

  // La pantalla sigue la referencia de diseño: los pacientes se reparten en una matriz de tarjetas
  // cuadradas y el detalle del paciente se lee en bloques de color y columnas de datos.
  it('coloca las tarjetas en una matriz de tarjetas cuadradas', async () => {
    await render();

    const lista = elemento<HTMLElement>('.pacientes-lista');
    expect(getComputedStyle(lista).display).toBe('grid');
    expect(getComputedStyle(lista).gridTemplateColumns).toContain('auto-fill');
    expect(getComputedStyle(lista).overflowY).toBe('auto');

    // Las tarjetas comparten la relación de aspecto cuadrada dentro de la matriz: cada tarjeta es una
    // celda de la rejilla y el componente declara esa relación de aspecto (jsdom no la calcula)
    const dibujadas = tarjetas();
    expect(dibujadas.length).toBe(4);
    dibujadas.forEach((tarjeta) => expect(tarjeta.parentElement).toBe(lista));

    // Cuadradas de verdad: el alto sigue al ancho de la columna y no al de la fila
    expect(estilos()).toContain('aspect-ratio:1/1');
    expect(estilos()).toContain('align-self:start');

    // Cuadradas: el ancho de la columna fija el lado, el tope evita que crezca de más y el contenido no
    // la estira, así que la cuadrícula no deja huecos muertos
    expect(estilos()).toContain('grid-template-columns:repeat(auto-fill,minmax(220px,1fr))');
    expect(regla('.paciente-card[')).toContain('max-width:248px');
    expect(regla('.paciente-card[')).toContain('min-height:0');
    expect(regla('.paciente-card[')).toContain('justify-content:space-between');
  });

  it('acentúa la tarjeta según el tipo de atención y el estado del paciente', async () => {
    await render();

    const dibujadas = tarjetas();

    // El primer paciente queda seleccionado por defecto y conserva el acento de la hospitalización
    expect(dibujadas[0].classList.contains('paciente-card--activa')).toBe(true);
    expect(dibujadas[0].getAttribute('aria-pressed')).toBe('true');

    // La emergencia y la atención pendiente se distinguen por el acento y por su etiqueta
    expect(getComputedStyle(dibujadas[1]).borderLeftColor).toBe('rgb(239, 68, 68)');
    expect(
      getComputedStyle(elemento<HTMLElement>('.paciente-card--emergencia .paciente-tipo')).color,
    ).toBe('rgb(220, 38, 38)');
    expect(getComputedStyle(dibujadas[2]).borderLeftColor).toBe('rgb(245, 158, 11)');

    // El estado no se repite con una etiqueta: en la tarjeta lo dice el acento del borde
    expect(dibujadas[2].classList.contains('paciente-card--pendiente')).toBe(true);
    expect(elementos<HTMLElement>('.atencion-estado').length).toBe(0);
  });

  it('muestra en cada tarjeta el nombre, sus datos, el destino y el diagnóstico principal', async () => {
    await render();

    const tarjeta = tarjetas()[0];
    expect(tarjeta.querySelector('.paciente-nombre')?.textContent).toContain('Juan Pérez');
    expect(tarjeta.querySelector('.paciente-meta')?.textContent).toContain(
      'EXP-001 | 45 años | Masculino',
    );
    expect(tarjeta.querySelector('.paciente-tipo')?.textContent).toContain('Hospitalización');
    expect(tarjeta.querySelector('.paciente-ubicacion')?.textContent).toContain('Cama A-105');

    // El diagnóstico principal cierra la tarjeta, separado del resto por una línea
    const diagnostico = elemento<HTMLElement>('.paciente-card .paciente-diagnostico');
    expect(diagnostico.querySelector('.diagnostico-rotulo')?.textContent).toContain(
      'Diagnóstico principal',
    );
    expect(diagnostico.querySelector('.diagnostico-valor')?.textContent).toContain(
      'Gastroenteritis aguda',
    );
    // El pie va pegado al contenido: sin margen automático no queda un hueco muerto en el centro
    expect(getComputedStyle(diagnostico).marginTop).not.toBe('auto');
    expect(getComputedStyle(diagnostico).borderTopWidth).toBe('1px');
  });

  it('muestra la cama solo en las atenciones con hospitalización', async () => {
    await render();

    const dibujadas = tarjetas();

    // Hospitalización: la cama acompaña al tipo de atención
    expect(dibujadas[0].querySelector('.paciente-ubicacion')?.textContent).toContain('Cama A-105');

    // Emergencia: ni box en la tarjeta ni dato de cama en el detalle
    expect(dibujadas[1].querySelector('.paciente-ubicacion')).toBeNull();
    expect(elementos<HTMLElement>('.seleccionado-datos .dato').length).toBe(3);

    dibujadas[1].click();
    fixture.detectChanges();

    expect(elementos<HTMLElement>('.seleccionado-datos .dato').length).toBe(2);
    expect(elemento<HTMLElement>('.seleccionado-datos').textContent).not.toContain('Cama');
    expect(elementos<HTMLElement>('.paciente-ubicacion').length).toBe(2);
  });

  it('pinta los botones de filtro con el azul secundario del módulo', async () => {
    await render();

    // El filtro activo va relleno y el resto se lee en ese mismo azul secundario
    const activo = regla('.chip.activo');
    expect(activo).toContain('background:var(--azulSecundario)');
    expect(activo).toContain('color:#fff');

    const base = regla('.chip[');
    expect(base).toContain('border:1pxsolidvar(--azulSecundario)');
    expect(base).toContain('color:var(--azulSecundario)');
  });

  it('presenta el detalle del paciente en bloques y con los datos en columnas', async () => {
    await render();

    // La identificación del paciente va en un bloque destacado con su nombre y su expediente
    const cabecera = elemento<HTMLElement>('.seleccionado-cabecera');
    expect(getComputedStyle(cabecera).backgroundColor).toBe('rgb(238, 245, 255)');
    expect(cabecera.querySelector('.seleccionado-nombre')?.textContent).toContain('Juan Pérez');
    expect(cabecera.querySelector('.atencion-estado')).toBeNull();
    expect(cabecera.querySelector('.seleccionado-meta')?.textContent).toContain(
      'EXP-001 | 45 años | Masculino',
    );

    // Los datos de la atención van en una rejilla de columnas que se ajusta al número de datos, con el
    // rótulo sobre el valor
    const datos = elemento<HTMLElement>('.seleccionado-datos');
    expect(getComputedStyle(datos).display).toBe('grid');
    expect(estilos()).toContain('grid-template-columns:repeat(auto-fit,minmax(96px,1fr))');
    expect(elementos<HTMLElement>('.dato').length).toBe(3);
    expect(getComputedStyle(elemento<HTMLElement>('.dato')).flexDirection).toBe('column');

    // Los cuatro signos vitales comparten un recuadro, con la unidad bajo el valor
    const vitales = elemento<HTMLElement>('.seleccionado-vitales');
    expect(getComputedStyle(vitales).gridTemplateColumns).toContain('repeat(4');
    expect(vitales.querySelectorAll('.vital').length).toBe(4);
    expect(getComputedStyle(elemento<HTMLElement>('.vital-unidad')).display).toBe('block');

    // El diagnóstico y la alergia se distinguen por el color de su bloque
    expect(
      getComputedStyle(elemento<HTMLElement>('.seleccionado-diagnostico')).backgroundColor,
    ).toBe('rgb(238, 245, 255)');
    expect(getComputedStyle(elemento<HTMLElement>('.seleccionado-alergias')).backgroundColor).toBe(
      'rgba(34, 197, 94, 0.14)',
    );

    // Los encabezados de cada bloque se separan del contenido con una línea
    expect(
      getComputedStyle(elemento<HTMLElement>('.seleccionado-subtitulo')).borderBottomWidth,
    ).toBe('1px');
    expect(elemento<HTMLElement>('#tituloSeleccionado').textContent).toContain(
      'Información del paciente seleccionado',
    );
  });

  it('deja las acciones del paciente a lo ancho del panel, con la flecha al final', async () => {
    await render();

    expect(getComputedStyle(elemento<HTMLElement>('.seleccionado-acciones')).flexDirection).toBe(
      'column',
    );

    const principal = elemento<HTMLButtonElement>('.seleccionado-acciones ._principal');
    expect(principal.textContent).toContain('Abrir episodio');
    expect(getComputedStyle(principal).width).toBe('100%');
    expect(getComputedStyle(principal).height).toBe('46px');

    const flecha = principal.querySelector('i') as HTMLElement;
    expect(flecha.classList.contains('bi-arrow-right')).toBe(true);
    expect(getComputedStyle(flecha).position).toBe('absolute');
    expect(getComputedStyle(flecha).right).toBe('16px');

    // El expediente queda como segunda acción del panel
    expect(elemento<HTMLButtonElement>('.seleccionado-acciones ._cancelar').textContent).toContain(
      'Abrir expediente',
    );
  });

  it('avisa del fallo y ofrece reintentar sin dejar la pantalla vacía', async () => {
    const registrado = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const fallo = new Subject<PacienteResumido[]>();
    servicio.listarPacientes.mockReturnValue(fallo.asObservable());

    fixture.detectChanges();
    fallo.error(new Error('fallo del servidor'));
    fixture.detectChanges();

    const pantalla: string = fixture.nativeElement.textContent;
    expect(component.errorCarga).toBe(true);
    expect(component.cargando).toBe(false);
    expect(pantalla).toContain('No se pudieron cargar los pacientes');
    expect(fixture.nativeElement.querySelector('.lista-aviso--error .btn')).not.toBeNull();
    expect(registrado).toHaveBeenCalled();
  });
});
