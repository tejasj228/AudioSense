import React from 'react';

const Loader = () => {
    return (
        <div className="loader-container">
            <div className="loader-spinner"></div>
            <p>Analyzing Audio...</p>
            <style jsx>{`
        .loader-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          color: rgba(255, 255, 255, 0.8);
        }
        .loader-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid rgba(255, 255, 255, 0.1);
          border-radius: 50%;
          border-top-color: #8b5cf6;
          animation: spin 1s ease-in-out infinite;
          margin-bottom: 1rem;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
        </div>
    );
};

export default Loader;
