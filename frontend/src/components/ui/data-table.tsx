"use client";

import { isValidElement, useMemo, useState, type ReactNode } from "react";
import {
  type ColumnDef,
  type ColumnFiltersState,
  type Header,
  flexRender,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getCoreRowModel,
  type SortingState,
  type VisibilityState,
  useReactTable,
} from "@tanstack/react-table";
import {
  ArrowUpDown,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

const DEFAULT_PAGE_SIZE = 5;

function extractTextFromNode(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") {
    return String(node).trim();
  }

  if (Array.isArray(node)) {
    return node
      .map((child) => extractTextFromNode(child))
      .filter(Boolean)
      .join(" ")
      .trim();
  }

  if (isValidElement<{ children?: ReactNode }>(node)) {
    return extractTextFromNode(node.props.children);
  }

  return "";
}

type DataTableFooterControls = {
  selectedCount: number;
  totalCount: number;
  pageIndex: number;
  pageSize: number;
  pageCount: number;
  pageRowsCount: number;
  rangeStart: number;
  rangeEnd: number;
  paginationSummary: string;
  canPreviousPage: boolean;
  canNextPage: boolean;
  previousPage: () => void;
  nextPage: () => void;
};

type DataTableProps<TData, TValue> = {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  emptyMessage: string;
  className?: string;
  filterColumnId?: string;
  filterPlaceholder?: string;
  columnsButtonLabel?: string;
  previousPageLabel?: string;
  nextPageLabel?: string;
  paginationSummaryTemplate?: string;
  getRowsSelectedLabel?: (selectedCount: number, totalCount: number) => string;
  toolbarActions?: ReactNode;
  renderFooter?: (controls: DataTableFooterControls) => ReactNode;
};

function formatPaginationSummary(
  template: string | undefined,
  {
    start,
    end,
    total,
    pageSize,
  }: {
    start: number;
    end: number;
    total: number;
    pageSize: number;
  },
) {
  if (!template) {
    return "";
  }

  return template
    .replace("{start}", String(start))
    .replace("{end}", String(end))
    .replace("{total}", String(total))
    .replace("{pageSize}", String(pageSize));
}

function renderColumnHeader<TData, TValue>(header: Header<TData, TValue>) {
  if (header.isPlaceholder) {
    return null;
  }

  const renderedHeader = flexRender(
    header.column.columnDef.header,
    header.getContext(),
  );
  if (
    !header.column.getCanSort() ||
    typeof header.column.columnDef.header === "function"
  ) {
    return renderedHeader;
  }

  return (
    <Button
      type="button"
      variant="ghost"
      className="h-auto min-w-0 justify-start gap-1 px-0 py-0 text-left whitespace-normal normal-case"
      onClick={() =>
        header.column.toggleSorting(header.column.getIsSorted() === "asc")
      }
    >
      <span>{renderedHeader || header.column.id}</span>
      <ArrowUpDown aria-hidden="true" />
    </Button>
  );
}

