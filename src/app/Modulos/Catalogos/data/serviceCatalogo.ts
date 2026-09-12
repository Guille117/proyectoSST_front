import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Nombre, NombreGet } from './nombreInterfaz';

@Injectable({
    providedIn: 'root',
})
export class CatalogoService<
    TEntrada extends Nombre = Nombre,
    TRespuesta extends NombreGet = NombreGet,
> {
    private readonly apiUrl = environment.apiUrl;

    constructor(private http: HttpClient) {}

    crear(recurso: string, catalogo: TEntrada): Observable<TRespuesta> {
        return this.http.post<TRespuesta>(this.url(recurso), catalogo, {
            headers: { 'Content-Type': 'application/json' },
        });
    }

    listar(recurso: string, activos?: boolean): Observable<TRespuesta[]> {
        let params = new HttpParams();
        if (activos !== undefined) {
            params = params.set('activos', activos);
        }

        return this.http.get<TRespuesta[]>(this.url(recurso), { params });
    }

    obtenerPorId(recurso: string, id: number): Observable<TRespuesta> {
        return this.http.get<TRespuesta>(this.url(recurso, id));
    }

    actualizar(recurso: string, id: number, catalogo: TEntrada): Observable<TRespuesta> {
        return this.http.put<TRespuesta>(this.url(recurso, id), catalogo);
    }

    cambiarEstado(recurso: string, id: number): Observable<TRespuesta> {
        return this.http.patch<TRespuesta>(this.url(recurso, id), null);
    }

    private url(recurso: string, id?: number): string {
        const segmento = recurso.replace(/^\/+|\/+$/g, '');
        return id === undefined ? `${this.apiUrl}/${segmento}` : `${this.apiUrl}/${segmento}/${id}`;
    }
}