import React, { useState } from 'react';
import { pb } from '../lib/pocketbase';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { DocumentArrowUpIcon, XMarkIcon } from '@heroicons/react/24/outline';
import * as XLSX from 'xlsx';

const BulkImport: React.FC = () => {
  const { isAdmin } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [file, setFile] = useState<File | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFile(file);
    
    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = evt.target?.result;
      const workbook = XLSX.read(data, { type: 'binary' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const parsedData = XLSX.utils.sheet_to_json(sheet);
      setPreviewData(parsedData);
    };
    reader.readAsBinaryString(file);
  };

  const downloadTemplate = () => {
    const template = [
      ['matric_number', 'full_name', 'department', 'level', 'email', 'phone'],
      ['UDA/2024/001', 'John Doe', 'Computer Science', '400', 'john@example.com', '08012345678'],
      ['UDA/2024/002', 'Jane Smith', 'Computer Science', '400', 'jane@example.com', '08012345679'],
    ];
    
    const ws = XLSX.utils.aoa_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Students');
    XLSX.writeFile(wb, 'student_import_template.xlsx');
    toast.success('Template downloaded');
  };

  const handleImport = async () => {
    if (previewData.length === 0) {
      toast.error('No data to import');
      return;
    }

    setIsLoading(true);
    let success = 0;
    let failed = 0;

    for (const student of previewData) {
      try {
        await pb.collection('students').create({
          matric_number: student.matric_number || student.MatricNumber,
          full_name: student.full_name || student.FullName || student.name,
          department: student.department || student.Department,
          level: student.level || student.Level,
          email: student.email || student.Email || '',
          phone: student.phone || student.Phone || '',
        });
        success++;
      } catch (error) {
        console.error('Failed to import student:', student, error);
        failed++;
      }
    }

    toast.success(`Import complete: ${success} added, ${failed} failed`);
    setPreviewData([]);
    setFile(null);
    setIsLoading(false);
  };

  if (!isAdmin) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Access denied. Admin only.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Bulk Import Students</h1>
        <p className="text-gray-600 mt-1">Import students from Excel/CSV file</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="text-center mb-6">
          <DocumentArrowUpIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Upload Student Data</h3>
          <p className="text-sm text-gray-500 mb-4">
            Upload an Excel or CSV file with student information
          </p>
          <button onClick={downloadTemplate} className="btn-secondary mr-3">
            Download Template
          </button>
          <label className="btn-primary inline-block cursor-pointer">
            Select File
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>

        {file && (
          <div className="mt-4">
            <div className="flex justify-between items-center mb-3">
              <p className="text-sm font-medium">Selected: {file.name}</p>
              <button onClick={() => setPreviewData([])} className="text-red-500">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            
            {previewData.length > 0 && (
              <>
                <div className="overflow-x-auto max-h-96">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        {Object.keys(previewData[0] || {}).map((key) => (
                          <th key={key} className="px-4 py-2 text-left">{key}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.slice(0, 10).map((row, idx) => (
                        <tr key={idx}>
                          {Object.values(row).map((val: any, i) => (
                            <td key={i} className="px-4 py-2 border-t">{String(val).slice(0, 30)}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Showing first 10 of {previewData.length} records
                </p>
                <button
                  onClick={handleImport}
                  disabled={isLoading}
                  className="btn-primary w-full mt-4"
                >
                  {isLoading ? 'Importing...' : `Import ${previewData.length} Students`}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default BulkImport;