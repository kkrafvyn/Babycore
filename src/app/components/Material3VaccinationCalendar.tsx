/**
 * Material Design 3 Vaccination Calendar
 * Uses the real vaccination scheduling + persistence engine.
 */

import React from 'react';
import { VaccinationCalendar } from './VaccinationCalendar';
import BottomNavigation from './BottomNavigation';

export const Material3VaccinationCalendar: React.FC = () => {
  return (
    <div className="min-h-screen bg-background pb-32">
      <VaccinationCalendar />
      <BottomNavigation />
    </div>
  );
};

export default Material3VaccinationCalendar;
