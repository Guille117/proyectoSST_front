import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Nombre, NombreGet, registrosCatalogos, tipoDato2, tipoDato2Post } from './nombreInterfaz';

@Injectable({ providedIn: 'root' })
export class CatalogoService<TEntrada extends Nombre = Nombre, TRespuesta extends NombreGet = NombreGet> {
    private readonly apiUrl = environment.apiUrl;

    constructor(private http: HttpClient) {}

    crear(recurso: string, catalogo: TEntrada): Observable<tipoDato2> {
        return this.http.post<tipoDato2>(this.url(recurso), catalogo, { headers: { 'Content-Type': 'application/json' } });
    }

    crear2(recurso: string, catalogo: tipoDato2Post): Observable<tipoDato2> {
        return this.http.post<tipoDato2>(this.url(recurso), catalogo, { headers: { 'Content-Type': 'application/json' } });
    }

    guardarUnidadMedida(nombre: string, abreviatura: string): Observable<tipoDato2> {
        const unidadMedida: tipoDato2Post = { nombre, abreviatura };
        return this.http.post<tipoDato2>(`${this.apiUrl}/unidadMedida`, unidadMedida, { headers: { 'Content-Type': 'application/json' } });
    }

    listar(recurso: string, activos?: boolean): Observable<TRespuesta[]> {
        return this.http.get<TRespuesta[]>(this.url(recurso), { params: this.parametrosEstado(activos) });
    }

    listar2(recurso: string, activos?: boolean): Observable<tipoDato2[]> {
        return this.http.get<tipoDato2[]>(this.url(recurso), { params: this.parametrosEstado(activos) });
    }

    listarUnidadMedida(activos?: boolean): Observable<tipoDato2[]> {
        return this.http.get<tipoDato2[]>(`${this.apiUrl}/unidadMedida`, { params: this.parametrosEstado(activos) });
    }

    obtenerPorId(recurso: string, id: number): Observable<TRespuesta> {
        return this.http.get<TRespuesta>(this.url(recurso, id));
    }

    obtenerPorId2(recurso: string, id: number): Observable<tipoDato2> {
        return this.http.get<tipoDato2>(this.url(recurso, id));
    }

    actualizar(recurso: string, id: number, catalogo: TEntrada): Observable<TRespuesta> {
        return this.http.put<TRespuesta>(this.url(recurso, id), catalogo);
    }

    actualizar2(recurso: string, id: number, catalogo: tipoDato2Post): Observable<tipoDato2> {
        return this.http.put<tipoDato2>(this.url(recurso, id), catalogo);
    }

    actualizarUnidadMedida(id: number, nombre: string, abreviatura: string): Observable<tipoDato2> {
        const unidadMedida: tipoDato2Post = { nombre, abreviatura };
        return this.http.put<tipoDato2>(`${this.apiUrl}/unidadMedida/${id}`, unidadMedida, { headers: { 'Content-Type': 'application/json' } });
    }

    cambiarEstado(recurso: string, id: number): Observable<TRespuesta> {
        return this.http.patch<TRespuesta>(this.url(recurso, id), null);
    }

    cambiarEstado2(recurso: string, id: number): Observable<tipoDato2> {
        return this.http.patch<tipoDato2>(this.url(recurso, id), null);
    }

    obtenerRegistrosCatalogosFarmacia(): Observable<registrosCatalogos[]> {
        return this.http.get<Record<string, number>>(`${this.apiUrl}/medicamentoLog/conteoCatalogosFarmacia`).pipe(
            map((response) => Object.keys(response).map((tabla) => ({ tabla, total: response[tabla] })))
        );
    }

    obtenerRegistrosCatalogosUsuarios(): Observable<number> {
        return this.http.get<number>(`${this.apiUrl}/puestos/conteo`);
    }

    obtenerRegistrosCatalogosPacientes(): Observable<registrosCatalogos[]> {
        return this.http.get<registrosCatalogos[]>(`${this.apiUrl}/areas/conteo-catalogos`);
    }

    private parametrosEstado(activos?: boolean): HttpParams {
        let params = new HttpParams();
        if (activos !== undefined) params = params.set('activos', activos);
        return params;
    }

    private url(recurso: string, id?: number): string {
        const segmento = recurso.replace(/^\/+|\/+$/g, '');
        return id === undefined ? `${this.apiUrl}/${segmento}` : `${this.apiUrl}/${segmento}/${id}`;
    }
}
