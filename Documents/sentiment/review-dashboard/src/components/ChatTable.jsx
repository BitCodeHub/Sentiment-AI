import React from 'react';

const ChatTable = ({ data, title }) => {
  if (!data || !data.headers || !data.rows) return null;

  return (
    <div className="table-container">
      {title && <h3 className="chart-title">{title}</h3>}
      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              {data.headers.map((header, index) => (
                <th key={index}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex}>
                    {typeof cell === 'number' 
                      ? cell.toLocaleString() 
                      : cell
                    }
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ChatTable;