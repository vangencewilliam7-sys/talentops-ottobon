import React, { memo } from 'react';
import './AuroraBackground.css';

const AuroraBackground = memo(() => {
    return (
        <div className="aurora-bg">
            <div className="aurora-sphere aurora-1" />
            <div className="aurora-sphere aurora-2" />
            <div className="aurora-sphere aurora-3" />
        </div>
    );
});

export default AuroraBackground;
