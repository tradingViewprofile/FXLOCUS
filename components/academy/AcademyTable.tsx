import type { LessonToolTable } from "@/lib/academy/types";

export function AcademyTable({ data }: { data: LessonToolTable }) {
  return (
    <div className="academy-table-wrap">
      <table className="academy-table">
        {data.caption ? <caption>{data.caption}</caption> : null}
        <thead>
          <tr>
            {data.columns.map((col) => (
              <th key={col}>{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row, idx) => (
            <tr key={`${row.join("-")}-${idx}`}>
              {row.map((cell, cellIdx) => (
                <td key={`${cell}-${cellIdx}`}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
