import React, { useState } from 'react';
import { Upload, FileSpreadsheet, CheckCircle } from 'lucide-react';
import './BenchmarkFileUpload.css';

const BenchmarkFileUpload = ({ onFilesUpload }) => {
  const [userFile, setUserFile] = useState(null);
  const [competitorFile, setCompetitorFile] = useState(null);
  const [userDragActive, setUserDragActive] = useState(false);
  const [competitorDragActive, setCompetitorDragActive] = useState(false);

  const handleDrag = (e, type) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      if (type === 'user') setUserDragActive(true);
      else setCompetitorDragActive(true);
    } else if (e.type === "dragleave") {
      if (type === 'user') setUserDragActive(false);
      else setCompetitorDragActive(false);
    }
  };

  const handleDrop = (e, type) => {
    e.preventDefault();
    e.stopPropagation();
    if (type === 'user') setUserDragActive(false);
    else setCompetitorDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0], type);
    }
  };

  const handleChange = (e, type) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0], type);
    }
  };

  const handleFile = (file, type) => {
    if (file.type === 'application/vnd.ms-excel' || 
        file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.name.endsWith('.xlsx') || 
        file.name.endsWith('.xls')) {
      if (type === 'user') {
        setUserFile(file);
      } else {
        setCompetitorFile(file);
      }
    } else {
      alert('Please upload an Excel file (.xlsx or .xls)');
    }
  };

  const handleAnalyze = () => {
    if (userFile && competitorFile) {
      onFilesUpload({ userFile, competitorFile });
    }
  };

  const canAnalyze = userFile && competitorFile;

  return (
    <div className="benchmark-upload-container">
      <div className="benchmark-header">
        <h1>Benchmark Analysis</h1>
        <p>Compare your app's performance against a competitor</p>
      </div>

      <div className="upload-sections">
        {/* User App Upload */}
        <div className="upload-section user-section">
          <h3>Your App Data</h3>
          <form onSubmit={(e) => e.preventDefault()}>
            <input
              type="file"
              id="user-file-upload"
              accept=".xlsx,.xls"
              onChange={(e) => handleChange(e, 'user')}
              style={{ display: 'none' }}
            />
            <label
              htmlFor="user-file-upload"
              className={`file-upload-label ${userDragActive ? 'drag-active' : ''} ${userFile ? 'file-uploaded' : ''}`}
              onDragEnter={(e) => handleDrag(e, 'user')}
              onDragLeave={(e) => handleDrag(e, 'user')}
              onDragOver={(e) => handleDrag(e, 'user')}
              onDrop={(e) => handleDrop(e, 'user')}
            >
              <div className="upload-content">
                {userFile ? (
                  <>
                    <CheckCircle size={48} className="success-icon" />
                    <p className="file-name">{userFile.name}</p>
                    <p className="upload-instruction">Click to change file</p>
                  </>
                ) : (
                  <>
                    <Upload size={48} />
                    <p className="upload-title">Upload Your App Reviews</p>
                    <p className="upload-instruction">
                      Drag and drop or click to browse
                    </p>
                  </>
                )}
              </div>
            </label>
          </form>
        </div>

        <div className="vs-divider">
          <span>VS</span>
        </div>

        {/* Competitor App Upload */}
        <div className="upload-section competitor-section">
          <h3>Competitor App Data</h3>
          <form onSubmit={(e) => e.preventDefault()}>
            <input
              type="file"
              id="competitor-file-upload"
              accept=".xlsx,.xls"
              onChange={(e) => handleChange(e, 'competitor')}
              style={{ display: 'none' }}
            />
            <label
              htmlFor="competitor-file-upload"
              className={`file-upload-label ${competitorDragActive ? 'drag-active' : ''} ${competitorFile ? 'file-uploaded' : ''}`}
              onDragEnter={(e) => handleDrag(e, 'competitor')}
              onDragLeave={(e) => handleDrag(e, 'competitor')}
              onDragOver={(e) => handleDrag(e, 'competitor')}
              onDrop={(e) => handleDrop(e, 'competitor')}
            >
              <div className="upload-content">
                {competitorFile ? (
                  <>
                    <CheckCircle size={48} className="success-icon" />
                    <p className="file-name">{competitorFile.name}</p>
                    <p className="upload-instruction">Click to change file</p>
                  </>
                ) : (
                  <>
                    <Upload size={48} />
                    <p className="upload-title">Upload Competitor Reviews</p>
                    <p className="upload-instruction">
                      Drag and drop or click to browse
                    </p>
                  </>
                )}
              </div>
            </label>
          </form>
        </div>
      </div>

      <div className="analyze-section">
        <button 
          className={`analyze-button ${canAnalyze ? 'active' : 'disabled'}`}
          onClick={handleAnalyze}
          disabled={!canAnalyze}
        >
          {canAnalyze ? 'Start Benchmark Analysis' : 'Upload Both Files to Continue'}
        </button>
        {!canAnalyze && (
          <p className="upload-hint">
            Upload Excel files for both your app and competitor to begin comparison
          </p>
        )}
      </div>
    </div>
  );
};

export default BenchmarkFileUpload;