import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ConteoCatalogosUsuarios, Nombre, NombreGet, registrosCatalogos, tipoDato2, tipoDato2Post } from './nombreInterfaz';

@Injectable({ providedIn: 'root' })
export class CatalogoService<TEntrada extends Nombre = Nombre, TRespuesta extends NombreGet = NombreGet> {
    private readonly apiUrl = environment.apiUrl;

    constructor(private http: HttpClient) {}

    // servicios globales

    crear<T>(recurso: string, data: T): Observable<T> {
        return this.http.post<T>(this.url(recurso), data, { headers: { 'Content-Type': 'application/json' } });
    }
    
    listar<T>(recurso: string, activos?: boolean): Observable<T[]> {
        return this.http.get<T[]>(this.url(recurso), { params: this.parametrosEstado(activos) });
    }

    obtenerPorId<T>(recurso: string, id: number): Observable<T> {
        return this.http.get<T>(this.url(recurso, id));
    }
    // eliminar
    actualizar(recurso: string, id: number, catalogo: TEntrada): Observable<TRespuesta> {
        return this.http.put<TRespuesta>(this.url(recurso, id), catalogo);
    }

    actualizar1<T>(recurso: string, id: number, data: T): Observable<T> {
        return this.http.put<T>(this.url(recurso, id), data);
    }

    cambiarEstado(recurso: string, id: number): Observable<void> {
        return this.http.patch<void>(this.url(recurso, id), null);
    }
    
    // servicios específicos para la unidad de medida
    
    guardarUnidadMedida(nombre: string, abreviatura: string): Observable<tipoDato2> {
        const unidadMedida: tipoDato2Post = { nombre, abreviatura };
        return this.http.post<tipoDato2>(`${this.apiUrl}/unidadMedida`, unidadMedida, { headers: { 'Content-Type': 'application/json' } });
    }
    
    listarUnidadMedida(activos?: boolean): Observable<tipoDato2[]> {
        return this.http.get<tipoDato2[]>(`${this.apiUrl}/unidadMedida`, { params: this.parametrosEstado(activos) });
    }
    
    actualizarUnidadMedida(id: number, nombre: string, abreviatura: string): Observable<tipoDato2> {
        const unidadMedida: tipoDato2Post = { nombre, abreviatura };
        return this.http.put<tipoDato2>(`${this.apiUrl}/unidadMedida/${id}`, unidadMedida, { headers: { 'Content-Type': 'application/json' } });
    }


    crear2(recurso: string, catalogo: tipoDato2Post): Observable<tipoDato2> {
        return this.http.post<tipoDato2>(this.url(recurso), catalogo, { headers: { 'Content-Type': 'application/json' } });
    }
    
    listar2(recurso: string, activos?: boolean): Observable<tipoDato2[]> {
        return this.http.get<tipoDato2[]>(this.url(recurso), { params: this.parametrosEstado(activos) });
    }

    obtenerPorId2(recurso: string, id: number): Observable<tipoDato2> {
        return this.http.get<tipoDato2>(this.url(recurso, id));
    }

    actualizar2(recurso: string, id: number, catalogo: tipoDato2Post): Observable<tipoDato2> {
        return this.http.put<tipoDato2>(this.url(recurso, id), catalogo);
    }

    cambiarEstado2(recurso: string, id: number): Observable<tipoDato2> {
        return this.http.patch<tipoDato2>(this.url(recurso, id), null);
    }

    // entrega la cantidad de registros de los catálogos de farmacia
    obtenerRegistrosCatalogosFarmacia(): Observable<registrosCatalogos[]> {
        return this.http.get<Record<string, number>>(`${this.apiUrl}/medicamentoLog/conteoCatalogosFarmacia`).pipe(
            map((response) => Object.keys(response).map((tabla) => ({ tabla, total: response[tabla] })))
        );
    }

    // entrega la cantidad de registros de los catálogos de usuarios
    obtenerConteoCatalogosUsuarios(): Observable<ConteoCatalogosUsuarios> {
        return this.http.get<ConteoCatalogosUsuarios>(`${this.apiUrl}/puestos/conteo`);
    }
    // entrega la cantidad de registros de los catálogos de pacientes
    obtenerRegistrosCatalogosPacientes(): Observable<registrosCatalogos[]> {
        return this.http.get<registrosCatalogos[]>(`${this.apiUrl}/areas/conteo-catalogos`);
    }


    private parametrosEstado(activos?: boolean): HttpParams {
        let params = new HttpParams();
        if (activos !== undefined) params = params.set('activos', activos);
        return params;
    }

    private url(recurso: string, id?: number): string {
        // limpia la cadena quitando las barras al inicio y al final
        const segmento = recurso.replace(/^\/+|\/+$/g, '');
        // operador ternario, si hay id se agrega al final de la URL, si no solo se usa el segmento
        return id === undefined ? `${this.apiUrl}/${segmento}` : `${this.apiUrl}/${segmento}/${id}`;
    }
}
