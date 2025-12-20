function ShimmerCard() {
  return (
    <div className="w-full max-w-md h-72 rounded-xl border border-border p-5 shadow-sm bg-card animate-pulse">
      <div className="h-6 w-32 bg-muted rounded mb-4"></div>
      <div className="h-8 w-20 bg-muted rounded mb-6"></div>

      <div className="space-y-3">
        <div className="h-3 w-40 bg-muted rounded"></div>
        <div className="h-3 w-48 bg-muted rounded"></div>
        <div className="h-3 w-44 bg-muted rounded"></div>
        <div className="h-3 w-36 bg-muted rounded"></div>
      </div>

      <div className="h-10 w-full bg-muted rounded-lg mt-6"></div>
    </div>
  );
}

export default function ShimmerPricingScreen() {
  return (
    <div className="w-full flex items-center justify-center p-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <ShimmerCard />
        <ShimmerCard />
        <ShimmerCard />
        <ShimmerCard />
      </div>
    </div>
  );
}
