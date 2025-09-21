export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white py-6 mt-12">
      <div className="container mx-auto text-center text-sm text-gray-400">
        <p>&copy; {new Date().getFullYear()} SSC Mock Analyzer. All Rights Reserved.</p>
      </div>
    </footer>
  );
}