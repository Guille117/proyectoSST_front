import { TestBed } from '@angular/core/testing';

import { ArchivoService } from './archivoService';

describe('ArchivoService', () => {
  let servicio: ArchivoService;

  const crearArchivo = (nombre: string, tipo: string, contenido = 'contenido'): File =>
    new File([contenido], nombre, { type: tipo });

  // Peso simulado: evita crear en memoria un archivo real de varios MB para probar el límite
  const archivoConPeso = (peso: number, nombre: string, tipo: string): File => {
    const archivo = crearArchivo(nombre, tipo);
    Object.defineProperty(archivo, 'size', { value: peso });

    return archivo;
  };

  beforeEach(() => {
    TestBed.configureTestingModule({});
    servicio = TestBed.inject(ArchivoService);
  });

  it('should be created', () => {
    expect(servicio).toBeTruthy();
  });

  it('expone el accept de los PDF y las imágenes que admiten los formularios', () => {
    expect(servicio.aceptados).toBe('.pdf,.jpg,.jpeg,.png');
  });

  it('admite los documentos PDF y las imágenes JPG o PNG', () => {
    expect(servicio.validar(crearArchivo('informe.pdf', 'application/pdf')).valido).toBe(true);
    expect(servicio.validar(crearArchivo('foto.jpg', 'image/jpeg')).valido).toBe(true);
    expect(servicio.validar(crearArchivo('foto.jpeg', 'image/jpeg')).valido).toBe(true);
    expect(servicio.validar(crearArchivo('captura.png', 'image/png')).valido).toBe(true);
  });

  it('admite por extensión los archivos que el navegador entrega sin tipo MIME', () => {
    const sinTipo = crearArchivo('informe.pdf', '');

    expect(sinTipo.type).toBe('');
    expect(servicio.validar(sinTipo).valido).toBe(true);
  });

  it('rechaza los formatos que no son imagen ni PDF con su motivo', () => {
    const validacion = servicio.validar(
      crearArchivo(
        'informe.docx',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ),
    );

    expect(validacion.valido).toBe(false);
    expect(validacion.mensaje).toContain('Formato no permitido');
  });

  it('rechaza el archivo que supera el peso máximo con su motivo', () => {
    const validacion = servicio.validar(
      archivoConPeso(servicio.tamanoMaximoMb * 1024 * 1024 + 1, 'informe.pdf', 'application/pdf'),
    );

    expect(validacion.valido).toBe(false);
    expect(validacion.mensaje).toContain('10 MB');
  });

  it('describe el archivo con su nombre, su peso, su extensión y su icono', () => {
    const imagen = servicio.describir(archivoConPeso(1536, 'Radiografia.PNG', 'image/png'));
    const documento = servicio.describir(
      archivoConPeso(2.5 * 1024 * 1024, 'informe.pdf', 'application/pdf'),
    );

    expect(imagen.nombre).toBe('Radiografia.PNG');
    expect(imagen.peso).toBe('1.5 KB');
    expect(imagen.extension).toBe('png');
    expect(imagen.esImagen).toBe(true);
    expect(imagen.icono).toBe('bi-file-earmark-image');

    expect(documento.peso).toBe('2.5 MB');
    expect(documento.extension).toBe('pdf');
    expect(documento.esImagen).toBe(false);
    expect(documento.icono).toBe('bi-file-earmark-pdf');
  });

  it('presenta el peso en la unidad que le corresponde', () => {
    expect(servicio.pesoLegible(512)).toBe('512 B');
    expect(servicio.pesoLegible(1536)).toBe('1.5 KB');
    expect(servicio.pesoLegible(1024 * 1024)).toBe('1 MB');
    expect(servicio.pesoLegible(1024 * 1024 * 3.25)).toBe('3.3 MB');
  });

  it('extrae el archivo elegido en el input y el que se suelta en la zona de carga', () => {
    const pdf = crearArchivo('informe.pdf', 'application/pdf');
    const input = document.createElement('input');
    input.type = 'file';
    Object.defineProperty(input, 'files', { value: [pdf] });

    expect(servicio.extraerArchivo({ target: input } as unknown as Event)).toBe(pdf);

    const eventoArrastre = {
      dataTransfer: { files: [pdf] },
      target: document.createElement('div'),
    };
    expect(servicio.extraerArchivo(eventoArrastre as unknown as Event)).toBe(pdf);
  });

  it('procesa lo seleccionado: devuelve el archivo listo o el motivo del rechazo', () => {
    const pdf = crearArchivo('informe.pdf', 'application/pdf');
    const ejecutable = crearArchivo('instalador.exe', 'application/x-msdownload');

    expect(servicio.procesarArchivo(pdf)).toEqual({
      seleccionado: servicio.describir(pdf),
      mensaje: null,
    });
    // Sin archivo no hay nada que adjuntar ni nada que avisar
    expect(servicio.procesarArchivo(null)).toEqual({ seleccionado: null, mensaje: null });

    const rechazado = servicio.procesarArchivo(ejecutable);
    expect(rechazado.seleccionado).toBeNull();
    expect(rechazado.mensaje).toContain('Formato no permitido');
  });

  it('adjunta el archivo al multipart solo cuando hay uno seleccionado', () => {
    const pdf = crearArchivo('informe.pdf', 'application/pdf');
    const datos = new FormData();

    servicio.agregarAlFormData(datos, 'archivoReferencia', pdf);
    expect((datos.get('archivoReferencia') as File).name).toBe('informe.pdf');

    const sinArchivo = new FormData();
    servicio.agregarAlFormData(sinArchivo, 'archivoReferencia', null);
    expect(sinArchivo.get('archivoReferencia')).toBeNull();
  });
});
