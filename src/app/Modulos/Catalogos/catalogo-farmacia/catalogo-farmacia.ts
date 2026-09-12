import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TabSwitch } from '../../../shared/tab-switch/tab-switch';

interface CatalogoItem {
  id: number;
  nombre: string;
  activo: boolean;
}

interface CatalogoGrupo {
  id: string;
  nombre: string;
  items: CatalogoItem[];
}

@Component({
  selector: 'app-catalogo-farmacia',
  imports: [CommonModule, FormsModule, TabSwitch],
  templateUrl: './catalogo-farmacia.html',
  styleUrl: './catalogo-farmacia.scss',
})
export class CatalogoFarmacia {
  grupos: CatalogoGrupo[] = [
    {
      id: 'unidad-medida',
      nombre: 'Unidad de medida',
      items: [
        { id: 1, nombre: 'mg', activo: true },
        { id: 2, nombre: 'ml', activo: true },
        { id: 3, nombre: 'g', activo: false },
      ],
    },
    {
      id: 'marca-comercial',
      nombre: 'Marca comercial',
      items: [
        { id: 1, nombre: 'Pfizer', activo: true },
        { id: 2, nombre: 'GSK', activo: true },
        { id: 3, nombre: 'Sanofi', activo: false },
      ],
    },
    {
      id: 'via-administracion',
      nombre: 'Vía de administración',
      items: [
        { id: 1, nombre: 'Oral', activo: true },
        { id: 2, nombre: 'Tópico', activo: true },
        { id: 3, nombre: 'Inyectable', activo: true },
      ],
    },
    {
      id: 'presentacion',
      nombre: 'Presentación',
      items: [
        { id: 1, nombre: 'Frasco', activo: true },
        { id: 2, nombre: 'Caja', activo: true },
        { id: 3, nombre: 'Ampolla', activo: false },
      ],
    },
  ];

  grupoSeleccionado = this.grupos[0];
  registroSeleccionado: CatalogoItem | null = null;
  nombreRegistro = '';
  modoEdicion = false;
  mostrarActivos = true;

  get registrosMostrados(): CatalogoItem[] {
    return this.grupoSeleccionado.items.filter((item) =>
      this.mostrarActivos ? item.activo : true,
    );
  }

  seleccionarGrupo(grupo: CatalogoGrupo): void {
    this.grupoSeleccionado = grupo;
    this.resetFormulario();
  }

  seleccionarRegistro(item: CatalogoItem): void {
    this.registroSeleccionado = item;
    this.nombreRegistro = item.nombre;
    this.modoEdicion = true;
  }

  guardarRegistro(): void {
    const nombre = this.nombreRegistro.trim();
    if (!nombre) {
      return;
    }

    if (this.modoEdicion && this.registroSeleccionado) {
      this.registroSeleccionado.nombre = nombre;
    } else {
      const nuevoId =
        this.grupoSeleccionado.items.reduce((max, item) => Math.max(max, item.id), 0) + 1;

      this.grupoSeleccionado.items.push({
        id: nuevoId,
        nombre,
        activo: true,
      });
    }

    this.resetFormulario();
  }

  editarRegistro(item: CatalogoItem): void {
    this.seleccionarRegistro(item);
  }

  cambiarEstadoRegistro(item: CatalogoItem): void {
    item.activo = !item.activo;

    if (this.registroSeleccionado?.id === item.id && !item.activo) {
      this.resetFormulario();
    }
  }

  resetFormulario(): void {
    this.registroSeleccionado = null;
    this.nombreRegistro = '';
    this.modoEdicion = false;
  }

  get formularioValido(): boolean {
    return this.nombreRegistro.trim().length > 0;
  }

  get tituloFormulario(): string {
    return this.modoEdicion ? 'Editar registro' : 'Agregar registro';
  }
}
