import { ChevronRight, Check, AlertCircle, Download, Upload } from 'lucide-react';
import { getCategoryWeights } from '../utils/csvParser';
import { normalizeWeights } from '../utils/scoring';

interface SettingsProps {
  tempWeights: Record<string, number>;
  setTempWeights: (weights: Record<string, number>) => void;
  onSaveWeights: () => void;
  onResetWeights: () => void;
  onExportData: () => void;
  onImportData: (file: File) => void;
  onBack: () => void;
}

export const Settings = ({
  tempWeights,
  setTempWeights,
  onSaveWeights,
  onResetWeights,
  onExportData,
  onImportData,
  onBack
}: SettingsProps) => {
  const categoryWeightList = getCategoryWeights(tempWeights);
  const totalWeight = Object.values(tempWeights).reduce((sum, w) => sum + w, 0);
  
  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <button onClick={onBack} className="text-sm text-black mb-6 hover:underline flex items-center">
          <ChevronRight className="w-4 h-4 rotate-180 mr-1" />
          Back to Dashboard
        </button>
        <h1 className="text-3xl font-light text-black mb-3">Settings</h1>
        <div className="h-px bg-black w-24"></div>
      </div>
      
      {/* Category Weights */}
      <section className="mb-12">
        <h2 className="text-xl font-light text-black mb-6">Category Weights</h2>
        <p className="text-sm text-gray-600 mb-6">
          Adjust the relative importance of each category. Weights will be automatically normalized to sum to 1.0.
        </p>
        
        <div className="space-y-4 mb-6">
          {categoryWeightList.map(cat => (
            <div key={cat.categoryId} className="flex items-center space-x-4 p-4 border border-gray-200">
              <div className="flex-1">
                <label className="block text-sm font-medium text-black mb-1">{cat.categoryName}</label>
                <div className="text-xs text-gray-500">Category {cat.categoryId}</div>
              </div>
              <div className="flex items-center space-x-3">
                <input
                  type="number"
                  min="0"
                  max="1"
                  step="0.01"
                  value={tempWeights[cat.categoryId] || 0}
                  onChange={(e) => {
                    const newWeights = { ...tempWeights, [cat.categoryId]: parseFloat(e.target.value) || 0 };
                    setTempWeights(newWeights);
                  }}
                  className="w-24 px-3 py-2 border-2 border-gray-300 focus:border-black focus:outline-none text-sm"
                />
                <div className="text-sm text-gray-600 w-16 text-right">
                  {(tempWeights[cat.categoryId] || 0).toFixed(2)}
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mb-6 p-4 bg-gray-50 border border-gray-300">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-black">Total Weight:</span>
            <span className={`text-lg font-light ${Math.abs(totalWeight - 1.0) < 0.01 ? 'text-green-600' : 'text-orange-600'}`}>
              {totalWeight.toFixed(3)}
            </span>
          </div>
          {Math.abs(totalWeight - 1.0) >= 0.01 && (
            <div className="text-xs text-orange-600 mt-2">
              Weights will be normalized to sum to 1.0 when saved.
            </div>
          )}
        </div>
        
        <div className="flex justify-end space-x-3">
          <button
            onClick={onResetWeights}
            className="px-6 py-3 border-2 border-gray-400 text-gray-700 hover:border-black hover:text-black transition-colors text-xs uppercase"
          >
            Reset to Defaults
          </button>
          <button
            onClick={onSaveWeights}
            className="px-6 py-3 bg-black text-white hover:bg-gray-800 transition-colors text-xs uppercase"
          >
            Save Weights
          </button>
        </div>
      </section>
      
      {/* Data Management */}
      <section className="mb-12">
        <h2 className="text-xl font-light text-black mb-6">Data Management</h2>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border border-gray-200">
            <div>
              <div className="text-sm font-medium text-black mb-1">Export Suppliers</div>
              <div className="text-xs text-gray-500">Download all supplier data as JSON</div>
            </div>
            <button
              onClick={onExportData}
              className="px-4 py-2 border-2 border-black text-black hover:bg-black hover:text-white transition-colors text-xs uppercase flex items-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>
          </div>
          
          <div className="flex items-center justify-between p-4 border border-gray-200">
            <div>
              <div className="text-sm font-medium text-black mb-1">Import Suppliers</div>
              <div className="text-xs text-gray-500">Upload JSON file to import supplier data</div>
            </div>
            <label className="px-4 py-2 border-2 border-black text-black hover:bg-black hover:text-white transition-colors text-xs uppercase flex items-center space-x-2 cursor-pointer">
              <Upload className="w-4 h-4" />
              <span>Import</span>
              <input
                type="file"
                accept=".json"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onImportData(file);
                }}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </section>
    </div>
  );
};

