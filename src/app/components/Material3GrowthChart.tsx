import React from 'react';
import { useAppContext } from '../AppContext';
import { GrowthChart } from './GrowthChart';

interface Material3GrowthChartProps {
  onBack?: () => void;
  showBackButton?: boolean;
}

export const Material3GrowthChart: React.FC<Material3GrowthChartProps> = ({
  onBack,
  showBackButton = true,
}) => {
  const { setCurrentView } = useAppContext();

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }

    setCurrentView('dashboard');
  };

  return <GrowthChart onBack={handleBack} showBackButton={showBackButton} />;
};

export default Material3GrowthChart;
