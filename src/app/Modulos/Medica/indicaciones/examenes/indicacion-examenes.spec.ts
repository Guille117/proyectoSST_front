import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError, TimeoutError } from 'rxjs';

import { IndicacionExamenes } from './indicacion-examenes';
import { IndicacionExamenService } from './data/examen-service';
import { ExamenResponse } from './data/examenInterfaz';
import { ModalService } from '../../../../modal-principal/modal-service';
import { PopUps } from '../../../../shared/popUps/popUpsService';
import { AuthService } from '../../../Auth/data/auth-service';
import { EpisodioActivoService } from '../../data/episodio-activo-service';
import { VisorArchivos } from '../../../../shared/visor-archivos/visor-archivos';

describe('IndicacionExamenes', () => {
  let component: IndicacionExamenes;
  let fixture: ComponentFixture<IndicacionExamenes>;

  const archivo = {
    id: 50,
    nombreOriginal: 'hemograma.pdf',
    urlArchivo: 'uploads/examenes/examen-30-a.pdf',
    tamano: 1024,
  };

  const examen = (cambios: Partial<ExamenResponse> = {}): ExamenResponse => ({
    id: 30,
    nombreExamen: 'Hemograma',
    observacion: 'En ayunas',
    archivos: [archivo],
    episodioId: 1,
    usuarioId: 2,
    usuarioNombre: 'Carlos Méndez',
    fecha: '2026-10-16T11:00:00',
    estado: 'ACTIVO',
    ...cambios,
  });

  const servicio = {
    buscarPorEpisodio: vi.fn(),
    crearExamen: vi.fn(),
    actualizarExamen: vi.fn(),
    cambiarEstado: vi.fn(),
    eliminarArchivo: vi.fn(),
    obtenerArchivo: vi.fn(),
  };
  const popUps = {
    exito: vi.fn(),
    error: vi.fn(),
    errorDesdeBackend: vi.fn(),
    advertencia: vi.fn(),
    confirmarToast: vi.fn(),
  };
  const modalService = { open: vi.fn(), close: vi.fn() };
  const auth = { currentUser: () => ({ id: 2 }) };
  const episodio = {
    obtener: vi.fn<() => number | null>(() => 1),
    guardar: vi.fn(),
    limpiar: vi.fn(),
    esSoloLectura: () => false,
  };

  beforeEach(async () => {
    vi.resetAllMocks();
    servicio.buscarPorEpisodio.mockImplementation((_, estado) =>
      of(estado === 'ACTIVO' ? [examen()] : [examen({ id: 31, estado: 'ELIMINADO' })]),
    );
    servicio.crearExamen.mockReturnValue(of(examen()));
    servicio.actualizarExamen.mockReturnValue(of(examen()));
    servicio.cambiarEstado.mockReturnValue(of(examen({ estado: 'ELIMINADO' })));
    servicio.eliminarArchivo.mockReturnValue(of(void 0));
    popUps.confirmarToast.mockResolvedValue(true);
    episodio.obtener.mockReturnValue(1);

    await TestBed.configureTestingModule({
      imports: [IndicacionExamenes],
      providers: [
        { provide: IndicacionExamenService, useValue: servicio },
        { provide: PopUps, useValue: popUps },
        { provide: ModalService, useValue: modalService },
        { provide: AuthService, useValue: auth },
        { provide: EpisodioActivoService, useValue: episodio },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(IndicacionExamenes);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('carga los exámenes activos del episodio', () => {
    expect(servicio.buscarPorEpisodio).toHaveBeenCalledWith(1, 'ACTIVO');
    expect(component.examenes.length).toBe(1);
    expect(component.examenes[0].disponible).toBe(true);
  });

  it('no muestra los archivos en la tarjeta y deja solo el ojo', () => {
    const tarjeta = fixture.nativeElement.querySelector('.indicacion-card') as HTMLElement;

    expect(tarjeta.textContent).not.toContain('hemograma.pdf');
    expect(tarjeta.querySelector('.examen-ojo')).not.toBeNull();
  });

  it('carga los eliminados al elegir su filtro', async () => {
    component.seleccionarFiltroExamen('eliminados');
    await fixture.whenStable();

    expect(servicio.buscarPorEpisodio).toHaveBeenCalledWith(1, 'ELIMINADO');
    expect(component.examenes[0].estado).toBe('eliminado');
  });

  it('filtra por disponibilidad según los archivos adjuntos', async () => {
    servicio.buscarPorEpisodio.mockReturnValue(
      of([examen({ id: 30 }), examen({ id: 31, archivos: [] })]),
    );
    component.cargarExamenes();
    await fixture.whenStable();

    component.seleccionarFiltroExamen('disponibles');
    expect(component.examenesFiltrados.map((item) => item.id)).toEqual([30]);

    component.seleccionarFiltroExamen('noDisponibles');
    expect(component.examenesFiltrados.map((item) => item.id)).toEqual([31]);
  });

  it('admite archivos TXT además de PDF e imágenes', () => {
    const input = fixture.nativeElement.querySelector('#archivoExamen') as HTMLInputElement;
    const txt = new File(['contenido de texto'], 'notas.txt', { type: 'text/plain' });
    Object.defineProperty(input, 'files', { value: [txt], configurable: true });

    input.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(input.getAttribute('accept')).toBe('.pdf,.jpg,.jpeg,.png,.txt');
    expect(component.archivosExamen.length).toBe(1);
    expect(component.archivosExamen[0].extension).toBe('txt');
    expect(component.archivosExamen[0].icono).toBe('bi-file-earmark-text');
  });

  it('crea el examen con varios archivos de distinto tipo', async () => {
    const pdf = new File(['pdf'], 'resultado.pdf', { type: 'application/pdf' });
    const imagen = new File(['png'], 'placa.png', { type: 'image/png' });
    component.nombreExamen = 'Hemograma';
    component.observacionExamen = 'En ayunas';
    component.archivosExamen = [
      {
        archivo: pdf,
        nombre: pdf.name,
        peso: '1 KB',
        extension: 'pdf',
        esImagen: false,
        icono: 'bi-file-earmark-pdf',
      },
      {
        archivo: imagen,
        nombre: imagen.name,
        peso: '1 KB',
        extension: 'png',
        esImagen: true,
        icono: 'bi-file-earmark-image',
      },
    ];

    await component.agregarExamen();
    await fixture.whenStable();

    expect(popUps.confirmarToast).not.toHaveBeenCalled();
    expect(servicio.crearExamen).toHaveBeenCalledWith(
      {
        nombreExamen: 'Hemograma',
        observacion: 'En ayunas',
        episodioId: 1,
        usuarioId: 2,
      },
      [pdf, imagen],
    );
    expect(popUps.exito).toHaveBeenCalledWith('Examen guardado exitosamente.');
  });

  it('actualiza el examen en edición con los archivos nuevos', async () => {
    component.editarExamen(component.examenes[0]);
    component.nombreExamen = 'Hemograma completo';

    await component.agregarExamen();
    await fixture.whenStable();

    expect(popUps.confirmarToast).toHaveBeenCalledWith(
      '¿Está seguro de guardar los cambios del examen "Hemograma completo"?',
    );
    expect(servicio.actualizarExamen).toHaveBeenCalledWith(
      30,
      {
        nombreExamen: 'Hemograma completo',
        observacion: 'En ayunas',
        episodioId: 1,
        usuarioId: 2,
      },
      [],
    );
  });

  it('no actualiza si se cancela la confirmación al editar', async () => {
    popUps.confirmarToast.mockResolvedValue(false);
    component.editarExamen(component.examenes[0]);
    component.nombreExamen = 'Hemograma completo';

    await component.agregarExamen();

    expect(servicio.actualizarExamen).not.toHaveBeenCalled();
  });

  it('marca con X un archivo guardado y lo elimina al guardar los cambios', async () => {
    component.editarExamen(component.examenes[0]);
    component.quitarArchivoExistente(archivo);

    expect(component.archivosExistentes).toEqual([]);
    expect(component.archivosEliminados).toEqual([50]);

    await component.agregarExamen();
    await fixture.whenStable();

    expect(popUps.confirmarToast).toHaveBeenCalledWith(
      '¿Está seguro de guardar los cambios del examen "Hemograma"? Se eliminarán 1 archivo.',
    );
    expect(servicio.actualizarExamen).toHaveBeenCalled();
    expect(servicio.eliminarArchivo).toHaveBeenCalledWith(30, 50);
  });

  it('al editar oculta la zona de carga y muestra una X por archivo guardado', () => {
    component.editarExamen(component.examenes[0]);
    fixture.detectChanges();

    expect(component.archivosExistentes.length).toBe(1);
    expect(fixture.nativeElement.querySelector('.carga-archivo')).toBeNull();
    expect(fixture.nativeElement.querySelector('.examen-archivos-guardados button')).not.toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('Ver archivos');
  });

  it('elimina el examen con cambio de estado y recarga el listado', async () => {
    await component.eliminarExamen(component.examenes[0]);

    expect(popUps.confirmarToast).toHaveBeenCalledWith(
      '¿Está seguro de eliminar el examen "Hemograma"?',
    );
    expect(servicio.cambiarEstado).toHaveBeenCalledWith(30, 'ELIMINADO');
    expect(popUps.exito).toHaveBeenCalledWith('Examen eliminado exitosamente.');
  });

  it('abre el visor con los archivos del examen', () => {
    component.verArchivosExamen(component.examenes[0]);

    expect(modalService.open).toHaveBeenCalledWith(
      VisorArchivos,
      expect.objectContaining({
        modalClass: 'modal-visor-documentos',
        archivos: [{ id: 50, nombreOriginal: 'hemograma.pdf', tamano: 1024 }],
        cargarArchivo: expect.any(Function),
        onEliminar: expect.any(Function),
        onCambio: expect.any(Function),
      }),
    );
  });

  it('avisa cuando el examen no tiene archivos', () => {
    servicio.buscarPorEpisodio.mockReturnValue(of([examen({ archivos: [] })]));
    component.cargarExamenes();
    fixture.detectChanges();

    component.verArchivosExamen(component.examenes[0]);

    expect(modalService.open).not.toHaveBeenCalled();
    expect(popUps.advertencia).toHaveBeenCalledWith(
      'El examen "Hemograma" no tiene un archivo adjunto.',
    );
  });

  it('no consulta sin un episodio activo', () => {
    episodio.obtener.mockReturnValue(null);
    servicio.buscarPorEpisodio.mockClear();

    component.cargarExamenes();

    expect(servicio.buscarPorEpisodio).not.toHaveBeenCalled();
    expect(component.sinEpisodioActivo).toBe(true);
  });

  it('avisa cuando el servidor no responde al cargar el listado', async () => {
    servicio.buscarPorEpisodio.mockReturnValue(throwError(() => new TimeoutError()));

    component.cargarExamenes();
    await fixture.whenStable();

    expect(popUps.error).toHaveBeenCalledWith(
      'Error de comunicación. El servidor no respondió dentro del tiempo esperado.',
    );
  });
});
