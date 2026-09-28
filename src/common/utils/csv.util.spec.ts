import { toCsv } from '@/common/utils/csv.util';

interface Row {
  name: string;
  amount: number;
  note: string | null;
}

describe('toCsv', () => {
  const columns = [
    { header: 'Name', value: (row: Row) => row.name },
    { header: 'Amount', value: (row: Row) => row.amount },
    { header: 'Note', value: (row: Row) => row.note },
  ];

  it('writes a header row and one line per row, CRLF-separated', () => {
    const csv = toCsv([{ name: 'Ali', amount: 500, note: 'ok' }], columns);
    expect(csv).toBe('Name,Amount,Note\r\nAli,500,ok');
  });

  it('quotes fields containing commas, quotes or newlines and doubles inner quotes', () => {
    const csv = toCsv([{ name: 'Doe, Jane', amount: 1, note: 'say "hi"' }], columns);
    expect(csv).toBe('Name,Amount,Note\r\n"Doe, Jane",1,"say ""hi"""');
  });

  it('renders null/undefined as an empty field', () => {
    const csv = toCsv([{ name: 'X', amount: 0, note: null }], columns);
    expect(csv).toBe('Name,Amount,Note\r\nX,0,');
  });

  it('produces only a header for an empty dataset', () => {
    expect(toCsv([], columns)).toBe('Name,Amount,Note');
  });
});
