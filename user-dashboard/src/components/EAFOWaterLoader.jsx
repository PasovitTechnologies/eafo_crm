import React, { useState, useEffect } from 'react';
import './EAFOWaterLoader.css';

const icons = [
  { name: 'Courses', icon: '🎓' },
  { name: 'Webinars', icon: '🩺' },
  { name: 'Forms', icon: '📝' },
  { name: 'Payments', icon: '💳' },
];

const totalDuration = 10000; // total progress bar fill duration in ms
const iconChangeInterval = 800; // icon changes every 0.5 sec

const EAFOWaterLoader = () => {
  const [progress, setProgress] = useState(0);
  const [iconIndex, setIconIndex] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    const startTime = Date.now();

    // Progress bar animation
    const updateProgress = () => {
      const elapsed = Date.now() - startTime;
      const newProgress = (elapsed / totalDuration) * 250;

      if (newProgress >= 100) {
        setProgress(100);
        setTimeout(() => {
          setProgress(0);
          requestAnimationFrame(updateProgress);
        }, 200);
      } else {
        setProgress(newProgress);
        requestAnimationFrame(updateProgress);
      }
    };

    updateProgress();

    // Icon change interval with fade effect
    const iconInterval = setInterval(() => {
      setFade(false); // start fade-out
      setTimeout(() => {
        setIconIndex((prev) => (prev + 1) % icons.length);
        setFade(true); // fade-in new icon
      }, 250); // fade out duration
    }, iconChangeInterval);

    return () => clearInterval(iconInterval);
  }, []);

  const currentIcon = icons[iconIndex];

  return (
    <div className="service-loader-container">
      <div className="circle-loader">
        <div className={`icon ${fade ? 'fade-in' : 'fade-out'}`}>
          {currentIcon.icon}
        </div>
        
        <div className="loader-bar">
          <div className="fill" style={{ width: `${progress}%` }} />
          <div className="segments">
            {icons.map((_, i) => (
              <div key={i} className="segment" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EAFOWaterLoader;
