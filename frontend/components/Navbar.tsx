import Link from 'next/link';

export default function Navbar() {
  return (
    <nav className="bg-gray-900 text-white shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-6 py-3 flex justify-between items-center">
        <Link href="/" className="text-xl font-bold text-indigo-400 hover:text-indigo-300">
          SSC Mock Analyzer
        </Link>
        <div className="space-x-6">
          <Link href="/dashboard" className="hover:text-indigo-400">Dashboard</Link>
          <Link href="/report" className="hover:text-indigo-400">Performance Report</Link>
        </div>
      </div>
    </nav>
  );
}