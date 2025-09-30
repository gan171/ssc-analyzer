import Link from 'next/link';
import ApiCallIndicator from './ApiCallIndicator';

const Navbar = () => {
  return (
    <nav className="bg-gray-800 text-white p-4">
      <div className="container mx-auto flex justify-between items-center">
        <Link href="/" className="text-xl font-bold">
          SSC Analyzer
        </Link>
        <div className="flex items-center space-x-4">
          <Link href="/dashboard" className="hover:text-gray-300">
            Dashboard
          </Link>
          <Link href="/report" className="hover:text-gray-300">
            Report
          </Link>
          <Link href="/practice" className="hover:text-gray-300">
            Practice
          </Link>
          <ApiCallIndicator />
        </div>
      </div>
    </nav>
  );
};

export default Navbar;