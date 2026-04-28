import React from 'react';
import { DataExport } from './DataExportScreen';

interface ExportScreenProps {
  onBack: () => void;
}

export const ExportScreen: React.FC<ExportScreenProps> = ({ onBack }) => {
  return <DataExport onBack={onBack} />;
};
