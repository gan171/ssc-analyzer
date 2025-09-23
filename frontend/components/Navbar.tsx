import Link from 'next/link';
import ApiCallIndicator from './ApiCallIndicator';

const Navbar = () => {
  return (
    <nav className="bg-gray-800 p-4 text-white">
      <div className="container mx-auto flex justify-between items-center">
        <Link href="/" className="font-bold text-xl">SSC Mock Analyzer</Link>
        <div className="flex items-center space-x-4">
            <Link href="/dashboard" className="hover:text-indigo-400">Dashboard</Link>
            <Link href="/report" className="hover:text-indigo-400">Report</Link>
            {/* Add the indicator here */}
            <ApiCallIndicator />
        </div>
      </div>
    </nav>
  );
};

export default Navbar;