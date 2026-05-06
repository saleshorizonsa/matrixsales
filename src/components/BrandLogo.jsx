import React from 'react';

export default function BrandLogo({ className = '', imageClassName = '', showTagline = true }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <img
        src="/horizon-logo.jpg"
        alt="HORIZON"
        className={`h-12 w-auto object-contain ${imageClassName}`}
      />
      {!showTagline && <span className="sr-only">HORIZON</span>}
    </div>
  );
}
