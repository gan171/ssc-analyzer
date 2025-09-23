'use client';

import { useState, FormEvent } from 'react';

type TestbookImportFormProps = {
  onMockImported: () => void;
};

export default function TestbookImportForm({ onMockImported }: TestbookImportFormProps) {
  const [cookies, setCookies] = useState('');
  const [url, setUrl] = useState('');
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setImporting(true);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/mocks/import-from-testbook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cookies, url }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to import mock');
      }

      alert('Mock imported successfully!');
      setCookies('');
      setUrl('');
      onMockImported();
    } catch (error: unknown) {
      console.error('Error importing mock:', error);
      setError(error.message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-8 mb-12 flex flex-col gap-4 w-full max-w-lg bg-gray-900 p-6 rounded-lg mx-auto">
      <h3 className="text-lg font-semibold text-center">Import from Testbook</h3>
      <div>
        <label htmlFor="url" className="block text-sm font-medium mb-1">Mock Result URL</label>
        <input
          type="url"
          id="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="block w-full rounded-md border-gray-600 bg-gray-700 shadow-sm text-white p-2"
          placeholder="Paste the URL of the result page"
          required
        />
      </div>
      <div>
        <label htmlFor="cookies" className="block text-sm font-medium mb-1">Testbook Cookies</label>
        <textarea
          id="cookies"
          value={cookies}
          onChange={(e) => setCookies(e.target.value)}
          className="block w-full rounded-md border-gray-600 bg-gray-700 shadow-sm text-white p-2"
          rows={3}
          placeholder="Paste your cookies here"
          required
        />
      </div>
      {error && <div className="text-red-500 text-sm">{error}</div>}
      <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded" disabled={importing}>
        {importing ? 'Importing...' : 'Import Mock'}
      </button>
    </form>
  );
}