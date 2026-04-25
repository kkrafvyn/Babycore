import React, { useState } from 'react';
import { motion } from 'framer-motion';

interface VaccinationCalendarProps {
  babyId?: string;
  babyName?: string;
  onBack?: () => void;
}

export const VaccinationCalendar: React.FC<VaccinationCalendarProps> = ({ babyName = 'Baby', onBack }) => {
  const [vaccinations, setVaccinations] = useState<Array<{ name: string; date: Date; completed: boolean }>>([]);

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
      <h3 className="text-lg font-semibold mb-4">Vaccination Calendar</h3>
      <div className="space-y-2">
        {vaccinations.length === 0 ? (
          <p className="text-sm text-gray-600">No vaccinations scheduled</p>
        ) : (
          vaccinations.map((vac, idx) => (
            <div key={idx} className="p-2 border rounded">
              <p className="font-medium">{vac.name}</p>
              <p className="text-sm text-gray-600">{vac.date.toLocaleDateString()}</p>
              <span className={`inline-block px-2 py-1 text-xs rounded ${vac.completed ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                {vac.completed ? 'Completed' : 'Pending'}
              </span>
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
};
