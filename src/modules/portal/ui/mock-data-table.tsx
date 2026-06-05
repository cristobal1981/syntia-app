type MockDataTableProps = {
  headers: string[]
  rows: string[][]
}

export function MockDataTable({ headers, rows }: MockDataTableProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-agua/30">
      <table className="w-full min-w-[320px] text-left text-sm">
        <thead>
          <tr className="border-b border-agua/30 bg-card/80">
            {headers.map((header) => (
              <th
                key={header}
                scope="col"
                className="px-4 py-3 font-sans font-medium text-muted-foreground"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr
              key={rowIndex}
              className="border-b border-agua/20 last:border-b-0 even:bg-card/40"
            >
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="px-4 py-3 text-foreground">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
