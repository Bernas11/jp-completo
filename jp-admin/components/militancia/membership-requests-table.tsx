"use client";

import { useMemo, useState } from "react";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Search, ArrowUpDown, CheckCircle2, XCircle, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ApproveRejectDialog } from "./approve-reject-dialog";

export type MembershipRequestRow = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  concelhiaName: string;
  districtName: string;
  createdAt: string;
};

export function MembershipRequestsTable({ data }: { data: MembershipRequestRow[] }) {
  const [globalFilter, setGlobalFilter] = useState("");
  const [districtFilter, setDistrictFilter] = useState<string>("todos");
  const [activeRequest, setActiveRequest] = useState<MembershipRequestRow | null>(null);
  const [dialogAction, setDialogAction] = useState<"aprovar" | "recusar" | null>(null);

  const districts = useMemo(
    () => Array.from(new Set(data.map((row) => row.districtName))).sort(),
    [data],
  );

  const filteredData = useMemo(
    () =>
      districtFilter === "todos" ? data : data.filter((row) => row.districtName === districtFilter),
    [data, districtFilter],
  );

  const columns = useMemo<ColumnDef<MembershipRequestRow>[]>(
    () => [
      {
        accessorKey: "fullName",
        header: ({ column }) => (
          <button
            className="flex items-center gap-1 font-display uppercase tracking-wide text-xs text-jp-blue-deep"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Nome <ArrowUpDown className="h-3.5 w-3.5" />
          </button>
        ),
        cell: ({ row }) => (
          <div>
            <p className="font-medium text-jp-blue-deep">{row.original.fullName}</p>
            <p className="text-xs text-muted-foreground">{row.original.email}</p>
          </div>
        ),
      },
      {
        accessorKey: "concelhiaName",
        header: "Concelhia",
        cell: ({ row }) => (
          <div>
            <p>{row.original.concelhiaName}</p>
            <p className="text-xs text-muted-foreground">{row.original.districtName}</p>
          </div>
        ),
      },
      {
        accessorKey: "createdAt",
        header: ({ column }) => (
          <button
            className="flex items-center gap-1 font-display uppercase tracking-wide text-xs text-jp-blue-deep"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Data do Pedido <ArrowUpDown className="h-3.5 w-3.5" />
          </button>
        ),
        cell: ({ row }) => (
          <Badge variant="outline" className="border-jp-line font-normal">
            {new Date(row.original.createdAt).toLocaleDateString("pt-PT")}
          </Badge>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-jp-blue-mid hover:text-jp-blue-deep"
              asChild
            >
              <a href={`/militancia/pedidos/${row.original.id}`}>
                <FileText className="h-4 w-4 mr-1" /> Ficha completa
              </a>
            </Button>
            <Button
              size="sm"
              className="bg-jp-blue text-white hover:bg-jp-blue-deep"
              onClick={() => {
                setActiveRequest(row.original);
                setDialogAction("aprovar");
              }}
            >
              <CheckCircle2 className="h-4 w-4 mr-1" /> Aprovar
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-red-300 text-red-600 hover:bg-red-50"
              onClick={() => {
                setActiveRequest(row.original);
                setDialogAction("recusar");
              }}
            >
              <XCircle className="h-4 w-4 mr-1" /> Recusar
            </Button>
          </div>
        ),
      },
    ],
    [],
  );

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 15 } },
  });

  return (
    <div className="surface-card rounded-2xl border border-jp-line p-6">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Pesquisar por nome ou email..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={districtFilter}
          onChange={(e) => setDistrictFilter(e.target.value)}
          className="rounded-lg border border-jp-line bg-white px-3 py-2 text-sm"
          aria-label="Filtrar por distrito"
        >
          <option value="todos">Todos os distritos</option>
          {districts.map((district) => (
            <option key={district} value={district}>
              {district}
            </option>
          ))}
        </select>
        <Badge className="bg-jp-yellow text-jp-blue-deep font-display">
          {filteredData.length} pendentes
        </Badge>
      </div>

      <div className="overflow-x-auto rounded-xl border border-jp-line">
        <table className="w-full text-sm">
          <thead className="bg-jp-blue/5">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th key={header.id} className="px-4 py-3 text-left">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-4 py-10 text-center text-muted-foreground">
                  Sem pedidos pendentes para os filtros selecionados.
                </td>
              </tr>
            )}
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="border-t border-jp-line hover:bg-jp-blue/5">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-3">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Página {table.getState().pagination.pageIndex + 1} de {table.getPageCount() || 1}
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Seguinte
          </Button>
        </div>
      </div>

      <ApproveRejectDialog
        request={activeRequest}
        action={dialogAction}
        onClose={() => {
          setActiveRequest(null);
          setDialogAction(null);
        }}
      />
    </div>
  );
}
