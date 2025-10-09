import { Link } from "@tanstack/react-router";

export function Home() {
  return (
    <div className="bg-gradient-to-br from-blue-50 h-full to-indigo-100">
      <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-center h-full text-center">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              Build Better Projects with <span className="text-blue-600">Constructum</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-8">
              The ultimate project management tool for construction teams. Plan, schedule, and track your projects with
              ease.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/signup"
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors"
              >
                Get Started
              </Link>
              <Link
                to="/signin"
                className="bg-white hover:bg-gray-50 text-gray-900 font-semibold py-3 px-8 rounded-lg border border-gray-300 transition-colors"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
