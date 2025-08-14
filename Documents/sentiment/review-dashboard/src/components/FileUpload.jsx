import React, { useState } from 'react';
import { Upload, FileSpreadsheet } from 'lucide-react';

const FileUpload = ({ onFileUpload }) => {
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState('');

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file) => {
    if (file.type === 'application/vnd.ms-excel' || 
        file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.name.endsWith('.xlsx') || 
        file.name.endsWith('.xls')) {
      setFileName(file.name);
      onFileUpload(file);
    } else {
      alert('Please upload an Excel file (.xlsx or .xls)');
    }
  };

  return (
    <div className="file-upload-container">
      <form
        onDragEnter={handleDrag}
        onSubmit={(e) => e.preventDefault()}
      >
        <input
          type="file"
          id="file-upload"
          accept=".xlsx,.xls"
          onChange={handleChange}
          style={{ display: 'none' }}
        />
        <label
          htmlFor="file-upload"
          className={`file-upload-label ${dragActive ? 'drag-active' : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <div className="upload-content">
            {fileName ? (
              <>
                <FileSpreadsheet size={48} />
                <p className="file-name">{fileName}</p>
                <p className="upload-instruction">Click to upload a different file</p>
              </>
            ) : (
              <>
                <Upload size={48} />
                <p className="upload-title">Upload Excel Review Data</p>
                <p className="upload-instruction">
                  Drag and drop your Excel file here, or click to browse
                </p>
                <p className="upload-formats">Supports: .xlsx, .xls</p>
              </>
            )}
          </div>
        </label>
      </form>
    </div>
  );
};

export default FileUpload;