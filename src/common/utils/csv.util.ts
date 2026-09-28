export interface CsvColumn<T> {
  header: string;
  value: (row: T) => string | number | boolean | null | undefined;
}

type CsvValue = string | number | boolean | null | undefined;

/** Escapes a single CSV field per RFC 4180 (quote when it contains ", comma or newline). */
const escapeField = (value: CsvValue): string => {
  if (value === null || value === undefined) return '';
  const asString = String(value);
  return /[",\n\r]/.test(asString) ? `"${asString.replace(/"/g, '""')}"` : asString;
};

/**
 * Serializes rows to a CSV string (CRLF line endings, so Excel opens it cleanly).
 * A leading BOM would help Excel with UTF-8 but is omitted to keep the output
 * clean for programmatic consumers; the controller sets the charset instead.
 */
export const toCsv = <T>(rows: T[], columns: CsvColumn<T>[]): string => {
  const header = columns.map((column) => escapeField(column.header)).join(',');
  const lines = rows.map((row) =>
    columns.map((column) => escapeField(column.value(row))).join(','),
  );
  return [header, ...lines].join('\r\n');
};
