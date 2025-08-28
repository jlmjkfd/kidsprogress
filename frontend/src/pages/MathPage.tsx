function MathPage() {
  return (
    <div className="w-full p-4 lg:p-8 bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 min-h-full">
      <div className="w-full text-center">
        <div className="py-20">
          <div className="text-8xl mb-8">🔢</div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-6">
            Math Practice
          </h1>
          <p className="text-2xl text-gray-600 mb-8">
            Coming Soon!
          </p>
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-xl border border-green-100">
            <p className="text-lg text-gray-700 mb-4">
              🚧 We're building something amazing for math practice!
            </p>
            <p className="text-gray-600">
              Check back soon for interactive math problems, games, and progress tracking.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MathPage;