export function DataTable<TData, TValue>({
  columns,
  data,
  emptyMessage,
  className,
  filterColumnId,
  filterPlaceholder,
  columnsButtonLabel,
  previousPageLabel,
  nextPageLabel,
  paginationSummaryTemplate,
  getRowsSelectedLabel,
  toolbarActions,
  renderFooter,
}: DataTableProps<TData, TValue>) {
  const ssrPageRowsCount = Math.min(DEFAULT_PAGE_SIZE, data.length);
  const ssrRangeStart = ssrPageRowsCount > 0 ? 1 : 0;
  const ssrRangeEnd = ssrPageRowsCount > 0 ? ssrPageRowsCount : 0;
  const ssrFooterControls: DataTableFooterControls = {
    selectedCount: 0,
    totalCount: data.length,
    pageIndex: 0,
    pageSize: DEFAULT_PAGE_SIZE,
    pageCount: data.length > 0 ? Math.ceil(data.length / DEFAULT_PAGE_SIZE) : 0,
    pageRowsCount: ssrPageRowsCount,
    rangeStart: ssrRangeStart,
    rangeEnd: ssrRangeEnd,
    paginationSummary: formatPaginationSummary(paginationSummaryTemplate, {
      start: ssrRangeStart,
      end: ssrRangeEnd,
      total: data.length,
      pageSize: DEFAULT_PAGE_SIZE,
    }),
    canPreviousPage: false,
    canNextPage: false,
    previousPage: () => undefined,
    nextPage: () => undefined,
  };

  if (typeof window === "undefined") {
    return (
      <div className={cn("navai-data-table-root min-w-0 space-y-4", className)}>
        <div className="navai-data-table-toolbar flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          {filterColumnId ? (
            <Input
              value=""
              readOnly
              placeholder={filterPlaceholder}
              className="md:max-w-sm"
            />
          ) : (
            <div />
          )}
          <div className="flex flex-wrap items-center gap-2 md:ml-auto md:justify-end">
            {toolbarActions}
            <Button variant="outline" type="button" disabled>
              {columnsButtonLabel}
              <ChevronDown aria-hidden="true" />
            </Button>
          </div>
        </div>

        <div className="navai-data-table-shell min-w-0 overflow-x-auto rounded-[1rem] border border-border/70 bg-background/35">
          <Table className="navai-data-table">
            <TableHeader>
              <TableRow>
                {columns.map((column, index) => (
                  <TableHead key={`ssr-head-${index}`}>
                    {String(column.id ?? "")}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell
                  colSpan={Math.max(columns.length, 1)}
                  className="h-28 text-center text-sm text-muted-foreground"
                >
                  {data.length > 0 ? "" : emptyMessage}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        {renderFooter ? (
          renderFooter(ssrFooterControls)
        ) : (
          <div className="navai-data-table-footer flex flex-col gap-3 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
            <div className="navai-data-table-selection">
              {getRowsSelectedLabel
                ? getRowsSelectedLabel(0, data.length)
                : null}
            </div>
            <div className="navai-data-table-pagination flex flex-wrap items-center justify-end gap-2 self-end">
              {ssrFooterControls.paginationSummary ? (
                <span className="navai-data-table-pagination-summary text-xs text-muted-foreground/80">
                  {ssrFooterControls.paginationSummary}
                </span>
              ) : null}
              <Button variant="outline" size="sm" disabled>
                <ChevronLeft aria-hidden="true" />
                {previousPageLabel}
              </Button>
              <Button variant="outline" size="sm" disabled>
                {nextPageLabel}
                <ChevronRight aria-hidden="true" />
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <DataTableClient
      columns={columns}
      data={data}
      emptyMessage={emptyMessage}
      className={className}
      filterColumnId={filterColumnId}
      filterPlaceholder={filterPlaceholder}
      columnsButtonLabel={columnsButtonLabel}
      previousPageLabel={previousPageLabel}
      nextPageLabel={nextPageLabel}
      paginationSummaryTemplate={paginationSummaryTemplate}
      getRowsSelectedLabel={getRowsSelectedLabel}
      toolbarActions={toolbarActions}
      renderFooter={renderFooter}
    />
  );
}

function DataTableClient<TData, TValue>({
  columns,
  data,
  emptyMessage,
  className,
  filterColumnId,
  filterPlaceholder,
  columnsButtonLabel,
  previousPageLabel,
  nextPageLabel,
  paginationSummaryTemplate,
  getRowsSelectedLabel,
  toolbarActions,
  renderFooter,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});

  const enhancedColumns = useMemo<ColumnDef<TData, TValue>[]>(() => {
    return columns;
  }, [columns]);

  const table = useReactTable({
    data,
    columns: enhancedColumns,
    enableRowSelection: true,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
    initialState: {
      pagination: {
        pageSize: DEFAULT_PAGE_SIZE,
      },
    },
  });

  const pagination = table.getState().pagination;
  const pageRowsCount = table.getRowModel().rows.length;
  const rangeStart =
    pageRowsCount > 0 ? pagination.pageIndex * pagination.pageSize + 1 : 0;
  const rangeEnd = pageRowsCount > 0 ? rangeStart + pageRowsCount - 1 : 0;
  const footerControls: DataTableFooterControls = {
    selectedCount: table.getFilteredSelectedRowModel().rows.length,
    totalCount: table.getFilteredRowModel().rows.length,
    pageIndex: pagination.pageIndex,
    pageSize: pagination.pageSize,
    pageCount: table.getPageCount(),
    pageRowsCount,
    rangeStart,
    rangeEnd,
    paginationSummary: formatPaginationSummary(paginationSummaryTemplate, {
      start: rangeStart,
      end: rangeEnd,
      total: table.getFilteredRowModel().rows.length,
      pageSize: pagination.pageSize,
    }),
    canPreviousPage: table.getCanPreviousPage(),
    canNextPage: table.getCanNextPage(),
    previousPage: () => table.previousPage(),
    nextPage: () => table.nextPage(),
  };

  const columnVisibilityLabels = useMemo(() => {
    return new Map(
      table.getFlatHeaders().map((header) => {
        const renderedHeader = header.isPlaceholder
          ? ""
          : flexRender(header.column.columnDef.header, header.getContext());
        const normalizedLabel =
          extractTextFromNode(renderedHeader) ||
          extractTextFromNode(header.column.columnDef.header as ReactNode) ||
          header.column.id;

        return [header.column.id, normalizedLabel];
      }),
    );
  }, [table]);

  return (
    <div className={cn("navai-data-table-root min-w-0 space-y-4", className)}>
      <div className="navai-data-table-toolbar flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        {filterColumnId ? (
          <Input
            value={
              (table.getColumn(filterColumnId)?.getFilterValue() as string) ??
              ""
            }
            onChange={(event) =>
              table
                .getColumn(filterColumnId)
                ?.setFilterValue(event.target.value)
            }
            placeholder={filterPlaceholder}
            className="md:max-w-sm"
          />
        ) : (
          <div />
        )}
        <div className="flex flex-wrap items-center gap-2 md:ml-auto md:justify-end">
          {toolbarActions}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                {columnsButtonLabel}
                <ChevronDown aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => {
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) =>
                        column.toggleVisibility(Boolean(value))
                      }
                    >
                      {columnVisibilityLabels.get(column.id) ?? column.id}
                    </DropdownMenuCheckboxItem>
                  );
                })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="navai-data-table-shell min-w-0 overflow-x-auto rounded-[1rem] border border-border/70 bg-background/35">
        <Table className="navai-data-table">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {renderColumnHeader(header)}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() ? "selected" : undefined}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={table.getVisibleLeafColumns().length}
                  className="h-28 text-center text-sm text-muted-foreground"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {renderFooter ? (
        renderFooter(footerControls)
      ) : (
        <div className="navai-data-table-footer flex flex-col gap-3 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
          <div className="navai-data-table-selection">
            {getRowsSelectedLabel
              ? getRowsSelectedLabel(
                  footerControls.selectedCount,
                  footerControls.totalCount,
                )
              : null}
          </div>
          <div className="navai-data-table-pagination flex flex-wrap items-center justify-end gap-2 self-end">
            {footerControls.paginationSummary ? (
              <span className="navai-data-table-pagination-summary text-xs text-muted-foreground/80">
                {footerControls.paginationSummary}
              </span>
            ) : null}
            <Button
              variant="outline"
              size="sm"
              onClick={footerControls.previousPage}
              disabled={!footerControls.canPreviousPage}
            >
              <ChevronLeft aria-hidden="true" />
              {previousPageLabel}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={footerControls.nextPage}
              disabled={!footerControls.canNextPage}
            >
              {nextPageLabel}
              <ChevronRight aria-hidden="true" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
