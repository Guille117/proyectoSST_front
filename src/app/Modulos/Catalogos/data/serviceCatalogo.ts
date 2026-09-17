import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Nombre, nombreAbrev, NombreGet, registrosCatalogos, unidadMedida } from './nombreInterfaz';

@Injectable({
    providedIn: 'root',
})
export class CatalogoService<
    TEntrada extends Nombre = Nombre,
    TRespuesta extends NombreGet = NombreGet,
> {
    private readonly apiUrl = environment.apiUrl;

    constructor(private http: HttpClient) {}

    crear(recurso: string, catalogo: TEntrada): Observable<unidadMedida> {
        return this.http.post<unidadMedida>(this.url(recurso), catalogo, {
            headers: { 'Content-Type': 'application/json' },
        });
    }

    guardarUnidadMedida(nombre: string, abreviatura: string): Observable<unidadMedida> {
        const unidadMed: nombreAbrev = { nombre, abreviatura };
        return this.http.post<unidadMedida>(`${this.apiUrl}/unidadMedida`, unidadMed, {
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

    listarUnidadMedida(activos?: boolean): Observable<unidadMedida[]> {
        let params = new HttpParams();

        if (activos !== undefined) {
            params = params.set('activos', activos);
        }

        return this.http.get<unidadMedida[]>(`${this.apiUrl}/unidadMedida`, { params });
    }

    obtenerPorId(recurso: string, id: number): Observable<TRespuesta> {
        return this.http.get<TRespuesta>(this.url(recurso, id));
    } 

    actualizar(recurso: string, id: number, catalogo: TEntrada): Observable<TRespuesta> {
        return this.http.put<TRespuesta>(this.url(recurso, id), catalogo);
    }

    actualizarUnidadMedida(id: number, nombre: string, abreviatura: string): Observable<unidadMedida> {
        const unidadMed: nombreAbrev = { nombre, abreviatura };
        return this.http.put<unidadMedida>(`${this.apiUrl}/unidadMedida/${id}`, unidadMed, {
            headers: { 'Content-Type': 'application/json' },
        });
    }

    cambiarEstado(recurso: string, id: number): Observable<TRespuesta> {
        return this.http.patch<TRespuesta>(this.url(recurso, id), null);
    }

    private url(recurso: string, id?: number): string {
        const segmento = recurso.replace(/^\/+|\/+$/g, '');
        return id === undefined ? `${this.apiUrl}/${segmento}` : `${this.apiUrl}/${segmento}/${id}`;
    }

    obtenerRegistrosCatalogosFarmacia(): Observable<registrosCatalogos[]> {
        return this.http.get<Record<string, number>>(`${this.apiUrl}/medicamentoLog/conteoCatalogosFarmacia`).pipe(
            map(response => {
                // Esto transforma el diccionario {"UnidadMedida": 2} 
                // en un arreglo de objetos [{tabla: "UnidadMedida", total: 2}]
                return Object.keys(response).map(key => ({
                    tabla: key,
                    total: response[key]
                }));
            })
        );
    }

    obtenerRegistrosCatalogosUsuarios(): Observable<number> {
        return this.http.get<number>(`${this.apiUrl}/puestos/conteo`);
    }
}