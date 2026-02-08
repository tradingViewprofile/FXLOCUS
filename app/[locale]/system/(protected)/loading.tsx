export default function Loading() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-[#050a14]">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 rounded-full border-2 border-white/15 border-t-sky-400 animate-spin" />
        <div className="text-white/70 text-sm">Loading...</div>
      </div>
    </div>
  );
}

