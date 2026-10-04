export interface MedicamentoLogFiltros {
    nombre?: string;
    marcaId?: number;
    presentacionId?: number;
    viaAdminId?: number;
    activo?: boolean;
}

export interface MedicamentoLogRequest{
    nombre: string;
    dosis: number;
    unidadMedidaId: number;
    viaAdminId: number;
    presentacionId: number;
    marcaId: number;
   
}

export interface MedicamentoLogResponse{
    id: number;
    nombre: string;
    dosis: number;
    marca: string;
    presentacion: string;
    viaAdministracion: string;
    unidadMedida: string;
    estado: boolean;
}