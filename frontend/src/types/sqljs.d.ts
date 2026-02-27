declare module "sql.js" {
  export type BindParams = Array<string | number | null> | Record<string, string | number | null>;

  export class Statement {
    bind(values?: BindParams): boolean;
    step(): boolean;
    getAsObject(params?: BindParams): Record<string, unknown>;
    run(values?: BindParams): void;
    free(): void;
  }

  export class Database {
    constructor(data?: Uint8Array | number[] | ArrayBuffer);
    run(sql: string, params?: BindParams): Database;
    exec(sql: string, params?: BindParams): Array<{ columns: string[]; values: unknown[][] }>;
    prepare(sql: string, params?: BindParams): Statement;
    export(): Uint8Array;
    close(): void;
  }

  export type SqlJsStatic = {
    Database: typeof Database;
  };

  export type SqlJsConfig = {
    locateFile?: (file: string) => string;
  };

  export default function initSqlJs(config?: SqlJsConfig): Promise<SqlJsStatic>;
}
