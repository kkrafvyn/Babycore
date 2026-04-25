import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface FeedingTrackerProps {
  babyId?: string;
  babyName?: string;
  onBack?: () => void;
}

export const FeedingTracker: React.FC<FeedingTrackerProps> = ({ babyName = 'Baby', onBack }) => {
  const [lastFeeding, setLastFeeding] = useState<Date | null>(null);

  useEffect(() => {
    // Load from localStorage or API
    const saved = localStorage.getItem(`feeding-${babyName}`);
    if (saved) setLastFeeding(new Date(saved));
  }, [babyName]);

  const handleLogFeeding = () => {
    const now = new Date();
    setLastFeeding(now);
    localStorage.setItem(`feeding-${babyName}`, now.toISOString());
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-4 bg-white rounded-lg shadow"
    >
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="mb-4 text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          Back
        </button>
      )}
      <h3 className="text-lg font-semibold mb-4">Feeding Tracker</h3>
      <p className="text-sm text-gray-600 mb-4">
        {lastFeeding
          ? `Last feeding: ${lastFeeding.toLocaleTimeString()}`
          : 'No feeding logged yet'}
      </p>
      <button
        onClick={handleLogFeeding}
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
      >
        Log Feeding
      </button>
    </motion.div>
  );
};
