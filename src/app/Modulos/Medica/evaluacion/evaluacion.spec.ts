import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Evaluacion } from './evaluacion';

describe('Evaluacion', () => {
  let component: Evaluacion;
  let fixture: ComponentFixture<Evaluacion>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Evaluacion],
    }).compileComponents();

    fixture = TestBed.createComponent(Evaluacion);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  const elementos = <T extends Element>(selector: string): NodeListOf<T> =>
    fixture.nativeElement.querySelectorAll(selector);

  const elemento = <T extends Element>(selector: string): T =>
    fixture.nativeElement.querySelector(selector);

  // Selectores semánticos: los botones usan las clases globales de src/styles/botonesStyle.scss
  // y las tarjetas del panel de secciones las de src/styles/tarjetaStyle.scss
  const botonCancelar = (): HTMLButtonElement =>
    elemento<HTMLButtonElement>('.hallazgo-acciones button[type="button"]');

  const botonGuardar = (): HTMLButtonElement =>
    elemento<HTMLButtonElement>('.hallazgo-acciones button[type="submit"]');

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('ubica las acciones del hallazgo en la fila compartida y con los estilos globales', () => {
    const acciones = elemento<HTMLElement>('.hallazgo-acciones');

    expect(acciones.classList.contains('acciones-formulario')).toBe(true);
    expect(botonGuardar().classList.contains('_guardar')).toBe(true);
    expect(botonCancelar().classList.contains('_cancelar')).toBe(true);
  });

  it('muestra las tres secciones con la de examen físico activa', () => {
    const secciones = elementos<HTMLButtonElement>('.tarjeta');

    expect(secciones.length).toBe(3);
    expect(elementos<HTMLElement>('.tarjeta .tarjeta_icono i').length).toBe(3);
    expect(elemento<HTMLButtonElement>('.tarjeta--activa').textContent).toContain('Examen físico');
  });

  it('asigna a cada sección un icono acorde', () => {
    const iconos = elementos<HTMLElement>('.tarjeta .tarjeta_icono i');

    expect(iconos.length).toBe(3);
    expect(iconos[0].classList.contains('bi-journal-medical')).toBe(true);
    expect(iconos[1].classList.contains('bi-heart-pulse')).toBe(true);
    expect(iconos[2].classList.contains('bi-clipboard2-check')).toBe(true);
  });

  it('cambia de sección al pulsarla', async () => {
    elementos<HTMLButtonElement>('.tarjeta')[0].click();
    await fixture.whenStable();

    expect(component.seccionActiva).toBe('historia-clinica');
    expect(elemento<HTMLButtonElement>('.tarjeta--activa').textContent).toContain(
      'Historia clínica',
    );
    expect(elemento<HTMLButtonElement>('.tarjeta--activa').getAttribute('aria-pressed')).toBe(
      'true',
    );
  });

  it('muestra el panel de la sección activa en el área central', async () => {
    // La pantalla abre en el examen físico
    expect(elemento('.hallazgo-form')).not.toBeNull();
    expect(elemento('app-historia-clinica')).toBeNull();
    expect(elemento('app-diagnostico')).toBeNull();

    elementos<HTMLButtonElement>('.tarjeta')[0].click();
    await fixture.whenStable();

    expect(elemento('app-historia-clinica .historia-campo')).not.toBeNull();
    expect(elemento('.hallazgo-form')).toBeNull();

    elementos<HTMLButtonElement>('.tarjeta')[2].click();
    await fixture.whenStable();

    expect(elemento('app-diagnostico .diagnostico-form')).not.toBeNull();
    expect(elemento('app-historia-clinica')).toBeNull();

    elementos<HTMLButtonElement>('.tarjeta')[1].click();
    await fixture.whenStable();

    expect(elemento('.hallazgo-form')).not.toBeNull();
    expect(elemento('app-diagnostico')).toBeNull();
  });

  it('mantiene las secciones y los hallazgos fuera del panel que cambia', async () => {
    // El carril de secciones no vive dentro del área central que cambia de contenido
    expect(elementos<HTMLElement>('.panel-secciones .tarjeta').length).toBe(3);
    expect(elemento<HTMLElement>('.panel-hallazgos')?.closest('.panel-seccion')).toBeNull();

    elementos<HTMLButtonElement>('.tarjeta')[0].click();
    await fixture.whenStable();

    expect(elementos<HTMLElement>('.panel-secciones .tarjeta').length).toBe(3);
    expect(elemento('app-historia-clinica')?.closest('.panel-secciones')).toBeNull();
  });

  it('oculta los hallazgos registrados fuera del examen físico', async () => {
    // El examen físico es la única sección que registra hallazgos
    expect(component.mostrarHallazgos).toBe(true);
    expect(elemento<HTMLElement>('.panel-hallazgos')).not.toBeNull();

    elementos<HTMLButtonElement>('.tarjeta')[0].click();
    await fixture.whenStable();

    expect(component.mostrarHallazgos).toBe(false);
    expect(elemento('.panel-hallazgos')).toBeNull();
    expect(elemento('.hallazgo-card')).toBeNull();
    expect(elemento('.hallazgos-vacio')).toBeNull();
    expect(
      elemento<HTMLElement>('.evaluacion').classList.contains('evaluacion--sin-hallazgos'),
    ).toBe(true);

    elementos<HTMLButtonElement>('.tarjeta')[2].click();
    await fixture.whenStable();

    expect(elemento('.panel-hallazgos')).toBeNull();
    expect(elemento('.hallazgo-card--cargando')).toBeNull();

    elementos<HTMLButtonElement>('.tarjeta')[1].click();
    await fixture.whenStable();

    expect(elemento<HTMLElement>('.panel-hallazgos')).not.toBeNull();
    expect(
      elemento<HTMLElement>('.evaluacion').classList.contains('evaluacion--sin-hallazgos'),
    ).toBe(false);
  });

  it('muestra el bloque de datos del paciente en historia clínica y diagnóstico', async () => {
    // El examen físico usa la ficha plegable con su pestaña lateral
    expect(elemento('app-datos-paciente')).toBeNull();
    expect(elemento('.ficha-pestana')).not.toBeNull();

    elementos<HTMLButtonElement>('.tarjeta')[0].click();
    await fixture.whenStable();

    expect(elemento<HTMLElement>('app-datos-paciente .ficha')).not.toBeNull();
    expect(component.seccionConDatosPaciente).toBe(true);
    expect(component.pacienteAbierto).toBe(false);
    expect(
      elemento<HTMLElement>('.evaluacion').classList.contains('evaluacion--datos-paciente'),
    ).toBe(true);

    elementos<HTMLButtonElement>('.tarjeta')[2].click();
    await fixture.whenStable();

    expect(elemento<HTMLElement>('app-datos-paciente .ficha')).not.toBeNull();
  });

  it('vuelve a la ficha plegable al regresar al examen físico', async () => {
    elementos<HTMLButtonElement>('.tarjeta')[2].click();
    await fixture.whenStable();

    elementos<HTMLButtonElement>('.tarjeta')[1].click();
    await fixture.whenStable();

    expect(elemento('app-datos-paciente')).toBeNull();
    expect(elemento('.ficha-pestana')).not.toBeNull();
    expect(
      elemento<HTMLElement>('.evaluacion').classList.contains('evaluacion--datos-paciente'),
    ).toBe(false);
  });

  it('selecciona un único sistema del examen físico', async () => {
    const chips = elementos<HTMLButtonElement>('.sistema-chip');

    expect(chips.length).toBe(7);
    expect(chips[3].textContent?.trim()).toBe('Abdomen');
    expect(chips[3].getAttribute('aria-pressed')).toBe('true');

    chips[0].click();
    await fixture.whenStable();

    const activos = elementos<HTMLButtonElement>('.sistema-chip--activo');
    expect(component.sistemaSeleccionado).toBe('general');
    expect(activos.length).toBe(1);
    expect(activos[0].textContent?.trim()).toBe('General');
    expect(chips[3].getAttribute('aria-pressed')).toBe('false');
  });

  it('refleja el contador de caracteres y el límite de la captura', () => {
    const texto = 'Abdomen sin dolor a la palpación.';
    component.hallazgoActual = texto;
    fixture.detectChanges();

    const campo = elemento<HTMLTextAreaElement>('.hallazgo-campo');
    expect(elemento<HTMLElement>('.contador-caracteres').textContent?.trim()).toBe(
      `${texto.length}/1000`,
    );
    expect(campo.getAttribute('maxlength')).toBe('1000');
  });

  it('cancelar limpia la captura sin borrar los hallazgos registrados', () => {
    botonCancelar().click();
    fixture.detectChanges();

    expect(component.hallazgoActual).toBe('');
    expect(component.hallazgos.length).toBe(1);
  });

  it('guardar no persiste ni altera la captura (simulado)', async () => {
    const captura = component.hallazgoActual;
    const guardar = botonGuardar();

    expect(guardar.type).toBe('submit');
    guardar.click();
    await fixture.whenStable();

    expect(component.hallazgoActual).toBe(captura);
    expect(component.hallazgos.length).toBe(1);
  });

  it('muestra los hallazgos registrados y el estado de carga', () => {
    const registrados = elementos<HTMLElement>('.hallazgo-card:not(.hallazgo-card--cargando)');

    expect(registrados.length).toBe(1);
    expect(registrados[0].textContent).toContain('Abdomen');
    expect(registrados[0].textContent).toContain('Dr. Juan Pérez');
    expect(elemento<HTMLElement>('.hallazgo-card--cargando')).toBeTruthy();
    expect(elemento<HTMLElement>('.hallazgos-vacio')).toBeNull();
  });

  it('muestra el estado vacío cuando no hay hallazgos ni carga', () => {
    component.cargandoHallazgos = false;
    component.hallazgos = [];
    fixture.detectChanges();

    expect(elemento<HTMLElement>('.hallazgo-card')).toBeNull();
    expect(elemento<HTMLElement>('.hallazgo-card--cargando')).toBeNull();
    expect(elemento<HTMLElement>('.hallazgos-vacio')).toBeTruthy();
  });

  // Ficha del paciente y secciones colapsadas: datos y comportamiento simulados (fase de diseño)
  const botonPestanaPaciente = (): HTMLButtonElement =>
    elemento<HTMLButtonElement>('.ficha-pestana');

  const botonPlegarFicha = (): HTMLButtonElement => elemento<HTMLButtonElement>('.ficha-plegar');

  const ficha = (): HTMLElement | null => fixture.nativeElement.querySelector('.ficha');

  it('abre la ficha del paciente con la pestaña lateral', async () => {
    expect(component.pacienteAbierto).toBe(false);
    expect(ficha()).toBeNull();
    expect(botonPestanaPaciente().getAttribute('aria-expanded')).toBe('false');

    botonPestanaPaciente().click();
    await fixture.whenStable();

    expect(component.pacienteAbierto).toBe(true);
    expect(botonPestanaPaciente().getAttribute('aria-expanded')).toBe('true');

    const fichaAbierta = elemento<HTMLElement>('.ficha');
    expect(elemento<HTMLElement>('.ficha-titulo').textContent?.trim()).toBe(
      'Información del paciente',
    );
    expect(fichaAbierta.textContent).toContain('EXP-0241');
    expect(fichaAbierta.textContent).toContain('Juan Pérez');
    expect(fichaAbierta.textContent).toContain('Hospitalización');
    expect(fichaAbierta.textContent).toContain('10-10-2026');
    expect(fichaAbierta.textContent).toContain('A-105');
    expect(fichaAbierta.textContent).toContain('Dolor abdominal y vómitos');
    expect(fichaAbierta.textContent).toContain('Ninguna conocida');
    // El bloque no lleva botón de cierre: se cierra con la pestaña lateral y solo conserva el
    // control que pliega su cuerpo.
    expect(elementos<HTMLElement>('.ficha button').length).toBe(1);
  });

  it('muestra la atención vigente y los últimos signos vitales', async () => {
    botonPestanaPaciente().click();
    await fixture.whenStable();

    const atencion = elementos<HTMLElement>('.ficha-atencion_dato');
    expect(atencion.length).toBe(3);
    expect(atencion[0].textContent).toContain('Tipo de atención');
    expect(atencion[0].textContent).toContain('Hospitalización');
    expect(atencion[1].textContent).toContain('Fecha de ingreso');
    expect(atencion[1].textContent).toContain('10-10-2026');
    expect(atencion[2].textContent).toContain('Cama');
    expect(atencion[2].textContent).toContain('A-105');

    const vitales = elementos<HTMLElement>('.ficha-vitales li');
    expect(Array.from(vitales).map((signo) => signo.textContent?.trim())).toEqual([
      'PA 120/80',
      'FC 82',
      'Temp 37.2 °C',
      'SpO2 97%',
    ]);
  });

  it('colapsa las secciones al abrir la ficha y las expande al cerrarla', async () => {
    botonPestanaPaciente().click();
    await fixture.whenStable();

    const secciones = elemento<HTMLElement>('.panel-secciones');
    expect(secciones.classList.contains('panel-secciones--rail')).toBe(true);
    // El colapso es solo visual: las tres secciones, sus iconos y sus textos siguen en el DOM
    expect(elementos<HTMLElement>('.panel-secciones .tarjeta').length).toBe(3);
    expect(elementos<HTMLElement>('.panel-secciones .tarjeta_icono i').length).toBe(3);
    expect(elementos<HTMLElement>('.panel-secciones .tarjeta_texto').length).toBe(3);
    expect(
      elemento<HTMLButtonElement>('.panel-secciones .tarjeta').getAttribute('title'),
    ).toBe('Historia clínica');
    expect(
      elemento<HTMLButtonElement>('.panel-secciones .tarjeta').getAttribute('aria-label'),
    ).toBe('Historia clínica');

    botonPestanaPaciente().click();
    await fixture.whenStable();

    expect(component.pacienteAbierto).toBe(false);
    expect(ficha()).toBeNull();
    expect(
      elemento<HTMLElement>('.panel-secciones').classList.contains('panel-secciones--rail'),
    ).toBe(false);
    expect(elemento<HTMLButtonElement>('.panel-secciones .tarjeta').getAttribute('title')).toBeNull();
    expect(
      elemento<HTMLButtonElement>('.panel-secciones .tarjeta').getAttribute('aria-label'),
    ).toBeNull();
  });

  it('marca el contenedor como ficha abierta para reservar el espacio del bloque de datos', async () => {
    const rejilla = (): HTMLElement => elemento<HTMLElement>('.evaluacion');

    expect(rejilla().classList.contains('evaluacion--ficha-abierta')).toBe(false);

    botonPestanaPaciente().click();
    await fixture.whenStable();

    expect(rejilla().classList.contains('evaluacion--ficha-abierta')).toBe(true);

    botonPestanaPaciente().click();
    await fixture.whenStable();

    expect(rejilla().classList.contains('evaluacion--ficha-abierta')).toBe(false);
  });

  it('mantiene la pestaña y el bloque de datos como hijas directas de la vista', async () => {
    botonPestanaPaciente().click();
    await fixture.whenStable();

    // Ninguno de los dos depende de un carril intermedio ni vive dentro de un panel: la pestaña se
    // posiciona contra el borde de la pantalla y el bloque se ancla a ese mismo borde.
    expect(elemento<HTMLElement>('.carril')).toBeNull();
    expect(botonPestanaPaciente().parentElement?.classList.contains('evaluacion')).toBe(true);
    expect(ficha()?.parentElement?.classList.contains('evaluacion')).toBe(true);
    expect(botonPestanaPaciente().closest('.panel')).toBeNull();
  });

  it('pliega el cuerpo de la ficha sin ocultar el título', async () => {
    botonPestanaPaciente().click();
    await fixture.whenStable();

    const plegar = botonPlegarFicha();
    expect(plegar.getAttribute('aria-expanded')).toBe('true');
    expect(plegar.querySelector('i')?.classList.contains('bi-chevron-down')).toBe(true);
    expect(
      elemento<HTMLElement>('.ficha-cuerpo').classList.contains('ficha-cuerpo--plegado'),
    ).toBe(false);

    plegar.click();
    await fixture.whenStable();

    expect(component.datosPacienteVisibles).toBe(false);
    expect(botonPlegarFicha().getAttribute('aria-expanded')).toBe('false');
    expect(botonPlegarFicha().querySelector('i')?.classList.contains('bi-chevron-up')).toBe(true);
    expect(ficha()).not.toBeNull();
    expect(elemento<HTMLElement>('.ficha-titulo').textContent?.trim()).toBe(
      'Información del paciente',
    );
    expect(
      elemento<HTMLElement>('.ficha-cuerpo').classList.contains('ficha-cuerpo--plegado'),
    ).toBe(true);
  });

  it('reabre la ficha con los datos completos tras plegarla', async () => {
    botonPestanaPaciente().click();
    await fixture.whenStable();
    botonPlegarFicha().click();
    await fixture.whenStable();

    botonPestanaPaciente().click();
    await fixture.whenStable();
    botonPestanaPaciente().click();
    await fixture.whenStable();

    expect(component.datosPacienteVisibles).toBe(true);
    expect(
      elemento<HTMLElement>('.ficha-cuerpo').classList.contains('ficha-cuerpo--plegado'),
    ).toBe(false);
    expect(
      elemento<HTMLElement>('.ficha-plegar').getAttribute('aria-expanded'),
    ).toBe('true');
  });

  it('lista las alergias registradas cuando el paciente las tiene', async () => {
    component.alergias = ['Penicilina'];
    fixture.detectChanges();

    botonPestanaPaciente().click();
    await fixture.whenStable();

    const alergias = elemento<HTMLElement>('.alergias-card');
    expect(alergias.tagName).toBe('UL');
    expect(alergias.textContent).not.toContain('Ninguna conocida');
    expect(elementos<HTMLElement>('.alergias-card li').length).toBe(1);
    expect(elementos<HTMLElement>('.alergias-card li')[0].textContent?.trim()).toBe('Penicilina');
  });
});

