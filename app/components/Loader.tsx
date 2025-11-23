import React from 'react';

type LoaderProps = {
    progress?: number;
    message?: string;
};

const Loader = ({ progress = 0, message }: LoaderProps) => {
    return (
        <div className="loader-container">
            <div className="loader-spinner"></div>
            {message && <p className="loader-text">{message}</p>}
            {progress > 0 && (
                <div className="progress-container">
                    <div className="progress-bar" style={{ width: `${progress}%` }}>
                        <span className="progress-text">{Math.round(progress)}%</span>
                    </div>
                </div>
            )}
            <style jsx>{`
        .loader-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          color: rgba(255, 255, 255, 0.8);
          gap: 1rem;
        }
        .loader-spinner {
          width: 50px;
          height: 50px;
          border: 4px solid rgba(108, 139, 255, 0.2);
          border-radius: 50%;
          border-top-color: #6c8bff;
          border-right-color: #a873ff;
          animation: spin 1s ease-in-out infinite;
        }
        .loader-text {
          font-size: 1rem;
          margin: 0;
          color: rgba(255, 255, 255, 0.9);
          font-weight: 500;
        }
        .progress-container {
          width: 300px;
          height: 8px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 999px;
          overflow: hidden;
          position: relative;
        }
        .progress-bar {
          height: 100%;
          background: linear-gradient(90deg, #6c8bff, #a873ff);
          border-radius: 999px;
          transition: width 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          padding-right: 8px;
          position: relative;
        }
        .progress-text {
          font-size: 0.75rem;
          color: white;
          font-weight: 600;
          position: absolute;
          top: -25px;
          right: 0;
          white-space: nowrap;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
        </div>
    );
};

export default Loader;
